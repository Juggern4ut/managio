import { z } from 'zod'
import { documentRelations } from '../../../../db/schema'
import { createDocumentRelationSchema } from '../../../../shared/schemas/relation'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, createDocumentRelationSchema.parse)
  const db = useDb()

  if (body.targetDocumentId === id) {
    throw createError({ statusCode: 400, statusMessage: 'A document cannot be related to itself' })
  }

  try {
    const [relation] = await db
      .insert(documentRelations)
      .values({
        sourceDocumentId: id,
        targetDocumentId: body.targetDocumentId,
        relationType: body.relationType,
      })
      .returning()

    return relation
  }
  catch (error) {
    const code = pgErrorCode(error)
    if (code === PG_UNIQUE_VIOLATION) {
      throw createError({ statusCode: 409, statusMessage: 'This relation already exists' })
    }
    if (code === PG_CHECK_VIOLATION) {
      throw createError({ statusCode: 400, statusMessage: 'A document cannot be related to itself' })
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw createError({ statusCode: 404, statusMessage: 'Document not found' })
    }
    throw error
  }
})
