import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { products } from '../../../db/schema'
import { updateProductSchema } from '../../../shared/schemas/product'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateProductSchema.parse)
  const db = useDb()

  const { purchaseDate, ...rest } = body

  const [updated] = await db
    .update(products)
    .set({
      ...rest,
      ...(purchaseDate !== undefined ? { purchaseDate: new Date(purchaseDate) } : {}),
    })
    .where(eq(products.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  return updated
})
