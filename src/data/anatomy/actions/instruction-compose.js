/**
 * Turn blueprint motions + zone placement into human how-to instructions.
 */

import { placementForZone } from './zone-placement.js'
import { placementSpilloverNote } from './sequence-zone-distance.js'
import { safetyNoteForSpeech } from './safety-phrasing.js'
import { enrichSensualPhrase } from './sensual-phrasing.js'
import { polishInstruction, trimInstructionToMax } from './instruction-polish.js'

const SINGLE_INSTRUCTION_MAX = 250

/**
 * Pick one phrasing from a string | string[] deterministically by zone, so a
 * zone always reads the same (repeatable) while different zones vary.
 * @param {string | string[]} value @param {string} zoneId @param {string} salt
 */
function pickVariant(value, zoneId, salt = '') {
  if (!Array.isArray(value)) return value
  if (value.length === 1) return value[0]
  const seed = `${zoneId}|${salt}`
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return value[Math.abs(h) % value.length]
}

/** @param {string} note @param {string} text */
function instructionAlreadyHasPadNote(note, text) {
  if (!note) return true
  const snippet = note.slice(0, 36).toLowerCase()
  return text.toLowerCase().includes(snippet)
}

/**
 * @param {string} text
 * @param {{ zone_id?: string, stimulator?: string, modality?: string }} ctx
 * @param {number} maxLen
 */
function appendPadSpilloverIfNeeded(text, ctx, maxLen = SINGLE_INSTRUCTION_MAX) {
  const { zone_id, stimulator, modality } = ctx
  if (!zone_id || !stimulator) return text
  const note = placementSpilloverNote({ zone_id, stimulator, modality })
  if (!note || instructionAlreadyHasPadNote(note, text)) return text
  const combined = `${text} ${note}`.replace(/\s+/g, ' ').trim()
  if (combined.length <= maxLen) return combined
  return text
}

/**
 * Final pass for all single-zone action instructions (blueprint + hand-authored).
 * @param {string} instruction
 * @param {{ zone_id?: string, stimulator?: string, modality?: string, technique?: string }} [ctx]
 */
export function enrichSingleActionInstruction(instruction, ctx = {}) {
  if (!instruction?.trim()) return instruction
  let text = polishInstruction(instruction.trim())
  // Catch-all for a flavor adverb prepended onto a capitalized opener verb from
  // any authoring path ("teasingly Flick" → "Teasingly flick").
  text = text.replace(
    /^([a-z][a-z-]*ly)\s+([A-Z])/,
    (_, adv, c) => `${adv.charAt(0).toUpperCase()}${adv.slice(1)} ${c.toLowerCase()}`
  )
  text = appendPadSpilloverIfNeeded(text, ctx, SINGLE_INSTRUCTION_MAX)
  if (text.length > SINGLE_INSTRUCTION_MAX) {
    text = trimInstructionToMax(text, SINGLE_INSTRUCTION_MAX)
  }
  return text
}

/**
 * Each move offers a few interchangeable phrasings (same movement, different
 * words) so repetition across zones breaks up without changing the action; the
 * per-zone picker keeps a given zone consistent (repeatable) run to run.
 * @type {Record<string, { do: string | string[], feel?: string | string[] }>}
 */
export const BLUEPRINT_MOTIONS = {
  stroke_finger_glide: {
    do: [
      'Glide oiled fingers in long, slow strokes',
      'Slide two slick fingers in unhurried passes',
      'Draw slippery fingertips in smooth, even lines',
    ],
    feel: [
      'Keep pressure light and skin relaxed.',
      'Let the wetness carry the motion—no friction.',
      'Long, easy passes you can repeat as a steady rhythm.',
    ],
  },
  stroke_finger_drag: {
    do: [
      'Drag two fingers with mild grab',
      'Pull two fingers across with a little cling',
      'Draw two fingers with a light tug on the skin',
    ],
    feel: [
      'Velvet friction, medium pace.',
      'A little grip on the skin at a steady tempo.',
      'Tacky drag that tugs the surface, the same beat each pass.',
    ],
  },
  stroke_thumb_trail: {
    do: [
      'Trail the thumb pad in a single lane',
      'Run the broad thumb along one slow track',
      'Sweep the thumb pad down one steady line',
    ],
    feel: [
      'Patient pressure following natural curves.',
      'One unhurried lane, traced again and again.',
      'Smooth, even glide along the contour.',
    ],
  },
  stroke_palm_sweep: {
    do: [
      'Sweep a warm palm in broad arcs',
      'Glide the whole warm palm in wide sweeps',
      'Brush a flat warm palm across in long arcs',
    ],
    feel: [
      'Weighted, massage-like waves.',
      'Broad, enveloping passes, repeated slowly.',
      'Full-hand warmth in unhurried arcs.',
    ],
  },
  circle_fingertip_orbit: {
    do: [
      'Orbit with one fingertip in tight circles',
      'Circle one fingertip in small, steady loops',
      'Trace tight little rings with a single fingertip',
    ],
    feel: [
      'Light pressure, hypnotic repetition.',
      'Small loops, the same beat over and over.',
      'Steady circling that never breaks contact.',
    ],
  },
  circle_finger_spiral: {
    do: [
      'Spiral outward with a bent finger',
      'Wind slow spirals out from the center',
      'Circle wider and wider with one curled finger',
    ],
    feel: [
      'Widening loops that build heat gradually.',
      'Each lap a touch wider than the last.',
      'Growing circles at steady pressure.',
    ],
  },
  circle_thumb_knead: {
    do: [
      'Knead in slow thumb circles',
      'Work slow, kneading circles with the thumb',
      'Press the thumb in deep, rolling circles',
    ],
    feel: [
      'Dense pressure that sinks in, then releases.',
      'Deep rotary kneading, repeated steadily.',
      'Firm circular work that loosens as you go.',
    ],
  },
  tap_fingertip_flutter: {
    do: [
      'Flutter fingertips in a light tap pattern',
      'Patter fingertips in a quick, soft tap',
      'Tap fingertips in a fast, feathery pattern',
    ],
    feel: [
      'Quick rhythm—never punch the skin.',
      'Light, rapid taps held to a steady beat.',
      'Soft staccato that keeps the rhythm going.',
    ],
  },
  tap_finger_drum: {
    do: [
      'Drum with alternating fingers',
      'Roll alternating fingers in a quick drum',
      'Walk the fingers in a fast, even drumbeat',
    ],
    feel: [
      'Brisker than a flutter, still controlled.',
      'A rolling drumbeat, repeated and even.',
      'Quick patter you can hold as a rhythm.',
    ],
  },
  tap_thumb_pulse: {
    do: [
      'Pulse the thumb pad rhythmically',
      'Press the thumb in a steady pulse',
      'Tap the thumb pad in even, grounding beats',
    ],
    feel: [
      'Grounding thuds, not stinging taps.',
      'A slow, even pulse you can keep going.',
      'Soft, repeated presses on a steady count.',
    ],
  },
  pressure_thumb_point: {
    do: [
      'Sink the thumb into one focal spot, then ease back out',
      'Press the thumb tip in and slowly release, in pulses',
      'Push the thumb down into one small spot, then lift',
    ],
    feel: [
      'Slow pulses in and out; no digging nails.',
      'Press in, ease off, and press again.',
      'Concentrated press—sink in, release, repeat.',
    ],
  },
  pressure_finger_creep: {
    do: [
      'Ease slow finger pressure inward',
      'Press in gradually with steady fingers',
      'Lean the fingertips in a little at a time',
    ],
    feel: [
      'Build intensity gradually, checking what feels welcome.',
      'Add pressure by degrees—no rush.',
      'Slow, asking pressure that deepens little by little.',
    ],
  },
  pressure_palm_heel: {
    do: [
      'Rock the heel of the palm in rolling pushes',
      'Lean the palm heel in slow, rolling presses',
      'Push with the heel of the palm in steady rolls',
    ],
    feel: [
      'Deep, rolling weight—work the muscle, not the bone.',
      'Slow rocking presses you can repeat.',
      'Broad, sinking pushes at an even pace.',
    ],
  },
  mouth_tongue_flat_wash: {
    do: [
      'Wash with a flat, wet tongue in broad licks',
      'Lave with the flat of a wet tongue in wide strokes',
      'Drag a soft, flat tongue in broad, wet sweeps',
    ],
    feel: [
      'Warm and slick—keep it wet.',
      'Broad, soft full-tongue passes.',
      'Slippery sweeps, repeated at an easy pace.',
    ],
  },
  mouth_tongue_tip_trace: {
    do: [
      'Trace fine lines with only the tongue tip',
      'Draw thin, precise lines with the tongue tip',
      'Point the tongue tip and trace sharp wet paths',
    ],
    feel: [
      'Precise wet paths—sharper than a flat lick.',
      'Fine, deliberate tracing you can repeat.',
      'Pinpoint tongue work, light and exact.',
    ],
  },
  mouth_tongue_figure8: {
    do: [
      'Paint figure-eights with the tongue',
      'Loop the tongue in slow figure-eights',
      'Draw lazy figure-eights with a wet tongue',
    ],
    feel: [
      'Slippery cross-currents at a lazy pace.',
      'Looping eights that never lose contact.',
      'Continuous wet loops, the same shape each time.',
    ],
  },
  mouth_tongue_flicker: {
    do: [
      'Flick the tongue in rapid shallow snaps',
      'Snap the tongue tip in quick little flicks',
      'Flutter the tongue in fast, shallow flicks',
    ],
    feel: [
      'Electric stop-start rhythm.',
      'Fast flicks held to a steady beat.',
      'Quick, repeated snaps that keep the tempo.',
    ],
  },
  mouth_lip_seal_kiss: {
    do: [
      'Seal with soft closed lips, then release',
      'Press soft closed lips down, then lift away',
      'Plant a soft sealed kiss, then ease back',
    ],
    feel: [
      'Warm hold and a tiny exhale before pulling away.',
      'A soft seal, repeated kiss after kiss.',
      'Gentle suction-free press, then release.',
    ],
  },
  mouth_lip_nibble_kiss: {
    do: [
      'Nibble-kiss along the rim',
      'Catch the skin in soft little lip-nibbles',
      'Work soft nibbling kisses down the edge',
    ],
    feel: [
      'Catch skin lightly between lips—gentle, not painful.',
      'Soft, repeated nibbles along the line.',
      'Playful lip-catches kept light.',
    ],
  },
  mouth_lip_suction: {
    do: [
      'Suck gently into the mouth, then release with a slow open-mouth kiss',
      'Draw it gently into a soft suck, then release',
      'Pull a gentle, steady suction, then ease open',
    ],
    feel: [
      'Vacuum pull and blood rush, then a soft landing.',
      'Gentle, building suction you can repeat.',
      'Slow pull and release in steady cycles.',
    ],
  },
  mouth_tongue_vibrate: {
    do: [
      'Vibrate the tongue side-to-side',
      'Buzz the tongue in fast side-to-side micro-motion',
      'Shimmer the tongue rapidly left and right',
    ],
    feel: [
      'Fast micro-motion; stay wet throughout.',
      'A blurred, vibrator-like hum.',
      'Rapid flutter held as one sustained buzz.',
    ],
  },
  teeth_edge_brush: {
    do: [
      'Brush with tooth edges only in micro-taps',
      'Graze the very edge of the teeth in tiny taps',
      'Skim tooth edges over the skin in light taps',
    ],
    feel: [
      'A scratchy thrill—never clamp or bite down.',
      'Faint edge-grazes, repeated lightly.',
      'Barely-there tooth contact, kept gentle.',
    ],
  },
  teeth_nibble_line: {
    do: [
      'Drag teeth lightly in a one-sided line',
      'Rake the teeth gently along one line',
      'Trail light teeth down a single track',
    ],
    feel: [
      'Goosebumps, not breakage—keep it light.',
      'Soft tooth-drag, repeated down the line.',
      'A teasing edge that never bites in.',
    ],
  },
  breath_warm_gust: {
    do: [
      'Hover and exhale slow warm breath',
      'Breathe slow warm air just over the skin',
      'Hold close and let warm breath spill out',
    ],
    feel: [
      'Heat first; lips may almost touch but need not press.',
      'Warm waves of breath, repeated slowly.',
      'Just heat and nearness—no contact required.',
    ],
  },
  stroke_fingertip_feather: {
    do: [
      'Feather with an almost floating fingertip',
      'Skim a barely-touching fingertip across',
      'Trail a whisper-light fingertip just over the skin',
    ],
    feel: [
      'Ghost touch that raises fine hairs.',
      'Barely-there contact—more breath than press.',
      'So light it teases the surface, again and again.',
    ],
  },
  pressure_thumb_drag_deep: {
    do: [
      'Drag a thick thumb with pushing weight',
      'Push a broad thumb slowly through with weight',
      'Press and drag the thumb with full, sinking weight',
    ],
    feel: [
      'Full, broad pressure that sinks in slowly.',
      'Deep, kneading drag—slow and even.',
      'Heavy, rolling press repeated along the line.',
    ],
  },
  circle_palm_roll: {
    do: [
      'Roll the palm in steady circles',
      'Circle the whole palm in slow, even rounds',
      'Work the palm in broad rolling circles',
    ],
    feel: [
      'Broad rotary compression, repeated slowly.',
      'Full-hand circles at an even pace.',
      'Oiled, rolling rounds that never lift off.',
    ],
  },
  tap_hand_chop_light: {
    do: [
      'Chop lightly with stiff fingers',
      'Patter the side of the hand in light chops',
      'Bounce loose, stiff fingers in soft chops',
    ],
    feel: [
      'Percussive patter—distinct from flutter taps.',
      'Light, springy chops kept to a beat.',
      'Quick, even percussion, repeated.',
    ],
  },
  stroke_tongue_side_lay: {
    do: [
      'Lay the tongue sideways and slide',
      'Press the flat side of the tongue and drag',
      'Slide the broad side of the tongue across',
    ],
    feel: [
      'Wide, wet smear at firm pressure.',
      'Broad sideways drag, repeated slowly.',
      'Full, flat tongue pressure on each pass.',
    ],
  },
  kiss_lip_peck_chain: {
    do: [
      'Peck in a quick chain of tiny kisses',
      'String quick little pecks in a row',
      'Tap a fast chain of small kisses',
    ],
    feel: [
      'Staccato lip-pops, light then warmer.',
      'A quick chain of pecks kept to a beat.',
      'Small, fast kisses repeated in a line.',
    ],
  },
  pressure_finger_spread: {
    do: [
      'Spread two fingers and press apart',
      'Part two fingers and press to either side',
      'Open two fingers and bear out against the skin',
    ],
    feel: [
      'Opening stretch paired with inward push.',
      'Gentle spread with a steady outward press.',
      'Stretch-and-press, held a beat and repeated.',
    ],
  },
  pressure_finger_walk: {
    do: [
      'Walk two fingers in slow pressing steps',
      'Step two fingers along in firm little presses',
      'Press two fingers down point by point, moving along',
    ],
    feel: [
      'Each step sinks in, then moves to the next.',
      'Walking pressure that travels the line.',
      'Press, lift, step—repeat down the path.',
    ],
  },
  stroke_lip_glide: {
    do: [
      'Glide soft lips across in light passes',
      'Slide pursed lips over the skin in slow passes',
      'Drag soft, parted lips across in smooth strokes',
    ],
    feel: [
      'Warm lip-drag, repeated slowly.',
      'Soft mouth glide that stays in contact.',
      'Gentle lip passes, the same stroke each time.',
    ],
  },
  pressure_finger_curl: {
    do: [
      'Curl one or two fingers in a slow come-hither press',
      'Hook one or two fingers in a slow come-hither',
      'Draw the fingertips in a beckoning come-hither curl',
    ],
    feel: [
      'Firm, rolling pressure that eases in and out.',
      'A slow beckoning press, repeated in waves.',
      'Curl-and-release against the wall, steady and even.',
    ],
  },
  circle_tongue_slow_loop: {
    do: [
      'Loop the tongue tip in a slow wet ring',
      'Circle the tongue tip in a slow, wet loop',
      'Ring the tongue tip around in unhurried loops',
    ],
    feel: [
      'Constant contact; pressure builds each lap.',
      'Slow wet rings, the same loop each time.',
      'Continuous looping that never breaks contact.',
    ],
  },
  stroke_palm_vibrate: {
    do: [
      'Buzz a loose palm in rapid micro-shakes',
      'Shake a relaxed palm fast against the skin',
      'Vibrate a loose palm in quick little shakes',
    ],
    feel: [
      'Muffled vibration through skin—not slapping.',
      'A soft, fast buzz that hums through the surface.',
      'A blurred, vibrator-like flutter held steady.',
    ],
  },
  mouth_tongue_angled_streak: {
    do: [
      'Streak with the side of the tongue tip',
      'Drag the angled edge of the tongue tip',
      'Cut quick wet lines with the side of the tongue',
    ],
    feel: [
      'Quick wet lines—brisker than a flat wash.',
      'Sharp, angled streaks repeated in passes.',
      'Brisk edge-of-tongue lines, kept wet.',
    ],
  },
  stroke_fingertip_micro_sketch: {
    do: [
      'Sketch with a single fingertip at one pinpoint',
      'Trace tiny marks with one fingertip on the spot',
      'Work one fingertip in fine, pinpoint strokes',
    ],
    feel: [
      'Fine delicacy on the smallest surface.',
      'Tiny, exact strokes you can repeat.',
      'Pinpoint sketching, light and precise.',
    ],
  },
  kiss_lip_micro_hover: {
    do: [
      'Hover the lips, then kiss the smallest point',
      'Float the lips close, then plant a tiny kiss',
      'Pause just off the skin, then kiss one small spot',
    ],
    feel: [
      'Brief contact—high contrast, almost chaste.',
      'A held breath, then a tiny kiss, repeated.',
      'Hover and peck on a slow, teasing count.',
    ],
  },
  tap_toe_point: {
    do: [
      'Tap with a toe pad',
      'Press the toe pad in soft taps',
      'Dab the toe pad in light, novel taps',
    ],
    feel: [
      'A novel, playful pressure for foot-play.',
      'Soft toe taps kept to an even beat.',
      'Light, curious dabs, repeated.',
    ],
  },
}

/**
 * @param {string} zoneId
 * @param {object} [profile]
 * @param {{ do: string, feel?: string }} parts
 * @param {{ stimulator?: string, modality?: string, technique?: string }} [actionMeta]
 */
export function composeInstruction(zoneId, profile, parts, actionMeta = {}) {
  const { where, avoid } = placementForZone(zoneId, profile)
  // Lowercase the opener verb before enrichment so a prepended flavor adverb
  // ("greedily") doesn't leave a broken "greedily Sink"; the sentence is
  // re-capitalized once below.
  // Auto meaningful-adverbs apply only to generated blueprint openers (bare
  // imperative verbs). Hand-authored copy is left as written.
  const auto = actionMeta.autoModifier === true
  const doVariant = pickVariant(parts.do, zoneId, actionMeta.technique || '')
  const doSeed = doVariant.charAt(0).toLowerCase() + doVariant.slice(1)
  const doPhrase = enrichSensualPhrase(doSeed, {
    zoneId,
    stepIndex: 0,
    totalSteps: 1,
    plain: !auto,
    technique: actionMeta.technique || profile?.techniques?.[0],
    pressure: actionMeta.stimulation?.pressure?.level,
    tempo: actionMeta.stimulation?.tempo?.level,
    erogenousWeight: profile?.stimulation?.erogenous_priority,
  })
  const core = `${doPhrase} ${where}.`
    .replace(/\s+/g, ' ')
    .replace(/^([a-z])/, (c) => c.toUpperCase())
  const avoidPart = avoid ? ` ${safetyNoteForSpeech(avoid)}` : ''
  const feelText = pickVariant(parts.feel, zoneId, `feel|${actionMeta.technique || ''}`)
  const feelPart = feelText ? ` ${feelText}` : ''
  let text = core
  if (avoidPart && (text + avoidPart).length <= SINGLE_INSTRUCTION_MAX) {
    text += avoidPart
  }
  if (feelPart && (text + feelPart).length <= SINGLE_INSTRUCTION_MAX) {
    text += feelPart
  }
  return enrichSingleActionInstruction(text.trim(), {
    zone_id: zoneId,
    stimulator: actionMeta.stimulator,
    modality: actionMeta.modality,
    technique: actionMeta.technique,
  })
}

/**
 * @param {string} blueprintId
 */
export function blueprintInstruction(blueprintId) {
  const parts = BLUEPRINT_MOTIONS[blueprintId]
  if (!parts) {
    return (_label, zoneId, profile) =>
      composeInstruction(zoneId, profile, {
        do: 'Stimulate this zone with steady, attentive contact',
      })
  }
  return (_label, zoneId, profile, actionMeta = {}) =>
    composeInstruction(zoneId, profile, parts, { ...actionMeta, autoModifier: true })
}

/**
 * Shorthand for hand-authored chunks.
 * @param {string} zoneId
 * @param {string} doPhrase - full how-to (often already names the anatomical target)
 * @param {string} [feel]
 * @param {{ omitWhere?: boolean, stimulator?: string, modality?: string, profile?: object }} [opts]
 */
/**
 * Hand-authored single action with placement omitted from the do phrase.
 */
export function zoneInstruction(zoneId, doPhrase, feel = '', opts = {}) {
  const stim =
    opts.stimulator ||
    (/palm/i.test(doPhrase) ? 'palm' : /tongue/i.test(doPhrase) ? 'tongue' : /lip/i.test(doPhrase) ? 'lip' : null)

  if (opts.omitWhere) {
    const profile = opts.profile || {}
    const { avoid } = placementForZone(zoneId, profile)
    let text = enrichSensualPhrase(doPhrase.trim(), { zoneId, stepIndex: 0, totalSteps: 1, plain: true })
    if (!/[.!?]$/.test(text)) text += '.'
    if (feel && (text + feel).length <= SINGLE_INSTRUCTION_MAX) text += ` ${feel}`
    if (avoid) {
      const note = safetyNoteForSpeech(avoid)
      if ((text + note).length <= SINGLE_INSTRUCTION_MAX) text += ` ${note}`
    }
    return enrichSingleActionInstruction(text, {
      zone_id: zoneId,
      stimulator: stim,
      modality: opts.modality,
      technique: opts.technique,
    })
  }
  return composeInstruction(
    zoneId,
    opts.profile || {},
    { do: doPhrase, feel },
    { stimulator: stim, modality: opts.modality, technique: opts.technique }
  )
}

/**
 * Shorthand for hand-authored makeAction rows — passes stimulator from the action fields.
 * @param {string} zoneId
 * @param {string} doPhrase
 * @param {{ stimulator: string, modality?: string, technique?: string, feel?: string, profile?: object }} action
 */
export function zoneActionInstruction(zoneId, doPhrase, action) {
  return zoneInstruction(zoneId, doPhrase, action.feel || '', {
    omitWhere: true,
    stimulator: action.stimulator,
    modality: action.modality,
    technique: action.technique,
    profile: action.profile,
  })
}
