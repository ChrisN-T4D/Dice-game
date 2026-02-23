/**
 * TTS Web Worker: runs Piper and Kokoro generation off the main thread
 * so the UI stays responsive. Message protocol:
 * - In:  { type: 'generate', id, text, provider, voiceId, origin }
 * - Out: { type: 'blob', id, blob } | { type: 'error', id, message }
 */

const PIPER_LOAD_TIMEOUT_MS = 2 * 60 * 1000
const KOKORO_LOAD_TIMEOUT_MS = 5 * 60 * 1000
const KOKORO_MODEL_ID_LOCAL = 'Kokoro-82M-v1.0-ONNX'
const KOKORO_MODEL_ID_REMOTE = 'onnx-community/Kokoro-82M-v1.0-ONNX'

let piperModule = null
let piperSession = null
let piperSessionVoiceId = null
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

async function runPiper(text, voiceId, origin) {
  if (!piperModule) piperModule = await import('@mintplex-labs/piper-tts-web')
  const onnxBase = origin ? `${origin}/onnxruntime-wasm/` : 'https://unpkg.com/onnxruntime-web@1.24.2/dist/'
  const wasmPaths = {
    onnxWasm: onnxBase,
    piperWasm: `${piperModule.WASM_BASE}.wasm`,
    piperData: `${piperModule.WASM_BASE}.data`,
  }
  if (!piperSession || piperSessionVoiceId !== voiceId) {
    piperSession = await withTimeout(
      piperModule.TtsSession.create({ voiceId, wasmPaths }),
      PIPER_LOAD_TIMEOUT_MS,
      'Piper model'
    )
    piperSessionVoiceId = voiceId
  }
  const wav = await piperSession.predict(text)
  if (!wav) return null
  return wav instanceof Blob ? wav : new Blob([wav])
}

async function runKokoro(text, voiceId) {
  if (!kokoroTTS) {
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
  const voice = voiceId || 'af_heart'
  const audio = await kokoroTTS.generate(text, { voice })
  if (audio && typeof audio.toBlob === 'function') return audio.toBlob()
  return null
}

async function processOne(msg) {
  const { id, text, provider, voiceId, origin } = msg
  try {
    let blob = null
    if (provider === 'piper') {
      blob = await runPiper(text, voiceId || 'en_US-hfc_female-medium', origin)
    } else if (provider === 'kokoro') {
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

self.onmessage = (ev) => {
  const data = ev.data
  if (data?.type === 'generate') {
    queue.push(data)
    drain()
  }
}
