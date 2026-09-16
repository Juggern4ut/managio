import { z } from 'zod'
import { currencySchema, isoDateSchema, minorUnitsSchema } from './common'

export const createReceiptItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().positive().default(1),
  unitPriceMinorUnits: minorUnitsSchema,
  totalMinorUnits: minorUnitsSchema,
  productId: z.uuid().optional(),
})

export const createReceiptSchema = z.object({
  documentId: z.uuid().optional(),
  merchantCompanyId: z.uuid().optional(),
  purchaseDate: isoDateSchema,
  totalMinorUnits: minorUnitsSchema,
  currency: currencySchema.default('CHF'),
  taxMinorUnits: minorUnitsSchema.optional(),
  items: z.array(createReceiptItemSchema).max(200).optional(),
})

export const updateReceiptSchema = createReceiptSchema.omit({ items: true }).partial()
