import { ref, computed, onMounted, watch } from 'vue'
import { whenIdle } from '@/utils/whenIdle'
import { getStaticPhraseIdForText, getStaticPhraseIdById, DEFAULT_STATIC_VOICE_ID } from '@/data/staticPhrases'
import { publicPath } from '@/utils/publicPath'

/** Lazy-load phonemize so espeak-ng runs on main thread (reliable); worker then only runs ONNX. */
let phonemizeFn = null
async function getPhonemize() {
  if (phonemizeFn) return phonemizeFn
  const mod = await import('@/tts/kokoroOrt/phonemize.js')
  phonemizeFn = mod.phonemize
  return phonemizeFn
}

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v != null ? v : fallback } catch (_) { return fallback }
}

const voiceEnabled = ref(readLS('voiceEnabled', 'true') === 'true')
const voiceRate = ref((() => { const r = parseFloat(readLS('voiceRate', '1')); return !isNaN(r) && r >= 0.5 && r <= 2 ? r : 1.0 })())
const selectedVoiceURI = ref(readLS('selectedVoiceURI', ''))
const ttsProvider = ref((() => { const p = readLS('ttsProvider', 'kokoro'); return ['browser', 'kokoro'].includes(p) ? p : 'kokoro' })())
const kokoroVoiceId = ref(readLS('kokoroVoiceId', 'af_nicole'))

const kokoroModelLoading = ref(false)
const kokoroReady = ref(false)
/** If warmup failed, this holds the error message (e.g. model not found). Cleared when starting a new warmup. */
const kokoroWarmupError = ref(null)
/** True when Kokoro is selected but model not ready yet; we are waiting before sending generate (UI can show "voice not downloaded yet"). */
const waitingForKokoroReady = ref(false)

let settingsInitialized = false
let currentExternalAudio = null
/** When playing via Web Audio API (fallback after play_rejected), so we can stop it on next play. */
let currentWebAudioSource = null
let testReplayCache = {}

/** AudioContext unlocked on user gesture so blob play() is not blocked by autoplay policy. */
let _audioContextUnlock = null
function getAudioContextForUnlock() {
  if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return null
  if (_audioContextUnlock) return _audioContextUnlock
  const Ctx = window.AudioContext || window.webkitAudioContext
  _audioContextUnlock = new Ctx()
  return _audioContextUnlock
}

/**
 * Resume Web Audio, browser speech synthesis, and the current guided blob element after
 * screen lock / tab backgrounding (call from visibilitychange or pageshow as needed).
 */
export function resumeGuidedAudioEnvironment() {
  if (typeof window === 'undefined') return
  try {
    const ctx = getAudioContextForUnlock()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  } catch (_) {}
  try {
    if (window.speechSynthesis) window.speechSynthesis.resume()
  } catch (_) {}
  const a = currentExternalAudio
  if (a && a.paused && !a.ended) {
    const p = a.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }
}

/**
 * Unlock audio on user gesture (e.g. Start session) so subsequent blob play() is not blocked.
 * Registers a one-time visibility listener so Web Audio / HTMLMediaElement resume after screen lock.
 */
let audioVisibilityResumeInstalled = false
function installAudioVisibilityResume() {
  if (audioVisibilityResumeInstalled || typeof document === 'undefined') return
  audioVisibilityResumeInstalled = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    resumeGuidedAudioEnvironment()
  })
}

function unlockAudio() {
  const ctx = getAudioContextForUnlock()
  if (ctx && ctx.state === 'suspended') ctx.resume()
  installAudioVisibilityResume()
}

/** Web Worker for TTS generation (Kokoro) so the main thread stays responsive. */
let ttsWorker = null
const ttsPending = new Map()
let ttsNextId = 0
/** Unwatch for kokoroReady when we're waiting to send generate; cleared in stop() so we don't send after stop. */
let waitForReadyUnwatch = null

/** Incremented on each new speak(); stale async callbacks bail out before playing. */
let speakGeneration = 0

/** Observed max generation time (ms); used to refine estimates. */
let maxObservedTtsMs = 0

/** Latest worker progress: { id, status } (status: 'started' | 'running'). Cleared when blob/error received. */
const ttsWorkerProgress = ref({ id: null, status: null })

const GENERATE_PHRASE_TIMEOUT_MS = 90000

const TTS_MS_PER_CHAR = 55
const TTS_ESTIMATE_MIN_MS = 800
const TTS_ESTIMATE_MAX_MS = 14_000

const KOKORO_MODEL_ID_LOCAL = 'Kokoro-82M-v1.0-ONNX'

/**
 * Full Kokoro voice list (hardcoded from the model config).
 * English voices (am_/af_/bm_/bf_) sorted first since this is an English app.
 */
const ALL_KOKORO_VOICES = [
  { id: 'af', name: 'Default (F)', lang: 'en' },
  { id: 'af_alloy', name: 'Alloy', lang: 'en' },
  { id: 'af_aoede', name: 'Aoede', lang: 'en' },
  { id: 'af_bella', name: 'Bella', lang: 'en' },
  { id: 'af_heart', name: 'Heart', lang: 'en' },
  { id: 'af_jessica', name: 'Jessica', lang: 'en' },
  { id: 'af_kore', name: 'Kore', lang: 'en' },
  { id: 'af_nicole', name: 'Nicole', lang: 'en' },
  { id: 'af_nova', name: 'Nova', lang: 'en' },
  { id: 'af_river', name: 'River', lang: 'en' },
  { id: 'af_sarah', name: 'Sarah', lang: 'en' },
  { id: 'af_sky', name: 'Sky', lang: 'en' },
  { id: 'am_adam', name: 'Adam', lang: 'en' },
  { id: 'am_echo', name: 'Echo', lang: 'en' },
  { id: 'am_eric', name: 'Eric', lang: 'en' },
  { id: 'am_fenrir', name: 'Fenrir', lang: 'en' },
  { id: 'am_liam', name: 'Liam', lang: 'en' },
  { id: 'am_michael', name: 'Michael', lang: 'en' },
  { id: 'am_onyx', name: 'Onyx', lang: 'en' },
  { id: 'am_puck', name: 'Puck', lang: 'en' },
  { id: 'am_santa', name: 'Santa', lang: 'en' },
  { id: 'bf_alice', name: 'Alice (British)', lang: 'en-GB' },
  { id: 'bf_emma', name: 'Emma (British)', lang: 'en-GB' },
  { id: 'bf_isabella', name: 'Isabella (British)', lang: 'en-GB' },
  { id: 'bf_lily', name: 'Lily (British)', lang: 'en-GB' },
  { id: 'bm_daniel', name: 'Daniel (British)', lang: 'en-GB' },
  { id: 'bm_fable', name: 'Fable (British)', lang: 'en-GB' },
  { id: 'bm_george', name: 'George (British)', lang: 'en-GB' },
  { id: 'bm_lewis', name: 'Lewis (British)', lang: 'en-GB' },
  { id: 'ef_dora', name: 'Dora (Spanish)', lang: 'es' },
  { id: 'em_alex', name: 'Alex (Spanish)', lang: 'es' },
  { id: 'em_santa', name: 'Santa (Spanish)', lang: 'es' },
  { id: 'ff_siwis', name: 'Siwis (French)', lang: 'fr' },
  { id: 'hf_alpha', name: 'Alpha (Hindi)', lang: 'hi' },
  { id: 'hf_beta', name: 'Beta (Hindi)', lang: 'hi' },
  { id: 'hm_omega', name: 'Omega (Hindi)', lang: 'hi' },
  { id: 'hm_psi', name: 'Psi (Hindi)', lang: 'hi' },
  { id: 'if_sara', name: 'Sara (Italian)', lang: 'it' },
  { id: 'im_nicola', name: 'Nicola (Italian)', lang: 'it' },
  { id: 'jf_alpha', name: 'Alpha (Japanese)', lang: 'ja' },
  { id: 'jf_gongitsune', name: 'Gongitsune (Japanese)', lang: 'ja' },
  { id: 'jf_nezumi', name: 'Nezumi (Japanese)', lang: 'ja' },
  { id: 'jf_tebukuro', name: 'Tebukuro (Japanese)', lang: 'ja' },
  { id: 'jm_kumo', name: 'Kumo (Japanese)', lang: 'ja' },
  { id: 'pf_dora', name: 'Dora (Portuguese)', lang: 'pt' },
  { id: 'pm_alex', name: 'Alex (Portuguese)', lang: 'pt' },
  { id: 'pm_santa', name: 'Santa (Portuguese)', lang: 'pt' },
  { id: 'zf_xiaobei', name: 'Xiaobei (Chinese)', lang: 'zh' },
  { id: 'zf_xiaoni', name: 'Xiaoni (Chinese)', lang: 'zh' },
  { id: 'zf_xiaoxiao', name: 'Xiaoxiao (Chinese)', lang: 'zh' },
  { id: 'zf_xiaoyi', name: 'Xiaoyi (Chinese)', lang: 'zh' },
  { id: 'zm_yunjian', name: 'Yunjian (Chinese)', lang: 'zh' },
  { id: 'zm_yunxi', name: 'Yunxi (Chinese)', lang: 'zh' },
  { id: 'zm_yunxia', name: 'Yunxia (Chinese)', lang: 'zh' },
  { id: 'zm_yunyang', name: 'Yunyang (Chinese)', lang: 'zh' },
]

/** Voices exposed to the UI dropdown (populated immediately, no model load). */
const kokoroVoicesList = ref(ALL_KOKORO_VOICES)

/** Kokoro lang codes we support; first segment of browser locale maps to these. */
const BROWSER_LANG_TO_KOKORO = {
  en: ['en', 'en-GB'],
  es: ['es'],
  fr: ['fr'],
  hi: ['hi'],
  it: ['it'],
  ja: ['ja'],
  pt: ['pt'],
  zh: ['zh'],
}

/**
 * Normalize navigator.language to a primary Kokoro lang (e.g. en-US -> en, zh-CN -> zh).
 * Returns the list of Kokoro lang codes to show (e.g. ['en', 'en-GB'] for English).
 */
function getViewingLangCodes() {
  if (typeof navigator === 'undefined') return ['en', 'en-GB']
  const raw = (navigator.language || navigator.userLanguage || 'en').trim()
  const primary = raw.split('-')[0].toLowerCase()
  return BROWSER_LANG_TO_KOKORO[primary] || ['en', 'en-GB']
}

/** Kokoro runs in-browser on all platforms (local-focused). Worker limits (queue, token cap, single voice, WASM numThreads=1 on WebKit) keep it within safe bounds on iOS/Safari. */
const kokoroAvailable = true

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label || 'Load'} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

export function useSpeech() {
  /** Kokoro voices filtered by the language the user is viewing the app in (navigator.language). */
  const kokoroVoicesListForLocale = computed(() => {
    const codes = getViewingLangCodes()
    const list = ALL_KOKORO_VOICES.filter((v) => v.lang && codes.includes(v.lang))
    const currentId = (kokoroVoiceId.value && typeof kokoroVoiceId.value === 'object' && 'value' in kokoroVoiceId.value)
      ? kokoroVoiceId.value.value
      : (kokoroVoiceId.value || '')
    if (currentId && !list.some((v) => v.id === currentId)) {
      const current = ALL_KOKORO_VOICES.find((v) => v.id === currentId)
      if (current) return [current, ...list]
    }
    return list
  })

  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  function canSpeak() {
    return isSupported() || (kokoroAvailable && ttsProvider.value === 'kokoro')
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

  const VOICE_CURRENT_LANG = 'en'

  function getVoicesList() {
    if (!isSupported()) return []
    const voices = window.speechSynthesis.getVoices()
    const en = voices.filter((v) => v.lang.startsWith('en'))
    const rest = voices.filter((v) => !v.lang.startsWith('en'))
    return [...en, ...rest]
  }

  function getBrowserVoicesCurrentLang() {
    if (!isSupported()) return []
    const voices = window.speechSynthesis.getVoices()
    const lang = (VOICE_CURRENT_LANG || 'en').toLowerCase()
    return voices.filter((v) => v.lang && String(v.lang).toLowerCase().startsWith(lang))
  }

  const voices = ref([])
  const browserVoicesCurrentLang = ref([])
  function refreshVoices() {
    voices.value = getVoicesList()
    browserVoicesCurrentLang.value = getBrowserVoicesCurrentLang()
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

  /** Max time we wait for blob playback to finish before treating as failed (silent/corrupt/stalled). */
  const PLAYBACK_MAX_MS = 90000
  /** Min blob size to consider valid (worker also uses 100); smaller → treat as no audio and fall back. */
  const MIN_BLOB_SIZE = 100

  /**
   * Play an audio blob. If playback fails (e.g. autoplay blocked), calls onPlaybackFailed so the
   * caller can fall back to TTS and ensure the user always hears the phrase.
   * Also fails if blob is too small (likely empty/invalid) or if 'ended' never fires within PLAYBACK_MAX_MS.
   * @param {Blob} blob
   * @param {() => void} onEnd - called when playback finishes successfully
   * @param {(reason?: string) => void} [onPlaybackFailed] - called when play() rejects, audio errors, or playback times out; receives a short reason for the dev log
   */
  function playBlob(blob, onEnd, onPlaybackFailed) {
    if (blob == null || blob === undefined) {
      if (onPlaybackFailed) onPlaybackFailed('blob_missing')
      else if (onEnd) onEnd()
      return
    }
    if (blob.size < MIN_BLOB_SIZE) {
      if (onPlaybackFailed) onPlaybackFailed('blob_too_small')
      else if (onEnd) onEnd()
      return
    }
    if (currentExternalAudio) {
      currentExternalAudio.onended = null
      currentExternalAudio.onerror = null
      currentExternalAudio.pause()
      currentExternalAudio.src = ''
      currentExternalAudio = null
    }
    if (currentWebAudioSource) {
      try { currentWebAudioSource.stop() } catch (_) {}
      currentWebAudioSource = null
    }
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentExternalAudio = audio
    installAudioVisibilityResume()
    try {
      audio.setAttribute('playsinline', '')
      audio.setAttribute('webkit-playsinline', 'true')
      audio.playsInline = true
      audio.preload = 'auto'
    } catch (_) {}
    audio.playbackRate = Math.max(0.5, Math.min(2, voiceRate.value))
    let ended = false
    let timeoutId = null
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      URL.revokeObjectURL(url)
      currentExternalAudio = null
    }
    const runEnd = () => {
      if (ended) return
      ended = true
      cleanup()
      if (currentWebAudioSource) {
        currentWebAudioSource = null
      }
      if (onEnd) onEnd()
    }
    const runFailed = (reason) => {
      if (ended) return
      ended = true
      cleanup()
      if (currentWebAudioSource) {
        currentWebAudioSource = null
      }
      const errReason = reason || 'unknown'
      if (onPlaybackFailed) onPlaybackFailed(errReason)
      else if (onEnd) onEnd()
    }
    const tryWebAudioFallback = (reason) => {
      cleanup()
      const ctx = getAudioContextForUnlock()
      if (!ctx) {
        runFailed(reason || 'play_rejected')
        return
      }
      if (ctx.state === 'suspended') ctx.resume()
      blob.arrayBuffer()
        .then((ab) => ctx.decodeAudioData(ab))
        .then((buffer) => {
          if (ended) return
          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.connect(ctx.destination)
          source.playbackRate.value = Math.max(0.5, Math.min(2, voiceRate.value))
          currentWebAudioSource = source
          const t = setTimeout(() => {
            if (!ended && currentWebAudioSource === source) {
              currentWebAudioSource = null
              runFailed('playback_timeout')
            }
          }, PLAYBACK_MAX_MS)
          source.onended = () => {
            clearTimeout(t)
            runEnd()
          }
          source.start(0)
        })
        .catch(() => runFailed(reason || 'play_rejected'))
    }
    audio.onended = runEnd
    audio.onerror = () => tryWebAudioFallback('audio_error')
    audio.addEventListener('loadedmetadata', () => {
      const d = audio.duration
      if (d === 0 || !Number.isFinite(d)) runFailed('invalid_duration')
    }, { once: true })
    timeoutId = setTimeout(() => runFailed('playback_timeout'), PLAYBACK_MAX_MS)
    const p = audio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => tryWebAudioFallback('play_rejected'))
    }
  }

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
   */
  function preparePhrase(text, onReady, voiceIdOverride) {
    const cleaned = cleanTextForSpeech(text)
    if (!cleaned) {
      if (onReady) onReady()
      return
    }
    const provider = ttsProvider.value
    if (provider !== 'kokoro' || !kokoroAvailable) {
      if (onReady) onReady()
      return
    }
    const voiceId = (voiceIdOverride && String(voiceIdOverride).trim()) || (kokoroVoiceId.value?.trim() || 'af_nicole')
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
    w.postMessage({ type: 'generate', id, text: cleaned, voiceId })
  }

  /**
   * Speak text using browser speechSynthesis (used as fallback when Kokoro fails).
   */
  function speakWithBrowser(cleaned, onEnd) {
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
    const done = () => { if (onEnd) onEnd() }
    utterance.onend = done
    utterance.onerror = done
    window.speechSynthesis.speak(utterance)
  }

  /** Lazy-init TTS worker; handle blob/error responses. */
  function getTtsWorker() {
    if (!kokoroAvailable) return null
    if (ttsWorker) return ttsWorker
    try {
      ttsWorker = new Worker(new URL('../workers/tts.worker.js', import.meta.url), { type: 'module' })
      ttsWorker.onmessage = (ev) => {
        const d = ev.data
        if (d.type === 'ready') {
          kokoroReady.value = true
          kokoroModelLoading.value = false
          kokoroWarmupError.value = null
          return
        }
        if (d.type === 'error' && d.id == null) {
          kokoroModelLoading.value = false
          kokoroWarmupError.value = d.message || 'Voice model failed to load.'
          return
        }
        if (d.type === 'progress' && d.id != null) {
          ttsWorkerProgress.value = { id: d.id, status: d.status || 'running' }
          const pending = ttsPending.get(d.id)
          if (pending && pending.timeoutId != null) {
            clearTimeout(pending.timeoutId)
            pending.timeoutId = setTimeout(() => {
              if (ttsPending.has(d.id)) {
                ttsPending.delete(d.id)
                ttsWorkerProgress.value = { id: null, status: null }
                pending.resolve?.(null)
              }
            }, GENERATE_PHRASE_TIMEOUT_MS)
          }
          return
        }
        const pending = d?.id != null ? ttsPending.get(d.id) : null
        if (!pending) return
        ttsWorkerProgress.value = { id: null, status: null }
        if (pending.timeoutId != null) clearTimeout(pending.timeoutId)
        ttsPending.delete(d.id)
        if (pending.sentAt != null) {
          const elapsed = Date.now() - pending.sentAt
          if (elapsed > maxObservedTtsMs) maxObservedTtsMs = elapsed
        }
        if (d.type === 'blob' && d.blob) {
          if (pending.cancelled) {
            ttsPending.delete(d.id)
            if (pending.loadingRef) pending.loadingRef.value = false
            return
          }
          if (pending.cacheKey) testReplayCache[pending.cacheKey] = d.blob
          if (pending.resolve) {
            pending.onDetail?.({ phase: 'blob', size: d.blob.size })
            pending.resolve(d.blob)
            return
          } else {
            const fallback = pending.text ? (reason) => {
              pending.onPlaybackFailed?.(reason)
              pending.onSource?.('browser')
              speakWithBrowser(pending.text, pending.onEnd)
            } : undefined
            pending.onSource?.('kokoro')
            if (pending.onEnd) playBlob(d.blob, pending.onEnd, fallback)
          }
          if (pending.onReady) pending.onReady()
        } else if (d.type === 'error') {
          if (pending.cancelled) {
            ttsPending.delete(d.id)
            if (pending.loadingRef) pending.loadingRef.value = false
            return
          }
          if (pending.reject) {
            pending.onDetail?.({ phase: 'error', message: d.message || 'TTS error' })
          }
          pending.onSource?.('browser')
          if (pending.reject) {
            pending.reject(new Error(d.message || 'TTS error'))
          } else if (pending.text && pending.onEnd) {
            speakWithBrowser(pending.text, pending.onEnd)
          } else {
            if (pending.onEnd) pending.onEnd()
          }
          if (pending.onReady) pending.onReady()
        }
        if (pending.loadingRef) pending.loadingRef.value = false
      }
      ttsWorker.onerror = () => {
        kokoroModelLoading.value = false
        ttsPending.forEach((p) => {
          p.onSource?.('browser')
          if (p.text && p.onEnd) {
            speakWithBrowser(p.text, p.onEnd)
          } else if (p.onEnd) {
            p.onEnd()
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

  /**
   * Start loading the Kokoro model in the worker without generating speech.
   * Call this early (e.g. when the user enters guided setup) so the model
   * is ready by the time the first speak() call happens.
   */
  function warmupWorker() {
    if (!kokoroAvailable || kokoroReady.value) return
    kokoroWarmupError.value = null
    const w = getTtsWorker()
    if (w) {
      kokoroModelLoading.value = true
      w.postMessage({ type: 'warmup' })
    }
  }

  /**
   * Wait for the TTS worker (Kokoro model) to be ready before generating.
   * Call this at the start of cooking so generation uses the worker and has ample audio.
   * When Kokoro is not available, resolves immediately.
   */
  function waitForWorkerReady(timeoutMs = 120000) {
    if (!kokoroAvailable) return Promise.resolve()
    warmupWorker()
    if (kokoroReady.value) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        unwatch()
        reject(new Error('Voice model did not load in time. Try again or check that the Kokoro model is in public/models/.'))
      }, timeoutMs)
      const unwatch = watch(
        [kokoroReady, kokoroWarmupError],
        ([ready, warmupErr]) => {
          if (warmupErr) {
            clearTimeout(t)
            unwatch()
            reject(new Error(warmupErr))
            return
          }
          if (ready) {
            clearTimeout(t)
            unwatch()
            resolve()
          }
        },
        { immediate: true }
      )
    })
  }

  /**
   * Generate audio for one phrase and return the blob (or null for empty text).
   * Guided: static WAV when the line matches a shared cue, else Kokoro. Sensate: static WAV only (no Kokoro).
   * @param {string} text
   * @param {(ev: { phase: string, size?: number, message?: string, textSnippet?: string }) => void} [onDetail] - optional callback for dev log (request/blob/error/timeout)
   */
  async function generatePhraseToBlob(text, onDetail, voiceIdOverride, staticPresetKind = 'guided', phraseIdOverride = null) {
    const cleaned = cleanTextForSpeech(text)
    if (!cleaned) return null
    const voiceId = (voiceIdOverride && String(voiceIdOverride).trim()) || (kokoroVoiceId.value?.trim() || 'af_nicole')

  const phraseId =
      (phraseIdOverride && getStaticPhraseIdById(phraseIdOverride)) ||
      getStaticPhraseIdForText(cleaned, { staticPresetKind })
    if (phraseId && voiceId) {
      try {
        const res = await fetch(getStaticAudioUrl(phraseId, voiceId))
        if (res.ok) {
          const buf = await res.arrayBuffer()
          onDetail?.({ phase: 'static', size: buf.byteLength })
          return new Blob([buf], { type: 'audio/wav' })
        }
      } catch (_) {}
    }

    // Sensate sessions use shipped static WAVs only (no Kokoro generation for script audio).
    if (staticPresetKind === 'sensate') {
      onDetail?.({ phase: 'sensate_static_missing' })
      return null
    }

    const provider = ttsProvider.value
    if (provider !== 'kokoro') return null

    const w = kokoroAvailable ? getTtsWorker() : null
    if (!w) return null
    let ipa
    try {
      const phonemize = await getPhonemize()
      ipa = await phonemize(cleaned)
    } catch (err) {
      if (import.meta.env?.DEV) console.warn('[TTS] Phonemize failed:', err)
      return null
    }
    if (!ipa || typeof ipa !== 'string' || !ipa.trim()) return null
    const textSnippet = cleaned.slice(0, 50) + (cleaned.length > 50 ? '…' : '')
    return new Promise((resolve, reject) => {
      const id = `tts-${++ttsNextId}-${Date.now()}`
      onDetail?.({ phase: 'request', textSnippet })
      const timeoutId = setTimeout(() => {
        const pending = ttsPending.get(id)
        if (pending) {
          pending.onDetail?.({ phase: 'timeout', message: 'Worker did not respond in time' })
          ttsPending.delete(id)
          ttsWorkerProgress.value = { id: null, status: null }
          resolve(null)
        }
      }, GENERATE_PHRASE_TIMEOUT_MS)
      ttsPending.set(id, {
        resolve: (blob) => {
          clearTimeout(timeoutId)
          ttsPending.delete(id)
          resolve(blob)
        },
        reject: (err) => {
          clearTimeout(timeoutId)
          ttsPending.delete(id)
          reject(err)
        },
        timeoutId,
        onDetail,
      })
      w.postMessage({ type: 'generate', id, phonemizedIpa: ipa, voiceId })
    })
  }

  /**
   * Generate audio for a full session script (sequential). Calls onProgress(current, total) and returns Blob[].
   * Optional onPhraseDetail(phraseIndex, event) is called for each phrase with worker/static detail for the dev log.
   * Empty phrases yield null in the array; playback should skip null (call onEnd immediately).
   * Local-first: in-browser Kokoro worker when `kokoroAvailable`; otherwise guided audio cannot be generated server-side — use Browser voices in preferences.
   * Sensate: only fetches static WAVs (no Kokoro); missing files yield null blobs.
   */
  async function generateSessionAudio(phrases, onProgress, onPhraseDetail, genOptions = {}) {
    if (!Array.isArray(phrases)) return []
    const total = phrases.length
    const voiceId = (genOptions.voiceId && String(genOptions.voiceId).trim()) || (kokoroVoiceId.value?.trim() || 'af_nicole')
    const staticPresetKind = genOptions.staticPresetKind === 'sensate' ? 'sensate' : 'guided'

    if (!kokoroAvailable && staticPresetKind !== 'sensate') {
      throw new Error('Guided voice on this device: switch to Browser voices in Preferences (☰ → Voice) to hear prompts, or use another browser where Kokoro runs in the app.')
    }

    const blobs = []
    for (let i = 0; i < total; i++) {
      const detailCb = onPhraseDetail ? (ev) => onPhraseDetail(i, ev) : undefined
      const blob = await generatePhraseToBlob(phrases[i], detailCb, voiceId, staticPresetKind)
      blobs.push(blob)
      if (onProgress) onProgress(i + 1, total)
      if (i < total - 1) {
        await new Promise((r) => setTimeout(r, 150))
      }
    }
    return blobs
  }

  /**
   * Kokoro-JS (Node) cannot synthesize voice id `af`; we ship static WAVs under af_nicole only.
   * Browser live TTS still uses /voices/af.bin for "Default (F)".
   */
  function staticVoiceDirForUrl(voiceId) {
    const v = voiceId && String(voiceId).trim()
    if (!v) return null
    if (v === 'af') return 'af_nicole'
    return v
  }

  /**
   * URL for a pre-generated static WAV (e.g. /audio/static/af_nicole/voice_test.wav).
   * Caller should fetch and play; if 404, fall back to TTS.
   */
  function getStaticAudioUrl(phraseId, voiceId) {
    if (!phraseId || !voiceId) return null
    const dir = staticVoiceDirForUrl(voiceId)
    if (!dir) return null
    return publicPath(`/audio/static/${dir}/${phraseId}.wav`)
  }

  /** Stop HTML audio, Web Audio buffer, browser speech, and cancel in-flight Kokoro jobs without invoking phrase onEnd (Pause / new line replaces old). */
  function cancelPlaybackAndSpeechPending() {
    if (currentWebAudioSource) {
      try {
        currentWebAudioSource.stop()
      } catch (_) {}
      currentWebAudioSource = null
    }
    if (currentExternalAudio) {
      currentExternalAudio.onended = null
      currentExternalAudio.onerror = null
      currentExternalAudio.pause()
      currentExternalAudio.src = ''
      currentExternalAudio = null
    }
    if (isSupported()) window.speechSynthesis.cancel()
    ttsPending.forEach((p) => {
      if (p.timeoutId != null) clearTimeout(p.timeoutId)
      if (p.loadingRef) p.loadingRef.value = false
      p.cancelled = true
      if (typeof p.resolve === 'function') {
        try {
          p.resolve(null)
        } catch (_) {}
      } else if (typeof p.onReady === 'function' && typeof p.onEnd !== 'function') {
        try {
          p.onReady()
        } catch (_) {}
      }
    })
    ttsPending.clear()
  }

  function speak(text, options = {}) {
    const {
      force = false,
      onEnd,
      cacheForReplay = false,
      forceTtsMode,
      onSource,
      onPlaybackFailed,
      voiceId: voiceIdOption,
      staticPresetKind = 'guided',
      phraseId: phraseIdOption,
    } = options
    if (!force && !voiceEnabled.value) {
      if (onEnd) onEnd()
      return
    }
    const cleaned = cleanTextForSpeech(text)
    const provider = ttsProvider.value
    const w = provider === 'kokoro' && kokoroAvailable ? getTtsWorker() : null
    if (!cleaned) {
      if (onEnd) onEnd()
      return
    }
    speakGeneration += 1
    const myGeneration = speakGeneration
    cancelPlaybackAndSpeechPending()
    const baseVoiceId = provider === 'kokoro' ? (kokoroVoiceId.value?.trim() || 'af_nicole') : (kokoroVoiceId.value?.trim() || DEFAULT_STATIC_VOICE_ID)
    const voiceId = (voiceIdOption && String(voiceIdOption).trim()) || baseVoiceId
    const cacheKey = voiceId ? `${provider}:${voiceId}:${cleaned}` : null
    if (cacheKey && testReplayCache[cacheKey]) {
      window.speechSynthesis?.cancel?.()
      onSource?.('kokoro')
      playBlob(testReplayCache[cacheKey], onEnd, (reason) => {
        if (myGeneration !== speakGeneration) return
        onPlaybackFailed?.(reason)
        speakWithBrowser(cleaned, onEnd)
      })
      return
    }
    // Prefer pre-generated static WAV when this phrase has one (sensate preset lines only try static in sensate sessions)
    const phraseId =
      (phraseIdOption && getStaticPhraseIdById(phraseIdOption)) ||
      getStaticPhraseIdForText(cleaned, { staticPresetKind })
    if (phraseId && voiceId) {
      fetch(getStaticAudioUrl(phraseId, voiceId))
        .then((res) => (res.ok ? res.arrayBuffer().then((buf) => new Blob([buf], { type: 'audio/wav' })) : null))
        .then((blob) => {
          if (myGeneration !== speakGeneration) return
          if (blob) {
            window.speechSynthesis?.cancel?.()
            onSource?.('kokoro')
            playBlob(blob, onEnd, (reason) => {
              if (myGeneration !== speakGeneration) return
              onPlaybackFailed?.(reason)
              speakWithBrowser(cleaned, onEnd)
            })
            return
          }
          if (staticPresetKind === 'sensate') {
            if (onEnd) onEnd()
            return
          }
          proceedWithTts()
        })
        .catch(() => {
          if (myGeneration !== speakGeneration) return
          if (staticPresetKind === 'sensate') {
            if (onEnd) onEnd()
            return
          }
          proceedWithTts()
        })
      return
    }
    proceedWithTts()

    function proceedWithTts() {
    const KOKORO_GENERATE_TIMEOUT_MS = 45000
    const forceMode = options.forceTtsMode
    if (forceMode === 'browser') {
      onSource?.('browser')
      speakWithBrowser(cleaned, onEnd)
      return
    }
    function tryWorkerOrBrowser() {
      if (w) {
        sendKokoroGenerate(true)
        return
      }
      onSource?.('browser')
      speakWithBrowser(cleaned, onEnd)
    }
    /** @param {boolean} [useTextOnly] - if true, send text to worker (worker does phonemize+tokenize+ONNX); no server, no main-thread phonemize */
    function sendKokoroGenerate(useTextOnly = false) {
      if (!w) return
      window.speechSynthesis?.cancel?.()
      waitingForKokoroReady.value = false
      const id = `tts-${++ttsNextId}-${Date.now()}`
      const sentAt = Date.now()
      kokoroModelLoading.value = true
      const timeoutId = setTimeout(() => {
        const pending = ttsPending.get(id)
        if (!pending) return
        if (pending.timeoutId != null) clearTimeout(pending.timeoutId)
        pending.cancelled = true
        if (pending.loadingRef) pending.loadingRef.value = false
        pending.onSource?.('browser')
        if (pending.text && pending.onEnd) speakWithBrowser(pending.text, pending.onEnd)
        else if (pending.onEnd) pending.onEnd()
      }, KOKORO_GENERATE_TIMEOUT_MS)
      ttsPending.set(id, {
        cacheKey,
        text: cleaned,
        onEnd,
        onSource,
        onPlaybackFailed,
        sentAt,
        loadingRef: kokoroModelLoading,
        timeoutId,
      })
      if (useTextOnly) {
        w.postMessage({ type: 'generate', id, text: cleaned, voiceId })
        return
      }
      ;(async () => {
        try {
          const phonemize = await getPhonemize()
          const ipa = await phonemize(cleaned)
          if (ipa && typeof ipa === 'string' && ipa.trim())
            w.postMessage({ type: 'generate', id, phonemizedIpa: ipa, voiceId })
          else throw new Error('Empty IPA from phonemize')
        } catch (err) {
          if (import.meta.env?.DEV) console.warn('[TTS] Phonemize failed:', err)
          const pending = ttsPending.get(id)
          if (pending) {
            ttsPending.delete(id)
            if (pending.timeoutId != null) clearTimeout(pending.timeoutId)
            if (pending.loadingRef) pending.loadingRef.value = false
            pending.onSource?.('browser')
            if (pending.text && pending.onEnd) speakWithBrowser(pending.text, pending.onEnd)
            else if (pending.onEnd) pending.onEnd()
          }
        }
      })()
    }
    if (provider === 'kokoro' && kokoroAvailable) {
      if (forceMode === 'fullyLocal' && w) {
        sendKokoroGenerate(true)
        return
      }
      // When worker is unavailable (e.g. mobile WebView), or not fullyLocal, try server then browser
      tryWorkerOrBrowser()
      return
    }
    onSource?.('browser')
    speakWithBrowser(cleaned, onEnd)
    }
  }

  function stop() {
    waitingForKokoroReady.value = false
    if (waitForReadyUnwatch) {
      waitForReadyUnwatch()
      waitForReadyUnwatch = null
    }
    speakGeneration += 1
    cancelPlaybackAndSpeechPending()
  }

  async function getEdgeVoices() {
    return []
  }

  /** Voice list is hardcoded -- no model load needed. */
  function getKokoroVoices() {
    return Promise.resolve(kokoroVoicesList.value)
  }

  function getRecommendedVoices(languagePreference = 'en-US', genderPreference = 'any') {
    const recs = []
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
    const enKokoro = ALL_KOKORO_VOICES.filter((v) => v.lang === 'en' || v.lang === 'en-GB')
    for (const v of enKokoro.slice(0, 4)) {
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
    whenIdle(loadVoicesLater, { timeout: 500 })
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

  const selectedVoiceKey = computed(() => {
    if (ttsProvider.value === 'kokoro') {
      const id = kokoroVoiceId.value?.trim() || ''
      return id ? `kokoro:${id}` : ''
    }
    const uri = selectedVoiceURI.value || ''
    return uri ? `browser:${uri}` : ''
  })

  const isVoiceReadyForGuided = computed(() => {
    if (ttsProvider.value === 'kokoro' && kokoroAvailable) return kokoroReady.value
    if (ttsProvider.value === 'kokoro' && !kokoroAvailable) return false
    return true
  })

  function setVoiceByKey(key) {
    if (!key || typeof key !== 'string') return
    if (key.startsWith('kokoro:')) {
      const id = key.slice(7).trim()
      ttsProvider.value = 'kokoro'
      kokoroVoiceId.value = id
      return
    }
    if (key.startsWith('browser:')) {
      const uri = key.slice(8).trim()
      ttsProvider.value = 'browser'
      selectedVoiceURI.value = uri
    }
  }

  /** Sync voice refs from localStorage after persistence load so "Enable voice No" and other prefs match saved state. */
  function syncVoiceFromStorage() {
    voiceEnabled.value = readLS('voiceEnabled', 'true') === 'true'
    const r = parseFloat(readLS('voiceRate', '1'))
    if (!isNaN(r) && r >= 0.5 && r <= 2) voiceRate.value = r
  }

  return {
    voiceEnabled,
    voiceRate,
    selectedVoiceURI,
    voices,
    ttsProvider,
    kokoroVoiceId,
    kokoroVoicesList,
    kokoroVoicesListForLocale,
    kokoroModelLoading,
    kokoroReady,
    kokoroWarmupError,
    ttsWorkerProgress,
    waitingForKokoroReady,
    kokoroAvailable,
    isSupported,
    canSpeak,
    cleanTextForSpeech,
    getVoicesList,
    getBrowserVoicesCurrentLang,
    browserVoicesCurrentLang,
    getSelectedVoice,
    pickVoice,
    speak,
    stop,
    refreshVoices,
    getKokoroVoices,
    getEdgeVoices,
    preparePhrase,
    warmupWorker,
    waitForWorkerReady,
    estimateTtsMs,
    getRecommendedVoices,
    selectedVoiceKey,
    setVoiceByKey,
    isVoiceReadyForGuided,
    syncVoiceFromStorage,
    playBlob,
    unlockAudio,
    generateSessionAudio,
    getStaticAudioUrl,
  }
}
