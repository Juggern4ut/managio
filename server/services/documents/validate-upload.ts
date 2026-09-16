import { allowedUploadTypes, MAX_UPLOAD_BYTES } from '../../../shared/schemas/upload'
import type { AllowedUploadMimeType, uploadValidationErrorCodes } from '../../../shared/schemas/upload'
import { sniffFileType } from './file-signature'

export class UploadValidationError extends Error {
  code: (typeof uploadValidationErrorCodes)[number]

  constructor(code: (typeof uploadValidationErrorCodes)[number], message: string) {
    super(message)
    this.code = code
  }
}

export interface ValidatedUpload {
  mimeType: AllowedUploadMimeType
  extension: string
}

export function validateUpload(bytes: Uint8Array): ValidatedUpload {
  if (bytes.length === 0) {
    throw new UploadValidationError('EMPTY_FILE', 'The uploaded file is empty.')
  }

  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      'FILE_TOO_LARGE',
      `File exceeds the maximum size of ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    )
  }

  const mimeType = sniffFileType(bytes)
  if (!mimeType) {
    throw new UploadValidationError(
      'UNSUPPORTED_TYPE',
      'The file type could not be recognized or is not supported.',
    )
  }

  return { mimeType, extension: allowedUploadTypes[mimeType].extension }
}
