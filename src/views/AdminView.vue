<template>
  <div class="admin-root">
    <header class="admin-header">
      <a href="#" class="admin-back" @click.prevent="goBack">← Back</a>
      <h1 class="admin-title">Admin</h1>
    </header>

    <nav class="admin-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- Phase 3: Image vs description -->
    <section v-show="activeTab === 'phase3'" class="admin-section admin-section-phase3" role="tabpanel">
      <div class="admin-toolbar">
        <label class="admin-toolbar-label">Position</label>
        <input v-model.number="positionInput" type="number" min="1" max="155" class="admin-input-num" @change="clampPosition" aria-label="Position number" />
        <span class="admin-range">1–155</span>
        <button type="button" class="secondary small" @click="prevPosition" aria-label="Previous position">←</button>
        <button type="button" class="secondary small" @click="nextPosition" aria-label="Next position">→</button>
        <select v-model="validationStatus" class="admin-select" aria-label="Validation status">
          <option value="">— Validate —</option>
          <option value="match">✓ Match</option>
          <option value="mismatch">✗ Mismatch</option>
          <option value="review">? Review</option>
        </select>
      </div>
      <p class="admin-hint">
        Compare image with description below. Images from <strong>Position References</strong> folder.
      </p>
      <div class="phase3-compare">
        <div class="compare-block compare-image">
          <h3 class="compare-heading">Image — {{ currentPosition }}</h3>
          <div class="image-wrap">
            <img
              v-if="imagePath && !imageError"
              :src="imagePath"
              :alt="'Position ' + currentPosition"
              class="position-image"
              @error="imageError = true"
            />
            <div v-else class="image-placeholder">
              {{ imageError ? 'Image not found.' : 'No image (64, 127)' }}
            </div>
          </div>
        </div>
        <div class="compare-block compare-desc">
          <h3 class="compare-heading">Description (editable)</h3>
          <div class="description-block">
            <label class="desc-label">Name</label>
            <textarea v-model="phase3Edit.name" class="desc-input desc-name-input" rows="1" placeholder="Position name" @blur="savePhase3Fields" />
            <label class="desc-label">Help</label>
            <textarea v-model="phase3Edit.help" class="desc-input desc-help-input" rows="2" placeholder="Short help text" @blur="savePhase3Fields" />
            <label class="desc-label">Full description</label>
            <textarea v-model="phase3Edit.description" class="desc-input desc-full-input" rows="5" placeholder="Full description" @blur="savePhase3Fields" />
            <p class="desc-meta">
              <span v-if="entry?.groupDisplay || entry?.group">Group: {{ entry?.groupDisplay || entry?.group }}</span>
              <span v-if="entry?.variationLabel"> · {{ entry.variationLabel }}</span>
              <span v-if="entry?.intensity"> · {{ entry.intensity }}</span>
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Phase 1 & 2 tables (editable text + optional image per location) -->
    <section v-show="activeTab === 'phase12'" class="admin-section admin-section-scroll" role="tabpanel">
      <p class="admin-hint">Edit text to match your images. Add an image path for a location to show it later when you have assets.</p>
      <div class="phase12-grid">
        <div class="phase12-block">
          <h3>Phase 1 – Locations</h3>
          <ul class="ref-list ref-list-editable">
            <li v-for="key in phase12LocationKeys" :key="'p1-l-' + key" class="ref-list-row">
              <span class="ref-key"><strong>{{ key }}.</strong></span>
              <input
                :value="phase12Merged(1).locations[key]"
                class="ref-input"
                @input="onPhase12Text(1, 'locations', key, ($event.target).value)"
              />
              <div class="ref-image-row">
                <label class="ref-image-label">Image</label>
                <input
                  :value="phase12ImagePath(1, key)"
                  type="text"
                  class="ref-image-input"
                  placeholder="e.g. /Position References/p1-loc-5.png"
                  @input="onPhase12Image(1, key, ($event.target).value)"
                />
              </div>
            </li>
          </ul>
        </div>
        <div class="phase12-block">
          <h3>Phase 1 – Actions</h3>
          <ul class="ref-list ref-list-editable">
            <li v-for="key in phase12ActionKeys" :key="'p1-a-' + key" class="ref-list-row">
              <span class="ref-key"><strong>{{ key }}.</strong></span>
              <input
                :value="phase12Merged(1).actions[key]"
                class="ref-input"
                @input="onPhase12Text(1, 'actions', key, ($event.target).value)"
              />
            </li>
          </ul>
        </div>
        <div class="phase12-block">
          <h3>Phase 2 – Locations</h3>
          <ul class="ref-list ref-list-editable">
            <li v-for="key in phase12LocationKeys" :key="'p2-l-' + key" class="ref-list-row">
              <span class="ref-key"><strong>{{ key }}.</strong></span>
              <input
                :value="phase12Merged(2).locations[key]"
                class="ref-input"
                @input="onPhase12Text(2, 'locations', key, ($event.target).value)"
              />
              <div class="ref-image-row">
                <label class="ref-image-label">Image</label>
                <input
                  :value="phase12ImagePath(2, key)"
                  type="text"
                  class="ref-image-input"
                  placeholder="e.g. /Position References/p2-loc-3.png"
                  @input="onPhase12Image(2, key, ($event.target).value)"
                />
              </div>
            </li>
          </ul>
        </div>
        <div class="phase12-block">
          <h3>Phase 2 – Actions</h3>
          <ul class="ref-list ref-list-editable">
            <li v-for="key in phase12ActionKeys" :key="'p2-a-' + key" class="ref-list-row">
              <span class="ref-key"><strong>{{ key }}.</strong></span>
              <input
                :value="phase12Merged(2).actions[key]"
                class="ref-input"
                @input="onPhase12Text(2, 'actions', key, ($event.target).value)"
              />
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Phase 3 modifiers -->
    <section v-show="activeTab === 'modifiers'" class="admin-section admin-section-scroll" role="tabpanel">
      <h3>Phase 3 modifiers (1–20)</h3>
      <ul class="ref-list modifiers-list">
        <li v-for="(text, key) in phase3Modifiers" :key="key"><strong>{{ key }}.</strong> {{ text }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { phase1And2Tables, phase3Modifiers } from '@/data/tables'
import {
  PHASE3_POSITIONS_LIST,
  PHASE3_NO_IMAGE_POSITION_NUMBERS,
  getPhase3PositionImagePath,
} from 'phase3-data'
import {
  mergePhase3Entry,
  savePhase3Entry,
  mergePhase12Table,
  savePhase12Cell,
  getPhase12ImagePath,
  savePhase12Image,
} from '@/utils/adminEdits'

const ADMIN_VALIDATION_KEY = 'adminPhase3Validation'

const activeTab = ref('phase3')
const tabs = [
  { id: 'phase3', label: 'Phase 3: Image vs description' },
  { id: 'phase12', label: 'Phase 1 & 2 tables' },
  { id: 'modifiers', label: 'Phase 3 modifiers' },
]

const positionInput = ref(1)
const imageError = ref(false)

const currentPosition = computed(() => {
  const n = Math.max(1, Math.min(155, positionInput.value || 1))
  return n
})

const baseEntry = computed(() => PHASE3_POSITIONS_LIST[currentPosition.value] || null)
const entry = computed(() =>
  baseEntry.value ? mergePhase3Entry(baseEntry.value, currentPosition.value) : null
)

const phase3Edit = ref({ name: '', help: '', description: '' })
function syncPhase3Edit() {
  const e = entry.value
  phase3Edit.value = {
    name: e?.name ?? '',
    help: e?.help ?? '',
    description: e?.description ?? '',
  }
}
function savePhase3Fields() {
  savePhase3Entry(currentPosition.value, {
    name: phase3Edit.value.name || undefined,
    help: phase3Edit.value.help || undefined,
    description: phase3Edit.value.description || undefined,
  })
}

const imagePath = computed(() => {
  if (PHASE3_NO_IMAGE_POSITION_NUMBERS.includes(currentPosition.value)) return ''
  return '/' + getPhase3PositionImagePath(currentPosition.value)
})

const validationStatus = ref('')
function loadValidation() {
  try {
    const raw = localStorage.getItem(ADMIN_VALIDATION_KEY)
    const data = raw ? JSON.parse(raw) : {}
    validationStatus.value = data[currentPosition.value] || ''
  } catch (_) {
    validationStatus.value = ''
  }
}
function saveValidation() {
  try {
    const raw = localStorage.getItem(ADMIN_VALIDATION_KEY)
    const data = raw ? JSON.parse(raw) : {}
    if (validationStatus.value) data[currentPosition.value] = validationStatus.value
    else delete data[currentPosition.value]
    localStorage.setItem(ADMIN_VALIDATION_KEY, JSON.stringify(data))
  } catch (_) {}
}

watch(
  [currentPosition, entry],
  () => {
    imageError.value = false
    loadValidation()
    syncPhase3Edit()
  },
  { immediate: true }
)
watch(validationStatus, saveValidation)

function clampPosition() {
  positionInput.value = Math.max(1, Math.min(155, positionInput.value || 1))
}
function prevPosition() {
  positionInput.value = Math.max(1, currentPosition.value - 1)
}
function nextPosition() {
  positionInput.value = Math.min(155, currentPosition.value + 1)
}

function goBack() {
  window.location.hash = ''
}

// Phase 1 & 2: keys 1–20 for locations and actions
const phase12LocationKeys = Array.from({ length: 20 }, (_, i) => i + 1)
const phase12ActionKeys = Array.from({ length: 20 }, (_, i) => i + 1)
const phase12EditsVersion = ref(0)

function phase12Merged(phase) {
  phase12EditsVersion.value
  const base = phase1And2Tables[phase]
  return base ? mergePhase12Table(base, phase) : { locations: {}, actions: {} }
}

function phase12ImagePath(phase, locationKey) {
  phase12EditsVersion.value
  return getPhase12ImagePath(phase, locationKey) || ''
}

function onPhase12Text(phase, type, key, value) {
  savePhase12Cell(phase, type, key, value)
  phase12EditsVersion.value++
}

function onPhase12Image(phase, locationKey, path) {
  savePhase12Image(phase, locationKey, path.trim() || null)
  phase12EditsVersion.value++
}

loadValidation()
</script>

<style scoped>
/* Mobile-first, no page scroll: fill viewport (tall/narrow screens) */
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
.admin-back:hover { text-decoration: underline; }
.admin-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
  min-width: 0;
}
.admin-tabs {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
  margin-bottom: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
}
.tab-btn {
  flex-shrink: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: rgba(2, 6, 23, 0.8);
  color: #e5e7eb;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  min-height: 44px;
  touch-action: manipulation;
}
.tab-btn:hover { background: rgba(30, 41, 59, 0.8); }
.tab-btn.active {
  background: #334155;
  border-color: #64748b;
}
.admin-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.admin-section-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 1rem;
}
.admin-section-phase3 {
  padding: 0;
}
.admin-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.admin-toolbar-label {
  font-size: 0.85rem;
  margin: 0;
}
.admin-input-num {
  width: 3.5rem;
  padding: 0.4rem 0.35rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 1rem;
  text-align: center;
}
.admin-range { font-size: 0.85rem; color: #94a3b8; }
.admin-select {
  padding: 0.4rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.9rem;
  min-height: 44px;
}
.admin-hint {
  margin: 0 0 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 0.5rem;
  border-left: 3px solid #64748b;
  font-size: 0.8rem;
  color: #cbd5e1;
  flex-shrink: 0;
}
/* Phase 3: vertical stack (image top, description below), no page scroll */
.phase3-compare {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
}
.compare-block {
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.compare-image { flex: 0 0 auto; }
.compare-desc {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.compare-heading {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #a855f7;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
.image-wrap {
  flex: 0 0 auto;
  min-height: 140px;
  max-height: 40vh;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.position-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.image-placeholder {
  padding: 1rem;
  color: #64748b;
  text-align: center;
  font-size: 0.85rem;
}
.description-block {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid #334155;
  border-radius: 0.5rem;
}
.desc-label {
  display: block;
  margin: 0.5rem 0 0.2rem;
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.desc-label:first-child { margin-top: 0; }
.desc-input {
  width: 100%;
  padding: 0.5rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.9rem;
  line-height: 1.4;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}
.desc-input::placeholder { color: #64748b; }
.desc-name-input { font-size: 1rem; font-weight: 600; }
.desc-help-input { font-size: 0.9rem; }
.desc-full-input { font-size: 0.85rem; min-height: 4rem; }
.desc-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
}
/* Phase 1 & 2: single column on narrow, internal scroll only */
.phase12-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
.phase12-block h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #a855f7;
}
.ref-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #cbd5e1;
}
.ref-list li { margin-bottom: 0.25rem; }
.ref-list-editable { padding-left: 0; list-style: none; }
.ref-list-row {
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.ref-key {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: #94a3b8;
}
.ref-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.8rem;
  line-height: 1.35;
  font-family: inherit;
  box-sizing: border-box;
}
.ref-image-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.ref-image-label {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: #64748b;
}
.ref-image-input {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.4rem;
  border-radius: 0.25rem;
  border: 1px solid #334155;
  background: #0f172a;
  color: #94a3b8;
  font-size: 0.75rem;
  font-family: inherit;
  box-sizing: border-box;
}
.ref-image-input::placeholder { color: #475569; }
.modifiers-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #cbd5e1;
}
</style>
