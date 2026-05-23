/**
 * Home positions: neutral bridge between guided/sensate segments (spoken transition).
 * Text-only v1; favoritable; default chosen in setup wizard.
 */

/** @typedef {{ id: string, name: string, returnLine: string, activityLine: string, isAppDefault?: boolean }} HomePosition */

/** @type {HomePosition[]} */
export const HOME_POSITIONS = [
  {
    id: 'side_by_side_neutral',
    name: 'Side by side',
    isAppDefault: true,
    returnLine: 'Come back to your default: lie on your sides facing each other.',
    activityLine:
      'Kiss and use your hands for gentle, non-demanding touch. Check in with each other as you decide who gives next.',
  },
  {
    id: 'spooning_neutral',
    name: 'Spooning',
    returnLine: 'Return to your default: lie spooned together, bodies aligned and relaxed.',
    activityLine:
      'Keep slow kisses and light stroking along arms, sides, and hips. Pause and check in before the next direction.',
  },
  {
    id: 'face_to_face_seated',
    name: 'Face to face seated',
    returnLine: 'Move back to your default: sit facing each other, close enough to touch easily.',
    activityLine:
      'Hold hands, kiss softly, and pet each other with unhurried touch while you reset who leads next.',
  },
  {
    id: 'lying_head_to_head',
    name: 'Lying head to head',
    returnLine: 'Return to your default: lie beside each other with heads near, bodies comfortable.',
    activityLine:
      'Trade slow kisses and gentle caresses. Let the moment stay easy until you are ready for the next instruction.',
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

/** Static phrase rows for WAV generation (combined line per home). */
export const HOME_TRANSITION_PHRASES = HOME_POSITIONS.map((h) => ({
  id: `home_transition_${h.id}`,
  text: formatHomeTransition(h.id),
}))
