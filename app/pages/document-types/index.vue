<script setup lang="ts">
const { fetchDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType } = useDocumentTypes()

const { data: types, refresh } = await useAsyncData('document-types-page', fetchDocumentTypes)

const newName = ref('')
const newColor = ref('#2563eb')
const creating = ref(false)
const error = ref('')

const savingId = ref<string | null>(null)

async function create() {
  const name = newName.value.trim()
  if (!name) return
  creating.value = true
  error.value = ''
  try {
    await createDocumentType(name, newColor.value)
    newName.value = ''
    await refresh()
  }
  catch {
    error.value = 'Failed to create type.'
  }
  finally {
    creating.value = false
  }
}

async function saveColor(id: string, color: string) {
  savingId.value = id
  try {
    await updateDocumentType(id, { color })
    await refresh()
  }
  finally {
    savingId.value = null
  }
}

async function saveName(id: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  savingId.value = id
  try {
    await updateDocumentType(id, { name: trimmed })
    await refresh()
  }
  finally {
    savingId.value = null
  }
}

async function remove(id: string, name: string) {
  if (!confirm(`Delete type "${name}"? Documents using it become unassigned.`)) return
  await deleteDocumentType(id)
  await refresh()
}
</script>

<template>
  <div>
    <h1>Document types</h1>
    <p class="hint">
      Types are shown as colored badges on documents. Deleting a type doesn't delete documents — they just lose that type.
    </p>

    <form class="create-form" @submit.prevent="create">
      <input v-model="newName" placeholder="New type name…" required>
      <input v-model="newColor" type="color" title="Type color">
      <button type="submit" :disabled="creating">
        Add type
      </button>
    </form>
    <p v-if="error" class="error">
      {{ error }}
    </p>

    <p v-if="!types?.length" class="hint">
      No document types yet.
    </p>
    <ul v-else class="types">
      <li v-for="type in types" :key="type.id">
        <input
          type="color"
          :value="type.color"
          title="Change color"
          @change="saveColor(type.id, ($event.target as HTMLInputElement).value)"
        >
        <input
          class="name-input"
          :value="type.name"
          :disabled="savingId === type.id"
          @change="saveName(type.id, ($event.target as HTMLInputElement).value)"
        >
        <TypeBadge :name="type.name" :color="type.color" />
        <button type="button" class="link-button danger" @click="remove(type.id, type.name)">
          Delete
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hint {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.create-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.create-form input[type='text'],
.create-form input:not([type]) {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  flex: 1;
  max-width: 300px;
}

.create-form button {
  padding: 0.45rem 1rem;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error {
  color: #c0392b;
  font-size: 0.875rem;
}

.types {
  list-style: none;
  padding: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.types li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.types li:last-child {
  border-bottom: none;
}

.name-input {
  flex: 1;
  max-width: 260px;
  padding: 0.35rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.link-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-size: 0.875rem;
  margin-left: auto;
}

.link-button.danger {
  color: #c0392b;
}
</style>
