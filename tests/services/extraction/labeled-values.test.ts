import { describe, expect, it } from 'vitest'
import { findCouponCodes, findInvoiceNumbers } from '../../../server/services/extraction/labeled-values'

describe('findInvoiceNumbers', () => {
  it('extracts a German-labeled invoice number', () => {
    const [match] = findInvoiceNumbers('Rechnungsnummer: RE-2026-4711')
    expect(match).toMatchObject({ value: 'RE-2026-4711', method: 'keyword:invoice_number_de' })
  })

  it('extracts an English-labeled invoice number', () => {
    const [match] = findInvoiceNumbers('Invoice No. 4711')
    expect(match).toMatchObject({ value: '4711', method: 'keyword:invoice_number_en' })
  })

  it('extracts a French-labeled invoice number', () => {
    const [match] = findInvoiceNumbers('N° de facture: F-9921')
    expect(match).toMatchObject({ value: 'F-9921', method: 'keyword:invoice_number_fr' })
  })

  it('returns nothing when there is no recognizable label', () => {
    expect(findInvoiceNumbers('just some text with numbers 4711')).toEqual([])
  })
})

describe('findCouponCodes', () => {
  it('extracts a German-labeled coupon code', () => {
    const [match] = findCouponCodes('Gutscheincode: SPAR20')
    expect(match).toMatchObject({ value: 'SPAR20', method: 'keyword:coupon_code_de' })
  })

  it('extracts an English-labeled coupon code', () => {
    const [match] = findCouponCodes('Promo code: SAVE20')
    expect(match).toMatchObject({ value: 'SAVE20', method: 'keyword:coupon_code_en' })
  })
})
