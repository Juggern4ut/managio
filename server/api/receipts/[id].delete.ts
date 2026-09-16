import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { receipts } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [deleted] = await db.delete(receipts).where(eq(receipts.id, id)).returning({ id: receipts.id })
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Receipt not found' })
  }

  return { ok: true }
})
