import { z } from 'zod'

// Document-to-document links. Document-to-entity relationships (issuer
// company, receipt, warranty) already have their own FK columns and don't
// need a row here.
export const relationTypeValues = [
  'related_to',
  'duplicate_of',
  'part_of_case',
  'supports_purchase',
  'proves_warranty',
] as const

export const relationTypeSchema = z.enum(relationTypeValues)

export const createDocumentRelationSchema = z.object({
  targetDocumentId: z.uuid(),
  relationType: relationTypeSchema,
})
