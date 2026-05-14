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
        <button type="button" class="secondary pref-favorites-btn" @click="emit('showFavorites')">
          ♥ Favorites
        </button>
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
            :title="prefs.backgroundMusicPlaying ? 'Pause playback' : 'Start playback (browser may require a click to allow audio)'"
            @click="prefs.backgroundMusicPlaying ? prefs.stopBackgroundMusic() : prefs.playBackgroundMusicNow(prefs.backgroundMusic)"
          >
            {{ prefs.backgroundMusicPlaying ? '⏸ Pause' : '▶ Play' }}
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
      <div class="pref-block pref-sep pref-voice">
        <label class="pref-label">Voice (read aloud)</label>
        <div class="pref-voice-row">
          <div class="pref-voice-select-wrap">
            <label class="pref-sublabel">Voice model selection:</label>
            <p class="pref-engine-notice">{{ kokoroSupported ? 'Kokoro (runs in browser; Safari uses WASM).' : 'Browser voices only.' }}</p>
            <select
              :value="(speech.selectedVoiceKey && speech.selectedVoiceKey.value) ?? speech.selectedVoiceKey ?? ''"
              @change="onVoiceChange($event)"
              class="pref-select pref-voice-select"
              aria-label="Select voice"
              :disabled="kokoroLoading"
            >
              <option value="">Choose voice</option>
              <template v-if="kokoroSupported">
                <option v-for="v in kokoroVoicesList" :key="'k-' + v.id" :value="'kokoro:' + v.id">{{ v.name }}</option>
                <option disabled>Browser (English)</option>
              </template>
              <option v-for="v in browserVoicesList" :key="'b-' + (v.voiceURI || v.name)" :value="'browser:' + (v.voiceURI || '')">{{ v.name }} (Browser)</option>
            </select>
            <button type="button" class="secondary small pref-refresh-voices" @click="speech.refreshVoices()">Refresh voices</button>
          </div>
          <div v-if="speech.canSpeak()" class="row pref-speed-row">
            <span class="pref-label">Speed</span>
            <input v-model.number="speech.voiceRate" type="range" min="0.5" max="2" step="0.1" class="pref-speed-slider" />
            <span class="pref-speed-value">{{ (Number(speech.voiceRate) || 1).toFixed(1) }}×</span>
          </div>
          <div v-if="speech.canSpeak()" class="pref-test-voice-wrap">
            <p v-if="kokoroSupported" class="pref-downloading-notice">
              Voice test uses pre-generated samples. No download needed.
            </p>
            <button
              type="button"
              class="secondary small pref-test-voice-btn"
              :disabled="testVoicePlaying"
              @click="playTestVoice"
            >
              {{ testVoicePlaying ? (modelDownloading ? 'Preparing…' : 'Playing…') : 'Hear voice test' }}
            </button>
            <button
              v-if="testVoicePlaying"
              type="button"
              class="secondary small pref-stop-voice-btn"
              @click="stopTestVoice"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
      <div class="pref-block pref-sep pref-block-stack">
        <label class="pref-label">Default Phase 3 position intensity</label>
        <p class="pref-hint">Used when you start a new guided session. The wizard can override this per session.</p>
        <div class="row">
          <button
            type="button"
            class="secondary small"
            :class="{ 'preset-selected': prefs.positionIntensity === 'bed_only' }"
            @click="prefs.setPositionIntensity('bed_only')"
          >
            Calmer / bed-focused
          </button>
          <button
            type="button"
            class="secondary small"
            :class="{ 'preset-selected': prefs.positionIntensity === 'more_physical' }"
            @click="prefs.setPositionIntensity('more_physical')"
          >
            Full variety
          </button>
        </div>
      </div>
      <p class="preferences-version" aria-hidden="true">v{{ appVersion }}</p>
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

const emit = defineEmits(['close', 'showOnboarding', 'showFavorites'])
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
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

const kokoroLoading = false
const testVoicePlaying = ref(false)
const modelDownloading = computed(() => {
  const k = speech.kokoroModelLoading
  const kVal = k && typeof k === 'object' && 'value' in k ? k.value : k
  return !!kVal
})
const kokoroSupported = true
const kokoroVoicesList = computed(() => (speech.kokoroVoicesListForLocale && speech.kokoroVoicesListForLocale.value) || speech.kokoroVoicesListForLocale || (speech.kokoroVoicesList && speech.kokoroVoicesList.value) || speech.kokoroVoicesList || [])
const browserVoicesList = computed(() => (speech.browserVoicesCurrentLang && speech.browserVoicesCurrentLang.value) || speech.browserVoicesCurrentLang || [])

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  if (kokoroSupported && speech.ttsProvider && typeof speech.ttsProvider === 'object' && 'value' in speech.ttsProvider) {
    speech.ttsProvider.value = 'kokoro'
  }
  if (!kokoroSupported && speech.ttsProvider && typeof speech.ttsProvider === 'object' && 'value' in speech.ttsProvider) {
    speech.ttsProvider.value = 'browser'
  }
  if (speech.isSupported()) speech.refreshVoices()
})

function onVoiceChange(e) {
  const value = e.target && e.target.value
  if (value != null) speech.setVoiceByKey(value)
}

const TEST_PHRASE = 'This is a quick voice test.'
function playTestVoice() {
  if (testVoicePlaying.value) return
  testVoicePlaying.value = true
  const onEnd = () => { testVoicePlaying.value = false }
  const voiceId = (speech.kokoroVoiceId && typeof speech.kokoroVoiceId === 'object' && 'value' in speech.kokoroVoiceId)
    ? speech.kokoroVoiceId.value
    : (speech.kokoroVoiceId ?? 'af_nicole')
  const staticUrl = speech.getStaticAudioUrl?.('voice_test', voiceId)
  if (staticUrl && speech.playBlob) {
    fetch(staticUrl)
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.blob() })
      .then((blob) => speech.playBlob(blob, onEnd))
      .catch(() => {
        speech.speak(TEST_PHRASE, { force: true, cacheForReplay: true, onEnd })
      })
  } else {
    speech.speak(TEST_PHRASE, { force: true, cacheForReplay: true, onEnd })
  }
}
function stopTestVoice() {
  speech.stop()
  testVoicePlaying.value = false
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
.pref-speed-row { align-items: center; gap: 0.5rem; }
.pref-music-volume { align-items: center; gap: 0.5rem; margin-top: 0.35rem; }
.pref-slider { width: 100%; max-width: 140px; accent-color: #3b82f6; }
.pref-test-voice-wrap { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem; align-items: center; }
.pref-downloading-notice {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0 0 0.35rem;
  text-align: center;
}
.pref-test-voice-btn { min-width: 8rem; }
.pref-stop-voice-btn { min-width: 8rem; }
.pref-speed-slider { width: 100%; max-width: 140px; accent-color: #3b82f6; }
.pref-speed-value { font-size: 0.9rem; font-weight: 600; min-width: 2.5rem; }
.pref-sep { padding-top: 0.75rem; border-top: 1px solid #334155; margin-top: 0.25rem; }
.preferences-version {
  margin: 1rem 0 0;
  padding-top: 0.75rem;
  border-top: 1px solid #334155;
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
}
</style>
