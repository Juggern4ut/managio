import { desc, eq } from 'drizzle-orm'
import { products, warranties } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const items = await db
    .select({
      id: warranties.id,
      productId: warranties.productId,
      productName: products.name,
      sourceDocumentId: warranties.sourceDocumentId,
      startsOn: warranties.startsOn,
      endsOn: warranties.endsOn,
      warrantyType: warranties.warrantyType,
      notes: warranties.notes,
      createdAt: warranties.createdAt,
    })
    .from(warranties)
    .innerJoin(products, eq(warranties.productId, products.id))
    .orderBy(desc(warranties.endsOn))

  return { items }
})
