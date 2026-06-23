/**
 * Single-action feasibility — "can this body part do this technique on this zone?"
 *
 * Two layers:
 *   - hard feasibility: physically impossible / unsafe combinations (errors)
 *   - appropriateness:  possible but suboptimal per OMGYES guidance (warnings)
 *
 * @see technique-kinematics.js, zone-traits.js, ../actor-parts.js
 */

import { resolveStimulator } from '../contact-scale.js'
import { partById } from '../actor-parts.js'
import { kinematicsFor, MOUTH_UNREACHABLE_ZONES } from './technique-kinematics.js'
import { zoneTraits } from './zone-traits.js'

/** Only slim penetrators reach an internal-deep zone (walls, cervix, prostate). */
const INTERNAL_REACH_OK = new Set(['finger', 'fingertip'])

/** stimulator id (contact-scale) → actor part id (actor-parts). */
const STIM_TO_PART = {
  fingertip: 'fingertip',
  finger: 'finger',
  thumb: 'thumb',
  palm: 'palm',
  toe: 'toe',
  lip: 'lips',
  tongue: 'tongue',
  teeth: 'teeth',
  breath: 'breath',
}

const MOUTH_STIMS = new Set(['tongue', 'lip', 'teeth', 'breath'])

/** @param {object} action */
function stimOf(action) {
  return resolveStimulator(action.stimulator, action.modality, action.technique)
}

/** @param {object} action */
function pressureLevel(action) {
  return action.stimulation?.pressure?.level || 'medium'
}

/**
 * Feasibility of one action on its zone.
 * @param {object} action  { zone_id, technique, stimulator, modality, stimulation, contact }
 * @param {object} [profile] zone profile (optional; looked up otherwise)
 * @returns {{ ok:boolean, level:'ok'|'suboptimal'|'infeasible', issues:{severity:string,code:string,msg:string}[], traits:object }}
 */
export function actionFeasibility(action, profile) {
  const zoneId = action.zone_id
  const traits = zoneTraits(zoneId, profile)
  const technique = action.technique
  const kin = kinematicsFor(technique)
  const stim = stimOf(action)
  const part = partById[STIM_TO_PART[stim] || stim]
  const isMouth = action.modality === 'mouth' || MOUTH_STIMS.has(stim) || kin?.channel === 'mouth'
  const issues = []

  const err = (code, msg) => issues.push({ severity: 'error', code, msg })
  const warn = (code, msg) => issues.push({ severity: 'warn', code, msg })

  if (!kin) {
    warn('unknown_technique', `no kinematics defined for technique "${technique}"`)
  }

  // ---- HARD feasibility -----------------------------------------------------
  if (kin?.motion === 'depth' || kin?.requiresPenetrator) {
    if (!traits.penetrable) {
      err('penetrate_nonpenetrable', `${technique} requires a penetrable opening; ${zoneId} is not penetrable`)
    }
    if (part && part.can_penetrate === 'no') {
      err('penetrator_cannot', `${part.label} cannot penetrate, but ${technique} requires entry`)
    }
  }

  if (isMouth && !traits.mouthReachable) {
    err('mouth_unreachable', `mouth/tongue cannot reach ${zoneId} (internal/deep)`)
  }

  // Internal-deep zones admit only a slim penetrator (a finger); a palm/thumb/
  // toe/breath physically cannot reach the canal walls or cervix.
  if (MOUTH_UNREACHABLE_ZONES.has(zoneId) && !isMouth && !INTERNAL_REACH_OK.has(stim)) {
    err('internal_unreachable', `${stim} cannot reach internal-deep ${zoneId}; only a finger can`)
  }

  if (kin?.needs === 'protrudes' && !traits.protrudes) {
    err('needs_protrudes', `${technique} needs a structure that can be drawn into the mouth; ${zoneId} does not protrude`)
  }

  if ((stim === 'teeth' || kin?.requiresTeeth) && traits.ch.teeth <= 30 && traits.delicate) {
    err('teeth_on_delicate', `teeth on a delicate, no-teeth zone (${zoneId}, teeth-sensitivity low) is unsafe`)
  }

  // ---- APPROPRIATENESS (OMGYES-guided) -------------------------------------
  // "Firm" is judged by the action's actual prescribed pressure level, not by the
  // verb alone — a `pressure` action can be a light cup as easily as a hard press.
  const firm = pressureLevel(action) === 'high'
  if (firm && traits.pressureAverse) {
    const why = traits.peakTip
      ? 'lead in gradually (Staging: pre-arousal direct force on the peak can hurt)'
      : 'this tissue does not welcome firm force — keep it gentle'
    warn('firm_on_averse', `firm/high pressure on ${zoneId} — ${why}`)
  }

  // A tongue/lip "stroke" across a tiny zone is just a lick — only nudge manual travel.
  if (kin?.needs === 'axis' && kin?.travels && !traits.hasAxis && traits.extent === 'micro' && !isMouth) {
    warn('stroke_no_axis', `${technique} travel on a micro zone (${zoneId}) reads as a flutter — a tap/circle fits the geometry better`)
  }

  if (kin?.needs === 'area' && traits.typical_fu < (kin.min_zone_fu ?? 0)) {
    warn('area_too_small', `${technique} wants ~${kin.min_zone_fu}FU of area; ${zoneId} is ~${traits.typical_fu}FU`)
  }

  if (isMouth && traits.ch.mouth <= 30) {
    warn('low_oral_payoff', `mouth technique on a low oral-sensitivity zone (${zoneId})`)
  }
  if (!isMouth && stim !== 'breath' && traits.ch.hand <= 30 && traits.region === 'genitalia') {
    warn('low_hand_payoff', `manual technique on a low hand-sensitivity zone (${zoneId})`)
  }

  const hasError = issues.some((i) => i.severity === 'error')
  const hasWarn = issues.some((i) => i.severity === 'warn')
  return {
    ok: !hasError,
    level: hasError ? 'infeasible' : hasWarn ? 'suboptimal' : 'ok',
    issues,
    traits,
  }
}

/** Canonical action verbs present in the action DB, plus the depth verb. */
export const BROAD_TECHNIQUES = ['tap', 'circle', 'stroke', 'pressure', 'kiss', 'penetrate']

/** Natural stimulator to test each verb with in the broad pass. */
const BROAD_STIM = {
  tap: 'fingertip',
  circle: 'finger',
  stroke: 'finger',
  pressure: 'palm',
  kiss: 'lip',
  penetrate: 'finger',
}

/**
 * Loop 1 — broad feasibility matrix: for each zone, which verbs are physically
 * possible at all (ignoring optimality)?
 * @param {Record<string, object>} profiles
 */
export function broadCapabilityMatrix(profiles) {
  /** @type {Record<string, Record<string, { feasible:boolean, reasons:string[] }>>} */
  const matrix = {}
  for (const [zoneId, profile] of Object.entries(profiles)) {
    matrix[zoneId] = {}
    for (const technique of BROAD_TECHNIQUES) {
      const probe = {
        zone_id: zoneId,
        technique,
        stimulator: BROAD_STIM[technique],
        modality: technique === 'kiss' ? 'mouth' : 'hand',
        stimulation: { pressure: { level: 'medium' }, tempo: { level: 'medium' } },
        contact: { footprint: 'patch', coverage: 'partial' },
      }
      const { issues } = actionFeasibility(probe, profile)
      const errors = issues.filter((i) => i.severity === 'error')
      matrix[zoneId][technique] = {
        feasible: errors.length === 0,
        reasons: errors.map((e) => e.msg),
      }
    }
  }
  return matrix
}
