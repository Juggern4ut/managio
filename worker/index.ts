import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { Worker } from 'bullmq'
import { getRedisConnection } from '../server/services/jobs/connection'
import { DOCUMENT_QUEUE_NAME } from '../server/services/jobs/queue'
import type { ProcessDocumentJobData } from '../server/services/jobs/queue'
import { documents } from '../db/schema'
import { db } from './db'
import { logger } from './logger'
import { processDocument } from './processors/process-document'

const worker = new Worker<ProcessDocumentJobData>(
  DOCUMENT_QUEUE_NAME,
  async (job) => {
    logger.info('Processing document', {
      documentId: job.data.documentId,
      jobId: job.id,
      attempt: job.attemptsMade + 1,
    })
    await processDocument(job.data.documentId)
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  },
)

worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id, documentId: job.data.documentId })
})

worker.on('failed', async (job, error) => {
  if (!job) return

  logger.error('Job failed', {
    jobId: job.id,
    documentId: job.data.documentId,
    attempt: job.attemptsMade,
    error: error.message,
  })

  const maxAttempts = job.opts.attempts ?? 1
  if (job.attemptsMade >= maxAttempts) {
    await db
      .update(documents)
      .set({ processingStatus: 'FAILED_PERMANENT' })
      .where(eq(documents.id, job.data.documentId))
    logger.error('Job exhausted retries', { documentId: job.data.documentId, maxAttempts })
  }
})

logger.info('Managio worker started', { queue: DOCUMENT_QUEUE_NAME, concurrency: 2 })

async function shutdown() {
  logger.info('Worker shutting down')
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
