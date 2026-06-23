import { placementForZone } from './zone-placement.js'
import { spokenZone } from './sequence-spoken-zones.js'
import { safetyNoteForSpeech } from './safety-phrasing.js'
import { inferSequenceFlow, stripZoneFromCue, zonePhrase } from './sequence-zone-phrasing.js'
import { actionFromCue, spokenAnchor, toolFromStep } from './sequence-anchor-phrasing.js'
import { enrichRetracePhrase, enrichSensualPhrase } from './sensual-phrasing.js'
import { clarifySequenceCue } from './sequence-cue-detail.js'
import { pauseCueAfterStep } from './sequence-timing.js'
import { directivePlaceThenAct } from './sequence-anchor-phrasing.js'
import { polishInstruction, trimInstructionToMax } from './instruction-polish.js'
import { composeMovementProgression, travelMannerFromCue } from './sequence-movement-phrasing.js'
import { mannerAsDirective, placementSpilloverNote } from './sequence-zone-distance.js'
import { spotShort } from './body-landmark-anchors.js'

export const SEQUENCE_INSTRUCTION_MAX = 650

/**
 * @typedef {{ type: 'speak', text: string } | { type: 'pause', seconds: number }} SequenceInstructionPart
 */

/**
 * Spoken instructions for multi-zone sequences inside a guided touch block.
 * @param {import('./_makeSequenceAction.js').SequenceStep[]} steps
 * @param {{ maxLen?: number, flow?: 'progression' | 'sweep', path?: string[], erogenous_weight?: number }} [opts]
 * @returns {{ instruction: string, parts: SequenceInstructionPart[] }}
 */
export function composeSequenceInstruction(steps, opts = {}) {
  const maxLen = opts.maxLen ?? SEQUENCE_INSTRUCTION_MAX
  if (!steps?.length) return { instruction: '', parts: [] }

  const path = opts.path ?? steps.map((s) => s.zone_id)
  const flow = inferSequenceFlow(path, opts.flow)

  const text =
    flow === 'sweep' && steps.length >= 2 && steps.length <= 3
      ? composeSweep(steps, opts)
      : composeProgression(steps, opts)

  let instruction = polishInstruction(text.replace(/\s+/g, ' ').trim())
  if (instruction.length > maxLen) {
    instruction = instruction
      .replace(/\s*A full palm is wider than[^.]+\./gi, '')
      .replace(/\s*Your palm is broader than[^.]+\./gi, '')
      .replace(/\s*Your (?:lips|tongue) are wider than[^.]+\./gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  if (instruction.length > maxLen) {
    instruction = trimInstructionToMax(instruction, maxLen)
  }
  const parts = instructionPartsFromText(instruction)
  return { instruction, parts }
}

/** @param {string} instruction */
function instructionPartsFromText(instruction) {
  const re = /\[pause:(\d+)s\]/gi
  const parts = /** @type {SequenceInstructionPart[]} */ ([])
  let last = 0
  let m
  while ((m = re.exec(instruction)) !== null) {
    if (m.index > last) {
      const t = instruction.slice(last, m.index).replace(/\s+/g, ' ').trim()
      if (t) parts.push({ type: 'speak', text: t })
    }
    parts.push({ type: 'pause', seconds: Number(m[1]) || 7 })
    last = m.index + m[0].length
  }
  if (last < instruction.length) {
    const t = instruction.slice(last).replace(/\s+/g, ' ').trim()
    if (t) parts.push({ type: 'speak', text: t })
  }
  return parts.length ? parts : [{ type: 'speak', text: instruction }]
}

/** @param {import('./_makeSequenceAction.js').SequenceStep[]} steps @param {object} opts */
function composeProgression(steps, opts) {
  const n = steps.length
  const glossed = new Set()

  if (n >= 2) {
    return composeMovementProgression(
      steps,
      (i) => cueForStep(steps[i].cue?.trim() || defaultCue(steps[i]), steps, i),
      (step) => {
        const place = placementForZone(step.zone_id)
        return safetyNoteForSpeech(place.avoid, step.zone_id)
      }
    )
  }

  const step = steps[0]
  const place = placementForZone(step.zone_id)
  const ctx = enrichCtx(step, 0, opts, 1)
  const raw = cueForStep(step.cue?.trim() || defaultCue(step), steps, 0)
  const enrichAction = (action, actCtx) =>
    enrichSensualPhrase(action, { ...ctx, ...actCtx, form: 'verb' })
  let segment = directivePlaceThenAct(step, raw, glossed, enrichAction)
  const safety = safetyNoteForSpeech(place.avoid, step.zone_id)
  if (safety) segment += ` ${safety}`
  return segment
}

/** @param {string} cue @param {import('./_makeSequenceAction.js').SequenceStep[]} steps */
function cueForStep(cue, steps, index) {
  const step = steps[index]
  let c = stripZoneFromCue(cue, step.zone_id)
  if (index === 0) {
    for (let j = 1; j < steps.length; j++) {
      c = stripZoneFromCue(c, steps[j].zone_id)
    }
  }
  c = clarifySequenceCue(c, step)
  return normalizeCue(c)
}

/** @param {import('./_makeSequenceAction.js').SequenceStep} step @param {number} i @param {object} opts */
function enrichCtx(step, i, opts, totalSteps) {
  return {
    zoneId: step.zone_id,
    stepIndex: i,
    totalSteps,
    technique: step.technique,
    erogenousWeight: opts.erogenous_weight,
  }
}

/** Continuous pass through adjacent zones, then retrace. */
function composeSweep(steps, opts) {
  const n = steps.length
  const s0 = steps[0]
  const raw0 = cueForStep(s0.cue?.trim() || defaultCue(s0), steps, 0)
  const manner0 = travelMannerFromCue(raw0, s0)
  const directive0 = mannerAsDirective(manner0)
  const act0 = directive0.charAt(0).toUpperCase() + directive0.slice(1)
  const place = placementForZone(steps[0].zone_id)
  const startSpot = spotShort(s0.zone_id)
  const retrace = enrichRetracePhrase(
    `${steps[0].zone_id}|${steps.map((s) => s.zone_id).join('>')}`,
    enrichCtx(steps[0], 0, opts, n)
  )
  const retraceLine = `${retrace.charAt(0).toUpperCase() + retrace.slice(1)} to ${startSpot}.`

  const anchor0 = spokenAnchor(s0.zone_id)
  const tool0 = toolFromStep(raw0, s0)
  const open = /^(from|at|on the penis|under the penis)\b/i.test(anchor0)
    ? `Start with ${tool0} ${anchor0}.`
    : anchor0.startsWith('where ')
      ? `Place ${tool0} ${anchor0}.`
      : `Put ${tool0} ${anchor0}.`

  const dest1 = spotShort(steps[1].zone_id)

  const padNote = placementSpilloverNote(s0)

  if (n === 2) {
    const pause = pauseCueAfterStep(steps[0], `${steps[0].zone_id}|sweep2`)
    let text = `${open}${padNote ? ` ${padNote}` : ''} ${act0} across ${dest1}. ${pause.spoken} ${pause.marker} ${retraceLine}`
    if (place.avoid) {
      text += ` ${safetyNoteForSpeech(place.avoid, s0.zone_id)}`
    }
    return text
  }

  const dest2 = spotShort(steps[2].zone_id)
  const pause = pauseCueAfterStep(steps[0], `${steps[0].zone_id}|sweep`)
  let text = `${open}${padNote ? ` ${padNote}` : ''} ${act0} across ${dest1} and ${dest2}. ${retraceLine} ${pause.spoken} ${pause.marker}`
  if (place.avoid) text += ` ${safetyNoteForSpeech(place.avoid, s0.zone_id)}`
  return text
}

/** @param {string} s */
function sentenceCase(s) {
  const t = s.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** @param {string} cue */
function normalizeCue(cue) {
  let c = cue.replace(/\s+/g, ' ').trim().replace(/\.$/, '')
  c = c.replace(/—/g, ',').replace(/–/g, ',')
  if (/^[A-Z]/.test(c)) c = c.charAt(0).toLowerCase() + c.slice(1)
  return c
}

/** First step after "Start by …" — use -ing form when possible for natural speech. */
function cueForStartBy(cue) {
  const c = normalizeCue(cue)
  const m = c.match(/^(\w+)(.*)$/)
  if (!m) return c
  const verb = m[1]
  const rest = m[2]
  const gerund = START_BY_GERUND[verb]
  return gerund ? `${gerund}${rest}` : c
}

const START_BY_GERUND = {
  trace: 'tracing',
  stroke: 'stroking',
  kiss: 'kissing',
  tap: 'tapping',
  make: 'making',
  circle: 'circling',
  knead: 'kneading',
  press: 'pressing',
  hold: 'holding',
  drag: 'dragging',
  flick: 'flicking',
  flutter: 'fluttering',
  squeeze: 'squeezing',
  roll: 'rolling',
  part: 'parting',
  cup: 'cupping',
  wrap: 'wrapping',
  seal: 'sealing',
  give: 'giving',
  rest: 'resting',
  draw: 'drawing',
  glide: 'gliding',
  spiral: 'spiraling',
  widen: 'widening',
  narrow: 'narrowing',
  continue: 'continuing',
  finish: 'finishing',
  tease: 'teasing',
  angle: 'angling',
  curl: 'curling',
  exhale: 'breathing',
  slide: 'sliding',
  focus: 'focusing',
  twist: 'twisting',
  shift: 'shifting',
}

/** @param {import('./_makeSequenceAction.js').SequenceStep} step */
function defaultCue(step) {
  const stim = step.stimulator || 'finger'
  const tech = step.technique || 'stroke'
  if (tech === 'circle') return `make slow ${stim} circles`
  if (tech === 'kiss') return stim === 'lip' ? 'kiss' : `kiss with the ${stim}`
  if (tech === 'tap') return `tap with the ${stim}`
  if (tech === 'pressure') return `press in and ease off with the ${stim}`
  return `stroke with the ${stim}`
}
