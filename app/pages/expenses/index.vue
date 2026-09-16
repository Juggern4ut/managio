<script setup lang="ts">
import type { NamedEntity } from '~/composables/useOrganize'

interface Expense {
  id: string
  receiptId: string | null
  categoryId: string | null
  categoryName: string | null
  amountMinorUnits: number
  currency: string
  expenseDate: string
  description: string | null
}

const requestFetch = useRequestFetch()
const { fetchCategories } = useOrganize()

const { data: expenses, refresh } = await useAsyncData('expenses', () =>
  requestFetch<{ items: Expense[] }>('/api/expenses'))
const categories = ref<NamedEntity[]>(await fetchCategories())

const amount = ref<number | null>(null)
const currency = ref('CHF')
const expenseDate = ref('')
const categoryId = ref('')
const description = ref('')
const creating = ref(false)
const error = ref('')

async function create() {
  if (amount.value == null || !expenseDate.value) return
  creating.value = true
  error.value = ''
  try {
    await requestFetch('/api/expenses', {
      method: 'POST',
      body: {
        amountMinorUnits: Math.round(amount.value * 100),
        currency: currency.value,
        expenseDate: expenseDate.value,
        categoryId: categoryId.value || undefined,
        description: description.value || undefined,
      },
    })
    amount.value = null
    expenseDate.value = ''
    description.value = ''
    await refresh()
  }
  catch {
    error.value = 'Failed to create expense.'
  }
  finally {
    creating.value = false
  }
}

async function remove(id: string) {
  await requestFetch(`/api/expenses/${id}`, { method: 'DELETE' })
  await refresh()
}

function formatAmount(expense: Expense): string {
  return `${(expense.amountMinorUnits / 100).toFixed(2)} ${expense.currency}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

const total = computed(() =>
  (expenses.value?.items ?? []).reduce((sum, expense) => sum + expense.amountMinorUnits, 0) / 100,
)
</script>

<template>
  <div>
    <h1>Expenses</h1>

    <form class="create-form" @submit.prevent="create">
      <input v-model.number="amount" type="number" step="0.01" min="0" placeholder="Amount" required>
      <input v-model="currency" placeholder="CHF" maxlength="3" class="currency">
      <input v-model="expenseDate" type="date" required>
      <select v-model="categoryId">
        <option value="">
          No category
        </option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>
      <input v-model="description" placeholder="Description">
      <button type="submit" :disabled="creating">
        Add
      </button>
    </form>
    <p v-if="error" class="error">
      {{ error }}
    </p>

    <p v-if="!expenses?.items.length" class="hint">
      No expenses yet.
    </p>
    <template v-else>
      <table class="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in expenses.items" :key="expense.id">
            <td>{{ formatDate(expense.expenseDate) }}</td>
            <td>{{ expense.description ?? '—' }}</td>
            <td>{{ expense.categoryName ?? '—' }}</td>
            <td>{{ formatAmount(expense) }}</td>
            <td>
              <button type="button" class="link-button" @click="remove(expense.id)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="total">
        Total: {{ total.toFixed(2) }}
      </p>
    </template>
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

.create-form .currency {
  width: 4.5rem;
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

.total {
  margin-top: 0.75rem;
  font-weight: 600;
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
