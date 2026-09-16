import { describe, expect, it } from 'vitest'
import { pgErrorCode } from '../../server/utils/pg-error'

describe('pgErrorCode', () => {
  it('reads the code directly off the error when present', () => {
    expect(pgErrorCode({ code: '23505' })).toBe('23505')
  })

  it('reads the code off .cause, matching how drizzle wraps driver errors', () => {
    // DrizzleQueryError puts the real pg error (with .code) on .cause,
    // not on the thrown error itself.
    const drizzleError = { message: 'Failed query', cause: { code: '23505' } }
    expect(pgErrorCode(drizzleError)).toBe('23505')
  })

  it('returns undefined when neither the error nor its cause has a code', () => {
    expect(pgErrorCode(new Error('plain error'))).toBeUndefined()
    expect(pgErrorCode(null)).toBeUndefined()
    expect(pgErrorCode('not an object')).toBeUndefined()
  })
})
