import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { categories, companies, documentTags, documents, tags } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [document, tagRows] = await Promise.all([
    db
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
        companyId: documents.companyId,
        companyName: companies.name,
        categoryId: documents.categoryId,
        categoryName: categories.name,
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(categories, eq(documents.categoryId, categories.id))
      .where(eq(documents.id, id))
      .limit(1)
      .then(rows => rows[0]),
    db
      .select({ id: tags.id, name: tags.name })
      .from(documentTags)
      .innerJoin(tags, eq(documentTags.tagId, tags.id))
      .where(eq(documentTags.documentId, id)),
  ])

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  return {
    ...document,
    hasPreview: document.hasPreview !== null,
    hasSearchablePdf: document.hasSearchablePdf !== null,
    tags: tagRows,
  }
})
