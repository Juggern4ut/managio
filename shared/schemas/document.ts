import { z } from 'zod'

export const documentTypeValues = [
  'unknown',
  'letter',
  'invoice',
  'receipt',
  'contract',
  'insurance_document',
  'coupon',
  'other',
] as const

export const documentTypeSchema = z.enum(documentTypeValues)

export const processingStatusValues = [
  'UPLOADED',
  'VALIDATED',
  'PREPROCESSED',
  'OCR_COMPLETED',
  'CLASSIFIED',
  'EXTRACTED',
  'RELATIONS_DETECTED',
  'INDEXED',
  'COMPLETE',
  'FAILED_RETRYABLE',
  'FAILED_PERMANENT',
  'NEEDS_REVIEW',
] as const

export const processingStatusSchema = z.enum(processingStatusValues)

export const reviewStatusValues = ['not_required', 'pending', 'approved'] as const

export const reviewStatusSchema = z.enum(reviewStatusValues)
