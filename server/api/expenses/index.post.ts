import { expenses } from '../../../db/schema'
import { createExpenseSchema } from '../../../shared/schemas/expense'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createExpenseSchema.parse)
  const db = useDb()

  const [expense] = await db
    .insert(expenses)
    .values({
      receiptId: body.receiptId,
      documentId: body.documentId,
      categoryId: body.categoryId,
      amountMinorUnits: body.amountMinorUnits,
      currency: body.currency,
      expenseDate: new Date(body.expenseDate),
      description: body.description,
    })
    .returning()

  return expense
})
