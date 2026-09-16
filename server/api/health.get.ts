export default defineEventHandler(async (event) => {
  const checks: Record<string, 'ok' | 'error'> = {}

  try {
    await checkDbConnection()
    checks.database = 'ok'
  }
  catch (error) {
    checks.database = 'error'
    logger.error('Health check: database unreachable', {
      requestId: event.context.requestId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const healthy = Object.values(checks).every(status => status === 'ok')
  if (!healthy) {
    setResponseStatus(event, 503)
  }

  return {
    status: healthy ? 'ok' : 'degraded',
    checks,
    time: new Date().toISOString(),
  }
})
