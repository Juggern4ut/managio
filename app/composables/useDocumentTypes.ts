export interface DocumentTypeEntity {
  id: string
  name: string
  color: string
}

export function useDocumentTypes() {
  const requestFetch = useRequestFetch()

  async function fetchDocumentTypes(): Promise<DocumentTypeEntity[]> {
    const { items } = await requestFetch<{ items: DocumentTypeEntity[] }>('/api/document-types')
    return items
  }

  async function createDocumentType(name: string, color: string): Promise<DocumentTypeEntity> {
    return await requestFetch<DocumentTypeEntity>('/api/document-types', {
      method: 'POST',
      body: { name, color },
    })
  }

  async function updateDocumentType(
    id: string,
    changes: { name?: string, color?: string },
  ): Promise<DocumentTypeEntity> {
    return await requestFetch<DocumentTypeEntity>(`/api/document-types/${id}`, {
      method: 'PATCH',
      body: changes,
    })
  }

  async function deleteDocumentType(id: string): Promise<void> {
    await requestFetch(`/api/document-types/${id}`, { method: 'DELETE' })
  }

  return { fetchDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType }
}
