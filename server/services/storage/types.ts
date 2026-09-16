export interface DocumentStorage {
  put: (key: string, bytes: Uint8Array) => Promise<void>
  read: (key: string) => Promise<Buffer>
  exists: (key: string) => Promise<boolean>
  delete: (key: string) => Promise<void>
}
