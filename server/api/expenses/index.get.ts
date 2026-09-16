import { desc, eq } from 'drizzle-orm'
import { categories, expenses } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const items = await db
    .select({
      id: expenses.id,
      receiptId: expenses.receiptId,
      documentId: expenses.documentId,
      categoryId: expenses.categoryId,
      categoryName: categories.name,
      amountMinorUnits: expenses.amountMinorUnits,
      currency: expenses.currency,
      expenseDate: expenses.expenseDate,
      description: expenses.description,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .orderBy(desc(expenses.expenseDate))

  return { items }
})
