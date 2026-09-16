import { sql } from 'drizzle-orm'
import { companies } from '../../../db/schema'
import { createCompanySchema, normalizeName } from '../../../shared/schemas/organize'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createCompanySchema.parse)
  const db = useDb()

  // Idempotent create: a second attempt with the same normalized name
  // reuses the existing company instead of erroring or duplicating it.
  const [company] = await db
    .insert(companies)
    .values({
      name: body.name,
      normalizedName: normalizeName(body.name),
      address: body.address,
      website: body.website,
      notes: body.notes,
    })
    .onConflictDoUpdate({
      target: companies.normalizedName,
      set: { name: sql`excluded.name` },
    })
    .returning()

  return company
})
