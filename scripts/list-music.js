#!/usr/bin/env node
/**
 * Scan public/music/*.mp3 and write public/music/manifest.json so the app
 * can build the music dropdown from your actual files. Run after adding or
 * renaming .mp3 files in public/music/.
 *
 * Usage: node scripts/list-music.js
 * Or: npm run list-music
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const musicDir = path.join(__dirname, '..', 'public', 'music')
const manifestPath = path.join(musicDir, 'manifest.json')

const MAX_TITLE_LEN = 28

function shortTitle(str) {
  let s = str
    .replace(/[-_]+/g, ' ')
    .replace(/\s*\d{5,}\s*$/, '') // strip trailing long numbers (e.g. 439285)
    .replace(/\s+/g, ' ')
    .trim()
  s = s.replace(/\b\w/g, (c) => c.toUpperCase())
  if (s.length > MAX_TITLE_LEN) s = s.slice(0, MAX_TITLE_LEN - 1).trim() + '…'
  return s || str.replace(/\.mp3$/i, '')
}

if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true })
  console.log('Created public/music/ – add .mp3 files and run this script again.')
  process.exit(0)
}

const files = fs.readdirSync(musicDir).filter((f) => f.toLowerCase().endsWith('.mp3'))
const tracks = files.map((f) => {
  const id = f.replace(/\.mp3$/i, '')
  return { id, title: shortTitle(id) }
})

// Default playlists: first half = Smooth Jazz, second half = R&B
const ids = tracks.map((t) => t.id)
const mid = Math.ceil(ids.length / 2)
const playlists = [
  { id: 'smoothJazz', title: 'Smooth Jazz', trackIds: ids.slice(0, mid) },
  { id: 'rnb', title: 'R&B', trackIds: ids.slice(mid) },
].filter((p) => p.trackIds.length > 0)

const manifest = { tracks, playlists }
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.log(`Wrote ${tracks.length} track(s) and ${playlists.length} playlist(s) to public/music/manifest.json`)
if (tracks.length === 0) console.log('Add .mp3 files to public/music/ and run again.')
