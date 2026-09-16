import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { warranties } from '../../../db/schema'
import { updateWarrantySchema } from '../../../shared/schemas/warranty'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateWarrantySchema.parse)
  const db = useDb()

  const { startsOn, endsOn, ...rest } = body

  const [updated] = await db
    .update(warranties)
    .set({
      ...rest,
      ...(startsOn !== undefined ? { startsOn: new Date(startsOn) } : {}),
      ...(endsOn !== undefined ? { endsOn: new Date(endsOn) } : {}),
    })
    .where(eq(warranties.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Warranty not found' })
  }

  return updated
})
