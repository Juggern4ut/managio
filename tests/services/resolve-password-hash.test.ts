import { describe, expect, it } from 'vitest'
import { resolvePasswordHash } from '../../server/utils/resolve-password-hash'

const HASH = '$scrypt$n=16384,r=8,p=1$abc123$def456'
const HASH_B64 = Buffer.from(HASH, 'utf-8').toString('base64')

describe('resolvePasswordHash', () => {
  it('uses the raw hash when no base64 variant is set', () => {
    expect(resolvePasswordHash(HASH, '')).toBe(HASH)
  })

  it('prefers the base64 variant when both are set', () => {
    expect(resolvePasswordHash('some-other-value', HASH_B64)).toBe(HASH)
  })

  it('decodes the base64 variant correctly', () => {
    expect(resolvePasswordHash('', HASH_B64)).toBe(HASH)
  })

  it('trims a trailing newline/space some deployment UIs add to the raw hash', () => {
    expect(resolvePasswordHash(`${HASH}\n`, '')).toBe(HASH)
    expect(resolvePasswordHash(`  ${HASH}  `, '')).toBe(HASH)
  })

  it('trims whitespace around the base64 variant too', () => {
    expect(resolvePasswordHash('', `  ${HASH_B64}\n`)).toBe(HASH)
  })

  it('returns an empty string when neither is configured', () => {
    expect(resolvePasswordHash('', '')).toBe('')
    expect(resolvePasswordHash('   ', '')).toBe('')
  })
})
