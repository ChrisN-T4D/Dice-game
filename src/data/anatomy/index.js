/**
 * Anatomy data access — SQL-backed via API (see server/README.md).
 * Taxonomy constants remain in regions.js for UI/validation.
 */

export {
  getZone,
  listZones,
  getZoneChildren,
  getPosition,
  getPositionZones,
  getAnatomyById,
  getAnatomyByRegion,
  partnerAnatomyToOrientation,
  clearAnatomyCache,
  checkAnatomyApiHealth,
  fetchAnatomyHierarchy,
  getZoneWithActions,
  invalidateZoneActionsCache,
} from './client.js'

export { enrichAction, enrichZoneActions, zoneProfileFromApiZone } from './action-enrich.js'
export {
  getStimulatorContact,
  getModalityContact,
  effectiveContactFu,
  padExceedsZone,
  extentFromFu,
  STIMULATOR_PARTS,
  STIMULATOR_CONTACT,
} from './contact-scale.js'

export {
  regions,
  subRegions,
  subRegionDecls,
  getRegionForAnatomy,
  getRegionDisplayName,
} from './regions.js'
