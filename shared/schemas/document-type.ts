import { z } from 'zod'
import { nameSchema } from './organize'

// <input type="color"> always yields lowercase "#rrggbb", which this matches.
export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Expected a hex color like #2563eb')

export const createDocumentTypeSchema = z.object({
  name: nameSchema,
  color: colorSchema,
})

export const updateDocumentTypeSchema = createDocumentTypeSchema.partial()
