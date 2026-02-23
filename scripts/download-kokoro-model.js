/**
 * Download Kokoro TTS model (Nicole etc.) from Hugging Face into public/models/Kokoro-82M-v1.0-ONNX/
 * so the app can ship the model with the build and avoid runtime download (~92MB).
 *
 * Run: node scripts/download-kokoro-model.js
 *
 * Requires network. Files are written to public/models/Kokoro-82M-v1.0-ONNX/
 * matching the structure expected by kokoro-js with @huggingface/transformers
 * (allowLocalModels=true, localModelPath='/models/', modelId='Kokoro-82M-v1.0-ONNX').
 */
import { mkdir, writeFile } from 'fs/promises'
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
  'onnx/model_quantized.onnx', // q8 dtype (~92MB)
  'voices/af_nicole.bin',
  'voices/af_heart.bin',
  'voices/am_echo.bin',
  'voices/am_eric.bin',
]

const TIMEOUT_MS = 300_000 // 5 min for large file

async function download(path) {
  const url = BASE + path
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`)
  return res.arrayBuffer()
}

async function main() {
  console.log('Downloading Kokoro model to public/models/Kokoro-82M-v1.0-ONNX/ ...')
  for (const rel of FILES) {
    const dest = join(OUT_ROOT, rel)
    await mkdir(dirname(dest), { recursive: true })
    const buf = await download(rel)
    await writeFile(dest, new Uint8Array(buf))
    const sizeMB = (buf.byteLength / 1024 / 1024).toFixed(2)
    console.log('OK', rel, `(${sizeMB} MB)`)
  }
  console.log('Done. Kokoro model is ready for local load (useSpeech will use it when packaged).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
