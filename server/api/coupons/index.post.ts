import { coupons } from '../../../db/schema'
import { createCouponSchema } from '../../../shared/schemas/coupon'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createCouponSchema.parse)
  const db = useDb()

  const [coupon] = await db
    .insert(coupons)
    .values({
      sourceDocumentId: body.sourceDocumentId,
      issuerCompanyId: body.issuerCompanyId,
      code: body.code,
      discountType: body.discountType,
      discountValue: body.discountValue,
      currency: body.currency,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      expiresOn: body.expiresOn ? new Date(body.expiresOn) : undefined,
      minimumPurchaseMinorUnits: body.minimumPurchaseMinorUnits,
      conditions: body.conditions,
    })
    .returning()

  return coupon
})
