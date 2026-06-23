/**
 * Canonical zone traits for feasibility math.
 *
 * Normalizes a zone profile (or a bare zone id) into the handful of physical
 * attributes the feasibility checks need: size (FU), shape, depth/reach,
 * delicacy, channel sensitivities, region, and the penetrable / mouth-reachable
 * / protruding flags from technique-kinematics.
 */

import zoneProfiles from '../profiles/index.js'
import { subRegionDecls } from '../regions.js'
import { zoneTypicalFu } from '../actions/sequence-zone-distance.js'
import { extentFromFu } from '../contact-scale.js'
import {
  PENETRABLE_ZONES,
  MOUTH_UNREACHABLE_ZONES,
  PROTRUDING_ZONES,
} from './technique-kinematics.js'

const LVL_NUM = { very_low: 15, low: 30, medium: 60, high: 90 }

/** Anatomically fragile structures where firm inward force is unwelcome/unsafe. */
const FRAGILE_TO_FORCE = new Set(['testicles', 'scrotum'])

/** @param {string|number} v */
export function levelNum(v) {
  if (typeof v === 'number') return v
  return LVL_NUM[v] ?? 50
}

/** zone_id → { region, subRegion } from the taxonomy. */
const ZONE_REGION = (() => {
  /** @type {Record<string, { region: string, subRegion: string }>} */
  const map = {}
  for (const [region, subs] of Object.entries(subRegionDecls)) {
    for (const [subRegion, decl] of Object.entries(subs)) {
      for (const name of decl.primary_anatomy_names || []) {
        map[name] = { region, subRegion }
      }
    }
  }
  return map
})()

/** @param {string} zoneId */
export function regionOf(zoneId) {
  return ZONE_REGION[zoneId]?.region || 'other'
}

/** @param {string} zoneId */
export function subRegionOf(zoneId) {
  return ZONE_REGION[zoneId]?.subRegion || 'other'
}

/**
 * @param {string} zoneId
 * @param {object} [profile] zone profile (defaults to lookup in zoneProfiles)
 */
export function zoneTraits(zoneId, profile = zoneProfiles[zoneId]) {
  const topo = profile?.topology || {}
  const stim = profile?.stimulation || {}

  const typical_fu = topo.typical_contact_fu ?? zoneTypicalFu(zoneId)
  const max_fu = topo.max_contact_fu ?? typical_fu * 1.5
  const extent = topo.contact_extent || extentFromFu(typical_fu)
  const shape = topo.shape || 'flat'
  const depth = topo.depth || 'shallow'

  const sensitivity_score =
    profile?.sensitivity_score ?? (stim.erogenous_priority ?? 50)
  const erogenous_priority = stim.erogenous_priority ?? sensitivity_score

  const ch = {
    pressure: levelNum(stim.sensitivity_to_pressure),
    friction: levelNum(stim.sensitivity_to_friction),
    teeth: levelNum(stim.sensitivity_to_teeth),
    mouth: levelNum(stim.sensitivity_to_mouth),
    hand: levelNum(stim.sensitivity_to_hand),
  }

  const penetrable = PENETRABLE_ZONES.has(zoneId)
  const mouthReachable = !MOUTH_UNREACHABLE_ZONES.has(zoneId)
  const protrudes = PROTRUDING_ZONES.has(zoneId)
  const internal = depth === 'deep' || PENETRABLE_ZONES.has(zoneId)

  const techniques = profile?.techniques || stim.techniques || []
  const wantsPressure = ch.pressure >= 60 || techniques.includes('pressure')

  // Delicate (teeth/handling sense): easily hurt; never bite, handle with care.
  const delicate =
    sensitivity_score >= 90 || extent === 'micro' || (ch.teeth <= 30 && sensitivity_score >= 80)

  // Pressure-averse = firm inward force is genuinely wrong here. NOTE: a low
  // `sensitivity_to_pressure` only means pressure isn't very *arousing* (knees,
  // spine, shins) — it does NOT mean force hurts. True aversion is either:
  //  - an anatomically fragile structure (testicles/scrotum: "no squeezing"), or
  //  - a high-sensitivity tip/edge that wants a graduated approach pre-arousal
  //    (clitoral glans, frenulum, penile glans) — OMGYES Staging.
  const peakTip =
    sensitivity_score >= 92 &&
    (extent === 'micro' || extent === 'narrow') &&
    !wantsPressure
  const pressureAverse = FRAGILE_TO_FORCE.has(zoneId) || peakTip

  // Does the zone offer a long axis to stroke along?
  const hasAxis =
    shape === 'linear' ||
    topo.surface_area === 'large' ||
    topo.surface_area === 'canvas' ||
    (topo.surface_area === 'medium' && extent !== 'micro')

  return {
    zone_id: zoneId,
    has_profile: !!profile,
    typical_fu,
    max_fu,
    extent,
    shape,
    depth,
    internal,
    penetrable,
    mouthReachable,
    protrudes,
    delicate,
    wantsPressure,
    pressureAverse,
    peakTip,
    hasAxis,
    sensitivity_score,
    erogenous_priority,
    ch,
    region: regionOf(zoneId),
    subRegion: subRegionOf(zoneId),
  }
}

export { zoneProfiles }
