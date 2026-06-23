/**
 * Intensity-driven build-up turn selection.
 *
 * Replaces the d20 location/action rolls + phase tables for the build-up portion
 * of a guided session (former Phases 1 & 2, now one continuous "Build-up").
 *
 * selectBuildupTurn() picks a precise zone weighted toward an intensity target
 * (which ramps across the session via the chosen curve), then an action on that
 * zone weighted toward the same target. It is PURE: all randomness comes from the
 * `rng` argument, so a seeded rng yields a reproducible plan whose pre-baked audio
 * matches live playback.
 */
import { zoneActionsWithTechniques } from '@/data/anatomy/actions/index.js'
import profiles from '@/data/anatomy/profiles/index.js'
import { coveringGarmentFor } from '@/data/clothing.js'

// Effective intensity ceiling for a still-covered (over-fabric) zone: a covered
// zone reads as a tease and cannot satisfy a high target until it's uncovered.
export const COVERED_CEILING = 60

// -----------------------------------------------------------------------------
// Candidate build-up zones (touch targets), split by receiver orientation.
// Deep-internal / penetration zones (vaginal canal, cervix, prostate) belong to
// the Finish phase and are intentionally excluded here.
// -----------------------------------------------------------------------------
const SHARED_ZONES = [
  'mouth',
  'ears',
  'neck',
  'throat',
  'base_of_neck',
  'clavicle',
  'shoulders',
  'chest',
  'breast_tissue',
  'nipple',
  'areola',
  'inner_arms',
  'forearms',
  'stomach',
  'lower_abdomen',
  'lower_back',
  'sacrum',
  'hips',
  'sides',
  'buttocks',
  'buttock_crease',
  'gluteus_maximus',
  'inner_thighs',
  'perineum',
  'mons_pubis',
  'feet',
]

const FEMALE_GENITAL_ZONES = [
  'clitoral_hood',
  'labia_majora',
  'labia_minora',
  'vestibular_bulbs',
  'clitoral_glans',
  'vaginal_introitus',
]

const MALE_GENITAL_ZONES = ['penis_shaft', 'foreskin', 'frenulum', 'penis_glans', 'scrotum', 'testicles']

// Internal / entrance zones that require direct skin contact — they can't be
// stimulated through fabric. While still covered they're skipped, and they are
// never framed as an over-fabric tease.
const DIRECT_ONLY_ZONES = new Set(['vaginal_introitus'])

export const BUILDUP_ZONES = {
  female: [...SHARED_ZONES, ...FEMALE_GENITAL_ZONES],
  male: [...SHARED_ZONES, ...MALE_GENITAL_ZONES],
}

// -----------------------------------------------------------------------------
// Intensity curves: progress p in [0,1] -> target intensity T in ~[20, 96].
// -----------------------------------------------------------------------------
const T_MIN = 20
const T_SPAN = 76 // 20..96

export const INTENSITY_CURVES = {
  // Stays gentle, ramps late.
  slow: (p) => T_MIN + T_SPAN * p * p,
  // Linear ramp.
  balanced: (p) => T_MIN + T_SPAN * p,
  // Heats up quickly, plateaus high.
  fast: (p) => T_MIN + T_SPAN * Math.sqrt(p),
  // Edging: quick build to high, then ride the edge — down to medium, back up to
  // high, down, up, repeatedly. A fast ramp followed by full high<->medium swings.
  edging: (p) => {
    const HIGH = T_MIN + T_SPAN * 0.92 // ~90
    const MED = T_MIN + T_SPAN * 0.5 // ~58
    const ramp = 0.18 // fraction of the build spent climbing to high
    if (p <= ramp) return T_MIN + (HIGH - T_MIN) * (p / ramp)
    const center = (HIGH + MED) / 2
    const amp = (HIGH - MED) / 2
    const cycles = 3 // number of down-then-up swings across the rest of the build
    const phase = ((p - ramp) / (1 - ramp)) * cycles * 2 * Math.PI
    // cos starts at +1 (HIGH) right after the ramp, dips to MED, returns to HIGH.
    return center + amp * Math.cos(phase)
  },
}

function curveTarget(curveName, progress) {
  const fn = INTENSITY_CURVES[curveName] || INTENSITY_CURVES.balanced
  const p = Math.max(0, Math.min(1, progress || 0))
  return clamp(fn(p), 0, 100)
}

/** Public accessor for the curve target (used by the builder's motivated removal). */
export function getBuildupTarget(curveName, progress) {
  return curveTarget(curveName, progress)
}

// -----------------------------------------------------------------------------
// Exclusion remap (wizard pref keys -> zone / modality / stimulator filters).
// -----------------------------------------------------------------------------
const EXCLUDE_ZONE_GROUPS = {
  feet: ['feet', 'soles', 'toes', 'ankles'],
  nipples: ['nipple', 'areola'],
  genitals: [...FEMALE_GENITAL_ZONES, ...MALE_GENITAL_ZONES, 'mons_pubis'],
  buttocks: [
    'buttocks',
    'gluteus_maximus',
    'gluteus_medius',
    'gluteus_minimus',
    'buttock_crease',
    'buttock_pad',
  ],
  perineum: ['perineum'],
  licking: ['mouth'],
}

/**
 * Merge the two directional pref objects into a flat { key: bool } map (a key is
 * active if excluded in either direction), preserving the wizard pref keys.
 */
export function mergedExcludeKeys(excludeWhenTouching = {}, excludeWhenTouched = {}) {
  const out = {}
  for (const key of ['feet', 'licking', 'nipples', 'genitals', 'buttocks', 'perineum']) {
    out[key] = excludeWhenTouching?.[key] === true || excludeWhenTouched?.[key] === true
  }
  return out
}

function buildExclusionFilters(excludeKeys = {}) {
  const zoneDeny = new Set()
  const modalityDeny = new Set()
  const stimulatorDeny = new Set()
  for (const [key, active] of Object.entries(excludeKeys)) {
    if (!active) continue
    for (const z of EXCLUDE_ZONE_GROUPS[key] || []) zoneDeny.add(z)
    if (key === 'licking') modalityDeny.add('mouth')
    if (key === 'feet') stimulatorDeny.add('toe')
  }
  return { zoneDeny, modalityDeny, stimulatorDeny }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function orientationFor(receiverAnatomy) {
  return receiverAnatomy === 'vulva' ? 'female' : 'male'
}

function zonePriority(zoneId) {
  const p = profiles[zoneId]
  const pr = p && p.stimulation && p.stimulation.erogenous_priority
  return typeof pr === 'number' ? pr : (p && p.sensitivity_score) || 50
}

function friendlyLabel(zoneId) {
  const dn = profiles[zoneId] && profiles[zoneId].display_name
  if (dn && typeof dn === 'string') return dn.charAt(0).toLowerCase() + dn.slice(1)
  return zoneId.replace(/_/g, ' ')
}

function parseMeta(action) {
  if (!action || !action.meta) return {}
  try {
    return typeof action.meta === 'string' ? JSON.parse(action.meta) : action.meta
  } catch {
    return {}
  }
}

const PRESSURE_PROXY = { very_low: 20, low: 45, medium: 70, high: 90 }
const TEMPO_NUDGE = { very_low: -6, low: -3, medium: 0, high: 6 }

// OMGYES families that only make sense near climax-level intensity.
const CLIMAX_FAMILIES = new Set([
  'edging',
  'multiples',
  'orgasm',
  'staging',
  'squirting',
  'deep_end',
  'rhythm',
])

/** Map an action to an intensity proxy in ~[20, 96]. */
function actionProxy(action, meta) {
  if (meta.action_kind === 'technique' && typeof action.erogenous_weight === 'number') {
    return clamp(action.erogenous_weight, 20, 96)
  }
  const pr = action.stimulation && action.stimulation.pressure && action.stimulation.pressure.level
  const te = action.stimulation && action.stimulation.tempo && action.stimulation.tempo.level
  return clamp((PRESSURE_PROXY[pr] ?? 60) + (TEMPO_NUDGE[te] ?? 0), 20, 96)
}

function isSequence(meta) {
  return meta.action_kind === 'sequence'
}

/** Gaussian weight by closeness to target. */
function closeness(value, target, sigma) {
  const d = value - target
  return Math.exp(-(d * d) / (2 * sigma * sigma))
}

/** Weighted pick using rng; entries: [{ item, weight }]. */
function weightedPick(entries, rng) {
  let total = 0
  for (const e of entries) total += e.weight
  if (total <= 0) return entries.length ? entries[Math.floor(rng() * entries.length)].item : null
  let r = rng() * total
  for (const e of entries) {
    r -= e.weight
    if (r <= 0) return e.item
  }
  return entries[entries.length - 1].item
}

// -----------------------------------------------------------------------------
// selectBuildupTurn
// -----------------------------------------------------------------------------
/**
 * @param {() => number} rng - returns a float in [0, 1)
 * @param {object} args
 * @param {'vulva'|'penis'} args.receiverAnatomy
 * @param {number} [args.progress] - 0..1 across the build-up; used unless targetIntensity given
 * @param {string} [args.intensityCurve] - 'slow' | 'balanced' | 'fast' | 'edging'
 * @param {number} [args.targetIntensity] - explicit target (overrides progress/curve), used by re-rolls
 * @param {boolean} [args.isFirstTurn] - when true, never open on a >80-priority zone
 * @param {string|null} [args.lastZoneId] - down-weights an immediate zone repeat
 * @param {string|null} [args.forceZoneId] - keep this zone (action-only re-roll)
 * @param {object} [args.excludeKeys] - { feet, licking, nipples, genitals, buttocks, perineum }
 * @param {string[]|null} [args.wardrobe] - receiver's remaining clothing; covered zones are capped/over-fabric
 * @returns {{ zoneId:string, where:string, instruction:string, intensity:number, overFabric:boolean, garment:string|null } | null}
 */
export function selectBuildupTurn(rng, args = {}) {
  const {
    receiverAnatomy,
    progress = 0,
    intensityCurve = 'balanced',
    targetIntensity = null,
    isFirstTurn = false,
    lastZoneId = null,
    forceZoneId = null,
    excludeKeys = {},
    wardrobe = null,
  } = args

  const T = targetIntensity != null ? clamp(targetIntensity, 0, 100) : curveTarget(intensityCurve, progress)
  const orientation = orientationFor(receiverAnatomy)
  const { zoneDeny, modalityDeny, stimulatorDeny } = buildExclusionFilters(excludeKeys)

  // Resolve usable actions for a zone given the modality/stimulator filters.
  const actionsFor = (zoneId) => {
    const list = zoneActionsWithTechniques[zoneId] || []
    return list.filter((a) => {
      if (!a || !a.instruction) return false
      const meta = parseMeta(a)
      if (isSequence(meta)) return false
      if (modalityDeny.has(a.modality)) return false
      if (a.stimulator && stimulatorDeny.has(a.stimulator)) return false
      return true
    })
  }

  // Candidate zones.
  let zoneIds
  if (forceZoneId) {
    zoneIds = [forceZoneId]
  } else {
    zoneIds = (BUILDUP_ZONES[orientation] || []).filter((z) => {
      if (zoneDeny.has(z)) return false
      if (isFirstTurn && zonePriority(z) > 80) return false
      // Internal/entrance zones can't be teased through fabric — skip while covered.
      if (DIRECT_ONLY_ZONES.has(z) && wardrobe && coveringGarmentFor(z, wardrobe)) return false
      return actionsFor(z).length > 0
    })
  }
  if (!zoneIds.length) return null

  const SIGMA_ZONE = 18
  const zoneEntries = zoneIds.map((zoneId) => {
    let w = closeness(zonePriority(zoneId), T, SIGMA_ZONE) + 0.02
    if (zoneId === lastZoneId) w *= 0.15
    return { item: zoneId, weight: w }
  })
  const zoneId = forceZoneId || weightedPick(zoneEntries, rng)
  if (!zoneId) return null

  // Coverage barrier: a still-covered zone is an over-fabric tease whose
  // effective action-intensity is capped, so it can't satisfy a high target.
  const garment = wardrobe && !DIRECT_ONLY_ZONES.has(zoneId) ? coveringGarmentFor(zoneId, wardrobe) : null
  const overFabric = !!garment
  const Tact = overFabric ? Math.min(T, COVERED_CEILING) : T

  const actions = actionsFor(zoneId)
  if (!actions.length) return null

  const SIGMA_ACT = 22
  const actionEntries = actions.map((a) => {
    const meta = parseMeta(a)
    let w = closeness(actionProxy(a, meta), Tact, SIGMA_ACT) + 0.02
    // Climax-family techniques only weight in when the target is high.
    if (meta.action_kind === 'technique' && CLIMAX_FAMILIES.has(meta.omgyes_family) && Tact < 70) {
      w *= 0.04
    }
    // Over fabric: strongly prefer purpose-built through-fabric techniques.
    if (overFabric && typeof meta.technique_id === 'string' && meta.technique_id.includes('THROUGH_FABRIC')) {
      w *= 8
    }
    return { item: a, weight: w }
  })
  const action = weightedPick(actionEntries, rng)
  if (!action) return null

  return {
    zoneId,
    where: friendlyLabel(zoneId),
    instruction: action.instruction,
    intensity: Math.round(Tact),
    overFabric,
    garment,
  }
}
