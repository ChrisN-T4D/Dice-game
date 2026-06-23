/**
 * Drives the guided session builder 20 times with varied preferences:
 *  - clothing ENABLED on both partners (male undergarments P1, female P2)
 *  - heterosexual couple (P1 penis, P2 vulva)
 *  - different preference combos per run (distribution, vibrators, position
 *    intensity, phase check-in, body-part exclusions, turn length, pauses)
 *
 * Prints every guided turn (phase, narrowed zone, spoken line) and clothing
 * events, and writes the full report to guided-20-sessions.txt.
 *
 * NOTE: This exercises the TEXT/script pipeline only. Audio (Kokoro TTS) is
 * synthesized in the browser worker and is NOT produced here.
 *
 * Usage: node scripts/preview-guided-20.mjs
 */
import { register } from 'node:module'
import fs from 'node:fs'
register('./_alias-loader.mjs', import.meta.url)

const { buildSessionPlan } = await import('@/utils/sessionPlanBuilder')
const { clothingPresets } = await import('@/data/clothing')

const MALE_UNDIES = clothingPresets.undergarmentsMale || ['boxers']
const FEMALE_UNDIES = clothingPresets.undergarmentsFemale || ['panties', 'bra']

const DIST_MODES = ['equal', 'phase1', 'phase2', 'phase3', 'quickie']
const PHASE_PCTS = {
  equal: [33, 33, 34],
  phase1: [50, 30, 20],
  phase2: [30, 40, 30],
  phase3: [20, 30, 50],
  quickie: [10, 30, 60],
}

// A few body-part exclusion combos to vary "preferences".
const EXCLUDE_COMBOS = [
  {},
  { licking: true },
  { feet: true },
  { licking: true, feet: true },
  { genitals: true },
]

function makeConfig(i) {
  const mode = DIST_MODES[i % DIST_MODES.length]
  const quick = mode === 'quickie'
  return {
    totalMinutes: quick ? 15 : [20, 30, 40][i % 3],
    turnMinutes: quick ? 1 : [1, 2, 3][i % 3],
    pauseSeconds: [0, 10, 15, 30, 60][i % 5],
    clothingRemovalSeconds: 30,
    phasePercents: PHASE_PCTS[mode],
    clothingEnabled: true,
    clothingListP1: [...MALE_UNDIES],
    clothingListP2: [...FEMALE_UNDIES],
    distributionMode: mode,
    partnerNames: { 1: 'Sam', 2: 'Alex' },
    partnerAnatomy: { 1: 'penis', 2: 'vulva' },
    phaseCheckInEnabled: i % 2 === 0,
    excludeWhenTouching: EXCLUDE_COMBOS[i % EXCLUDE_COMBOS.length],
    excludeWhenTouched: EXCLUDE_COMBOS[(i + 2) % EXCLUDE_COMBOS.length],
    vibratorsPresent: i % 2 === 0,
    positionIntensity: i % 2 === 0 ? 'more_physical' : 'bed_only',
    phase3PositionMode: ['each_turn', 'reuse_rotate', 'reuse_multi'][i % 3],
    phase3MaxPositions: 4,
    // useActionCatalog intentionally omitted -> defaults ON (as in the app)
  }
}

const lines = []
const out = (s = '') => {
  lines.push(s)
  console.log(s)
}

let totalTurns = 0
let p12Turns = 0
let catalogCounted = 0
let clothingEvents = 0

for (let i = 0; i < 20; i++) {
  const cfg = makeConfig(i)
  const seed = 1000 + i
  const plan = buildSessionPlan(cfg, seed)
  const turns = plan.turns || []
  totalTurns += turns.length

  out('')
  out('='.repeat(78))
  out(
    `SESSION ${String(i + 1).padStart(2)}  seed=${seed}  mode=${cfg.distributionMode}  ` +
      `turn=${cfg.turnMinutes}m  total=${cfg.totalMinutes}m  vibr=${cfg.vibratorsPresent}  ` +
      `pos=${cfg.positionIntensity}  checkin=${cfg.phaseCheckInEnabled}`
  )
  out(
    `  excludeTouching=${JSON.stringify(cfg.excludeWhenTouching)}  ` +
      `excludeTouched=${JSON.stringify(cfg.excludeWhenTouched)}  turns=${turns.length}`
  )
  out('-'.repeat(78))

  for (const t of turns) {
    if (t.phase === 1 || t.phase === 2) p12Turns++
    if (t.clothing) {
      clothingEvents++
      out(`  [clothing] ${t.clothing}`)
    }
    const say = t.shortInstruction || t.instruction || ''
    out(`  P${t.phase} turn ${String(t.turnIndex).padStart(2)} | ${t.receiver === 2 ? 'Alex' : 'Sam'} receives | where: ${t.where}`)
    out(`     ${say}`)
  }
}

out('')
out('='.repeat(78))
out('SUMMARY')
out(`  sessions: 20`)
out(`  total turns: ${totalTurns}`)
out(`  phase 1+2 turns: ${p12Turns}`)
out(`  clothing-removal events: ${clothingEvents}`)
out('')
out('AUDIO: not generated here. buildSessionPlan() produces only the text script.')
out('Audio is synthesized in-browser by the Kokoro TTS worker (onnxruntime-web)')
out('during guided playback / pre-cooking, which cannot run in Node.')

fs.writeFileSync('guided-20-sessions.txt', lines.join('\n'), 'utf8')
console.log('\n[written] guided-20-sessions.txt')
