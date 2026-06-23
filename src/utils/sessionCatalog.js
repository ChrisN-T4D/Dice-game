/**
 * Bridge: guided-session coarse location rolls (Phase 1 & 2) -> a precise
 * catalog sub-zone + that zone's technique instruction.
 *
 * Used by getPromptText() in promptHelper.js. Selection is a PURE function of
 * the existing locationRoll/actionRoll (no RNG, no Date), so the pre-generated
 * plan and the live runtime produce identical text and pre-baked audio matches.
 *
 * Where a region has no mapping (e.g. "Lips", "Palms / Fingertips", roller's
 * choice), this returns null and the caller falls back to the phase tables.
 */
import { zoneActionsWithTechniques } from '@/data/anatomy/actions/index.js'
import profiles from '@/data/anatomy/profiles/index.js'

/** session anatomy ('vulva'|'penis') -> profile orientation token */
function orientationFor(receiverAnatomy) {
  return receiverAnatomy === 'vulva' ? 'female' : 'male'
}

// Genital sub-zone union; orientation filtering resolves it to the receiver's
// anatomy (clitoral_* = female-only, penis_*/scrotum = male-only, etc.).
const GENITAL_ALL = [
  'clitoral_hood',
  'clitoral_glans',
  'labia_minora',
  'labia_majora',
  'vaginal_introitus',
  'mons_pubis',
  'penis_glans',
  'penis_shaft',
  'frenulum',
  'foreskin',
  'scrotum',
]

// External-only genital sub-zones (Phase 2 "heating up": no penetration).
const GENITAL_EXTERNAL = [
  'clitoral_hood',
  'labia_majora',
  'labia_minora',
  'mons_pubis',
  'penis_shaft',
  'penis_glans',
  'frenulum',
  'foreskin',
  'scrotum',
]

/**
 * Per-phase map: locationRoll (1-20) -> candidate zone ids. Unmapped rolls
 * intentionally fall back to the phase tables.
 */
export const REGION_ZONE_MAP = {
  1: {
    2: ['ears'],
    3: ['base_of_neck', 'neck'],
    4: ['clavicle'],
    5: ['shoulders', 'deltoid'],
    6: ['nipple', 'areola'],
    7: ['breast_tissue', 'chest'],
    8: ['inner_arms', 'elbows'],
    9: ['forearms'],
    11: ['lower_abdomen', 'stomach'],
    12: ['lower_back', 'sacrum'],
    13: ['hips', 'hip_bone', 'sides'],
    14: ['buttocks', 'gluteus_maximus', 'buttock_crease'],
    15: ['perineum'],
    16: ['inner_thighs'],
    17: ['knees'],
    18: ['feet', 'soles'],
    19: GENITAL_ALL,
  },
  2: {
    2: ['ears'],
    3: ['throat', 'neck'],
    4: ['base_of_neck', 'neck'],
    5: ['clavicle', 'chest'],
    6: ['nipple', 'areola'],
    7: ['nipple', 'areola'],
    8: ['breast_tissue', 'chest'],
    9: ['lower_abdomen', 'groin'],
    10: ['mons_pubis', 'groin'],
    11: ['inner_thighs', 'groin'],
    12: ['inner_thighs', 'groin'],
    13: ['buttocks', 'buttock_crease', 'gluteus_maximus'],
    14: ['lower_back', 'sacrum'],
    15: ['perineum'],
    16: GENITAL_EXTERNAL,
    17: GENITAL_EXTERNAL,
    18: ['groin', 'perineum', 'inner_thighs'],
    19: ['hips', 'hip_bone'],
  },
}

/** Deterministic, well-mixed index from the two rolls (+ a salt to decorrelate). */
function pickIndex(a, b, salt, len) {
  if (!len) return 0
  const h = (((a | 0) * 73856093) ^ ((b | 0) * 19349663) ^ ((salt | 0) * 83492791)) >>> 0
  return h % len
}

/** Friendly, mid-sentence zone label (e.g. "Clitoral hood" -> "clitoral hood"). */
function friendlyLabel(zoneId) {
  const dn = profiles[zoneId] && profiles[zoneId].display_name
  if (dn && typeof dn === 'string') return dn.charAt(0).toLowerCase() + dn.slice(1)
  return zoneId.replace(/_/g, ' ')
}

function zoneMatchesAnatomy(zoneId, orientation) {
  const o = profiles[zoneId] && profiles[zoneId].orientations
  if (!Array.isArray(o) || o.length === 0) return true
  return o.includes(orientation)
}

function isNonSequence(action) {
  if (!action || !action.meta) return true
  try {
    const m = typeof action.meta === 'string' ? JSON.parse(action.meta) : action.meta
    return m.action_kind !== 'sequence'
  } catch {
    return true
  }
}

function isGentle(action) {
  const lvl = action && action.stimulation && action.stimulation.pressure && action.stimulation.pressure.level
  return lvl === 'very_low' || lvl === 'low'
}

/**
 * Resolve a Phase 1/2 roll to a precise zone + technique.
 * @param {{ phase:number, locationRoll:number, actionRoll:number, receiverAnatomy:'vulva'|'penis' }} args
 * @returns {{ zoneId:string, where:string, instruction:string } | null}
 */
export function selectCatalogTechnique({ phase, locationRoll, actionRoll, receiverAnatomy }) {
  if (phase !== 1 && phase !== 2) return null
  const region = REGION_ZONE_MAP[phase]
  const candidates = region && region[locationRoll]
  if (!candidates || !candidates.length) return null

  const orientation = orientationFor(receiverAnatomy)
  const zones = candidates.filter((z) => zoneMatchesAnatomy(z, orientation))
  if (!zones.length) return null

  const zoneId = zones[pickIndex(locationRoll, actionRoll, 1, zones.length)]

  let actions = (zoneActionsWithTechniques[zoneId] || []).filter(
    (a) => a && a.instruction && isNonSequence(a)
  )
  if (!actions.length) return null

  // Phase 1 is warm-up: prefer the gentlest actions when any exist.
  if (phase === 1) {
    const gentle = actions.filter(isGentle)
    if (gentle.length) actions = gentle
  }

  const action = actions[pickIndex(locationRoll, actionRoll, 2, actions.length)]
  if (!action) return null

  return { zoneId, where: friendlyLabel(zoneId), instruction: action.instruction }
}
