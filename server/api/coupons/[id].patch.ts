import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { coupons } from '../../../db/schema'
import { updateCouponSchema } from '../../../shared/schemas/coupon'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateCouponSchema.parse)
  const db = useDb()

  const { validFrom, expiresOn, ...rest } = body

  const [updated] = await db
    .update(coupons)
    .set({
      ...rest,
      ...(validFrom !== undefined ? { validFrom: new Date(validFrom) } : {}),
      ...(expiresOn !== undefined ? { expiresOn: new Date(expiresOn) } : {}),
    })
    .where(eq(coupons.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Coupon not found' })
  }

  return updated
})
