import { asc } from 'drizzle-orm'
import { documentTypes } from '../../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const items = await db
    .select({ id: documentTypes.id, name: documentTypes.name, color: documentTypes.color })
    .from(documentTypes)
    .orderBy(asc(documentTypes.name))

  return { items }
})
