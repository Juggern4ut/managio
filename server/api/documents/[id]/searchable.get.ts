import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documents } from '../../../../db/schema'
import { useDocumentStorage } from '../../../services/storage'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const [document] = await db
    .select({ searchablePdfStorageKey: documents.searchablePdfStorageKey, originalFilename: documents.originalFilename })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  if (!document.searchablePdfStorageKey) {
    throw createError({ statusCode: 404, statusMessage: 'Searchable PDF not generated yet' })
  }

  const bytes = await useDocumentStorage().read(document.searchablePdfStorageKey)
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(
    event,
    'Content-Disposition',
    `inline; filename="${document.originalFilename.replace(/["\r\n]/g, '_')}"`,
  )
  return bytes
})
