import { describe, expect, it } from 'vitest'
import { documentTypeSchema, processingStatusSchema } from '../../shared/schemas/document'

describe('documentTypeSchema', () => {
  it('accepts known document types', () => {
    expect(documentTypeSchema.parse('invoice')).toBe('invoice')
    expect(documentTypeSchema.parse('unknown')).toBe('unknown')
  })

  it('rejects unknown values instead of guessing', () => {
    expect(() => documentTypeSchema.parse('made_up_type')).toThrow()
  })
})

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
