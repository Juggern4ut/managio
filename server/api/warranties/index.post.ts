import { warranties } from '../../../db/schema'
import { createWarrantySchema } from '../../../shared/schemas/warranty'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createWarrantySchema.parse)
  const db = useDb()

  const [warranty] = await db
    .insert(warranties)
    .values({
      productId: body.productId,
      sourceDocumentId: body.sourceDocumentId,
      startsOn: new Date(body.startsOn),
      endsOn: new Date(body.endsOn),
      warrantyType: body.warrantyType,
      notes: body.notes,
    })
    .returning()

  return warranty
})
