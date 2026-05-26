import { makeSequenceAction } from '../_makeSequenceAction.js'
import { composeSequenceInstruction } from '../sequence-instruction-compose.js'
import { inferSequenceFlow } from '../sequence-zone-phrasing.js'
import { stim, C } from './_helpers.js'

/**
 * @typedef {Object} SequenceDef
 * @property {string} anchor
 * @property {string[]} path
 * @property {string} name
 * @property {string[]} cues
 * @property {string[]} techniques
 * @property {string[]} stimulators
 * @property {string[]} modalities
 * @property {object[]} contacts
 * @property {number[]} [beats]
 * @property {object} stimulation
 * @property {number} [sort_order]
 * @property {number} [erogenous_weight]
 * @property {'progression' | 'sweep'} [flow] - discrete moves vs one pass and retrace (default: inferred from path)
 */

/**
 * @param {SequenceDef} def
 */
export function expandSequence(def) {
  const {
    anchor,
    path,
    name,
    cues,
    techniques,
    stimulators,
    modalities,
    contacts,
    beats = path.map(() => 10),
    stimulation,
    sort_order = 1000,
    erogenous_weight = 70,
    flow: flowOverride,
  } = def

  const sequence_flow = inferSequenceFlow(path, flowOverride)

  const steps = path.map((zone_id, i) => ({
    zone_id,
    technique: techniques[i],
    stimulator: stimulators[i],
    modality: modalities[i],
    contact: contacts[i],
    beats: beats[i] ?? 10,
    cue: cues[i],
  }))

  const { instruction, parts } = composeSequenceInstruction(steps, {
    flow: sequence_flow,
    path,
    erogenous_weight: erogenous_weight,
  })

  return makeSequenceAction({
    anchor_zone_id: anchor,
    sequence_zones: path,
    steps,
    instruction,
    instruction_parts: parts,
    stimulation,
    display_name: name,
    sort_order,
    erogenous_weight,
    sequence_flow,
  })
}

export { stim, C }
