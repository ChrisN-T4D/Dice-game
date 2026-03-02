/**
 * Saved guided session configs (favorites). Persisted to localStorage.
 * No server; data stays on this device.
 */
import { defineStore } from 'pinia'

const STORAGE_KEY = 'betweenUsSessionFavorites'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (_) {}
}

export const useSessionFavoritesStore = defineStore('sessionFavorites', {
  state: () => ({
    list: loadFromStorage(),
  }),
  actions: {
    load() {
      this.list = loadFromStorage()
    },
    save() {
      saveToStorage(this.list)
    },
    add({ name, config }) {
      if (!config) return
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const item = {
        id,
        name: name || `Session – ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        config: { ...config },
      }
      this.list = [item, ...this.list]
      saveToStorage(this.list)
      return item
    },
    remove(id) {
      this.list = this.list.filter((x) => x.id !== id)
      saveToStorage(this.list)
    },
  },
})
