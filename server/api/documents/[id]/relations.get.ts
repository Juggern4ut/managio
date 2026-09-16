import { eq, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { documentRelations, documents } from '../../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const rows = await db
    .select({
      id: documentRelations.id,
      relationType: documentRelations.relationType,
      sourceDocumentId: documentRelations.sourceDocumentId,
      targetDocumentId: documentRelations.targetDocumentId,
      createdAt: documentRelations.createdAt,
    })
    .from(documentRelations)
    .where(or(eq(documentRelations.sourceDocumentId, id), eq(documentRelations.targetDocumentId, id)))

  const otherDocumentIds = rows.map(row => (row.sourceDocumentId === id ? row.targetDocumentId : row.sourceDocumentId))

  const otherDocuments = otherDocumentIds.length
    ? await db
        .select({
          id: documents.id,
          originalFilename: documents.originalFilename,
          documentType: documents.documentType,
        })
        .from(documents)
        .where(inArray(documents.id, otherDocumentIds))
    : []
  const byId = new Map(otherDocuments.map(doc => [doc.id, doc]))

  return {
    items: rows.map((row) => {
      const otherId = row.sourceDocumentId === id ? row.targetDocumentId : row.sourceDocumentId
      return {
        id: row.id,
        relationType: row.relationType,
        direction: row.sourceDocumentId === id ? 'outgoing' : 'incoming',
        createdAt: row.createdAt,
        document: byId.get(otherId) ?? null,
      }
    }),
  }
})
