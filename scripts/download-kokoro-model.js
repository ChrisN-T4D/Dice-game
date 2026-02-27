/**
 * Download the full Kokoro TTS model + ALL voice .bin files from Hugging Face
 * into public/models/Kokoro-82M-v1.0-ONNX/ so the app serves everything from
 * your own domain (no runtime HuggingFace dependency).
 *
 * Run: node scripts/download-kokoro-model.js
 *
 * Skips files that already exist locally (use --force to re-download all).
 */
import { mkdir, writeFile, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HF_REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const BASE = 'https://huggingface.co/' + HF_REPO + '/resolve/main/'
const OUT_ROOT = join(__dirname, '..', 'public', 'models', 'Kokoro-82M-v1.0-ONNX')

const FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_quantized.onnx',
  'voices/af.bin',
  'voices/af_alloy.bin',
  'voices/af_aoede.bin',
  'voices/af_bella.bin',
  'voices/af_heart.bin',
  'voices/af_jessica.bin',
  'voices/af_kore.bin',
  'voices/af_nicole.bin',
  'voices/af_nova.bin',
  'voices/af_river.bin',
  'voices/af_sarah.bin',
  'voices/af_sky.bin',
  'voices/am_adam.bin',
  'voices/am_echo.bin',
  'voices/am_eric.bin',
  'voices/am_fenrir.bin',
  'voices/am_liam.bin',
  'voices/am_michael.bin',
  'voices/am_onyx.bin',
  'voices/am_puck.bin',
  'voices/am_santa.bin',
  'voices/bf_alice.bin',
  'voices/bf_emma.bin',
  'voices/bf_isabella.bin',
  'voices/bf_lily.bin',
  'voices/bm_daniel.bin',
  'voices/bm_fable.bin',
  'voices/bm_george.bin',
  'voices/bm_lewis.bin',
  'voices/ef_dora.bin',
  'voices/em_alex.bin',
  'voices/em_santa.bin',
  'voices/ff_siwis.bin',
  'voices/hf_alpha.bin',
  'voices/hf_beta.bin',
  'voices/hm_omega.bin',
  'voices/hm_psi.bin',
  'voices/if_sara.bin',
  'voices/im_nicola.bin',
  'voices/jf_alpha.bin',
  'voices/jf_gongitsune.bin',
  'voices/jf_nezumi.bin',
  'voices/jf_tebukuro.bin',
  'voices/jm_kumo.bin',
  'voices/pf_dora.bin',
  'voices/pm_alex.bin',
  'voices/pm_santa.bin',
  'voices/zf_xiaobei.bin',
  'voices/zf_xiaoni.bin',
  'voices/zf_xiaoxiao.bin',
  'voices/zf_xiaoyi.bin',
  'voices/zm_yunjian.bin',
  'voices/zm_yunxi.bin',
  'voices/zm_yunxia.bin',
  'voices/zm_yunyang.bin',
]

const TIMEOUT_MS = 300_000
const force = process.argv.includes('--force')

async function exists(path) {
  try { await stat(path); return true } catch { return false }
}

async function download(path) {
  const url = BASE + path
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`)
  return res.arrayBuffer()
}

async function main() {
  console.log('Downloading Kokoro model to public/models/Kokoro-82M-v1.0-ONNX/ ...')
  let downloaded = 0
  let skipped = 0
  for (const rel of FILES) {
    const dest = join(OUT_ROOT, rel)
    if (!force && await exists(dest)) {
      skipped++
      continue
    }
    await mkdir(dirname(dest), { recursive: true })
    const buf = await download(rel)
    await writeFile(dest, new Uint8Array(buf))
    const sizeMB = (buf.byteLength / 1024 / 1024).toFixed(2)
    console.log('OK', rel, `(${sizeMB} MB)`)
    downloaded++
  }
  console.log(`Done. ${downloaded} downloaded, ${skipped} already existed.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
