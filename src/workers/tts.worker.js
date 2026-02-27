/**
 * TTS Web Worker: runs Kokoro generation off the main thread.
 * Single model load here so Kokoro is only downloaded once for all voices.
 * Message protocol:
 *   In:  { type: 'generate', id, text, provider, voiceId } | { type: 'getVoices', id }
 *   Out: { type: 'blob', id, blob } | { type: 'error', id, message } | { type: 'voices', id, voices }
 */

const KOKORO_LOAD_TIMEOUT_MS = 5 * 60 * 1000
const KOKORO_MODEL_ID_LOCAL = 'Kokoro-82M-v1.0-ONNX'
const KOKORO_MODEL_ID_REMOTE = 'onnx-community/Kokoro-82M-v1.0-ONNX'

let kokoroTTS = null

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

/** Load Kokoro model once; reused for all voices and for getVoices. */
async function ensureKokoroLoaded() {
  if (kokoroTTS) return
  const { env } = await import('@huggingface/transformers')
  const wasRemote = env.allowRemoteModels
  const wasLocal = env.allowLocalModels
  const wasPath = env.localModelPath
  try {
    env.allowLocalModels = true
    env.allowRemoteModels = false
    env.localModelPath = '/models/'
    const { KokoroTTS } = await import('kokoro-js')
    kokoroTTS = await withTimeout(
      KokoroTTS.from_pretrained(KOKORO_MODEL_ID_LOCAL, { dtype: 'q8', device: 'wasm' }),
      KOKORO_LOAD_TIMEOUT_MS,
      'Kokoro model'
    )
  } catch (e) {
    env.allowRemoteModels = true
    const { KokoroTTS } = await import('kokoro-js')
    kokoroTTS = await withTimeout(
      KokoroTTS.from_pretrained(KOKORO_MODEL_ID_REMOTE, { dtype: 'q8', device: 'wasm' }),
      KOKORO_LOAD_TIMEOUT_MS,
      'Kokoro model'
    )
  } finally {
    env.allowRemoteModels = wasRemote
    env.allowLocalModels = wasLocal
    env.localModelPath = wasPath
  }
}

function buildVoicesList() {
  if (!kokoroTTS || !kokoroTTS.voices) return []
  const voicesObj = kokoroTTS.voices
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
  return withNames
}

async function runKokoro(text, voiceId) {
  await ensureKokoroLoaded()
  const voice = voiceId || 'af_heart'
  const audio = await kokoroTTS.generate(text, { voice })
  if (audio && typeof audio.toBlob === 'function') return audio.toBlob()
  return null
}

async function processOne(msg) {
  const { id, text, provider, voiceId } = msg
  try {
    let blob = null
    if (provider === 'kokoro') {
      blob = await runKokoro(text, voiceId || 'af_heart')
    }
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

self.onmessage = async (ev) => {
  const data = ev.data
  if (data?.type === 'getVoices') {
    const reqId = data.id
    try {
      await ensureKokoroLoaded()
      const voices = buildVoicesList()
      self.postMessage({ type: 'voices', id: reqId, voices })
    } catch (e) {
      self.postMessage({ type: 'error', id: reqId, message: e?.message || String(e) })
    }
    return
  }
  if (data?.type === 'generate') {
    queue.push(data)
    drain()
  }
}
