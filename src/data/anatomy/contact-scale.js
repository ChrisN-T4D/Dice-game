/**
 * Finger units (FU), zone size, and stimulator contact pad / placement accuracy.
 * Pad applies only to body parts used to stimulate (not the receiving zone).
 * 1 FU ≈ one finger width (~15–20 mm).
 */

export const CONTACT_EXTENTS = ['micro', 'narrow', 'modest', 'broad', 'extended']

export const ACCURACY_LEVELS = ['high', 'medium', 'low']

/** Body parts that deliver stimulation — each has a contact pad size (FU). */
export const STIMULATOR_PARTS = [
  'fingertip',
  'finger',
  'thumb',
  'palm',
  'toe',
  'lip',
  'tongue',
  'teeth',
  'breath',
]

/**
 * @type {Record<string, { contact_pad_fu: number, placement_accuracy: string, label: string }>}
 */
export const STIMULATOR_CONTACT = {
  fingertip: { contact_pad_fu: 0.5, placement_accuracy: 'high', label: 'fingertip' },
  finger: { contact_pad_fu: 1, placement_accuracy: 'high', label: 'finger' },
  thumb: { contact_pad_fu: 1.2, placement_accuracy: 'high', label: 'thumb' },
  /** Full palm heel-to-fingers — about four to five finger-widths across (~60–100 mm). */
  palm: { contact_pad_fu: 4.5, placement_accuracy: 'low', label: 'palm' },
  toe: { contact_pad_fu: 1.1, placement_accuracy: 'low', label: 'toe' },
  lip: { contact_pad_fu: 1.75, placement_accuracy: 'low', label: 'lips' },
  tongue: { contact_pad_fu: 0.6, placement_accuracy: 'high', label: 'tongue' },
  teeth: { contact_pad_fu: 0.35, placement_accuracy: 'medium', label: 'teeth' },
  breath: { contact_pad_fu: 1.5, placement_accuracy: 'low', label: 'breath / blowing' },
}

const ACCURACY_RANK = { high: 3, medium: 2, low: 1 }

/** Legacy modality → default stimulator if action omits stimulator (prefer explicit). */
const MODALITY_TECHNIQUE_TO_STIMULATOR = {
  mouth: {
    kiss: 'lip',
    stroke: 'tongue',
    circle: 'tongue',
    tap: 'tongue',
    pressure: 'lip',
  },
  hand: {
    stroke: 'finger',
    circle: 'finger',
    tap: 'fingertip',
    pressure: 'palm',
    kiss: 'lip',
  },
  teeth: {
    kiss: 'teeth',
    tap: 'teeth',
    stroke: 'teeth',
    circle: 'teeth',
    pressure: 'teeth',
  },
}

/**
 * @param {string} [stimulator]
 * @param {string} [modality]
 * @param {string} [technique]
 */
export function resolveStimulator(stimulator, modality, technique) {
  if (stimulator && STIMULATOR_CONTACT[stimulator]) {
    return stimulator
  }
  const inferred = MODALITY_TECHNIQUE_TO_STIMULATOR[modality]?.[technique]
  return inferred || 'finger'
}

/**
 * Contact pad for the stimulating body part only.
 * @param {object} action - stimulator and/or modality + technique
 */
export function getStimulatorContact(action) {
  const stim = resolveStimulator(
    action.stimulator,
    action.modality,
    action.technique
  )
  const spec = STIMULATOR_CONTACT[stim]
  return {
    stimulator: stim,
    contact_pad_fu: spec.contact_pad_fu,
    placement_accuracy: spec.placement_accuracy,
    label: spec.label,
  }
}

/** @deprecated Use getStimulatorContact */
export function getModalityContact(modality, technique) {
  const stim = resolveStimulator(null, modality, technique)
  return getStimulatorContact({ stimulator: stim })
}

export function extentFromFu(fu) {
  if (fu <= 0.6) return 'micro'
  if (fu <= 1.25) return 'narrow'
  if (fu <= 2.5) return 'modest'
  if (fu <= 4) return 'broad'
  return 'extended'
}

export function defaultFuFromSurfaceArea(surfaceArea) {
  /** canvas ≈ full back / long massage fields (~15–20 finger-widths across). */
  const map = { small: 0.75, medium: 2, large: 4, canvas: 18 }
  return map[surfaceArea] ?? 2
}

/**
 * Effective pad FU after contact footprint/coverage on the receiving zone.
 */
export function effectiveContactFu(action, zoneTopology = {}) {
  const { contact_pad_fu } = getStimulatorContact(action)
  let pad = contact_pad_fu
  const cov = action.contact?.coverage
  const fp = action.contact?.footprint
  if (cov === 'edge_only') pad *= 0.55
  else if (cov === 'partial') pad *= 0.85
  if (fp === 'point') pad *= 0.45
  else if (fp === 'linear') pad *= 0.7
  else if (fp === 'enveloping') pad *= 1.15
  const typical = zoneTopology.typical_contact_fu ?? defaultFuFromSurfaceArea(zoneTopology.surface_area)
  return {
    pad_fu: round2(pad),
    zone_typical_fu: typical,
    zone_max_fu: zoneTopology.max_contact_fu ?? typical * 1.5,
    stimulator: resolveStimulator(action.stimulator, action.modality, action.technique),
  }
}

/**
 * True when stimulator pad (after contact shape) is larger than the zone's typical width.
 */
export function padExceedsZone(action, zoneTopology = {}) {
  const { pad_fu, zone_typical_fu } = effectiveContactFu(action, zoneTopology)
  const typical = zone_typical_fu ?? defaultFuFromSurfaceArea(zoneTopology.surface_area)
  return pad_fu > typical
}

/** Spillover list required whenever pad exceeds zone. */
export function spilloverRequired(action, zoneTopology = {}) {
  return padExceedsZone(action, zoneTopology)
}

export function accuracyAllowsIsolation(action, contact) {
  const { placement_accuracy } = getStimulatorContact(action)
  if (ACCURACY_RANK[placement_accuracy] >= ACCURACY_RANK.high) {
    return contact?.footprint === 'point' || contact?.coverage === 'edge_only'
  }
  return false
}

function round2(n) {
  return Math.round(n * 100) / 100
}
