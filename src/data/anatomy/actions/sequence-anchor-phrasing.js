/**
 * Directive sequence copy: landmark-first anchors (known body part → specific spot).
 * See body-landmark-anchors.js for the full hint set.
 */
import { placementForZone } from './zone-placement.js'
import { spokenZone } from './sequence-spoken-zones.js'
import { ANCHOR_HINTS } from './body-landmark-anchors.js'

export { ANCHOR_HINTS }

/** Shorter shift when the next zone sits right beside the last. */
const SOFT_MOVE_ANCHOR = {
  'base_of_neck|neck': 'up along the sides of the neck',
  'neck|base_of_neck':
    'down to the meaty pad beside the spine where the neck meets the back',
  'neck|ears': 'up to the earlobe on the side of the head',
  'neck|shoulders': 'out onto the top of the shoulder',
  'nipple|areola': 'out across the darker ring around the nipple',
  'areola|breast_tissue': 'out over the soft mound of the breast',
  'areola|nipple': 'in to the nipple at the center',
  'breast_tissue|areola': 'in toward the ring around the nipple',
  'breast_tissue|nipple': 'in to the nipple',
  'clitoral_hood|clitoral_glans': 'to the tiny bead under the fold at the top of the inner lips',
  'clitoral_glans|clitoral_hood': 'back to the fold where the inner lips meet at the top',
  'clitoral_glans|labia_minora': 'down along the inner lips',
  'labia_majora|labia_minora': 'in along the inner lips',
  'labia_minora|vestibule': 'to the shallow area at the opening',
  'labia_minora|clitoral_hood': 'up to the fold where the inner lips meet at the top',
  'labia_minora|vaginal_introitus': 'to the opening',
  'vestibule|vaginal_introitus': 'to the opening',
  'vestibule|clitoral_hood': 'up to the fold where the inner lips meet at the top',
  'vaginal_introitus|vaginal_anterior_wall': 'just inside toward the front wall',
  'vagina|vaginal_posterior_wall': 'deeper toward the back wall inside',
  'penis_shaft|penis_glans': 'up to the soft head at the tip',
  'penis_glans|penis_shaft': 'down along the shaft',
  'penis_glans|frenulum': 'to the sensitive strip under the head',
  'foreskin|penis_glans': 'over the head beneath the skin',
  'frenulum|penis_glans': 'up to the head',
  'penis|scrotum': 'down to the soft sack below',
  'upper_back|lower_back': 'down the back toward the lower back',
  'lower_back|buttocks': 'down onto the cheek of the buttock',
  'buttocks|gluteus_maximus': 'into the meatiest part of the cheek',
  'gluteus_maximus|buttock_crease': 'down to the crease above the thigh',
  'inner_thighs|knees': 'down toward the knee on the inner leg',
  'outer_thighs|calves': 'down the outer leg to the calf',
  'inner_thighs|groin': 'up into the crease where the leg meets the body',
  'groin|inner_thighs': 'down the inner thigh',
  'mons_pubis|groin': 'down into the crease at the top of the leg',
  'stomach|upper_abdomen': 'up under the ribs on the front of the belly',
  'upper_abdomen|stomach': 'down to the belly around the navel',
  'stomach|lower_abdomen': 'down low on the front of the belly',
  'stomach|chest': 'up to the front of the chest',
  'chest|upper_abdomen': 'down onto the upper belly under the ribs',
  'inner_arms|elbows': 'down to the soft inner elbow crease',
  'feet|ankles': 'to the ankle',
  'soles|toes': 'to the toe pads',
  'calves|shins': 'around to the front of the lower leg',
  'deltoid|shoulders': 'onto the shoulder cap',
  'upper_back|neck': 'up to the back of the neck',
  'spine|sacrum': 'down to the flat base of the spine',
  'sacrum|buttock_crease': 'down to the crease above the thigh',
  'buttock_crease|perineum': 'forward to the bridge between the genitals and the anus',
  'buttocks|lower_back': 'up to the lower back',
  'buttocks|sacrum': 'to the flat base of the spine between the cheeks',
  'ribcage|sides': 'around to the side of the waist',
  'back|sides': 'around to the side of the torso',
  'hip_bone|groin': 'in to the crease beside the hip',
  'lower_abdomen|hip_bone': 'out to the front of the hip bone',
  'lower_abdomen|mons_pubis': 'down to the soft mound above the vulva',
}

const TOOL_FROM_STIMULATOR = {
  finger: 'your fingers',
  fingertip: 'a fingertip',
  palm: 'your palm',
  thumb: 'your thumbs',
  tongue: 'your tongue',
  lip: 'your lips',
  hand: 'your hand',
}

/** @type {Record<string, string>} */
const ZONE_TECHNIQUE_TOOL = {
  'base_of_neck|pressure': 'your thumbs',
  'neck|kiss': 'your lips',
}

function edgeKey(a, b) {
  return [a, b].sort().join('|')
}

function placeVerb(anchor) {
  if (/^(from|at)\b/i.test(anchor)) return 'Start with'
  if (/^(where|inside|in the)\b/i.test(anchor)) return 'Place'
  if (/^on the penis\b/i.test(anchor) || /^under the penis\b/i.test(anchor)) return 'Start with'
  return 'Put'
}

/**
 * @param {string} zoneId
 */
export function spokenAnchor(zoneId) {
  if (ANCHOR_HINTS[zoneId]) return ANCHOR_HINTS[zoneId]
  const place = placementForZone(zoneId)
  const label = spokenZone(zoneId)
  const w = (place.where || '').split(/[—(]/)[0].trim()
  if (w.length > 12 && w.length < 100) return w
  return `on the ${label}`
}

export function toolFromStep(cue, step) {
  const zt = ZONE_TECHNIQUE_TOOL[`${step.zone_id}|${step.technique}`]
  if (zt) return zt
  const m = cue.match(
    /\bwith (one or two fingers|a fingertip|your (?:thumb|thumbs|palms?|tongue|lips?|hand))\b/i
  )
  if (m) return m[1]
  const key = step.stimulator || 'finger'
  return TOOL_FROM_STIMULATOR[key] || 'your hand'
}

const TOOL_PHRASE_RE =
  /\s+with\s+(one or two fingers|a(?:\s+wet)?\s+fingertip|your\s+(?:thumb|thumbs|palms?|tongue|lips?|hand))\b/gi

/** @param {string} cue */
export function actionFromCue(cue) {
  let a = cue.trim().replace(TOOL_PHRASE_RE, '')
  a = a.replace(/\s+with\s*$/i, '').replace(/\s+with\s+a\s+\w+\s*$/i, '').trim()
  if (!a || a.length < 3) return cue.trim()
  return a
}

export function directivePlaceThenAct(step, cue, _glossed, enrichAction) {
  const tool = toolFromStep(cue, step)
  const anchor = spokenAnchor(step.zone_id)
  let action = actionFromCue(cue)
  if (enrichAction) {
    action = enrichAction(action, {
      zoneId: step.zone_id,
      stepIndex: 0,
      technique: step.technique,
    })
  }
  const act = action.charAt(0).toUpperCase() + action.slice(1)
  return `${placeVerb(anchor)} ${tool} ${anchor}. ${act}.`
}

export function directiveMoveThenAct(step, cue, fromZoneId, enrichAction) {
  const tool = toolFromStep(cue, step)
  let action = actionFromCue(cue)
  if (enrichAction) {
    action = enrichAction(action, {
      zoneId: step.zone_id,
      technique: step.technique,
    })
  }
  const act = action.charAt(0).toUpperCase() + action.slice(1)
  const soft = fromZoneId ? SOFT_MOVE_ANCHOR[edgeKey(fromZoneId, step.zone_id)] : ''
  if (soft) {
    const prep =
      soft.startsWith('up ') ||
      soft.startsWith('down ') ||
      soft.startsWith('out ') ||
      soft.startsWith('in ') ||
      soft.startsWith('back ') ||
      soft.startsWith('around ') ||
      soft.startsWith('forward ') ||
      soft.startsWith('deeper ') ||
      soft.startsWith('just ')
        ? ''
        : 'to '
    return `Move ${tool} ${prep}${soft}. ${act}.`
  }
  const anchor = spokenAnchor(step.zone_id)
  const prep = /^(from|at|on the penis|under the penis|where|inside|in the)\b/i.test(anchor)
    ? ''
    : 'on '
  return `Move ${tool} ${prep}${anchor}. ${act}.`
}

export function directiveNewZone(step, cue, _glossed, enrichAction) {
  const tool = toolFromStep(cue, step)
  const anchor = spokenAnchor(step.zone_id)
  let action = actionFromCue(cue)
  if (enrichAction) {
    action = enrichAction(action, {
      zoneId: step.zone_id,
      technique: step.technique,
    })
  }
  const act = action.charAt(0).toUpperCase() + action.slice(1)
  const prep = /^(from|at|on the penis|under the penis|where|inside|in the)\b/i.test(anchor)
    ? ''
    : 'on '
  return `Move ${tool} ${prep}${anchor}. ${act}.`
}
