import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { products } from '../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [deleted] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id })
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  return { ok: true }
})
