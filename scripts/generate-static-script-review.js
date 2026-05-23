#!/usr/bin/env node
/**
 * Generate a markdown review document listing all static audio script variations.
 * Use this to listen through WAVs (e.g. public/audio/static/af_nicole/<phraseId>.wav)
 * and mark which sound natural or need rewrites.
 *
 * Usage: node scripts/generate-static-script-review.js
 * Output: docs/static-audio-script-review.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STATIC_GROUPS } from './staticPhraseData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const outPath = path.join(projectRoot, 'docs', 'static-audio-script-review.md')

const GROUP_LABELS = {
  voice_test: 'Voice test',
  intro_no_clothing: 'Intro (no clothing)',
  intro_with_clothing: 'Intro (with clothing)',
  home_transition: 'Home default (between directions)',
  turn_start_directive: 'Turn-start directive',
  ease_in: 'Ease in / settle into position',
  session_complete: 'Session complete',
  settle_into_position: 'Settle into position',
  phase_checkin: 'Phase check-in',
  sensate: 'Sensate static',
  next_turn: 'Next turn / time to switch (legacy)',
  turn_begins: 'Turn begins (legacy)',
}

function run() {
  const lines = [
    '# Static audio script review',
    '',
    'Use this list to verify each phrase sounds natural when spoken by TTS. Listen to the WAVs (e.g. `public/audio/static/af_nicole/<phraseId>.wav`) or play them in the app, then mark or edit as needed.',
    '',
    '**How to listen:** After running `npm run generate-static-wavs`, open `public/audio/static/af_nicole/` and play each file, or use the app in guided mode to hear phrases in context.',
    '',
    '**To change wording:** Edit phrases under `src/data/prompts/` (see `guided/session-static.js` and related files), then re-run `npm run generate-static-wavs` to regenerate WAVs.',
    '',
    '---',
    '',
  ]

  for (const [groupKey, phrases] of Object.entries(STATIC_GROUPS)) {
    const label = GROUP_LABELS[groupKey] || groupKey
    lines.push(`## ${label}`)
    lines.push('')
    for (const { id, text } of phrases) {
      lines.push(`- **\`${id}\`**`)
      const escaped = text.replace(/"/g, '\\"')
      lines.push(`  - "${escaped}"`)
      lines.push('')
    }
    lines.push('')
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
  console.log('Wrote', path.relative(projectRoot, outPath))
}

run()
