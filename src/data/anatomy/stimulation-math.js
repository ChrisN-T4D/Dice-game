/**
 * Perceived stimulation: S = k * (P_eff * v)^n
 * P_eff uses zone FU, contact footprint, and modality pad vs zone size.
 */

import { parseSequenceMeta } from './actions/_makeSequenceAction.js'
import {
  defaultFuFromSurfaceArea,
  effectiveContactFu,
  getStimulatorContact,
} from './contact-scale.js'

const LEVEL_SCALAR = {  very_low: 0.15,
  low: 0.25,
  medium: 0.5,
  high: 0.85,
}

const SENSITIVITY_MULT = {
  low: 0.7,
  medium: 1,
  high: 1.3,
}

const FOOTPRINT_FACTOR = {
  point: 1.15,
  linear: 1,
  patch: 0.85,
  enveloping: 0.7,
}

const COVERAGE_FACTOR = {
  edge_only: 0.75,
  partial: 0.9,
  full: 1,
}

const ZONE_AREA_FACTOR = {
  small: 1.1,
  medium: 1,
  large: 0.9,
}

const EXTENT_FACTOR = {
  micro: 1.12,
  narrow: 1.06,
  modest: 1,
  broad: 0.94,
  extended: 0.88,
}

/** @param {string} level */
export function levelToScalar(level) {
  if (level == null) return 0.5
  const key = String(level).toLowerCase()
  return LEVEL_SCALAR[key] ?? 0.5
}

/**
 * @param {{ footprint?: string, coverage?: string }} contact
 * @param {object} [topology]
 * @param {{ modality?: string, technique?: string }} [actionMeta]
 */
export function contactPressureFactor(contact = {}, topology = {}, actionMeta = {}) {
  const fp = FOOTPRINT_FACTOR[contact.footprint] ?? 1
  const cov = COVERAGE_FACTOR[contact.coverage] ?? 1
  const area = ZONE_AREA_FACTOR[topology.surface_area] ?? 1
  const extent = EXTENT_FACTOR[topology.contact_extent] ?? 1
  const typicalFu =
    topology.typical_contact_fu ?? defaultFuFromSurfaceArea(topology.surface_area)
  const { pad_fu } = effectiveContactFu(
    {
      contact,
      stimulator: actionMeta.stimulator,
      modality: actionMeta.modality,
      technique: actionMeta.technique,
    },
    topology
  )
  const fuRatio = typicalFu > 0 ? Math.min(1.4, pad_fu / typicalFu) : 1
  const padPressure = fuRatio > 1 ? 1 / Math.sqrt(fuRatio) : 1 + (1 - fuRatio) * 0.15
  return fp * cov * area * extent * padPressure
}

/**
 * Zone baseline k and n from profile / hierarchy row.
 * @param {object} zoneLike - profile chunk or API zone with stimulation/topology
 */
export function zoneConstants(zoneLike = {}) {
  const stim = zoneLike.stimulation || {}
  const ep = stim.erogenous_priority ?? zoneLike.erogenous_priority ?? 50
  const score = zoneLike.sensitivity_score ?? ep
  const pressSens = stim.sensitivity_to_pressure ?? 'medium'
  const kBase = (ep / 100) * (SENSITIVITY_MULT[pressSens] ?? 1)

  let n = 0.85
  if (ep >= 85) n = 1.15
  else if (ep >= 60) n = 1

  return { k: Math.min(1.35, Math.max(0.45, kBase)), n }
}

/**
 * @param {object} action
 * @param {object} [zoneLike]
 * @returns {{ P: number, v: number, P_eff: number, k: number, n: number, S: number, frictionMultiplier: number }}
 */
export function computePerceivedStimulation(action, zoneLike = {}) {
  const stim = action.stimulation || {}
  const P = levelToScalar(stim.pressure?.level ?? stim.pressure)
  const v = levelToScalar(stim.tempo?.level ?? stim.tempo)
  const friction = levelToScalar(stim.friction?.level ?? stim.friction)
  const frictionMultiplier = 1 + 0.15 * friction

  const topology = zoneLike.topology || {}
  const contact = action.contact || {}
  const factor = contactPressureFactor(contact, topology, {
    stimulator: action.stimulator,
    modality: action.modality,
    technique: action.technique,
  })
  const P_eff = Math.min(1, P * factor)
  const stimContact = getStimulatorContact(action)
  const stimulator = stimContact.stimulator
  const { pad_fu, zone_typical_fu } = effectiveContactFu(action, topology)

  const { k, n } = zoneConstants(zoneLike)
  // Boost sub-unity P·v so authored low/light actions still land on 10–100 display scale
  const product = Math.min(1, Math.max(0.001, P_eff * v * 3.2))
  const S = Math.round(
    Math.min(100, Math.max(0, 100 * k * Math.pow(product, n) * frictionMultiplier))
  )

  return {
    P: round3(P),
    v: round3(v),
    P_eff: round3(P_eff),
    k: round3(k),
    n: round3(n),
    S,
    frictionMultiplier: round3(frictionMultiplier),
    stimulator,
    contact_pad_fu: pad_fu,
    zone_typical_fu: zone_typical_fu ?? defaultFuFromSurfaceArea(topology.surface_area),
    placement_accuracy: stimContact.placement_accuracy,
  }
}

/**
 * Weighted S across sequence steps (by beats).
 * @param {object} action - sequence action with meta.sequence_steps
 * @param {Record<string, object>} profilesByZone - zone_id → profile chunk
 */
export function computeSequenceStimulation(action, profilesByZone = {}) {
  const seq = parseSequenceMeta(action)
  if (!seq?.sequence_steps?.length) {
    return computePerceivedStimulation(action, profilesByZone[action.zone_id] || {})
  }

  const steps = seq.sequence_steps
  let totalBeats = 0
  let weightedS = 0
  const stepBreakdowns = []

  for (const step of steps) {
    const beats = step.beats ?? 10
    totalBeats += beats
    const zoneLike = profilesByZone[step.zone_id] || {}
    const stepAction = {
      technique: step.technique,
      stimulator: step.stimulator,
      modality: step.modality,
      stimulation: action.stimulation,
      contact: step.contact,
    }
    const b = computePerceivedStimulation(stepAction, zoneLike)
    stepBreakdowns.push({ zone_id: step.zone_id, beats, S: b.S })
    weightedS += b.S * beats
  }

  const S = Math.round(Math.min(100, Math.max(0, weightedS / Math.max(1, totalBeats))))
  const anchorProfile = profilesByZone[action.zone_id] || profilesByZone[seq.anchor_zone_id] || {}
  const anchorBreakdown = computePerceivedStimulation(
    {
      ...action,
      technique: steps[0].technique,
      stimulator: steps[0].stimulator,
      modality: steps[0].modality,
      contact: steps[0].contact,
    },
    anchorProfile
  )

  return {
    ...anchorBreakdown,
    S,
    sequence: true,
    step_breakdowns: stepBreakdowns,
    total_beats: totalBeats,
  }
}

/** @param {number} s 0–100 */
export function stimulationBand(s) {
  if (s < 25) return 'light'
  if (s < 50) return 'building'
  if (s < 75) return 'strong'
  return 'intense'
}

function round3(n) {
  return Math.round(n * 1000) / 1000
}
