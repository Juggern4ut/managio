import { asc, ilike } from 'drizzle-orm'
import { z } from 'zod'
import { companies } from '../../../db/schema'

const querySchema = z.object({ q: z.string().trim().max(200).optional() })

export default defineEventHandler(async (event) => {
  const { q } = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const rows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(q ? ilike(companies.name, `%${q}%`) : undefined)
    .orderBy(asc(companies.name))
    .limit(50)

  return { items: rows }
})
