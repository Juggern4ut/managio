import { receiptItems, receipts } from '../../../db/schema'
import { createReceiptSchema } from '../../../shared/schemas/receipt'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createReceiptSchema.parse)
  const db = useDb()

  const receipt = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(receipts)
      .values({
        documentId: body.documentId,
        merchantCompanyId: body.merchantCompanyId,
        purchaseDate: new Date(body.purchaseDate),
        totalMinorUnits: body.totalMinorUnits,
        currency: body.currency,
        taxMinorUnits: body.taxMinorUnits,
      })
      .returning()

    if (!inserted) {
      throw new Error('Insert returned no row')
    }

    if (body.items?.length) {
      await tx.insert(receiptItems).values(
        body.items.map(item => ({
          receiptId: inserted.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceMinorUnits: item.unitPriceMinorUnits,
          totalMinorUnits: item.totalMinorUnits,
          productId: item.productId,
        })),
      )
    }

    return inserted
  })

  return receipt
})
