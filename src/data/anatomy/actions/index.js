/**
 * Flat map: zone_id → stimulation action[].
 * Hand-authored pilots override generated baselines per zone.
 * Multi-zone sequences are stored on their anchor zone only.
 */
import allZones from './all_zones.js'
import clitoris_hierarchy from './clitoris_hierarchy.js'
import { sequenceCatalog } from './sequences/index.js'
import { parseSequenceMeta } from './_makeSequenceAction.js'

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

export { sequenceCatalog }
export default zoneActions
