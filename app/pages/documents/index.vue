<script setup lang="ts">
import { reviewStatusValues } from '#shared/schemas/document'
import type { DocumentTypeEntity } from '~/composables/useDocumentTypes'
import type { NamedEntity } from '~/composables/useOrganize'

const { list, loading, refresh, deleteDocument } = useDocuments('documents-search')
const { fetchCompanies } = useOrganize()
const { fetchDocumentTypes } = useDocumentTypes()

const q = ref('')
const typeId = ref('')
const reviewStatus = ref('')
const companyId = ref('')
const companies = ref<NamedEntity[]>([])
const documentTypes = ref<DocumentTypeEntity[]>([])
const offset = ref(0)
const limit = 25

async function runSearch() {
  await refresh({
    q: q.value || undefined,
    typeId: typeId.value || undefined,
    reviewStatus: reviewStatus.value || undefined,
    companyId: companyId.value || undefined,
    limit,
    offset: offset.value,
  })
}

await Promise.all([
  runSearch(),
  fetchCompanies().then(items => (companies.value = items)),
  fetchDocumentTypes().then(items => (documentTypes.value = items)),
])

watch([q, typeId, reviewStatus, companyId], () => {
  offset.value = 0
  runSearch()
})

function nextPage() {
  if (!list.value || offset.value + limit >= list.value.total) return
  offset.value += limit
  runSearch()
}

function prevPage() {
  offset.value = Math.max(0, offset.value - limit)
  runSearch()
}

async function remove(id: string, filename: string) {
  if (!confirm(`Delete "${filename}"? This removes the original file and cannot be undone.`)) return
  await deleteDocument(id)
  await runSearch()
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—'
}
</script>

<template>
  <div>
    <h1>Documents</h1>

    <div class="filters">
      <input v-model="q" type="search" placeholder="Search filename or OCR text…" class="search">
      <select v-model="typeId">
        <option value="">
          All types
        </option>
        <option v-for="type in documentTypes" :key="type.id" :value="type.id">
          {{ type.name }}
        </option>
      </select>
      <select v-model="reviewStatus">
        <option value="">
          Any review status
        </option>
        <option v-for="status in reviewStatusValues" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
      <select v-model="companyId">
        <option value="">
          All companies
        </option>
        <option v-for="company in companies" :key="company.id" :value="company.id">
          {{ company.name }}
        </option>
      </select>
    </div>

    <p v-if="loading">
      Searching…
    </p>
    <p v-else-if="!list?.items.length">
      No documents match.
    </p>
    <template v-else>
      <table class="documents">
        <thead>
          <tr>
            <th>Filename</th>
            <th>Type</th>
            <th>Company</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in list.items" :key="doc.id">
            <td>{{ doc.originalFilename }}</td>
            <td>
              <TypeBadge :name="doc.typeName" :color="doc.typeColor" />
            </td>
            <td>{{ doc.companyName ?? '—' }}</td>
            <td>{{ doc.categoryName ?? '—' }}</td>
            <td>
              <span class="badge">{{ doc.reviewStatus }}</span>
            </td>
            <td>{{ formatDate(doc.documentDate) }}</td>
            <td class="actions">
              <NuxtLink :to="`/documents/${doc.id}`">
                View
              </NuxtLink>
              <button type="button" class="link-button danger" @click="remove(doc.id, doc.originalFilename)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button type="button" :disabled="offset === 0" @click="prevPage">
          ← Previous
        </button>
        <span>{{ offset + 1 }}–{{ Math.min(offset + limit, list.total) }} of {{ list.total }}</span>
        <button type="button" :disabled="offset + limit >= list.total" @click="nextPage">
          Next →
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.search {
  flex: 1;
  min-width: 200px;
}

.filters input,
.filters select {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.documents {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.documents th,
.documents td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 0.75rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.link-button {
  background: none;
  border: none;
  color: #1f6feb;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-size: 0.875rem;
}

.link-button.danger {
  color: #c0392b;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.pagination button {
  padding: 0.35rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (max-width: 700px) {
  .documents {
    display: block;
    overflow-x: auto;
  }
}
</style>
