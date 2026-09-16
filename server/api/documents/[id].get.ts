import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documents } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [document] = await db
    .select({
      id: documents.id,
      originalFilename: documents.originalFilename,
      mimeType: documents.mimeType,
      fileSizeBytes: documents.fileSizeBytes,
      documentType: documents.documentType,
      processingStatus: documents.processingStatus,
      reviewStatus: documents.reviewStatus,
      documentDate: documents.documentDate,
      uploadedAt: documents.uploadedAt,
      createdBy: documents.createdBy,
      ocrText: documents.ocrText,
      hasPreview: documents.previewStorageKey,
      hasSearchablePdf: documents.searchablePdfStorageKey,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  return {
    ...document,
    hasPreview: document.hasPreview !== null,
    hasSearchablePdf: document.hasSearchablePdf !== null,
  }
})
