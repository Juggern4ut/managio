<script setup lang="ts">
const { user, clear } = useUserSession()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <span class="brand">Managio</span>
      <nav>
        <NuxtLink to="/">
          Inbox
        </NuxtLink>
        <NuxtLink to="/documents">
          Documents
        </NuxtLink>
        <NuxtLink to="/search">
          Search
        </NuxtLink>
      </nav>
      <div class="account">
        <span v-if="user">{{ user.username }}</span>
        <button type="button" @click="logout">
          Sign out
        </button>
      </div>
    </header>
    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.brand {
  font-weight: 700;
}

nav {
  display: flex;
  gap: 1rem;
  flex: 1;
}

nav a {
  color: #374151;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: #1f6feb;
  font-weight: 600;
}

.account {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

button {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

.content {
  flex: 1;
  padding: 1.5rem;
  background: #f9fafb;
}
</style>
