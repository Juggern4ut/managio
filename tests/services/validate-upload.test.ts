import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES } from '../../shared/schemas/upload'
import { UploadValidationError, validateUpload } from '../../server/services/documents/validate-upload'

const PDF_HEADER = Array.from('%PDF-1.7').map(char => char.charCodeAt(0))

describe('validateUpload', () => {
  it('accepts a well-formed PDF and derives the canonical extension', () => {
    const result = validateUpload(new Uint8Array(PDF_HEADER))
    expect(result).toEqual({ mimeType: 'application/pdf', extension: '.pdf' })
  })

  it('rejects an empty file', () => {
    expect(() => validateUpload(new Uint8Array())).toThrow(UploadValidationError)
    try {
      validateUpload(new Uint8Array())
    }
    catch (error) {
      expect((error as UploadValidationError).code).toBe('EMPTY_FILE')
    }
  })

  it('rejects a file larger than the configured maximum', () => {
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1)
    oversized.set(PDF_HEADER)
    try {
      validateUpload(oversized)
      expect.unreachable()
    }
    catch (error) {
      expect((error as UploadValidationError).code).toBe('FILE_TOO_LARGE')
    }
  })

  it('rejects content that does not match any supported signature', () => {
    const textFile = new Uint8Array(Array.from('hello world').map(char => char.charCodeAt(0)))
    try {
      validateUpload(textFile)
      expect.unreachable()
    }
    catch (error) {
      expect((error as UploadValidationError).code).toBe('UNSUPPORTED_TYPE')
    }
  })
})
