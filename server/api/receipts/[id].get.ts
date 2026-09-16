import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { companies, receiptItems, receipts } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [receipt, items] = await Promise.all([
    db
      .select({
        id: receipts.id,
        documentId: receipts.documentId,
        merchantCompanyId: receipts.merchantCompanyId,
        merchantCompanyName: companies.name,
        purchaseDate: receipts.purchaseDate,
        totalMinorUnits: receipts.totalMinorUnits,
        currency: receipts.currency,
        taxMinorUnits: receipts.taxMinorUnits,
        createdAt: receipts.createdAt,
      })
      .from(receipts)
      .leftJoin(companies, eq(receipts.merchantCompanyId, companies.id))
      .where(eq(receipts.id, id))
      .limit(1)
      .then(rows => rows[0]),
    db.select().from(receiptItems).where(eq(receiptItems.receiptId, id)).orderBy(asc(receiptItems.description)),
  ])

  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: 'Receipt not found' })
  }

  return { ...receipt, items }
})
