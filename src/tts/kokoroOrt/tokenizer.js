/**
 * Phoneme-to-token-ID for Kokoro-82M. Loads tokenizer.json from the model
 * so tokenization matches kokoro-js / HuggingFace exactly. Applies normalizer:
 * strips characters not in vocab (same as HF tokenizer).
 */
import { cachedFetch } from './cachedFetch.js'

const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'

let vocab = null
let allowedChars = null
let loadPromise = null
/** @type {string | null} */
let loadedPackageBase = null

async function ensureLoaded(packageBaseUrl) {
  const base = packageBaseUrl || `/models/${MODEL_ID}`
  if (vocab && allowedChars && loadedPackageBase === base) return
  if (loadPromise && loadedPackageBase === base) return loadPromise
  if (loadedPackageBase !== base) {
    vocab = null
    allowedChars = null
    loadPromise = null
  }
  loadedPackageBase = base
  loadPromise = (async () => {
    const tokenizerUrl = `${base.replace(/\/$/, '')}/tokenizer.json`
    const res = await cachedFetch(tokenizerUrl)
    if (!res.ok) throw new Error(`Tokenizer not found: ${tokenizerUrl}`)
    const data = await res.json()
    vocab = data?.model?.vocab
    if (!vocab) throw new Error('Invalid tokenizer.json: missing model.vocab')
    allowedChars = new Set(Object.keys(vocab).filter((k) => k !== '$'))
  })()
  return loadPromise
}

/**
 * Convert IPA phoneme string to content token IDs (no BOS/EOS).
 * Uses tokenizer.json vocab and strips characters not in vocab (matches HF normalizer).
 * Must call ensureTokenizerReady() before first use (done in loadKokoroOrt).
 * @param {string} phonemes - IPA string
 * @returns {number[]}
 */
export function tokenize(phonemes) {
  if (!vocab || !allowedChars) {
    throw new Error('Tokenizer not loaded. Call ensureTokenizerReady() during model load.')
  }
  if (!phonemes || typeof phonemes !== 'string') return []
  const normalized = [...phonemes].filter((c) => allowedChars.has(c)).join('')
  if (!normalized) return []
  return normalized.split('').map((c) => vocab[c] ?? 0)
}

/**
 * Pre-load tokenizer (call during model warmup).
 * @param {string} [packageBaseUrl] - Same as Kokoro `baseUrl`, e.g. `https://host/repo/models/Kokoro-82M-v1.0-ONNX`
 */
export async function ensureTokenizerReady(packageBaseUrl) {
  return ensureLoaded(packageBaseUrl)
}

/**
 * For Node tests: load tokenizer from filesystem. Call before tokenize().
 * @param {object} data - parsed tokenizer.json (must have model.vocab)
 */
export function initFromData(data) {
  vocab = data?.model?.vocab
  if (!vocab) throw new Error('Invalid tokenizer data: missing model.vocab')
  allowedChars = new Set(Object.keys(vocab).filter((k) => k !== '$'))
}
