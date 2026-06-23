/**
 * Home positions: neutral bridge between guided/sensate segments (spoken transition).
 * Text-only v1; favoritable; default chosen in setup wizard.
 */

/** @typedef {{ id: string, name: string, returnLine: string, activityLine: string, isAppDefault?: boolean }} HomePosition */

/** @type {HomePosition[]} */
export const HOME_POSITIONS = [
  {
    id: 'seated_lotus_neutral',
    name: 'Seated lotus',
    isAppDefault: true,
    returnLine:
      'Ease back into your neutral position: sit facing each other, cross-legged in a comfortable lotus, knees close and bodies upright.',
    activityLine:
      'Stay connected as you flow back together—kiss and touch each other freely with both hands, and check in as you decide who gives next.',
  },
  {
    id: 'spooning_neutral',
    name: 'Spooning',
    returnLine: 'Ease back into your neutral position: lie spooned together, bodies aligned and relaxed.',
    activityLine:
      'Stay connected as you flow back together—keep slow kisses and light stroking along arms, sides, and hips, and check in before the next direction.',
  },
  {
    id: 'face_to_face_seated',
    name: 'Face to face seated',
    returnLine: 'Ease back into your neutral position: sit facing each other, close enough to touch easily.',
    activityLine:
      'Stay connected as you flow back together—hold hands, kiss softly, and pet each other with unhurried touch while you settle who leads next.',
  },
  {
    id: 'lying_head_to_head',
    name: 'Lying head to head',
    returnLine: 'Ease back into your neutral position: lie beside each other with heads near, bodies comfortable.',
    activityLine:
      'Stay connected as you flow back together—trade slow kisses and gentle caresses, and let the moment stay easy until you are ready for the next instruction.',
  },
]

const BY_ID = Object.fromEntries(HOME_POSITIONS.map((h) => [h.id, h]))

export function getHomePositionById(id) {
  return BY_ID[id] || null
}

export function getDefaultHomePosition() {
  return HOME_POSITIONS.find((h) => h.isAppDefault) || HOME_POSITIONS[0]
}

/**
 * Full spoken transition between segments (return + activity).
 * @param {string} homeId
 */
export function formatHomeTransition(homeId) {
  const home = getHomePositionById(homeId) || getDefaultHomePosition()
  return `${home.returnLine} ${home.activityLine}`.replace(/\s+/g, ' ').trim()
}

/**
 * Opening instruction spoken once before the first turn: get into the home
 * position to start. Reuses the position description from the return line so the
 * two stay in sync, but phrases it as a fresh start rather than "come back".
 * @param {string} homeId
 */
export function formatHomeOpening(homeId) {
  const home = getHomePositionById(homeId) || getDefaultHomePosition()
  const colon = home.returnLine.indexOf(':')
  const desc = colon >= 0 ? home.returnLine.slice(colon + 1).trim() : home.returnLine.trim()
  const descCap = desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : desc
  return `To begin, settle into your home position together. ${descCap} ${home.activityLine}`
    .replace(/\s+/g, ' ')
    .trim()
}

/** Static phrase rows for WAV generation (combined line per home). */
export const HOME_TRANSITION_PHRASES = HOME_POSITIONS.map((h) => ({
  id: `home_transition_${h.id}`,
  text: formatHomeTransition(h.id),
}))
