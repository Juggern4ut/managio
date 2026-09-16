import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documentRelations } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [deleted] = await db
    .delete(documentRelations)
    .where(eq(documentRelations.id, id))
    .returning({ id: documentRelations.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Relation not found' })
  }

  return { ok: true }
})
