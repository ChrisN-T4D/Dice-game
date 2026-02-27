/**
 * TTS Web Worker: runs Kokoro generation off the main thread.
 * Model loads lazily on first generate from /models/ (your server).
 *
 * Message protocol:
 *   In:  { type: 'warmup' }              – pre-load model, no generation
 *         { type: 'generate', id, text, voiceId }
 *   Out: { type: 'ready' }               – model loaded (response to warmup)
 *         { type: 'blob', id, blob }
 *         { type: 'error', id, message }
 */

const KOKORO_LOAD_TIMEOUT_MS = 5 * 60 * 1000
const KOKORO_MODEL_ID = 'Kokoro-82M-v1.0-ONNX'

let kokoroTTS = null
let loadPromise = null
let loadFailed = false

const queue = []
let processing = false

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label || 'Load'} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

function ensureKokoroLoaded() {
  if (kokoroTTS) return Promise.resolve()
  if (loadFailed) return Promise.reject(new Error('Kokoro model failed to load'))
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const { env } = await import('@huggingface/transformers')
    env.allowLocalModels = true
    env.allowRemoteModels = false
    env.localModelPath = '/models/'
    const { KokoroTTS } = await import('kokoro-js')
    kokoroTTS = await withTimeout(
      KokoroTTS.from_pretrained(KOKORO_MODEL_ID, { dtype: 'q8', device: 'wasm' }),
      KOKORO_LOAD_TIMEOUT_MS,
      'Kokoro model'
    )
  })()
  loadPromise.catch(() => { loadFailed = true })
  return loadPromise
}

async function runKokoro(text, voiceId) {
  await ensureKokoroLoaded()
  const voice = voiceId || 'af_heart'
  const audio = await kokoroTTS.generate(text, { voice })
  if (audio && typeof audio.toBlob === 'function') return audio.toBlob()
  return null
}

async function processOne(msg) {
  const { id, text, voiceId } = msg
  try {
    const blob = await runKokoro(text, voiceId || 'af_heart')
    if (blob) self.postMessage({ type: 'blob', id, blob })
    else self.postMessage({ type: 'error', id, message: 'No audio generated' })
  } catch (e) {
    self.postMessage({ type: 'error', id, message: e?.message || String(e) })
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
      .catch((e) => self.postMessage({ type: 'error', id: null, message: e?.message || String(e) }))
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
  const message = (err && typeof err === 'object' && err.message) ? String(err.message) : String(err)
  if (queue.length > 0) {
    const msg = queue.shift()
    if (msg && msg.id != null) self.postMessage({ type: 'error', id: msg.id, message })
  }
  processing = false
  drain()
})
