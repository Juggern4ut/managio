<script setup lang="ts">
const { fetch: refreshSession } = useUserSession()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    await refreshSession()
    await navigateTo('/')
  }
  catch {
    error.value = 'Invalid username or password.'
  }
  finally {
    loading.value = false
  }
}

definePageMeta({ layout: false })
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <h1>Managio</h1>
      <p class="subtitle">
        Sign in to your document manager
      </p>

      <label for="username">Username</label>
      <input id="username" v-model="username" type="text" autocomplete="username" required>

      <label for="password">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      >

      <p v-if="error" class="error">
        {{ error }}
      </p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f5f7;
}

.login-card {
  width: min(320px, 90vw);
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subtitle {
  margin: 0 0 1rem;
  color: #666;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  margin-top: 1rem;
  padding: 0.6rem;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  color: #c0392b;
  font-size: 0.875rem;
  margin: 0;
}
</style>
