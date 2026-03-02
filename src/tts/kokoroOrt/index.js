/**
 * Kokoro TTS using only onnxruntime-web (no transformers.js).
 * Pipeline: phonemizer (phonemize.js) → tokenizer.json (tokenizer.js) → ONNX (WASM only; WebGPU disabled for correct int64).
 * Load once, then call generate(text, { voice }) for Blob (WAV).
 */
import { getOnnxRuntime } from './getOnnxRuntime.js'
import { preprocessText } from './textProcessor.js'
import { ensureTokenizerReady } from './tokenizer.js'
import { loadShapedVoice } from './voiceLoader.js'
import { trimWaveform } from './trimWaveform.js'
import { createWavBuffer } from './createWavBuffer.js'
import { cachedFetch } from './cachedFetch.js'

const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const SAMPLE_RATE = 24000
const MODEL_CONTEXT_WINDOW = 512

let session = null

/**
 * Build int64 tensor for ONNX.
 * onnxruntime-web expects int64 inputs as BigInt64Array; passing number[] can be misinterpreted
 * and produce wrong token IDs → garbage/nonsense audio when using device ONNX (or tokenize+device).
 */
function createInt64Tensor(ort, values, dims) {
  const data = new BigInt64Array(values.length)
  for (let i = 0; i < values.length; i++) data[i] = BigInt(values[i])
  return new ort.Tensor('int64', data, dims)
}
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
    const [res, _] = await Promise.all([
      cachedFetch(modelUrl),
      ensureTokenizerReady(),
    ])
    if (!res.ok) throw new Error(`Model not found: ${modelUrl}`)
    const modelBuffer = await res.arrayBuffer()
    session = await ort.InferenceSession.create(modelBuffer, {
      // WASM only: WebGPU mishandles int64 input_ids (tokenize path gives garbage); Node CPU works, browser WASM matches.
      executionProviders: ['wasm'],
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
    const input_ids = createInt64Tensor(ort, paddedTokens, [1, paddedTokens.length])
    const style = new ort.Tensor('float32', new Float32Array(ref_s), [1, 256])
    const speed = new ort.Tensor('float32', new Float32Array([1]), [1])

    const result = await session.run({ input_ids, style, speed })
    const waveformTensor = result.waveform ?? result[Object.keys(result)[0]]
    let waveform = await normalizeWaveformResult(result)
    if (!waveform) throw new Error('No waveform from model')
    if (waveformTensor?.dims?.length > 1) {
      const [, ...rest] = waveformTensor.dims
      const expectedLen = rest.reduce((a, b) => a * b, 1)
      if (waveform.length > expectedLen) waveform = waveform.subarray(0, expectedLen)
    }
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

/** Normalize model waveform output to Float32Array (handles getData() returning different types in browser). */
async function normalizeWaveformResult(result) {
  const waveformTensor = result.waveform ?? result[Object.keys(result)[0]]
  if (!waveformTensor) return null
  let data = await waveformTensor.getData()
  if (!data) return null
  if (!(data instanceof Float32Array)) data = new Float32Array(data)
  return data
}

/**
 * Generate WAV from pre-phonemized IPA (no phonemization in this thread).
 * Use when the main thread has already run phonemize() so espeak-ng is not used in the worker.
 * @param {string} ipa - IPA phoneme string
 * @param {object} [opts]
 * @param {string} [opts.voice]
 * @param {string} [opts.baseUrl]
 * @returns {Promise<Blob>}
 */
export async function generateFromIpa(ipa, opts = {}) {
  const voiceId = opts.voice || 'af_nicole'
  const baseUrl = opts.baseUrl || `/models/${MODEL_ID}`

  await loadKokoroOrt({ baseUrl })

  let shapedVoice = voiceCache.get(voiceId)
  if (!shapedVoice) {
    shapedVoice = await loadShapedVoice(baseUrl, voiceId)
    voiceCache.set(voiceId, shapedVoice)
  }

  const { preprocessTextFromIpa } = await import('./textProcessor.js')
  const chunks = preprocessTextFromIpa(ipa)
  if (chunks.length === 0) throw new Error('No tokens from IPA. Check phonemization.')

  const ort = await getOnnxRuntime()
  const waveforms = []

  for (const chunk of chunks) {
    if (chunk.type !== 'text' || !chunk.tokens?.length) continue
    const tokens = chunk.tokens
    const refIndex = Math.min(tokens.length, shapedVoice.length - 1)
    const ref_s = shapedVoice[refIndex][0]
    const paddedTokens = [0, ...tokens, 0]
    const input_ids = createInt64Tensor(ort, paddedTokens, [1, paddedTokens.length])
    const style = new ort.Tensor('float32', new Float32Array(ref_s), [1, 256])
    const speed = new ort.Tensor('float32', new Float32Array([1]), [1])

    const result = await session.run({ input_ids, style, speed })
    const waveformTensor = result.waveform ?? result[Object.keys(result)[0]]
    let waveform = await normalizeWaveformResult(result)
    if (!waveform) throw new Error('No waveform from model')
    if (waveformTensor?.dims?.length > 1) {
      const [, ...rest] = waveformTensor.dims
      const expectedLen = rest.reduce((a, b) => a * b, 1)
      if (waveform.length > expectedLen) waveform = waveform.subarray(0, expectedLen)
    }
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

const TOKENS_PER_CHUNK = MODEL_CONTEXT_WINDOW - 2

/**
 * Generate WAV from pre-tokenized content token IDs (no phonemize, no tokenizer on device).
 * Use when server did phonemize+tokenize (POST /tts/tokenize); device runs ONNX only.
 */
export async function generateFromTokenIds(tokenIds, opts = {}) {
  const voiceId = opts.voice || 'af_nicole'
  const baseUrl = opts.baseUrl || `/models/${MODEL_ID}`

  await loadKokoroOrt({ baseUrl })

  let shapedVoice = voiceCache.get(voiceId)
  if (!shapedVoice) {
    shapedVoice = await loadShapedVoice(baseUrl, voiceId)
    voiceCache.set(voiceId, shapedVoice)
  }

  if (!Array.isArray(tokenIds) || tokenIds.length === 0) throw new Error('No token IDs.')

  const ort = await getOnnxRuntime()
  const waveforms = []

  for (let from = 0; from < tokenIds.length; from += TOKENS_PER_CHUNK) {
    const to = Math.min(from + TOKENS_PER_CHUNK, tokenIds.length)
    const tokens = tokenIds.slice(from, to)
    const refIndex = Math.min(tokens.length, shapedVoice.length - 1)
    const ref_s = shapedVoice[refIndex][0]
    const paddedTokens = [0, ...tokens, 0]
    const input_ids = createInt64Tensor(ort, paddedTokens, [1, paddedTokens.length])
    const style = new ort.Tensor('float32', new Float32Array(ref_s), [1, 256])
    const speed = new ort.Tensor('float32', new Float32Array([1]), [1])

    const result = await session.run({ input_ids, style, speed })
    const waveformTensor = result.waveform ?? result[Object.keys(result)[0]]
    let waveform = await normalizeWaveformResult(result)
    if (!waveform) throw new Error('No waveform from model')
    if (waveformTensor?.dims?.length > 1) {
      const [, ...rest] = waveformTensor.dims
      const expectedLen = rest.reduce((a, b) => a * b, 1)
      if (waveform.length > expectedLen) waveform = waveform.subarray(0, expectedLen)
    }
    waveforms.push(trimWaveform(waveform))
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
