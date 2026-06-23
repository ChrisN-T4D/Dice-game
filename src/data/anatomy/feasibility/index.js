/**
 * Feasibility loops — zones × actions calculations.
 *
 * Runs in passes of increasing specificity:
 *   Loop 1 — broad: which touch verbs are physically possible on each zone at all.
 *   Loop 2 — single actions: every per-zone action checked for capability + appropriateness.
 *   Loop 3 — movement: every multi-zone sequence checked for a traversable, sane path.
 *
 * Everything is grounded in the OMGYES touching techniques (see technique-kinematics.js).
 */

import zoneProfiles from '../profiles/index.js'
import { zoneActions, sequenceCatalog } from '../actions/index.js'
import { isSequenceAction } from '../actions/_makeSequenceAction.js'
import { broadCapabilityMatrix, actionFeasibility, BROAD_TECHNIQUES } from './capability.js'
import { sequenceMovementFeasibility } from './movement.js'
import { wordingAudit, repetitionReport, varietyReport } from './wording.js'

/** Loop 1 — broad capability matrix + the impossible combinations. */
export function runLoop1(profiles = zoneProfiles) {
  const matrix = broadCapabilityMatrix(profiles)
  const impossible = []
  const notable = []
  for (const [zoneId, byTech] of Object.entries(matrix)) {
    for (const technique of BROAD_TECHNIQUES) {
      const cell = byTech[technique]
      if (cell.feasible) continue
      const entry = { zoneId, technique, reasons: cell.reasons }
      impossible.push(entry)
      // "penetrate requires a penetrable opening" is true by definition for every
      // non-penetrable zone — not an insight. Surface only the rest (e.g. mouth on
      // internal zones, teeth on delicate zones).
      const definitional =
        technique === 'penetrate' && cell.reasons.every((r) => r.includes('not penetrable'))
      if (!definitional) notable.push(entry)
    }
  }
  return {
    zoneCount: Object.keys(matrix).length,
    techniqueCount: BROAD_TECHNIQUES.length,
    combos: Object.keys(matrix).length * BROAD_TECHNIQUES.length,
    impossible,
    notable,
    matrix,
  }
}

/** Loop 2 — single-action feasibility across the whole action DB. */
export function runLoop2(actions = zoneActions, profiles = zoneProfiles) {
  const results = []
  let total = 0
  let infeasible = 0
  let suboptimal = 0
  for (const [zoneId, list] of Object.entries(actions)) {
    for (const action of list) {
      if (isSequenceAction(action)) continue
      total++
      const f = actionFeasibility(action, profiles[zoneId])
      if (f.level === 'infeasible') infeasible++
      else if (f.level === 'suboptimal') suboptimal++
      if (f.level !== 'ok') {
        results.push({
          zoneId,
          technique: action.technique,
          stimulator: action.stimulator,
          level: f.level,
          issues: f.issues,
          display_name: action.display_name,
        })
      }
    }
  }
  return { total, infeasible, suboptimal, ok: total - infeasible - suboptimal, results }
}

/** Loop 3 — multi-zone movement feasibility across the sequence catalog. */
export function runLoop3(sequences = sequenceCatalog, profiles = zoneProfiles) {
  const results = []
  let total = 0
  let infeasible = 0
  let suboptimal = 0
  const hopSources = { geometry: 0, curated: 0, estimate: 0 }
  for (const action of sequences) {
    total++
    const f = sequenceMovementFeasibility(action, profiles)
    for (const leg of f.legs) hopSources[leg.source] = (hopSources[leg.source] || 0) + 1
    if (f.level === 'infeasible') infeasible++
    else if (f.level === 'suboptimal') suboptimal++
    if (f.level !== 'ok') {
      results.push({
        path: parsePath(action),
        display_name: action.display_name,
        level: f.level,
        issues: f.issues,
        legs: f.legs,
      })
    }
  }
  return { total, infeasible, suboptimal, ok: total - infeasible - suboptimal, results, hopSources }
}

/** Loop 4 — wording quality across single actions + sequences. */
export function runLoop4(actions = zoneActions, sequences = sequenceCatalog, profiles = zoneProfiles) {
  const singles = []
  const results = []
  let total = 0
  let broken = 0
  let rough = 0
  const tally = (zoneId, action, kind) => {
    total++
    const w = wordingAudit(action, profiles[zoneId], { kind })
    if (w.level === 'broken') broken++
    else if (w.level === 'rough') rough++
    if (w.level !== 'ok') {
      results.push({ zoneId, kind, level: w.level, issues: w.issues, instruction: action.instruction })
    }
  }
  for (const [zoneId, list] of Object.entries(actions)) {
    for (const action of list) {
      if (isSequenceAction(action)) continue
      singles.push({ zoneId, action })
      tally(zoneId, action, 'single')
    }
  }
  for (const action of sequences) tally(action.zone_id, action, 'sequence')

  const repetition = repetitionReport(singles)
  const variety = varietyReport(singles)
  return { total, broken, rough, ok: total - broken - rough, results, repetition, variety }
}

function parsePath(action) {
  try {
    const meta = typeof action.meta === 'string' ? JSON.parse(action.meta) : action.meta
    return (meta?.sequence_zones || []).join(' → ')
  } catch {
    return action.zone_id
  }
}

/** Run all loops. */
export function runFeasibilityLoops(opts = {}) {
  const profiles = opts.profiles || zoneProfiles
  const actions = opts.actions || zoneActions
  const sequences = opts.sequences || sequenceCatalog
  return {
    loop1: runLoop1(profiles),
    loop2: runLoop2(actions, profiles),
    loop3: runLoop3(sequences, profiles),
    loop4: runLoop4(actions, sequences, profiles),
  }
}

export { broadCapabilityMatrix, actionFeasibility, sequenceMovementFeasibility }
export { VIEW_CALIBRATION } from './geometry-distance.js'
