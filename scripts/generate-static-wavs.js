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
 * Voices: with no --voice, uses every *.bin that kokoro-js supports in Node (English/British presets
 * only today), intersected with files in public/models/.../voices/. Otherwise af_nicole, af_bella, am_liam.
 * Run npm run download-kokoro-model first.
 *
 * By default, existing WAVs are overwritten (so re-run after changing phrase text to update audio).
 * Use --skip-existing to only generate missing files (faster when adding new phrases).
 * Use --phrase <id> to regenerate just one phrase (e.g. ease_in_1) for all voices.
 * Use --sensate-preset <id> for a subset: phase1_non_genital | phase1_genital_included (all Node voices).
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

const PHRASE_BY_ID = Object.fromEntries(STATIC_PHRASES.map((p) => [p.id, p]))

/**
 * Phrase ids required for sensate Phase 1 non-genital (see sensateSessionPlanBuilder + shared cues).
 * Order is generation order only.
 */
const SENSATE_PRESET_PHRASE_IDS = {
  phase1_non_genital: [
    'sensate_intro_phase1_non_genital',
    'sensate_first_turn_standard',
    'sensate_first_turn_p2_giver',
    'sensate_turn_complete',
    'sensate_transition_pause_one_minute',
    'sensate_duration_10_min',
    'sensate_p1ng_t2',
    'sensate_p1ng_t3',
    'sensate_p1ng_t3_p2',
    'sensate_p1ng_t4',
    'sensate_p1ng_t5',
    'ease_in_1',
    'turn_begins_1',
  ],
  /** Phase 1 full body / non-demand — same structure as non-genital, different intro + touch lines. */
  phase1_genital_included: [
    'sensate_intro_phase1_genital',
    'sensate_first_turn_standard',
    'sensate_first_turn_p2_giver',
    'sensate_turn_complete',
    'sensate_transition_pause_one_minute',
    'sensate_duration_10_min',
    'sensate_p1g_t2',
    'sensate_p1g_t3',
    'sensate_p1g_t3_p2',
    'sensate_p1g_t4',
    'sensate_p1g_t5',
    'ease_in_1',
    'turn_begins_1',
  ],
}

/**
 * @param {{ phraseId: string, voiceId: string, text: string }[]} existing
 * @param {string[]} voices
 * @param {{ id: string, text: string }[]} phraseRows
 * @param {{ phraseId: string, voiceId: string, text: string }[]} successfulOnly
 */
function mergeManifestEntries(existing, voices, phraseRows, successfulOnly) {
  const voiceSet = new Set(voices)
  const phraseIds = new Set(phraseRows.map((p) => p.id))
  const kept = existing.filter((e) => !(voiceSet.has(e.voiceId) && phraseIds.has(e.phraseId)))
  return [...kept, ...successfulOnly]
}

const DEFAULT_VOICES = ['af_nicole', 'af_bella', 'am_liam']

/** Voice ids kokoro-js (Node) cannot synthesize; af.bin exists but preset name is not `af`. */
const SKIP_TTS_VOICE_IDS = new Set(['af'])

/**
 * Kokoro-JS in Node only exposes this subset (even if extra .bin files are on disk).
 * Non-listed voices still work in-browser with the full ONNX stack.
 */
const NODE_KOKORO_VOICE_IDS = new Set([
  'af_heart',
  'af_alloy',
  'af_aoede',
  'af_bella',
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
  'bf_emma',
  'bf_isabella',
  'bm_george',
  'bm_lewis',
  'bf_alice',
  'bf_lily',
  'bm_daniel',
  'bm_fable',
])

/** @param {string} projectRoot */
function listDownloadedKokoroVoiceIds(projectRoot) {
  const voicesDir = path.join(projectRoot, 'public', 'models', 'Kokoro-82M-v1.0-ONNX', 'voices')
  if (!fs.existsSync(voicesDir)) return []
  return fs
    .readdirSync(voicesDir)
    .filter((f) => f.endsWith('.bin'))
    .map((f) => f.replace(/\.bin$/i, ''))
    .filter((id) => !SKIP_TTS_VOICE_IDS.has(id) && NODE_KOKORO_VOICE_IDS.has(id))
    .sort()
}

function parseArgs() {
  const args = process.argv.slice(2)
  let voice = null
  let phrase = null
  let sensatePreset = null
  let useLocal = false
  let useGpu = false
  let skipExisting = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--voice' && args[i + 1]) voice = args[++i]
    else if (args[i] === '--phrase' && args[i + 1]) phrase = args[++i]
    else if (args[i] === '--sensate-preset' && args[i + 1]) sensatePreset = args[++i]
    else if (args[i] === '--local') useLocal = true
    else if (args[i] === '--gpu') useGpu = true
    else if (args[i] === '--skip-existing') skipExisting = true
  }
  return { voice, phrase, sensatePreset, useLocal, useGpu, skipExisting }
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
  const modelId = 'Kokoro-82M-v1.0-ONNX'
  const { voice: filterVoice, phrase: filterPhrase, sensatePreset, useLocal, useGpu, skipExisting } = parseArgs()
  const fromDisk = listDownloadedKokoroVoiceIds(projectRoot)
  const voices = filterVoice ? [filterVoice] : fromDisk.length > 0 ? fromDisk : DEFAULT_VOICES
  if (!filterVoice && fromDisk.length > 0) {
    const voicesDir = path.join(projectRoot, 'public', 'models', modelId, 'voices')
    const binsOnDisk = fs.existsSync(voicesDir)
      ? fs.readdirSync(voicesDir).filter((f) => f.endsWith('.bin')).length
      : 0
    console.log(
      `Using ${fromDisk.length} voice(s) supported by Node Kokoro` +
        (binsOnDisk ? ` (${binsOnDisk} .bin file(s) on disk)` : ''),
    )
    const afBin = path.join(projectRoot, 'public', 'models', modelId, 'voices', 'af.bin')
    if (fs.existsSync(afBin)) {
      console.log(
        'Note: af.bin is present but voice id "af" is not a kokoro-js Node preset; static playback uses af_nicole WAVs for "af" (see useSpeech staticVoiceDirForUrl).',
      )
    }
  }
  if (filterPhrase && sensatePreset) {
    console.error('Use only one of --phrase or --sensate-preset')
    process.exit(1)
  }

  let phrases
  if (sensatePreset) {
    const ids = SENSATE_PRESET_PHRASE_IDS[sensatePreset]
    if (!ids) {
      console.error('Unknown --sensate-preset:', sensatePreset)
      console.error('Known:', Object.keys(SENSATE_PRESET_PHRASE_IDS).join(', '))
      process.exit(1)
    }
    phrases = ids.map((id) => PHRASE_BY_ID[id]).filter(Boolean)
    if (phrases.length !== ids.length) {
      const missing = ids.filter((id) => !PHRASE_BY_ID[id])
      console.error('Missing phrase definition(s) in staticPhraseData:', missing.join(', '))
      process.exit(1)
    }
    console.log(`Sensate preset "${sensatePreset}": ${phrases.length} phrase(s) × ${voices.length} voice(s)`)
  } else if (filterPhrase) {
    phrases = STATIC_PHRASES.filter((p) => p.id === filterPhrase)
    if (phrases.length === 0) {
      console.error('Unknown phrase:', filterPhrase)
      process.exit(1)
    }
  } else {
    phrases = STATIC_PHRASES
  }

  /** Merge manifest when not doing a full (all phrases × default voice list) run. */
  const partialManifest = Boolean(filterPhrase || sensatePreset || filterVoice)

  for (const voiceId of voices) {
    const dir = path.join(staticRoot, voiceId)
    fs.mkdirSync(dir, { recursive: true })
  }
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
  /** @type {{ phraseId: string, voiceId: string, text: string }[]} */
  const manifestSuccessRows = []
  for (const voiceId of voices) {
    for (const { id: phraseId, text } of phrases) {
      const outPath = path.join(staticRoot, voiceId, `${phraseId}.wav`)
      if (skipExisting && fs.existsSync(outPath)) {
        done++
        manifestSuccessRows.push({ phraseId, voiceId, text })
        console.log(`[${done}/${total}] ${voiceId}/${phraseId}.wav (skip existing)`)
        continue
      }
      try {
        const kokoroVoice = voiceId === 'af' ? 'af_nicole' : voiceId
        const audio = await tts.generate(text, { voice: kokoroVoice })
        await audio.save(outPath)
        done++
        manifestSuccessRows.push({ phraseId, voiceId, text })
        console.log(`[${done}/${total}] ${voiceId}/${phraseId}.wav`)
      } catch (e) {
        console.error(`Failed ${voiceId}/${phraseId}:`, e.message)
      }
    }
  }

  const manifestPath = path.join(staticRoot, 'manifest.json')
  let manifest
  if (partialManifest) {
    let existing = []
    try {
      const raw = fs.readFileSync(manifestPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) existing = parsed
    } catch (_) {}
    manifest = mergeManifestEntries(existing, voices, phrases, manifestSuccessRows)
  } else {
    manifest = manifestSuccessRows
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  console.log(
    partialManifest ? 'Merged' : 'Wrote',
    path.relative(projectRoot, manifestPath),
    partialManifest ? `(${manifest.length} entries)` : '',
  )
  console.log('Done.', done, 'WAV(s) generated.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
