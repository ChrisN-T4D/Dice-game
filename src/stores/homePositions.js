/**
 * Favorite home positions + session default (wizard). localStorage only.
 */
import { defineStore } from 'pinia'
import { getDefaultHomePosition, getHomePositionById } from '@/data/prompts/transitions/home-positions'

const FAVORITES_KEY = 'intimacyGameHomeFavorites'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function saveFavorites(list) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list))
  } catch (_) {}
}

export const useHomePositionsStore = defineStore('homePositions', {
  state: () => ({
    favoriteIds: loadFavorites(),
    /** Set when guided/sensate session is configured */
    sessionHomeId: getDefaultHomePosition().id,
  }),
  getters: {
    sessionHome(state) {
      return getHomePositionById(state.sessionHomeId) || getDefaultHomePosition()
    },
    isFavorite: (state) => (id) => state.favoriteIds.includes(id),
  },
  actions: {
    load() {
      this.favoriteIds = loadFavorites()
    },
    setSessionHome(id) {
      if (getHomePositionById(id)) this.sessionHomeId = id
    },
    toggleFavorite(id) {
      if (!getHomePositionById(id)) return
      if (this.favoriteIds.includes(id)) {
        this.favoriteIds = this.favoriteIds.filter((x) => x !== id)
      } else {
        this.favoriteIds = [...this.favoriteIds, id]
      }
      saveFavorites(this.favoriteIds)
    },
  },
})
