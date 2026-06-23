import { STIMULATOR_PARTS, resolveStimulator } from '../contact-scale.js'
import { enrichSingleActionInstruction } from './instruction-compose.js'

const MODALITY_CODES = ['hand', 'mouth', 'teeth']
const LEVELS = ['very_low', 'low', 'medium', 'high']

function humanize(id) {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function normalizeModality(modality) {
  if (typeof modality === 'number') {
    return MODALITY_CODES[modality - 1] || 'hand'
  }
  if (typeof modality === 'string' && MODALITY_CODES.includes(modality)) {
    return modality
  }
  return 'hand'
}

function channel(val) {
  if (val == null) return null
  if (typeof val === 'string') return { level: val }
  if (typeof val === 'object' && val.level) return { level: val.level }
  return null
}

export function normalizeStimulation(raw = {}) {
  const out = {}
  for (const key of ['pressure', 'tempo', 'friction']) {
    if (raw[key] != null) {
      const c = channel(raw[key])
      if (c) out[key] = c
    }
  }
  return out
}

/**
 * @param {Object} opts
 * @param {string} opts.stimulator - fingertip|finger|thumb|palm|toe|lip|tongue|teeth|breath
 * @param {string} opts.modality - hand|mouth|teeth (DB technique channel)
 * @param {string[]} [opts.also_stimulates] - required when pad FU > zone typical FU
 */
export function makeAction(opts = {}) {
  const {
    zone_id,
    instruction,
    technique,
    stimulator: stimulatorIn,
    modality,
    stimulation: stimRaw,
    contact,
    also_stimulates = [],
    spillover_weight,
    erogenous_weight = 50,
    intensity,
    meta,
    sort_order = 0,
    display_name,
  } = opts

  const modalityCode = normalizeModality(modality)
  const stimulator = resolveStimulator(stimulatorIn, modalityCode, technique)

  if (!STIMULATOR_PARTS.includes(stimulator)) {
    throw new Error(
      `makeAction(${zone_id}): invalid stimulator "${stimulator}" — use ${STIMULATOR_PARTS.join(', ')}`
    )
  }

  const stimulation = normalizeStimulation(stimRaw)

  if (!stimulation.pressure?.level) {
    throw new Error(`makeAction(${zone_id}): stimulation.pressure required`)
  }
  if (!stimulation.tempo?.level) {
    throw new Error(`makeAction(${zone_id}): stimulation.tempo required`)
  }
  if (!contact?.footprint || !contact?.coverage) {
    throw new Error(`makeAction(${zone_id}): contact.footprint and contact.coverage required`)
  }

  const displayName =
    display_name ||
    `${humanize(technique)} (${stimulator} / ${modalityCode}) on ${humanize(zone_id)}`

  const metaIsObject = meta && typeof meta === 'object'
  // Sequences and hand-authored technique entries keep their instruction
  // verbatim; only generated single actions get auto-enrichment (spillover
  // notes, polish, etc.).
  const verbatim =
    metaIsObject && (meta.action_kind === 'sequence' || meta.action_kind === 'technique')
  const finalInstruction = verbatim
    ? instruction.trim()
    : enrichSingleActionInstruction(instruction, {
        zone_id,
        stimulator,
        modality: modalityCode,
        technique,
      })

  const metaObj =
    meta && typeof meta === 'object' ? { ...meta } : meta ? { note: meta } : {}
  metaObj.contact = contact
  metaObj.stimulator = stimulator
  if (also_stimulates.length) metaObj.also_stimulates = also_stimulates
  if (spillover_weight) metaObj.spillover_weight = spillover_weight

  const payload = {
    zone_id,
    instruction: finalInstruction,
    technique,
    stimulator,
    modality: modalityCode,
    stimulation,
    contact,
    also_stimulates,
    erogenous_weight,
    sort_order,
    display_name: displayName,
  }

  if (spillover_weight) payload.spillover_weight = spillover_weight
  if (intensity != null) payload.intensity = intensity
  payload.meta = JSON.stringify(metaObj)

  return payload
}

export { LEVELS, MODALITY_CODES, STIMULATOR_PARTS }
