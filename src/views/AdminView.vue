<template>
  <div class="admin-root">
    <!-- Password gate: simple lock so only people with the password can edit -->
    <div v-if="!unlocked" class="admin-login">
      <div class="admin-login-card">
        <h2 class="admin-login-title">{{ hasStoredPassword ? 'Admin password' : 'Set admin password' }}</h2>
        <p v-if="!hasStoredPassword" class="admin-login-hint">Choose a password to protect admin. You’ll need it each time you open admin (or after locking).</p>
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
      <h1 class="admin-title">Admin</h1>
      <button type="button" class="admin-refresh secondary small" @click="refreshPage" title="Reload page to see file changes" aria-label="Refresh page">Refresh</button>
      <button type="button" class="admin-lock secondary small" @click="lock">Lock</button>
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
          <option value="not_reviewed">Not reviewed</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <button type="button" class="admin-save-edits secondary" @click="savePhase3Fields" aria-label="Save edits">Save edits</button>
        <button type="button" class="secondary small" @click="resetPhase3ToBase" aria-label="Reset to base">Reset to base</button>
      </div>
      <div class="phase3-compare">
        <div class="compare-block compare-image">
          <h3 class="compare-heading">Image: {{ currentPosition }}</h3>
          <div class="image-and-tags">
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
            <div v-if="entry && (entry.intensity || entry.groupDisplay || entry.group || entry.variationLabel || entry.anal !== undefined || focusAnatomy)" class="position-tags" aria-label="Position tags">
              <span v-if="entry.intensity" :class="['position-tag', 'position-tag-intensity', entry.intensity]">{{ entry.intensity }}</span>
              <span v-if="entry.groupDisplay || entry.group" class="position-tag position-tag-group">{{ entry.groupDisplay || entry.group }}</span>
              <span v-if="entry.variationLabel" class="position-tag position-tag-variation">{{ entry.variationLabel }}</span>
              <span v-if="focusAnatomy === 'penis'" class="position-tag position-tag-focus">Penis focused</span>
              <span v-if="focusAnatomy === 'vulva'" class="position-tag position-tag-focus">Vulva focused</span>
              <span v-if="focusAnatomy === 'neutral'" class="position-tag position-tag-focus position-tag-neutral">Both</span>
              <span v-if="entry.anal" class="position-tag position-tag-anal">Rear entry</span>
              <span v-if="entry.anal && entry.rearEntryVaginalEase" class="position-tag position-tag-ease">{{ entry.rearEntryVaginalEase }} vaginal</span>
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
            <textarea v-model="phase3Edit.description" class="desc-input desc-full-input" rows="10" placeholder="Full description" @blur="savePhase3Fields" />
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

    <!-- Voice generating test -->
    <section v-show="activeTab === 'voice-test'" class="admin-section" role="tabpanel">
      <h3>Voice generating test</h3>
      <p class="admin-hint">Voice runs locally in the browser (Kokoro). Submit a phrase to test. Turn voice on in the Dice game output (or Preferences speed/voice test) if you hear nothing, and ensure the Kokoro model is in <code>public/models/</code> (<code>npm run download-kokoro-model</code>).</p>
      <div class="admin-voice-test">
        <div class="admin-voice-test-phrase-wrap">
          <label class="admin-voice-test-label" for="admin-voice-phrase">Phrase</label>
          <textarea
            id="admin-voice-phrase"
            v-model="voiceTestPhrase"
            class="admin-voice-test-input"
            rows="3"
            placeholder="e.g. Hello, this is a test."
          />
        </div>
        <div class="admin-voice-test-row">
          <div class="admin-voice-test-voice-wrap">
            <label class="admin-voice-test-label" for="admin-voice-model">Voice</label>
            <select
              id="admin-voice-model"
              v-model="adminVoiceId"
              class="admin-voice-test-select"
              aria-label="Kokoro voice"
            >
              <option v-for="v in adminKokoroVoices" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <div class="admin-voice-test-mode-wrap">
            <label class="admin-voice-test-label" for="admin-voice-mode">TTS pipeline</label>
            <select
              id="admin-voice-mode"
              v-model="adminTtsMode"
              class="admin-voice-test-select"
              aria-label="TTS pipeline"
            >
              <option value="fullyLocal">Fully local (device: phonemize + tokenize + ONNX)</option>
              <option value="auto">Auto (tokenize first, then full server)</option>
              <option value="fullServer">Full server</option>
              <option value="tokenize">Tokenize (server) + device ONNX</option>
            </select>
          </div>
        </div>
        <div class="admin-voice-test-actions">
          <button
            type="button"
            class="primary"
            :disabled="!voiceTestPhrase.trim() || voiceTestStatus === 'generating'"
            @click="runVoiceTest"
          >
            {{ voiceTestStatus === 'generating' ? 'Generating…' : 'Generate and play' }}
          </button>
        </div>
        <p v-if="voiceTestStatus === 'generating'" class="admin-voice-test-status">Generating audio… (may take a few seconds)</p>
        <p v-else-if="voiceTestStatus === 'done'" class="admin-voice-test-status admin-voice-test-status-done">Done. You should have heard the phrase.</p>
        <p v-else-if="voiceTestStatus === 'error'" class="admin-voice-test-status admin-voice-test-status-error">{{ voiceTestError || 'Generation failed.' }}</p>
      </div>
    </section>
    </template>
  </div>
</template>

<script setup>
/**
 * Admin view: password gate, Phase 3 (image + editable name/help/description, validation),
 * Phase 1 & 2 tables (editable text + optional image per location), Phase 3 modifiers (read-only).
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { phase1And2Tables, phase3Modifiers } from '@/data/tables'
import { useSpeech } from '@/composables/useSpeech'
import {
  PHASE3_POSITIONS_LIST,
  PHASE3_NO_IMAGE_POSITION_NUMBERS,
  getPhase3PositionImagePath,
  getPhase3PositionFocusAnatomy,
} from 'phase3-data'
import {
  mergePhase3Entry,
  savePhase3Entry,
  clearPhase3Entry,
  mergePhase12Table,
  savePhase12Cell,
  getPhase12ImagePath,
  savePhase12Image,
} from '@/utils/adminEdits'

// -----------------------------------------------------------------------------
// Constants (localStorage/sessionStorage keys)
// -----------------------------------------------------------------------------
const ADMIN_VALIDATION_KEY = 'adminPhase3Validation'
const ADMIN_PASSWORD_KEY = 'adminAdminPassword'
const ADMIN_UNLOCKED_KEY = 'adminUnlocked'
const ADMIN_POSITION_KEY = 'adminPhase3Position'

const unlocked = ref(false)
const passwordInput = ref('')
const passwordConfirm = ref('')
const loginError = ref('')
const hasStoredPassword = computed(() => typeof localStorage !== 'undefined' && !!localStorage.getItem(ADMIN_PASSWORD_KEY))

// -----------------------------------------------------------------------------
// Auth (password gate: set password, unlock, lock)
// -----------------------------------------------------------------------------
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
  } catch (_) {
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

// -----------------------------------------------------------------------------
// Tabs and position (Phase 3)
// -----------------------------------------------------------------------------
const activeTab = ref('phase3')
const tabs = [
  { id: 'phase3', label: 'Phase 3: Image vs description' },
  { id: 'phase12', label: 'Phase 1 & 2 tables' },
  { id: 'modifiers', label: 'Phase 3 modifiers' },
  { id: 'voice-test', label: 'Voice generating test' },
]

const positionInput = ref(1)
const imageError = ref(false)

// Voice generating test
const {
  speak,
  warmupWorker,
  kokoroVoicesListForLocale,
  kokoroVoiceId,
} = useSpeech()
const voiceTestPhrase = ref('Hello, this is a voice test.')
const voiceTestStatus = ref('idle') // 'idle' | 'generating' | 'done' | 'error'
const voiceTestError = ref('')
const VOICE_TEST_TIMEOUT_MS = 55000
// Admin can pick a voice for this test (stored in main prefs when generating)
const adminVoiceId = ref(kokoroVoiceId.value || 'af_nicole')
const adminKokoroVoices = kokoroVoicesListForLocale
/** TTS pipeline for this test: fullyLocal (device only), auto, fullServer, or tokenize. */
const adminTtsMode = ref('fullyLocal')
watch(activeTab, (tab) => {
  if (tab === 'voice-test') adminVoiceId.value = kokoroVoiceId.value || 'af_nicole'
})

function runVoiceTest() {
  const phrase = voiceTestPhrase.value?.trim()
  if (!phrase) return
  voiceTestStatus.value = 'generating'
  voiceTestError.value = ''
  // Use admin-selected voice for this test
  kokoroVoiceId.value = adminVoiceId.value
  const timeoutId = setTimeout(() => {
    if (voiceTestStatus.value === 'generating') {
      voiceTestStatus.value = 'error'
      voiceTestError.value = 'Timed out. Check console and that Kokoro model is in public/models/.'
    }
  }, VOICE_TEST_TIMEOUT_MS)
  warmupWorker()
  speak(phrase, {
    force: true, // always attempt generation/playback in admin test, even if voice is off in prefs
    onEnd: () => {
      clearTimeout(timeoutId)
      if (voiceTestStatus.value === 'generating') voiceTestStatus.value = 'done'
    },
    forceTtsMode: adminTtsMode.value,
  })
}

onMounted(() => {
  nextTick(() => {
    try {
      const saved = localStorage.getItem(ADMIN_POSITION_KEY)
      if (saved) {
        const n = parseInt(saved, 10)
        if (!Number.isNaN(n) && n >= 1 && n <= 155) positionInput.value = n
      }
    } catch (_) {}
  })
})

const currentPosition = computed(() => {
  const n = Math.max(1, Math.min(155, positionInput.value || 1))
  return n
})

// Persist position when user navigates (do not use immediate or we overwrite saved value before onMounted restores)
watch(currentPosition, (val) => {
  try {
    localStorage.setItem(ADMIN_POSITION_KEY, String(val))
  } catch (_) {}
})

const baseEntry = computed(() => PHASE3_POSITIONS_LIST[currentPosition.value] || null)
const phase3EditsVersion = ref(0)
const entry = computed(() => {
  phase3EditsVersion.value
  return baseEntry.value ? mergePhase3Entry(baseEntry.value, currentPosition.value) : null
})

const focusAnatomy = computed(() => {
  const e = entry.value
  if (e && (e.focusAnatomy === 'vulva' || e.focusAnatomy === 'penis' || e.focusAnatomy === 'neutral')) return e.focusAnatomy
  return getPhase3PositionFocusAnatomy(currentPosition.value) || 'neutral'
})

// -----------------------------------------------------------------------------
// Phase 3: editable fields and save
// -----------------------------------------------------------------------------
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
    name: phase3Edit.value.name,
    help: phase3Edit.value.help,
    description: phase3Edit.value.description,
  })
}
function resetPhase3ToBase() {
  clearPhase3Entry(currentPosition.value)
  phase3EditsVersion.value++
  const base = baseEntry.value
  if (base) {
    phase3Edit.value = {
      name: base.name ?? '',
      help: base.help ?? '',
      description: base.description ?? '',
    }
  }
}
const imagePath = computed(() => {
  if (PHASE3_NO_IMAGE_POSITION_NUMBERS.includes(currentPosition.value)) return ''
  return '/' + getPhase3PositionImagePath(currentPosition.value)
})

// -----------------------------------------------------------------------------
// Phase 3: validation status (reviewed / not reviewed)
// -----------------------------------------------------------------------------
const validationStatus = ref('not_reviewed')
function loadValidation() {
  try {
    const raw = localStorage.getItem(ADMIN_VALIDATION_KEY)
    const data = raw ? JSON.parse(raw) : {}
    const val = data[currentPosition.value]
    if (val === 'reviewed' || val === 'not_reviewed') validationStatus.value = val
    else if (val) validationStatus.value = 'reviewed'
    else validationStatus.value = 'not_reviewed'
  } catch (_) {
    validationStatus.value = 'not_reviewed'
  }
}
function saveValidation() {
  try {
    const raw = localStorage.getItem(ADMIN_VALIDATION_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data[currentPosition.value] = validationStatus.value
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

// -----------------------------------------------------------------------------
// Navigation and actions (position clamp/prev/next, goBack, refresh)
// -----------------------------------------------------------------------------
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

function refreshPage() {
  try {
    const pos = Math.max(1, Math.min(155, Number(positionInput.value) || 1))
    localStorage.setItem(ADMIN_POSITION_KEY, String(pos))
  } catch (_) {}
  window.location.reload()
}

// -----------------------------------------------------------------------------
// Phase 1 & 2: merged table, image path, handlers
// -----------------------------------------------------------------------------
// Keys 1–20 for locations and actions
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
.admin-refresh,
.admin-lock {
  flex-shrink: 0;
  min-height: 44px;
}
/* Password gate */
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
.admin-login-input::placeholder { color: #64748b; }
.admin-login-error {
  margin: 0;
  font-size: 0.9rem;
  color: #fca5a5;
}
.admin-login-btn {
  min-height: 44px;
  font-weight: 600;
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
.admin-save-edits {
  margin-left: 0.25rem;
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
.admin-hint code {
  background: rgba(2, 6, 23, 0.6);
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}
.admin-voice-test {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 36rem;
  width: 100%;
  min-width: 0;
}
.admin-voice-test-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
}
.admin-voice-test-phrase-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  min-width: 0;
}
.admin-voice-test-voice-wrap,
.admin-voice-test-mode-wrap {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.admin-voice-test-voice-wrap { min-width: 10rem; }
.admin-voice-test-mode-wrap { min-width: 12rem; }
.admin-voice-test-label {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}
.admin-voice-test-input {
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 1rem;
  resize: vertical;
  min-height: 4rem;
}
.admin-voice-test-input::placeholder { color: #64748b; }
.admin-voice-test-select {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.95rem;
  min-height: 2.5rem;
}
.admin-voice-test-actions { margin: 0; }
.admin-voice-test-status {
  margin: 0;
  font-size: 0.9rem;
}
.admin-voice-test-status-done { color: #86efac; }
.admin-voice-test-status-error { color: #fca5a5; }

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
.image-and-tags {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.image-and-tags .image-wrap {
  margin: 0;
}
.position-tags {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 0.35rem;
  max-width: 140px;
  align-content: flex-start;
}
.position-tag {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: lowercase;
  background: rgba(100, 116, 139, 0.25);
  color: #94a3b8;
  border: 1px solid #475569;
  width: fit-content;
}
.position-tag-intensity.low { background: rgba(34, 197, 94, 0.2); color: #86efac; border-color: #22c55e; }
.position-tag-intensity.medium { background: rgba(234, 179, 8, 0.2); color: #fde047; border-color: #eab308; }
.position-tag-intensity.high { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border-color: #ef4444; }
.position-tag-anal { background: rgba(168, 85, 247, 0.2); color: #e9d5ff; border-color: #a855f7; }
.position-tag-focus { background: rgba(34, 165, 230, 0.2); color: #7dd3fc; border-color: #0ea5e9; }
.position-tag-neutral { background: rgba(100, 116, 139, 0.25); color: #94a3b8; border-color: #64748b; }
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
  min-height: 100px;
  max-height: 22vh;
  max-width: 240px;
  margin: 0 auto;
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
.desc-full-input { font-size: 0.9rem; min-height: 12rem; }
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
