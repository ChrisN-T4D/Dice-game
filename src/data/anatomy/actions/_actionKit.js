/**
 * Baseline action generator — one distinct sensation blueprint per action.
 */

import { makeAction } from './_makeAction.js'
import { padExceedsZone } from '../contact-scale.js'
import { subRegionDecls } from '../regions.js'
import {
  ACTION_BLUEPRINTS,
  blueprintAllowed,
  resolveContact,
} from './_actionBlueprints.js'
import { actionSensationKey, normalizeInstruction } from './action-uniqueness.js'

export const ZONE_ACTION_COUNT = { min: 6, max: 10 }

/** @param {string} zoneId */
function neighborsForZone(zoneId) {
  for (const regionSubs of Object.values(subRegionDecls)) {
    for (const decl of Object.values(regionSubs)) {
      const names = decl.primary_anatomy_names || []
      if (!names.includes(zoneId)) continue
      const local = names.filter((z) => z !== zoneId)
      if (local.length) return local
      const regional = []
      for (const d of Object.values(regionSubs)) {
        regional.push(...(d.primary_anatomy_names || []))
      }
      return [...new Set(regional)].filter((z) => z !== zoneId).slice(0, 3)
    }
  }
  return []
}

/**
 * Anatomically fragile zones where firm inward force is unwelcome/unsafe
 * ("no squeezing"). Firm pressure here is clamped down a notch — gentle is the
 * ceiling. See feasibility/zone-traits.js (FRAGILE_TO_FORCE) for the shared model.
 */
const FORCE_AVERSE_ZONES = new Set(['testicles', 'scrotum'])

/** @param {string} level @param {string} zoneId */
function clampPressureForZone(level, zoneId) {
  if (level === 'high' && FORCE_AVERSE_ZONES.has(zoneId)) return 'medium'
  return level
}

function s(pressure, tempo, friction = 'medium') {
  return {
    pressure: { level: pressure },
    tempo: { level: tempo },
    friction: { level: friction },
  }
}

function orderedBlueprints(zoneId, profile) {
  const allowed = ACTION_BLUEPRINTS.filter((bp) => blueprintAllowed(bp, profile, zoneId))
  if (!allowed.length) return []
  const start =
    zoneId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % allowed.length
  return [...allowed.slice(start), ...allowed.slice(0, start)]
}

/**
 * @param {string} zoneId
 * @param {object} profile
 * @returns {import('./_makeAction.js').Action[]}
 */
export function buildZoneActions(zoneId, profile) {
  const { min, max } = ZONE_ACTION_COUNT
  const label = profile.display_name || zoneId.replace(/_/g, ' ')
  const neighbors = neighborsForZone(zoneId)
  const picked = []
  const seenIds = new Set()
  const seenSensation = new Set()
  const seenInstruction = new Set()

  for (const bp of orderedBlueprints(zoneId, profile)) {
    if (picked.length >= max) break
    if (seenIds.has(bp.id)) continue

    const contact = resolveContact(bp.contact, zoneId, profile)
    const draft = {
      zone_id: zoneId,
      technique: bp.technique,
      stimulator: bp.stimulator,
      modality: bp.modality,
      stimulation: s(clampPressureForZone(bp.pressure, zoneId), bp.tempo, bp.friction),
      contact,
      erogenous_weight: Math.round(
        profile.stimulation?.erogenous_priority ?? profile.sensitivity_score ?? 50
      ),
      sort_order: picked.length,
    }
    const sensationKey = actionSensationKey(draft)
    const instruction = bp.instruction(label, zoneId, profile, draft)
    const instructionKey = instruction.trim()

    if (seenSensation.has(sensationKey) || seenInstruction.has(instructionKey)) {
      continue
    }

    const also =
      padExceedsZone(draft, profile.topology) && neighbors.length
        ? [neighbors[picked.length % neighbors.length]]
        : []

    seenIds.add(bp.id)
    seenSensation.add(sensationKey)
    seenInstruction.add(instructionKey)

    picked.push(
      makeAction({
        ...draft,
        instruction,
        also_stimulates: also,
      })
    )
  }

  return picked
}

/**
 * @param {Record<string, object>} profiles
 * @param {{ excludeZoneIds?: Set<string> }} [opts]
 */
export function buildActionsFromProfiles(profiles, opts = {}) {
  const exclude = opts.excludeZoneIds ?? new Set()
  /** @type {Record<string, import('./_makeAction.js').Action[]>} */
  const out = {}
  for (const [zoneId, profile] of Object.entries(profiles)) {
    if (exclude.has(zoneId)) continue
    out[zoneId] = buildZoneActions(zoneId, profile)
  }
  return out
}
