/**
 * Internal vaginal zones: opening-first placement, depth-aware travel (no short "shift to cervix").
 */

/** @param {string} from @param {string} to */
function travelKey(from, to) {
  return `${from}|${to}`
}

export const INTERNAL_VAGINAL = new Set([
  'vagina',
  'vaginal_anterior_wall',
  'vaginal_posterior_wall',
  'vaginal_lateral_wall',
  'cervix',
])

export const DEEP_VAGINAL = new Set(['cervix'])

/** @param {string} zoneId */
export function isInternalVaginal(zoneId) {
  return INTERNAL_VAGINAL.has(zoneId)
}

/** @param {string} zoneId */
export function isDeepVaginal(zoneId) {
  return DEEP_VAGINAL.has(zoneId)
}

/** Opening placement for any internal vaginal step — always external landmark first. */
export const VAGINAL_OPENING_ANCHOR =
  'at the vulva, at the vaginal opening between the inner lips'

/**
 * Spoken travel between internal zones (depth/direction, not external "shift").
 * @param {string} fromZone
 * @param {string} toZone
 */
export function internalVaginalTravel(fromZone, toZone) {
  const key = travelKey(fromZone, toZone)
  const legs = {
    [travelKey('vaginal_introitus', 'vaginal_anterior_wall')]:
      'slip one or two fingers just inside, curled toward the belly on the front wall—one or two knuckles deep, only if comfortable',
    [travelKey('vaginal_introitus', 'vagina')]:
      'ease one or two fingers just inside the canal, only one knuckle deep at first',
    [travelKey('vaginal_introitus', 'vaginal_posterior_wall')]:
      'ease one or two fingers inside toward the back wall—one or two knuckles, only if comfortable',
    [travelKey('vaginal_introitus', 'vaginal_lateral_wall')]:
      'ease one or two fingers inside to press a side wall—one or two knuckles, only if comfortable',
    [travelKey('vagina', 'vaginal_posterior_wall')]:
      'angle your fingers a little deeper toward the back wall inside—one or two knuckles, only if comfortable',
    [travelKey('vagina', 'vaginal_anterior_wall')]:
      'curl your fingers toward the belly-side wall inside—one or two knuckles deep',
    [travelKey('vaginal_anterior_wall', 'cervix')]:
      'only if depth feels welcome, curl one or two knuckles deeper along the front wall until you feel the firm dome—never forcing depth',
    [travelKey('vaginal_anterior_wall', 'vaginal_lateral_wall')]:
      'angle your fingers to press the side wall inside the canal',
    [travelKey('vaginal_lateral_wall', 'vaginal_anterior_wall')]:
      'angle your fingers to the belly-side wall inside the canal',
    [travelKey('vaginal_lateral_wall', 'vaginal_posterior_wall')]:
      'angle your fingers toward the back wall inside',
    [travelKey('vaginal_posterior_wall', 'vaginal_anterior_wall')]:
      'curl your fingers toward the belly-side wall inside',
    [travelKey('cervix', 'vaginal_anterior_wall')]:
      'ease back along the front wall inside—shallower, one or two knuckles',
    [travelKey('cervix', 'vagina')]:
      'ease back to a shallower depth in the canal',
    [travelKey('vaginal_anterior_wall', 'vagina')]:
      'ease to a shallower depth in the canal',
    [travelKey('vaginal_posterior_wall', 'vagina')]:
      'ease to a shallower depth in the canal',
    [travelKey('vaginal_introitus', 'cervix')]:
      'only if depth feels welcome, curl along the front wall until you feel the firm dome—never forcing depth',
    [travelKey('vaginal_anterior_wall', 'vaginal_introitus')]:
      'ease your fingers back to the opening, staying shallow',
    [travelKey('vagina', 'vaginal_introitus')]:
      'ease back to the vaginal opening, one knuckle deep or less',
  }
  return legs[key] || null
}

/**
 * @param {string} fromZone
 * @param {string} toZone
 */
export function usesInternalVaginalTravel(fromZone, toZone) {
  if (!isInternalVaginal(fromZone) && fromZone !== 'vaginal_introitus') return false
  if (!isInternalVaginal(toZone) && toZone !== 'vaginal_introitus') return false
  return Boolean(internalVaginalTravel(fromZone, toZone))
}
