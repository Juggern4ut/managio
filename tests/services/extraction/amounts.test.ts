import { describe, expect, it } from 'vitest'
import { findAmounts, parseAmountString } from '../../../server/services/extraction/amounts'

describe('parseAmountString', () => {
  it('parses a plain decimal amount', () => {
    expect(parseAmountString('128.50')).toBe(128.5)
  })

  it('parses a Swiss thousands-separated amount (apostrophe)', () => {
    expect(parseAmountString("1'234.50")).toBe(1234.5)
    expect(parseAmountString('1’234.50')).toBe(1234.5)
  })

  it('parses a comma-decimal amount', () => {
    expect(parseAmountString('128,50')).toBe(128.5)
  })

  it('picks the last separator as the decimal point when both are present', () => {
    expect(parseAmountString('1.234,50')).toBe(1234.5) // European: dot=thousands, comma=decimal
    expect(parseAmountString('1,234.50')).toBe(1234.5) // US: comma=thousands, dot=decimal
  })

  it('rejects a genuinely ambiguous single comma (not 2 trailing digits)', () => {
    expect(parseAmountString('1,234')).toBeNull()
    expect(parseAmountString('12,5')).toBeNull()
  })

  it('rejects input with no digits', () => {
    expect(parseAmountString('abc')).toBeNull()
  })
})

describe('findAmounts', () => {
  it('extracts a CHF amount before the code', () => {
    const [match] = findAmounts('Total: CHF 128.50 due on receipt')
    expect(match).toMatchObject({ amountMinorUnits: 12850, currency: 'CHF' })
  })

  it('extracts a CHF amount after the code', () => {
    const [match] = findAmounts('Total: 128.50 CHF')
    expect(match).toMatchObject({ amountMinorUnits: 12850, currency: 'CHF' })
  })

  it('extracts a Fr.-prefixed amount as CHF', () => {
    const [match] = findAmounts('Betrag Fr. 45.90')
    expect(match).toMatchObject({ amountMinorUnits: 4590, currency: 'CHF' })
  })

  it('extracts a Swiss thousands-separated CHF amount', () => {
    const [match] = findAmounts("Gesamtbetrag CHF 1'234.50")
    expect(match).toMatchObject({ amountMinorUnits: 123450, currency: 'CHF' })
  })

  it('extracts a EUR amount via the euro sign', () => {
    const [match] = findAmounts('Preis: €99.00')
    expect(match).toMatchObject({ amountMinorUnits: 9900, currency: 'EUR' })
  })

  it('does not extract a bare number with no currency marker', () => {
    expect(findAmounts('Quantity: 128.50')).toEqual([])
  })

  it('finds multiple amounts in document order', () => {
    const matches = findAmounts('Subtotal CHF 100.00, Tax CHF 8.10, Total CHF 108.10')
    expect(matches.map(m => m.amountMinorUnits)).toEqual([10000, 810, 10810])
  })
})
