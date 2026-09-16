import { describe, expect, it } from 'vitest'
import { sniffFileType } from '../../server/services/documents/file-signature'

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values)
}

function ascii(text: string): number[] {
  return Array.from(text).map(char => char.charCodeAt(0))
}

describe('sniffFileType', () => {
  it('recognizes a PDF by its magic bytes', () => {
    expect(sniffFileType(bytes(...ascii('%PDF-1.7')))).toBe('application/pdf')
  })

  it('recognizes a JPEG', () => {
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
  })

  it('recognizes a PNG', () => {
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
  })

  it('recognizes little-endian TIFF', () => {
    expect(sniffFileType(bytes(0x49, 0x49, 0x2a, 0x00, 0x00))).toBe('image/tiff')
  })

  it('recognizes big-endian TIFF', () => {
    expect(sniffFileType(bytes(0x4d, 0x4d, 0x00, 0x2a, 0x00))).toBe('image/tiff')
  })

  it('recognizes WEBP', () => {
    const riff = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, ...ascii('WEBP')]
    expect(sniffFileType(bytes(...riff))).toBe('image/webp')
  })

  it('recognizes HEIC by its ftyp brand', () => {
    const heic = [0, 0, 0, 0x18, ...ascii('ftyp'), ...ascii('heic')]
    expect(sniffFileType(bytes(...heic))).toBe('image/heic')
  })

  it('returns null for an unrecognized or spoofed type', () => {
    expect(sniffFileType(bytes(...ascii('#!/bin/sh')))).toBeNull()
    // A .txt renamed to .pdf: the browser Content-Type lies, the bytes don't.
    expect(sniffFileType(bytes(...ascii('just some text')))).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(sniffFileType(bytes())).toBeNull()
  })
})
