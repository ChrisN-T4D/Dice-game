/**
 * Generates 3 ready-to-read guided sessions (~60-90 min) using the real
 * session plan builder. Prints, for each session, the full per-turn breakdown
 * AND a timed audio-guide timeline that interleaves every spoken cue (intro,
 * neutral-position flow-backs, clothing cues, instructions, ease-in + start
 * lines, completion) with the silent pauses between them.
 *
 * Heterosexual couple (Sam = penis, Alex = vulva), clothing ON. Each session
 * uses a different intensity curve and length so they read distinctly.
 *
 * Usage: node scripts/preview-3-full-sessions.mjs
 */
import { register } from 'node:module'
import fs from 'node:fs'
register('./_alias-loader.mjs', import.meta.url)

const { buildSessionPlan } = await import('@/utils/sessionPlanBuilder')
const profiles = (await import('@/data/anatomy/profiles/index.js')).default

// Wardrobes: no socks; women's underwear is split into Bra + Panties.
const SESSIONS = [
  {
    title: 'Session A — Slow Burn',
    totalMinutes: 60,
    turnMinutes: 3,
    pauseSeconds: 15,
    intensityCurve: 'slow',
    dist: 'phase1',
    phasePercents: [45, 30, 25],
    clothingP1: ['Watch', 'Shirt', 'Pants', 'Underwear'],
    clothingP2: ['Watch', 'Dress', 'Bra', 'Panties'],
    clothingRemovalMode: 'partner',
    vibratorsPresent: true,
    positionIntensity: 'more_physical',
    phase3PositionMode: 'each_turn',
    phaseCheckInEnabled: true,
  },
  {
    title: 'Session B — Balanced Journey',
    totalMinutes: 75,
    turnMinutes: 3,
    pauseSeconds: 15,
    intensityCurve: 'balanced',
    dist: 'equal',
    phasePercents: [33, 33, 34],
    clothingP1: ['Sweatpants', 'T-shirt', 'Underwear'],
    clothingP2: ['Bra', 'Panties', 'Chemise', 'Robe'],
    clothingRemovalMode: 'self',
    vibratorsPresent: true,
    positionIntensity: 'more_physical',
    phase3PositionMode: 'reuse_rotate',
    phaseCheckInEnabled: true,
  },
  {
    title: 'Session C — The Long Edge',
    totalMinutes: 90,
    turnMinutes: 3,
    pauseSeconds: 15,
    intensityCurve: 'edging',
    dist: 'phase2',
    phasePercents: [30, 40, 30],
    clothingP1: ['Sweatpants', 'Hoodie', 'T-shirt', 'Underwear'],
    clothingP2: ['Stockings', 'Bra', 'Panties', 'Robe'],
    clothingRemovalMode: 'partner',
    vibratorsPresent: true,
    positionIntensity: 'more_physical',
    phase3PositionMode: 'reuse_multi',
    phaseCheckInEnabled: true,
  },
]

const NAMES = { 1: 'Partner 1', 2: 'Partner 2' }
const recvName = (r) => NAMES[r]

function priorityOf(zoneId) {
  const p = profiles[zoneId]
  return (p && p.stimulation && p.stimulation.erogenous_priority) || '-'
}

const lines = []
const out = (s = '') => {
  lines.push(s)
  console.log(s)
}

for (let i = 0; i < SESSIONS.length; i++) {
  const s = SESSIONS[i]
  const cfg = {
    totalMinutes: s.totalMinutes,
    turnMinutes: s.turnMinutes,
    pauseSeconds: s.pauseSeconds,
    clothingRemovalSeconds: 30,
    phasePercents: s.phasePercents,
    clothingEnabled: true,
    clothingListP1: [...(s.clothingP1 || [])],
    clothingListP2: [...(s.clothingP2 || [])],
    clothingRemovalMode: s.clothingRemovalMode,
    distributionMode: s.dist,
    intensityCurve: s.intensityCurve,
    partnerNames: { 1: 'Partner 1', 2: 'Partner 2' },
    partnerAnatomy: { 1: 'penis', 2: 'vulva' },
    phaseCheckInEnabled: s.phaseCheckInEnabled,
    vibratorsPresent: s.vibratorsPresent,
    positionIntensity: s.positionIntensity,
    phase3PositionMode: s.phase3PositionMode,
    phase3MaxPositions: 4,
  }
  const seed = 9000 + i
  const plan = buildSessionPlan(cfg, seed)
  const turns = plan.turns || []

  out('')
  out('#'.repeat(90))
  out(`${s.title}   (~${s.totalMinutes} min, ${turns.length} turns)`)
  out('#'.repeat(90))
  out('SETUP:')
  out(`  Couple:           Partner 1 (penis)  +  Partner 2 (vulva)`)
  out(`  (names are generic so this can be reused as a pre-generated session)`)
  out(`  Length:           ${s.totalMinutes} min total, ~${s.turnMinutes} min/turn, ${s.pauseSeconds}s pause`)
  out(`  Intensity curve:  ${s.intensityCurve}`)
  out(`  Phase split:      ${s.phasePercents.join('/')}%  (build-up = phases 1+2, finish = phase 3)`)
  out(`  Clothing:         ON  |  removed by: ${s.clothingRemovalMode === 'self' ? 'themselves' : 'each other'}`)
    out(`    Partner 1 wears: ${cfg.clothingListP1.join(', ') || '(none)'}`)
    out(`    Partner 2 wears: ${cfg.clothingListP2.join(', ') || '(none)'}`)
  out(`  Vibrators:        ${s.vibratorsPresent ? 'yes' : 'no'}    Finish positions: ${s.positionIntensity} / ${s.phase3PositionMode}`)
  out('='.repeat(90))

  out('')
  out('TURN-BY-TURN:')
  out('-'.repeat(90))
  let lastGroup = null
  for (const t of turns) {
    const group = t.phase === 3 ? 'finish' : 'buildup'
    if (group !== lastGroup) {
      out('')
      out(group === 'finish' ? '>>> FINISH (intimacy positions)' : '>>> BUILD-UP')
      lastGroup = group
    }
    if (t.clothing) out(`   [clothing]  ${t.clothing}`)
    if (t.phase === 3) {
      out(`   Turn ${String(t.turnIndex).padStart(2)} | ${recvName(t.receiver)} receives | position: ${t.where}`)
    } else {
      const coverage = t.overFabric ? `OVER-FABRIC (${t.garment})` : 'direct'
      out(`   Turn ${String(t.turnIndex).padStart(2)} | ${recvName(t.receiver)} receives | zone: ${t.zoneId} (priority ${priorityOf(t.zoneId)}, target ${t.intensity}) | ${coverage}`)
    }
    out(`       ${t.instruction}`)
  }

  out('')
  out('AUDIO GUIDE TIMELINE  ( >>  spoken cue   |   ..  silent pause )')
  out('  (timestamps approximate: spoken lines are estimated at a calm pace)')
  out('-'.repeat(90))

  const turnSec = s.turnMinutes * 60
  const fmtClock = (sec) => {
    const m = Math.floor(sec / 60)
    const ss = Math.round(sec % 60)
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }
  const fmtDur = (sec) => {
    sec = Math.round(sec)
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m${String(sec % 60).padStart(2, '0')}s`
  }
  const estSpeechSec = (text) => {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length
    return Math.max(2, Math.min(20, Math.round(words / 2.6)))
  }

  let clock = 0
  const speak = (text, tag) => {
    out(`  ${fmtClock(clock)}  >>  ${tag ? `[${tag}] ` : ''}${text}`)
    clock += estSpeechSec(text)
  }
  const pause = (sec, label) => {
    if (sec <= 0) return
    out(`         ..  ${fmtDur(sec).padEnd(6)}${label ? `  — ${label}` : ''}`)
    clock += sec
  }

  // Intro + opening (settle into the neutral home position)
  speak(plan.script[0])
  pause(15, 'settle into your neutral position')

  for (const t of turns) {
    const ps = t.phraseStrings || []
    const recv = recvName(t.receiver)
    const isFinish = t.phase === 3
    const clo = t.clothing ? Math.max(20, t.durationSec - turnSec) : 0
    let i = 0
    // Flow-back to neutral (or first-turn intro)
    if (ps[i] != null) {
      speak(ps[i], isFinish ? 'finish' : 'build-up')
      i++
      pause(2, 'settle')
    }
    // Clothing removal cue + undress window
    if (t.clothing && ps[i] != null) {
      speak(ps[i], 'undress')
      i++
      pause(clo, `${recv} is undressed`)
    }
    // Instruction
    if (ps[i] != null) {
      speak(ps[i], 'instruction')
      i++
    }
    // Ease-in / settle phrase, then the "get ready" pause
    if (ps[i] != null) {
      speak(ps[i])
      i++
      pause(15, 'get into position & settle in')
    }
    // Turn-start directive, then the main activity pause
    if (ps[i] != null) {
      speak(ps[i], 'go')
      i++
    }
    pause(turnSec, `${recv} receives — ${isFinish ? 'stay with the position' : 'continue the activity'}`)
  }

  // Trailing line(s) after the last turn (session-complete message)
  const phraseCount = turns.reduce((n, t) => n + (t.phraseStrings ? t.phraseStrings.length : 0), 0)
  plan.script.slice(1 + phraseCount).forEach((line) => speak(line, 'close'))
  out(`  ${fmtClock(clock)}  ==  end of session  (~${Math.round(clock / 60)} min including spoken cues)`)
}

out('')
out('#'.repeat(90))
out('DONE: 3 full sessions generated.')

const file = 'guided-3-full-sessions.txt'
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log(`\n[written] ${file}`)
