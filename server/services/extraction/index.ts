import type { extractedFieldTypeValues } from '../../../shared/schemas/extraction'
import { findAmounts } from './amounts'
import { matchKnownCompanies } from './companies'
import { findDateNearKeyword, findDates } from './dates'
import {
  COUPON_EXPIRATION_KEYWORD,
  DUE_DATE_KEYWORD,
  findCouponCodes,
  findInvoiceNumbers,
} from './labeled-values'

export type ExtractedFieldType = (typeof extractedFieldTypeValues)[number]

export interface ExtractedField {
  fieldType: ExtractedFieldType
  rawText: string
  normalizedText?: string
  amountMinorUnits?: number
  currency?: string
  companyId?: string
  confidence: number
  extractionMethod: string
  sourceSnippet: string
}

const SNIPPET_RADIUS = 40

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - SNIPPET_RADIUS)
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`
}

export function extractFields(
  ocrText: string,
  knownCompanies: { id: string, name: string }[],
): ExtractedField[] {
  const fields: ExtractedField[] = []

  for (const date of findDates(ocrText)) {
    fields.push({
      fieldType: 'document_date',
      rawText: date.rawText,
      normalizedText: date.iso,
      confidence: date.confidence,
      extractionMethod: date.method,
      sourceSnippet: snippetAround(ocrText, date.index, date.rawText.length),
    })
  }

  const dueDate = findDateNearKeyword(ocrText, DUE_DATE_KEYWORD)
  if (dueDate) {
    fields.push({
      fieldType: 'due_date',
      rawText: dueDate.rawText,
      normalizedText: dueDate.iso,
      confidence: Math.min(0.9, dueDate.confidence + 0.1),
      extractionMethod: `keyword_proximity:${dueDate.method}`,
      sourceSnippet: snippetAround(ocrText, dueDate.index, dueDate.rawText.length),
    })
  }

  const couponExpiration = findDateNearKeyword(ocrText, COUPON_EXPIRATION_KEYWORD)
  if (couponExpiration) {
    fields.push({
      fieldType: 'coupon_expiration',
      rawText: couponExpiration.rawText,
      normalizedText: couponExpiration.iso,
      confidence: Math.min(0.9, couponExpiration.confidence + 0.1),
      extractionMethod: `keyword_proximity:${couponExpiration.method}`,
      sourceSnippet: snippetAround(ocrText, couponExpiration.index, couponExpiration.rawText.length),
    })
  }

  for (const amount of findAmounts(ocrText)) {
    fields.push({
      fieldType: 'amount',
      rawText: amount.rawText,
      amountMinorUnits: amount.amountMinorUnits,
      currency: amount.currency,
      confidence: amount.confidence,
      extractionMethod: amount.method,
      sourceSnippet: snippetAround(ocrText, amount.index, amount.rawText.length),
    })
  }

  for (const invoiceNumber of findInvoiceNumbers(ocrText)) {
    fields.push({
      fieldType: 'invoice_number',
      rawText: invoiceNumber.rawText,
      normalizedText: invoiceNumber.value,
      confidence: invoiceNumber.confidence,
      extractionMethod: invoiceNumber.method,
      sourceSnippet: snippetAround(ocrText, invoiceNumber.index, invoiceNumber.rawText.length),
    })
  }

  for (const couponCode of findCouponCodes(ocrText)) {
    fields.push({
      fieldType: 'coupon_code',
      rawText: couponCode.rawText,
      normalizedText: couponCode.value,
      confidence: couponCode.confidence,
      extractionMethod: couponCode.method,
      sourceSnippet: snippetAround(ocrText, couponCode.index, couponCode.rawText.length),
    })
  }

  for (const company of matchKnownCompanies(ocrText, knownCompanies)) {
    fields.push({
      fieldType: 'company',
      rawText: company.rawText,
      normalizedText: company.name,
      companyId: company.companyId,
      confidence: company.confidence,
      extractionMethod: company.method,
      sourceSnippet: snippetAround(ocrText, company.index, company.rawText.length),
    })
  }

  return fields
}
