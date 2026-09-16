// drizzle-orm wraps the underlying pg driver error in a DrizzleQueryError,
// with the original error (carrying the Postgres error `code`) on `.cause`
// rather than on the thrown error itself.
export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined

  const direct = (error as { code?: string }).code
  if (direct) return direct

  const cause = (error as { cause?: unknown }).cause
  if (typeof cause === 'object' && cause !== null) {
    return (cause as { code?: string }).code
  }

  return undefined
}

export const PG_UNIQUE_VIOLATION = '23505'
export const PG_CHECK_VIOLATION = '23514'
export const PG_FOREIGN_KEY_VIOLATION = '23503'
