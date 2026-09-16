import type { AllowedUploadMimeType } from '../../../shared/schemas/upload'

// Identifies a file by its magic bytes rather than trusting the
// client-supplied Content-Type, which is easy to spoof.
export function sniffFileType(bytes: Uint8Array): AllowedUploadMimeType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf' // %PDF-
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00])) return 'image/tiff' // little-endian
  if (startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return 'image/tiff' // big-endian

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) // "RIFF"
    && matchesAscii(bytes, 8, 'WEBP')
  ) {
    return 'image/webp'
  }

  if (matchesAscii(bytes, 4, 'ftyp')) {
    const brand = asciiAt(bytes, 8, 4)
    const heicBrands = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1']
    if (brand && heicBrands.includes(brand)) return 'image/heic'
  }

  return null
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string | null {
  if (bytes.length < offset + length) return null
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

function matchesAscii(bytes: Uint8Array, offset: number, expected: string): boolean {
  return asciiAt(bytes, offset, expected.length) === expected
}
