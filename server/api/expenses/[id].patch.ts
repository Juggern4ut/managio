import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { expenses } from '../../../db/schema'
import { updateExpenseSchema } from '../../../shared/schemas/expense'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateExpenseSchema.parse)
  const db = useDb()

  const { expenseDate, ...rest } = body

  const [updated] = await db
    .update(expenses)
    .set({
      ...rest,
      ...(expenseDate !== undefined ? { expenseDate: new Date(expenseDate) } : {}),
    })
    .where(eq(expenses.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
  }

  return updated
})
