#!/usr/bin/env node
/**
 * Optional TTS server for iOS (and other clients that can't run Kokoro in-browser).
 *
 * Endpoints:
 * - POST /tts/generate — full audio server-side (Kokoro); returns WAV blobs (base64).
 * - POST /tts/tokenize — phonemize + tokenize only (no ONNX). Returns token IDs for client-side ONNX.
 *   Use this so the device does generation (ONNX) and the server only does the transformers-ish part.
 *
 * Requires: Local Kokoro model (public/models/Kokoro-82M-v1.0-ONNX). Run npm run download-kokoro-model.
 *
 * Usage: node server/tts-server.js [--port=3333] [--gpu]
 */
import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { phonemize as phonemizeLib } from 'phonemizer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const modelDir = path.join(projectRoot, 'public', 'models', MODEL_ID)

function parseArgs() {
  const args = process.argv.slice(2)
  let port = 3333
  let useGpu = false
  for (const a of args) {
    if (a.startsWith('--port=')) port = parseInt(a.slice(7), 10) || 3333
    else if (a === '--gpu') useGpu = true
  }
  return { port, useGpu }
}

function cleanText(text) {
  if (!text) return ''
  return String(text).replace(/\s+/g, ' ').trim()
}

/** Kokoro post-process for phonemizer output (match kokoro-js). */
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

let tokenizerVocab = null
let tokenizerAllowed = null

function getTokenizer() {
  if (tokenizerVocab && tokenizerAllowed) return { vocab: tokenizerVocab, allowedChars: tokenizerAllowed }
  const tokenizerPath = path.join(modelDir, 'tokenizer.json')
  if (!fs.existsSync(tokenizerPath)) return null
  const data = JSON.parse(fs.readFileSync(tokenizerPath, 'utf8'))
  tokenizerVocab = data?.model?.vocab
  if (!tokenizerVocab) return null
  tokenizerAllowed = new Set(Object.keys(tokenizerVocab).filter((k) => k !== '$'))
  return { vocab: tokenizerVocab, allowedChars: tokenizerAllowed }
}

/** Phonemize + tokenize only (no ONNX). Returns content token IDs for client-side generation. */
async function phonemizeAndTokenize(text) {
  const trimmed = cleanText(text)
  if (!trimmed) return []
  const raw = await phonemizeLib(trimmed, 'en-us')
  const joined = Array.isArray(raw) ? raw.join(' ') : (raw || '')
  const ipa = kokoroPostProcess(joined.trim())
  if (!ipa) return []
  const tok = getTokenizer()
  if (!tok) throw new Error('Tokenizer not found. Run npm run download-kokoro-model.')
  const normalized = [...ipa].filter((c) => tok.allowedChars.has(c)).join('')
  if (!normalized) return []
  return normalized.split('').map((c) => tok.vocab[c] ?? tok.vocab['$'])
}

let ttsInstance = null

async function getTts(useGpu) {
  if (ttsInstance) return ttsInstance
  const runKokoro = await import('../scripts/runKokoroStaticWavs.js')
  if (!fs.existsSync(modelDir)) {
    throw new Error(`Kokoro model not found at ${modelDir}. Run: npm run download-kokoro-model`)
  }
  await runKokoro.ensureKokoroVoicesForLocal(projectRoot)
  const { env } = await import('@huggingface/transformers')
  env.allowLocalModels = true
  env.allowRemoteModels = false
  env.localModelPath = path.join(projectRoot, 'public', 'models') + path.sep
  const device = useGpu ? 'gpu' : 'cpu'
  const dtype = useGpu ? 'fp32' : 'q8'
  const { KokoroTTS } = await import('kokoro-js')
  try {
    ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, { dtype, device })
  } catch (e) {
    if (useGpu) {
      ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'cpu' })
    } else throw e
  }
  return ttsInstance
}

async function generateBlobs(voiceId, phrases, useGpu) {
  const tts = await getTts(useGpu)
  const blobs = []
  const tmpDir = os.tmpdir()
  for (let i = 0; i < phrases.length; i++) {
    const text = cleanText(phrases[i])
    if (!text) {
      blobs.push(null)
      continue
    }
    const tmpPath = path.join(tmpDir, `tts-${process.pid}-${i}-${Date.now()}.wav`)
    try {
      const audio = await tts.generate(text, { voice: voiceId })
      await audio.save(tmpPath)
      const buf = fs.readFileSync(tmpPath)
      blobs.push(buf.toString('base64'))
    } catch (e) {
      console.error(`TTS failed for phrase ${i}:`, e.message)
      blobs.push(null)
    } finally {
      try { fs.unlinkSync(tmpPath) } catch (_) {}
    }
  }
  return blobs
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(statusCode)
  res.end(JSON.stringify(data))
}

function sendCors(res, req) {
  const origin = req.headers.origin
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const { port, useGpu } = parseArgs()

const server = http.createServer(async (req, res) => {
  sendCors(res, req)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not found. Use POST /tts/generate or POST /tts/tokenize' })
    return
  }
  let body
  try {
    body = await parseBody(req)
  } catch (e) {
    sendJson(res, 400, { error: 'Invalid JSON body' })
    return
  }

  if (req.url === '/tts/tokenize') {
    const text = body.text != null ? String(body.text).trim() : ''
    if (!text) {
      sendJson(res, 200, { tokenIds: [] })
      return
    }
    try {
      const tokenIds = await phonemizeAndTokenize(text)
      sendJson(res, 200, { tokenIds })
    } catch (e) {
      console.error('Tokenize error:', e)
      sendJson(res, 500, { error: e.message || 'Tokenize failed' })
    }
    return
  }

  if (req.url !== '/tts/generate') {
    sendJson(res, 404, { error: 'Not found. Use POST /tts/generate or POST /tts/tokenize' })
    return
  }
  const voiceId = (body.voiceId ?? body.voiceld) && String(body.voiceId ?? body.voiceld).trim() || 'af_nicole'
  const phrases = Array.isArray(body.phrases) ? body.phrases : []
  if (phrases.length === 0) {
    sendJson(res, 200, { blobs: [] })
    return
  }
  if (phrases.length > 500) {
    sendJson(res, 400, { error: 'Too many phrases (max 500)' })
    return
  }
  try {
    const blobs = await generateBlobs(voiceId, phrases, useGpu)
    sendJson(res, 200, { blobs })
  } catch (e) {
    console.error('TTS error:', e)
    sendJson(res, 500, { error: e.message || 'TTS generation failed' })
  }
})

server.listen(port, () => {
  console.log(`TTS server listening on http://localhost:${port}`)
  console.log('  POST /tts/generate — full audio (Kokoro)')
  console.log('  POST /tts/tokenize — phonemize+tokenize only (device does ONNX)')
})
