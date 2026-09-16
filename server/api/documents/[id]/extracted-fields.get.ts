import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { documentExtractedFields } from '../../../../db/schema'

const paramsSchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()

  const items = await db
    .select({
      id: documentExtractedFields.id,
      fieldType: documentExtractedFields.fieldType,
      rawText: documentExtractedFields.rawText,
      normalizedText: documentExtractedFields.normalizedText,
      amountMinorUnits: documentExtractedFields.amountMinorUnits,
      currency: documentExtractedFields.currency,
      companyId: documentExtractedFields.companyId,
      confidence: documentExtractedFields.confidence,
      extractionMethod: documentExtractedFields.extractionMethod,
      sourceSnippet: documentExtractedFields.sourceSnippet,
    })
    .from(documentExtractedFields)
    .where(eq(documentExtractedFields.documentId, id))
    .orderBy(desc(documentExtractedFields.confidence))

  return { items }
})
