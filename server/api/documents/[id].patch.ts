import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documents } from '../../../db/schema'
import { updateDocumentSchema } from '../../../shared/schemas/document'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateDocumentSchema.parse)
  const db = useDb()

  const { documentDate, ...rest } = body

  const [updated] = await db
    .update(documents)
    .set({
      ...rest,
      ...(documentDate !== undefined ? { documentDate: documentDate ? new Date(documentDate) : null } : {}),
    })
    .where(eq(documents.id, id))
    .returning({ id: documents.id })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  return { ok: true }
})
