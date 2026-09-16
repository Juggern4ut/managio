import { z } from 'zod'
import { currencySchema, isoDateSchema, minorUnitsSchema } from './common'

export const createExpenseSchema = z.object({
  receiptId: z.uuid().optional(),
  documentId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  amountMinorUnits: minorUnitsSchema,
  currency: currencySchema.default('CHF'),
  expenseDate: isoDateSchema,
  description: z.string().trim().max(500).optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial()
