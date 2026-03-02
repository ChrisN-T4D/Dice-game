/**
 * Phoneme-to-token-ID for Kokoro-82M. Loads tokenizer.json from the model
 * so tokenization matches kokoro-js / HuggingFace exactly. Applies normalizer:
 * strips characters not in vocab (same as HF tokenizer).
 */
import { cachedFetch } from './cachedFetch.js'

const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const TOKENIZER_URL = `/models/${MODEL_ID}/tokenizer.json`

let vocab = null
let allowedChars = null
let loadPromise = null

async function ensureLoaded() {
  if (vocab && allowedChars) return
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const res = await cachedFetch(TOKENIZER_URL)
    if (!res.ok) throw new Error(`Tokenizer not found: ${TOKENIZER_URL}`)
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

/** Pre-load tokenizer (call during model warmup). */
export async function ensureTokenizerReady() {
  return ensureLoaded()
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
