import { asc } from 'drizzle-orm'
import { categories } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name))

  return { items: rows }
})
