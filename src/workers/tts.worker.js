/**
 * TTS Web Worker: runs Kokoro generation with onnxruntime-web only (Safari-compatible).
 * Model loads lazily from /models/Kokoro-82M-v1.0-ONNX/.
 *
 * Message protocol:
 *   In:  { type: 'warmup' }              – pre-load model, no generation
 *        { type: 'generate', id, text, voiceId }
 *   Out: { type: 'ready' }               – model loaded (response to warmup)
 *        { type: 'blob', id, blob }
 *        { type: 'error', id, message }
 */

const KOKORO_LOAD_TIMEOUT_MS = 5 * 60 * 1000
const KOKORO_MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const MODEL_CONFIG_URL = `/models/${KOKORO_MODEL_ID}/config.json`
const MODEL_ONNX_URL = `/models/${KOKORO_MODEL_ID}/onnx/model_quantized.onnx`
const MODEL_VOICE_URL = `/models/${KOKORO_MODEL_ID}/voices/af_nicole.bin`

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

async function processOne(msg) {
  const { id, text, voiceId } = msg
  try {
    const blob = await runKokoro(text, voiceId || 'af_nicole')
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
