#!/usr/bin/env node
/**
 * Generate static WAV files for all fixed phrases using Kokoro TTS (Node).
 *
 * Output: public/audio/static/<voiceId>/<phraseId>.wav
 *
 * Phrase list: all groups from scripts/staticPhraseData.js (voice_test, intro_no_clothing_1..9,
 * intro_with_clothing_1..27, next_turn_1..4, turn_begins_1..4, ease_in_1..4, session_complete_1..3,
 * settle_into_position_1, phase_checkin_1..9).
 *
 * Requires: Kokoro model. Use --local if you have run `npm run download-kokoro-model`
 * (uses public/models/Kokoro-82M-v1.0-ONNX). Without --local, downloads from HuggingFace on first run.
 *
 * GPU: Use --gpu to run on GPU when available (CUDA on Linux x64, DirectML on Windows x64).
 *      Requires onnxruntime-node with GPU support. Falls back to CPU if GPU load fails.
 *
 * Usage:
 *   node scripts/generate-static-wavs.js [--voice af_nicole] [--phrase voice_test] [--local] [--gpu] [--skip-existing]
 *
 * By default, existing WAVs are overwritten (so re-run after changing phrase text to update audio).
 * Use --skip-existing to only generate missing files (faster when adding new phrases).
 * Use --phrase <id> to regenerate just one phrase (e.g. ease_in_1) for all voices.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STATIC_GROUPS } from './staticPhraseData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const staticRoot = path.join(projectRoot, 'public', 'audio', 'static')

/** All static phrases (id + text) flattened from staticPhraseData – every phrase gets a .wav. */
const STATIC_PHRASES = Object.values(STATIC_GROUPS).flat()

const DEFAULT_VOICES = ['af_nicole', 'af_bella', 'am_liam']

function parseArgs() {
  const args = process.argv.slice(2)
  let voice = null
  let phrase = null
  let useLocal = false
  let useGpu = false
  let skipExisting = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--voice' && args[i + 1]) voice = args[++i]
    else if (args[i] === '--phrase' && args[i + 1]) phrase = args[++i]
    else if (args[i] === '--local') useLocal = true
    else if (args[i] === '--gpu') useGpu = true
    else if (args[i] === '--skip-existing') skipExisting = true
  }
  return { voice, phrase, useLocal, useGpu, skipExisting }
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
  const { voice: filterVoice, phrase: filterPhrase, useLocal, useGpu, skipExisting } = parseArgs()
  const voices = filterVoice ? [filterVoice] : DEFAULT_VOICES
  const phrases = filterPhrase ? STATIC_PHRASES.filter((p) => p.id === filterPhrase) : STATIC_PHRASES
  if (filterPhrase && phrases.length === 0) {
    console.error('Unknown phrase:', filterPhrase)
    process.exit(1)
  }

  for (const voiceId of voices) {
    const dir = path.join(staticRoot, voiceId)
    fs.mkdirSync(dir, { recursive: true })
  }

  const modelId = 'Kokoro-82M-v1.0-ONNX'
  if (useLocal) {
    const localModelDir = path.join(projectRoot, 'public', 'models', modelId)
    if (!fs.existsSync(localModelDir)) {
      console.error('Local model not found at', localModelDir, '- run npm run download-kokoro-model or omit --local')
      process.exit(1)
    }
    await ensureKokoroVoicesForLocal(projectRoot)
    const { env } = await import('@huggingface/transformers')
    env.allowLocalModels = true
    env.allowRemoteModels = false
    env.localModelPath = path.join(projectRoot, 'public', 'models') + path.sep
  }

  const device = useGpu ? 'gpu' : 'cpu'
  const dtype = useGpu ? 'fp32' : 'q8'
  console.log(`Loading Kokoro TTS (device: ${device}${useGpu ? ', prefer GPU (CUDA/DirectML)' : ''})...`)
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
  console.log('Model loaded. Generating WAVs...')

  let done = 0
  const total = voices.length * phrases.length
  for (const voiceId of voices) {
    for (const { id: phraseId, text } of phrases) {
      const outPath = path.join(staticRoot, voiceId, `${phraseId}.wav`)
      if (skipExisting && fs.existsSync(outPath)) {
        done++
        console.log(`[${done}/${total}] ${voiceId}/${phraseId}.wav (skip existing)`)
        continue
      }
      try {
        const audio = await tts.generate(text, { voice: voiceId })
        await audio.save(outPath)
        done++
        console.log(`[${done}/${total}] ${voiceId}/${phraseId}.wav`)
      } catch (e) {
        console.error(`Failed ${voiceId}/${phraseId}:`, e.message)
      }
    }
  }

  const manifestPath = path.join(staticRoot, 'manifest.json')
  const manifest = []
  for (const v of voices) {
    for (const { id: phraseId, text } of phrases) {
      manifest.push({ phraseId, voiceId: v, text })
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  console.log('Wrote', path.relative(projectRoot, manifestPath))
  console.log('Done.', done, 'WAV(s) generated.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
