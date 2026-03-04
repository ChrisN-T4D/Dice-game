/**
 * TTS Web Worker: runs Kokoro generation with onnxruntime-web only (Safari-compatible).
 * Model loads lazily from /models/Kokoro-82M-v1.0-ONNX/.
 *
 * Message protocol:
 *   In:  { type: 'warmup' }              – pre-load model, no generation
 *        { type: 'generate', id, text, voiceId }
 *   Out: { type: 'ready' }               – model loaded (response to warmup)
 *        { type: 'progress', id, status } – status: 'started' | 'running'
 *        { type: 'blob', id, blob }
 *        { type: 'error', id, message }
 */

const KOKORO_LOAD_TIMEOUT_MS = 5 * 60 * 1000
const KOKORO_MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const MODEL_CONFIG_URL = `/models/${KOKORO_MODEL_ID}/config.json`
const MODEL_ONNX_URL = `/models/${KOKORO_MODEL_ID}/onnx/model_quantized.onnx`
const MODEL_VOICE_URL = `/models/${KOKORO_MODEL_ID}/voices/af_nicole.bin`

/** Max pending generate requests; keeps memory and backlog under control (e.g. for iOS). */
const MAX_QUEUE_SIZE = 3
/** Max character length for text or IPA per request to avoid huge allocations. */
const MAX_TEXT_IPA_LENGTH = 4000
/** Max token IDs per request (model context is 512; 4 chunks = 2040 tokens). */
const MAX_TOKEN_IDS = 2048

let loadPromise = null
let loadFailed = false
let loadFailureMessage = 'Kokoro model failed to load'

const queue = []
let processing = false

const MODEL_NOT_FOUND_HINT =
  'Put the Kokoro model in public/models/ and run: npm run download-kokoro-model. If using a static host, ensure /models/* is not served as the app index (no SPA fallback for /models/).'

import { cachedFetch } from '../tts/kokoroOrt/cachedFetch.js'

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label || 'Load'} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

function isHtmlAsJsonError(err) {
  const msg = err && typeof err === 'object' ? (err.message || String(err)) : String(err)
  return (
    (msg.includes("Unexpected token '<'") || msg.includes('<!DOCTYPE') || msg.includes('<!doctype')) &&
    (msg.includes('JSON') || msg.includes('parse') || msg.includes('valid'))
  )
}

function normalizeLoadError(err) {
  const raw = err?.message || String(err)
  if (isHtmlAsJsonError(err) || raw.includes("Unexpected token '<'")) {
    return `Model files not found or server returned the app page instead of model files. ${MODEL_NOT_FOUND_HINT}`
  }
  if (raw.includes('404') || raw.includes('not found') || raw.includes('Could not locate')) {
    return `Kokoro model not found at /models/${KOKORO_MODEL_ID}. ${MODEL_NOT_FOUND_HINT}`
  }
  return raw
}

async function checkModelUrl() {
  const res = await cachedFetch(MODEL_CONFIG_URL)
  if (!res.ok) {
    throw new Error(`Model config returned ${res.status}. ${MODEL_NOT_FOUND_HINT}`)
  }
  const text = await res.text()
  const looksLikeHtml =
    typeof text === 'string' &&
    (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html'))
  if (looksLikeHtml) {
    throw new Error(`Server returned HTML instead of model config (SPA fallback?). ${MODEL_NOT_FOUND_HINT}`)
  }
  try {
    JSON.parse(text)
  } catch (e) {
    throw new Error(`Model config at ${MODEL_CONFIG_URL} is not valid JSON. ${MODEL_NOT_FOUND_HINT}`)
  }
}

async function checkModelFilesExist() {
  const [configOk, onnxRes, voiceRes] = await Promise.all([
    fetch(MODEL_CONFIG_URL, { method: 'HEAD' }).then((r) => r.ok).catch(() => false),
    fetch(MODEL_ONNX_URL, { method: 'HEAD' }).then((r) => r.ok).catch(() => false),
    fetch(MODEL_VOICE_URL, { method: 'HEAD' }).then((r) => r.ok).catch(() => false),
  ])
  if (!configOk) {
    throw new Error(`Model config not found. ${MODEL_NOT_FOUND_HINT}`)
  }
  if (!onnxRes) {
    throw new Error(
      `Kokoro ONNX model file not found at ${MODEL_ONNX_URL}. Run: npm run download-kokoro-model (this downloads the full model including onnx/ and voices/).`
    )
  }
  if (!voiceRes) {
    throw new Error(
      `Kokoro voice files not found (e.g. ${MODEL_VOICE_URL}). Run: npm run download-kokoro-model to download all voice .bin files.`
    )
  }
}

function ensureKokoroLoaded() {
  if (loadFailed) return Promise.reject(new Error(loadFailureMessage))
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    await checkModelUrl()
    await checkModelFilesExist()
    const { loadKokoroOrt } = await import('../tts/kokoroOrt/index.js')
    try {
      await withTimeout(loadKokoroOrt(), KOKORO_LOAD_TIMEOUT_MS, 'Kokoro model')
    } catch (e) {
      throw new Error(normalizeLoadError(e))
    }
  })()
  loadPromise.catch((e) => {
    loadFailed = true
    loadFailureMessage = normalizeLoadError(e)
  })
  return loadPromise
}

async function runKokoro(text, voiceId) {
  await ensureKokoroLoaded()
  const { generate } = await import('../tts/kokoroOrt/index.js')
  const voice = voiceId || 'af_nicole'
  const blob = await generate(text, { voice })
  if (!blob || !(blob instanceof Blob) || blob.size < 100) {
    throw new Error('Kokoro produced empty or invalid audio. Ensure the model and voice files are fully downloaded.')
  }
  return blob
}

async function runKokoroFromIpa(phonemizedIpa, voiceId) {
  await ensureKokoroLoaded()
  const { generateFromIpa } = await import('../tts/kokoroOrt/index.js')
  const voice = voiceId || 'af_nicole'
  const blob = await generateFromIpa(phonemizedIpa, { voice })
  if (!blob || !(blob instanceof Blob) || blob.size < 100) {
    throw new Error('Kokoro produced empty or invalid audio from IPA.')
  }
  return blob
}

async function runKokoroFromTokenIds(tokenIds, voiceId) {
  await ensureKokoroLoaded()
  const { generateFromTokenIds } = await import('../tts/kokoroOrt/index.js')
  const voice = voiceId || 'af_nicole'
  const blob = await generateFromTokenIds(tokenIds, { voice })
  if (!blob || !(blob instanceof Blob) || blob.size < 100) {
    throw new Error('Kokoro produced empty or invalid audio from token IDs.')
  }
  return blob
}

function checkInputLimits(msg) {
  const { id, text, phonemizedIpa, tokenIds } = msg
  if (tokenIds != null && Array.isArray(tokenIds)) {
    if (tokenIds.length > MAX_TOKEN_IDS) {
      return `Request too long: ${tokenIds.length} tokens (max ${MAX_TOKEN_IDS}). Split into shorter phrases.`
    }
  } else if (phonemizedIpa != null && typeof phonemizedIpa === 'string' && phonemizedIpa.length > MAX_TEXT_IPA_LENGTH) {
    return `Request too long: ${phonemizedIpa.length} characters (max ${MAX_TEXT_IPA_LENGTH}).`
  } else if (text != null && typeof text === 'string' && text.length > MAX_TEXT_IPA_LENGTH) {
    return `Request too long: ${text.length} characters (max ${MAX_TEXT_IPA_LENGTH}).`
  }
  return null
}

async function processOne(msg) {
  const { id, text, phonemizedIpa, tokenIds, voiceId } = msg
  self.postMessage({ type: 'progress', id, status: 'started' })
  const limitErr = checkInputLimits(msg)
  if (limitErr) {
    self.postMessage({ type: 'error', id, message: limitErr })
    return
  }
  try {
    let blob
    self.postMessage({ type: 'progress', id, status: 'running' })
    if (tokenIds != null && Array.isArray(tokenIds) && tokenIds.length > 0) {
      if (import.meta.env?.DEV) {
        console.log('[TTS worker] Generating from tokenIds, count=%d, first5=%o', tokenIds.length, tokenIds.slice(0, 5))
      }
      blob = await runKokoroFromTokenIds(tokenIds, voiceId || 'af_nicole')
    } else if (phonemizedIpa != null && phonemizedIpa !== '') {
      blob = await runKokoroFromIpa(phonemizedIpa, voiceId || 'af_nicole')
    } else {
      blob = await runKokoro(text, voiceId || 'af_nicole')
    }
    if (blob) self.postMessage({ type: 'blob', id, blob })
    else self.postMessage({ type: 'error', id, message: 'No audio generated' })
  } catch (e) {
    const message = e?.message ? normalizeLoadError(e) : String(e)
    self.postMessage({ type: 'error', id, message })
  }
}

function drain() {
  if (processing || queue.length === 0) return
  processing = true
  const msg = queue.shift()
  processOne(msg).finally(() => {
    processing = false
    drain()
  })
}

self.onmessage = (ev) => {
  const data = ev.data
  if (data?.type === 'warmup') {
    ensureKokoroLoaded()
      .then(() => self.postMessage({ type: 'ready' }))
      .catch((e) =>
        self.postMessage({
          type: 'error',
          id: null,
          message: e?.message ? normalizeLoadError(e) : String(e),
        })
      )
    return
  }
  if (data?.type === 'generate') {
    if (queue.length >= MAX_QUEUE_SIZE) {
      self.postMessage({
        type: 'error',
        id: data.id ?? null,
        message: `TTS queue full (max ${MAX_QUEUE_SIZE}). Please wait and try again.`,
      })
      return
    }
    queue.push(data)
    drain()
  }
}

self.addEventListener('unhandledrejection', (event) => {
  event.preventDefault()
  const err = event.reason
  let message = (err && typeof err === 'object' && err.message) ? String(err.message) : String(err)
  if (err && typeof err === 'object') message = normalizeLoadError(err)
  if (queue.length > 0) {
    const msg = queue.shift()
    if (msg && msg.id != null) self.postMessage({ type: 'error', id: msg.id, message })
  }
  processing = false
  drain()
})
