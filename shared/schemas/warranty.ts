import { z } from 'zod'
import { isoDateSchema } from './common'

export const createWarrantySchema = z.object({
  productId: z.uuid(),
  sourceDocumentId: z.uuid().optional(),
  startsOn: isoDateSchema,
  endsOn: isoDateSchema,
  warrantyType: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const updateWarrantySchema = createWarrantySchema.partial()
