import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { warranties } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [deleted] = await db.delete(warranties).where(eq(warranties.id, id)).returning({ id: warranties.id })
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Warranty not found' })
  }

  return { ok: true }
})
