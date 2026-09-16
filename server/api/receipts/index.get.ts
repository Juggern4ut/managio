import { desc, eq } from 'drizzle-orm'
import { companies, receipts } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const items = await db
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
    .orderBy(desc(receipts.purchaseDate))

  return { items }
})
