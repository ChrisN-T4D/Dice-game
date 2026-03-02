/**
 * Phonemize text to IPA for Kokoro using phonemizer (same as kokoro-js / generate-static-wavs).
 * No transformers.js — phonemizer is standalone (espeak-ng bundled). Works in browser and on iOS.
 */
import { phonemize as phonemizeLib } from 'phonemizer'

/** Pre-phonemization normalization to match kokoro-js pipeline. */
function normalizeText(text) {
  return String(text)
    .replace(/['']/g, "'")
    .replace(/«/g, '"')
    .replace(/»/g, '"')
    .replace(/[""]/g, '"')
    .replace(/\(/g, '«')
    .replace(/\)/g, '»')
    .replace(/\bD[Rr]\.(?= [A-Z])/g, 'Doctor')
    .replace(/\b(?:Mr\.|MR\.(?= [A-Z]))/g, 'Mister')
    .replace(/\b(?:Ms\.|MS\.(?= [A-Z]))/g, 'Miss')
    .replace(/\b(?:Mrs\.|MRS\.(?= [A-Z]))/g, 'Mrs')
    .replace(/\betc\.(?! [A-Z])/gi, 'etc')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Apply Kokoro post-processing so output matches tokenizer vocab (e.g. r → ɹ). */
function kokoroPostProcess(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/kəkˈoːɹoʊ/g, 'kˈoʊkəɹoʊ')
    .replace(/kəkˈɔːɹəʊ/g, 'kˈəʊkəɹəʊ')
    .replace(/ʲ/g, 'j')
    .replace(/r/g, 'ɹ')
    .replace(/x/g, 'k')
    .replace(/ɬ/g, 'l')
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, ' ')
    .replace(/ z(?=[;:,.!?¡¿—…"«»"" ]|$)/g, 'z')
    .replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di')
    .trim()
}

/**
 * @param {string} text
 * @param {string} [langId] - language e.g. en-us (default)
 * @returns {Promise<string>} IPA phoneme string
 */
export async function phonemize(text, langId = 'en-us') {
  const normalized = normalizeText(text)
  if (!normalized) return ''

  const lang = 'en-us'
  try {
    const result = await phonemizeLib(normalized, lang)
    const joined = Array.isArray(result) ? result.join(' ') : (result || '')
    return kokoroPostProcess(joined.trim())
  } catch (e) {
    throw new Error(`Phonemization failed: ${e?.message || String(e)}`)
  }
}
