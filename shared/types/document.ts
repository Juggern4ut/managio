import type { z } from 'zod'
import type {
  processingStageSchema,
  processingStatusSchema,
  reviewStatusSchema,
  stageStatusSchema,
} from '../schemas/document'

export type ProcessingStatus = z.infer<typeof processingStatusSchema>
export type ReviewStatus = z.infer<typeof reviewStatusSchema>
export type ProcessingStage = z.infer<typeof processingStageSchema>
export type StageStatus = z.infer<typeof stageStatusSchema>
