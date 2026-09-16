import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { documents } from '../../../db/schema'
import { useDocumentStorage } from '../../services/storage'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  // Related rows (tags, relations, processing events, extracted fields) are
  // removed via ON DELETE CASCADE; receipts/warranties/coupons/expenses that
  // reference this document have their link set to NULL instead of being
  // deleted themselves, since they represent real purchases independent of
  // the source document.
  const [deleted] = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({
      storageKey: documents.storageKey,
      previewStorageKey: documents.previewStorageKey,
      searchablePdfStorageKey: documents.searchablePdfStorageKey,
    })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  const storage = useDocumentStorage()
  const keys = [deleted.storageKey, deleted.previewStorageKey, deleted.searchablePdfStorageKey].filter(
    (key): key is string => key !== null,
  )

  await Promise.all(
    keys.map(async (key) => {
      try {
        await storage.delete(key)
      }
      catch (error) {
        // The document record is already gone (the user-facing action
        // succeeded); an orphaned file is a lesser problem than failing
        // this request after the DB row is deleted.
        logger.error('Failed to delete stored file for removed document', {
          documentId: id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }),
  )

  return { ok: true }
})
