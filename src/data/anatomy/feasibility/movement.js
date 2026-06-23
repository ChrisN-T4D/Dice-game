/**
 * Multi-zone movement feasibility — "can one actor part actually travel this path?"
 *
 * A sequence is one body part moving across an ordered list of zones. This checks
 * that the path is physically traversable and anatomically sane:
 *   - one actor part throughout (no teleporting between hand and mouth mid-move)
 *   - each leg is feasible as a single action
 *   - depth is approached from the opening, never jumped (Deep End / Shallowing)
 *   - the path stays on one body / continuous region (no clit→penis, no clit→foot sweep)
 *   - the opening leg doesn't lead with force on the most sensitive zone (Staging)
 *
 * @see ../actions/sequence-zone-distance.js, ../actions/sequence-zone-depth.js
 */

import { parseSequenceMeta } from '../actions/_makeSequenceAction.js'
import { isInternalVaginal, isDeepVaginal } from '../actions/sequence-zone-depth.js'
import { hopDistanceFu } from './geometry-distance.js'
import { actionFeasibility } from './capability.js'
import { zoneTraits, regionOf, subRegionOf } from './zone-traits.js'

const FEMALE_GENITAL_SUBREGIONS = new Set(['clitoris_hierarchy', 'vagina_hierarchy'])
const MALE_GENITAL_SUBREGIONS = new Set(['penis_hierarchy', 'scrotum_testicles'])

const VAGINAL_GATEWAY = new Set(['vaginal_introitus', 'vagina'])
const MOST_SENSITIVE = new Set([
  'clitoral_glans',
  'frenulum',
  'penis_glans',
  'nipple',
])

/**
 * @param {object} action sequence action
 * @param {Record<string, object>} profiles
 * @returns {{ ok:boolean, level:string, issues:object[], legs:object[] }}
 */
export function sequenceMovementFeasibility(action, profiles = {}) {
  const seq = parseSequenceMeta(action)
  const issues = []
  const legs = []
  const err = (code, msg) => issues.push({ severity: 'error', code, msg })
  const warn = (code, msg) => issues.push({ severity: 'warn', code, msg })

  if (!seq) {
    return { ok: false, level: 'infeasible', issues: [{ severity: 'error', code: 'not_sequence', msg: 'not a sequence action' }], legs }
  }

  const zones = seq.sequence_zones
  const steps = seq.sequence_steps
  const flow = seq.sequence_flow

  // --- one actor part throughout ---
  const actor = steps[0]?.stimulator
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].stimulator && steps[i].stimulator !== actor) {
      err('actor_switch', `step ${i} switches actor part to ${steps[i].stimulator} (was ${actor}); a single sequence is one body part`)
    }
  }

  // --- per-step single-action feasibility ---
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const probe = {
      zone_id: step.zone_id,
      technique: step.technique,
      stimulator: step.stimulator,
      modality: step.modality,
      stimulation: action.stimulation,
      contact: step.contact,
    }
    const f = actionFeasibility(probe, profiles[step.zone_id])
    for (const it of f.issues) {
      issues.push({ ...it, code: `step${i}:${it.code}`, msg: `step ${i} (${step.zone_id}, ${step.technique}): ${it.msg}` })
    }
  }

  // --- cross-body / cross-genital sanity (whole path) ---
  const subs = new Set(zones.map(subRegionOf))
  const hasFemaleGen = [...subs].some((s) => FEMALE_GENITAL_SUBREGIONS.has(s))
  const hasMaleGen = [...subs].some((s) => MALE_GENITAL_SUBREGIONS.has(s))
  if (hasFemaleGen && hasMaleGen) {
    err('cross_body', `path mixes female and male genital zones (${zones.join(' → ')}) — not one body`)
  }

  // --- per-hop continuity ---
  for (let i = 0; i < zones.length - 1; i++) {
    const from = zones[i]
    const to = zones[i + 1]
    const hop = hopDistanceFu(from, to)
    const fu = hop.fu
    const scale = hop.scale
    const rFrom = regionOf(from)
    const rTo = regionOf(to)
    // "uncertain" = no measured geometry AND no curated edge (pure estimate).
    const uncertain = hop.source === 'estimate'
    const leg = { from, to, fu, scale, source: hop.source, view: hop.view, regionChange: rFrom !== rTo, sideChange: hop.sideChange, uncertain }
    legs.push(leg)

    // depth: entering an internal vaginal zone must come from the gateway/another internal zone
    if (isInternalVaginal(to) && !isInternalVaginal(from) && !VAGINAL_GATEWAY.has(from)) {
      err('depth_jump', `leg ${i}: enters internal zone ${to} directly from external ${from} — must pass the opening first (Shallowing/Deep End)`)
    }
    // cervix is the deepest point — approach gradually, never first
    if (isDeepVaginal(to) && !(isInternalVaginal(from) || VAGINAL_GATEWAY.has(from))) {
      err('cervix_jump', `leg ${i}: reaches the cervix from ${from} without graduated depth (Deep End: press the rim, never bump)`)
    }

    // region discontinuity on a continuous sweep is impossible
    if (rFrom !== rTo && uncertain && scale === 'long') {
      if (flow === 'sweep') {
        err('region_break_sweep', `leg ${i}: a continuous sweep cannot cross ${rFrom}→${rTo} over a long, non-adjacent gap (${from}→${to})`)
      } else {
        warn('region_relocate', `leg ${i}: ${from}→${to} crosses ${rFrom}→${rTo} (~${fu}FU) — the actor must lift and relocate, not glide`)
      }
    }

    // a tiny precise part sweeping a long continuous span is awkward
    if (scale === 'long' && flow === 'sweep' && ['fingertip', 'tongue', 'lip'].includes(actor)) {
      warn('long_sweep_small_part', `leg ${i}: ${actor} sweeping a long span (${from}→${to}, ~${fu}FU) is slow — a palm/hand covers it better`)
    }
  }

  // --- staging: don't open with force on the most sensitive zone ---
  const first = steps[0]
  const firstTraits = zoneTraits(first.zone_id, profiles[first.zone_id])
  const opensHard =
    (first.technique === 'pressure' || action.stimulation?.pressure?.level === 'high')
  if (firstTraits.peakTip && opensHard) {
    warn('staging_hard_open', `opens with firm pressure on the peak zone ${first.zone_id} — warm up first (Staging: pre-arousal direct force can hurt)`)
  }
  if (MOST_SENSITIVE.has(first.zone_id) && firstTraits.peakTip && zones.length > 1) {
    // soft nudge: leading on the peak zone skips the build
    warn('staging_peak_first', `path starts on the peak zone ${first.zone_id}; consider building in from a calmer zone first (Staging)`)
  }

  const hasError = issues.some((i) => i.severity === 'error')
  const hasWarn = issues.some((i) => i.severity === 'warn')
  return {
    ok: !hasError,
    level: hasError ? 'infeasible' : hasWarn ? 'suboptimal' : 'ok',
    issues,
    legs,
  }
}
