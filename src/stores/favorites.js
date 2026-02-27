/**
 * Phase 3 position favorites: stored in localStorage (same key as legacy for compatibility).
 * No server; all data stays on this device.
 */
import { defineStore } from 'pinia'

const STORAGE_KEY = 'intimacyGameFavorites'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n) && n >= 1 && n <= 156) : []
  } catch {
    return []
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (_) {}
}

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    list: loadFromStorage(),
    showModal: false,
    positionImageModal: { show: false, positionNumber: null },
  }),
  getters: {
    favorites: (s) => s.list,
    isFavorite: (s) => (positionNumber) => {
      const n = parseInt(positionNumber, 10)
      if (n < 1 || n > 156) return false
      return s.list.indexOf(n) !== -1
    },
  },
  actions: {
    load() {
      this.list = loadFromStorage()
    },
    add(positionNumber) {
      const n = parseInt(positionNumber, 10)
      if (n < 1 || n > 156) return
      if (this.list.indexOf(n) !== -1) return
      this.list = [...this.list, n].sort((a, b) => a - b)
      saveToStorage(this.list)
    },
    remove(positionNumber) {
      const n = parseInt(positionNumber, 10)
      this.list = this.list.filter((x) => x !== n)
      saveToStorage(this.list)
    },
    toggle(positionNumber) {
      if (this.isFavorite(positionNumber)) this.remove(positionNumber)
      else this.add(positionNumber)
    },
    openModal() {
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
    },
    showPositionImage(positionNumber) {
      const n = parseInt(positionNumber, 10)
      if (n >= 1 && n <= 156) {
        this.positionImageModal = { show: true, positionNumber: n }
      }
    },
    closePositionImage() {
      this.positionImageModal = { show: false, positionNumber: null }
    },
  },
})
