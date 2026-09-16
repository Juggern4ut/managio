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
