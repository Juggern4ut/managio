import { desc, sql } from 'drizzle-orm'
import { documents } from '../../../db/schema'
import { documentListQuerySchema } from '../../../shared/schemas/upload'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, documentListQuerySchema.parse)
  const db = useDb()

  const [items, countRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        originalFilename: documents.originalFilename,
        mimeType: documents.mimeType,
        fileSizeBytes: documents.fileSizeBytes,
        documentType: documents.documentType,
        processingStatus: documents.processingStatus,
        reviewStatus: documents.reviewStatus,
        uploadedAt: documents.uploadedAt,
      })
      .from(documents)
      .orderBy(desc(documents.uploadedAt))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(documents),
  ])

  return { items, total: countRows[0]?.count ?? 0, limit: query.limit, offset: query.offset }
})
