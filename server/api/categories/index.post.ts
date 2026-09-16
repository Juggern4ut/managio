import { sql } from 'drizzle-orm'
import { categories } from '../../../db/schema'
import { createCategorySchema, normalizeName } from '../../../shared/schemas/organize'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createCategorySchema.parse)
  const db = useDb()

  const [category] = await db
    .insert(categories)
    .values({ name: body.name, normalizedName: normalizeName(body.name) })
    .onConflictDoUpdate({
      target: categories.normalizedName,
      set: { name: sql`excluded.name` },
    })
    .returning()

  return category
})
