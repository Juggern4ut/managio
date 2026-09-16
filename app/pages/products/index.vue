<script setup lang="ts">
interface Product {
  id: string
  name: string
  serialNumber: string | null
  modelNumber: string | null
  manufacturer: string | null
  purchaseDate: string | null
}

const requestFetch = useRequestFetch()
const { data: products, refresh } = await useAsyncData('products', () =>
  requestFetch<{ items: Product[] }>('/api/products'))

const name = ref('')
const manufacturer = ref('')
const serialNumber = ref('')
const modelNumber = ref('')
const purchaseDate = ref('')
const creating = ref(false)
const error = ref('')

async function create() {
  if (!name.value.trim()) return
  creating.value = true
  error.value = ''
  try {
    await requestFetch('/api/products', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        manufacturer: manufacturer.value || undefined,
        serialNumber: serialNumber.value || undefined,
        modelNumber: modelNumber.value || undefined,
        purchaseDate: purchaseDate.value || undefined,
      },
    })
    name.value = ''
    manufacturer.value = ''
    serialNumber.value = ''
    modelNumber.value = ''
    purchaseDate.value = ''
    await refresh()
  }
  catch {
    error.value = 'Failed to create product.'
  }
  finally {
    creating.value = false
  }
}

async function remove(id: string) {
  await requestFetch(`/api/products/${id}`, { method: 'DELETE' })
  await refresh()
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—'
}
</script>

<template>
  <div>
    <h1>Products</h1>

    <form class="create-form" @submit.prevent="create">
      <input v-model="name" placeholder="Name" required>
      <input v-model="manufacturer" placeholder="Manufacturer">
      <input v-model="serialNumber" placeholder="Serial number">
      <input v-model="modelNumber" placeholder="Model number">
      <input v-model="purchaseDate" type="date">
      <button type="submit" :disabled="creating">
        Add
      </button>
    </form>
    <p v-if="error" class="error">
      {{ error }}
    </p>

    <p v-if="!products?.items.length" class="hint">
      No products yet.
    </p>
    <table v-else class="list">
      <thead>
        <tr>
          <th>Name</th>
          <th>Manufacturer</th>
          <th>Serial</th>
          <th>Model</th>
          <th>Purchased</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in products.items" :key="product.id">
          <td>{{ product.name }}</td>
          <td>{{ product.manufacturer ?? '—' }}</td>
          <td>{{ product.serialNumber ?? '—' }}</td>
          <td>{{ product.modelNumber ?? '—' }}</td>
          <td>{{ formatDate(product.purchaseDate) }}</td>
          <td>
            <button type="button" class="link-button" @click="remove(product.id)">
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.create-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.create-form input {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
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

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.list {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.list th,
.list td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.link-button {
  background: none;
  border: none;
  color: #c0392b;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-size: 0.8rem;
}

@media (max-width: 700px) {
  .list {
    display: block;
    overflow-x: auto;
  }
}
</style>
