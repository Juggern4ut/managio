import { z } from 'zod'
import { isoDateSchema } from './common'

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  serialNumber: z.string().trim().max(200).optional(),
  modelNumber: z.string().trim().max(200).optional(),
  manufacturer: z.string().trim().max(200).optional(),
  purchaseDate: isoDateSchema.optional(),
})

export const updateProductSchema = createProductSchema.partial()
