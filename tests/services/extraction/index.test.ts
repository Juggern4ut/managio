import { describe, expect, it } from 'vitest'
import { extractFields } from '../../../server/services/extraction/index'

describe('extractFields', () => {
  const ocrText = `
    Migros Supermarkt AG
    Rechnungsnummer: RE-2026-4711
    Rechnung vom 01.09.2026
    Fällig am 30.09.2026
    Gesamtbetrag CHF 1'234.50
  `

  it('extracts a coherent set of fields from a realistic receipt', () => {
    const fields = extractFields(ocrText, [{ id: 'c1', name: 'Migros Supermarkt AG' }])

    expect(fields.find(f => f.fieldType === 'invoice_number')).toMatchObject({ normalizedText: 'RE-2026-4711' })
    expect(fields.find(f => f.fieldType === 'due_date')).toMatchObject({ normalizedText: '2026-09-30' })
    expect(fields.find(f => f.fieldType === 'amount')).toMatchObject({ amountMinorUnits: 123450, currency: 'CHF' })
    expect(fields.find(f => f.fieldType === 'company')).toMatchObject({ companyId: 'c1' })
    expect(fields.some(f => f.fieldType === 'document_date' && f.normalizedText === '2026-09-01')).toBe(true)
  })

  it('includes a human-readable snippet of surrounding context for every field', () => {
    const fields = extractFields(ocrText, [])
    for (const field of fields) {
      expect(field.sourceSnippet.length).toBeGreaterThan(0)
      expect(field.sourceSnippet).toContain(field.rawText.trim().split('\n')[0]!.slice(0, 5))
    }
  })

  it('returns an empty array for text with no extractable values', () => {
    expect(extractFields('just some plain text with nothing to extract', [])).toEqual([])
  })
})
