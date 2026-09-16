import { createFilesystemStorage } from '../server/services/storage/filesystem'

export const storage = createFilesystemStorage(process.env.STORAGE_DIR || './data/documents')
