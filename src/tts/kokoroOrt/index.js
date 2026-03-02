/**
 * Kokoro TTS using only onnxruntime-web (no transformers.js).
 * Load once, then call generate(text, { voice }) for Blob (WAV).
 * Uses cached fetch so model/voices persist and are not re-downloaded every load.
 */
import { getOnnxRuntime } from './getOnnxRuntime.js'
import { preprocessText } from './textProcessor.js'
import { loadShapedVoice } from './voiceLoader.js'
import { trimWaveform } from './trimWaveform.js'
import { createWavBuffer } from './createWavBuffer.js'
import { cachedFetch } from './cachedFetch.js'

const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const SAMPLE_RATE = 24000
const MODEL_CONTEXT_WINDOW = 512

let session = null
let sessionPromise = null
const voiceCache = new Map()

/**
 * @param {object} [options]
 * @param {string} [options.baseUrl] - base URL for model/voices, e.g. /models/Kokoro-82M-v1.0-ONNX
 */
export async function loadKokoroOrt(options = {}) {
  const baseUrl = options.baseUrl || `/models/${MODEL_ID}`
  if (session) return session
  if (sessionPromise) return sessionPromise

  sessionPromise = (async () => {
    const ort = await getOnnxRuntime()
    const modelUrl = `${baseUrl}/onnx/model_quantized.onnx`
    const res = await cachedFetch(modelUrl)
    if (!res.ok) throw new Error(`Model not found: ${modelUrl}`)
    const modelBuffer = await res.arrayBuffer()
    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['webgpu', 'wasm'],
      graphOptimizationLevel: 'all',
    })
    return session
  })()
  return sessionPromise
}

/**
 * Generate WAV Blob from text.
 * @param {string} text
 * @param {object} [opts]
 * @param {string} [opts.voice] - voice id e.g. af_nicole
 * @param {string} [opts.lang] - for phonemization e.g. en-us
 * @param {string} [opts.baseUrl]
 * @returns {Promise<Blob>}
 */
export async function generate(text, opts = {}) {
  const voiceId = opts.voice || 'af_nicole'
  const lang = opts.lang || 'en-us'
  const baseUrl = opts.baseUrl || `/models/${MODEL_ID}`

  await loadKokoroOrt({ baseUrl })

  let shapedVoice = voiceCache.get(voiceId)
  if (!shapedVoice) {
    shapedVoice = await loadShapedVoice(baseUrl, voiceId)
    voiceCache.set(voiceId, shapedVoice)
  }

  const chunks = await preprocessText(text, lang)
  if (chunks.length === 0) throw new Error('No tokens produced from text')

  const ort = await getOnnxRuntime()
  const waveforms = []

  for (const chunk of chunks) {
    if (chunk.type !== 'text' || !chunk.tokens?.length) continue
    const tokens = chunk.tokens
    // kokoro-js indexes style by tokens.length (not tokens.length-1):
    // input_ids = [BOS, ...tokens, EOS] → dims.at(-1)-2 = tokens.length
    const refIndex = Math.min(tokens.length, shapedVoice.length - 1)
    const ref_s = shapedVoice[refIndex][0]
    const paddedTokens = [0, ...tokens, 0]
    const input_ids = new ort.Tensor('int64', paddedTokens, [1, paddedTokens.length])
    const style = new ort.Tensor('float32', new Float32Array(ref_s), [1, 256])
    const speed = new ort.Tensor('float32', new Float32Array([1]), [1])

    const result = await session.run({ input_ids, style, speed })
    const outKey = Object.keys(result)[0]
    const waveformTensor = outKey ? result[outKey] : null
    const waveform = waveformTensor ? (await waveformTensor.getData()) : null
    if (!waveform || !(waveform instanceof Float32Array)) throw new Error('No waveform from model')
    const trimmed = trimWaveform(waveform)
    waveforms.push(trimmed)
  }

  if (waveforms.length === 0) throw new Error('No waveforms generated')

  const totalLen = waveforms.reduce((s, w) => s + w.length, 0)
  const finalWaveform = new Float32Array(totalLen)
  let offset = 0
  for (const w of waveforms) {
    finalWaveform.set(w, offset)
    offset += w.length
  }

  const wavBuffer = createWavBuffer(finalWaveform, SAMPLE_RATE)
  return new Blob([wavBuffer], { type: 'audio/wav' })
}
