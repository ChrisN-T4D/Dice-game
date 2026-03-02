/**
 * Shared helper for static WAV generation with Kokoro (Node).
 * Loads local model, optionally GPU; generates one WAV per (voiceId, phrase) into public/audio/static/<voiceId>/<phraseId>.wav
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultProjectRoot = path.join(__dirname, '..')

export const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'

/** English + British Kokoro voice IDs. */
export const ENGLISH_AND_BRITISH_VOICE_IDS = [
  'af', 'af_alloy', 'af_aoede', 'af_bella', 'af_heart', 'af_jessica', 'af_kore', 'af_nicole',
  'af_nova', 'af_river', 'af_sarah', 'af_sky',
  'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_michael', 'am_onyx', 'am_puck', 'am_santa',
  'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily', 'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis',
]

export async function ensureKokoroVoicesForLocal(projectRoot = defaultProjectRoot) {
  const srcVoices = path.join(projectRoot, 'public', 'models', MODEL_ID, 'voices')
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

/**
 * @param {object} opts
 * @param {string} [opts.projectRoot]
 * @param {string} [opts.staticRoot] - default public/audio/static
 * @param {Array<{ id: string, text: string }>} opts.phrases
 * @param {string[]} [opts.voiceIds] - default ENGLISH_AND_BRITISH_VOICE_IDS
 * @param {boolean} [opts.useGpu]
 * @param {string} [opts.groupName] - for log output
 */
export async function runStaticWavGeneration(opts) {
  const projectRoot = opts.projectRoot ?? defaultProjectRoot
  const staticRoot = opts.staticRoot ?? path.join(projectRoot, 'public', 'audio', 'static')
  const phrases = opts.phrases
  const voiceIds = opts.voiceIds ?? ENGLISH_AND_BRITISH_VOICE_IDS
  const useGpu = !!opts.useGpu
  const groupName = opts.groupName ?? 'static'

  const localModelDir = path.join(projectRoot, 'public', 'models', MODEL_ID)
  if (!fs.existsSync(localModelDir)) {
    throw new Error(`Local Kokoro model not found at ${localModelDir}. Run: npm run download-kokoro-model`)
  }

  await ensureKokoroVoicesForLocal(projectRoot)
  const { env } = await import('@huggingface/transformers')
  env.allowLocalModels = true
  env.allowRemoteModels = false
  env.localModelPath = path.join(projectRoot, 'public', 'models') + path.sep

  const device = useGpu ? 'gpu' : 'cpu'
  const dtype = useGpu ? 'fp32' : 'q8'
  console.log(`Loading Kokoro (device: ${device}) for group "${groupName}"...`)
  const { KokoroTTS } = await import('kokoro-js')
  let tts
  try {
    tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype, device })
  } catch (e) {
    if (useGpu) {
      console.warn('GPU load failed, falling back to CPU:', e.message)
      tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'cpu' })
    } else throw e
  }

  for (const voiceId of voiceIds) {
    fs.mkdirSync(path.join(staticRoot, voiceId), { recursive: true })
  }

  const total = voiceIds.length * phrases.length
  let done = 0
  for (const voiceId of voiceIds) {
    for (const { id: phraseId, text } of phrases) {
      const outPath = path.join(staticRoot, voiceId, `${phraseId}.wav`)
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
  console.log(`Done. ${done}/${total} WAV(s) for "${groupName}".`)
  return done
}
