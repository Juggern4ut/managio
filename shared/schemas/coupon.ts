import { z } from 'zod'
import { currencySchema, isoDateSchema, minorUnitsSchema } from './common'

export const discountTypeValues = ['percentage', 'fixed_amount', 'other'] as const

export const discountTypeSchema = z.enum(discountTypeValues)

export const createCouponSchema = z.object({
  sourceDocumentId: z.uuid().optional(),
  issuerCompanyId: z.uuid().optional(),
  code: z.string().trim().max(100).optional(),
  // For 'percentage', a whole number 0-100. For 'fixed_amount', minor units
  // in `currency`. Meaningless (but stored as 0) for 'other'.
  discountType: discountTypeSchema,
  discountValue: z.coerce.number().int().min(0),
  currency: currencySchema.optional(),
  validFrom: isoDateSchema.optional(),
  expiresOn: isoDateSchema.optional(),
  minimumPurchaseMinorUnits: minorUnitsSchema.optional(),
  conditions: z.string().trim().max(2000).optional(),
})

export const updateCouponSchema = createCouponSchema.partial()
