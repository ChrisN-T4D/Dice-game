import clitoris_hierarchy from './clitoris_hierarchy.js'
import vagina_hierarchy from './vagina_hierarchy.js'
import perineum_mons from './perineum_mons.js'
import penis_hierarchy from './penis_hierarchy.js'
import scrotum_testicles from './scrotum_testicles.js'
import upper_body from './upper_body.js'
import lower_body from './lower_body.js'
import upper_back from './upper_back.js'
import thighs from './thighs.js'
import neck from './neck.js'
import ears from './ears.js'
import mouth from './mouth.js'
import arms from './arms.js'
import calves from './calves.js'
import feet from './feet.js'

/** @type {Record<string, import('./_makeZone.js').ZoneProfile>} */
export const zoneProfiles = {
  ...clitoris_hierarchy,
  ...vagina_hierarchy,
  ...perineum_mons,
  ...penis_hierarchy,
  ...scrotum_testicles,
  ...upper_body,
  ...lower_body,
  ...upper_back,
  ...thighs,
  ...neck,
  ...ears,
  ...mouth,
  ...arms,
  ...calves,
  ...feet,
}

export default zoneProfiles
