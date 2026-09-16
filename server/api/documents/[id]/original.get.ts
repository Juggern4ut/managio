import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documents } from '../../../../db/schema'
import { useDocumentStorage } from '../../../services/storage'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [document] = await db
    .select({
      storageKey: documents.storageKey,
      mimeType: documents.mimeType,
      originalFilename: documents.originalFilename,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  const bytes = await useDocumentStorage().read(document.storageKey)

  setResponseHeader(event, 'Content-Type', document.mimeType)
  setResponseHeader(event, 'Content-Disposition', `inline; filename="${sanitizeFilename(document.originalFilename)}"`)
  return bytes
})

function sanitizeFilename(filename: string): string {
  return filename.replace(/["\r\n]/g, '_')
}
