/**
 * Progression patterns (scaled by finger-unit distance between steps):
 *
 * A) Near (≤4 FU) — one finger stroke between spots; spillover when pad > zone.
 * B) One-way (medium+) — work A→B, take your time, then action at B.
 * C) Round trip (medium+ only) — out, action at B, back to A, repeat.
 */
import { spokenAnchor, toolFromStep, actionFromCue } from './sequence-anchor-phrasing.js'
import {
  internalVaginalTravel,
  isInternalVaginal,
  VAGINAL_OPENING_ANCHOR,
} from './sequence-zone-depth.js'
import { polishInstruction as polishInstructionText } from './instruction-polish.js'
import { buildMicroConnector } from './sequence-zone-distance.js'
import { pauseCueAfterStep } from './sequence-timing.js'
import {
  buildArrivalLine,
  buildReturnLeg,
  buildTravelLeg,
  placementSpilloverNote,
  stepTravelScale,
  usesRoundTrip,
} from './sequence-zone-distance.js'

export { usesRoundTrip, stepTravelScale, edgeDistanceFu } from './sequence-zone-distance.js'

const GERUNDS = {
  stroke: 'stroking',
  kiss: 'kissing',
  tap: 'tapping',
  knead: 'kneading',
  make: 'making',
  drag: 'dragging',
  trace: 'tracing',
  slide: 'sliding',
  circle: 'circling',
  press: 'pressing',
  flick: 'flicking',
  suck: 'sucking',
  glide: 'gliding',
  flutter: 'fluttering',
  squeeze: 'squeezing',
  roll: 'rolling',
  part: 'parting',
  cup: 'cupping',
  wrap: 'wrapping',
  tease: 'teasing',
  rest: 'resting',
  give: 'giving',
  spiral: 'spiraling',
  touch: 'touching',
  twist: 'twisting',
  spread: 'spreading',
  angle: 'angling',
  curl: 'curling',
  draw: 'drawing',
  focus: 'focusing',
  shift: 'shifting',
  orbit: 'orbiting',
  chop: 'chopping',
  feather: 'feathering',
  tickle: 'tickling',
}

const PLACEMENT_ECHO = {
  throat: /\b(beside|along|over)\s+(the\s+)?windpipe\b/gi,
  neck: /\b(along|on)\s+(the\s+)?side\s+of\s+(the\s+)?neck\b/gi,
}

/** Full landmark chain for placement. */
export function anchorForMovement(zoneId) {
  if (isInternalVaginal(zoneId)) return VAGINAL_OPENING_ANCHOR
  return spokenAnchor(zoneId)
}

const DESTINATION_ECHO =
  /\s+(?:toward|to|at|on|along)\s+(?:the\s+)?(?:deep dome|firm dome|cervix|front wall|back wall|side wall|opening|entrance|vaginal opening|belly-side wall)(?:\s+inside)?\b/gi

/** @param {string} action @param {string} zoneId */
function polishAction(action, zoneId) {
  let a = action.replace(DESTINATION_ECHO, '')
  a = a.replace(/\s+(?:toward|to|at|on|along|through|into)\s*$/i, '')
  a = a.replace(/\s+with\s+(?:fingertips?|fingers?)\s*$/i, '')
  a = a.replace(/\s{2,}/g, ' ').trim()
  if (!a) return action.trim()
  return a
}

/** @deprecated use spotShort / arrivalPhrase */
export function reachLabel(zoneId) {
  return spotShort(zoneId)
}

/**
 * @param {string} cue
 * @param {string} zoneId
 */
export function cleanActionFromCue(cue, zoneId) {
  let a = actionFromCue(cue)
  a = a.replace(/\bvery\s+(lightly|gently|softly)\b/gi, '$1')
  a = a.replace(/\b(very)\s+(light|gentle|soft)\b/gi, '$1')
  a = a.replace(/\s+\bvery\b(?=\s+(beside|along|on|at)\b)/gi, '')
  const echo = PLACEMENT_ECHO[zoneId]
  if (echo) a = a.replace(echo, '').replace(/\s+/g, ' ').trim()
  a = a.replace(/,(\S)/g, ', $1')
  return polishAction(a.replace(/\s+/g, ' ').trim(), zoneId)
}

/** @param {string} action */
function toGerund(action) {
  const a = action.trim()
  const m = a.match(/^(\w+)(.*)$/i)
  if (!m) return a
  const g = GERUNDS[m[1].toLowerCase()]
  return g ? `${g}${m[2]}` : a
}

/**
 * @param {import('./_makeSequenceAction.js').SequenceStep} step
 */
function techniqueManner(step) {
  const tech = step.technique || 'stroke'
  const stim = step.stimulator || 'finger'
  /** @type {Record<string, string>} */
  const byTech = {
    knead: 'kneading deeply',
    stroke:
      stim === 'tongue'
        ? 'stroking with a flat tongue'
        : stim === 'palm' || stim === 'hand'
          ? 'stroking with slow palm passes'
          : stim === 'thumb'
            ? 'stroking with your thumbs'
            : 'stroking lightly',
    kiss: stim === 'lip' ? 'kissing softly' : 'kissing lightly',
    tap: 'tapping lightly',
    circle: 'making slow circles',
    pressure: stim === 'palm' ? 'pressing with steady palm pressure' : 'pressing steadily',
  }
  return byTech[tech] || 'stroking lightly'
}

/**
 * Travel manner from the step cue — kneading, feathering, tapping, etc.
 * @param {string} cue
 * @param {import('./_makeSequenceAction.js').SequenceStep} step
 */
export function travelMannerFromCue(cue, step) {
  const full = (cue || '').trim()
  const a = cleanActionFromCue(cue, step.zone_id)
  const low = full.toLowerCase()

  if (/\bflutter\b/i.test(full)) return 'fluttering light taps'
  if (/\bfeather\b/i.test(full)) return 'feathering lightly'
  if (/\btickl/i.test(full)) return 'tickling softly'
  if (/\bflick\b/i.test(full)) return /light/i.test(a) ? 'flicking lightly' : 'flicking quickly'
  if (/\bknead\b/i.test(full)) {
    if (/deep/i.test(a)) return 'kneading deeply'
    if (/firm/i.test(a)) return 'kneading firmly'
    if (/gentl/i.test(a)) return 'kneading gently'
    return 'kneading firmly'
  }
  if (/\bdrag\b/i.test(full)) return /slow/i.test(a) ? 'dragging slowly' : 'dragging'
  if (/\btrace\b/i.test(full)) {
    if (/slow/i.test(a)) return 'tracing slowly'
    if (/light/i.test(a)) return 'tracing lightly'
    return 'tracing'
  }
  if (/\bkiss\b/i.test(full)) {
    if (/light/i.test(a)) return 'kissing lightly'
    if (/deep|suck/i.test(a)) return 'kissing deeply'
    return 'kissing softly'
  }
  if (/\btap\b/i.test(full)) {
    if (/light|flutter/i.test(a)) return 'tapping lightly'
    if (/firm/i.test(a)) return 'tapping firmly'
    return 'tapping'
  }
  if (/\bstroke\b/i.test(full)) {
    if (/flat tongue|broad tongue/i.test(low)) return 'stroking with a flat tongue'
    if (/long line/i.test(a)) return 'stroking in long lines'
    if (/slow/i.test(a)) return 'stroking slowly'
    if (/light/i.test(a)) return 'stroking lightly'
    if (/firm/i.test(a)) return 'stroking firmly'
    if (/gentl/i.test(a)) return 'stroking gently'
    const stem = a.split(/\s+(along|on|through|in|up|down|across|with)\b/i)[0].trim()
    return toGerund(stem || 'stroke lightly')
  }
  if (/\b(make|circle)\b/i.test(full)) {
    const m = a.match(/make\s+((?:slow|small|light|flat|broad|deep|firm|steady|warm)\s+)*circles?\b/i)
    if (m) return toGerund(`make ${(m[1] || '').trim()} circles`.replace(/\s+/g, ' '))
    if (/circle/i.test(a)) return toGerund(a.split(/\s+(on|at|along|through)\b/i)[0])
  }
  if (/\bflutter\b/i.test(full)) {
    if (/light/i.test(a)) return 'fluttering lightly'
    return 'fluttering'
  }
  if (/\bhold\b/i.test(full)) return toGerund(a)
  if (/\bpress\b/i.test(full)) return toGerund(a.split(/\s+(along|at|on|upward)\b/i)[0] || a)
  if (/\bcup\b/i.test(full)) return toGerund(a)
  if (/\bslide\b/i.test(full)) return toGerund(a)
  if (/\bsuck\b/i.test(full)) return toGerund(a)
  if (/\bsqueeze\b/i.test(full)) return toGerund(a)
  if (/\bspiral\b/i.test(full)) return toGerund(a)
  if (/\bpart\b/i.test(full)) return toGerund(a)
  if (/\bwrap\b/i.test(full)) return toGerund(a)
  if (/\btease\b/i.test(full)) return 'teasing lightly'
  if (/\brest\b/i.test(full)) return toGerund(a)
  if (/\btouch\b/i.test(full)) return /light/i.test(a) ? 'touching lightly' : 'touching gently'
  if (/\bgive\b/i.test(full)) return toGerund(a)
  if (/\bspread\b/i.test(full)) return toGerund(a)

  if (a.length > 4) return toGerund(a.split(/\s+(along|on|through|in|up|down|across)\b/i)[0] || a)
  return techniqueManner(step)
}

/**
 * @param {import('./_makeSequenceAction.js').SequenceStep} step
 * @param {(step: import('./_makeSequenceAction.js').SequenceStep) => string | null} safetyFor
 */
function appendOpeningPlacement(parts, step, tool, anchor) {
  parts.push(`Start with ${tool} ${anchor}.`)
  const padNote = placementSpilloverNote(step)
  if (padNote) parts.push(padNote)
}

function safetyLine(step, safetyFor) {
  const line = safetyFor?.(step)
  if (!line) return ''
  const anchor = anchorForMovement(step.zone_id)
  if (step.zone_id === 'throat' && /windpipe|firm strip|midline/i.test(anchor)) return ''
  if (step.zone_id === 'neck' && /windpipe|throat/i.test(anchor)) return ''
  return line
}

/**
 * @param {import('./_makeSequenceAction.js').SequenceStep} step
 * @param {string} fromZone
 * @param {string} toZone
 * @param {number} stepIndex
 */
function pauseLine(step, fromZone, toZone, stepIndex) {
  const seed = `${fromZone}|${toZone}|${stepIndex}|${step.beats}`
  const scale = stepTravelScale(fromZone, toZone)
  const near = scale === 'micro' || scale === 'short'
  const rt = !near && usesRoundTrip(fromZone, toZone)
  const { spoken, marker } = pauseCueAfterStep(step, seed, {
    roundTrip: rt,
    oneWay: !rt && !near,
    near,
  })
  return `${spoken} ${marker}`
}

/**
 * Pattern A: out → action at destination → back → repeat.
 * @param {import('./_makeSequenceAction.js').SequenceStep[]} steps
 * @param {(i: number) => string} getCue
 * @param {(step: import('./_makeSequenceAction.js').SequenceStep) => string | null} [safetyFor]
 */
function composeTwoStepRoundTrip(steps, getCue, safetyFor) {
  const [s0, s1] = steps
  const cue0 = getCue(0)
  const cue1 = getCue(1)
  const from = s0.zone_id
  const to = s1.zone_id
  const tool = toolFromStep(cue0, s0)
  const anchor = anchorForMovement(from)
  const manner = travelMannerFromCue(cue0, s0)
  const actionAtDest = cleanActionFromCue(cue1, to)
  const leg = buildTravelLeg(manner, from, to, s0, s1, { omitFromSpot: true })

  const parts = []
  appendOpeningPlacement(parts, s0, tool, anchor)
  parts.push(`${cap(leg)}.`, buildArrivalLine(to, actionAtDest, from), buildReturnLeg(from, to))
  const safety = safetyLine(s0, safetyFor)
  if (safety) parts.push(safety)
  parts.push(pauseLine(s0, from, to, 0))
  return parts.join(' ')
}

/**
 * Internal 2-step: enter to first wall → act → optional depth → act (not one jump to cervix).
 */
function composeTwoStepInternalDepth(steps, getCue, safetyFor) {
  const [s0, s1] = steps
  const cue0 = getCue(0)
  const cue1 = getCue(1)
  const from = s0.zone_id
  const to = s1.zone_id
  const tool = toolFromStep(cue0, s0)
  const anchor = anchorForMovement(from)
  const entry =
    internalVaginalTravel('vaginal_introitus', from) ||
    buildTravelLeg(travelMannerFromCue(cue0, s0), 'vaginal_introitus', from, s0, s0, {
      omitFromSpot: true,
    })
  const depth = internalVaginalTravel(from, to)
  const action0 = cleanActionFromCue(cue0, from)
  const action1 = cleanActionFromCue(cue1, to)

  const parts = []
  appendOpeningPlacement(parts, s0, tool, anchor)
  parts.push(`${cap(entry)}.`)
  const safety = safetyLine(s0, safetyFor)
  if (safety) parts.push(safety)
  parts.push(pauseLine(s0, 'vaginal_introitus', from, 0))
  parts.push(`Then ${action0}.`)
  if (depth) {
    parts.push(`${cap(depth)}.`)
    parts.push(pauseLine(s0, from, to, 1))
    parts.push(buildArrivalLine(to, action1, from))
  } else {
    parts.push(buildArrivalLine(to, action1, from))
  }
  return parts.join(' ')
}

/** @param {string} from @param {string} to */
function usesInternalDepthPattern(from, to) {
  return isInternalVaginal(from) && isInternalVaginal(to) && from !== 'vaginal_introitus'
}

/** @param {string} from @param {string} to */
function usesInternalShallowExit(from, to) {
  return isInternalVaginal(from) && to === 'vaginal_introitus'
}

function composeTwoStepInternalExit(steps, getCue, safetyFor) {
  const [s0, s1] = steps
  const cue0 = getCue(0)
  const cue1 = getCue(1)
  const from = s0.zone_id
  const to = s1.zone_id
  const tool = toolFromStep(cue0, s0)
  const anchor = anchorForMovement(from)
  const entry =
    internalVaginalTravel('vaginal_introitus', from) ||
    buildTravelLeg(travelMannerFromCue(cue0, s0), 'vaginal_introitus', from, s0, s0, { omitFromSpot: true })
  const exit = internalVaginalTravel(from, to)
  const action0 = cleanActionFromCue(cue0, from)
  const action1 = cleanActionFromCue(cue1, to)

  const parts = []
  appendOpeningPlacement(parts, s0, tool, anchor)
  parts.push(`${cap(entry)}.`)
  const safety = safetyLine(s0, safetyFor)
  if (safety) parts.push(safety)
  parts.push(pauseLine(s0, 'vaginal_introitus', from, 0))
  parts.push(`Then ${action0}.`)
  if (exit) {
    parts.push(`${cap(exit)}.`)
    parts.push(pauseLine(s0, from, to, 1))
  }
  parts.push(buildArrivalLine(to, action1, from))
  return parts.join(' ')
}

/**
 * Pattern B: travel A→B, take your time, then action at B.
 */
function composeTwoStepOneWay(steps, getCue, safetyFor) {
  const [s0, s1] = steps
  const cue0 = getCue(0)
  const cue1 = getCue(1)
  const from = s0.zone_id
  const to = s1.zone_id
  const tool = toolFromStep(cue0, s0)
  const anchor = anchorForMovement(from)
  const manner = travelMannerFromCue(cue0, s0)
  const actionAtDest = cleanActionFromCue(cue1, to)
  const leg = buildTravelLeg(manner, from, to, s0, s1, { omitFromSpot: true })

  const parts = []
  appendOpeningPlacement(parts, s0, tool, anchor)
  parts.push(`${cap(leg)}.`)
  const safety = safetyLine(s0, safetyFor)
  if (safety) parts.push(safety)
  parts.push(pauseLine(s0, from, to, 0))
  parts.push(buildArrivalLine(to, actionAtDest, from))
  return parts.join(' ')
}

/**
 * Short hop (≤4 FU): one finger stroke, no long "work from … to …".
 */
function composeTwoStepNear(steps, getCue, safetyFor) {
  return composeTwoStepOneWay(steps, getCue, safetyFor)
}

/**
 * Pattern B chain for 3+ steps (each leg is one-way).
 */
function composeMultiStepOneWay(steps, getCue, safetyFor) {
  const parts = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const cue = getCue(i)
    const nextZone = steps[i + 1]?.zone_id

    if (i === 0) {
      const tool = toolFromStep(cue, step)
      const anchor = anchorForMovement(step.zone_id)
      const manner = travelMannerFromCue(cue, step)
      appendOpeningPlacement(parts, step, tool, anchor)
      if (nextZone) {
        const leg = buildTravelLeg(manner, step.zone_id, nextZone, step, steps[i + 1], {
          omitFromSpot: true,
        })
        parts.push(`${cap(leg)}.`)
        const safety = safetyLine(step, safetyFor)
        if (safety) parts.push(safety)
        parts.push(pauseLine(step, step.zone_id, nextZone, i))
      } else {
        parts.push(`${cap(cleanActionFromCue(cue, step.zone_id))}.`)
        const safety = safetyLine(step, safetyFor)
        if (safety) parts.push(safety)
      }
    } else {
      const prevZone = steps[i - 1].zone_id
      const action = cleanActionFromCue(cue, step.zone_id)
      parts.push(buildArrivalLine(step.zone_id, action, prevZone))
      if (nextZone) {
        const scale = stepTravelScale(step.zone_id, nextZone)
        if (scale === 'micro' || scale === 'short') {
          parts.push(`Then ${buildMicroConnector(step.zone_id, nextZone, step, steps[i + 1])}.`)
        } else {
          const manner = travelMannerFromCue(cue, step)
          const leg = buildTravelLeg(manner, step.zone_id, nextZone, step, steps[i + 1])
          parts.push(`Then ${leg.charAt(0).toLowerCase() + leg.slice(1)}.`)
        }
        parts.push(pauseLine(step, step.zone_id, nextZone, i))
      }
    }
  }

  return parts.join(' ')
}

/**
 * @param {import('./_makeSequenceAction.js').SequenceStep[]} steps
 * @param {(index: number) => string} getCue
 * @param {(step: import('./_makeSequenceAction.js').SequenceStep) => string | null} [safetyFor]
 */
export function composeMovementProgression(steps, getCue, safetyFor) {
  const n = steps.length

  let text
  if (n === 1) {
    const step = steps[0]
    const cue = getCue(0)
    const tool = toolFromStep(cue, step)
    const anchor = anchorForMovement(step.zone_id)
    const parts = []
    appendOpeningPlacement(parts, step, tool, anchor)
    parts.push(`${cap(cleanActionFromCue(cue, step.zone_id))}.`)
    const safety = safetyLine(step, safetyFor)
    if (safety) parts.push(safety)
    text = parts.join(' ')
  } else if (n === 2) {
    const from = steps[0].zone_id
    const to = steps[1].zone_id
    const scale = stepTravelScale(from, to)
    if (usesInternalDepthPattern(from, to)) text = composeTwoStepInternalDepth(steps, getCue, safetyFor)
    else if (usesInternalShallowExit(from, to)) text = composeTwoStepInternalExit(steps, getCue, safetyFor)
    else if (usesRoundTrip(from, to)) text = composeTwoStepRoundTrip(steps, getCue, safetyFor)
    else if (scale === 'micro' || scale === 'short') text = composeTwoStepNear(steps, getCue, safetyFor)
    else text = composeTwoStepOneWay(steps, getCue, safetyFor)
  } else {
    text = composeMultiStepOneWay(steps, getCue, safetyFor)
  }
  return polishInstruction(text)
}

/** @param {string} text */
export function polishInstruction(text) {
  return polishInstructionText(text)
}

/** @param {string} s */
function cap(s) {
  const t = s.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

