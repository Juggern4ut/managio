import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { documentTags, documents, tags } from '../../../../db/schema'
import { normalizeName, setDocumentTagsSchema } from '../../../../shared/schemas/organize'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, setDocumentTagsSchema.parse)
  const db = useDb()

  const [document] = await db.select({ id: documents.id }).from(documents).where(eq(documents.id, id)).limit(1)
  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  const uniqueNames = [...new Set(body.tags.map(name => name.trim()).filter(Boolean))]

  const tagRows = await db.transaction(async (tx) => {
    const resolved: { id: string, name: string }[] = []
    for (const name of uniqueNames) {
      const [tag] = await tx
        .insert(tags)
        .values({ name, normalizedName: normalizeName(name) })
        .onConflictDoUpdate({ target: tags.normalizedName, set: { name: sql`excluded.name` } })
        .returning({ id: tags.id, name: tags.name })
      if (tag) resolved.push(tag)
    }

    await tx.delete(documentTags).where(eq(documentTags.documentId, id))
    if (resolved.length > 0) {
      await tx.insert(documentTags).values(resolved.map(tag => ({ documentId: id, tagId: tag.id })))
    }
    return resolved
  })

  return { tags: tagRows }
})
