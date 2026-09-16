<script setup lang="ts">
import type { UploadOutcome } from '~/composables/useDocuments'

interface QueueEntry {
  key: string
  name: string
  state: 'uploading' | 'uploaded' | 'duplicate' | 'error'
  message?: string
}

const { data: health } = await useFetch('/api/health')
const { list, loading, refresh, upload, deleteDocument } = useDocuments('inbox-list')
await refresh({ reviewStatus: 'pending' })

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const queue = ref<QueueEntry[]>([])

function openFileBrowser() {
  fileInput.value?.click()
}

function onFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) handleFiles(target.files)
  target.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files) handleFiles(event.dataTransfer.files)
}

async function handleFiles(files: FileList) {
  const entries = Array.from(files).map(file => ({ file, key: `${file.name}-${file.size}-${Date.now()}` }))

  for (const { file, key } of entries) {
    queue.value.unshift({ key, name: file.name, state: 'uploading' })
    const outcome = await upload(file)
    updateQueueEntry(key, outcome)
  }

  await refresh({ reviewStatus: 'pending' })
}

function updateQueueEntry(key: string, outcome: UploadOutcome) {
  const entry = queue.value.find(item => item.key === key)
  if (!entry) return

  if (outcome.status === 'uploaded') {
    entry.state = 'uploaded'
  }
  else if (outcome.status === 'duplicate') {
    entry.state = 'duplicate'
    entry.message = 'Already in your documents'
  }
  else {
    entry.state = 'error'
    entry.message = outcome.message
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

async function remove(id: string, filename: string) {
  if (!confirm(`Delete "${filename}"? This removes the original file and cannot be undone.`)) return
  await deleteDocument(id)
  await refresh({ reviewStatus: 'pending' })
}
</script>

<template>
  <div>
    <h1>Inbox</h1>

    <div
      class="dropzone"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <p>Drag a scan or photo here, or</p>
      <button type="button" @click="openFileBrowser">
        Choose file
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="application/pdf,image/*"
        capture="environment"
        multiple
        hidden
        @change="onFileInputChange"
      >
      <p class="hint">
        PDF, JPEG, PNG, TIFF, WEBP, or HEIC — up to 25 MB
      </p>
    </div>

    <ul v-if="queue.length" class="queue">
      <li v-for="item in queue" :key="item.key" :class="item.state">
        <span class="name">{{ item.name }}</span>
        <span class="state">
          {{ item.state }}<template v-if="item.message"> — {{ item.message }}</template>
        </span>
      </li>
    </ul>

    <h2>Needs review</h2>
    <p v-if="loading">
      Loading…
    </p>
    <p v-else-if="!list?.items.length">
      Nothing to review. Browse everything on the
      <NuxtLink to="/documents">
        Documents
      </NuxtLink> page.
    </p>
    <table v-else class="documents">
      <thead>
        <tr>
          <th>Filename</th>
          <th>Type</th>
          <th>Size</th>
          <th>Status</th>
          <th>Uploaded</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="doc in list.items" :key="doc.id">
          <td>{{ doc.originalFilename }}</td>
          <td>
            <TypeBadge :name="doc.typeName" :color="doc.typeColor" />
          </td>
          <td>{{ formatBytes(doc.fileSizeBytes) }}</td>
          <td>
            <span class="badge" :class="doc.processingStatus.toLowerCase()">{{ doc.processingStatus }}</span>
          </td>
          <td>{{ formatDate(doc.uploadedAt) }}</td>
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

    <div class="status" :class="health?.status">
      <strong>System status:</strong> {{ health?.status ?? 'unknown' }}
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background: white;
}

.dropzone.dragging {
  border-color: #1f6feb;
  background: #eff6ff;
}

.dropzone button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.hint {
  margin-top: 0.75rem;
  color: #6b7280;
  font-size: 0.8rem;
}

.queue {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.queue li {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.queue li.error {
  border-color: #c0392b;
  color: #c0392b;
}

.queue li.duplicate {
  color: #b45309;
}

.queue li.uploaded {
  color: #15803d;
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

.status {
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: white;
  border: 1px solid #e5e7eb;
  max-width: 320px;
  font-size: 0.875rem;
}

.status.degraded {
  border-color: #c0392b;
}

@media (max-width: 600px) {
  .documents {
    display: block;
    overflow-x: auto;
  }
}
</style>
