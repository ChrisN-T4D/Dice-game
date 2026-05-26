/**
 * Profile rubric checks (PROFILE_SCHEMA.md). Used by CLI audit and admin UI.
 */

export const SCORE_RANGES = { low: [20, 40], medium: [50, 70], high: [80, 100] }

const FEMALE_ONLY = new Set(['clitoris_hierarchy', 'vagina_hierarchy'])
const MALE_ONLY = new Set(['penis_hierarchy', 'scrotum_testicles'])
const STIM_LEVELS = new Set(['low', 'medium', 'high'])
const TECHNIQUES = new Set(['stroke', 'pressure', 'circle', 'tap', 'kiss'])
const CLINICAL = /\b(innervated|tactile|haptic|distal|proximal|medial|volar|dorsal)\b/i

function inRange(score, level) {
  const [lo, hi] = SCORE_RANGES[level]
  return score >= lo && score <= hi
}

function expectedOrientations(subRegionId) {
  if (FEMALE_ONLY.has(subRegionId)) return ['female']
  if (MALE_ONLY.has(subRegionId)) return ['male']
  return ['female', 'male']
}

function normalizeOrientations(orientation) {
  if (!orientation) return []
  return Array.isArray(orientation) ? orientation : [orientation]
}

/**
 * @param {object} zone — profile chunk or API zone detail
 * @param {{ subRegionId?: string }} [ctx]
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function auditZoneProfile(zone, ctx = {}) {
  const issues = []
  const subRegionId = ctx.subRegionId || zone.subRegion || zone.sub_region_id

  if (!zone.display_name?.trim()) issues.push('Missing display name')
  if (!zone.description?.trim()) issues.push('Missing description')
  else if (zone.description.length < 40) issues.push('Description too short (min 40 chars)')

  const sensitivity = zone.sensitivity
  const score = zone.sensitivity_score
  if (!['low', 'medium', 'high'].includes(sensitivity)) {
    issues.push(`Invalid sensitivity level: ${sensitivity}`)
  } else if (typeof score !== 'number' || !inRange(score, sensitivity)) {
    const [lo, hi] = SCORE_RANGES[sensitivity]
    issues.push(`Score ${score} outside ${sensitivity} range (${lo}–${hi})`)
  }

  if (subRegionId) {
    const exp = expectedOrientations(subRegionId)
    const got = normalizeOrientations(zone.orientations ?? zone.orientation).sort().join(',')
    const want = [...exp].sort().join(',')
    if (got !== want) issues.push(`Orientations [${got}] expected [${want}]`)
  }

  const stim = zone.stimulation || {}
  const ep = stim.erogenous_priority
  if (ep == null) issues.push('Missing erogenous_priority')
  else if (typeof score === 'number' && Math.abs(ep - score) > 12) {
    issues.push(`Erogenous priority (${ep}) diverges from score (${score}) by >12`)
  }

  const techniques = zone.techniques || stim.primary_techniques || []
  if (!techniques.length) issues.push('No techniques listed')
  for (const t of techniques) {
    if (!TECHNIQUES.has(t)) issues.push(`Invalid technique: ${t}`)
  }

  if (!zone.topology) issues.push('Missing topology profile')
  if (!zone.stimulation) issues.push('Missing stimulation profile')
  if (!zone.musculoskeletal) issues.push('Missing musculoskeletal profile')
  if (!zone.tickle) issues.push('Missing tickle profile')

  if (zone.description && CLINICAL.test(zone.description)) {
    issues.push('Clinical jargon in description')
  }

  for (const k of [
    'sensitivity_to_pressure',
    'sensitivity_to_friction',
    'sensitivity_to_teeth',
    'sensitivity_to_mouth',
    'sensitivity_to_hand',
  ]) {
    const v = stim[k]
    if (v != null && !STIM_LEVELS.has(v)) issues.push(`Invalid stimulation.${k}: ${v}`)
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Quick checks using hierarchy row fields only (before detail load).
 * @param {{ id: string, sensitivity: string, sensitivity_score: number, description?: string, profileComplete?: boolean }} row
 */
export function auditZoneSummary(row) {
  const issues = []
  if (!inRange(row.sensitivity_score, row.sensitivity)) {
    const [lo, hi] = SCORE_RANGES[row.sensitivity]
    issues.push(`Score ${row.sensitivity_score} outside ${row.sensitivity} (${lo}–${hi})`)
  }
  if (
    row.erogenous_priority != null &&
    row.sensitivity_score != null &&
    Math.abs(row.erogenous_priority - row.sensitivity_score) > 12
  ) {
    issues.push(
      `Erogenous priority (${row.erogenous_priority}) diverges from score (${row.sensitivity_score})`
    )
  }
  if (row.profileComplete === false) issues.push('Incomplete profile tables in database')
  return { ok: issues.length === 0, issues }
}
