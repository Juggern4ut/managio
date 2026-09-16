import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { documentProcessingEvents } from '../../../db/schema'
import type * as schema from '../../../db/schema'
import type { ProcessingStage } from '../../../shared/types/document'

type Db = NodePgDatabase<typeof schema>

export async function startStage(
  db: Db,
  documentId: string,
  stage: ProcessingStage,
  processorVersion: string,
): Promise<string> {
  const [row] = await db
    .insert(documentProcessingEvents)
    .values({ documentId, stage, status: 'started', processorVersion })
    .returning({ id: documentProcessingEvents.id })

  if (!row) throw new Error('Failed to record stage start')
  return row.id
}

export async function finishStageSuccess(db: Db, eventId: string): Promise<void> {
  await db
    .update(documentProcessingEvents)
    .set({ status: 'succeeded', endedAt: new Date() })
    .where(eq(documentProcessingEvents.id, eventId))
}

export async function finishStageFailure(
  db: Db,
  eventId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  await db
    .update(documentProcessingEvents)
    .set({ status: 'failed', endedAt: new Date(), errorCode, errorMessage })
    .where(eq(documentProcessingEvents.id, eventId))
}
