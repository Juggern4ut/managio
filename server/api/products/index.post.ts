import { products } from '../../../db/schema'
import { createProductSchema } from '../../../shared/schemas/product'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createProductSchema.parse)
  const db = useDb()

  const [product] = await db
    .insert(products)
    .values({
      name: body.name,
      serialNumber: body.serialNumber,
      modelNumber: body.modelNumber,
      manufacturer: body.manufacturer,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
    })
    .returning()

  return product
})
