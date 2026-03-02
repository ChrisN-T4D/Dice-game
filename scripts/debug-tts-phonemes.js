#!/usr/bin/env node
/**
 * Debug TTS: compare phonemizer (Node, used by generate-static-wavs) output
 * vs what our espeak-ng pipeline would produce. Run with Node.
 *
 * Usage: node scripts/debug-tts-phonemes.js [phrase]
 */
import { phonemize } from 'phonemizer'

const phrase = process.argv[2] || 'This is a quick voice test.'

async function main() {
  console.log('Input:', phrase)
  console.log('')

  // Phonemizer (same as kokoro-js / generate-static-wavs)
  const phonemizerIpa = await phonemize(phrase, 'en-us')
  const phonemizerJoined = Array.isArray(phonemizerIpa) ? phonemizerIpa.join(' ') : phonemizerIpa
  const kokoroPostProcess = (str) =>
    str
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
  const phonemizerProcessed = kokoroPostProcess(phonemizerJoined)
  console.log('Phonemizer (en-us) raw:', JSON.stringify(phonemizerIpa))
  console.log('Phonemizer joined:', phonemizerJoined)
  console.log('Phonemizer + kokoro post-process:', phonemizerProcessed)
  console.log('')

  // Load tokenizer.json and tokenize
  const { readFile } = await import('fs/promises')
  const { fileURLToPath } = await import('url')
  const { dirname, join } = await import('path')
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const tokenizerPath = join(__dirname, '..', 'public', 'models', 'Kokoro-82M-v1.0-ONNX', 'tokenizer.json')
  const tokenizer = JSON.parse(await readFile(tokenizerPath, 'utf8'))
  const vocab = tokenizer.model.vocab
  const allowedChars = new Set(Object.keys(vocab).filter((k) => k !== '$'))

  function tokenizeWithNormalizer(ipa) {
    const normalized = [...ipa].filter((c) => allowedChars.has(c)).join('')
    return [0, ...normalized.split('').map((c) => vocab[c] ?? vocab['$']), 0]
  }

  const ids = tokenizeWithNormalizer(phonemizerProcessed)
  console.log('Token IDs (first 30):', ids.slice(0, 30))
  console.log('Token count:', ids.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
