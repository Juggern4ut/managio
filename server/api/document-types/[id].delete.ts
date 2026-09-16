import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documentTypes } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  // Documents using this type have their type_id set to NULL (ON DELETE SET
  // NULL) — they become unassigned rather than blocking the delete.
  const [deleted] = await db
    .delete(documentTypes)
    .where(eq(documentTypes.id, id))
    .returning({ id: documentTypes.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Document type not found' })
  }

  return { ok: true }
})
