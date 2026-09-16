<script setup lang="ts">
const { data: health } = await useFetch('/api/health')
</script>

<template>
  <div>
    <h1>Inbox</h1>
    <p>No documents yet. Upload will arrive in a later phase.</p>

    <div class="status" :class="health?.status">
      <strong>System status:</strong> {{ health?.status ?? 'unknown' }}
      <ul>
        <li v-for="(value, check) in health?.checks" :key="check">
          {{ check }}: {{ value }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.status {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 6px;
  background: white;
  border: 1px solid #e5e7eb;
  max-width: 320px;
}

.status.degraded {
  border-color: #c0392b;
}

.status ul {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
</style>
