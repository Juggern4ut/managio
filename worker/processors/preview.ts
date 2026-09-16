import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { buildImagePreviewArgs, buildPdfPreviewArgs } from './cli-args'

const execFileAsync = promisify(execFile)

export async function generatePreviewPng(
  inputPath: string,
  outputPath: string,
  mimeType: string,
): Promise<void> {
  if (mimeType === 'application/pdf') {
    const outputPrefix = outputPath.replace(/\.png$/, '')
    await execFileAsync('pdftoppm', buildPdfPreviewArgs(inputPath, outputPrefix))
    return
  }

  await execFileAsync('convert', buildImagePreviewArgs(inputPath, outputPath))
}
