import { describe, expect, it } from 'vitest'
import {
  buildImagePreviewArgs,
  buildOcrMyPdfArgs,
  buildPdfPreviewArgs,
  buildTesseractArgs,
} from '../../worker/processors/cli-args'
import { chooseOcrStrategy } from '../../worker/processors/ocr'

describe('buildPdfPreviewArgs', () => {
  it('renders only the first page at a readable resolution into a single file', () => {
    const args = buildPdfPreviewArgs('/tmp/in.pdf', '/tmp/preview')
    expect(args).toEqual(['-png', '-r', '150', '-f', '1', '-l', '1', '-singlefile', '/tmp/in.pdf', '/tmp/preview'])
  })
})

describe('buildImagePreviewArgs', () => {
  it('auto-orients and caps the resize without upscaling', () => {
    const args = buildImagePreviewArgs('/tmp/in.heic', '/tmp/out.png')
    expect(args).toEqual(['/tmp/in.heic[0]', '-auto-orient', '-resize', '1600x1600>', '/tmp/out.png'])
  })
})

describe('buildOcrMyPdfArgs', () => {
  it('skips pages that already have a text layer and writes a sidecar text file', () => {
    const args = buildOcrMyPdfArgs('/tmp/in.pdf', '/tmp/out.pdf', '/tmp/ocr.txt', 'eng+deu')
    expect(args).toEqual([
      '--skip-text',
      '--sidecar',
      '/tmp/ocr.txt',
      '--language',
      'eng+deu',
      '/tmp/in.pdf',
      '/tmp/out.pdf',
    ])
  })
})

describe('buildTesseractArgs', () => {
  it('writes recognized text to stdout in the configured languages', () => {
    const args = buildTesseractArgs('/tmp/preview.png', 'eng+deu+fra+ita')
    expect(args).toEqual(['/tmp/preview.png', 'stdout', '-l', 'eng+deu+fra+ita'])
  })
})

describe('chooseOcrStrategy', () => {
  it('uses ocrmypdf for PDFs', () => {
    expect(chooseOcrStrategy('application/pdf')).toBe('pdf')
  })

  it('uses tesseract on the normalized preview for every image type', () => {
    expect(chooseOcrStrategy('image/jpeg')).toBe('image')
    expect(chooseOcrStrategy('image/heic')).toBe('image')
    expect(chooseOcrStrategy('image/tiff')).toBe('image')
  })
})
