<template>
  <div class="preferences-sidebar-overlay" :class="{ open: open }" @click="close" aria-hidden="true"></div>
  <aside
    class="preferences-sidebar"
    :class="{ open }"
    role="dialog"
    aria-label="Preferences"
    aria-modal="true"
  >
    <div class="preferences-sidebar-header">
      <h2>Preferences</h2>
      <button type="button" class="close-preferences-btn" title="Close preferences" @click="close">✕</button>
    </div>
    <div class="preferences-body">
      <div class="pref-block pref-sep">
        <button type="button" class="secondary pref-intro-btn" @click="emit('showOnboarding')">
          Show intro again
        </button>
      </div>
      <div class="pref-block pref-block-stack">
        <label class="pref-label">Prompt detail</label>
        <div class="pref-buttons row">
          <button
            v-for="m in ['beginner', 'regular', 'expert']"
            :key="m"
            type="button"
            class="secondary prompt-detail-btn"
            :class="{ 'preset-selected': prefs.promptDetailMode === m }"
            :title="m === 'beginner' ? 'Full descriptions' : m === 'expert' ? 'Short prompts' : 'Medium pace'"
            @click="prefs.setPromptDetail(m)"
          >
            {{ m.charAt(0).toUpperCase() + m.slice(1) }}
          </button>
        </div>
        <span class="pref-hint">{{ prefs.promptDetailLabel }}</span>
      </div>
      <div class="pref-block pref-block-stack">
        <label class="pref-label">Penetration</label>
        <div class="pref-buttons row">
          <button
            type="button"
            class="secondary"
            :class="{ 'preset-selected': prefs.penetrationPreference === 'prefer' }"
            @click="prefs.setPenetration('prefer')"
          >
            Prefer penetration
          </button>
          <button
            type="button"
            class="secondary"
            :class="{ 'preset-selected': prefs.penetrationPreference === 'minimal' }"
            @click="prefs.setPenetration('minimal')"
          >
            Minimal penetration
          </button>
        </div>
      </div>
      <div class="pref-block pref-sep pref-block-stack">
        <label class="pref-label">Background</label>
        <select
          :value="prefs.backgroundImage"
          @change="prefs.backgroundImage = ($event.target).value"
          class="pref-select"
        >
          <option value="none">None</option>
          <option value="1">Fiery hearts</option>
          <option value="2">Triangles</option>
        </select>
      </div>
      <div class="pref-block pref-sep pref-block-stack">
        <label class="pref-label">Background music</label>
        <div class="row pref-music-row">
          <select
            :value="prefs.backgroundMusic"
            @change="onMusicChange(($event.target).value)"
            class="pref-select"
          >
            <option v-for="opt in musicOptions" :key="opt.id" :value="opt.id">{{ opt.title }}</option>
          </select>
          <button
            v-if="prefs.backgroundMusic !== 'none'"
            type="button"
            class="secondary pref-play-music-btn"
            title="Start playback (browser may require a click to allow audio)"
            @click="prefs.playBackgroundMusicNow(prefs.backgroundMusic)"
          >
            ▶ Play
          </button>
        </div>
        <div v-if="prefs.backgroundMusic !== 'none'" class="row pref-music-volume">
          <span class="pref-sublabel">Volume</span>
          <input
            v-model.number="prefs.backgroundMusicVolume"
            type="range"
            min="0"
            max="100"
            class="pref-slider"
          />
          <span class="pref-speed-value">{{ prefs.backgroundMusicVolume }}%</span>
        </div>
      </div>
      <div class="pref-block pref-toggle">
        <span class="pref-toggle-label">Include anal-only positions (distinct from rear-entry vaginal)</span>
        <div class="row">
          <button type="button" class="secondary small" :class="{ 'preset-selected': prefs.analPositionsEnabled }" @click="prefs.analPositionsEnabled = true">Yes</button>
          <button type="button" class="secondary small" :class="{ 'preset-selected': !prefs.analPositionsEnabled }" @click="prefs.analPositionsEnabled = false">No</button>
        </div>
      </div>
      <div class="pref-block pref-toggle">
        <span class="pref-toggle-label">Include vibrator/toy modifiers in Phase 3</span>
        <div class="row">
          <button type="button" class="secondary small" :class="{ 'preset-selected': prefs.vibratorsPresent }" @click="prefs.vibratorsPresent = true">Yes</button>
          <button type="button" class="secondary small" :class="{ 'preset-selected': !prefs.vibratorsPresent }" @click="prefs.vibratorsPresent = false">No</button>
        </div>
      </div>
      <div class="pref-block pref-toggle">
        <span class="pref-toggle-label">Pause for check-in between phases</span>
        <div class="row">
          <button type="button" class="secondary small" :class="{ 'preset-selected': prefs.guidedPhaseCheckInEnabled }" @click="prefs.guidedPhaseCheckInEnabled = true">Yes</button>
          <button type="button" class="secondary small" :class="{ 'preset-selected': !prefs.guidedPhaseCheckInEnabled }" @click="prefs.guidedPhaseCheckInEnabled = false">No</button>
        </div>
      </div>
      <div class="pref-block pref-sep pref-voice">
        <label class="pref-label">Voice (read aloud)</label>
        <div class="pref-voice-row">
          <div class="pref-toggle pref-voice-enable">
            <span class="pref-toggle-label">Enable voice</span>
            <div class="row">
              <button type="button" class="secondary small" :class="{ 'preset-selected': speech.voiceEnabled }" @click="setVoiceEnabled(true)">Yes</button>
              <button type="button" class="secondary small" :class="{ 'preset-selected': !speech.voiceEnabled }" @click="setVoiceEnabled(false)">No</button>
            </div>
          </div>
          <div class="pref-voice-select-wrap">
            <label class="pref-sublabel">Voice engine</label>
            <select
              :value="currentTtsProvider"
              @change="onTtsProviderChange($event)"
              class="pref-select pref-voice-select"
              aria-label="Select voice engine"
            >
              <option value="browser">Browser (backup)</option>
              <option value="piper">Piper</option>
              <option value="kokoro">Kokoro</option>
            </select>
            <p class="pref-engine-notice">{{ engineNotice }}</p>
          </div>
          <template v-if="currentTtsProvider === 'browser'">
            <div v-if="speech.isSupported()" class="pref-voice-select-wrap">
              <label class="pref-sublabel">Browser voice</label>
              <select
                :value="(speech.selectedVoiceURI && speech.selectedVoiceURI.value) ?? speech.selectedVoiceURI"
                @change="onVoiceChange($event)"
                class="pref-select pref-voice-select"
                aria-label="Select browser voice"
              >
                <option value="">Default (browser choice)</option>
                <option
                  v-for="v in voiceList"
                  :key="voiceOptionValue(v)"
                  :value="voiceOptionValue(v)"
                >
                  {{ v.name }} ({{ v.lang }})
                </option>
              </select>
            </div>
          </template>
          <template v-else-if="currentTtsProvider === 'piper'">
            <div class="pref-voice-select-wrap">
              <label class="pref-sublabel">Piper voice</label>
              <select
                :value="(speech.piperVoiceId && speech.piperVoiceId.value) ?? speech.piperVoiceId"
                @change="onPiperVoiceChange($event)"
                class="pref-select pref-voice-select"
                aria-label="Select Piper voice"
                :disabled="piperLoading"
              >
                <option value="">— Choose voice —</option>
                <option v-for="v in (speech.piperVoicesList && speech.piperVoicesList.value) || speech.piperVoicesList || []" :key="v.id" :value="v.id">{{ v.name }}</option>
              </select>
              <div class="pref-piper-actions">
                <button v-if="!piperLoading" type="button" class="secondary small pref-refresh-voices" @click="loadPiperVoices">Refresh voices</button>
                <button v-if="!piperLoading" type="button" class="secondary small pref-reset-piper" @click="resetPiperThenReload" title="Clear Piper cache and re-init (use if voice fails or after fixing WASM)">Reset Piper</button>
              </div>
            </div>
          </template>
          <template v-else-if="currentTtsProvider === 'kokoro'">
            <div class="pref-voice-select-wrap">
              <label class="pref-sublabel">Kokoro voice</label>
              <select
                :value="(speech.kokoroVoiceId && speech.kokoroVoiceId.value) ?? speech.kokoroVoiceId"
                @change="onKokoroVoiceChange($event)"
                class="pref-select pref-voice-select"
                aria-label="Select Kokoro voice"
                :disabled="kokoroLoading"
              >
                <option value="">— Choose voice —</option>
                <option v-for="v in (speech.kokoroVoicesList && speech.kokoroVoicesList.value) || speech.kokoroVoicesList || []" :key="v.id" :value="v.id">{{ v.name }}</option>
              </select>
              <button v-if="!kokoroLoading" type="button" class="secondary small pref-refresh-voices" @click="loadKokoroVoices">Refresh voices</button>
            </div>
          </template>
          <div v-if="speech.canSpeak()" class="row pref-speed-row">
            <span class="pref-label">Speed</span>
            <input v-model.number="speech.voiceRate" type="range" min="0.5" max="2" step="0.1" class="pref-speed-slider" />
            <span class="pref-speed-value">{{ (Number(speech.voiceRate) || 1).toFixed(1) }}×</span>
          </div>
          <div v-if="speech.canSpeak()" class="pref-test-voice-wrap">
            <p v-if="modelDownloading" class="pref-downloading-notice">
              {{ currentTtsProvider === 'kokoro' ? 'Downloading Kokoro model (~80MB)… May take 1–2 min. Test will play when ready.' : 'Downloading model… Once ready, the test will play.' }}
            </p>
            <button
              type="button"
              class="secondary small pref-test-voice-btn"
              :disabled="testVoicePlaying || modelDownloading"
              @click="playTestVoice"
            >
              {{ testVoicePlaying ? (modelDownloading ? 'Preparing…' : 'Playing…') : modelDownloading ? 'Downloading model…' : 'Hear voice test' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePreferencesStore } from '@/stores/preferences'
import { useSpeech } from '@/composables/useSpeech'
import { getMusicOptions, fetchMusicOptions } from '@/data/music'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'showOnboarding'])
const prefs = usePreferencesStore()
const speech = useSpeech()
const musicOptions = ref(getMusicOptions())
watch(() => props.open, (isOpen) => {
  if (isOpen) fetchMusicOptions().then((opts) => { musicOptions.value = opts })
}, { immediate: true })

function onMusicChange(value) {
  const normalized = value == null ? 'none' : String(value).trim() || 'none'
  prefs.backgroundMusic = normalized
  prefs.playBackgroundMusicNow(normalized)
}

const voiceList = computed(() => speech.getVoicesList())
const piperLoading = ref(false)
const kokoroLoading = ref(false)
const testVoicePlaying = ref(false)

const currentTtsProvider = computed(() => {
  const p = (speech.ttsProvider && typeof speech.ttsProvider === 'object' && 'value' in speech.ttsProvider ? speech.ttsProvider.value : speech.ttsProvider)
  return ['browser', 'piper', 'kokoro'].includes(p) ? p : 'piper'
})

const modelDownloading = computed(() => {
  const provider = currentTtsProvider.value
  if (provider === 'browser') return false
  const k = speech.kokoroModelLoading
  const p = speech.piperModelLoading
  const kVal = k && typeof k === 'object' && 'value' in k ? k.value : k
  const pVal = p && typeof p === 'object' && 'value' in p ? p.value : p
  return (provider === 'piper' && !!pVal) || (provider === 'kokoro' && !!kVal)
})

const engineNotices = {
  browser: 'Built-in backup (no download).',
  piper: 'Downloads model once, then runs locally.',
  kokoro: 'Downloads model once (~82MB), then runs locally.',
}
const engineNotice = computed(() => engineNotices[currentTtsProvider.value] || '')

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  if (speech.isSupported()) speech.refreshVoices()
  const p = currentTtsProvider.value
  const piperList = speech.piperVoicesList?.value ?? speech.piperVoicesList ?? []
  const kokoroList = speech.kokoroVoicesList?.value ?? speech.kokoroVoicesList ?? []
  if (p === 'piper' && piperList.length === 0) loadPiperVoices()
  else if (p === 'kokoro' && kokoroList.length === 0) loadKokoroVoices()
  // Preload Piper voice so "Hear voice test" is fast
  if (p === 'piper' && speech.preloadPiperModel) {
    const voiceId = (speech.piperVoiceId?.value ?? speech.piperVoiceId)?.trim() || 'en_US-hfc_female-medium'
    speech.preloadPiperModel(voiceId)
  }
  // Preload Kokoro model (~82MB) in background so "Hear voice test" (e.g. Nicole) only pays inference time
  if (p === 'kokoro' && speech.preloadKokoroModel) {
    speech.preloadKokoroModel()
  }
})

async function loadPiperVoices() {
  piperLoading.value = true
  try {
    await speech.getPiperVoices()
  } finally {
    piperLoading.value = false
  }
}
async function resetPiperThenReload() {
  if (speech.resetPiper) speech.resetPiper()
  await loadPiperVoices()
}
async function loadKokoroVoices() {
  kokoroLoading.value = true
  try {
    await speech.getKokoroVoices()
  } finally {
    kokoroLoading.value = false
  }
}

function voiceOptionValue(v) {
  if (v.voiceURI) return v.voiceURI
  return 'name:' + (v.name || '')
}

function onVoiceChange(e) {
  const value = (e.target && e.target.value) || ''
  speech.selectedVoiceURI.value = value
}

function onTtsProviderChange(e) {
  const value = (e.target && e.target.value) || 'piper'
  speech.ttsProvider.value = value
}

function onPiperVoiceChange(e) {
  speech.piperVoiceId.value = (e.target && e.target.value) || ''
}

function onKokoroVoiceChange(e) {
  speech.kokoroVoiceId.value = (e.target && e.target.value) || ''
}

const TEST_PHRASE = 'This is a quick voice test.'

function playTestVoice() {
  if (testVoicePlaying.value) return
  testVoicePlaying.value = true
  speech.speak(TEST_PHRASE, {
    force: true,
    cacheForReplay: true,
    onEnd: () => {
      testVoicePlaying.value = false
    },
  })
}

function setVoiceEnabled(v) {
  if (speech.voiceEnabled && typeof speech.voiceEnabled === 'object' && 'value' in speech.voiceEnabled) {
    speech.voiceEnabled.value = v
  }
  prefs.$patch({ voiceEnabled: !!v })
}

watch(
  () => typeof speech.voiceRate === 'object' && 'value' in speech.voiceRate ? speech.voiceRate.value : speech.voiceRate,
  (rate) => { if (typeof rate === 'number') prefs.$patch({ voiceSpeed: rate }) }
)

function close() {
  emit('close')
}
</script>

<style scoped>
.pref-block-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
}
.pref-block-stack .pref-label { margin: 0; }
.pref-buttons { gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.pref-hint { font-size: 0.8rem; color: #9ca3af; }
.pref-select {
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  min-width: 10rem;
  max-width: 100%;
}
.pref-toggle { margin-bottom: 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; text-align: center; }
.pref-toggle-label { font-size: 0.9rem; display: block; }
.pref-toggle .row { justify-content: center; gap: 0.5rem; }
.pref-voice-enable { margin-bottom: 0.5rem; }
.pref-voice { align-items: center; }
.pref-voice-row { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.pref-voice-select-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; width: 100%; max-width: 280px; }
.pref-sublabel { font-size: 0.85rem; font-weight: 600; color: #9ca3af; margin: 0; }
.pref-engine-notice {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
  text-align: center;
  margin: 0.5rem 0 0;
  padding: 0 0.25rem;
  line-height: 1.3;
}
.pref-voice-select { width: 100%; max-width: 100%; }
.pref-refresh-voices { margin-top: 0.35rem; }
.pref-piper-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; }
.pref-speed-row { align-items: center; gap: 0.5rem; }
.pref-music-volume { align-items: center; gap: 0.5rem; margin-top: 0.35rem; }
.pref-slider { width: 100%; max-width: 140px; accent-color: #3b82f6; }
.pref-test-voice-wrap { margin-top: 0.5rem; }
.pref-downloading-notice {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0 0 0.35rem;
  text-align: center;
}
.pref-test-voice-btn { min-width: 8rem; }
.pref-speed-slider { width: 100%; max-width: 140px; accent-color: #3b82f6; }
.pref-speed-value { font-size: 0.9rem; font-weight: 600; min-width: 2.5rem; }
.pref-sep { padding-top: 0.75rem; border-top: 1px solid #334155; margin-top: 0.25rem; }
</style>
