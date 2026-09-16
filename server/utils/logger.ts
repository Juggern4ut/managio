import { consola } from 'consola'

export interface LogContext {
  requestId?: string
  documentId?: string
  jobId?: string
  stage?: string
  [key: string]: unknown
}

// Structured logger: fields go through `context`, never raw document
// content. Keep OCR text / extracted values / prompts out of `context`.
function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: LogContext) {
  const { logFormat } = useRuntimeConfig()

  if (logFormat === 'json') {
    consola[level](
      JSON.stringify({
        level,
        message,
        time: new Date().toISOString(),
        ...context,
      }),
    )
    return
  }

  if (context && Object.keys(context).length > 0) {
    consola[level](message, context)
  }
  else {
    consola[level](message)
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
  debug: (message: string, context?: LogContext) => log('debug', message, context),
}
