import { arrivalPhrase, spotShort } from './body-landmark-anchors.js'
import {
  internalVaginalTravel,
  isDeepVaginal,
  isInternalVaginal,
  usesInternalVaginalTravel,
} from './sequence-zone-depth.js'

/**
 * Finger-unit (FU) distance between sequence steps.
 * 1 FU ≈ one finger width (~15–20 mm). Drives travel phrasing and round-trip eligibility.
 *
 * @see contact-scale.js, ACTION_SCHEMA.md
 */
import { STIMULATOR_CONTACT } from '../contact-scale.js'

/** @param {string} a @param {string} b */
export function edgeKey(a, b) {
  return [a, b].sort().join('|')
}

/** Typical contact width (FU) for spillover checks — mirrors profile topologies. */
const ZONE_TYPICAL_FU = {
  clitoral_hood: 0.75,
  clitoral_glans: 0.5,
  labia_minora: 1,
  labia_majora: 2.5,
  vestibule: 2,
  vestibular_bulbs: 2,
  vaginal_introitus: 1.5,
  vagina: 2,
  vaginal_anterior_wall: 2,
  vaginal_posterior_wall: 2,
  vaginal_lateral_wall: 2,
  mons_pubis: 2.5,
  penis_glans: 2,
  penis_shaft: 2.5,
  penis: 2,
  frenulum: 0.5,
  foreskin: 1.5,
  scrotum: 3,
  nipple: 0.75,
  areola: 2,
  breast_tissue: 5,
  throat: 2,
  neck: 2.5,
  base_of_neck: 4,
  ears: 1,
  shoulders: 5,
  clavicle: 4,
  chest: 8,
  upper_abdomen: 6,
  stomach: 6,
  lower_abdomen: 5,
  upper_back: 10,
  lower_back: 8,
  back: 18,
  spine: 3.5,
  sacrum: 4,
  coccyx: 1,
  buttocks: 8,
  gluteus_maximus: 6,
  gluteus_medius: 5,
  buttock_crease: 3,
  buttock_pad: 4,
  groin: 3,
  inner_thighs: 6,
  outer_thighs: 6,
  knees: 4,
  calves: 5,
  shins: 3,
  ankles: 2,
  feet: 4,
  soles: 4,
  toes: 2,
  inner_arms: 4,
  forearms: 4,
  elbows: 2,
  deltoid: 4,
  hips: 5,
  hip_bone: 3,
  perineum: 2,
  ribcage: 6,
  sides: 5,
}

/**
 * Known step distances in FU (undirected). Tune for spoken travel scale.
 * @type {Record<string, number>}
 */
const EDGE_DISTANCE_FU_RAW = {
  // Vulva / clitoris — micro hops
  'clitoral_hood|clitoral_glans': 0.5,
  'clitoral_glans|labia_minora': 1.5,
  'clitoral_hood|labia_minora': 2,
  'labia_majora|labia_minora': 0.5,
  'labia_minora|vestibule': 1,
  'labia_minora|clitoral_hood': 1.5,
  'labia_minora|vaginal_introitus': 1.5,
  'vestibule|vaginal_introitus': 0.75,
  'vestibule|clitoral_hood': 1.5,
  'clitoral_glans|vestibular_bulbs': 2,
  'vestibule|clitoral_glans': 1.5,
  'mons_pubis|labia_majora': 2,

  // Vaginal canal — depth (not micro external shift)
  'vaginal_introitus|vaginal_anterior_wall': 2,
  'vaginal_introitus|vagina': 1.5,
  'vagina|vaginal_posterior_wall': 2,
  'vaginal_anterior_wall|cervix': 3,
  'vaginal_lateral_wall|vaginal_anterior_wall': 1.5,
  'cervix|vaginal_anterior_wall': 2.5,

  // Penis — micro to short along shaft
  'frenulum|penis_glans': 0.5,
  'foreskin|penis_glans': 0.75,
  'penis_glans|penis_shaft': 2.5,
  'penis|penis_shaft': 1.5,
  'penis|scrotum': 3,

  // Breast — short on nipple/areola, medium on mound
  'areola|nipple': 0.75,
  'areola|breast_tissue': 3,
  'nipple|breast_tissue': 3.5,

  // Neck — long
  'base_of_neck|neck': 8,
  'neck|throat': 12,
  'throat|base_of_neck': 10,
  'neck|ears': 6,
  'neck|shoulders': 8,
  'neck|clavicle': 10,
  'base_of_neck|upper_back': 10,
  'upper_back|neck': 12,

  // Torso chain
  'chest|upper_abdomen': 6,
  'stomach|upper_abdomen': 4,
  'stomach|lower_abdomen': 4,
  'lower_abdomen|hip_bone': 3,
  'lower_abdomen|mons_pubis': 3,
  'hip_bone|groin': 2,
  'chest|clavicle': 4,
  'clavicle|shoulders': 4,
  'chest|stomach': 8,
  'stomach|chest': 8,

  // Back / glutes — long vertical canvas (full back ~15–20 FU wide/tall)
  'lower_back|upper_back': 10,
  'lower_back|buttocks': 6,
  'sacrum|buttock_crease': 3,
  'buttocks|gluteus_maximus': 2,
  'gluteus_maximus|buttock_crease': 2,
  'gluteus_medius|gluteus_maximus': 2,
  'buttock_crease|perineum': 4,
  'buttocks|lower_back': 6,
  'buttocks|sacrum': 4,
  'spine|sacrum': 14,
  'back|sides': 14,
  'back|upper_back': 4,
  'back|lower_back': 6,
  'ribcage|sides': 6,
  'upper_back|shoulders': 6,

  // Limbs
  'inner_thighs|knees': 12,
  'outer_thighs|calves': 14,
  'outer_thighs|knees': 10,
  'calves|shins': 4,
  'calves|ankles': 6,
  'feet|ankles': 2,
  'soles|toes': 3,
  'buttock_pad|inner_thighs': 8,
  'hips|buttocks': 5,
  'forearms|inner_arms': 10,
  'inner_arms|elbows': 8,
  'deltoid|shoulders': 2,
  'groin|inner_thighs': 6,
}

/** Normalized undirected keys via edgeKey(). */
const EDGE_DISTANCE_FU = /** @type {Record<string, number>} */ ({})
for (const [key, fu] of Object.entries(EDGE_DISTANCE_FU_RAW)) {
  const [a, b] = key.split('|')
  EDGE_DISTANCE_FU[edgeKey(a, b)] = fu
}

/** Curated, hand-tuned undirected FU edges (read-only). Now a *secondary* source,
 * used to calibrate the map's pixel scale and as a fallback where the calibrated
 * geometry has no coordinates for a pair. @see ../feasibility/geometry-distance.js */
export const CURATED_EDGE_FU = EDGE_DISTANCE_FU

/** True when a curated edge exists for this pair (vs. the generic estimate). */
export function hasCuratedEdge(a, b) {
  return EDGE_DISTANCE_FU[edgeKey(a, b)] != null
}

/** Long body paths that use round-trip pattern when FU ≥ medium. */
const ROUND_TRIP_EDGES = new Set([
  edgeKey('throat', 'base_of_neck'),
  edgeKey('throat', 'neck'),
  edgeKey('neck', 'base_of_neck'),
  edgeKey('neck', 'ears'),
  edgeKey('neck', 'shoulders'),
  edgeKey('neck', 'clavicle'),
  edgeKey('base_of_neck', 'upper_back'),
])

/**
 * @param {string} zoneId
 */
export function zoneTypicalFu(zoneId) {
  return ZONE_TYPICAL_FU[zoneId] ?? 3
}

/**
 * @param {string} fromZone
 * @param {string} toZone
 */
export function edgeDistanceFu(fromZone, toZone) {
  const key = edgeKey(fromZone, toZone)
  if (EDGE_DISTANCE_FU[key] != null) return EDGE_DISTANCE_FU[key]
  const a = zoneTypicalFu(fromZone)
  const b = zoneTypicalFu(toZone)
  return Math.max(2, (a + b) * 0.75)
}

/** @typedef {'micro' | 'short' | 'medium' | 'long'} TravelScale */

/**
 * @param {number} fu
 * @returns {TravelScale}
 */
export function travelScaleFromFu(fu) {
  if (fu <= 1.5) return 'micro'
  if (fu <= 4) return 'short'
  if (fu <= 12) return 'medium'
  return 'long'
}

/**
 * @param {string} fromZone
 * @param {string} toZone
 * @returns {TravelScale}
 */
export function stepTravelScale(fromZone, toZone) {
  return travelScaleFromFu(edgeDistanceFu(fromZone, toZone))
}

/**
 * @param {string} fromZone
 * @param {string} toZone
 */
export function usesRoundTrip(fromZone, toZone) {
  const scale = stepTravelScale(fromZone, toZone)
  if (scale === 'micro' || scale === 'short') return false
  return ROUND_TRIP_EDGES.has(edgeKey(fromZone, toZone))
}

/**
 * @param {import('./_makeSequenceAction.js').SequenceStep} [stepFrom]
 * @param {import('./_makeSequenceAction.js').SequenceStep} [stepTo]
 */
function effectivePadFu(step) {
  const stim = step?.stimulator || 'finger'
  const spec = STIMULATOR_CONTACT[stim]
  if (spec) return spec.contact_pad_fu
  if (stim === 'hand') return STIMULATOR_CONTACT.palm.contact_pad_fu
  return STIMULATOR_CONTACT.finger.contact_pad_fu
}

/** Spoken when a stimulator pad is wider than the zone being targeted. */
const PALM_PLACEMENT_NOTE = {
  labia_majora:
    'A full palm is wider than one outer lip—it will naturally cover both outer lips and the crease beside them.',
  labia_minora:
    'A full palm is wider than the inner lips alone—it will also touch the outer lips and the area near the opening.',
  clitoral_hood:
    'A full palm is wider than the hood fold alone—it will also touch the clitoral bead and nearby lips.',
  clitoral_glans:
    'A full palm cannot rest on the bead alone—it will cover the hood and surrounding lips too.',
  nipple:
    'A full palm is much wider than the nipple—it will cover the areola and surrounding breast tissue.',
  areola:
    'A full palm is wider than the ring alone—it will spread onto the nipple and breast mound.',
  frenulum: 'A full palm is wider than the strip under the head—it will wrap much of the glans and shaft.',
  penis_glans: 'A full palm is wider than the head alone—it will contact the shaft and frenulum too.',
}

/**
 * When placing a large pad on a small zone (e.g. palm on one labium majus).
 * @param {import('./_makeSequenceAction.js').SequenceStep} step
 */
export function placementSpilloverNote(step) {
  if (!step?.zone_id) return ''
  const pad = effectivePadFu(step)
  const zoneFu = zoneTypicalFu(step.zone_id)
  if (pad <= zoneFu + 0.1) return ''

  const stim = step.stimulator || 'finger'
  const substantiallyWider =
    stim === 'palm' ||
    stim === 'hand' ||
    stim === 'lip' ||
    stim === 'lips' ||
    stim === 'tongue' ||
    pad >= zoneFu * 1.75
  if (!substantiallyWider) return ''
  if (stim === 'palm' || stim === 'hand') {
    return PALM_PLACEMENT_NOTE[step.zone_id] || 'Your palm is broader than this spot alone—nearby skin will be touched too.'
  }
  if (stim === 'lip' || stim === 'lips') {
    return 'Your lips are wider than this spot alone—neighboring skin will be touched too.'
  }
  if (stim === 'tongue') {
    return 'Your tongue is wider than this spot alone—neighboring skin will be touched too.'
  }
  return 'Your touch will cover more than this spot alone.'
}

function spilloverNote(stepFrom, stepTo) {
  const stim = stepFrom?.stimulator || 'finger'
  const zones = new Set([stepFrom?.zone_id, stepTo?.zone_id].filter(Boolean))
  if (stim === 'palm' || stim === 'hand') {
    if (zones.has('labia_majora') && zones.has('labia_minora')) {
      return '—your palm will span the outer and inner lips'
    }
    if (zones.has('clitoral_hood') && zones.has('clitoral_glans')) {
      return '—your palm will cover the hood and the bead'
    }
    return '—your palm can cover both spots'
  }
  if (stim === 'lip' || stim === 'lips') return '—your lips can span both spots'
  if (stim === 'tongue') return '—your tongue can span both spots'
  return '—one finger pad can cover both spots'
}

export function spilloverClause(stepFrom, stepTo) {
  if (!stepFrom || !stepTo) return ''
  const pad = effectivePadFu(stepFrom)
  const minZone = Math.min(zoneTypicalFu(stepFrom.zone_id), zoneTypicalFu(stepTo.zone_id))
  if (pad > minZone + 0.1) {
    return spilloverNote(stepFrom)
  }
  return ''
}

/** Leading gerund → imperative for spoken micro-travel (tap, stroke, …). */
const GERUND_TO_IMPERATIVE = {
  stroking: 'stroke',
  tapping: 'tap',
  kissing: 'kiss',
  kneading: 'knead',
  making: 'make',
  dragging: 'drag',
  tracing: 'trace',
  sliding: 'slide',
  circling: 'circle',
  pressing: 'press',
  flicking: 'flick',
  sucking: 'suck',
  gliding: 'glide',
  fluttering: 'flutter',
  squeezing: 'squeeze',
  rolling: 'roll',
  parting: 'part',
  cupping: 'cup',
  wrapping: 'wrap',
  teasing: 'tease',
  resting: 'rest',
  giving: 'give',
  spiraling: 'spiral',
  touching: 'touch',
  twisting: 'twist',
  spreading: 'spread',
  angling: 'angle',
  curling: 'curl',
  drawing: 'draw',
  focusing: 'focus',
  shifting: 'shift',
  feathering: 'feather',
  tickling: 'tickle',
  widening: 'widen',
  narrowing: 'narrow',
  continuing: 'continue',
  finishing: 'finish',
  orbiting: 'orbit',
  chopping: 'chop',
  breathing: 'breathe',
}

/** @param {string} manner */
export function mannerAsDirective(manner) {
  const m = manner.trim()
  const match = m.match(/^(\w+)(.*)$/i)
  if (!match) return m
  const imp = GERUND_TO_IMPERATIVE[match[1].toLowerCase()]
  return imp ? `${imp}${match[2]}` : m
}

/**
 * @param {string} hop — from microTravelPhrase
 * @param {string} to — spotShort destination
 * @param {string} spill — spilloverClause result
 */
function microHopClause(hop, to, spill) {
  if (hop === 'one finger stroke') {
    return `then ease onto ${to} in one finger stroke${spill}`
  }
  if (hop === 'a short sweep') {
    return `then sweep onto ${to}${spill}`
  }
  if (hop === 'a soft kiss') {
    return `then move to ${to} with a soft kiss${spill}`
  }
  return `then ease onto ${to}${spill}`
}

/**
 * Travel clause scaled to FU distance between steps.
 * @param {string} manner — e.g. "tapping lightly" (sentence case ok)
 * @param {string} fromZone
 * @param {string} toZone
 * @param {import('./_makeSequenceAction.js').SequenceStep} [stepFrom]
 * @param {import('./_makeSequenceAction.js').SequenceStep} [stepTo]
 */
/** @param {string} manner @param {string} spotLabel */
function mannerAlreadyOnSpot(manner, spotLabel) {
  const core = spotLabel.replace(/^the\s+/i, '').trim()
  if (!core || core.length < 4) return false
  if (new RegExp(`\\b${core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(manner)) return true
  const words = core.split(/\s+/).filter((w) => w.length > 3)
  if (!words.length) return false
  const hits = words.filter((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(manner))
  return hits.length >= Math.min(2, words.length)
}

/** @param {import('./_makeSequenceAction.js').SequenceStep} [step] */
function microTravelPhrase(step) {
  const stim = step?.stimulator || 'finger'
  if (stim === 'tongue' || step?.modality === 'mouth') return 'a short sweep'
  if (stim === 'lip' || stim === 'lips') return 'a soft kiss'
  return 'one finger stroke'
}

export function buildTravelLeg(manner, fromZone, toZone, stepFrom, stepTo, opts = {}) {
  const internalLeg = internalVaginalTravel(fromZone, toZone)
  if (internalLeg) return internalLeg

  const scale = stepTravelScale(fromZone, toZone)
  const omitFrom = opts.omitFromSpot === true
  const spill = spilloverClause(stepFrom, stepTo)
  const from = spotShort(fromZone)
  const to = spotShort(toZone)
  const m = manner.charAt(0).toLowerCase() + manner.slice(1)

  if (scale === 'micro') {
    const hop = microTravelPhrase(stepFrom)
    const directive = mannerAsDirective(m)
    const move = microHopClause(hop, to, spill)
    if (omitFrom || mannerAlreadyOnSpot(m, from)) {
      return `${directive}, ${move}`
    }
    return `${directive} on ${from}, ${move}`
  }
  const directive = mannerAsDirective(m)
  if (scale === 'short') {
    if (isInternalVaginal(toZone) || isInternalVaginal(fromZone)) {
      return `${directive}, then ease inside to ${to}${spill}`
    }
    return `${directive}, then move to ${to}${spill}`
  }
  if (scale === 'long') {
    return `${directive}, and work all the way from ${from} to ${to}`
  }
  return `${directive}, and work from ${from} to ${to}`
}

/**
 * @param {string} fromZone
 * @param {string} toZone
 */
/**
 * Short connector for multi-step micro/short hops (avoids repeating full travel manner).
 */
export function buildMicroConnector(fromZone, toZone, stepFrom, stepTo) {
  const spill = spilloverClause(stepFrom, stepTo)
  const to = spotShort(toZone)
  const hop = microTravelPhrase(stepFrom)
  return microHopClause(hop, to, spill).replace(/^then /i, '')
}

export function buildReturnLeg(fromZone, toZone) {
  const from = spotShort(fromZone)
  const scale = stepTravelScale(fromZone, toZone)
  if (scale === 'micro' || scale === 'short') {
    return `Then slide back to ${from}.`
  }
  return `Then move back to ${from}.`
}

/**
 * @param {string} toZone
 * @param {string} action
 * @param {string} fromZone
 */
export function buildArrivalLine(toZone, action, fromZone) {
  const scale = stepTravelScale(fromZone, toZone)
  if (
    scale === 'micro' ||
    scale === 'short' ||
    isInternalVaginal(toZone) ||
    isDeepVaginal(toZone) ||
    usesInternalVaginalTravel(fromZone, toZone)
  ) {
    return `Then ${action}.`
  }
  return `Once you're at ${arrivalPhrase(toZone)}, ${action}.`
}

export { isInternalVaginal, isDeepVaginal, usesInternalVaginalTravel } from './sequence-zone-depth.js'
