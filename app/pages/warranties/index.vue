<script setup lang="ts">
interface Warranty {
  id: string
  productId: string
  productName: string
  startsOn: string
  endsOn: string
  warrantyType: string | null
  notes: string | null
}

interface Product { id: string, name: string }

const requestFetch = useRequestFetch()
const { data: warranties, refresh } = await useAsyncData('warranties', () =>
  requestFetch<{ items: Warranty[] }>('/api/warranties'))
const { data: products } = await useAsyncData('products-for-warranty', () =>
  requestFetch<{ items: Product[] }>('/api/products'))

const productId = ref('')
const startsOn = ref('')
const endsOn = ref('')
const warrantyType = ref('')
const creating = ref(false)
const error = ref('')

async function create() {
  if (!productId.value || !startsOn.value || !endsOn.value) return
  creating.value = true
  error.value = ''
  try {
    await requestFetch('/api/warranties', {
      method: 'POST',
      body: {
        productId: productId.value,
        startsOn: startsOn.value,
        endsOn: endsOn.value,
        warrantyType: warrantyType.value || undefined,
      },
    })
    startsOn.value = ''
    endsOn.value = ''
    warrantyType.value = ''
    await refresh()
  }
  catch {
    error.value = 'Failed to create warranty.'
  }
  finally {
    creating.value = false
  }
}

async function remove(id: string) {
  await requestFetch(`/api/warranties/${id}`, { method: 'DELETE' })
  await refresh()
}

function isExpired(endsOn: string): boolean {
  return new Date(endsOn) < new Date()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}
</script>

<template>
  <div>
    <h1>Warranties</h1>

    <form class="create-form" @submit.prevent="create">
      <select v-model="productId" required>
        <option value="" disabled>
          Product…
        </option>
        <option v-for="product in products?.items" :key="product.id" :value="product.id">
          {{ product.name }}
        </option>
      </select>
      <input v-model="startsOn" type="date" required title="Starts on">
      <input v-model="endsOn" type="date" required title="Ends on">
      <input v-model="warrantyType" placeholder="Type (manufacturer, extended…)">
      <button type="submit" :disabled="creating">
        Add
      </button>
    </form>
    <p v-if="error" class="error">
      {{ error }}
    </p>
    <p v-if="!products?.items.length" class="hint">
      Add a product first.
    </p>

    <p v-if="!warranties?.items.length" class="hint">
      No warranties yet.
    </p>
    <table v-else class="list">
      <thead>
        <tr>
          <th>Product</th>
          <th>Type</th>
          <th>Starts</th>
          <th>Ends</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="warranty in warranties.items" :key="warranty.id">
          <td>{{ warranty.productName }}</td>
          <td>{{ warranty.warrantyType ?? '—' }}</td>
          <td>{{ formatDate(warranty.startsOn) }}</td>
          <td>{{ formatDate(warranty.endsOn) }}</td>
          <td>
            <span class="badge" :class="{ expired: isExpired(warranty.endsOn) }">
              {{ isExpired(warranty.endsOn) ? 'expired' : 'active' }}
            </span>
          </td>
          <td>
            <button type="button" class="link-button" @click="remove(warranty.id)">
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

.create-form input,
.create-form select {
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

.badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.75rem;
}

.badge.expired {
  background: #fee2e2;
  color: #b91c1c;
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
