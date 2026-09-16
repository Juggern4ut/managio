import { z } from 'zod'

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

export const allowedUploadTypes = {
  'application/pdf': { extension: '.pdf' },
  'image/jpeg': { extension: '.jpg' },
  'image/png': { extension: '.png' },
  'image/tiff': { extension: '.tif' },
  'image/webp': { extension: '.webp' },
  'image/heic': { extension: '.heic' },
} as const

export type AllowedUploadMimeType = keyof typeof allowedUploadTypes

export const uploadValidationErrorCodes = [
  'EMPTY_FILE',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_TYPE',
] as const

export const documentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
})
