#!/usr/bin/env node
/**
 * Minimal tests for the Kokoro ORT pipeline (browser-only stack).
 *
 * 1. Unit tests: tokenizer, createWavBuffer, trimWaveform (no network).
 * 2. Optional integration: with --integration and model present, serves public/
 *    and runs generate() once, then optionally compares with a kokoro-js WAV.
 *
 * Usage:
 *   node scripts/test-kokoro-ort.js              # unit tests only (tokenizer, WAV, trim)
 *   node scripts/test-kokoro-ort.js --integration # unit + integration (browser only; skipped in Node)
 *
 * To compare ORT vs kokoro-js: generate a WAV with kokoro-js (e.g. npm run generate-voice-test-wavs),
 * then run the app, warmup, and speak the same phrase; compare file sizes/duration manually.
 */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const modelDir = path.join(projectRoot, 'public', 'models', 'Kokoro-82M-v1.0-ONNX')

// Unit tests (no network)
async function runUnitTests() {
  const { tokenize } = await import('../src/tts/kokoroOrt/tokenizer.js')
  const { createWavBuffer } = await import('../src/tts/kokoroOrt/createWavBuffer.js')
  const { trimWaveform } = await import('../src/tts/kokoroOrt/trimWaveform.js')

  let passed = 0
  let failed = 0

  // Tokenizer: known IPA -> token IDs
  const tokens = tokenize('həˈloʊ')
  if (Array.isArray(tokens) && tokens.length > 0 && tokens.every(Number.isInteger)) {
    console.log('  tokenizer: tokenize(IPA) returns token ids')
    passed++
  } else {
    console.error('  tokenizer: expected non-empty array of integers')
    failed++
  }

  const emptyTokens = tokenize('')
  if (emptyTokens.length === 0) {
    console.log('  tokenizer: tokenize("") returns []')
    passed++
  } else {
    console.error('  tokenizer: tokenize("") expected []')
    failed++
  }

  // createWavBuffer: Float32 -> valid WAV
  const shortWave = new Float32Array(2400) // 0.1s at 24kHz
  shortWave.fill(0.1, 0, 100)
  const wav = createWavBuffer(shortWave, 24000)
  if (wav instanceof ArrayBuffer && wav.byteLength >= 44) {
    const view = new DataView(wav)
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
    if (riff === 'RIFF') {
      console.log('  createWavBuffer: valid RIFF header and size')
      passed++
    } else {
      console.error('  createWavBuffer: expected RIFF header')
      failed++
    }
  } else {
    console.error('  createWavBuffer: expected ArrayBuffer >= 44 bytes')
    failed++
  }

  // trimWaveform: trims silence
  const withSilence = new Float32Array(1024)
  withSilence.fill(0.001, 0, 256)
  withSilence.fill(0.2, 256, 512)
  withSilence.fill(0.001, 512, 1024)
  const trimmed = trimWaveform(withSilence)
  if (trimmed instanceof Float32Array && trimmed.length > 0 && trimmed.length < withSilence.length) {
    console.log('  trimWaveform: shortens waveform with leading/trailing silence')
    passed++
  } else {
    console.error('  trimWaveform: expected shorter Float32Array')
    failed++
  }

  return { passed, failed }
}

// Integration: serve public/, run generate(), write WAV. Best run in browser (espeak-ng
// phonemization uses WASM from CDN in browser; in Node it can resolve paths incorrectly).
async function runIntegrationTest() {
  const isBrowser = typeof window !== 'undefined'
  if (!isBrowser) {
    console.log('  integration: skipped (run in browser for full pipeline; unit tests cover tokenizer/WAV/trim)')
    return { passed: 0, failed: 0 }
  }
  if (!fs.existsSync(path.join(modelDir, 'onnx', 'model_quantized.onnx'))) {
    console.log('  integration: skipped (model not found; run npm run download-kokoro-model)')
    return { passed: 0, failed: 0 }
  }

  const publicDir = path.join(projectRoot, 'public')
  const server = http.createServer((req, res) => {
    const p = path.join(publicDir, req.url?.replace(/\?.*$/, '') || '.')
    const safe = path.resolve(p)
    if (!safe.startsWith(path.resolve(publicDir))) {
      res.statusCode = 404
      res.end()
      return
    }
    fs.stat(p, (err, stat) => {
      if (err || !stat?.isFile()) {
        res.statusCode = 404
        res.end()
        return
      }
      res.setHeader('Content-Type', req.url?.endsWith('.json') ? 'application/json' : 'application/octet-stream')
      fs.createReadStream(p).pipe(res)
    })
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}/models/Kokoro-82M-v1.0-ONNX`

  let passed = 0
  let failed = 0

  try {
    const { loadKokoroOrt, generate } = await import('../src/tts/kokoroOrt/index.js')
    await loadKokoroOrt({ baseUrl })
    const blob = await generate('Hello.', { voice: 'af_nicole', baseUrl })
    if (!(blob instanceof Blob) || blob.size < 1000) {
      console.error('  integration: expected WAV Blob with size > 1000')
      failed++
    } else {
      console.log('  integration: generate("Hello.", af_nicole) produced WAV Blob')
      passed++
      const outPath = path.join(projectRoot, 'test-kokoro-ort-output.wav')
      const buf = Buffer.from(await blob.arrayBuffer())
      fs.writeFileSync(outPath, buf)
      console.log('  integration: wrote', outPath)
    }
  } catch (e) {
    console.error('  integration:', e?.message || e)
    failed++
  } finally {
    server.close()
  }

  return { passed, failed }
}

async function main() {
  const integration = process.argv.includes('--integration')
  console.log('Kokoro ORT pipeline tests')
  console.log('Unit tests:')
  const unit = await runUnitTests()
  let totalPassed = unit.passed
  let totalFailed = unit.failed

  if (integration) {
    console.log('Integration (--integration):')
    const intResult = await runIntegrationTest()
    totalPassed += intResult.passed
    totalFailed += intResult.failed
  }

  console.log('')
  console.log('Total:', totalPassed, 'passed', totalFailed ? `, ${totalFailed} failed` : '')
  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
