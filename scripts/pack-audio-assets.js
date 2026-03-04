/**
 * Pack public/audio into audio-assets.tar.gz (for Docker AUDIO_ASSETS_URL).
 * Cross-platform (Node). Output in repo root; tarball has top-level "audio" directory.
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const tar = require('tar')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const audioDir = path.join(repoRoot, 'public', 'audio')
const outFile = path.join(repoRoot, 'audio-assets.tar.gz')

if (!fs.existsSync(audioDir) || !fs.statSync(audioDir).isDirectory()) {
  console.error('public/audio not found. Run from repo root and ensure static WAVs exist.')
  process.exit(1)
}

console.log('Packing public/audio into audio-assets.tar.gz...')
await tar.create(
  {
    gzip: true,
    file: outFile,
    cwd: path.join(repoRoot, 'public'),
  },
  ['audio']
)
console.log('Created audio-assets.tar.gz. Upload it and set AUDIO_ASSETS_URL to its URL in Portainer.')
