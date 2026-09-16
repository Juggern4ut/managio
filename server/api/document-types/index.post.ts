import { sql } from 'drizzle-orm'
import { documentTypes } from '../../../db/schema'
import { createDocumentTypeSchema } from '../../../shared/schemas/document-type'
import { normalizeName } from '../../../shared/schemas/organize'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createDocumentTypeSchema.parse)
  const db = useDb()

  // Idempotent create: re-creating a type with the same normalized name
  // reuses the existing row (and updates its color) instead of erroring.
  const [documentType] = await db
    .insert(documentTypes)
    .values({ name: body.name, normalizedName: normalizeName(body.name), color: body.color })
    .onConflictDoUpdate({
      target: documentTypes.normalizedName,
      set: { name: sql`excluded.name`, color: sql`excluded.color` },
    })
    .returning()

  return documentType
})
