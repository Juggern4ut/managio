<script setup lang="ts">
import { relationTypeValues } from '#shared/schemas/relation'
import type { DocumentTypeEntity } from '~/composables/useDocumentTypes'
import type { NamedEntity } from '~/composables/useOrganize'

const route = useRoute()
const id = route.params.id as string

interface DocumentDetail {
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
  createdBy: string | null
  ocrText: string | null
  hasPreview: boolean
  hasSearchablePdf: boolean
  companyId: string | null
  companyName: string | null
  categoryId: string | null
  categoryName: string | null
  tags: NamedEntity[]
}

interface ProcessingEvent {
  id: string
  stage: string
  status: string
  startedAt: string
  endedAt: string | null
  errorCode: string | null
  errorMessage: string | null
}

interface DocumentRelation {
  id: string
  relationType: string
  direction: 'incoming' | 'outgoing'
  createdAt: string
  document: { id: string, originalFilename: string } | null
}

interface DocumentSearchResult {
  id: string
  originalFilename: string
}

interface ExtractedField {
  id: string
  fieldType: string
  rawText: string
  normalizedText: string | null
  amountMinorUnits: number | null
  currency: string | null
  companyId: string | null
  confidence: number
  extractionMethod: string
  sourceSnippet: string
}

const requestFetch = useRequestFetch()
const { fetchCompanies, createCompany, fetchCategories, createCategory } = useOrganize()
const { fetchDocumentTypes, createDocumentType } = useDocumentTypes()
const router = useRouter()

const { data: document, refresh: refreshDocument } = await useAsyncData(
  `document-${id}`,
  () => requestFetch<DocumentDetail>(`/api/documents/${id}`),
)

const { data: events, refresh: refreshEvents } = await useAsyncData(
  `document-events-${id}`,
  () => requestFetch<{ items: ProcessingEvent[] }>(`/api/documents/${id}/events`),
)

const { data: relations, refresh: refreshRelations } = await useAsyncData(
  `document-relations-${id}`,
  () => requestFetch<{ items: DocumentRelation[] }>(`/api/documents/${id}/relations`),
)

const { data: extractedFields, refresh: refreshExtractedFields } = await useAsyncData(
  `document-extracted-fields-${id}`,
  () => requestFetch<{ items: ExtractedField[] }>(`/api/documents/${id}/extracted-fields`),
)

const companies = ref<NamedEntity[]>([])
const categories = ref<NamedEntity[]>([])
const documentTypes = ref<DocumentTypeEntity[]>([])
;[companies.value, categories.value, documentTypes.value] = await Promise.all([
  fetchCompanies(),
  fetchCategories(),
  fetchDocumentTypes(),
])

const editTypeId = ref(document.value?.typeId ?? '')
const editCompanyId = ref(document.value?.companyId ?? '')
const editCategoryId = ref(document.value?.categoryId ?? '')
const editDate = ref(document.value?.documentDate?.slice(0, 10) ?? '')
const tagsInput = ref(document.value?.tags.map(t => t.name).join(', ') ?? '')
const newCompanyName = ref('')
const newCategoryName = ref('')
const newTypeName = ref('')
const newTypeColor = ref('#2563eb')
const saving = ref(false)
const saveMessage = ref('')
const deleting = ref(false)

const inProgress = computed(() =>
  document.value
  && !['COMPLETE', 'FAILED_PERMANENT', 'NEEDS_REVIEW'].includes(document.value.processingStatus),
)

// Poll while processing hasn't reached a terminal state yet.
let pollTimer: ReturnType<typeof setInterval> | undefined

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = undefined
}

onMounted(() => {
  if (!inProgress.value) return
  pollTimer = setInterval(async () => {
    await Promise.all([refreshDocument(), refreshEvents(), refreshExtractedFields()])
    if (!inProgress.value) stopPolling()
  }, 2000)
})

onUnmounted(() => {
  stopPolling()
  clearTimeout(relationSearchTimer)
})

async function addCompany() {
  const name = newCompanyName.value.trim()
  if (!name) return
  const company = await createCompany(name)
  if (!companies.value.some(c => c.id === company.id)) companies.value.push(company)
  editCompanyId.value = company.id
  newCompanyName.value = ''
}

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  const category = await createCategory(name)
  if (!categories.value.some(c => c.id === category.id)) categories.value.push(category)
  editCategoryId.value = category.id
  newCategoryName.value = ''
}

async function addType() {
  const name = newTypeName.value.trim()
  if (!name) return
  const type = await createDocumentType(name, newTypeColor.value)
  const existingIndex = documentTypes.value.findIndex(t => t.id === type.id)
  if (existingIndex === -1) documentTypes.value.push(type)
  else documentTypes.value[existingIndex] = type
  editTypeId.value = type.id
  newTypeName.value = ''
}

async function save() {
  saving.value = true
  saveMessage.value = ''
  try {
    await requestFetch(`/api/documents/${id}`, {
      method: 'PATCH',
      body: {
        typeId: editTypeId.value || null,
        companyId: editCompanyId.value || null,
        categoryId: editCategoryId.value || null,
        documentDate: editDate.value || null,
      },
    })
    const tagNames = tagsInput.value.split(',').map(name => name.trim()).filter(Boolean)
    await requestFetch(`/api/documents/${id}/tags`, { method: 'PUT', body: { tags: tagNames } })
    await refreshDocument()
    saveMessage.value = 'Saved'
  }
  catch {
    saveMessage.value = 'Failed to save'
  }
  finally {
    saving.value = false
  }
}

async function toggleReviewed() {
  if (!document.value) return
  const next = document.value.reviewStatus === 'approved' ? 'pending' : 'approved'
  await requestFetch(`/api/documents/${id}`, { method: 'PATCH', body: { reviewStatus: next } })
  await refreshDocument()
}

async function deleteDoc() {
  if (!document.value) return
  if (!confirm(`Delete "${document.value.originalFilename}"? This removes the original file and cannot be undone.`)) {
    return
  }
  deleting.value = true
  try {
    await requestFetch(`/api/documents/${id}`, { method: 'DELETE' })
    await router.push('/')
  }
  finally {
    deleting.value = false
  }
}

const relationSearch = ref('')
const relationResults = ref<DocumentSearchResult[]>([])
const relationTarget = ref<DocumentSearchResult | null>(null)
const relationType = ref<typeof relationTypeValues[number]>('related_to')
const relationError = ref('')
let relationSearchTimer: ReturnType<typeof setTimeout> | undefined

watch(relationSearch, (value) => {
  relationTarget.value = null
  clearTimeout(relationSearchTimer)
  if (!value.trim()) {
    relationResults.value = []
    return
  }
  relationSearchTimer = setTimeout(async () => {
    const { items } = await requestFetch<{ items: DocumentSearchResult[] }>('/api/documents', {
      query: { q: value, limit: 5 },
    })
    relationResults.value = items.filter(item => item.id !== id)
  }, 300)
})

function pickRelationTarget(result: DocumentSearchResult) {
  relationTarget.value = result
  relationSearch.value = result.originalFilename
  relationResults.value = []
}

async function addRelation() {
  if (!relationTarget.value) return
  relationError.value = ''
  try {
    await requestFetch(`/api/documents/${id}/relations`, {
      method: 'POST',
      body: { targetDocumentId: relationTarget.value.id, relationType: relationType.value },
    })
    relationSearch.value = ''
    relationTarget.value = null
    await refreshRelations()
  }
  catch (error) {
    relationError.value
      = (error as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to link document.'
  }
}

async function removeRelation(relationId: string) {
  await requestFetch(`/api/document-relations/${relationId}`, { method: 'DELETE' })
  await refreshRelations()
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

function formatFieldValue(field: ExtractedField): string {
  if (field.fieldType === 'amount') {
    return `${((field.amountMinorUnits ?? 0) / 100).toFixed(2)} ${field.currency}`
  }
  return field.normalizedText ?? field.rawText
}

function useAsDocumentDate(field: ExtractedField) {
  if (field.normalizedText) editDate.value = field.normalizedText
}

function setAsCompany(field: ExtractedField) {
  if (field.companyId) editCompanyId.value = field.companyId
}

const bestDocumentDate = computed(() =>
  extractedFields.value?.items.find(f => f.fieldType === 'document_date')?.normalizedText,
)

const bestCouponExpiration = computed(() =>
  extractedFields.value?.items.find(f => f.fieldType === 'coupon_expiration')?.normalizedText,
)

function receiptPrefillLink(field: ExtractedField) {
  return {
    path: '/receipts',
    query: {
      documentId: id,
      total: ((field.amountMinorUnits ?? 0) / 100).toFixed(2),
      currency: field.currency ?? 'CHF',
      date: bestDocumentDate.value,
    },
  }
}

function couponPrefillLink(field: ExtractedField) {
  return {
    path: '/coupons',
    query: {
      documentId: id,
      code: field.normalizedText,
      expiresOn: bestCouponExpiration.value,
    },
  }
}
</script>

<template>
  <div v-if="document">
    <NuxtLink to="/">
      ← Back to Inbox
    </NuxtLink>
    <h1>{{ document.originalFilename }}</h1>

    <div class="meta">
      <TypeBadge :name="document.typeName" :color="document.typeColor" />
      <span class="badge">{{ document.processingStatus }}</span>
      <span>{{ document.mimeType }}</span>
      <span>Uploaded {{ formatDate(document.uploadedAt) }}</span>
      <a :href="`/api/documents/${document.id}/original`" target="_blank" rel="noopener">Original</a>
      <a
        v-if="document.hasSearchablePdf"
        :href="`/api/documents/${document.id}/searchable`"
        target="_blank"
        rel="noopener"
      >Searchable PDF</a>
      <button type="button" class="link-button" @click="toggleReviewed">
        {{ document.reviewStatus === 'approved' ? 'Move back to inbox' : 'Mark reviewed' }}
      </button>
      <button type="button" class="link-button danger" :disabled="deleting" @click="deleteDoc">
        {{ deleting ? 'Deleting…' : 'Delete document' }}
      </button>
    </div>

    <form class="edit-panel" @submit.prevent="save">
      <div class="field">
        <label for="type">Type</label>
        <select id="type" v-model="editTypeId">
          <option value="">
            None
          </option>
          <option v-for="type in documentTypes" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
        <div class="inline-create">
          <input v-model="newTypeName" placeholder="New type…" @keyup.enter.prevent="addType">
          <input v-model="newTypeColor" type="color" class="color-input" title="Type color">
          <button type="button" @click="addType">
            Add
          </button>
        </div>
        <p class="manage-link">
          <NuxtLink to="/document-types">
            Manage types
          </NuxtLink>
        </p>
      </div>

      <div class="field">
        <label for="company">Company</label>
        <select id="company" v-model="editCompanyId">
          <option value="">
            None
          </option>
          <option v-for="company in companies" :key="company.id" :value="company.id">
            {{ company.name }}
          </option>
        </select>
        <div class="inline-create">
          <input v-model="newCompanyName" placeholder="New company…" @keyup.enter.prevent="addCompany">
          <button type="button" @click="addCompany">
            Add
          </button>
        </div>
      </div>

      <div class="field">
        <label for="category">Category</label>
        <select id="category" v-model="editCategoryId">
          <option value="">
            None
          </option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
        <div class="inline-create">
          <input v-model="newCategoryName" placeholder="New category…" @keyup.enter.prevent="addCategory">
          <button type="button" @click="addCategory">
            Add
          </button>
        </div>
      </div>

      <div class="field">
        <label for="tags">Tags</label>
        <input id="tags" v-model="tagsInput" placeholder="comma, separated, tags">
      </div>

      <div class="field">
        <label for="date">Document date</label>
        <input id="date" v-model="editDate" type="date">
      </div>

      <div class="actions">
        <button type="submit" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <span v-if="saveMessage" class="save-message">{{ saveMessage }}</span>
      </div>
    </form>

    <div class="layout">
      <div class="preview">
        <img
          v-if="document.hasPreview"
          :src="`/api/documents/${document.id}/preview`"
          :alt="`Preview of ${document.originalFilename}`"
        >
        <p v-else class="hint">
          Preview not generated yet.
        </p>
      </div>

      <div class="text">
        <h2>OCR text</h2>
        <pre v-if="document.ocrText">{{ document.ocrText }}</pre>
        <p v-else class="hint">
          No OCR text yet.
        </p>
      </div>
    </div>

    <h2>Extracted fields</h2>
    <p class="hint disclaimer">
      Found automatically by pattern matching — nothing here is applied until you use it.
    </p>
    <ul v-if="extractedFields?.items.length" class="extracted-fields">
      <li v-for="field in extractedFields.items" :key="field.id">
        <span class="badge">{{ field.fieldType }}</span>
        <span class="value">{{ formatFieldValue(field) }}</span>
        <span class="confidence">{{ Math.round(field.confidence * 100) }}%</span>
        <span class="snippet">{{ field.sourceSnippet }}</span>
        <span class="apply-actions">
          <button v-if="field.fieldType === 'document_date'" type="button" class="link-button" @click="useAsDocumentDate(field)">
            Use as document date
          </button>
          <button v-if="field.fieldType === 'company' && field.companyId" type="button" class="link-button" @click="setAsCompany(field)">
            Set as company
          </button>
          <NuxtLink v-if="field.fieldType === 'amount'" class="link-button" :to="receiptPrefillLink(field)">
            Create receipt
          </NuxtLink>
          <NuxtLink v-if="field.fieldType === 'coupon_code'" class="link-button" :to="couponPrefillLink(field)">
            Create coupon
          </NuxtLink>
        </span>
      </li>
    </ul>
    <p v-else class="hint">
      No fields extracted yet.
    </p>

    <h2>Processing history</h2>
    <ul v-if="events?.items.length" class="events">
      <li v-for="item in events.items" :key="item.id" :class="item.status">
        <strong>{{ item.stage }}</strong> — {{ item.status }}
        <span class="time">{{ formatDate(item.startedAt) }}<template v-if="item.endedAt"> → {{ formatDate(item.endedAt) }}</template></span>
        <span v-if="item.errorMessage" class="error">{{ item.errorMessage }}</span>
      </li>
    </ul>
    <p v-else class="hint">
      No processing events yet.
    </p>

    <h2>Related documents</h2>
    <ul v-if="relations?.items.length" class="relations">
      <li v-for="relation in relations.items" :key="relation.id">
        <span class="direction">{{ relation.direction === 'outgoing' ? '→' : '←' }}</span>
        <span class="badge">{{ relation.relationType }}</span>
        <NuxtLink v-if="relation.document" :to="`/documents/${relation.document.id}`">
          {{ relation.document.originalFilename }}
        </NuxtLink>
        <button type="button" class="link-button danger" @click="removeRelation(relation.id)">
          Unlink
        </button>
      </li>
    </ul>
    <p v-else class="hint">
      No related documents yet.
    </p>

    <form class="relation-form" @submit.prevent="addRelation">
      <div class="search-box">
        <input v-model="relationSearch" placeholder="Search a document to link…">
        <ul v-if="relationResults.length" class="results">
          <li v-for="result in relationResults" :key="result.id" @click="pickRelationTarget(result)">
            {{ result.originalFilename }}
          </li>
        </ul>
      </div>
      <select v-model="relationType">
        <option v-for="type in relationTypeValues" :key="type" :value="type">
          {{ type }}
        </option>
      </select>
      <button type="submit" :disabled="!relationTarget">
        Link
      </button>
    </form>
    <p v-if="relationError" class="error">
      {{ relationError }}
    </p>
  </div>
</template>

<style scoped>
h1 {
  margin-top: 0.5rem;
}

.meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
}

.link-button {
  background: none;
  border: none;
  color: #1f6feb;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
}

.link-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.edit-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.875rem;
}

.field label {
  font-weight: 600;
}

.field select,
.field input {
  padding: 0.4rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.inline-create {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.inline-create input {
  flex: 1;
  min-width: 0;
}

.inline-create .color-input {
  flex: none;
  width: 2.5rem;
  padding: 0.1rem;
}

.manage-link {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  grid-column: 1 / -1;
}

.actions button[type='submit'] {
  padding: 0.5rem 1.25rem;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-message {
  color: #15803d;
  font-size: 0.875rem;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.preview img {
  max-width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.text pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  max-height: 500px;
  overflow-y: auto;
  font-size: 0.8rem;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.events {
  list-style: none;
  padding: 0;
}

.events li {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: baseline;
}

.events li.failed {
  color: #c0392b;
}

.events .time {
  color: #6b7280;
  font-size: 0.8rem;
}

.events .error {
  color: #c0392b;
}

.disclaimer {
  margin-top: -0.5rem;
  margin-bottom: 0.75rem;
}

.extracted-fields {
  list-style: none;
  padding: 0;
  margin-bottom: 1.5rem;
}

.extracted-fields li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.extracted-fields .value {
  font-weight: 600;
}

.extracted-fields .confidence {
  color: #6b7280;
  font-size: 0.75rem;
}

.extracted-fields .snippet {
  color: #9ca3af;
  font-size: 0.75rem;
  flex-basis: 100%;
}

.extracted-fields .apply-actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.relations {
  list-style: none;
  padding: 0;
  margin-bottom: 1rem;
}

.relations li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.direction {
  color: #9ca3af;
}

.link-button.danger {
  color: #c0392b;
  margin-left: auto;
}

.relation-form {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-box input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.results {
  position: absolute;
  z-index: 10;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
}

.results li {
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.results li:hover {
  background: #f3f4f6;
}

.relation-form select {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.relation-form button[type='submit'] {
  padding: 0.45rem 1rem;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.relation-form button[type='submit']:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
