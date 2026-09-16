import type { z } from 'zod'
import type {
  documentTypeSchema,
  processingStatusSchema,
  reviewStatusSchema,
} from '../schemas/document'

export type DocumentType = z.infer<typeof documentTypeSchema>
export type ProcessingStatus = z.infer<typeof processingStatusSchema>
export type ReviewStatus = z.infer<typeof reviewStatusSchema>
