import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { categories, companies, documentTags, documents } from '../../../db/schema'
import { documentListQuerySchema } from '../../../shared/schemas/document'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, documentListQuerySchema.parse)
  const db = useDb()

  const conditions = []
  if (query.documentType) conditions.push(eq(documents.documentType, query.documentType))
  if (query.reviewStatus) conditions.push(eq(documents.reviewStatus, query.reviewStatus))
  if (query.companyId) conditions.push(eq(documents.companyId, query.companyId))
  if (query.categoryId) conditions.push(eq(documents.categoryId, query.categoryId))
  if (query.tagId) {
    conditions.push(
      inArray(
        documents.id,
        db.select({ id: documentTags.documentId }).from(documentTags).where(eq(documentTags.tagId, query.tagId)),
      ),
    )
  }
  if (query.q) {
    conditions.push(sql`${documents.searchVector} @@ plainto_tsquery('simple', ${query.q})`)
  }

  const whereClause = conditions.length ? and(...conditions) : undefined
  const orderBy = query.q
    ? sql`ts_rank(${documents.searchVector}, plainto_tsquery('simple', ${query.q})) desc`
    : desc(documents.uploadedAt)

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
        documentDate: documents.documentDate,
        uploadedAt: documents.uploadedAt,
        companyName: companies.name,
        categoryName: categories.name,
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(categories, eq(documents.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(query.limit)
      .offset(query.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(documents).where(whereClause),
  ])

  return { items, total: countRows[0]?.count ?? 0, limit: query.limit, offset: query.offset }
})
