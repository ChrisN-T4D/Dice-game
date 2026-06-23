/**
 * Actor parts (the "givers") — body parts that deliver stimulation, with the
 * capabilities needed to reason about *what they can do* and *whether they fit*
 * a given receiver zone.
 *
 * This builds on `contact-scale.js`, which already models contact-pad size in
 * finger units (FU, ~one finger width ≈ 15–20 mm) and placement accuracy. Here
 * we add the manipulation capabilities (pressure ceiling, wetness, penetration,
 * supported techniques) and a matcher that ranks parts against a receiver zone
 * by relative size + ability to manipulate.
 */

import { STIMULATOR_CONTACT, extentFromFu } from './contact-scale.js'

const LVL = { low: 30, medium: 60, high: 90 }
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/**
 * Capability catalog. `fu` (contact pad) and `accuracy` reuse the canonical
 * values from STIMULATOR_CONTACT where a matching stimulator exists, so the two
 * systems stay in sync; new/compound parts (two_fingers, whole_hand, …) extend it.
 *
 * channel:      'hand' | 'mouth' | 'breath' | 'foot' | 'genital'
 * pressure_max: 0–10 ceiling of force the part can comfortably apply
 * wetness:      0–3 (dry → very wet)
 * can_penetrate:'no' | 'shallow' | 'yes'
 * techniques:   manipulation verbs this part can perform
 *
 * @typedef {Object} ActorPart
 * @property {string} id
 * @property {string} label
 * @property {string} channel
 * @property {number} fu                 contact pad size in finger units
 * @property {('high'|'medium'|'low')} accuracy placement accuracy
 * @property {number} precision          0–10 (derived from accuracy + pad)
 * @property {number} pressure_max       0–10
 * @property {number} wetness            0–3
 * @property {('no'|'shallow'|'yes')} can_penetrate
 * @property {string[]} techniques
 */

const fuOf = (key, fallback) => STIMULATOR_CONTACT[key]?.contact_pad_fu ?? fallback
const accOf = (key, fallback) => STIMULATOR_CONTACT[key]?.placement_accuracy ?? fallback

/** @type {ActorPart[]} */
export const ACTOR_PARTS = [
  { id: 'fingertip', label: 'Fingertip', channel: 'hand', fu: fuOf('fingertip', 0.5), accuracy: accOf('fingertip', 'high'),
    pressure_max: 8, wetness: 0, can_penetrate: 'no', techniques: ['circle', 'tap', 'stroke', 'vibrate'] },
  { id: 'finger', label: 'Finger', channel: 'hand', fu: fuOf('finger', 1), accuracy: accOf('finger', 'high'),
    pressure_max: 9, wetness: 0, can_penetrate: 'shallow', techniques: ['circle', 'stroke', 'tap', 'pressure', 'penetrate', 'vibrate'] },
  { id: 'two_fingers', label: 'Two fingers', channel: 'hand', fu: 2, accuracy: 'high',
    pressure_max: 9, wetness: 0, can_penetrate: 'yes', techniques: ['circle', 'stroke', 'pressure', 'penetrate'] },
  { id: 'thumb', label: 'Thumb', channel: 'hand', fu: fuOf('thumb', 1.2), accuracy: accOf('thumb', 'high'),
    pressure_max: 10, wetness: 0, can_penetrate: 'no', techniques: ['pressure', 'circle', 'stroke'] },
  { id: 'knuckle', label: 'Knuckle', channel: 'hand', fu: 1, accuracy: 'medium',
    pressure_max: 10, wetness: 0, can_penetrate: 'no', techniques: ['pressure', 'circle'] },
  { id: 'palm', label: 'Palm', channel: 'hand', fu: fuOf('palm', 4.5), accuracy: accOf('palm', 'low'),
    pressure_max: 10, wetness: 0, can_penetrate: 'no', techniques: ['pressure', 'stroke', 'circle'] },
  { id: 'whole_hand', label: 'Whole hand', channel: 'hand', fu: 6, accuracy: 'low',
    pressure_max: 10, wetness: 0, can_penetrate: 'no', techniques: ['pressure', 'stroke', 'circle', 'grip'] },
  { id: 'tongue', label: 'Tongue tip', channel: 'mouth', fu: fuOf('tongue', 0.6), accuracy: accOf('tongue', 'high'),
    pressure_max: 3, wetness: 3, can_penetrate: 'shallow', techniques: ['circle', 'stroke', 'tap', 'kiss', 'lick'] },
  { id: 'tongue_flat', label: 'Flat tongue', channel: 'mouth', fu: 2.5, accuracy: 'medium',
    pressure_max: 3, wetness: 3, can_penetrate: 'no', techniques: ['stroke', 'circle', 'kiss', 'lick'] },
  { id: 'lips', label: 'Lips', channel: 'mouth', fu: fuOf('lip', 1.75), accuracy: accOf('lip', 'low'),
    pressure_max: 5, wetness: 2, can_penetrate: 'no', techniques: ['kiss', 'stroke', 'pressure', 'suck'] },
  { id: 'mouth', label: 'Mouth (suck)', channel: 'mouth', fu: 3, accuracy: 'medium',
    pressure_max: 6, wetness: 3, can_penetrate: 'shallow', techniques: ['kiss', 'stroke', 'circle', 'suck'] },
  { id: 'teeth', label: 'Teeth', channel: 'mouth', fu: fuOf('teeth', 0.35), accuracy: accOf('teeth', 'medium'),
    pressure_max: 6, wetness: 0, can_penetrate: 'no', techniques: ['tap', 'pressure', 'kiss', 'nibble'] },
  { id: 'breath', label: 'Breath', channel: 'breath', fu: fuOf('breath', 1.5), accuracy: accOf('breath', 'low'),
    pressure_max: 0, wetness: 1, can_penetrate: 'no', techniques: ['tease'] },
  { id: 'nose', label: 'Nose', channel: 'mouth', fu: 1, accuracy: 'medium',
    pressure_max: 3, wetness: 0, can_penetrate: 'no', techniques: ['stroke', 'circle', 'nuzzle'] },
  { id: 'toe', label: 'Toe', channel: 'foot', fu: fuOf('toe', 1.1), accuracy: accOf('toe', 'low'),
    pressure_max: 6, wetness: 0, can_penetrate: 'no', techniques: ['stroke', 'pressure'] },
  { id: 'penis', label: 'Penis', channel: 'genital', fu: 5, accuracy: 'low',
    pressure_max: 8, wetness: 1, can_penetrate: 'yes', techniques: ['stroke', 'pressure', 'penetrate', 'circle'] },
]

/** Derive a 0–10 precision from accuracy and pad size (smaller + more accurate = finer). */
for (const p of ACTOR_PARTS) {
  const accScore = { high: 3, medium: 2, low: 1 }[p.accuracy] ?? 2
  p.precision = clamp(Math.round(accScore * 2.5 + (3 - Math.min(3, p.fu)) * 1.2), 0, 10)
  p.contact_extent = extentFromFu(p.fu)
}

export const partById = Object.fromEntries(ACTOR_PARTS.map(p => [p.id, p]))

/**
 * Normalize a receiver zone (profile shape OR a lightweight map zone) into the
 * fields the matcher needs.
 * @param {Object} zone
 * @returns {{ fu:number, ch:Record<string,number>, techniques:string[], penetrable:boolean }}
 */
function normalizeZone(zone) {
  const stim = zone.stimulation || {}
  const fu =
    zone.typical_contact_fu ??
    zone.topology?.typical_contact_fu ??
    zone.fu ??
    2
  const ch = {
    pressure: levelToNum(zone.ch?.pressure ?? stim.sensitivity_to_pressure),
    friction: levelToNum(zone.ch?.friction ?? stim.sensitivity_to_friction),
    mouth: levelToNum(zone.ch?.mouth ?? stim.sensitivity_to_mouth),
    hand: levelToNum(zone.ch?.hand ?? stim.sensitivity_to_hand),
  }
  return {
    fu,
    ch,
    techniques: zone.techniques || stim.techniques || [],
    penetrable: !!(zone.penetrable),
  }
}

function levelToNum(v) {
  if (typeof v === 'number') return v
  return LVL[v] ?? 50
}

/**
 * Score how well an actor part suits a receiver zone (0–1).
 * Considers: relative size fit (pad vs zone), technique overlap, channel
 * preference (mouth vs hand), and whether it can reach the needed pressure.
 * @param {ActorPart} part
 * @param {Object} zone receiver zone (profile or map zone)
 */
export function scoreActorPart(part, zone) {
  const z = normalizeZone(zone)

  // size: ideal when the pad fits within the zone (can isolate it). A pad larger
  // than the zone spills over and is penalized; a much smaller pad is slightly
  // less efficient but still effective.
  let size
  if (part.fu <= z.fu) size = 1 - Math.min(1, (z.fu - part.fu) / (z.fu * 2 + 0.5)) * 0.35
  else size = Math.max(0, 1 - (part.fu - z.fu) / 2.4)
  size = clamp(size, 0, 1)

  const techOverlap = z.techniques.length
    ? z.techniques.filter(t => part.techniques.includes(t)).length / z.techniques.length
    : 0.5

  const mouthNeed = z.ch.mouth / 90
  const handNeed = z.ch.hand / 90
  const chPref =
    part.channel === 'mouth' || part.channel === 'breath' ? mouthNeed
    : part.channel === 'hand' ? handNeed
    : 0.5 * (mouthNeed + handNeed)

  const pressureNeed = z.ch.pressure / 9 // → 0–10
  const pressureOk = part.pressure_max >= pressureNeed ? 1 : 0.55

  const penBonus = z.penetrable && part.can_penetrate !== 'no' ? 0.05 : 0

  return clamp(size * 0.42 + techOverlap * 0.24 + chPref * 0.22 + pressureOk * 0.12 + penBonus, 0, 1)
}

/** Short human reason for why a part suits the zone. */
export function reasonForPart(part, zone) {
  const z = normalizeZone(zone)
  if (part.fu > z.fu + 0.6) return 'broad contact'
  if (z.ch.pressure >= 90 && part.pressure_max >= 8) return 'firm pressure'
  if ((part.channel === 'mouth') && z.ch.mouth >= 90) return 'soft & wet'
  if (part.can_penetrate !== 'no' && z.penetrable) return 'can enter'
  if (part.fu <= z.fu) return 'precise fit'
  return 'good fit'
}

/**
 * Rank actor parts for a receiver zone.
 * @param {Object} zone receiver zone (profile or lightweight map zone)
 * @param {{ limit?:number, channel?:string }} [opts]
 * @returns {{ id:string, label:string, score:number, reason:string }[]}
 */
export function recommendActorParts(zone, opts = {}) {
  const { limit = 3, channel } = opts
  return ACTOR_PARTS
    .filter(p => (channel ? p.channel === channel : true))
    .map(p => ({ id: p.id, label: p.label, score: scoreActorPart(p, zone), reason: reasonForPart(p, zone) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
