import { desc, eq } from 'drizzle-orm'
import { companies, coupons } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const items = await db
    .select({
      id: coupons.id,
      issuerCompanyId: coupons.issuerCompanyId,
      issuerCompanyName: companies.name,
      sourceDocumentId: coupons.sourceDocumentId,
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      currency: coupons.currency,
      validFrom: coupons.validFrom,
      expiresOn: coupons.expiresOn,
      minimumPurchaseMinorUnits: coupons.minimumPurchaseMinorUnits,
      conditions: coupons.conditions,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .leftJoin(companies, eq(coupons.issuerCompanyId, companies.id))
    .orderBy(desc(coupons.createdAt))

  return { items }
})
