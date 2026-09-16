import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { receipts } from '../../../db/schema'
import { updateReceiptSchema } from '../../../shared/schemas/receipt'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateReceiptSchema.parse)
  const db = useDb()

  const { purchaseDate, ...rest } = body

  const [updated] = await db
    .update(receipts)
    .set({
      ...rest,
      ...(purchaseDate !== undefined ? { purchaseDate: new Date(purchaseDate) } : {}),
    })
    .where(eq(receipts.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Receipt not found' })
  }

  return updated
})
