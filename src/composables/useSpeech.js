import { ref, computed, onMounted, watch } from 'vue'
import { whenIdle } from '@/utils/whenIdle'
import { isWebKit } from '@/utils/platform'

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
/** True when Kokoro is selected but model not ready yet; we are waiting before sending generate (UI can show "voice not downloaded yet"). */
const waitingForKokoroReady = ref(false)

let settingsInitialized = false
let currentExternalAudio = null
let testReplayCache = {}

/** Web Worker for TTS generation (Kokoro) so the main thread stays responsive. */
let ttsWorker = null
const ttsPending = new Map()
let ttsNextId = 0
/** Unwatch for kokoroReady when we're waiting to send generate; cleared in stop() so we don't send after stop. */
let waitForReadyUnwatch = null

/** Observed max generation time (ms); used to refine estimates. */
let maxObservedTtsMs = 0

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

/** Whether Kokoro is available on this browser (not Safari/WebKit). */
const kokoroAvailable = !isWebKit()

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

  function playBlob(blob, onEnd) {
    // #region agent log
    fetch('http://127.0.0.1:7438/ingest/461d4f2b-c676-45af-9ce9-5f6fef50933e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0bbe15'},body:JSON.stringify({sessionId:'0bbe15',location:'useSpeech.js:playBlob',message:'playing Kokoro blob',data:{blobSize:blob?.size},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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
  function preparePhrase(text, onReady) {
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
    const voiceId = kokoroVoiceId.value?.trim() || 'af_nicole'
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
    // #region agent log
    fetch('http://127.0.0.1:7438/ingest/461d4f2b-c676-45af-9ce9-5f6fef50933e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0bbe15'},body:JSON.stringify({sessionId:'0bbe15',location:'useSpeech.js:speakWithBrowser',message:'speaking with browser',data:{cleanedLen:cleaned?.length,supported:isSupported()},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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
        // #region agent log
        if (d.type === 'blob' || d.type === 'error') fetch('http://127.0.0.1:7438/ingest/461d4f2b-c676-45af-9ce9-5f6fef50933e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0bbe15'},body:JSON.stringify({sessionId:'0bbe15',location:'useSpeech.js:workerOnMessage',message:'worker response',data:{type:d.type,id:d.id},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        if (d.type === 'ready') {
          kokoroReady.value = true
          kokoroModelLoading.value = false
          return
        }
        const pending = d?.id != null ? ttsPending.get(d.id) : null
        if (!pending) return
        if (pending.timeoutId != null) clearTimeout(pending.timeoutId)
        ttsPending.delete(d.id)
        if (pending.sentAt != null) {
          const elapsed = Date.now() - pending.sentAt
          if (elapsed > maxObservedTtsMs) maxObservedTtsMs = elapsed
        }
        if (d.type === 'blob' && d.blob) {
          if (pending.cacheKey) testReplayCache[pending.cacheKey] = d.blob
          if (pending.resolve) {
            pending.resolve(d.blob)
            return
          } else {
            if (pending.onEnd) playBlob(d.blob, pending.onEnd)
          }
          if (pending.onReady) pending.onReady()
        } else if (d.type === 'error') {
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
    const w = getTtsWorker()
    if (w) {
      kokoroModelLoading.value = true
      w.postMessage({ type: 'warmup' })
    }
  }

  /**
   * Generate audio for one phrase and return the blob (or null for empty text).
   * Used by generateSessionAudio. Resolves with null if text is empty or Kokoro unavailable.
   */
  function generatePhraseToBlob(text) {
    const cleaned = cleanTextForSpeech(text)
    if (!cleaned) return Promise.resolve(null)
    const provider = ttsProvider.value
    const w = provider === 'kokoro' && kokoroAvailable ? getTtsWorker() : null
    if (!w) return Promise.resolve(null)
    const voiceId = kokoroVoiceId.value?.trim() || 'af_nicole'
    return new Promise((resolve, reject) => {
      const id = `tts-${++ttsNextId}-${Date.now()}`
      const timeoutId = setTimeout(() => {
        if (ttsPending.has(id)) {
          ttsPending.delete(id)
          resolve(null)
        }
      }, 45000)
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
      })
      w.postMessage({ type: 'generate', id, text: cleaned, voiceId })
    })
  }

  /**
   * Generate audio for a full session script (sequential). Calls onProgress(current, total) and returns Blob[].
   * Empty phrases yield null in the array; playback should skip null (call onEnd immediately).
   */
  async function generateSessionAudio(phrases, onProgress) {
    const total = phrases.length
    const blobs = []
    for (let i = 0; i < total; i++) {
      const blob = await generatePhraseToBlob(phrases[i])
      blobs.push(blob)
      if (onProgress) onProgress(i + 1, total)
    }
    return blobs
  }

  function speak(text, options = {}) {
    const { force = false, onEnd, cacheForReplay = false } = options
    if (!force && !voiceEnabled.value) {
      if (onEnd) onEnd()
      return
    }
    const cleaned = cleanTextForSpeech(text)
    const provider = ttsProvider.value
    const w = provider === 'kokoro' && kokoroAvailable ? getTtsWorker() : null
    const branch = !cleaned ? 'empty' : (provider === 'kokoro' && w ? 'kokoro' : 'browser')
    // #region agent log
    fetch('http://127.0.0.1:7438/ingest/461d4f2b-c676-45af-9ce9-5f6fef50933e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0bbe15'},body:JSON.stringify({sessionId:'0bbe15',location:'useSpeech.js:speak',message:'speak entry',data:{force,voiceEnabled:voiceEnabled.value,cleanedLen:cleaned?.length,provider,branch},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (!cleaned) {
      if (onEnd) onEnd()
      return
    }
    const voiceId = provider === 'kokoro' ? (kokoroVoiceId.value?.trim() || 'af_nicole') : ''
    const cacheKey = voiceId ? `${provider}:${voiceId}:${cleaned}` : null
    if (cacheKey && testReplayCache[cacheKey]) {
      window.speechSynthesis?.cancel?.()
      playBlob(testReplayCache[cacheKey], onEnd)
      return
    }
    // Kokoro: do not fall back to browser; wait for model ready then send generate (UI shows "voice not downloaded yet" while waiting)
    const KOKORO_GENERATE_TIMEOUT_MS = 45000
    function sendKokoroGenerate() {
      if (!w) return
      window.speechSynthesis?.cancel?.()
      waitingForKokoroReady.value = false
      const id = `tts-${++ttsNextId}-${Date.now()}`
      const sentAt = Date.now()
      kokoroModelLoading.value = true
      const timeoutId = setTimeout(() => {
        const pending = ttsPending.get(id)
        if (!pending) return
        ttsPending.delete(id)
        if (pending.loadingRef) pending.loadingRef.value = false
        if (pending.onEnd) pending.onEnd()
      }, KOKORO_GENERATE_TIMEOUT_MS)
      ttsPending.set(id, {
        cacheKey,
        text: cleaned,
        onEnd,
        sentAt,
        loadingRef: kokoroModelLoading,
        timeoutId,
      })
      w.postMessage({ type: 'generate', id, text: cleaned, voiceId })
    }
    if (provider === 'kokoro' && kokoroAvailable && w) {
      if (!kokoroReady.value) {
        waitingForKokoroReady.value = true
        if (waitForReadyUnwatch) waitForReadyUnwatch()
        waitForReadyUnwatch = watch(
          () => kokoroReady.value,
          (ready) => {
            if (!ready) return
            if (waitForReadyUnwatch) {
              waitForReadyUnwatch()
              waitForReadyUnwatch = null
            }
            sendKokoroGenerate()
          },
          { immediate: true }
        )
        return
      }
      sendKokoroGenerate()
      return
    }
    speakWithBrowser(cleaned, onEnd)
  }

  function stop() {
    waitingForKokoroReady.value = false
    if (waitForReadyUnwatch) {
      waitForReadyUnwatch()
      waitForReadyUnwatch = null
    }
    if (currentExternalAudio) {
      currentExternalAudio.onended = null
      currentExternalAudio.onerror = null
      currentExternalAudio.pause()
      currentExternalAudio.src = ''
      currentExternalAudio = null
    }
    if (isSupported()) window.speechSynthesis.cancel()
    // Clear pending Kokoro requests so late-arriving blobs don't play and UI (e.g. testVoicePlaying) gets onEnd
    ttsPending.forEach((p) => {
      if (p.timeoutId != null) clearTimeout(p.timeoutId)
      if (p.loadingRef) p.loadingRef.value = false
      if (p.onEnd) p.onEnd()
    })
    ttsPending.clear()
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
    kokoroModelLoading,
    kokoroReady,
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
    estimateTtsMs,
    getRecommendedVoices,
    selectedVoiceKey,
    setVoiceByKey,
    isVoiceReadyForGuided,
    syncVoiceFromStorage,
    playBlob,
    generateSessionAudio,
  }
}
