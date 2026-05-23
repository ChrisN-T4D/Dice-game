<template>
  <div
    v-show="favorites.showModal"
    class="favorites-modal-overlay"
    role="dialog"
    aria-label="Favorites"
    aria-modal="true"
    @click.self="favorites.closeModal()"
  >
    <div class="favorites-modal-card">
      <div class="favorites-modal-header">
        <h2 class="favorites-modal-title">Favorites</h2>
        <button type="button" class="favorites-modal-close" title="Close" @click="favorites.closeModal()">✕</button>
      </div>
      <div class="favorites-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="favorites-tab"
          :aria-selected="tab === 'positions'"
          @click="tab = 'positions'"
        >
          Phase 3 positions
        </button>
        <button
          type="button"
          role="tab"
          class="favorites-tab"
          :aria-selected="tab === 'home'"
          @click="tab = 'home'"
        >
          Home defaults
        </button>
      </div>
      <div class="favorites-modal-body">
        <template v-if="tab === 'positions'">
          <p v-if="favorites.favorites.length === 0" class="favorites-empty">
            No favorites yet. In Phase 3, use “♡ Add to favorites” on a position to save it here.
          </p>
          <ul v-else class="favorites-list" aria-label="Saved positions">
            <li v-for="n in favorites.favorites" :key="n" class="favorites-list-item">
              <span class="favorites-list-label">{{ n }}. {{ getPositionName(n) }}</span>
              <button type="button" class="secondary small" @click="favorites.showPositionImage(n)">
                View image
              </button>
            </li>
          </ul>
        </template>
        <template v-else>
          <p v-if="favoriteHomes.length === 0" class="favorites-empty">
            No home favorites yet. Star a default home in guided or sensate setup.
          </p>
          <ul v-else class="favorites-list" aria-label="Favorite home positions">
            <li v-for="home in favoriteHomes" :key="home.id" class="favorites-list-item">
              <span class="favorites-list-label">{{ home.name }}</span>
              <button
                type="button"
                class="secondary small"
                :class="{ 'preset-selected': homeStore.sessionHomeId === home.id }"
                @click="homeStore.setSessionHome(home.id)"
              >
                {{ homeStore.sessionHomeId === home.id ? 'Session default' : 'Use as default' }}
              </button>
            </li>
          </ul>
        </template>
      </div>
      <p class="favorites-footer">
        All preferences and favorites are saved locally on this device and are not transmitted anywhere else.
      </p>
    </div>

    <div
      v-show="favorites.positionImageModal.show"
      class="position-image-overlay"
      role="dialog"
      aria-label="Position reference image"
      @click.self="favorites.closePositionImage()"
    >
      <div class="position-image-wrap">
        <button type="button" class="position-image-close" title="Close" @click="favorites.closePositionImage()">✕</button>
        <img
          v-show="!positionImageError"
          :src="positionImageSrc"
          :alt="'Position ' + favorites.positionImageModal.positionNumber + ' reference'"
          class="position-image-img"
          @error="positionImageError = true"
        />
        <p v-show="positionImageError" class="position-image-fallback">Image not available for this position.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFavoritesStore } from '@/stores/favorites'
import { useHomePositionsStore } from '@/stores/homePositions'
import { HOME_POSITIONS } from '@/data/prompts/transitions/home-positions'
import { getPhase3PositionName } from 'phase3-data'
import { publicPath } from '@/utils/publicPath'

const favorites = useFavoritesStore()
const homeStore = useHomePositionsStore()
const tab = ref('positions')

const favoriteHomes = computed(() =>
  HOME_POSITIONS.filter((h) => homeStore.isFavorite(h.id))
)

function getPositionName(n) {
  return getPhase3PositionName(n) || 'Position ' + n
}

const positionImageSrc = computed(() => {
  const n = favorites.positionImageModal.positionNumber
  if (!n) return ''
  return publicPath('/Position References/position ' + n + '.png')
})

const positionImageError = ref(false)
watch(
  () => favorites.positionImageModal.show,
  (show) => { if (show) positionImageError.value = false }
)
watch(
  () => favorites.showModal,
  (show) => {
    if (show) {
      homeStore.load()
      tab.value = 'positions'
    }
  }
)
</script>

<style scoped>
.favorites-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1002;
  padding: 2rem;
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.favorites-modal-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
}
.favorites-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #334155;
}
.favorites-modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #e5e7eb;
}
.favorites-modal-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
.favorites-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem 1.25rem 0;
}
.favorites-tab {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid #334155;
  border-radius: 0.35rem;
  background: #0f172a;
  color: #94a3b8;
  cursor: pointer;
}
.favorites-tab[aria-selected='true'] {
  background: #334155;
  color: #e5e7eb;
  border-color: #475569;
}
.favorites-modal-body {
  padding: 1rem 1.25rem;
}
.favorites-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.5;
}
.favorites-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.favorites-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid #334155;
}
.favorites-list-item:last-child {
  border-bottom: none;
}
.favorites-list-label {
  color: #e5e7eb;
  font-size: 0.95rem;
}
.favorites-footer {
  margin: 0;
  padding: 0.75rem 1.25rem 1rem;
  font-size: 0.8rem;
  color: #64748b;
  border-top: 1px solid #334155;
}
.position-image-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1003;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.position-image-wrap {
  position: relative;
  max-width: 100%;
  max-height: 90vh;
}
.position-image-close {
  position: absolute;
  top: -2rem;
  right: 0;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.25rem;
  cursor: pointer;
}
.position-image-img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}
.position-image-fallback {
  color: #94a3b8;
}
</style>
