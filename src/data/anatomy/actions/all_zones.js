/**
 * Generated baseline actions for all profile zones except hand-authored pilots.
 */
import zoneProfiles from '../profiles/index.js'
import { buildActionsFromProfiles } from './_actionKit.js'

const CLITORIS_ZONES = new Set([
  'clitoral_hood',
  'clitoral_glans',
  'labia_minora',
  'labia_majora',
  'vestibular_bulbs',
])

export default buildActionsFromProfiles(zoneProfiles, {
  excludeZoneIds: CLITORIS_ZONES,
})
