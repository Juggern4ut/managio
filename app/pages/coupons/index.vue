<script setup lang="ts">
import { discountTypeValues } from '#shared/schemas/coupon'
import type { NamedEntity } from '~/composables/useOrganize'

interface Coupon {
  id: string
  issuerCompanyId: string | null
  issuerCompanyName: string | null
  code: string | null
  discountType: string
  discountValue: number
  currency: string | null
  validFrom: string | null
  expiresOn: string | null
  minimumPurchaseMinorUnits: number | null
  conditions: string | null
}

const route = useRoute()
const requestFetch = useRequestFetch()
const { fetchCompanies } = useOrganize()

const { data: coupons, refresh } = await useAsyncData('coupons', () =>
  requestFetch<{ items: Coupon[] }>('/api/coupons'))
const companies = ref<NamedEntity[]>(await fetchCompanies())

// Prefilled when arriving from a document's extracted fields, e.g.
// /coupons?documentId=...&code=SAVE20&expiresOn=2026-12-31
const sourceDocumentId = ref((route.query.documentId as string) || '')
const code = ref((route.query.code as string) || '')
const issuerCompanyId = ref('')
const discountType = ref<typeof discountTypeValues[number]>('percentage')
const discountValue = ref<number | null>(null)
const expiresOn = ref((route.query.expiresOn as string) || '')
const conditions = ref('')
const creating = ref(false)
const error = ref('')

async function create() {
  if (discountValue.value == null) return
  creating.value = true
  error.value = ''
  try {
    await requestFetch('/api/coupons', {
      method: 'POST',
      body: {
        sourceDocumentId: sourceDocumentId.value || undefined,
        code: code.value || undefined,
        issuerCompanyId: issuerCompanyId.value || undefined,
        discountType: discountType.value,
        discountValue: discountValue.value,
        expiresOn: expiresOn.value || undefined,
        conditions: conditions.value || undefined,
      },
    })
    code.value = ''
    discountValue.value = null
    expiresOn.value = ''
    conditions.value = ''
    sourceDocumentId.value = ''
    await refresh()
  }
  catch {
    error.value = 'Failed to create coupon.'
  }
  finally {
    creating.value = false
  }
}

async function remove(id: string) {
  await requestFetch(`/api/coupons/${id}`, { method: 'DELETE' })
  await refresh()
}

function formatDiscount(coupon: Coupon): string {
  if (coupon.discountType === 'percentage') return `${coupon.discountValue}%`
  if (coupon.discountType === 'fixed_amount') return `${(coupon.discountValue / 100).toFixed(2)} ${coupon.currency ?? ''}`
  return String(coupon.discountValue)
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—'
}

function isExpired(coupon: Coupon): boolean {
  return coupon.expiresOn ? new Date(coupon.expiresOn) < new Date() : false
}
</script>

<template>
  <div>
    <h1>Coupons</h1>

    <p v-if="sourceDocumentId" class="linked-hint">
      Linked to <NuxtLink :to="`/documents/${sourceDocumentId}`">
        this document
      </NuxtLink>
    </p>

    <form class="create-form" @submit.prevent="create">
      <input v-model="code" placeholder="Code (optional)">
      <select v-model="issuerCompanyId">
        <option value="">
          No issuer
        </option>
        <option v-for="company in companies" :key="company.id" :value="company.id">
          {{ company.name }}
        </option>
      </select>
      <select v-model="discountType">
        <option v-for="type in discountTypeValues" :key="type" :value="type">
          {{ type }}
        </option>
      </select>
      <input v-model.number="discountValue" type="number" min="0" placeholder="Value" required>
      <input v-model="expiresOn" type="date" title="Expires on">
      <input v-model="conditions" placeholder="Conditions">
      <button type="submit" :disabled="creating">
        Add
      </button>
    </form>
    <p v-if="error" class="error">
      {{ error }}
    </p>

    <p v-if="!coupons?.items.length" class="hint">
      No coupons yet.
    </p>
    <table v-else class="list">
      <thead>
        <tr>
          <th>Code</th>
          <th>Issuer</th>
          <th>Discount</th>
          <th>Expires</th>
          <th>Conditions</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="coupon in coupons.items" :key="coupon.id">
          <td>{{ coupon.code ?? '—' }}</td>
          <td>{{ coupon.issuerCompanyName ?? '—' }}</td>
          <td>{{ formatDiscount(coupon) }}</td>
          <td>
            <span v-if="!coupon.expiresOn" class="hint">no expiration recorded</span>
            <span v-else :class="{ expired: isExpired(coupon) }">{{ formatDate(coupon.expiresOn) }}</span>
          </td>
          <td>{{ coupon.conditions ?? '—' }}</td>
          <td>
            <button type="button" class="link-button" @click="remove(coupon.id)">
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

.linked-hint {
  color: #1f6feb;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.expired {
  color: #b91c1c;
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
