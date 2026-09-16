import { Queue } from 'bullmq'
import { getRedisConnection } from './connection'

export const DOCUMENT_QUEUE_NAME = 'documents'

export interface ProcessDocumentJobData {
  documentId: string
}

let queue: Queue<ProcessDocumentJobData> | undefined

export function getDocumentQueue(): Queue<ProcessDocumentJobData> {
  if (!queue) {
    queue = new Queue<ProcessDocumentJobData>(DOCUMENT_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60 },
        removeOnFail: { age: 30 * 24 * 60 * 60 },
      },
    })
  }
  return queue
}

export async function enqueueDocumentProcessing(documentId: string): Promise<void> {
  await getDocumentQueue().add(
    'process',
    { documentId },
    // Using the document id as the job id makes re-enqueueing the same
    // document a no-op while it's still queued/active.
    { jobId: documentId },
  )
}
