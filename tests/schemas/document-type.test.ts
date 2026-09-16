import { describe, expect, it } from 'vitest'
import { colorSchema, createDocumentTypeSchema } from '../../shared/schemas/document-type'

describe('colorSchema', () => {
  it('accepts a lowercase 6-digit hex color', () => {
    expect(colorSchema.parse('#2563eb')).toBe('#2563eb')
  })

  it('accepts an uppercase 6-digit hex color', () => {
    expect(colorSchema.parse('#2563EB')).toBe('#2563EB')
  })

  it('rejects a 3-digit shorthand hex color', () => {
    expect(() => colorSchema.parse('#fff')).toThrow()
  })

  it('rejects a non-hex value', () => {
    expect(() => colorSchema.parse('blue')).toThrow()
  })

  it('rejects a value missing the leading #', () => {
    expect(() => colorSchema.parse('2563eb')).toThrow()
  })
})

describe('createDocumentTypeSchema', () => {
  it('accepts a valid name and color', () => {
    const result = createDocumentTypeSchema.parse({ name: 'Invoice', color: '#2563eb' })
    expect(result).toEqual({ name: 'Invoice', color: '#2563eb' })
  })

  it('rejects an empty name', () => {
    expect(() => createDocumentTypeSchema.parse({ name: '', color: '#2563eb' })).toThrow()
  })
})
