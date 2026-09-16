import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { logger } from '../logger'
import { storage } from '../storage'
import { documents } from '../../db/schema'
import { finishStageFailure, finishStageSuccess, startStage } from '../../server/services/documents/stage-log'
import type { ProcessingStatus } from '../../shared/types/document'
import { generatePreviewPng } from './preview'
import { runOcr } from './ocr'

const PROCESSOR_VERSION = 'managio-ocr-pipeline@1'
const OCR_LANGUAGES = process.env.OCR_LANGUAGES || 'eng+deu+fra+ita'

export async function processDocument(documentId: string): Promise<void> {
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1)
  if (!document) {
    logger.warn('Document not found, skipping', { documentId })
    return
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'managio-'))

  try {
    await setStatus(documentId, 'VALIDATED')

    const originalBytes = await storage.read(document.storageKey)
    const extension = document.storageKey.slice(document.storageKey.lastIndexOf('.'))
    const originalPath = join(tempDir, `original${extension}`)
    await writeFile(originalPath, originalBytes)

    const previewPath = await preprocess(documentId, document.mimeType, originalPath, tempDir)
    await setStatus(documentId, 'PREPROCESSED')

    await ocr(documentId, document.mimeType, originalPath, previewPath, tempDir)
    await setStatus(documentId, 'OCR_COMPLETED')

    // No classification/extraction pipeline exists yet (later phases), so
    // OCR is currently the last automated stage.
    await setStatus(documentId, 'COMPLETE')
    logger.info('Document processing complete', { documentId })
  }
  catch (error) {
    logger.error('Document processing failed', { documentId, error: safeMessage(error) })
    await setStatus(documentId, 'FAILED_RETRYABLE')
    throw error
  }
  finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function preprocess(
  documentId: string,
  mimeType: string,
  originalPath: string,
  tempDir: string,
): Promise<string> {
  const eventId = await startStage(db, documentId, 'PREPROCESS', PROCESSOR_VERSION)
  try {
    const previewPath = join(tempDir, 'preview.png')
    await generatePreviewPng(originalPath, previewPath, mimeType)

    const previewBytes = await readFile(previewPath)
    const previewStorageKey = `${documentId}-preview.png`
    await storage.put(previewStorageKey, previewBytes)
    await db.update(documents).set({ previewStorageKey }).where(eq(documents.id, documentId))

    await finishStageSuccess(db, eventId)
    return previewPath
  }
  catch (error) {
    await finishStageFailure(db, eventId, 'PREVIEW_FAILED', safeMessage(error))
    throw error
  }
}

async function ocr(
  documentId: string,
  mimeType: string,
  originalPath: string,
  previewPath: string,
  tempDir: string,
): Promise<void> {
  const eventId = await startStage(db, documentId, 'OCR', PROCESSOR_VERSION)
  try {
    const result = await runOcr({
      mimeType,
      originalPath,
      previewPath,
      workDir: tempDir,
      languages: OCR_LANGUAGES,
    })

    const updates: Partial<typeof documents.$inferInsert> = { ocrText: result.text }
    if (result.searchablePdfPath) {
      const searchableBytes = await readFile(result.searchablePdfPath)
      const searchablePdfStorageKey = `${documentId}-searchable.pdf`
      await storage.put(searchablePdfStorageKey, searchableBytes)
      updates.searchablePdfStorageKey = searchablePdfStorageKey
    }
    await db.update(documents).set(updates).where(eq(documents.id, documentId))

    await finishStageSuccess(db, eventId)
  }
  catch (error) {
    await finishStageFailure(db, eventId, 'OCR_FAILED', safeMessage(error))
    throw error
  }
}

async function setStatus(documentId: string, status: ProcessingStatus): Promise<void> {
  await db.update(documents).set({ processingStatus: status }).where(eq(documents.id, documentId))
}

function safeMessage(error: unknown): string {
  // Keep diagnostics short and generic — never include OCR text or file contents.
  if (error instanceof Error) return error.message.slice(0, 500)
  return 'Unknown error'
}
