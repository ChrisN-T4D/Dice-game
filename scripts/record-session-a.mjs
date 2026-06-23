/**
 * Renders Session A's spoken guided script to an SSML file for a quick audio
 * preview. Long activity pauses are compressed (capped at ~2.5s) so you can hear
 * the FLOW of the whole session in a few minutes instead of ~65 real-time.
 *
 * Usage:
 *   node scripts/record-session-a.mjs            # writes session-a.ssml
 * then synthesize to WAV with Windows speech (see the printed command).
 */
import { register } from 'node:module'
import fs from 'node:fs'
register('./_alias-loader.mjs', import.meta.url)

const { buildSessionPlan } = await import('@/utils/sessionPlanBuilder')

// Same config + seed as Session A in scripts/preview-3-full-sessions.mjs.
const cfg = {
  totalMinutes: 60,
  turnMinutes: 3,
  pauseSeconds: 15,
  clothingRemovalSeconds: 30,
  phasePercents: [45, 30, 25],
  clothingEnabled: true,
  clothingListP1: ['Watch', 'Shirt', 'Pants', 'Underwear'],
  clothingListP2: ['Watch', 'Dress', 'Bra', 'Panties'],
  clothingRemovalMode: 'partner',
  distributionMode: 'phase1',
  intensityCurve: 'slow',
  partnerNames: { 1: 'Partner 1', 2: 'Partner 2' },
  partnerAnatomy: { 1: 'penis', 2: 'vulva' },
  vibratorsPresent: true,
  positionIntensity: 'more_physical',
  phase3PositionMode: 'each_turn',
  phase3MaxPositions: 4,
}

const plan = buildSessionPlan(cfg, 9000)
const turns = plan.turns || []
const turnSec = cfg.turnMinutes * 60

// Build an ordered list of { speak } / { pause(sec) } events from the plan.
const events = []
const speak = (t) => t && events.push({ speak: String(t) })
const pause = (sec) => sec > 0 && events.push({ pause: sec })

speak(plan.script[0])
pause(15)
for (const t of turns) {
  const ps = t.phraseStrings || []
  const clo = t.clothing ? Math.max(20, t.durationSec - turnSec) : 0
  let i = 0
  if (ps[i] != null) { speak(ps[i]); i++; pause(2) }
  if (t.clothing && ps[i] != null) { speak(ps[i]); i++; pause(clo) }
  if (ps[i] != null) { speak(ps[i]); i++ }            // instruction
  if (ps[i] != null) { speak(ps[i]); i++; pause(15) } // ease-in
  if (ps[i] != null) { speak(ps[i]); i++ }            // go
  pause(turnSec)
}
const phraseCount = turns.reduce((n, t) => n + (t.phraseStrings ? t.phraseStrings.length : 0), 0)
plan.script.slice(1 + phraseCount).forEach(speak)

// Compress pauses so the recording is listenable: floor 0.5s, cap 2.5s.
const pauseMs = (sec) => Math.round(Math.min(2.5, Math.max(0.5, sec)) * 1000)

const xmlEscape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const body = events
  .map((e) =>
    e.speak != null
      ? `  <s>${xmlEscape(e.speak)}</s>`
      : `  <break time="${pauseMs(e.pause)}ms"/>`
  )
  .join('\n')

const ssml = `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
<prosody rate="-10%">
${body}
</prosody>
</speak>
`

const file = 'session-a.ssml'
fs.writeFileSync(file, ssml, 'utf8')
const spoken = events.filter((e) => e.speak != null).length
console.log(`[written] ${file}  (${spoken} spoken lines, ${events.length} events)`)
