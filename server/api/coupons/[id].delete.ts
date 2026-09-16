import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { coupons } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [deleted] = await db.delete(coupons).where(eq(coupons.id, id)).returning({ id: coupons.id })
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Coupon not found' })
  }

  return { ok: true }
})
