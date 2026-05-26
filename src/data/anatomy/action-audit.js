/**
 * Action rubric checks (ACTION_SCHEMA.md). Used by CLI audit and admin UI.
 */

import { auditActionUniqueness } from './actions/action-uniqueness.js'
import { isSequenceAction } from './actions/_makeSequenceAction.js'
import { SEQUENCE_INSTRUCTION_MAX } from './actions/sequence-audit.js'
import { computePerceivedStimulation } from './stimulation-math.js'
import {
  STIMULATOR_PARTS,
  accuracyAllowsIsolation,
  effectiveContactFu,
  getStimulatorContact,
  padExceedsZone,
  resolveStimulator,
} from './contact-scale.js'
import { grammarIssuesForInstruction } from './actions/sequence-grammar-audit.js'

const TECHNIQUES = new Set(['stroke', 'pressure', 'circle', 'tap', 'kiss'])
const MODALITIES = new Set(['hand', 'mouth', 'teeth'])
const STIM_CHANNELS = new Set(['pressure', 'friction', 'tempo'])
const STIM_LEVELS = new Set(['very_low', 'low', 'medium', 'high'])
const FOOTPRINTS = new Set(['point', 'linear', 'patch', 'enveloping'])
const COVERAGES = new Set(['edge_only', 'partial', 'full'])

/** Min/max actions per zone (uniform target for all body parts). */
export function actionCountRange(_erogenousPriority = 50) {
  return { min: 6, max: 10 }
}

function modalityCode(action) {
  return typeof action.modality === 'number'
    ? ['hand', 'mouth', 'teeth'][action.modality - 1]
    : action.modality
}

export function auditStimulatorField(action) {
  const issues = []
  if (!action.stimulator) {
    issues.push(`stimulator required (${STIMULATOR_PARTS.join(', ')})`)
  } else if (!STIMULATOR_PARTS.includes(action.stimulator)) {
    issues.push(`invalid stimulator: ${action.stimulator}`)
  }
  return issues
}

/** Teeth / enveloping / accuracy vs zone geometry. */
export function auditBodyContact(action, zoneProfile = {}) {
  const issues = []
  const stim = resolveStimulator(
    action.stimulator,
    modalityCode(action),
    action.technique
  )
  const contact = action.contact || {}
  const topo = zoneProfile.topology || {}
  const extent = topo.contact_extent
  const stimContact = getStimulatorContact(action)
  const { pad_fu, zone_typical_fu } = effectiveContactFu(action, topo)

  if (stim === 'teeth') {
    if (contact.footprint === 'enveloping' || contact.coverage === 'full') {
      issues.push('teeth cannot use enveloping or full coverage')
    }
    if (
      (extent === 'micro' || extent === 'narrow' || zone_typical_fu <= 1) &&
      contact.footprint !== 'point' &&
      contact.coverage !== 'edge_only'
    ) {
      issues.push('teeth on small/narrow zone requires point footprint and edge_only coverage')
    }
  }

  if (
    (extent === 'micro' || extent === 'narrow') &&
    contact.coverage === 'full' &&
    contact.footprint === 'enveloping'
  ) {
    issues.push('enveloping full coverage implausible on micro/narrow zone')
  }

  if (
    contact.coverage === 'edge_only' &&
    !accuracyAllowsIsolation(action, contact)
  ) {
    issues.push(
      `${stim} pad ~${pad_fu}FU (accuracy ${stimContact.placement_accuracy}) cannot honestly use edge_only—use partial coverage or also_stimulates`
    )
  }

  return issues
}

/** also_stimulates required whenever stimulator pad FU > zone typical FU. */
export function auditSpillover(action, zoneProfile = {}) {
  const issues = []
  const topo = zoneProfile.topology || {}
  const also = action.also_stimulates || []
  if (padExceedsZone(action, topo)) {
    if (!also.length) {
      const { pad_fu, zone_typical_fu, stimulator } = effectiveContactFu(action, topo)
      issues.push(
        `also_stimulates required: ${stimulator} pad ~${pad_fu}FU exceeds zone ~${zone_typical_fu}FU`
      )
    }
  }
  for (const zid of also) {
    if (zid === action.zone_id) issues.push(`also_stimulates must not include primary zone ${zid}`)
  }
  return issues
}

/**
 * @param {object} action
 * @param {{ zoneId?: string, zoneProfile?: object }} [ctx]
 */
export function auditAction(action, ctx = {}) {
  const issues = []
  const zoneId = ctx.zoneId || action.zone_id
  const zoneProfile = ctx.zoneProfile || {}
  const isSequence = isSequenceAction(action)
  const instrMax = ctx.instructionMax ?? (isSequence ? SEQUENCE_INSTRUCTION_MAX : 250)

  if (!action.zone_id) issues.push('Missing zone_id')
  else if (zoneId && action.zone_id !== zoneId) {
    issues.push(`zone_id mismatch (${action.zone_id} vs ${zoneId})`)
  }

  const instr = action.instruction
  if (!instr?.trim()) issues.push('Missing instruction')
  else if (instr.length < 10) issues.push('Instruction too short (min 10 chars)')
  else if (instr.length > instrMax) issues.push(`Instruction too long (max ${instrMax} chars)`)
  else if (!isSequence) {
    for (const g of grammarIssuesForInstruction(instr)) {
      issues.push(`instruction grammar: ${g}`)
    }
  }

  if (!TECHNIQUES.has(action.technique)) {
    issues.push(`Invalid technique: ${action.technique}`)
  }

  const mod = modalityCode(action)
  if (!MODALITIES.has(mod)) issues.push(`Invalid modality: ${action.modality}`)

  const stim = action.stimulation
  if (!stim || typeof stim !== 'object' || Array.isArray(stim)) {
    issues.push('stimulation must be a plain object')
  } else {
    if (!stim.pressure?.level) issues.push('stimulation.pressure.level required')
    else if (!STIM_LEVELS.has(stim.pressure.level)) {
      issues.push(`Invalid pressure level: ${stim.pressure.level}`)
    }

    if (!stim.tempo?.level) issues.push('stimulation.tempo.level required')
    else if (!STIM_LEVELS.has(stim.tempo.level)) {
      issues.push(`Invalid tempo level: ${stim.tempo.level}`)
    }

    let extraChannels = 0
    for (const [key, val] of Object.entries(stim)) {
      if (key === 'pressure' || key === 'tempo') continue
      if (!STIM_CHANNELS.has(key)) {
        issues.push(`Invalid stimulation channel: ${key}`)
        continue
      }
      const level = typeof val === 'object' && val ? val.level : val
      if (!STIM_LEVELS.has(level)) {
        issues.push(`Invalid level for ${key}: ${level}`)
      } else {
        extraChannels++
      }
    }
    if (!stim.friction?.level && extraChannels === 0) {
      issues.push('stimulation.friction recommended for rubric (≥2 channels total)')
    }
  }

  const contact = action.contact
  if (!contact?.footprint || !contact?.coverage) {
    issues.push('contact.footprint and contact.coverage required')
  } else {
    if (!FOOTPRINTS.has(contact.footprint)) {
      issues.push(`Invalid contact.footprint: ${contact.footprint}`)
    }
    if (!COVERAGES.has(contact.coverage)) {
      issues.push(`Invalid contact.coverage: ${contact.coverage}`)
    }
  }

  issues.push(...auditStimulatorField(action))
  if (!ctx.sequence) {
    issues.push(...auditBodyContact(action, zoneProfile))
    issues.push(...auditSpillover(action, zoneProfile))
  }

  const also = action.also_stimulates
  if (also != null && !Array.isArray(also)) {
    issues.push('also_stimulates must be an array of zone ids')
  }

  const ew = action.erogenous_weight
  if (typeof ew !== 'number' || ew < 0 || ew > 100) {
    issues.push(`erogenous_weight out of range: ${ew}`)
  } else if (zoneProfile.stimulation?.erogenous_priority != null) {
    const zp = zoneProfile.stimulation.erogenous_priority
    if (Math.abs(ew - zp) > 15) {
      issues.push(`erogenous_weight (${ew}) diverges from zone priority (${zp}) by >15`)
    }
  }

  const breakdown = computePerceivedStimulation(action, zoneProfile)

  if (action.intensity != null && Math.abs(action.intensity - breakdown.S) > 12) {
    issues.push(
      `legacy intensity (${action.intensity}) diverges from computed S (${breakdown.S}) by >12`
    )
  }

  if (zoneProfile.techniques?.length && !zoneProfile.techniques.includes(action.technique)) {
    issues.push(`technique "${action.technique}" not in zone profile techniques`)
  }

  return { ok: issues.length === 0, issues, breakdown }
}

/**
 * @param {object[]} actions
 * @param {{ zoneId: string, zoneProfile?: object }} ctx
 */
export function auditZoneActions(actions, ctx) {
  const issues = []
  const list = (Array.isArray(actions) ? actions : []).filter((a) => !isSequenceAction(a))
  const ep = ctx.zoneProfile?.stimulation?.erogenous_priority ?? 50
  const { min, max } = actionCountRange(ep)

  if (list.length < min) {
    issues.push(`Too few actions: ${list.length} (need ${min}–${max})`)
  } else if (list.length > max) {
    issues.push(`Too many actions: ${list.length} (need ${min}–${max})`)
  }

  for (let i = 0; i < list.length; i++) {
    const { ok, issues: actionIssues } = auditAction(list[i], ctx)
    if (!ok) {
      for (const msg of actionIssues) {
        issues.push(`action[${i}]: ${msg}`)
      }
    }
  }

  issues.push(...auditActionUniqueness(list))

  return { ok: issues.length === 0, issues, count: list.length, min, max }
}

/**
 * Quick summary for hierarchy tree badges.
 */
export function auditZoneActionSummary(zone, actionCount = 0) {
  const ep = zone.erogenous_priority ?? zone.stimulation?.erogenous_priority ?? 50
  const { min } = actionCountRange(ep)
  const ok = actionCount >= min
  const issues = ok ? [] : [`${actionCount}/${min} actions`]
  return { ok, issues }
}
