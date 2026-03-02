/**
 * Phonemize text to IPA for Kokoro using espeak-ng (--ipa) then apply
 * Kokoro-specific post-processing so every character is in the tokenizer vocab.
 * Language is fixed to en-us so output is always English phonemes.
 */

function normalizeText(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Apply Kokoro post-processing so espeak output matches tokenizer vocab (e.g. r → ɹ). */
function kokoroPostProcess(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/kəkˈoːɹoʊ/g, 'kˈoʊkəɹoʊ')
    .replace(/kəkˈɔːɹəʊ/g, 'kˈəʊkəɹəʊ')
    .replace(/ʲ/g, 'j')
    .replace(/r/g, 'ɹ')   // espeak ASCII r → IPA ɹ (critical: token 123 not 60)
    .replace(/x/g, 'k')
    .replace(/ɬ/g, 'l')
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, ' ')
    .replace(/ z(?=[;:,.!?¡¿—…"«»"" ]|$)/g, 'z')
    .replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di')  // American "ninety"
    .trim()
}

/**
 * @param {string} text
 * @param {string} [langId] - ignored; we always use en-us for Kokoro English
 * @returns {Promise<string>} IPA phoneme string
 */
export async function phonemize(text, langId = 'en-us') {
  const normalized = normalizeText(text)
  if (!normalized) return ''

  const lang = 'en-us'  // Force English so output is never another language
  const base =
    typeof location !== 'undefined'
      ? 'https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/dist'
      : 'https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/dist'

  try {
    const ESpeakNg = (await import('espeak-ng')).default
    const espeak = await ESpeakNg({
      locateFile: (file) => `${base}/${file}`,
      arguments: ['--phonout', 'generated', '-q', '--ipa', '-v', lang, normalized],
    })
    const out = espeak.FS.readFile('generated', { encoding: 'utf8' })
    const str = typeof out === 'string' ? out : new TextDecoder().decode(out)
    const raw = str.split('\n').join(' ').trim()
    return kokoroPostProcess(raw)
  } catch (e) {
    throw new Error(`Phonemization failed: ${e?.message || String(e)}`)
  }
}
