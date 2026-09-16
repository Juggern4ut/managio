import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documents } from '../../../../db/schema'
import { useDocumentStorage } from '../../../services/storage'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [document] = await db
    .select({ previewStorageKey: documents.previewStorageKey })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  if (!document.previewStorageKey) {
    throw createError({ statusCode: 404, statusMessage: 'Preview not generated yet' })
  }

  const bytes = await useDocumentStorage().read(document.previewStorageKey)
  setResponseHeader(event, 'Content-Type', 'image/png')
  return bytes
})
