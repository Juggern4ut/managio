import { z } from 'zod'

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export const nameSchema = z.string().trim().min(1).max(200)

export const createCompanySchema = z.object({
  name: nameSchema,
  address: z.string().trim().max(500).optional(),
  website: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const createCategorySchema = z.object({ name: nameSchema })

export const createTagSchema = z.object({ name: nameSchema })

export const setDocumentTagsSchema = z.object({ tags: z.array(nameSchema).max(50) })
