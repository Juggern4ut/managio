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

// Stages recorded in document_processing_events. Only PREPROCESS and OCR
// run so far; CLASSIFY/EXTRACT/RESOLVE_ENTITIES/DETECT_RELATIONS/INDEX are
// added as those pipelines land in later phases.
export const processingStageValues = ['PREPROCESS', 'OCR'] as const

export const processingStageSchema = z.enum(processingStageValues)

export const stageStatusValues = ['started', 'succeeded', 'failed'] as const

export const stageStatusSchema = z.enum(stageStatusValues)

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const documentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().min(1).max(200).optional(),
  documentType: documentTypeSchema.optional(),
  reviewStatus: reviewStatusSchema.optional(),
  companyId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  tagId: z.uuid().optional(),
})

export const updateDocumentSchema = z.object({
  documentType: documentTypeSchema.optional(),
  companyId: z.uuid().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  documentDate: isoDateSchema.nullable().optional(),
  reviewStatus: reviewStatusSchema.optional(),
})
