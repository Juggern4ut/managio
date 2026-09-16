import { desc } from 'drizzle-orm'
import { products } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const items = await db.select().from(products).orderBy(desc(products.createdAt))
  return { items }
})
