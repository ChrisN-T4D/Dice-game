/**
 * Preprocess text into token chunks for Kokoro.
 * Sanitize, optionally segment by silence markers, phonemize, tokenize.
 */
import { tokenize } from './tokenizer.js'
import { phonemize } from './phonemize.js'

const MODEL_CONTEXT_WINDOW = 512
const TOKENS_PER_CHUNK = MODEL_CONTEXT_WINDOW - 2

function sanitizeText(rawText) {
  return rawText
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split text into chunks that fit the model context. For simplicity we do not
 * parse [0.4s] silence markers; we just phonemize the whole text and chunk by token limit.
 * @param {string} text
 * @param {string} [lang]
 * @returns {Promise<{ type: 'text', content: string, tokens: number[] }[]>}
 */
export async function preprocessText(text, lang = 'en-us') {
  const sanitized = sanitizeText(text)
  if (!sanitized) return []

  const phonemized = await phonemize(sanitized, lang)
  if (!phonemized) return []

  const allTokens = tokenize(phonemized)
  if (allTokens.length === 0) return []

  const chunks = []
  for (let from = 0; from < allTokens.length; from += TOKENS_PER_CHUNK) {
    const to = Math.min(from + TOKENS_PER_CHUNK, allTokens.length)
    const tokens = allTokens.slice(from, to)
    chunks.push({ type: 'text', content: phonemized.substring ? phonemized.substring(from, to) : '', tokens })
  }
  return chunks
}

/**
 * Build token chunks from already phonemized IPA (no espeak-ng). Used when main thread
 * runs phonemization and sends IPA to the worker so espeak-ng never runs in the worker.
 * @param {string} ipa - IPA phoneme string (e.g. from phonemize())
 * @returns {{ type: 'text', content: string, tokens: number[] }[]}
 */
export function preprocessTextFromIpa(ipa) {
  if (!ipa || typeof ipa !== 'string') return []
  const trimmed = ipa.replace(/\s+/g, ' ').trim()
  if (!trimmed) return []
  const allTokens = tokenize(trimmed)
  if (allTokens.length === 0) return []
  const chunks = []
  for (let from = 0; from < allTokens.length; from += TOKENS_PER_CHUNK) {
    const to = Math.min(from + TOKENS_PER_CHUNK, allTokens.length)
    const tokens = allTokens.slice(from, to)
    chunks.push({ type: 'text', content: trimmed.substring(from, to), tokens })
  }
  return chunks
}
