import IORedis from 'ioredis'

let connection: IORedis | undefined

// Plain process.env (not Nuxt's runtimeConfig): this module is imported by
// the standalone worker process too, which has no Nuxt context.
export function getRedisConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379'
    // BullMQ requires this on the connection it's handed.
    connection = new IORedis(url, { maxRetriesPerRequest: null })
  }
  return connection
}
