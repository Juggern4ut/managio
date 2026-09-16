export interface NamedEntity {
  id: string
  name: string
}

export function useOrganize() {
  const requestFetch = useRequestFetch()

  async function fetchCompanies(q?: string): Promise<NamedEntity[]> {
    const { items } = await requestFetch<{ items: NamedEntity[] }>('/api/companies', { query: { q } })
    return items
  }

  async function createCompany(name: string): Promise<NamedEntity> {
    return await requestFetch<NamedEntity>('/api/companies', { method: 'POST', body: { name } })
  }

  async function fetchCategories(): Promise<NamedEntity[]> {
    const { items } = await requestFetch<{ items: NamedEntity[] }>('/api/categories')
    return items
  }

  async function createCategory(name: string): Promise<NamedEntity> {
    return await requestFetch<NamedEntity>('/api/categories', { method: 'POST', body: { name } })
  }

  async function fetchTags(): Promise<NamedEntity[]> {
    const { items } = await requestFetch<{ items: NamedEntity[] }>('/api/tags')
    return items
  }

  return { fetchCompanies, createCompany, fetchCategories, createCategory, fetchTags }
}
