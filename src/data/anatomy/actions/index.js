/**
 * Flat map: zone_id → stimulation action[].
 * Hand-authored pilots override generated baselines per zone.
 * Multi-zone sequences are stored on their anchor zone only.
 */
import allZones from './all_zones.js'
import clitoris_hierarchy from './clitoris_hierarchy.js'
import { sequenceCatalog } from './sequences/index.js'
import { parseSequenceMeta } from './_makeSequenceAction.js'
import {
  omgyesTechniqueActions,
  omgyesByZone,
  omgyesByReceiver,
  omgyesByFamily,
} from './omgyes-techniques.js'

/** @type {Record<string, import('./_makeAction.js').Action[]>} */
function mergeSequences(base) {
  const merged = { ...base }
  for (const action of sequenceCatalog) {
    const anchor = action.zone_id || parseSequenceMeta(action)?.anchor_zone_id
    if (!anchor) continue
    if (!merged[anchor]) merged[anchor] = []
    merged[anchor] = [...merged[anchor], action]
  }
  return merged
}

export const zoneActions = mergeSequences({
  ...allZones,
  ...clitoris_hierarchy,
})

/**
 * zoneActions plus the OMGYES technique layer merged per zone. Use this when
 * you want the named research techniques available alongside the baseline set;
 * the strict per-zone count audit runs against `zoneActions` only.
 */
export const zoneActionsWithTechniques = (() => {
  const merged = {}
  for (const [zone, list] of Object.entries(zoneActions)) merged[zone] = [...list]
  for (const [zone, list] of Object.entries(omgyesByZone)) {
    if (!merged[zone]) merged[zone] = []
    merged[zone] = [...merged[zone], ...list]
  }
  return merged
})()

export {
  sequenceCatalog,
  omgyesTechniqueActions,
  omgyesByZone,
  omgyesByReceiver,
  omgyesByFamily,
}
export default zoneActions
