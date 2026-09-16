import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { expenses } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [deleted] = await db.delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id })
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
  }

  return { ok: true }
})
