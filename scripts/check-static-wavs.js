#!/usr/bin/env node
/**
 * Check that every expected static phrase has a .wav file in public/audio/static/<voiceId>/.
 * Reports missing files. Default voice: af_nicole (app default).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STATIC_GROUPS } from './staticPhraseData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const staticRoot = path.join(projectRoot, 'public', 'audio', 'static')

const expectedPhraseIds = Object.values(STATIC_GROUPS).flat().map((p) => p.id)
const defaultVoice = 'af_nicole'

function checkVoice(voiceId) {
  const dir = path.join(staticRoot, voiceId)
  if (!fs.existsSync(dir)) {
    return { voiceId, missing: expectedPhraseIds, existing: [] }
  }
  const files = fs.readdirSync(dir, { withFileTypes: true }).filter((f) => f.isFile() && f.name.endsWith('.wav'))
  const existingIds = files.map((f) => f.name.replace(/\.wav$/, ''))
  const existingSet = new Set(existingIds)
  const missing = expectedPhraseIds.filter((id) => !existingSet.has(id))
  return { voiceId, missing, existing: existingIds }
}

const result = checkVoice(defaultVoice)
const totalExpected = expectedPhraseIds.length

console.log('Static WAV check (public/audio/static)')
console.log('Default voice:', defaultVoice)
console.log('Expected phrase IDs:', totalExpected)
console.log('')

if (result.missing.length === 0) {
  console.log('All', totalExpected, 'static phrase WAVs are present for', defaultVoice + '.')
  process.exit(0)
}

console.log('Missing', result.missing.length, 'of', totalExpected, 'WAV(s) for', defaultVoice + ':')
result.missing.forEach((id) => console.log('  -', id + '.wav'))
console.log('')
console.log('Run: npm run generate-static-wavs -- --local --voice', defaultVoice)
process.exit(1)
