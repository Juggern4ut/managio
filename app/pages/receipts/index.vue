<script setup lang="ts">
import type { NamedEntity } from '~/composables/useOrganize'

interface ReceiptItem {
  id: string
  description: string
  quantity: number
  unitPriceMinorUnits: number
  totalMinorUnits: number
  productId: string | null
}

interface Receipt {
  id: string
  merchantCompanyId: string | null
  merchantCompanyName: string | null
  purchaseDate: string
  totalMinorUnits: number
  currency: string
  taxMinorUnits: number | null
}

interface ItemDraft {
  description: string
  quantity: number
  unitPrice: number | null
  productId: string
}

const route = useRoute()
const requestFetch = useRequestFetch()
const { fetchCompanies, createCompany } = useOrganize()

const { data: receipts, refresh } = await useAsyncData('receipts', () =>
  requestFetch<{ items: Receipt[] }>('/api/receipts'))
const { data: products } = await useAsyncData('products-for-receipt', () =>
  requestFetch<{ items: NamedEntity[] }>('/api/products'))
const companies = ref<NamedEntity[]>(await fetchCompanies())

// Prefilled when arriving from a document's extracted fields, e.g.
// /receipts?documentId=...&total=12.50&date=2026-09-14&currency=CHF
const documentId = ref((route.query.documentId as string) || '')
const merchantCompanyId = ref('')
const newCompanyName = ref('')
const purchaseDate = ref((route.query.date as string) || '')
const total = ref<number | null>(route.query.total ? Number(route.query.total) : null)
const currency = ref((route.query.currency as string) || 'CHF')
const items = ref<ItemDraft[]>([])
const creating = ref(false)
const error = ref('')

const expanded = ref<Record<string, ReceiptItem[] | undefined>>({})

function addItemRow() {
  items.value.push({ description: '', quantity: 1, unitPrice: null, productId: '' })
}

function removeItemRow(index: number) {
  items.value.splice(index, 1)
}

const itemsTotalMinorUnits = computed(() =>
  items.value.reduce((sum, item) => sum + Math.round((item.unitPrice ?? 0) * 100) * item.quantity, 0),
)

const totalMismatch = computed(() => {
  if (total.value == null || items.value.length === 0) return false
  return Math.round(total.value * 100) !== itemsTotalMinorUnits.value
})

async function addCompany() {
  const name = newCompanyName.value.trim()
  if (!name) return
  const company = await createCompany(name)
  if (!companies.value.some(c => c.id === company.id)) companies.value.push(company)
  merchantCompanyId.value = company.id
  newCompanyName.value = ''
}

async function create() {
  if (total.value == null || !purchaseDate.value) return
  creating.value = true
  error.value = ''
  try {
    await requestFetch('/api/receipts', {
      method: 'POST',
      body: {
        documentId: documentId.value || undefined,
        merchantCompanyId: merchantCompanyId.value || undefined,
        purchaseDate: purchaseDate.value,
        totalMinorUnits: Math.round(total.value * 100),
        currency: currency.value,
        items: items.value
          .filter(item => item.description.trim() && item.unitPrice != null)
          .map(item => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPriceMinorUnits: Math.round((item.unitPrice ?? 0) * 100),
            totalMinorUnits: Math.round((item.unitPrice ?? 0) * 100) * item.quantity,
            productId: item.productId || undefined,
          })),
      },
    })
    purchaseDate.value = ''
    total.value = null
    items.value = []
    documentId.value = ''
    await refresh()
  }
  catch {
    error.value = 'Failed to create receipt.'
  }
  finally {
    creating.value = false
  }
}

async function remove(id: string) {
  await requestFetch(`/api/receipts/${id}`, { method: 'DELETE' })
  await refresh()
}

async function toggleExpand(id: string) {
  if (expanded.value[id]) {
    expanded.value[id] = undefined
    return
  }
  const detail = await requestFetch<Receipt & { items: ReceiptItem[] }>(`/api/receipts/${id}`)
  expanded.value[id] = detail.items
}

function formatAmount(minorUnits: number, currencyCode: string): string {
  return `${(minorUnits / 100).toFixed(2)} ${currencyCode}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}
</script>

<template>
  <div>
    <h1>Receipts</h1>

    <p v-if="documentId" class="linked-hint">
      Linked to <NuxtLink :to="`/documents/${documentId}`">
        this document
      </NuxtLink>
    </p>

    <form class="create-form" @submit.prevent="create">
      <div class="row">
        <select v-model="merchantCompanyId">
          <option value="">
            No merchant
          </option>
          <option v-for="company in companies" :key="company.id" :value="company.id">
            {{ company.name }}
          </option>
        </select>
        <input v-model="newCompanyName" placeholder="New merchant…" @keyup.enter.prevent="addCompany">
        <button type="button" @click="addCompany">
          Add merchant
        </button>
      </div>

      <div class="row">
        <input v-model="purchaseDate" type="date" required>
        <input v-model.number="total" type="number" step="0.01" min="0" placeholder="Total" required>
        <input v-model="currency" placeholder="CHF" maxlength="3" class="currency">
      </div>

      <h3>Items (optional)</h3>
      <div v-for="(item, index) in items" :key="index" class="item-row">
        <input v-model="item.description" placeholder="Description">
        <input v-model.number="item.quantity" type="number" step="0.001" min="0" placeholder="Qty">
        <input v-model.number="item.unitPrice" type="number" step="0.01" min="0" placeholder="Unit price">
        <select v-model="item.productId">
          <option value="">
            No product
          </option>
          <option v-for="product in products?.items" :key="product.id" :value="product.id">
            {{ product.name }}
          </option>
        </select>
        <button type="button" class="link-button" @click="removeItemRow(index)">
          Remove
        </button>
      </div>
      <button type="button" class="add-item" @click="addItemRow">
        + Add item
      </button>

      <p v-if="totalMismatch" class="mismatch">
        Item totals ({{ (itemsTotalMinorUnits / 100).toFixed(2) }}) don't match the receipt total — both are kept as entered.
      </p>
      <p v-if="error" class="error">
        {{ error }}
      </p>

      <button type="submit" class="submit" :disabled="creating">
        {{ creating ? 'Saving…' : 'Save receipt' }}
      </button>
    </form>

    <p v-if="!receipts?.items.length" class="hint">
      No receipts yet.
    </p>
    <table v-else class="list">
      <thead>
        <tr>
          <th>Date</th>
          <th>Merchant</th>
          <th>Total</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <template v-for="receipt in receipts.items" :key="receipt.id">
          <tr>
            <td>{{ formatDate(receipt.purchaseDate) }}</td>
            <td>{{ receipt.merchantCompanyName ?? '—' }}</td>
            <td>{{ formatAmount(receipt.totalMinorUnits, receipt.currency) }}</td>
            <td>
              <button type="button" class="link-button" @click="toggleExpand(receipt.id)">
                {{ expanded[receipt.id] ? 'Hide items' : 'Items' }}
              </button>
              <button type="button" class="link-button danger" @click="remove(receipt.id)">
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="expanded[receipt.id]">
            <td colspan="4">
              <ul v-if="expanded[receipt.id]!.length" class="items">
                <li v-for="item in expanded[receipt.id]" :key="item.id">
                  {{ item.quantity }}× {{ item.description }} — {{ formatAmount(item.totalMinorUnits, receipt.currency) }}
                </li>
              </ul>
              <p v-else class="hint">
                No line items recorded.
              </p>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.create-form {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.item-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
  align-items: center;
}

.create-form input,
.create-form select {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.currency {
  width: 4.5rem;
}

.add-item {
  background: none;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}

.mismatch {
  color: #b45309;
  font-size: 0.8rem;
}

.error {
  color: #c0392b;
  font-size: 0.875rem;
}

.linked-hint {
  color: #1f6feb;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.submit {
  padding: 0.5rem 1.25rem;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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

.items {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: #4b5563;
}

.link-button {
  background: none;
  border: none;
  color: #1f6feb;
  cursor: pointer;
  padding: 0;
  margin-right: 0.75rem;
  text-decoration: underline;
  font-size: 0.8rem;
}

.link-button.danger {
  color: #c0392b;
}

@media (max-width: 700px) {
  .list {
    display: block;
    overflow-x: auto;
  }
}
</style>
