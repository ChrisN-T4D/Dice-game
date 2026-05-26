/**
 * Audit for multi-zone sequence actions (see ACTION_SCHEMA.md).
 */

import { placementForZone } from './zone-placement.js'
import { isSequenceAction, parseSequenceMeta } from './_makeSequenceAction.js'
import { auditAction } from '../action-audit.js'
import { computeSequenceStimulation } from '../stimulation-math.js'

export const SEQUENCE_COUNT_MIN = 50
export const SEQUENCE_COUNT_MAX = 100
import { SEQUENCE_INSTRUCTION_MAX } from './sequence-instruction-compose.js'
import { grammarIssuesForInstruction } from './sequence-grammar-audit.js'

export { SEQUENCE_INSTRUCTION_MAX }

/** @param {string} instr */
function hasRedundantZonePlacement(instr) {
  if (/\bon the belly on the stomach\b/i.test(instr)) return true
  if (/\bon the full on the\b/i.test(instr)) return true
  if (/\b(back|front|side) vaginal wall, the (back|front|side) wall of the vagina\b/i.test(instr)) {
    return true
  }
  return /\bon the ([a-z][a-z\s]{2,30})\s+on the \1\b/i.test(instr)
}

/** @param {string} instr */
function hasDanglingPhrase(instr) {
  if (/\b(toward|to|at|on|along|through|into)\s*\./i.test(instr)) return true
  if (/\bfinish with…/i.test(instr)) return true
  if (/\bthen in (?:one finger stroke|a short sweep|a soft kiss) ease onto\b/i.test(instr)) return true
  if (/\bshift to the (deep dome|firm dome)\b/i.test(instr) && /\b(firm dome|deep dome|never forcing)\b/i.test(instr)) {
    return true
  }
  return false
}

/** @param {string} instr */
function hasImplausibleDepth(instr) {
  if (/\bcupped palm\b/i.test(instr) && /\b(canal|opening|inside|cervix|dome)\b/i.test(instr)) {
    return true
  }
  if (/\bshift to the (deep dome|firm dome)\b/i.test(instr)) return true
  return false
}

/** @param {string} instr */
function hasVagueMotion(instr) {
  if (/\bstroke in and out\b/i.test(instr) && !/\bfinger|palm|tongue|thumb|knuckle\b/i.test(instr)) {
    return true
  }
  if (/\b(stroke|press|circle)\s+(more|up|down|apart|broader|lighter|slowly)\b/i.test(instr)) {
    if (!/\bfinger|palm|tongue|thumb|knuckle|lip|hand\b/i.test(instr)) return true
  }
  return false
}

/**
 * @param {object} action
 * @param {Record<string, object>} profilesByZone
 */
export function auditSequenceAction(action, profilesByZone = {}) {
  const issues = []
  if (!isSequenceAction(action)) {
    issues.push('not a sequence action')
    return { ok: false, issues }
  }

  const seq = parseSequenceMeta(action)
  if (!seq) {
    issues.push('invalid sequence meta')
    return { ok: false, issues }
  }

  const { anchor_zone_id, sequence_zones, sequence_steps } = seq
  if (action.zone_id !== anchor_zone_id) {
    issues.push(`zone_id must equal anchor (${anchor_zone_id})`)
  }
  if (sequence_zones.length < 2) issues.push('sequence needs ≥2 zones')
  if (sequence_steps.length !== sequence_zones.length) {
    issues.push('sequence_steps length must match sequence_zones')
  }

  const instr = action.instruction
  if (!instr?.trim()) issues.push('missing instruction')
  else if (instr.length < 20) issues.push('instruction too short (min 20)')
  else if (instr.length > SEQUENCE_INSTRUCTION_MAX) {
    issues.push(`instruction too long (max ${SEQUENCE_INSTRUCTION_MAX})`)
  } else {
    if (hasRedundantZonePlacement(instr)) {
      issues.push('instruction repeats zone placement (e.g. "on the X on the X")')
    }
    if (hasDanglingPhrase(instr)) {
      issues.push('instruction has incomplete phrase (dangling preposition or truncated ending)')
    }
    if (hasImplausibleDepth(instr)) {
      issues.push('instruction implies unrealistic depth or contact for the canal')
    }
    for (const g of grammarIssuesForInstruction(instr)) {
      issues.push(`instruction grammar: ${g}`)
    }
    if (hasVagueMotion(instr)) {
      issues.push('instruction missing how/with-what (stroke/press without fingers, palm, etc.)')
    }
  }

  for (let i = 0; i < sequence_zones.length; i++) {
    const zid = sequence_zones[i]
    if (!placementForZone(zid)?.where) {
      issues.push(`step[${i}]: no placement copy for zone ${zid}`)
    }
    const step = sequence_steps[i]
    if (step?.zone_id !== zid) {
      issues.push(`step[${i}]: zone_id mismatch`)
    }
  }

  // One actor part across multiple zones (no mixing palm/finger/lip/etc in a single sequence).
  const actor = sequence_steps[0]?.stimulator
  if (!actor) {
    issues.push('step[0]: stimulator required')
  } else {
    for (let i = 0; i < sequence_steps.length; i++) {
      const s = sequence_steps[i]?.stimulator
      if (s && s !== actor) {
        issues.push(`step[${i}]: stimulator must match actor (${actor})`)
      }
    }
  }

  if (action.also_stimulates?.length) {
    issues.push('sequences must not use also_stimulates (use ordered steps)')
  }

  const anchorProfile = profilesByZone[anchor_zone_id] || {}
  const baseAudit = auditAction(
    { ...action, also_stimulates: [] },
    {
      zoneId: anchor_zone_id,
      zoneProfile: anchorProfile,
      instructionMax: SEQUENCE_INSTRUCTION_MAX,
      sequence: true,
    }
  )
  for (const msg of baseAudit.issues) {
    if (msg.includes('Instruction too long')) continue
    if (msg.includes('Too few actions') || msg.includes('Too many actions')) continue
    if (msg.includes('erogenous_weight')) continue
    if (msg.includes('technique "') && msg.includes(' not in zone profile')) continue
    issues.push(msg)
  }

  const breakdown = computeSequenceStimulation(action, profilesByZone)
  if (action.intensity != null && Math.abs(action.intensity - breakdown.S) > 12) {
    issues.push(`intensity diverges from sequence S (${breakdown.S})`)
  }

  if (seq?.sequence_steps?.length > 1) {
    const parts = seq.instruction_parts || []
    if (!parts.some((p) => p?.type === 'pause')) {
      issues.push('multi-step sequence should include [pause:Ns] hold between steps')
    }
    if (!/\[pause:\d+s\]/i.test(instr)) {
      issues.push('instruction missing [pause:Ns] marker for audio timing')
    }
  }

  return { ok: issues.length === 0, issues, breakdown }
}

/**
 * @param {object[]} sequences
 * @param {Record<string, object>} profilesByZone
 */
export function auditSequenceCatalog(sequences, profilesByZone = {}) {
  const issues = []
  const list = Array.isArray(sequences) ? sequences : []

  if (list.length < SEQUENCE_COUNT_MIN) {
    issues.push(`Too few sequences: ${list.length} (need ${SEQUENCE_COUNT_MIN}–${SEQUENCE_COUNT_MAX})`)
  } else if (list.length > SEQUENCE_COUNT_MAX) {
    issues.push(`Too many sequences: ${list.length} (need ${SEQUENCE_COUNT_MIN}–${SEQUENCE_COUNT_MAX})`)
  }

  const pathKeys = new Set()
  const names = new Set()

  for (let i = 0; i < list.length; i++) {
    const action = list[i]
    const seq = parseSequenceMeta(action)
    if (seq) {
      const pk = `${seq.sequence_zones.join('→')}|${action.display_name || action.instruction.slice(0, 40)}`
      if (pathKeys.has(pk)) issues.push(`sequence[${i}]: duplicate path + name`)
      pathKeys.add(pk)
    }
    if (action.display_name && names.has(action.display_name)) {
      issues.push(`sequence[${i}]: duplicate display_name`)
    }
    if (action.display_name) names.add(action.display_name)

    const { ok, issues: seqIssues } = auditSequenceAction(action, profilesByZone)
    if (!ok) {
      for (const msg of seqIssues) issues.push(`sequence[${i}]: ${msg}`)
    }
  }

  return { ok: issues.length === 0, issues, count: list.length }
}
