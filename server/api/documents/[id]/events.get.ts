import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { documentProcessingEvents } from '../../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const events = await db
    .select({
      id: documentProcessingEvents.id,
      stage: documentProcessingEvents.stage,
      status: documentProcessingEvents.status,
      startedAt: documentProcessingEvents.startedAt,
      endedAt: documentProcessingEvents.endedAt,
      errorCode: documentProcessingEvents.errorCode,
      errorMessage: documentProcessingEvents.errorMessage,
    })
    .from(documentProcessingEvents)
    .where(eq(documentProcessingEvents.documentId, id))
    .orderBy(asc(documentProcessingEvents.startedAt))

  return { items: events }
})
