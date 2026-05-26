import { makeAction, normalizeStimulation } from './_makeAction.js'
import { resolveStimulator } from '../contact-scale.js'

/**
 * @typedef {Object} SequenceStep
 * @property {string} zone_id
 * @property {string} technique
 * @property {string} stimulator
 * @property {string} modality
 * @property {{ footprint: string, coverage: string }} contact
 * @property {number} [beats]
 * @property {string} [cue] - short human phrase for this leg (used in instruction compose)
 */

/**
 * Multi-zone ordered action. Stored with zone_id = anchor; path in meta.
 * @param {Object} opts
 * @param {string} opts.anchor_zone_id
 * @param {string[]} opts.sequence_zones - ordered zone path
 * @param {SequenceStep[]} opts.steps - one per zone in order
 * @param {string} opts.instruction - full how-to (80–450 chars)
 * @param {object} opts.stimulation - session-wide pressure/tempo/friction
 * @param {string} [opts.display_name]
 * @param {number} [opts.sort_order]
 * @param {number} [opts.erogenous_weight]
 * @param {'progression' | 'sweep'} [opts.sequence_flow]
 * @param {{ type: 'speak' | 'pause', text?: string, seconds?: number }[]} [opts.instruction_parts]
 */
export function makeSequenceAction(opts = {}) {
  const {
    anchor_zone_id,
    sequence_zones,
    steps,
    instruction,
    instruction_parts = [],
    stimulation: stimRaw,
    display_name,
    sort_order = 1000,
    erogenous_weight = 50,
    sequence_flow = 'progression',
  } = opts

  if (!anchor_zone_id) throw new Error('makeSequenceAction: anchor_zone_id required')
  if (!Array.isArray(sequence_zones) || sequence_zones.length < 2) {
    throw new Error('makeSequenceAction: sequence_zones needs at least 2 zones')
  }
  if (!Array.isArray(steps) || steps.length < 2) {
    throw new Error('makeSequenceAction: steps needs at least 2 entries')
  }
  if (steps.length !== sequence_zones.length) {
    throw new Error('makeSequenceAction: steps length must match sequence_zones')
  }
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].zone_id !== sequence_zones[i]) {
      throw new Error(
        `makeSequenceAction: step[${i}].zone_id ${steps[i].zone_id} !== sequence_zones[${i}] ${sequence_zones[i]}`
      )
    }
  }

  const first = steps[0]
  const modalityCode =
    first.modality === 'mouth' ? 'mouth' : first.modality === 'teeth' ? 'teeth' : 'hand'
  const stimulator = resolveStimulator(first.stimulator, modalityCode, first.technique)
  const stimulation = normalizeStimulation(stimRaw)

  const normalizedSteps = steps.map((step) => ({
    zone_id: step.zone_id,
    technique: step.technique,
    stimulator: resolveStimulator(step.stimulator, step.modality || modalityCode, step.technique),
    modality: step.modality || modalityCode,
    contact: step.contact,
    beats: step.beats ?? 10,
    cue: step.cue || '',
  }))

  const pathLabel = sequence_zones.map((z) => z.replace(/_/g, ' ')).join(' → ')
  const displayName =
    display_name || `Sequence: ${pathLabel} (${first.technique} / ${stimulator})`

  const metaObj = {
    action_kind: 'sequence',
    anchor_zone_id,
    sequence_zones: [...sequence_zones],
    sequence_steps: normalizedSteps,
    sequence_flow,
    instruction_parts,
    stimulator,
    contact: first.contact,
  }

  return makeAction({
    zone_id: anchor_zone_id,
    instruction,
    technique: first.technique,
    stimulator,
    modality: modalityCode,
    stimulation,
    contact: first.contact,
    also_stimulates: [],
    erogenous_weight,
    sort_order,
    display_name: displayName,
    meta: metaObj,
  })
}

/** @param {object} action */
export function isSequenceAction(action) {
  if (action?.action_kind === 'sequence') return true
  const meta = typeof action.meta === 'string' ? JSON.parse(action.meta) : action.meta
  return meta?.action_kind === 'sequence'
}

/** @param {object} action */
export function parseSequenceMeta(action) {
  const meta =
    typeof action.meta === 'string'
      ? JSON.parse(action.meta)
      : action.meta && typeof action.meta === 'object'
        ? action.meta
        : {}
  if (meta.action_kind !== 'sequence') return null
  return {
    anchor_zone_id: meta.anchor_zone_id || action.zone_id,
    sequence_zones: meta.sequence_zones || [],
    sequence_steps: meta.sequence_steps || [],
    sequence_flow: meta.sequence_flow || 'progression',
    instruction_parts: meta.instruction_parts || [],
  }
}
