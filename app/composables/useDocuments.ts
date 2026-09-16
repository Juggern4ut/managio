export interface DocumentSummary {
  id: string
  originalFilename: string
  mimeType: string
  fileSizeBytes: number
  typeId: string | null
  typeName: string | null
  typeColor: string | null
  processingStatus: string
  reviewStatus: string
  documentDate: string | null
  uploadedAt: string
  companyName: string | null
  categoryName: string | null
}

export interface DocumentListResponse {
  items: DocumentSummary[]
  total: number
  limit: number
  offset: number
}

export interface DocumentListQuery {
  q?: string
  typeId?: string
  reviewStatus?: string
  companyId?: string
  categoryId?: string
  tagId?: string
  limit?: number
  offset?: number
}

export type UploadOutcome
  = | { status: 'uploaded', documentId: string, processingStatus: string }
    | { status: 'duplicate', documentId: string }
    | { status: 'error', message: string }

// `key` isolates the shared list state per usage (e.g. the Inbox's
// pending-only list vs. the Documents page's search results), so
// navigating between them doesn't show the other's stale data.
export function useDocuments(key: string = 'documents-list') {
  // Plain global `$fetch` does not forward the session cookie during SSR.
  // useRequestFetch() returns an isomorphic fetch that does (and behaves
  // like normal $fetch on the client), so the authenticated /api/documents
  // calls below work on both the initial server render and later on the client.
  const requestFetch = useRequestFetch()
  const list = useState<DocumentListResponse | null>(key, () => null)
  const loading = ref(false)

  async function refresh(query: DocumentListQuery = {}) {
    loading.value = true
    try {
      list.value = await requestFetch<DocumentListResponse>('/api/documents', {
        query: { limit: 50, offset: 0, ...query },
      })
    }
    finally {
      loading.value = false
    }
  }

  async function upload(file: File): Promise<UploadOutcome> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      return await requestFetch<Exclude<UploadOutcome, { status: 'error' }>>('/api/documents', {
        method: 'POST',
        body: formData,
      })
    }
    catch (error) {
      const message
        = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
          ?? 'Upload failed.'
      return { status: 'error', message }
    }
  }

  async function deleteDocument(id: string): Promise<void> {
    await requestFetch(`/api/documents/${id}`, { method: 'DELETE' })
  }

  return { list, loading, refresh, upload, deleteDocument }
}
