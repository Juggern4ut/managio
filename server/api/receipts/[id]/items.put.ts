import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { receiptItems, receipts } from '../../../../db/schema'
import { createReceiptItemSchema } from '../../../../shared/schemas/receipt'

const paramsSchema = z.object({ id: z.uuid() })
const bodySchema = z.object({ items: z.array(createReceiptItemSchema).max(200) })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [receipt] = await db.select({ id: receipts.id }).from(receipts).where(eq(receipts.id, id)).limit(1)
  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: 'Receipt not found' })
  }

  const items = await db.transaction(async (tx) => {
    await tx.delete(receiptItems).where(eq(receiptItems.receiptId, id))
    if (body.items.length === 0) return []
    return tx
      .insert(receiptItems)
      .values(body.items.map(item => ({ ...item, receiptId: id })))
      .returning()
  })

  return { items }
})
