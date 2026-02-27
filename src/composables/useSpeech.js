import { ref, onMounted, watch } from 'vue'
import { env as transformersEnv } from '@huggingface/transformers'

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v != null ? v : fallback } catch (_) { return fallback }
}

const voiceEnabled = ref(readLS('voiceEnabled', 'false') === 'true')
const voiceRate = ref((() => { const r = parseFloat(readLS('voiceRate', '1')); return !isNaN(r) && r >= 0.5 && r <= 2 ? r : 1.0 })())
const selectedVoiceURI = ref(readLS('selectedVoiceURI', ''))
const ttsProvider = ref((() => { const p = readLS('ttsProvider', 'kokoro'); return ['browser', 'kokoro'].includes(p) ? p : 'kokoro' })())
const kokoroVoiceId = ref(readLS('kokoroVoiceId', ''))

const kokoroVoicesList = ref([])
const kokoroModelLoading = ref(false)

let settingsInitialized = false
let currentExternalAudio = null
let kokoroTTS = null
let preloadAllEnginesPromise = null
let testReplayCache = {}

/** Web Worker for TTS generation (Kokoro) so the main thread stays responsive. */
let ttsWorker = null
const ttsPending = new Map()
let ttsNextId = 0
/** Pending getVoices requests: id -> { resolve, reject }. Worker is the single place that loads Kokoro (one download for all voices). */
const getVoicesPending = new Map()
let getVoicesNextId = 0

/** Observed max generation time (ms); used to refine estimates. */
let maxObservedTtsMs = 0

/** Conservative max TTS generation time (ms) for a phrase. Used to preload in time. */
const TTS_MS_PER_CHAR = 55
const TTS_ESTIMATE_MIN_MS = 800
const TTS_ESTIMATE_MAX_MS = 14_000

const KOKORO_MODEL_ID_REMOTE = 'onnx-community/Kokoro-82M-v1.0-ONNX'
/** Local model id when packaged under public/models/ (see scripts/download-kokoro-model.js). */
const KOKORO_MODEL_ID_LOCAL = 'Kokoro-82M-v1.0-ONNX'
/** Timeout for Kokoro model load (82MB). If it takes longer, we clear loading so the UI doesn't stay stuck. */
const KOKORO_LOAD_TIMEOUT_MS = 5 * 60 * 1000

/** Hugging Face base URL and file list for Kokoro; prefetching these on the main thread warms the browser cache so the worker gets fast cache reads instead of a slow sequential download. */
const KOKORO_HF_BASE = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/'
const KOKORO_HF_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_quantized.onnx',
  'voices/af_nicole.bin',
  'voices/af_heart.bin',
  'voices/am_echo.bin',
  'voices/am_eric.bin',
]

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
    return isSupported() || ttsProvider.value === 'kokoro'
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
    if (provider !== 'kokoro') {
      if (onReady) onReady()
      return
    }
    const voiceId = kokoroVoiceId.value?.trim() || 'af_heart'
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

  /** Prefetch Kokoro model files on the main thread (parallel requests) so the browser cache is warm and the worker gets fast cache reads instead of a slow sequential download. */
  async function prefetchKokoroToBrowserCache() {
    if (typeof fetch === 'undefined' || typeof window === 'undefined') return
    const timeoutMs = 6 * 60 * 1000
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
      await Promise.all(
        KOKORO_HF_FILES.map((path) =>
          fetch(KOKORO_HF_BASE + path, {
            signal: controller.signal,
            cache: 'force-cache',
            mode: 'cors',
          }).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${path}: ${r.status}`))))
        )
      )
    } finally {
      clearTimeout(t)
    }
  }

  /** Preload Kokoro in the worker (single load for all voices). Prefetch on main thread first so the worker reads from cache (faster). */
  async function preloadKokoroModel() {
    try {
      kokoroModelLoading.value = true
      await prefetchKokoroToBrowserCache()
      await getKokoroVoices()
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
        // Worker getVoices response (single Kokoro load lives in worker; no main-thread load for voices)
        if (d?.type === 'voices' && d?.id != null) {
          const p = getVoicesPending.get(d.id)
          if (p) {
            getVoicesPending.delete(d.id)
            if (p.timeoutId != null) clearTimeout(p.timeoutId)
            kokoroVoicesList.value = Array.isArray(d.voices) ? d.voices : []
            p.resolve(kokoroVoicesList.value)
          }
          return
        }
        if (d?.type === 'error' && d?.id != null && getVoicesPending.has(d.id)) {
          const p = getVoicesPending.get(d.id)
          if (p) {
            getVoicesPending.delete(d.id)
            if (p.timeoutId != null) clearTimeout(p.timeoutId)
            kokoroVoicesList.value = []
            p.reject(new Error(d.message || 'Failed to load voices'))
          }
          return
        }
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
          if (provider === 'kokoro') speakKokoro(text, onEnd, cacheKey)
          else if (onEnd) onEnd()
          if (pending.onReady) pending.onReady()
        }
        if (pending.loadingRef) pending.loadingRef.value = false
      }
      ttsWorker.onerror = () => {
        kokoroModelLoading.value = false
        ttsPending.forEach((p) => {
          if (p.fallback) {
            const { text, onEnd, cacheKey, provider } = p.fallback
            if (provider === 'kokoro') speakKokoro(text, onEnd, cacheKey)
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
    const voiceId = provider === 'kokoro' ? (kokoroVoiceId.value?.trim() || 'af_heart') : ''
    const cacheKey = voiceId ? `${provider}:${voiceId}:${cleaned}` : null
    if (cacheKey && testReplayCache[cacheKey]) {
      window.speechSynthesis?.cancel?.()
      playBlob(testReplayCache[cacheKey], onEnd)
      return
    }
    if (provider === 'kokoro') {
      const w = getTtsWorker()
      if (w) {
        window.speechSynthesis?.cancel?.()
        const id = `tts-${++ttsNextId}-${Date.now()}`
        const sentAt = Date.now()
        kokoroModelLoading.value = true
        ttsPending.set(id, {
          cacheKey,
          onEnd,
          sentAt,
          loadingRef: kokoroModelLoading,
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

  /** No-op stub: Edge TTS was removed; kept so callers (e.g. cached HMR) do not throw. */
  async function getEdgeVoices() {
    return []
  }

  /** Get Kokoro voice list from the worker (worker loads the model once; one download for all voices). */
  async function getKokoroVoices() {
    const w = getTtsWorker()
    if (!w) {
      kokoroVoicesList.value = []
      return kokoroVoicesList.value
    }
    const id = `getVoices-${++getVoicesNextId}-${Date.now()}`
    const p = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const pending = getVoicesPending.get(id)
        if (pending) {
          getVoicesPending.delete(id)
          kokoroVoicesList.value = []
          pending.reject(new Error('Kokoro voices load timed out'))
        }
      }, KOKORO_LOAD_TIMEOUT_MS)
      getVoicesPending.set(id, { resolve, reject, timeoutId })
    })
    w.postMessage({ type: 'getVoices', id })
    try {
      const list = await p
      return list
    } catch (_) {
      return kokoroVoicesList.value
    }
  }

  /** Curated default voices only (no network fetch). Kokoro: Nicole, Heart, Echo, Eric. */
  const CURATED_KOKORO = [
    { id: 'af_heart', name: 'Heart', gender: 'female' },
    { id: 'af_nicole', name: 'Nicole', gender: 'female' },
    { id: 'am_echo', name: 'Echo', gender: 'male' },
    { id: 'am_eric', name: 'Eric', gender: 'male' },
  ]
  /**
   * Preload Kokoro model so first speak / "Hear voice test" is fast.
   */
  function preloadAllEngines(options = {}) {
    if (preloadAllEnginesPromise) return preloadAllEnginesPromise
    preloadAllEnginesPromise = (async () => {
      refreshVoices()
      await preloadKokoroModel()
      await getKokoroVoices()
    })()
    return preloadAllEnginesPromise
  }

  /**
   * Return recommended voices: Kokoro (curated) + Browser as backup. Filtered by gender.
   */
  function getRecommendedVoices(languagePreference = 'en-US', genderPreference = 'any') {
    const recs = []
    const genderOk = (g) => genderPreference === 'any' || g === genderPreference

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
    for (const v of CURATED_KOKORO) {
      if (!genderOk(v.gender)) continue
      recs.push({ provider: 'kokoro', voiceId: v.id, name: `${v.name} (Kokoro)`, engine: 'Kokoro' })
    }
    return recs
  }

  onMounted(() => {
    if (!settingsInitialized) {
      settingsInitialized = true
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
    kokoroVoiceId,
    kokoroVoicesList,
    kokoroModelLoading,
    isSupported,
    canSpeak,
    cleanTextForSpeech,
    getVoicesList,
    getSelectedVoice,
    pickVoice,
    speak,
    stop,
    refreshVoices,
    getKokoroVoices,
    getEdgeVoices,
    preloadAllEngines,
    preloadKokoroModel,
    preparePhrase,
    estimateTtsMs,
    getRecommendedVoices,
  }
}
