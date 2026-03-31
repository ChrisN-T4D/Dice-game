#!/usr/bin/env node
/**
 * Compare server tokenize output with local tokenizer and inspect ONNX model.
 * Run from project root.
 *
 * Usage: node scripts/compare-tokenize-and-inspect-onnx.js [phrase]
 */

import { readFile } from 'fs/promises'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { phonemize } from 'phonemizer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const phrase = process.argv[2] || 'Hello, this is a voice test.'

const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const modelDir = join(projectRoot, 'public', 'models', MODEL_ID)
const tokenizerPath = join(modelDir, 'tokenizer.json')

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

async function localPhonemizeAndTokenize(text, vocab, allowedChars) {
  const raw = await phonemize(text, 'en-us')
  const joined = Array.isArray(raw) ? raw.join(' ') : (raw || '')
  const ipa = kokoroPostProcess(joined.trim())
  if (!ipa) return { ipa: '', tokenIds: [] }
  const normalized = [...ipa].filter((c) => allowedChars.has(c)).join('')
  if (!normalized) return { ipa, tokenIds: [] }
  const tokenIds = normalized.split('').map((c) => vocab[c] ?? vocab['$'])
  return { ipa, tokenIds }
}

async function fetchServerTokenize(text, baseUrl = 'http://localhost:3333') {
  const res = await fetch(`${baseUrl}/tts/tokenize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.tokenIds || []
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

async function inspectOnnxModel() {
  const modelPath = join(modelDir, 'onnx', 'model_quantized.onnx')
  try {
    const buf = await readFile(modelPath)
    const ort = await import('onnxruntime-web')
    const session = await ort.InferenceSession.create(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
      executionProviders: ['cpu'],
    })
    const inputNames = session.inputNames || []
    const outputNames = session.outputNames || []
    const inputMeta = session.inputMetadata || {}
    const outputMeta = session.outputMetadata || {}
    return { inputNames, outputNames, inputMeta, outputMeta }
  } catch (e) {
    return { error: e.message }
  }
}

async function main() {
  console.log('Input phrase:', phrase)
  console.log('')

  const tokenizer = JSON.parse(await readFile(tokenizerPath, 'utf8'))
  const vocab = tokenizer.model.vocab
  const allowedChars = new Set(Object.keys(vocab).filter((k) => k !== '$'))

  const { ipa, tokenIds: localIds } = await localPhonemizeAndTokenize(phrase.trim(), vocab, allowedChars)
  console.log('Local phonemize + tokenize (same logic as server):')
  console.log('  IPA length:', ipa.length)
  console.log('  Content token count:', localIds.length)
  console.log('  First 40 token IDs:', localIds.slice(0, 40).join(','))
  console.log('  Padded sequence [0, ...content, 0] length:', localIds.length + 2)
  console.log('')

  let serverIds = null
  try {
    serverIds = await fetchServerTokenize(phrase)
    console.log('Server POST /tts/tokenize:')
    console.log('  Token count:', serverIds.length)
    console.log('  First 40 token IDs:', serverIds.slice(0, 40).join(','))
    console.log('  Match local:', arraysEqual(localIds, serverIds) ? 'YES' : 'NO')
    if (!arraysEqual(localIds, serverIds)) {
      const firstDiff = localIds.findIndex((v, i) => serverIds[i] !== v)
      console.log('  First difference at index:', firstDiff, 'local=', localIds[firstDiff], 'server=', serverIds?.[firstDiff])
    }
  } catch (e) {
    console.log('Server POST /tts/tokenize: not available (is TTS server running?).', e.message)
  }
  console.log('')

  console.log('ONNX model inspection (model_quantized.onnx):')
  const onnxInfo = await inspectOnnxModel()
  if (onnxInfo.error) {
    console.log('  Error:', onnxInfo.error)
    console.log('  (onnxruntime-web in Node may not support CPU EP; try in browser or use onnxruntime-node)')
  } else {
    console.log('  Input names:', onnxInfo.inputNames)
    console.log('  Output names:', onnxInfo.outputNames)
    for (const n of onnxInfo.inputNames || []) {
      const m = onnxInfo.inputMeta?.[n]
      if (m) console.log('    Input', n, ':', m.dims, m.type)
    }
    for (const n of onnxInfo.outputNames || []) {
      const m = onnxInfo.outputMeta?.[n]
      if (m) console.log('    Output', n, ':', m.dims, m.type)
    }
  }
}

  console.log('Next: run-tokenize-path-onnx-node.js writes a WAV from same token IDs; compare with full server audio.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
