import { z } from 'zod'

export const extractedFieldTypeValues = [
  'document_date',
  'due_date',
  'amount',
  'invoice_number',
  'coupon_code',
  'coupon_expiration',
  'company',
] as const

export const extractedFieldTypeSchema = z.enum(extractedFieldTypeValues)
