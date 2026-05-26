/**
 * Normalize API action rows and compute S for display/audit.
 */
import zoneProfiles from './profiles/index.js'
import {
  computePerceivedStimulation,
  computeSequenceStimulation,
  stimulationBand,
} from './stimulation-math.js'
import { parseSequenceMeta } from './actions/_makeSequenceAction.js'

export function zoneProfileFromApiZone(zoneLike = {}) {
  return {
    stimulation: zoneLike.stimulation,
    topology: zoneLike.topology,
    erogenous_priority:
      zoneLike.erogenous_priority ?? zoneLike.stimulation?.erogenous_priority,
    sensitivity_score: zoneLike.sensitivity_score,
    techniques: zoneLike.techniques,
  }
}

function parseMeta(action) {
  if (!action.meta) return {}
  if (typeof action.meta === 'object') return action.meta
  try {
    return JSON.parse(action.meta)
  } catch {
    return {}
  }
}

function profilesForSequence(seq) {
  const profilesByZone = {}
  for (const zid of seq.sequence_zones || []) {
    profilesByZone[zid] = zoneProfileFromApiZone(zoneProfiles[zid] || {})
  }
  return profilesByZone
}

/**
 * @param {object} action
 * @param {object} zoneLike
 */
export function enrichAction(action, zoneLike = {}) {
  const meta = parseMeta(action)
  const contact = action.contact?.footprint ? action.contact : meta.contact || {}
  const stimulator = action.stimulator ?? meta.stimulator ?? null
  const also_stimulates = action.also_stimulates ?? meta.also_stimulates ?? []
  const spillover_weight = action.spillover_weight ?? meta.spillover_weight ?? null
  const seq = parseSequenceMeta({ ...action, meta })

  const zoneProfile = zoneProfileFromApiZone(zoneLike)
  const full = {
    ...action,
    contact,
    stimulator,
    also_stimulates: Array.isArray(also_stimulates) ? also_stimulates : [],
    spillover_weight,
    action_kind: action.action_kind || (seq ? 'sequence' : 'single'),
    sequence_ref: Boolean(action.sequence_ref),
    anchor_zone_id: action.anchor_zone_id ?? meta.anchor_zone_id ?? null,
    sequence_zones: action.sequence_zones ?? meta.sequence_zones ?? null,
    sequence_steps: action.sequence_steps ?? meta.sequence_steps ?? null,
    instruction_parts: action.instruction_parts ?? meta.instruction_parts ?? null,
  }

  let breakdown = action.stimulationBreakdown
  if (!breakdown) {
    breakdown = seq
      ? computeSequenceStimulation(full, profilesForSequence(seq))
      : computePerceivedStimulation(full, zoneProfile)
  }

  return {
    ...full,
    stimulationBreakdown: breakdown,
    perceived_stimulation: breakdown.S,
    stimulation_band: stimulationBand(breakdown.S),
  }
}

export function enrichZoneActions(actions, zoneLike) {
  if (!Array.isArray(actions)) return []
  return actions.map((a) => enrichAction(a, zoneLike))
}
