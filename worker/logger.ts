interface LogContext {
  documentId?: string
  jobId?: string
  stage?: string
  [key: string]: unknown
}

// Mirrors server/utils/logger.ts (which relies on Nuxt's runtimeConfig
// auto-import and isn't usable outside the Nitro process). Same contract:
// structured fields via `context`, never raw document content.
function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: LogContext) {
  const format = process.env.LOG_FORMAT ?? 'pretty'
  const line = format === 'json'
    ? JSON.stringify({ level, message, time: new Date().toISOString(), ...context })
    : [message, context && Object.keys(context).length ? context : undefined]

  if (format === 'json') {
    console[level === 'debug' ? 'log' : level](line)
  }
  else if (Array.isArray(line)) {
    console[level === 'debug' ? 'log' : level](...line.filter(Boolean))
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
  debug: (message: string, context?: LogContext) => log('debug', message, context),
}
