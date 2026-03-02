#!/usr/bin/env node
/**
 * Generate voice-test WAV files for all English and British Kokoro voices.
 *
 * Output: public/audio/static/<voiceId>/voice_test.wav
 * Phrase: "This is a quick voice test."
 *
 * Requires: Local Kokoro model (auto-detected from public/models/Kokoro-82M-v1.0-ONNX).
 * Run `npm run download-kokoro-model` first if needed. Use --gpu to prefer GPU; falls back to CPU on failure.
 *
 * Usage:
 *   node scripts/generate-voice-test-wavs.js [--gpu]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const staticRoot = path.join(projectRoot, 'public', 'audio', 'static')

const VOICE_TEST_PHRASE = 'This is a quick voice test.'

/** All Kokoro voice IDs for English (en) and British English (en-GB). */
const ENGLISH_AND_BRITISH_VOICE_IDS = [
  'af',
  'af_alloy',
  'af_aoede',
  'af_bella',
  'af_heart',
  'af_jessica',
  'af_kore',
  'af_nicole',
  'af_nova',
  'af_river',
  'af_sarah',
  'af_sky',
  'am_adam',
  'am_echo',
  'am_eric',
  'am_fenrir',
  'am_liam',
  'am_michael',
  'am_onyx',
  'am_puck',
  'am_santa',
  'bf_alice',
  'bf_emma',
  'bf_isabella',
  'bf_lily',
  'bm_daniel',
  'bm_fable',
  'bm_george',
  'bm_lewis',
]

function parseArgs() {
  const args = process.argv.slice(2)
  let useLocal = false
  let useGpu = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--local') useLocal = true
    else if (args[i] === '--gpu') useGpu = true
  }
  return { useLocal, useGpu }
}

async function ensureKokoroVoicesForLocal(projectRoot) {
  const srcVoices = path.join(projectRoot, 'public', 'models', 'Kokoro-82M-v1.0-ONNX', 'voices')
  const kokoroPkg = path.join(projectRoot, 'node_modules', 'kokoro-js')
  const destVoices = path.join(kokoroPkg, 'voices')
  if (!fs.existsSync(srcVoices)) return
  try {
    fs.mkdirSync(destVoices, { recursive: true })
    const files = fs.readdirSync(srcVoices).filter((f) => f.endsWith('.bin'))
    for (const f of files) {
      const src = path.join(srcVoices, f)
      const dest = path.join(destVoices, f)
      if (!fs.existsSync(dest) || fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs) {
        fs.copyFileSync(src, dest)
      }
    }
  } catch (e) {
    console.warn('Could not copy voices to kokoro-js/voices:', e.message)
  }
}

async function main() {
  const { useLocal: useLocalFlag, useGpu } = parseArgs()
  const modelId = 'Kokoro-82M-v1.0-ONNX'
  const localModelDir = path.join(projectRoot, 'public', 'models', modelId)
  const useLocal = useLocalFlag || fs.existsSync(localModelDir)

  if (!useLocal) {
    console.error('Local Kokoro model not found at', localModelDir)
    console.error('Run: npm run download-kokoro-model')
    process.exit(1)
  }

  const voices = ENGLISH_AND_BRITISH_VOICE_IDS
  for (const voiceId of voices) {
    const dir = path.join(staticRoot, voiceId)
    fs.mkdirSync(dir, { recursive: true })
  }

  await ensureKokoroVoicesForLocal(projectRoot)
  const { env } = await import('@huggingface/transformers')
  env.allowLocalModels = true
  env.allowRemoteModels = false
  env.localModelPath = path.join(projectRoot, 'public', 'models') + path.sep

  const device = useGpu ? 'gpu' : 'cpu'
  const dtype = useGpu ? 'fp32' : 'q8'
  console.log(`Generating voice test WAVs for ${voices.length} English/British voices (device: ${device})...`)
  const { KokoroTTS } = await import('kokoro-js')
  let tts
  try {
    tts = await KokoroTTS.from_pretrained(modelId, { dtype, device })
  } catch (e) {
    if (useGpu) {
      console.warn('GPU load failed, falling back to CPU:', e.message)
      tts = await KokoroTTS.from_pretrained(modelId, { dtype: 'q8', device: 'cpu' })
    } else {
      throw e
    }
  }
  console.log('Model loaded. Generating voice_test.wav for each voice...')

  let done = 0
  for (const voiceId of voices) {
    const outPath = path.join(staticRoot, voiceId, 'voice_test.wav')
    try {
      const audio = await tts.generate(VOICE_TEST_PHRASE, { voice: voiceId })
      await audio.save(outPath)
      done++
      console.log(`[${done}/${voices.length}] ${voiceId}/voice_test.wav`)
    } catch (e) {
      console.error(`Failed ${voiceId}:`, e.message)
    }
  }

  console.log('Done.', done, 'voice test WAV(s) generated.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
