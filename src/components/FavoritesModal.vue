<template>
  <div
    v-show="favorites.showModal"
    class="favorites-modal-overlay"
    role="dialog"
    aria-label="Favorite positions"
    aria-modal="true"
    @click.self="favorites.closeModal()"
  >
    <div class="favorites-modal-card">
      <div class="favorites-modal-header">
        <h2 class="favorites-modal-title">Favorite positions</h2>
        <button type="button" class="favorites-modal-close" title="Close" @click="favorites.closeModal()">✕</button>
      </div>
      <div class="favorites-modal-body">
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
      </div>
      <p class="favorites-footer">
        All preferences and favorites are saved locally on this device and are not transmitted anywhere else.
      </p>
    </div>

    <!-- Position image overlay -->
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
import { getPhase3PositionName } from 'phase3-data'

const favorites = useFavoritesStore()

function getPositionName(n) {
  return getPhase3PositionName(n) || 'Position ' + n
}

const positionImageSrc = computed(() => {
  const n = favorites.positionImageModal.positionNumber
  if (!n) return ''
  return '/Position References/position ' + n + '.png'
})

const positionImageError = ref(false)
watch(
  () => favorites.positionImageModal.show,
  (show) => { if (show) positionImageError.value = false }
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
  line-height: 1;
}
.favorites-modal-close:hover {
  color: #e5e7eb;
}
.favorites-modal-body {
  padding: 1rem 1.25rem;
  max-height: 50vh;
  overflow-y: auto;
}
.favorites-empty {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0;
}
.favorites-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.favorites-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #334155;
}
.favorites-list-item:last-child {
  border-bottom: none;
}
.favorites-list-label {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  color: #e5e7eb;
}
.favorites-footer {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0;
  padding: 1rem 1.25rem;
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
  padding: 2rem;
}
.position-image-wrap {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}
.position-image-close {
  position: absolute;
  top: -2rem;
  right: 0;
  background: transparent;
  border: none;
  color: #e5e7eb;
  font-size: 1.5rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  line-height: 1;
}
.position-image-close:hover {
  color: #fff;
}
.position-image-img {
  max-width: 100%;
  max-height: 85vh;
  width: auto;
  height: auto;
  display: block;
  border-radius: 0.25rem;
}
.position-image-fallback {
  padding: 2rem;
  color: #94a3b8;
  font-size: 1rem;
  margin: 0;
  min-width: 200px;
  text-align: center;
}
</style>
