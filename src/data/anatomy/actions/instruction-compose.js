/**
 * Turn blueprint motions + zone placement into human how-to instructions.
 */

import { placementForZone } from './zone-placement.js'
import { placementSpilloverNote } from './sequence-zone-distance.js'
import { safetyNoteForSpeech } from './safety-phrasing.js'
import { enrichSensualPhrase } from './sensual-phrasing.js'
import { polishInstruction, trimInstructionToMax } from './instruction-polish.js'

const SINGLE_INSTRUCTION_MAX = 250

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
  text = appendPadSpilloverIfNeeded(text, ctx, SINGLE_INSTRUCTION_MAX)
  if (text.length > SINGLE_INSTRUCTION_MAX) {
    text = trimInstructionToMax(text, SINGLE_INSTRUCTION_MAX)
  }
  return text
}

/** @type {Record<string, { do: string, feel?: string }>} */
export const BLUEPRINT_MOTIONS = {
  stroke_finger_glide: {
    do: 'Glide oiled fingers in long, slow strokes',
    feel: 'Keep pressure light and skin relaxed.',
  },
  stroke_finger_drag: {
    do: 'Drag two fingers with mild grab',
    feel: 'Velvet friction, medium pace.',
  },
  stroke_thumb_trail: {
    do: 'Trail the thumb pad in a single lane',
    feel: 'Patient pressure following natural curves.',
  },
  stroke_palm_sweep: {
    do: 'Sweep a warm palm in broad arcs',
    feel: 'Weighted, massage-like waves.',
  },
  circle_fingertip_orbit: {
    do: 'Orbit with one fingertip in tight circles',
    feel: 'Light pressure, hypnotic repetition.',
  },
  circle_finger_spiral: {
    do: 'Spiral outward with a bent finger',
    feel: 'Widening loops that build heat gradually.',
  },
  circle_thumb_knead: {
    do: 'Knead in slow thumb circles',
    feel: 'Dense muscular pressure that sinks in then releases.',
  },
  tap_fingertip_flutter: {
    do: 'Flutter fingertips in a light tap pattern',
    feel: 'Quick teasing rhythm—never punch the skin.',
  },
  tap_finger_drum: {
    do: 'Drum with alternating fingers',
    feel: 'Playful, sharper than a flutter, still controlled.',
  },
  tap_thumb_pulse: {
    do: 'Pulse the thumb pad rhythmically',
    feel: 'Grounding thuds, not stinging taps.',
  },
  pressure_palm_hold: {
    do: 'Press under a broad palm—hold, breathe, release',
    feel: 'Deep steady weight without grinding bone.',
  },
  pressure_thumb_point: {
    do: 'Sink thumb pressure into one focal spot',
    feel: 'Slow pulses; no digging nails.',
  },
  pressure_finger_creep: {
    do: 'Creep finger pressure at the boundary',
    feel: 'Test intensity as if asking how much is welcome.',
  },
  pressure_palm_heel: {
    do: 'Rock the heel of the palm in rolling pushes',
    feel: 'Sports-massage depth on muscle, not bone.',
  },
  mouth_tongue_flat_wash: {
    do: 'Wash with a flat, wet tongue in broad licks',
    feel: 'Sauna heat; keep it slick.',
  },
  mouth_tongue_tip_trace: {
    do: 'Trace fine lines with only the tongue tip',
    feel: 'Precise wet paths—sharper than a flat lick.',
  },
  mouth_tongue_figure8: {
    do: 'Paint figure-eights with the tongue',
    feel: 'Slippery cross-currents, lazy sensual pace.',
  },
  mouth_tongue_flicker: {
    do: 'Flick the tongue in rapid shallow snaps',
    feel: 'Electric stop-start rhythm.',
  },
  mouth_lip_seal_kiss: {
    do: 'Seal with soft closed lips, then release',
    feel: 'Warm hold and a tiny exhale before pulling away.',
  },
  mouth_lip_nibble_kiss: {
    do: 'Nibble-kiss along the rim',
    feel: 'Catch skin lightly between lips—playful, not painful.',
  },
  mouth_lip_suction: {
    do: 'Suck gently into the mouth, then release with a slow open-mouth kiss',
    feel: 'Vacuum pull and blood rush, then soft landing.',
  },
  mouth_lip_press_hold: {
    do: 'Press with closed lips in a yielding hold',
    feel: 'Mouth heat, no teeth.',
  },
  mouth_tongue_vibrate: {
    do: 'Vibrate the tongue side-to-side',
    feel: 'Fast micro-motion; stay wet throughout.',
  },
  teeth_edge_brush: {
    do: 'Brush with tooth edges only in micro-taps',
    feel: 'Scratchy thrill—never clamp or bite down.',
  },
  teeth_nibble_line: {
    do: 'Drag teeth lightly in a one-sided line',
    feel: 'Predatory tease—goosebumps, not breakage.',
  },
  breath_warm_gust: {
    do: 'Hover and exhale slow warm breath',
    feel: 'Heat first; lips may almost touch but need not press.',
  },
  stroke_fingertip_feather: {
    do: 'Feather with an almost floating fingertip',
    feel: 'Ghost touch that raises fine hairs.',
  },
  pressure_thumb_drag_deep: {
    do: 'Drag a thick thumb with pushing weight',
    feel: 'Fullness on deep zones; stay careful near bone.',
  },
  circle_palm_roll: {
    do: 'Roll the palm in steady circles',
    feel: 'Oiled rotary compression like a spa grind.',
  },
  tap_hand_chop_light: {
    do: 'Chop lightly with stiff fingers',
    feel: 'Percussive patter—distinct from flutter taps.',
  },
  stroke_tongue_side_lay: {
    do: 'Lay the tongue sideways and slide',
    feel: 'Wide smear pressure, sloppy intimate drag.',
  },
  kiss_lip_peck_chain: {
    do: 'Peck in a quick chain of tiny kisses',
    feel: 'Staccato lip pops—cute then hungry.',
  },
  pressure_finger_spread: {
    do: 'Spread two fingers and press apart',
    feel: 'Opening stretch paired with inward push.',
  },
  circle_tongue_slow_loop: {
    do: 'Loop the tongue tip in a slow wet ring',
    feel: 'Constant contact; pressure builds each lap.',
  },
  stroke_palm_vibrate: {
    do: 'Buzz a loose palm in rapid micro-shakes',
    feel: 'Muffled vibration through skin—not slapping.',
  },
  mouth_tongue_still_heat: {
    do: 'Rest a still tongue and let heat soak in',
    feel: 'No sliding—warmth and patience do the work.',
  },
  mouth_tongue_angled_streak: {
    do: 'Streak with the tongue’s sharp edge',
    feel: 'Quick wet lines—brisker than a flat wash.',
  },
  stroke_fingertip_micro_sketch: {
    do: 'Sketch with a single fingertip at one pinpoint',
    feel: 'Surgical delicacy on the smallest surface.',
  },
  kiss_lip_micro_hover: {
    do: 'Hover lips, then kiss the smallest point',
    feel: 'Brief contact—high contrast, almost chaste.',
  },
  tap_toe_point: {
    do: 'Tap with a toe pad',
    feel: 'Shy novelty pressure for foot-play.',
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
  const doPhrase = enrichSensualPhrase(parts.do, {
    zoneId,
    stepIndex: 0,
    totalSteps: 1,
    technique: actionMeta.technique || profile?.techniques?.[0],
    erogenousWeight: profile?.stimulation?.erogenous_priority,
  })
  const core = `${doPhrase} ${where}.`.replace(/\s+/g, ' ')
  const avoidPart = avoid ? ` ${safetyNoteForSpeech(avoid)}` : ''
  const feelPart = parts.feel ? ` ${parts.feel}` : ''
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
    composeInstruction(zoneId, profile, parts, actionMeta)
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
    let text = enrichSensualPhrase(doPhrase.trim(), { zoneId, stepIndex: 0, totalSteps: 1 })
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
