import { describe, expect, it } from 'vitest'
import { processingStatusSchema } from '../../shared/schemas/document'

describe('processingStatusSchema', () => {
  it('accepts every stage of the processing pipeline', () => {
    const stages = [
      'UPLOADED',
      'VALIDATED',
      'PREPROCESSED',
      'OCR_COMPLETED',
      'CLASSIFIED',
      'EXTRACTED',
      'RELATIONS_DETECTED',
      'INDEXED',
      'COMPLETE',
    ]
    for (const stage of stages) {
      expect(processingStatusSchema.parse(stage)).toBe(stage)
    }
  })

  it('rejects an unrecognized status', () => {
    expect(() => processingStatusSchema.parse('DONE')).toThrow()
  })
})
