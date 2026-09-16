// Pure argument builders, kept separate from the actual child_process calls
// so the CLI contracts can be unit tested without ocrmypdf/tesseract/poppler
// installed.

export function buildPdfPreviewArgs(inputPath: string, outputPrefix: string): string[] {
  return ['-png', '-r', '150', '-f', '1', '-l', '1', '-singlefile', inputPath, outputPrefix]
}

export function buildImagePreviewArgs(inputPath: string, outputPath: string): string[] {
  return [`${inputPath}[0]`, '-auto-orient', '-resize', '1600x1600>', outputPath]
}

export function buildOcrMyPdfArgs(
  inputPath: string,
  outputPdfPath: string,
  sidecarPath: string,
  languages: string,
): string[] {
  return ['--skip-text', '--sidecar', sidecarPath, '--language', languages, inputPath, outputPdfPath]
}

export function buildTesseractArgs(inputPath: string, languages: string): string[] {
  return [inputPath, 'stdout', '-l', languages]
}
