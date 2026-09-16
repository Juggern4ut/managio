<script setup lang="ts">
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

const { data: document, refresh: refreshDocument } = await useAsyncData(
  `document-${id}`,
  () => requestFetch<DocumentDetail>(`/api/documents/${id}`),
)

const { data: events, refresh: refreshEvents } = await useAsyncData(
  `document-events-${id}`,
  () => requestFetch<{ items: ProcessingEvent[] }>(`/api/documents/${id}/events`),
)

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
    </div>

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
