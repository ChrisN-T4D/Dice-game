/**
 * Distinct stimulation blueprints — each id is a unique sensation slot.
 */

import { blueprintInstruction } from './instruction-compose.js'

/** @typedef {object} Blueprint
 * @property {string} id
 * @property {string} technique
 * @property {string} modality
 * @property {string} stimulator
 * @property {string} pressure
 * @property {string} tempo
 * @property {string} friction
 * @property {object | ((zoneId: string, profile: object) => object)} contact
 * @property {(label: string, zoneId: string, profile: object) => string} instruction
 * @property {(profile: object) => boolean} [when]
 */

/** @param {object} profile */
function techniques(profile) {
  return new Set(profile.techniques || profile.stimulation?.techniques || ['stroke', 'pressure'])
}

/** @param {object} profile */
function stim(profile) {
  return profile.stimulation || {}
}

/** @param {object} profile @param {string} mod */
function modalityOk(profile, mod) {
  const s = stim(profile)
  if (mod === 'mouth' && s.sensitivity_to_mouth === 'low') return false
  if (mod === 'teeth' && s.sensitivity_to_teeth === 'low') return false
  if (mod === 'hand' && s.sensitivity_to_hand === 'low') {
    const mouthOk = s.sensitivity_to_mouth !== 'low'
    const teethOk = s.sensitivity_to_teeth !== 'low'
    if (mouthOk || teethOk) return false
  }
  return true
}

/**
 * Internal-deep zones (canal walls, cervix, prostate) admit only a slim finger —
 * a palm/thumb/tongue/lip/breath physically cannot reach them. Keeps generated
 * prose ("a loose palm on the anterior wall") honest and feasible.
 */
const INTERNAL_DEEP_ZONES = new Set([
  'vagina',
  'vaginal_anterior_wall',
  'vaginal_posterior_wall',
  'vaginal_lateral_wall',
  'cervix',
  'cervical_os',
  'prostate',
])
const INTERNAL_REACH_STIMULATORS = new Set(['finger', 'fingertip'])

/** @param {Blueprint} bp @param {object} profile @param {string} [zoneId] */
export function blueprintAllowed(bp, profile, zoneId = '') {
  if (!techniques(profile).has(bp.technique)) return false
  if (!modalityOk(profile, bp.modality)) return false
  if (INTERNAL_DEEP_ZONES.has(zoneId) && !INTERNAL_REACH_STIMULATORS.has(bp.stimulator)) {
    return false
  }
  if (bp.when && !bp.when(profile, zoneId)) return false
  return true
}

/** @param {Blueprint['contact']} contact @param {string} zoneId @param {object} profile */
export function resolveContact(contact, zoneId, profile) {
  return typeof contact === 'function' ? contact(zoneId, profile) : contact
}

const smallZone = (profile) => (profile.topology?.typical_contact_fu ?? 2) <= 1
const deepZone = (profile) => profile.topology?.depth === 'deep'

/** @type {Blueprint[]} */
export const ACTION_BLUEPRINTS = [
  {
    id: 'stroke_finger_glide',
    technique: 'stroke',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    friction: 'high',
    contact: (z, p) =>
      smallZone(p)
        ? { footprint: 'linear', coverage: 'edge_only' }
        : { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('stroke_finger_glide'),
  },
  {
    id: 'stroke_finger_drag',
    technique: 'stroke',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'medium',
    friction: 'medium',
    contact: { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('stroke_finger_drag'),
  },
  {
    id: 'stroke_thumb_trail',
    technique: 'stroke',
    modality: 'hand',
    stimulator: 'thumb',
    pressure: 'low',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'linear', coverage: 'edge_only' },
    instruction: blueprintInstruction('stroke_thumb_trail'),
  },
  {
    id: 'stroke_palm_sweep',
    technique: 'stroke',
    modality: 'hand',
    stimulator: 'palm',
    pressure: 'medium',
    tempo: 'low',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'full' },
    instruction: blueprintInstruction('stroke_palm_sweep'),
    when: (p) => !smallZone(p),
  },
  {
    id: 'circle_fingertip_orbit',
    technique: 'circle',
    modality: 'hand',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'medium',
    friction: 'high',
    contact: (z, p) =>
      smallZone(p)
        ? { footprint: 'point', coverage: 'edge_only' }
        : { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('circle_fingertip_orbit'),
  },
  {
    id: 'circle_finger_spiral',
    technique: 'circle',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('circle_finger_spiral'),
  },
  {
    id: 'circle_thumb_knead',
    technique: 'circle',
    modality: 'hand',
    stimulator: 'thumb',
    pressure: 'medium',
    tempo: 'low',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('circle_thumb_knead'),
  },
  {
    id: 'tap_fingertip_flutter',
    technique: 'tap',
    modality: 'hand',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'high',
    friction: 'low',
    contact: (z, p) =>
      smallZone(p)
        ? { footprint: 'point', coverage: 'edge_only' }
        : { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('tap_fingertip_flutter'),
  },
  {
    id: 'tap_finger_drum',
    technique: 'tap',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'high',
    friction: 'medium',
    contact: { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('tap_finger_drum'),
  },
  {
    id: 'tap_thumb_pulse',
    technique: 'tap',
    modality: 'hand',
    stimulator: 'thumb',
    pressure: 'medium',
    tempo: 'medium',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'partial' },
    instruction: blueprintInstruction('tap_thumb_pulse'),
  },
  {
    id: 'pressure_thumb_point',
    technique: 'pressure',
    modality: 'hand',
    stimulator: 'thumb',
    pressure: 'high',
    tempo: 'low',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'partial' },
    instruction: blueprintInstruction('pressure_thumb_point'),
  },
  {
    id: 'pressure_finger_creep',
    technique: 'pressure',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'linear', coverage: 'edge_only' },
    instruction: blueprintInstruction('pressure_finger_creep'),
  },
  {
    id: 'pressure_palm_heel',
    technique: 'pressure',
    modality: 'hand',
    stimulator: 'palm',
    pressure: 'high',
    tempo: 'medium',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'full' },
    instruction: blueprintInstruction('pressure_palm_heel'),
    when: (p) => !smallZone(p),
  },
  {
    id: 'mouth_tongue_flat_wash',
    technique: 'stroke',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'low',
    tempo: 'low',
    friction: 'high',
    contact: (z, p) =>
      smallZone(p)
        ? { footprint: 'linear', coverage: 'edge_only' }
        : { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('mouth_tongue_flat_wash'),
  },
  {
    id: 'mouth_tongue_tip_trace',
    technique: 'stroke',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'low',
    tempo: 'medium',
    friction: 'medium',
    contact: { footprint: 'point', coverage: 'edge_only' },
    instruction: blueprintInstruction('mouth_tongue_tip_trace'),
  },
  {
    id: 'mouth_tongue_figure8',
    technique: 'circle',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'low',
    tempo: 'medium',
    friction: 'high',
    contact: { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('mouth_tongue_figure8'),
  },
  {
    id: 'mouth_tongue_flicker',
    technique: 'tap',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'low',
    tempo: 'high',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'edge_only' },
    instruction: blueprintInstruction('mouth_tongue_flicker'),
  },
  {
    id: 'mouth_lip_seal_kiss',
    technique: 'kiss',
    modality: 'mouth',
    stimulator: 'lip',
    pressure: 'medium',
    tempo: 'low',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('mouth_lip_seal_kiss'),
  },
  {
    id: 'mouth_lip_nibble_kiss',
    technique: 'kiss',
    modality: 'mouth',
    stimulator: 'lip',
    pressure: 'low',
    tempo: 'medium',
    friction: 'medium',
    contact: { footprint: 'linear', coverage: 'edge_only' },
    instruction: blueprintInstruction('mouth_lip_nibble_kiss'),
  },
  {
    id: 'stroke_lip_glide',
    technique: 'stroke',
    modality: 'mouth',
    stimulator: 'lip',
    pressure: 'low',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('stroke_lip_glide'),
  },
  {
    id: 'mouth_lip_suction',
    technique: 'kiss',
    modality: 'mouth',
    stimulator: 'lip',
    pressure: 'high',
    tempo: 'low',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('mouth_lip_suction'),
  },
  {
    id: 'mouth_tongue_vibrate',
    technique: 'tap',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'medium',
    tempo: 'high',
    friction: 'medium',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('mouth_tongue_vibrate'),
  },
  {
    id: 'teeth_edge_brush',
    technique: 'tap',
    modality: 'teeth',
    stimulator: 'teeth',
    pressure: 'very_low',
    tempo: 'medium',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'partial' },
    instruction: blueprintInstruction('teeth_edge_brush'),
    when: (p) => !smallZone(p),
  },
  {
    id: 'teeth_nibble_line',
    technique: 'stroke',
    modality: 'teeth',
    stimulator: 'teeth',
    pressure: 'very_low',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('teeth_nibble_line'),
    when: (p) => techniques(p).has('stroke') && !smallZone(p),
  },
  {
    id: 'breath_warm_gust',
    technique: 'stroke',
    modality: 'mouth',
    stimulator: 'breath',
    pressure: 'very_low',
    tempo: 'low',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('breath_warm_gust'),
    when: (p) => stim(p).sensitivity_to_mouth !== 'low',
  },
  {
    id: 'stroke_fingertip_feather',
    technique: 'stroke',
    modality: 'hand',
    stimulator: 'fingertip',
    pressure: 'very_low',
    tempo: 'medium',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'edge_only' },
    instruction: blueprintInstruction('stroke_fingertip_feather'),
  },
  {
    id: 'pressure_thumb_drag_deep',
    technique: 'pressure',
    modality: 'hand',
    stimulator: 'thumb',
    pressure: 'medium',
    tempo: 'medium',
    friction: 'medium',
    contact: (z, p) =>
      deepZone(p)
        ? { footprint: 'patch', coverage: 'partial' }
        : { footprint: 'linear', coverage: 'full' },
    instruction: blueprintInstruction('pressure_thumb_drag_deep'),
    when: (p) => deepZone(p) || !smallZone(p),
  },
  {
    id: 'pressure_finger_curl',
    technique: 'pressure',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('pressure_finger_curl'),
    when: (p, zoneId) => INTERNAL_DEEP_ZONES.has(zoneId),
  },
  {
    id: 'circle_palm_roll',
    technique: 'circle',
    modality: 'hand',
    stimulator: 'palm',
    pressure: 'medium',
    tempo: 'medium',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'full' },
    instruction: blueprintInstruction('circle_palm_roll'),
    when: (p) => !smallZone(p),
  },
  {
    id: 'tap_hand_chop_light',
    technique: 'tap',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'very_low',
    tempo: 'high',
    friction: 'low',
    contact: { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('tap_hand_chop_light'),
  },
  {
    id: 'stroke_tongue_side_lay',
    technique: 'stroke',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'high',
    tempo: 'low',
    friction: 'high',
    contact: { footprint: 'linear', coverage: 'partial' },
    instruction: blueprintInstruction('stroke_tongue_side_lay'),
  },
  {
    id: 'kiss_lip_peck_chain',
    technique: 'kiss',
    modality: 'mouth',
    stimulator: 'lip',
    pressure: 'low',
    tempo: 'high',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'edge_only' },
    instruction: blueprintInstruction('kiss_lip_peck_chain'),
  },
  {
    id: 'pressure_finger_spread',
    technique: 'pressure',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'medium',
    friction: 'low',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('pressure_finger_spread'),
  },
  {
    id: 'pressure_finger_walk',
    technique: 'pressure',
    modality: 'hand',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'point', coverage: 'partial' },
    instruction: blueprintInstruction('pressure_finger_walk'),
  },
  {
    id: 'circle_tongue_slow_loop',
    technique: 'circle',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'medium',
    tempo: 'low',
    friction: 'high',
    contact: { footprint: 'point', coverage: 'edge_only' },
    instruction: blueprintInstruction('circle_tongue_slow_loop'),
  },
  {
    id: 'stroke_palm_vibrate',
    technique: 'stroke',
    modality: 'hand',
    stimulator: 'palm',
    pressure: 'low',
    tempo: 'high',
    friction: 'medium',
    contact: { footprint: 'patch', coverage: 'partial' },
    instruction: blueprintInstruction('stroke_palm_vibrate'),
    when: (p) => !smallZone(p),
  },
  {
    id: 'mouth_tongue_angled_streak',
    technique: 'stroke',
    modality: 'mouth',
    stimulator: 'tongue',
    pressure: 'low',
    tempo: 'high',
    friction: 'high',
    contact: { footprint: 'linear', coverage: 'edge_only' },
    instruction: blueprintInstruction('mouth_tongue_angled_streak'),
  },
  {
    id: 'stroke_fingertip_micro_sketch',
    technique: 'stroke',
    modality: 'hand',
    stimulator: 'fingertip',
    pressure: 'very_low',
    tempo: 'low',
    friction: 'medium',
    contact: { footprint: 'point', coverage: 'edge_only' },
    instruction: blueprintInstruction('stroke_fingertip_micro_sketch'),
    when: (p) => smallZone(p),
  },
  {
    id: 'kiss_lip_micro_hover',
    technique: 'kiss',
    modality: 'mouth',
    stimulator: 'lip',
    pressure: 'very_low',
    tempo: 'low',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'partial' },
    instruction: blueprintInstruction('kiss_lip_micro_hover'),
    when: (p, zoneId) => smallZone(p) && stim(p).sensitivity_to_mouth !== 'low',
  },
  {
    id: 'tap_toe_point',
    technique: 'tap',
    modality: 'hand',
    stimulator: 'toe',
    pressure: 'low',
    tempo: 'medium',
    friction: 'low',
    contact: { footprint: 'point', coverage: 'partial' },
    instruction: blueprintInstruction('tap_toe_point'),
    when: (p, zoneId) =>
      zoneId === 'feet' || zoneId === 'soles' || zoneId === 'toes' || zoneId === 'ankles',
  },
]
