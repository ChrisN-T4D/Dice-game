/**
 * Display order for admin anatomy tree (head → limbs).
 */
import { subRegionDecls, subRegions } from './regions.js'

/** Top-level regions as they appear on the body (top to bottom). */
export const REGION_DISPLAY_ORDER = [
  'head_neck',
  'torso',
  'back',
  'genitalia',
  'limbs',
  'other',
]

function primaryNamesForSubRegion(subRegionId) {
  for (const subs of Object.values(subRegionDecls)) {
    const decl = subs[subRegionId]
    if (decl?.primary_anatomy_names) return decl.primary_anatomy_names
  }
  return []
}

export function regionSortIndex(regionId) {
  const i = REGION_DISPLAY_ORDER.indexOf(regionId)
  return i >= 0 ? i : 99
}

export function subRegionSortIndex(regionId, subRegionId) {
  const order = subRegions[regionId] || []
  const i = order.indexOf(subRegionId)
  return i >= 0 ? i : 99
}

export function zoneSortIndex(subRegionId, zoneId) {
  const names = primaryNamesForSubRegion(subRegionId)
  const i = names.indexOf(zoneId)
  return i >= 0 ? i : 99
}

export function sortRegions(regions) {
  return [...regions].sort(
    (a, b) => regionSortIndex(a.id) - regionSortIndex(b.id) || a.id.localeCompare(b.id)
  )
}

export function sortSubRegions(regionId, subRegionsList) {
  return [...subRegionsList].sort(
    (a, b) =>
      subRegionSortIndex(regionId, a.id) - subRegionSortIndex(regionId, b.id) ||
      a.id.localeCompare(b.id)
  )
}

export function sortZones(subRegionId, zones) {
  // Preserve any additional fields (like actionCount) added by the API
  return [...zones].sort(
    (a, b) =>
      zoneSortIndex(subRegionId, a.id) - zoneSortIndex(subRegionId, b.id) ||
      a.display_name.localeCompare(b.display_name)
  )
}

/**
 * Apply body order to a hierarchy API payload, preserving extra fields.
 * @param {Object} hierarchy - Response from API
 * @returns {Object} Sorted hierarchy with preserved fields
 */
export function sortAnatomyHierarchy(hierarchy) {
  if (!hierarchy?.regions) return hierarchy
  return {
    ...hierarchy,
    regions: sortRegions(hierarchy.regions).map((region) => ({
      ...region,
      subRegions: sortSubRegions(region.id, region.subRegions || []).map((sub) => ({
        ...sub,
        zones: sortZones(sub.id, sub.zones || []),
      })),
    })),
  }
}
