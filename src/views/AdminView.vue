<template>
  <div class="admin-root">
    <div v-if="!unlocked" class="admin-login">
      <div class="admin-login-card">
        <h2 class="admin-login-title">{{ hasStoredPassword ? 'Admin password' : 'Set admin password' }}</h2>
        <p v-if="!hasStoredPassword" class="admin-login-hint">
          Choose a password to protect admin. You’ll need it each time you open admin (or after locking).
        </p>
        <form class="admin-login-form" @submit.prevent="hasStoredPassword ? unlock() : setPassword()">
          <input
            v-model="passwordInput"
            type="password"
            class="admin-login-input"
            :placeholder="hasStoredPassword ? 'Password' : 'New password'"
            autocomplete="off"
          />
          <input
            v-if="!hasStoredPassword"
            v-model="passwordConfirm"
            type="password"
            class="admin-login-input"
            placeholder="Confirm password"
            autocomplete="off"
          />
          <p v-if="loginError" class="admin-login-error">{{ loginError }}</p>
          <button type="submit" class="admin-login-btn secondary">
            {{ hasStoredPassword ? 'Unlock' : 'Set password' }}
          </button>
        </form>
      </div>
    </div>

    <template v-else>
      <header class="admin-header">
        <a href="#" class="admin-back" @click.prevent="goBack">← Back</a>
        <h1 class="admin-title">Anatomy database</h1>
        <button
          type="button"
          class="admin-refresh secondary small"
          title="Reload hierarchy"
          aria-label="Reload"
          @click="reloadExplorer"
        >
          Refresh
        </button>
        <button type="button" class="admin-lock secondary small" @click="lock">Lock</button>
      </header>
      <AdminAnatomyExplorer ref="explorerRef" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AdminAnatomyExplorer from '@/components/AdminAnatomyExplorer.vue'

const ADMIN_PASSWORD_KEY = 'adminAdminPassword'
const ADMIN_UNLOCKED_KEY = 'adminUnlocked'

const unlocked = ref(false)
const passwordInput = ref('')
const passwordConfirm = ref('')
const loginError = ref('')
const explorerRef = ref(null)

const hasStoredPassword = computed(
  () => typeof localStorage !== 'undefined' && !!localStorage.getItem(ADMIN_PASSWORD_KEY)
)

onMounted(() => {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(ADMIN_UNLOCKED_KEY) === 'true') {
    unlocked.value = true
  }
})

function setPassword() {
  loginError.value = ''
  if (!passwordInput.value) {
    loginError.value = 'Enter a password.'
    return
  }
  if (passwordInput.value !== passwordConfirm.value) {
    loginError.value = 'Passwords do not match.'
    return
  }
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, passwordInput.value)
    sessionStorage.setItem(ADMIN_UNLOCKED_KEY, 'true')
    unlocked.value = true
    passwordInput.value = ''
    passwordConfirm.value = ''
  } catch {
    loginError.value = 'Could not save password.'
  }
}

function unlock() {
  loginError.value = ''
  const stored = localStorage.getItem(ADMIN_PASSWORD_KEY)
  if (passwordInput.value === stored) {
    sessionStorage.setItem(ADMIN_UNLOCKED_KEY, 'true')
    unlocked.value = true
    passwordInput.value = ''
  } else {
    loginError.value = 'Incorrect password.'
  }
}

function lock() {
  sessionStorage.removeItem(ADMIN_UNLOCKED_KEY)
  unlocked.value = false
}

function goBack() {
  window.location.hash = ''
}

function reloadExplorer() {
  explorerRef.value?.loadHierarchy?.()
}
</script>

<style scoped>
.admin-root {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  padding: 0.5rem 0.75rem;
  color: #e5e7eb;
  max-width: 100vw;
  box-sizing: border-box;
}
.admin-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 0.25rem 0;
  margin-bottom: 0.5rem;
}
.admin-back {
  color: #93c5fd;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.35rem 0.5rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.admin-back:hover {
  text-decoration: underline;
}
.admin-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
  min-width: 0;
}
.admin-refresh,
.admin-lock {
  flex-shrink: 0;
  min-height: 44px;
}
.admin-login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1.5rem;
  background: #0f172a;
}
.admin-login-card {
  width: 100%;
  max-width: 320px;
  padding: 1.5rem;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #334155;
  border-radius: 0.75rem;
}
.admin-login-title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #e5e7eb;
}
.admin-login-hint {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.4;
}
.admin-login-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.admin-login-input {
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 1rem;
}
.admin-login-input::placeholder {
  color: #64748b;
}
.admin-login-error {
  margin: 0;
  font-size: 0.9rem;
  color: #fca5a5;
}
.admin-login-btn {
  min-height: 44px;
  font-weight: 600;
}
</style>
