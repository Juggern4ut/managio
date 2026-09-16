import { z } from 'zod'

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// ISO 4217. Integer minor units (e.g. cents) are stored alongside this,
// never floating-point money.
export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Expected a 3-letter ISO currency code')

export const minorUnitsSchema = z.coerce.number().int().min(0)
