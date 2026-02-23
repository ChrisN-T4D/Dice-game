import { ref, onMounted, watch } from 'vue'
import { env as transformersEnv } from '@huggingface/transformers'

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v != null ? v : fallback } catch (_) { return fallback }
}

const voiceEnabled = ref(readLS('voiceEnabled', 'false') === 'true')
const voiceRate = ref((() => { const r = parseFloat(readLS('voiceRate', '1')); return !isNaN(r) && r >= 0.5 && r <= 2 ? r : 1.0 })())
const selectedVoiceURI = ref(readLS('selectedVoiceURI', ''))
const ttsProvider = ref((() => { const p = readLS('ttsProvider', 'piper'); return ['browser', 'piper', 'kokoro'].includes(p) ? p : 'piper' })())
const piperVoiceId = ref(readLS('piperVoiceId', ''))
const kokoroVoiceId = ref(readLS('kokoroVoiceId', ''))

const piperVoicesList = ref([])
const kokoroVoicesList = ref([])
const kokoroModelLoading = ref(false)
const piperModelLoading = ref(false)

let settingsInitialized = false
let currentExternalAudio = null
let piperModule = null
let piperSession = null
let piperSessionVoiceId = null
let kokoroTTS = null
let preloadAllEnginesPromise = null
let testReplayCache = {}

/** Web Worker for TTS generation (Piper/Kokoro) so the main thread stays responsive. */
let ttsWorker = null
const ttsPending = new Map()
let ttsNextId = 0

/** Observed max generation time (ms); used to refine estimates. */
let maxObservedTtsMs = 0

/** Conservative max TTS generation time (ms) for a phrase. Used to preload in time. */
const TTS_MS_PER_CHAR = 55
const TTS_ESTIMATE_MIN_MS = 800
const TTS_ESTIMATE_MAX_MS = 14_000

/** Clear Piper singleton and module so next use creates a fresh session (e.g. after WASM 404 fix). */
function clearPiperSession() {
  try {
    if (piperModule && piperModule.TtsSession && typeof piperModule.TtsSession._instance !== 'undefined') {
      piperModule.TtsSession._instance = null
    }
  } catch (_) {}
  piperModule = null
  piperSession = null
  piperSessionVoiceId = null
}

const KOKORO_MODEL_ID_REMOTE = 'onnx-community/Kokoro-82M-v1.0-ONNX'
/** Local model id when packaged under public/models/ (see scripts/download-kokoro-model.js). */
const KOKORO_MODEL_ID_LOCAL = 'Kokoro-82M-v1.0-ONNX'
/** Timeout for Kokoro model load (82MB). If it takes longer, we clear loading so the UI doesn't stay stuck. */
const KOKORO_LOAD_TIMEOUT_MS = 5 * 60 * 1000
/** Timeout for Piper session (WASM + voice data). */
const PIPER_LOAD_TIMEOUT_MS = 2 * 60 * 1000

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label || 'Load'} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

export function useSpeech() {
  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  function canSpeak() {
    return isSupported() || ['piper', 'kokoro'].includes(ttsProvider.value)
  }

  function cleanTextForSpeech(text) {
    if (!text) return ''
    return String(text)
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[⭐✓🔊🌶️]/g, '')
      .replace(/→/g, 'to')
      .replace(/\+/g, 'plus ')
      .replace(/P(\d)/g, 'Partner $1')
      .replace(/\b(\d+)s\b/gi, '$1 seconds')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function getVoicesList() {
    if (!isSupported()) return []
    const voices = window.speechSynthesis.getVoices()
    const en = voices.filter((v) => v.lang.startsWith('en'))
    const rest = voices.filter((v) => !v.lang.startsWith('en'))
    return [...en, ...rest]
  }

  const voices = ref([])
  function refreshVoices() {
    voices.value = getVoicesList()
  }

  function pickVoice() {
    const list = getVoicesList()
    if (!list.length) return null
    return (
      list.find((v) => v.lang.startsWith('en') && /zira/i.test(v.name)) ||
      list.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
      list.find((v) => v.lang.startsWith('en') && v.localService) ||
      list.find((v) => v.lang.startsWith('en')) ||
      null
    )
  }

  function getSelectedVoice() {
    if (selectedVoiceURI.value) {
      const list = getVoicesList()
      let found = list.find((v) => v.voiceURI === selectedVoiceURI.value)
      if (!found && selectedVoiceURI.value.startsWith('name:')) {
        const namePart = selectedVoiceURI.value.slice(5)
        found = list.find((v) => v.name === namePart)
      }
      if (found) return found
    }
    return pickVoice()
  }

  function playBlob(blob, onEnd) {
    if (currentExternalAudio) {
      currentExternalAudio.pause()
      currentExternalAudio.src = ''
    }
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentExternalAudio = audio
    audio.playbackRate = Math.max(0.5, Math.min(2, voiceRate.value))
    audio.onended = () => {
      URL.revokeObjectURL(url)
      currentExternalAudio = null
      if (onEnd) onEnd()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      currentExternalAudio = null
      if (onEnd) onEnd()
    }
    audio.play()
  }

  // Piper TTS: engine from https://github.com/OHF-Voice/piper1-gpl; we use @mintplex-labs/piper-tts-web for browser.
  async function speakPiper(text, onEnd, cacheKey) {
    try {
      piperModelLoading.value = true
      if (!piperModule) piperModule = await import('@mintplex-labs/piper-tts-web')
      const voiceId = piperVoiceId.value?.trim() || 'en_US-hfc_female-medium'
      let session = piperSession && piperSessionVoiceId === voiceId ? piperSession : null
      if (!session) {
        const onnxBase = typeof window !== 'undefined' && window.location
          ? window.location.origin + '/onnxruntime-wasm/'
          : 'https://unpkg.com/onnxruntime-web@1.24.2/dist/'
        const wasmPaths = {
          onnxWasm: onnxBase,
          piperWasm: `${piperModule.WASM_BASE}.wasm`,
          piperData: `${piperModule.WASM_BASE}.data`,
        }
        session = await withTimeout(
          piperModule.TtsSession.create({ voiceId, wasmPaths }),
          PIPER_LOAD_TIMEOUT_MS,
          'Piper model'
        )
        piperSession = session
        piperSessionVoiceId = voiceId
      }
      const wav = await session.predict(text)
      if (wav) {
        const blob = wav instanceof Blob ? wav : new Blob([wav])
        if (cacheKey) testReplayCache[cacheKey] = blob
        playBlob(blob, onEnd)
      } else if (onEnd) onEnd()
    } catch (e) {
      clearPiperSession()
      const msg = e?.message || String(e)
      const isWebGpuOrOrt = /WebGPU|Context Provider|onnxruntime/i.test(msg)
      if (import.meta.env?.DEV && !isWebGpuOrOrt) console.error('[Piper TTS]', e)
      if (onEnd) onEnd()
    } finally {
      piperModelLoading.value = false
    }
  }

  /**
   * Estimate max time (ms) needed for TTS generation. Uses length-based heuristic and
   * observed max from past generations. Call this to decide how far in advance to preload.
   */
  function estimateTtsMs(text) {
    if (!text || typeof text !== 'string') return TTS_ESTIMATE_MAX_MS
    const len = text.length
    const fromLength = Math.min(
      TTS_ESTIMATE_MAX_MS,
      Math.max(TTS_ESTIMATE_MIN_MS, len * TTS_MS_PER_CHAR)
    )
    return Math.max(fromLength, maxObservedTtsMs)
  }

  /**
   * Pre-generate and cache audio in the TTS worker so speak() can play immediately later.
   * Non-blocking. If onReady is provided, it is called when the phrase is cached or after
   * estimateTtsMs(text) ms (so you can preload and wait at most that long before proceeding).
   */
  function preparePhrase(text, onReady) {
    const cleaned = cleanTextForSpeech(text)
    if (!cleaned) {
      if (onReady) onReady()
      return
    }
    const provider = ttsProvider.value
    if (provider !== 'piper' && provider !== 'kokoro') {
      if (onReady) onReady()
      return
    }
    const voiceId = provider === 'piper'
      ? (piperVoiceId.value?.trim() || 'en_US-hfc_female-medium')
      : (kokoroVoiceId.value?.trim() || 'af_heart')
    const cacheKey = `${provider}:${voiceId}:${cleaned}`
    if (testReplayCache[cacheKey]) {
      if (onReady) onReady()
      return
    }
    const w = getTtsWorker()
    if (!w) {
      if (onReady) onReady()
      return
    }
    const id = `tts-${++ttsNextId}-${Date.now()}`
    const maxMs = estimateTtsMs(cleaned)
    let timeoutId = null
    const done = () => {
      if (timeoutId != null) clearTimeout(timeoutId)
      timeoutId = null
      if (onReady) {
        onReady()
        onReady = null
      }
    }
    timeoutId = setTimeout(done, maxMs)
    ttsPending.set(id, { cacheKey, onReady: done, sentAt: Date.now() })
    w.postMessage({
      type: 'generate',
      id,
      text: cleaned,
      provider,
      voiceId,
      origin: typeof window !== 'undefined' && window.location ? window.location.origin : '',
    })
  }

  /** Load Kokoro TTS instance: try local packaged model first, then remote. */
  async function loadKokoroTTS() {
    const { KokoroTTS } = await import('kokoro-js')
    const opts = { dtype: 'q8', device: 'wasm' }
    // Prefer local model under public/models/ (see npm run download-kokoro-model)
    const wasRemote = transformersEnv.allowRemoteModels
    const wasLocal = transformersEnv.allowLocalModels
    const wasPath = transformersEnv.localModelPath
    try {
      transformersEnv.allowLocalModels = true
      transformersEnv.allowRemoteModels = false
      transformersEnv.localModelPath = '/models/'
      return await withTimeout(
        KokoroTTS.from_pretrained(KOKORO_MODEL_ID_LOCAL, opts),
        KOKORO_LOAD_TIMEOUT_MS,
        'Kokoro model'
      )
    } catch (e) {
      // Fallback to Hugging Face Hub if local model not packaged
      transformersEnv.allowRemoteModels = true
      return await withTimeout(
        KokoroTTS.from_pretrained(KOKORO_MODEL_ID_REMOTE, opts),
        KOKORO_LOAD_TIMEOUT_MS,
        'Kokoro model'
      )
    } finally {
      transformersEnv.allowRemoteModels = wasRemote
      transformersEnv.allowLocalModels = wasLocal
      transformersEnv.localModelPath = wasPath
    }
  }

  /** Preload Kokoro model in background so first speak / "Hear voice test" only pays inference time. */
  async function preloadKokoroModel() {
    if (kokoroTTS) return
    try {
      kokoroModelLoading.value = true
      kokoroTTS = await loadKokoroTTS()
    } catch (e) {
      if (import.meta.env?.DEV) console.warn('[Kokoro preload]', e?.message || e)
    } finally {
      kokoroModelLoading.value = false
    }
  }

  async function speakKokoro(text, onEnd, cacheKey) {
    try {
      if (!kokoroTTS) {
        kokoroModelLoading.value = true
        try {
          kokoroTTS = await loadKokoroTTS()
        } finally {
          kokoroModelLoading.value = false
        }
      }
      if (!kokoroTTS) {
        if (onEnd) onEnd()
        return
      }
      const voice = kokoroVoiceId.value?.trim() || 'af_heart'
      const audio = await kokoroTTS.generate(text, { voice })
      if (audio && typeof audio.toBlob === 'function') {
        const blob = audio.toBlob()
        if (cacheKey) testReplayCache[cacheKey] = blob
        playBlob(blob, onEnd)
      } else if (onEnd) onEnd()
    } catch (_) {
      if (onEnd) onEnd()
    }
  }

  /** Lazy-init TTS worker; handle blob/error and fallback to main-thread on error. */
  function getTtsWorker() {
    if (ttsWorker) return ttsWorker
    try {
      ttsWorker = new Worker(new URL('../workers/tts.worker.js', import.meta.url), { type: 'module' })
      ttsWorker.onmessage = (ev) => {
        const d = ev.data
        const pending = d?.id != null ? ttsPending.get(d.id) : null
        if (!pending) return
        ttsPending.delete(d.id)
        if (pending.sentAt != null) {
          const elapsed = Date.now() - pending.sentAt
          if (elapsed > maxObservedTtsMs) maxObservedTtsMs = elapsed
        }
        if (d.type === 'blob' && d.blob) {
          if (pending.cacheKey) testReplayCache[pending.cacheKey] = d.blob
          if (pending.onEnd) playBlob(d.blob, pending.onEnd)
          if (pending.onReady) pending.onReady()
        } else if (d.type === 'error' && pending.fallback) {
          const { text, onEnd, cacheKey, provider } = pending.fallback
          if (provider === 'piper') speakPiper(text, onEnd, cacheKey)
          else if (provider === 'kokoro') speakKokoro(text, onEnd, cacheKey)
          else if (onEnd) onEnd()
          if (pending.onReady) pending.onReady()
        }
        if (pending.loadingRef) pending.loadingRef.value = false
      }
      ttsWorker.onerror = () => {
        piperModelLoading.value = false
        kokoroModelLoading.value = false
        ttsPending.forEach((p) => {
          if (p.fallback) {
            const { text, onEnd, cacheKey, provider } = p.fallback
            if (provider === 'piper') speakPiper(text, onEnd, cacheKey)
            else if (provider === 'kokoro') speakKokoro(text, onEnd, cacheKey)
            else if (onEnd) onEnd()
          }
        })
        ttsPending.clear()
      }
    } catch (e) {
      if (import.meta.env?.DEV) console.warn('[TTS worker]', e)
      return null
    }
    return ttsWorker
  }

  function speak(text, options = {}) {
    const { force = false, onEnd, cacheForReplay = false } = options
    if (!force && !voiceEnabled.value) {
      if (onEnd) onEnd()
      return
    }
    const cleaned = cleanTextForSpeech(text)
    if (!cleaned) {
      if (onEnd) onEnd()
      return
    }
    const provider = ttsProvider.value
    const voiceId = provider === 'piper'
      ? (piperVoiceId.value?.trim() || 'en_US-hfc_female-medium')
      : provider === 'kokoro'
        ? (kokoroVoiceId.value?.trim() || 'af_heart')
        : ''
    const cacheKey = voiceId ? `${provider}:${voiceId}:${cleaned}` : null
    if (cacheKey && testReplayCache[cacheKey]) {
      window.speechSynthesis?.cancel?.()
      playBlob(testReplayCache[cacheKey], onEnd)
      return
    }
    if (provider === 'piper' || provider === 'kokoro') {
      const w = getTtsWorker()
      if (w) {
        window.speechSynthesis?.cancel?.()
        const id = `tts-${++ttsNextId}-${Date.now()}`
        const sentAt = Date.now()
        if (provider === 'piper') piperModelLoading.value = true
        else kokoroModelLoading.value = true
        ttsPending.set(id, {
          cacheKey,
          onEnd,
          sentAt,
          loadingRef: provider === 'piper' ? piperModelLoading : kokoroModelLoading,
          fallback: { text: cleaned, onEnd, cacheKey, provider },
        })
        w.postMessage({
          type: 'generate',
          id,
          text: cleaned,
          provider,
          voiceId,
          origin: typeof window !== 'undefined' && window.location ? window.location.origin : '',
        })
        return
      }
    }
    if (provider === 'piper') {
      window.speechSynthesis?.cancel?.()
      speakPiper(cleaned, onEnd, cacheKey)
      return
    }
    if (provider === 'kokoro') {
      window.speechSynthesis?.cancel?.()
      speakKokoro(cleaned, onEnd, cacheKey)
      return
    }
    if (!isSupported()) {
      if (onEnd) onEnd()
      return
    }
    window.speechSynthesis.cancel()
    const baseSlower = 0.7
    const effectiveRate = (typeof voiceRate.value === 'number' ? voiceRate.value : 1.0) * baseSlower
    const rate = Math.max(0.5, Math.min(2, effectiveRate))
    const utterance = new SpeechSynthesisUtterance(cleaned)
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0
    const voice = getSelectedVoice()
    if (voice) utterance.voice = voice
    const done = () => {
      if (onEnd) onEnd()
    }
    utterance.onend = done
    utterance.onerror = done
    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (currentExternalAudio) {
      currentExternalAudio.onended = null
      currentExternalAudio.onerror = null
      currentExternalAudio.pause()
      currentExternalAudio.src = ''
      currentExternalAudio = null
    }
    if (isSupported()) window.speechSynthesis.cancel()
  }

  /** Reset Piper engine (clears cached session). Call after fixing WASM or to force re-init. */
  function resetPiper() {
    clearPiperSession()
  }

  /** No-op stub: Edge TTS was removed; kept so callers (e.g. cached HMR) do not throw. */
  async function getEdgeVoices() {
    return []
  }

  async function getPiperVoices() {
    try {
      if (!piperModule) piperModule = await import('@mintplex-labs/piper-tts-web')
      const v = await piperModule.voices()
      const list = Array.isArray(v)
        ? v.map((x) => {
            const voiceName = x.name || x.key || x.id || 'Voice'
            const lang = x.language || {}
            const langEnglish = lang.name_english || lang.code || ''
            const country = lang.country_english || ''
            const langLabel = langEnglish ? (country ? `${langEnglish} (${country})` : langEnglish) : ''
            const displayName = langLabel ? `${voiceName} (${langLabel})` : voiceName
            return {
              id: x.key || x.id,
              name: displayName,
              langCode: lang.code || '',
              langName: langEnglish,
            }
          })
        : []
      // Prioritize English (en_US, en_GB) first, then other languages
      const enPrefix = (id) => (id || '').startsWith('en_US') || (id || '').startsWith('en_GB')
      list.sort((a, b) => {
        const aEn = enPrefix(a.id) ? 0 : 1
        const bEn = enPrefix(b.id) ? 0 : 1
        if (aEn !== bEn) return aEn - bEn
        const langCmp = String(a.langName || a.langCode).localeCompare(String(b.langName || b.langCode))
        if (langCmp !== 0) return langCmp
        return String(a.name || a.id).localeCompare(String(b.name || b.id))
      })
      piperVoicesList.value = list.length
        ? list.map(({ id, name }) => ({ id, name }))
        : [{ id: 'en_US-hfc_female-medium', name: 'English (US) Female' }]
      return piperVoicesList.value
    } catch (e) {
      clearPiperSession()
      if (import.meta.env?.DEV) console.error('[Piper voices]', e)
      piperVoicesList.value = [{ id: 'en_US-hfc_female-medium', name: 'English (US) Female' }]
      return piperVoicesList.value
    }
  }

  /** Load Kokoro model if needed, then return full voice list (model includes all voices). */
  async function getKokoroVoices() {
    if (!kokoroTTS) await preloadKokoroModel()
    if (kokoroTTS) {
      const voicesObj = kokoroTTS.voices || {}
      const ids = Object.keys(voicesObj)
      const withNames = ids.map((id) => ({
        id,
        name: (voicesObj[id] && voicesObj[id].name) || id,
      }))
      const enPrefix = (id) => (id || '').startsWith('am_') || (id || '').startsWith('af_') || (id || '').startsWith('bm_') || (id || '').startsWith('bf_')
      withNames.sort((a, b) => {
        const aEn = enPrefix(a.id) ? 0 : 1
        const bEn = enPrefix(b.id) ? 0 : 1
        if (aEn !== bEn) return aEn - bEn
        return String(a.id).localeCompare(String(b.id))
      })
      kokoroVoicesList.value = withNames
      return kokoroVoicesList.value
    }
    kokoroVoicesList.value = []
    return kokoroVoicesList.value
  }

  /** Preload one Piper model so first speak is fast. Uses first en_US/en_GB voice from list. */
  async function preloadPiperModel(voiceId) {
    if (!voiceId) return
    try {
      piperModelLoading.value = true
      if (!piperModule) piperModule = await import('@mintplex-labs/piper-tts-web')
      const onnxBase = typeof window !== 'undefined' && window.location
        ? window.location.origin + '/onnxruntime-wasm/'
        : 'https://unpkg.com/onnxruntime-web@1.24.2/dist/'
      const wasmPaths = {
        onnxWasm: onnxBase,
        piperWasm: `${piperModule.WASM_BASE}.wasm`,
        piperData: `${piperModule.WASM_BASE}.data`,
      }
      const session = await withTimeout(
        piperModule.TtsSession.create({ voiceId, wasmPaths }),
        PIPER_LOAD_TIMEOUT_MS,
        'Piper model'
      )
      await session.predict(' ')
      piperSession = session
      piperSessionVoiceId = voiceId
    } catch (e) {
      clearPiperSession()
      const msg = e?.message || String(e)
      const isTimeout = /timed out/i.test(msg)
      const isWebGpuOrOrt = /WebGPU|Context Provider|onnxruntime/i.test(msg)
      if (import.meta.env?.DEV && isTimeout) console.warn('[Piper preload]', msg)
      else if (import.meta.env?.DEV && !isWebGpuOrOrt) console.error('[Piper preload]', e)
      else if (import.meta.env?.DEV && isWebGpuOrOrt) console.warn('[Piper] WebGPU unavailable; Piper will use other voices or try again later.')
    } finally {
      piperModelLoading.value = false
    }
  }

  /** Curated default voices only (no network fetch). Kokoro: Nicole, Heart, Echo, Eric. Piper: hfc_female, lessac, Kristin, ryan, libritts_r. */
  const CURATED_KOKORO = [
    { id: 'af_heart', name: 'Heart', gender: 'female' },
    { id: 'af_nicole', name: 'Nicole', gender: 'female' },
    { id: 'am_echo', name: 'Echo', gender: 'male' },
    { id: 'am_eric', name: 'Eric', gender: 'male' },
  ]
  const CURATED_PIPER = [
    { id: 'en_US-hfc_female-medium', name: 'HFC Female', gender: 'female' },
    { id: 'en_US-lessac-medium', name: 'Lessac', gender: 'female' },
    { id: 'en_US-kristin-medium', name: 'Kristin', gender: 'female' },
    { id: 'en_US-ryan-medium', name: 'Ryan', gender: 'male' },
    { id: 'en_US-libritts_r-medium', name: 'Libritts R', gender: 'any' },
  ]

  /**
   * Preload voice engines: set curated lists, preload one Piper model, and preload Kokoro (Nicole etc.) from the start.
   * Options { language, gender } used to pick which Piper model to preload first.
   */
  function preloadAllEngines(options = {}) {
    const { gender } = options
    if (preloadAllEnginesPromise) return preloadAllEnginesPromise
    preloadAllEnginesPromise = (async () => {
      refreshVoices()
      // Use curated list for Piper only; Kokoro will show full list after model load
      if (!piperVoicesList.value?.length) piperVoicesList.value = CURATED_PIPER.map(({ id, name }) => ({ id, name }))
      const gen = gender ?? 'any'
      const firstPiper = CURATED_PIPER.find((v) => gen === 'any' || v.gender === gen) || CURATED_PIPER[0]
      // Load Piper and Kokoro in parallel; Kokoro model includes all voices so we fill the full list after load
      await Promise.all([
        preloadPiperModel(firstPiper.id),
        preloadKokoroModel(),
      ])
      await getKokoroVoices()
    })()
    return preloadAllEnginesPromise
  }

  /**
   * Return recommended voices from curated Piper + Kokoro only, filtered by gender. Browser as backup if supported.
   * genderPreference: 'female' | 'male' | 'any'.
   */
  function getRecommendedVoices(languagePreference = 'en-US', genderPreference = 'any') {
    const recs = []
    const genderOk = (g) => genderPreference === 'any' || g === genderPreference

    // Browser (backup): one English voice matching gender
    if (isSupported()) {
      const list = getVoicesList()
      const en = list.filter((v) => v.lang && (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en_US')))
      const byGender = en.filter((v) => {
        const n = (v.name || '').toLowerCase()
        if (genderPreference === 'any') return true
        if (genderPreference === 'female') return n.includes('female') || n.includes('samantha') || n.includes('victoria') || n.includes('zira') || n.includes('jenny') || n.includes('aria')
        if (genderPreference === 'male') return n.includes('male') || n.includes('david') || n.includes('mark') || n.includes('guy') || n.includes('daniel')
        return true
      })
      const pick = byGender[0] || en[0]
      if (pick) {
        const uri = pick.voiceURI || (pick.name ? `name:${pick.name}` : '')
        if (uri) recs.push({ provider: 'browser', voiceId: uri, name: `${pick.name} (Browser)`, engine: 'Browser' })
      }
    }

    // Curated Piper (filter by gender)
    for (const v of CURATED_PIPER) {
      if (!genderOk(v.gender)) continue
      recs.push({ provider: 'piper', voiceId: v.id, name: `${v.name} (Piper)`, engine: 'Piper' })
    }
    // Curated Kokoro (filter by gender)
    for (const v of CURATED_KOKORO) {
      if (!genderOk(v.gender)) continue
      recs.push({ provider: 'kokoro', voiceId: v.id, name: `${v.name} (Kokoro)`, engine: 'Kokoro' })
    }
    return recs
  }

  onMounted(() => {
    if (!settingsInitialized) {
      settingsInitialized = true
      if (!piperVoicesList.value?.length) piperVoicesList.value = CURATED_PIPER.map(({ id, name }) => ({ id, name }))
      // Kokoro list is filled when user selects Kokoro (getKokoroVoices loads model and returns all voices)
    }
    const loadVoicesLater = () => {
      refreshVoices()
      if (isSupported()) {
        window.speechSynthesis.onvoiceschanged = refreshVoices
      }
    }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(loadVoicesLater, { timeout: 500 })
    } else {
      setTimeout(loadVoicesLater, 0)
    }
  })

  watch(voiceEnabled, (v) => {
    try { localStorage.setItem('voiceEnabled', v ? 'true' : 'false') } catch (_) {}
  })
  watch(voiceRate, (v) => {
    try { localStorage.setItem('voiceRate', String(v)) } catch (_) {}
  })
  watch(selectedVoiceURI, (uri) => {
    try {
      if (uri) localStorage.setItem('selectedVoiceURI', uri)
      else localStorage.removeItem('selectedVoiceURI')
    } catch (_) {}
  })
  watch(ttsProvider, (v) => {
    try {
      localStorage.setItem('ttsProvider', v)
    } catch (_) {}
  })
  watch(piperVoiceId, (v) => {
    try {
      if (v) localStorage.setItem('piperVoiceId', v)
      else localStorage.removeItem('piperVoiceId')
    } catch (_) {}
  })
  watch(kokoroVoiceId, (v) => {
    try {
      if (v) localStorage.setItem('kokoroVoiceId', v)
      else localStorage.removeItem('kokoroVoiceId')
    } catch (_) {}
  })

  return {
    voiceEnabled,
    voiceRate,
    selectedVoiceURI,
    voices,
    ttsProvider,
    piperVoiceId,
    kokoroVoiceId,
    piperVoicesList,
    kokoroVoicesList,
    kokoroModelLoading,
    piperModelLoading,
    isSupported,
    canSpeak,
    cleanTextForSpeech,
    getVoicesList,
    getSelectedVoice,
    pickVoice,
    speak,
    stop,
    refreshVoices,
    getPiperVoices,
    resetPiper,
    getKokoroVoices,
    getEdgeVoices,
    preloadAllEngines,
    preloadPiperModel,
    preloadKokoroModel,
    preparePhrase,
    estimateTtsMs,
    getRecommendedVoices,
  }
}
