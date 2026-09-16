import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { documents } from '../../../db/schema'
import { sha256Hex } from '../../services/documents/checksum'
import { UploadValidationError, validateUpload } from '../../services/documents/validate-upload'
import { useDocumentStorage } from '../../services/storage'
import { MAX_UPLOAD_BYTES } from '../../../shared/schemas/upload'

const POSTGRES_UNIQUE_VIOLATION = '23505'

async function findDuplicateBySha256(db: ReturnType<typeof useDb>, sha256: string) {
  const rows = await db.select({ id: documents.id }).from(documents).where(eq(documents.sha256, sha256)).limit(1)
  return rows[0]
}

export default defineEventHandler(async (event) => {
  const contentLength = Number(getHeader(event, 'content-length') ?? 0)
  if (contentLength > MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `File exceeds the maximum size of ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
      data: { code: 'FILE_TOO_LARGE' },
    })
  }

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(part => part.name === 'file' && part.filename)

  if (!filePart?.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file was provided.',
      data: { code: 'NO_FILE' },
    })
  }

  let validated
  try {
    validated = validateUpload(filePart.data)
  }
  catch (error) {
    if (error instanceof UploadValidationError) {
      throw createError({
        statusCode: error.code === 'FILE_TOO_LARGE' ? 413 : 400,
        statusMessage: error.message,
        data: { code: error.code },
      })
    }
    throw error
  }

  const sha256 = sha256Hex(filePart.data)
  const db = useDb()

  const existing = await findDuplicateBySha256(db, sha256)
  if (existing) {
    logger.info('Duplicate upload detected', { documentId: existing.id })
    return { status: 'duplicate' as const, documentId: existing.id }
  }

  const session = await getUserSession(event)
  const documentId = randomUUID()
  const storageKey = `${documentId}${validated.extension}`

  try {
    await useDocumentStorage().put(storageKey, filePart.data)

    const [inserted] = await db
      .insert(documents)
      .values({
        id: documentId,
        originalFilename: (filePart.filename ?? 'unknown').slice(0, 255),
        mimeType: validated.mimeType,
        storageKey,
        sha256,
        fileSizeBytes: filePart.data.length,
        createdBy: session.user?.username,
      })
      .returning()

    if (!inserted) {
      throw new Error('Insert returned no row')
    }

    logger.info('Document uploaded', { documentId: inserted.id })
    return {
      status: 'uploaded' as const,
      documentId: inserted.id,
      processingStatus: inserted.processingStatus,
    }
  }
  catch (error) {
    // Two concurrent uploads of the same file can both pass the pre-check
    // above; the unique index on sha256 is the real duplicate guard.
    if (isUniqueViolation(error)) {
      const duplicate = await findDuplicateBySha256(db, sha256)
      if (duplicate) {
        logger.info('Duplicate upload detected (race)', { documentId: duplicate.id })
        return { status: 'duplicate' as const, documentId: duplicate.id }
      }
    }
    throw error
  }
})

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  )
}
