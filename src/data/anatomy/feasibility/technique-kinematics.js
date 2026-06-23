/**
 * Technique kinematics — the physical "shape" of each touch verb.
 *
 * This is the bridge between the OMGYES touching techniques (which describe HOW
 * to stimulate) and the geometry/capability model (which describes WHAT is
 * physically possible on a given zone with a given body part).
 *
 * The OMGYES material repeatedly reduces "what feels good" to a small set of
 * controllable variables:
 *   - location   — exactly where contact lands (hood vs. direct bead, rim vs. depth)
 *   - pressure   — gliding → moving the skin → firm massage (Orbiting)
 *   - rhythm     — skipping / raindrops / back-to-back / constant (Rhythm)
 *   - motion     — circles (Orbiting), up/down strokes (Shallowing), taps/flutter
 *   - depth      — shallow entrance vs. deep end, with deliberate control (Deep End)
 *   - staging    — directness gated by arousal phase; pre-arousal direct touch hurts
 *
 * Here we capture the geometric/mechanical requirements of the canonical action
 * verbs (stroke, pressure, circle, tap, kiss) plus the extended verbs the actor
 * parts can perform (penetrate, suck, lick, vibrate, nibble). The feasibility
 * checks consume these requirements.
 *
 * @see ../../techniques/female/entries/  (OMGYES technique source)
 * @see ../actor-parts.js, ../contact-scale.js
 */

/**
 * motion classes:
 *   point   — discrete, single-spot contact (a tap, a kiss, a press)
 *   orbit   — a continuous loop that needs a small 2D area to travel within
 *   linear  — a directional glide that needs a long axis to travel along
 *   static  — held inward force with little/no travel (pressure)
 *   depth   — entry/advance into a penetrable opening (penetrate, deep end)
 *   enclose — wrapping/suction around a protruding structure (suck)
 *
 * needs:
 *   none        — works on essentially any reachable spot
 *   area        — needs a 2D patch at least ~min_zone_fu across
 *   axis        — needs an elongated structure to stroke along
 *   penetrable  — needs an opening that admits entry
 *   protrudes   — needs a structure that can be drawn into the mouth
 */
export const TECHNIQUE_KINEMATICS = {
  tap: {
    motion: 'point',
    needs: 'none',
    travels: false,
    firm: false,
    contact: ['point'],
    rhythm: true,
    note: 'Discrete point contact / flutter. The carrier for OMGYES Rhythm patterns (skipping, raindrops, back-to-back, constant pulsating).',
  },
  circle: {
    motion: 'orbit',
    needs: 'area',
    min_zone_fu: 0.4,
    travels: false,
    firm: false,
    contact: ['point', 'patch'],
    pressureLevels: ['very_low', 'low', 'medium', 'high'],
    note: 'Continuous circular motion (OMGYES Orbiting). Two variables: location (through hood vs. direct) and pressure (gliding → moving skin → firm massage).',
  },
  stroke: {
    motion: 'linear',
    needs: 'axis',
    min_zone_fu: 0.8,
    travels: true,
    firm: false,
    contact: ['linear', 'patch'],
    note: 'Directional glide along a long axis (OMGYES Shallowing "rubbing up/down" sweeps perineum→clit). Wants an elongated structure or a path across the zone.',
  },
  pressure: {
    motion: 'static',
    needs: 'none',
    travels: false,
    firm: true,
    contact: ['point', 'patch', 'enveloping'],
    note: 'Sustained inward force (Orbiting "firm massage", Deep End "pressing the rim"). Must be gated by tissue delicacy and arousal stage.',
  },
  kiss: {
    motion: 'point',
    needs: 'none',
    travels: false,
    firm: false,
    channel: 'mouth',
    contact: ['point', 'patch'],
    note: 'Lips/mouth contact. Requires the mouth to physically reach the zone.',
  },
  // Extended verbs (actor parts can perform these; not all are in the action DB yet).
  penetrate: {
    motion: 'depth',
    needs: 'penetrable',
    travels: true,
    firm: false,
    requiresPenetrator: true,
    contact: ['enveloping', 'patch'],
    note: 'Entry/advance into a penetrable opening (Shallowing = shallow cycling; Deep End = controlled depth). Depth must be approached from the opening, never jumped.',
  },
  suck: {
    motion: 'enclose',
    needs: 'protrudes',
    travels: false,
    firm: false,
    channel: 'mouth',
    contact: ['enveloping'],
    note: 'Oral suction around a structure that can be drawn in (nipple, clitoral bead, lips, glans).',
  },
  lick: {
    motion: 'linear',
    needs: 'none',
    travels: true,
    firm: false,
    channel: 'mouth',
    contact: ['linear', 'patch'],
    note: 'Flat/tip tongue glide. Mouth reach required.',
  },
  vibrate: {
    motion: 'point',
    needs: 'none',
    travels: false,
    firm: false,
    contact: ['point', 'patch'],
    rhythm: true,
    note: 'Rapid micro-movement that reads like vibration (Rhythm "constant pulsating"). Fine at the skin surface; light pressure suffices.',
  },
  nibble: {
    motion: 'point',
    needs: 'protrudes',
    travels: false,
    firm: false,
    channel: 'mouth',
    requiresTeeth: true,
    contact: ['point'],
    note: 'Light teeth on a structure that can be gently held. Inappropriate on delicate no-teeth zones.',
  },
}

/**
 * OMGYES technique families → the control dimension they primarily modulate.
 * Used to explain *why* a feasibility rule exists and to tie generated actions
 * back to the source material.
 */
export const OMGYES_FAMILIES = {
  ORBITING: { dimension: 'motion+pressure', techniques: ['circle'], note: 'Circling; location (hood vs. direct) × pressure (glide/skin/firm).' },
  SHALLOWING: { dimension: 'motion+depth', techniques: ['stroke', 'penetrate'], note: 'Shallow entrance cycling; up/down rubbing through the entrance zone.' },
  RHYTHM: { dimension: 'tempo', techniques: ['tap', 'vibrate'], note: 'Skipping / raindrops / back-to-back / constant pulsating.' },
  EDGING: { dimension: 'staging', techniques: [], note: 'Back off near climax; pacing at the session level.' },
  STAGING: { dimension: 'staging', techniques: [], note: 'Warmup→build→approach→orgasm→rebuild; directness gated by arousal.' },
  DEEP_END: { dimension: 'depth', techniques: ['penetrate', 'pressure'], note: 'Controlled depth; press the rim, never bump the cervix unexpectedly.' },
  WRAPPING: { dimension: 'location+pressure', techniques: ['stroke', 'pressure'], note: 'Indirect contact through fabric / wrapping; broad gentle coverage.' },
  HINTING: { dimension: 'location', techniques: ['stroke', 'tap'], note: 'Teasing the area / anticipation before direct contact.' },
  ACCENTING: { dimension: 'location', techniques: ['circle', 'pressure'], note: 'Extra attention exactly where it matters most.' },
  SURPRISE: { dimension: 'tempo+location', techniques: ['tap', 'stroke'], note: 'Unexpected variation in pattern or place.' },
}

/** @param {string} technique */
export function kinematicsFor(technique) {
  return TECHNIQUE_KINEMATICS[technique] || null
}

/**
 * Canonical penetrable openings (admit a finger / penis / tongue tip).
 * Cervix and walls are internal-only; the introitus/vagina are the gateway.
 */
export const PENETRABLE_ZONES = new Set([
  'vaginal_introitus',
  'vagina',
  'vaginal_anterior_wall',
  'vaginal_posterior_wall',
  'vaginal_lateral_wall',
  'cervix',
  'cervical_os',
  'anus',
])

/**
 * Zones the mouth/tongue physically cannot reach (deep internal). The tongue
 * can graze the introitus and the shallowest canal, but not the walls/cervix.
 */
export const MOUTH_UNREACHABLE_ZONES = new Set([
  'vaginal_anterior_wall',
  'vaginal_posterior_wall',
  'vaginal_lateral_wall',
  'cervix',
  'cervical_os',
  'prostate',
])

/** Structures that protrude / can be drawn into the mouth for suction or nibbling. */
export const PROTRUDING_ZONES = new Set([
  'nipple',
  'areola',
  'clitoral_glans',
  'clitoral_hood',
  'labia_minora',
  'labia_majora',
  'penis_glans',
  'frenulum',
  'foreskin',
  'ears',
  'toes',
])
