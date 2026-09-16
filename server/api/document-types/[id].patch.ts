import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documentTypes } from '../../../db/schema'
import { updateDocumentTypeSchema } from '../../../shared/schemas/document-type'
import { normalizeName } from '../../../shared/schemas/organize'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateDocumentTypeSchema.parse)
  const db = useDb()

  if (body.name === undefined && body.color === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  const [updated] = await db
    .update(documentTypes)
    .set({
      ...(body.name !== undefined ? { name: body.name, normalizedName: normalizeName(body.name) } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
    })
    .where(eq(documentTypes.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Document type not found' })
  }

  return updated
})
