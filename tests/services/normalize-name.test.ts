import { describe, expect, it } from 'vitest'
import { normalizeName } from '../../shared/schemas/organize'

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Migros  ')).toBe('migros')
  })

  it('collapses internal whitespace', () => {
    expect(normalizeName('Coop   City')).toBe('coop city')
  })

  it('treats different casing of the same name as identical', () => {
    expect(normalizeName('IKEA')).toBe(normalizeName('ikea'))
  })
})
