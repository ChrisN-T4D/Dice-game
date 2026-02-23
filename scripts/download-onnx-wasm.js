/**
 * Download ONNX Runtime Web WASM/mjs files into public/onnxruntime-wasm/
 * so Piper TTS works without 404. Folder must be named exactly "onnxruntime-wasm"
 * (not "onnxe-wasm"). Run: node scripts/download-onnx-wasm.js
 * Uses 1.24.2 to match the installed onnxruntime-web version.
 * Only downloads files that exist in the published package (no ort-wasm.wasm / ort-wasm-simd.wasm).
 */
import { mkdir, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'onnxruntime-wasm')
const VERSION = '1.24.2'
// Files that actually exist in onnxruntime-web@1.24.2/dist (no ort-wasm.wasm or ort-wasm-simd.wasm)
const FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
]
const CDNS = [
  `https://unpkg.com/onnxruntime-web@${VERSION}/dist`,
  `https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSION}/dist`,
]

async function fetchWithFallback(file) {
  for (const base of CDNS) {
    const url = `${base}/${file}`
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
      if (res.ok) return await res.arrayBuffer()
      if (res.status === 404) break
    } catch (e) {
      // try next CDN
    }
  }
  return null
}

await mkdir(OUT_DIR, { recursive: true })
for (const file of FILES) {
  const dest = join(OUT_DIR, file)
  const buf = await fetchWithFallback(file)
  if (buf) {
    await writeFile(dest, new Uint8Array(buf))
    console.log(`OK ${file}`)
  } else {
    console.warn(`Skip ${file}: not available (404/timeout)`)
  }
}
