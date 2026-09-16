<script setup lang="ts">
import { documentTypeValues } from '#shared/schemas/document'
import type { NamedEntity } from '~/composables/useOrganize'

const route = useRoute()
const id = route.params.id as string

interface DocumentDetail {
  id: string
  originalFilename: string
  mimeType: string
  fileSizeBytes: number
  documentType: string
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

const requestFetch = useRequestFetch()
const { fetchCompanies, createCompany, fetchCategories, createCategory } = useOrganize()

const { data: document, refresh: refreshDocument } = await useAsyncData(
  `document-${id}`,
  () => requestFetch<DocumentDetail>(`/api/documents/${id}`),
)

const { data: events, refresh: refreshEvents } = await useAsyncData(
  `document-events-${id}`,
  () => requestFetch<{ items: ProcessingEvent[] }>(`/api/documents/${id}/events`),
)

const companies = ref<NamedEntity[]>([])
const categories = ref<NamedEntity[]>([])
;[companies.value, categories.value] = await Promise.all([fetchCompanies(), fetchCategories()])

const editType = ref(document.value?.documentType ?? 'unknown')
const editCompanyId = ref(document.value?.companyId ?? '')
const editCategoryId = ref(document.value?.categoryId ?? '')
const editDate = ref(document.value?.documentDate?.slice(0, 10) ?? '')
const tagsInput = ref(document.value?.tags.map(t => t.name).join(', ') ?? '')
const newCompanyName = ref('')
const newCategoryName = ref('')
const saving = ref(false)
const saveMessage = ref('')

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
    await Promise.all([refreshDocument(), refreshEvents()])
    if (!inProgress.value) stopPolling()
  }, 2000)
})

onUnmounted(stopPolling)

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

async function save() {
  saving.value = true
  saveMessage.value = ''
  try {
    await requestFetch(`/api/documents/${id}`, {
      method: 'PATCH',
      body: {
        documentType: editType.value,
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

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}
</script>

<template>
  <div v-if="document">
    <NuxtLink to="/">
      ← Back to Inbox
    </NuxtLink>
    <h1>{{ document.originalFilename }}</h1>

    <div class="meta">
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
    </div>

    <form class="edit-panel" @submit.prevent="save">
      <div class="field">
        <label for="type">Type</label>
        <select id="type" v-model="editType">
          <option v-for="type in documentTypeValues" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
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
</style>
