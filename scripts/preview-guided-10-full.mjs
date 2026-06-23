/**
 * Walks the guided wizard option space across 10 sessions and prints EVERY turn
 * in full (full instruction, zone, zone priority, intensity target), plus every
 * script line (intro, clothing, check-ins, transitions, completion).
 *
 * Heterosexual couple, clothing on. Each session exercises a different
 * combination of the wizard controls:
 *   - intensityCurve: slow / balanced / fast / edging
 *   - phase split (distributionMode -> phasePercents)
 *   - turn length, pauses, vibrators, position intensity
 *   - Finish position mode (each_turn / reuse_rotate / reuse_multi)
 *   - phase check-in on/off
 *   - body-part exclusions (zone/modality filters)
 *
 * Usage: node scripts/preview-guided-10-full.mjs
 */
import { register } from 'node:module'
import fs from 'node:fs'
register('./_alias-loader.mjs', import.meta.url)

const { buildSessionPlan } = await import('@/utils/sessionPlanBuilder')
const { clothingPresets } = await import('@/data/clothing')
const profiles = (await import('@/data/anatomy/profiles/index.js')).default

const MALE_UNDIES = clothingPresets.undergarmentsMale || ['boxers']
const FEMALE_UNDIES = clothingPresets.undergarmentsFemale || ['panties', 'bra']

// Fuller, varied wardrobes (per session) so coverage barriers + motivated
// removal are visible across layers, not just bare undergarments.
const MALE_WARDROBES = [
  clothingPresets.casual,
  clothingPresets.loungeWear,
  clothingPresets.cozy,
  MALE_UNDIES,
]
const FEMALE_WARDROBES = [
  clothingPresets.lingerie,
  clothingPresets.dressCasual,
  clothingPresets.lingerieClassic,
  clothingPresets.athletic,
]

const PHASE_PCTS = {
  equal: [33, 33, 34],
  phase1: [50, 30, 20],
  phase2: [30, 40, 30],
  phase3: [20, 30, 50],
  quickie: [10, 30, 60],
}

// 10 deliberately varied configs covering the wizard controls.
const SESSIONS = [
  { intensityCurve: 'slow', dist: 'phase1', totalMinutes: 30, turnMinutes: 2, pauseSeconds: 15, vibratorsPresent: true, positionIntensity: 'bed_only', phase3PositionMode: 'each_turn', phaseCheckInEnabled: true, excludeWhenTouching: {}, excludeWhenTouched: {} },
  { intensityCurve: 'balanced', dist: 'equal', totalMinutes: 30, turnMinutes: 2, pauseSeconds: 10, vibratorsPresent: true, positionIntensity: 'more_physical', phase3PositionMode: 'each_turn', phaseCheckInEnabled: true, excludeWhenTouching: {}, excludeWhenTouched: {} },
  { intensityCurve: 'fast', dist: 'phase3', totalMinutes: 25, turnMinutes: 2, pauseSeconds: 0, vibratorsPresent: false, positionIntensity: 'more_physical', phase3PositionMode: 'reuse_rotate', phaseCheckInEnabled: false, excludeWhenTouching: {}, excludeWhenTouched: {} },
  { intensityCurve: 'edging', dist: 'phase2', totalMinutes: 40, turnMinutes: 3, pauseSeconds: 15, vibratorsPresent: true, positionIntensity: 'bed_only', phase3PositionMode: 'reuse_multi', phaseCheckInEnabled: true, excludeWhenTouching: {}, excludeWhenTouched: {} },
  { intensityCurve: 'balanced', dist: 'quickie', totalMinutes: 15, turnMinutes: 1, pauseSeconds: 0, vibratorsPresent: false, positionIntensity: 'more_physical', phase3PositionMode: 'each_turn', phaseCheckInEnabled: false, excludeWhenTouching: {}, excludeWhenTouched: {} },
  { intensityCurve: 'fast', dist: 'equal', totalMinutes: 30, turnMinutes: 2, pauseSeconds: 30, vibratorsPresent: true, positionIntensity: 'more_physical', phase3PositionMode: 'each_turn', phaseCheckInEnabled: true, excludeWhenTouching: { licking: true }, excludeWhenTouched: { licking: true } },
  { intensityCurve: 'slow', dist: 'equal', totalMinutes: 35, turnMinutes: 2, pauseSeconds: 15, vibratorsPresent: true, positionIntensity: 'bed_only', phase3PositionMode: 'each_turn', phaseCheckInEnabled: true, excludeWhenTouching: { feet: true }, excludeWhenTouched: { feet: true } },
  { intensityCurve: 'balanced', dist: 'phase1', totalMinutes: 30, turnMinutes: 2, pauseSeconds: 10, vibratorsPresent: true, positionIntensity: 'more_physical', phase3PositionMode: 'each_turn', phaseCheckInEnabled: true, excludeWhenTouching: { nipples: true }, excludeWhenTouched: { nipples: true } },
  { intensityCurve: 'edging', dist: 'phase3', totalMinutes: 40, turnMinutes: 3, pauseSeconds: 15, vibratorsPresent: false, positionIntensity: 'more_physical', phase3PositionMode: 'reuse_rotate', phaseCheckInEnabled: false, excludeWhenTouching: { buttocks: true, perineum: true }, excludeWhenTouched: { buttocks: true, perineum: true } },
  { intensityCurve: 'fast', dist: 'phase2', totalMinutes: 30, turnMinutes: 2, pauseSeconds: 15, vibratorsPresent: true, positionIntensity: 'bed_only', phase3PositionMode: 'reuse_multi', phaseCheckInEnabled: true, excludeWhenTouching: { genitals: true }, excludeWhenTouched: {} },
]

function priorityOf(zoneId) {
  const p = profiles[zoneId]
  return (p && p.stimulation && p.stimulation.erogenous_priority) || '-'
}

const lines = []
const out = (s = '') => {
  lines.push(s)
  console.log(s)
}

const NAMES = { 1: 'Sam', 2: 'Alex' } // Sam = penis, Alex = vulva
const recvName = (r) => NAMES[r]

for (let i = 0; i < SESSIONS.length; i++) {
  const s = SESSIONS[i]
  const cfg = {
    totalMinutes: s.totalMinutes,
    turnMinutes: s.turnMinutes,
    pauseSeconds: s.pauseSeconds,
    clothingRemovalSeconds: 30,
    phasePercents: PHASE_PCTS[s.dist],
    clothingEnabled: true,
    clothingListP1: [...(MALE_WARDROBES[i % MALE_WARDROBES.length] || MALE_UNDIES)],
    clothingListP2: [...(FEMALE_WARDROBES[i % FEMALE_WARDROBES.length] || FEMALE_UNDIES)],
    distributionMode: s.dist,
    intensityCurve: s.intensityCurve,
    partnerNames: { 1: 'Sam', 2: 'Alex' },
    partnerAnatomy: { 1: 'penis', 2: 'vulva' },
    phaseCheckInEnabled: s.phaseCheckInEnabled,
    excludeWhenTouching: s.excludeWhenTouching,
    excludeWhenTouched: s.excludeWhenTouched,
    vibratorsPresent: s.vibratorsPresent,
    positionIntensity: s.positionIntensity,
    phase3PositionMode: s.phase3PositionMode,
    phase3MaxPositions: 4,
  }
  const seed = 2000 + i
  const plan = buildSessionPlan(cfg, seed)
  const turns = plan.turns || []

  out('')
  out('#'.repeat(86))
  out(`SESSION ${i + 1} of 10   (seed ${seed})`)
  out('#'.repeat(86))
  out('WIZARD OPTIONS:')
  out(`  Couple:           Sam (penis)  +  Alex (vulva)   | clothing: ON`)
  out(`  Intensity curve:  ${s.intensityCurve}`)
  out(`  Phase split:      ${s.dist}  -> ${PHASE_PCTS[s.dist].join('/')}%  (build-up = phases 1+2, finish = phase 3)`)
  out(`  Length / turn:    ${s.totalMinutes} min total, ${s.turnMinutes} min/turn, ${s.pauseSeconds}s pause`)
  out(`  Vibrators:        ${s.vibratorsPresent ? 'yes' : 'no'}    Finish positions: ${s.positionIntensity} / ${s.phase3PositionMode}`)
  out(`  Check-in:         ${s.phaseCheckInEnabled ? 'on' : 'off'}`)
  out(`  Excl. when touching: ${JSON.stringify(s.excludeWhenTouching)}`)
  out(`  Excl. when touched:  ${JSON.stringify(s.excludeWhenTouched)}`)
  out(`  Total turns:      ${turns.length}`)
  out('='.repeat(86))

  let lastPhase = null
  for (const t of turns) {
    const phaseLabel = t.phase === 3 ? 'FINISH' : 'BUILD-UP'
    if (t.phase !== lastPhase) {
      out('')
      out(`--- ${phaseLabel} ${t.phase === 3 ? '(Finish positions)' : '(intensity-driven touch)'} ---`)
      lastPhase = t.phase
    }
    if (t.clothing) out(`  [clothing]  ${t.clothing}`)
    if (t.phase === 3) {
      out(`  Turn ${String(t.turnIndex).padStart(2)} | ${recvName(t.receiver)} receives | position: ${t.where}`)
    } else {
      const coverage = t.overFabric ? `OVER-FABRIC (${t.garment})` : 'direct'
      out(`  Turn ${String(t.turnIndex).padStart(2)} | ${recvName(t.receiver)} receives | zone: ${t.zoneId} (priority ${priorityOf(t.zoneId)}, target ${t.intensity}) | ${coverage}`)
    }
    out(`      ${t.instruction}`)
  }

  out('')
  out('FULL SPOKEN SCRIPT (every line, in order):')
  out('-'.repeat(86))
  plan.script.forEach((line, idx) => out(`  ${String(idx + 1).padStart(3)}. ${line}`))
}

out('')
out('#'.repeat(86))
out(`DONE: 10 sessions printed in full.`)

fs.writeFileSync('guided-10-full-sessions.txt', lines.join('\n'), 'utf8')
console.log('\n[written] scripts/guided-10-full-sessions.txt')
