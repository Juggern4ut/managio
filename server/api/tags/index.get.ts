import { asc } from 'drizzle-orm'
import { tags } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .orderBy(asc(tags.name))

  return { items: rows }
})
