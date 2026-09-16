import { createFilesystemStorage } from './filesystem'
import type { DocumentStorage } from './types'

export type { DocumentStorage } from './types'

let storage: DocumentStorage | undefined

// Named to avoid colliding with Nitro's auto-imported `useStorage` (unstorage KV).
export function useDocumentStorage(): DocumentStorage {
  if (!storage) {
    const { storageDir } = useRuntimeConfig()
    storage = createFilesystemStorage(storageDir)
  }
  return storage
}
