import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildOcrMyPdfArgs, buildTesseractArgs } from './cli-args'

const execFileAsync = promisify(execFile)

export type OcrStrategy = 'pdf' | 'image'

export function chooseOcrStrategy(mimeType: string): OcrStrategy {
  return mimeType === 'application/pdf' ? 'pdf' : 'image'
}

export interface OcrResult {
  text: string
  searchablePdfPath?: string
}

export interface RunOcrInput {
  mimeType: string
  originalPath: string
  // Normalized preview PNG generated during PREPROCESS. Used as the OCR
  // input for images (tesseract can't read HEIC directly, and a resized,
  // auto-oriented PNG is more reliable than an arbitrary original).
  previewPath: string
  workDir: string
  languages: string
}

export async function runOcr(input: RunOcrInput): Promise<OcrResult> {
  const strategy = chooseOcrStrategy(input.mimeType)

  if (strategy === 'pdf') {
    const outputPdfPath = join(input.workDir, 'searchable.pdf')
    const sidecarPath = join(input.workDir, 'ocr.txt')
    await execFileAsync(
      'ocrmypdf',
      buildOcrMyPdfArgs(input.originalPath, outputPdfPath, sidecarPath, input.languages),
    )
    const text = await readFile(sidecarPath, 'utf-8')
    return { text, searchablePdfPath: outputPdfPath }
  }

  const { stdout } = await execFileAsync(
    'tesseract',
    buildTesseractArgs(input.previewPath, input.languages),
  )
  return { text: stdout }
}
