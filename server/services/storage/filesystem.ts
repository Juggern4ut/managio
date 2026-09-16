import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { existsSync } from 'node:fs'
import type { DocumentStorage } from './types'

export function createFilesystemStorage(baseDir: string): DocumentStorage {
  function resolveKey(key: string): string {
    const resolved = normalize(join(baseDir, key))
    if (!resolved.startsWith(normalize(baseDir))) {
      // Defense in depth: keys are always generated server-side (document id
      // + a fixed extension), never taken from user input.
      throw new Error(`Refusing to resolve storage key outside base dir: ${key}`)
    }
    return resolved
  }

  return {
    async put(key, bytes) {
      const path = resolveKey(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, bytes)
    },
    async read(key) {
      return readFile(resolveKey(key))
    },
    async exists(key) {
      return existsSync(resolveKey(key))
    },
    async delete(key) {
      await rm(resolveKey(key), { force: true })
    },
  }
}
