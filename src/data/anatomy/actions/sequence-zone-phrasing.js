import { spokenZone } from './sequence-spoken-zones.js'
import { ANCHOR_HINTS } from './sequence-anchor-phrasing.js'

/** @type {Record<string, string>} */
export const ZONE_GLOSS = {}

/** Extra words authors use in cues that duplicate spoken zone labels. */
const ZONE_CUE_ALIASES = {
  penis_glans: ['head', 'head of the penis', 'glans', 'tip', 'the tip'],
  penis_shaft: ['shaft', 'mid-shaft', 'mid shaft', 'the shaft'],
  penis: ['root'],
  frenulum: ['frenulum', 'the frenulum'],
  foreskin: ['foreskin', 'hooded shaft'],
  clitoral_glans: ['tip', 'glans', 'clitoral tip'],
  clitoral_hood: ['hood', 'hood fold', 'the hood'],
  labia_minora: ['inner lips', 'inner labia'],
  labia_majora: ['outer lips', 'outer labia'],
  nipple: ['nipple', 'nipple bud'],
  areola: ['areola', 'full areola', 'areola pad'],
  breast_tissue: ['breast', 'breast mound'],
  stomach: ['belly', 'the belly'],
  inner_thighs: ['inner thigh', 'inner leg'],
  outer_thighs: ['outer thigh'],
  groin: ['crease', 'groin crease'],
  mons_pubis: ['mons'],
  scrotum: ['scrotum', 'sack'],
  testicles: ['balls', 'testicles'],
  vaginal_introitus: ['opening', 'entrance', 'the entrance', 'at the opening'],
  vaginal_posterior_wall: ['back wall', 'the back wall'],
  vaginal_anterior_wall: ['front wall', 'the front wall'],
  vaginal_lateral_wall: ['side wall', 'one side wall'],
  vagina: ['canal'],
  vestibule: ['at the opening', 'the opening'],
  cervix: ['toward the cervix', 'the cervix'],
  base_of_neck: ['base of the neck', 'upper trapezius'],
  neck: ['side of the neck', 'the neck'],
}

/** @param {string} a @param {string} b */
function edgeKey(a, b) {
  return [a, b].sort().join('|')
}

/** Undirected adjacency for continuous sweep paths (max 3 zones). */
const CONTIGUOUS_PAIRS = [
  ['nipple', 'areola'],
  ['areola', 'breast_tissue'],
  ['penis', 'penis_shaft'],
  ['penis_shaft', 'penis_glans'],
  ['penis_glans', 'frenulum'],
  ['foreskin', 'penis_glans'],
  ['penis_glans', 'urethral_meatus'],
  ['clitoral_hood', 'clitoral_glans'],
  ['labia_majora', 'labia_minora'],
  ['labia_minora', 'vestibule'],
  ['labia_minora', 'vaginal_introitus'],
  ['vaginal_introitus', 'vaginal_anterior_wall'],
  ['vaginal_introitus', 'vaginal_posterior_wall'],
  ['vaginal_introitus', 'vaginal_lateral_wall'],
  ['mons_pubis', 'groin'],
  ['groin', 'inner_thighs'],
  ['upper_abdomen', 'stomach'],
  ['stomach', 'upper_abdomen'],
  ['lower_abdomen', 'mons_pubis'],
  ['chest', 'stomach'],
  ['neck', 'base_of_neck'],
  ['base_of_neck', 'shoulders'],
  ['upper_back', 'lower_back'],
  ['lower_back', 'sacrum'],
  ['sacrum', 'coccyx'],
  ['back', 'upper_back'],
  ['back', 'lower_back'],
  ['gluteus_medius', 'gluteus_maximus'],
  ['gluteus_maximus', 'buttock_crease'],
  ['buttocks', 'buttock_crease'],
  ['buttock_crease', 'buttock_pad'],
  ['inner_thighs', 'knees'],
  ['outer_thighs', 'knees'],
  ['knees', 'calves'],
  ['calves', 'ankles'],
  ['ankles', 'feet'],
  ['feet', 'soles'],
  ['soles', 'toes'],
  ['deltoid', 'shoulders'],
  ['inner_arms', 'elbows'],
  ['elbows', 'forearms'],
]

const CONTIGUOUS_EDGE_KEYS = new Set(CONTIGUOUS_PAIRS.map(([a, b]) => edgeKey(a, b)))

/** Nearby zones: next step uses "Then …" without a full new-zone move. */
const SOFT_STEP_EDGES = new Set([
  edgeKey('base_of_neck', 'neck'),
  edgeKey('neck', 'ears'),
  edgeKey('neck', 'shoulders'),
  edgeKey('neck', 'base_of_neck'),
  edgeKey('penis_shaft', 'penis_glans'),
  edgeKey('penis_glans', 'frenulum'),
  edgeKey('foreskin', 'penis_glans'),
  edgeKey('clitoral_hood', 'clitoral_glans'),
  edgeKey('labia_majora', 'labia_minora'),
  edgeKey('labia_minora', 'vestibule'),
  edgeKey('labia_minora', 'vaginal_introitus'),
  edgeKey('vaginal_introitus', 'vaginal_anterior_wall'),
  edgeKey('vaginal_introitus', 'vaginal_posterior_wall'),
  edgeKey('vaginal_introitus', 'vaginal_lateral_wall'),
  edgeKey('mons_pubis', 'groin'),
  edgeKey('groin', 'inner_thighs'),
  edgeKey('upper_abdomen', 'lower_abdomen'),
  edgeKey('stomach', 'upper_abdomen'),
  edgeKey('lower_abdomen', 'mons_pubis'),
  edgeKey('chest', 'stomach'),
  edgeKey('neck', 'base_of_neck'),
  edgeKey('throat', 'neck'),
  edgeKey('neck', 'throat'),
  edgeKey('throat', 'base_of_neck'),
  edgeKey('base_of_neck', 'shoulders'),
  edgeKey('upper_back', 'lower_back'),
  edgeKey('lower_back', 'sacrum'),
  edgeKey('back', 'upper_back'),
  edgeKey('back', 'lower_back'),
  edgeKey('gluteus_medius', 'gluteus_maximus'),
  edgeKey('gluteus_maximus', 'buttock_crease'),
  edgeKey('buttocks', 'buttock_crease'),
  edgeKey('buttock_crease', 'buttock_pad'),
  edgeKey('inner_thighs', 'knees'),
  edgeKey('outer_thighs', 'knees'),
  edgeKey('knees', 'calves'),
  edgeKey('calves', 'ankles'),
  edgeKey('ankles', 'feet'),
  edgeKey('feet', 'soles'),
  edgeKey('soles', 'toes'),
  edgeKey('deltoid', 'shoulders'),
  edgeKey('inner_arms', 'elbows'),
  edgeKey('elbows', 'forearms'),
])

/**
 * @param {string} fromZone
 * @param {string} toZone
 */
export function isSoftStepTransition(fromZone, toZone) {
  return SOFT_STEP_EDGES.has(edgeKey(fromZone, toZone))
}

const SWEEP_CHAINS = [
  ['penis_shaft', 'penis_glans'],
  ['foreskin', 'penis_glans'],
  ['nipple', 'areola', 'breast_tissue'],
  ['nipple', 'areola'],
  ['areola', 'breast_tissue'],
  ['clitoral_hood', 'clitoral_glans'],
  ['labia_majora', 'labia_minora'],
  ['upper_back', 'lower_back'],
  ['lower_back', 'sacrum'],
  ['stomach', 'upper_abdomen'],
  ['upper_abdomen', 'lower_abdomen'],
  ['inner_thighs', 'knees'],
  ['knees', 'calves'],
  ['calves', 'ankles'],
  ['ankles', 'feet'],
  ['feet', 'soles'],
  ['soles', 'toes'],
  ['inner_arms', 'elbows'],
  ['elbows', 'forearms'],
  ['gluteus_medius', 'gluteus_maximus'],
  ['gluteus_maximus', 'buttock_crease'],
]

/** @param {string[]} path */
export function isContiguousPath(path) {
  if (!path || path.length < 2) return false
  for (let i = 1; i < path.length; i++) {
    if (!CONTIGUOUS_EDGE_KEYS.has(edgeKey(path[i - 1], path[i]))) return false
  }
  return true
}

/** @param {string[]} path */
function matchesSweepChain(path) {
  if (!path?.length) return false
  return SWEEP_CHAINS.some(
    (chain) =>
      chain.length >= path.length &&
      path.every((zoneId, i) => chain[i] === zoneId)
  )
}

/**
 * @param {string[]} path
 * @param {'progression' | 'sweep'} [override]
 */
export function inferSequenceFlow(path, override) {
  if (override === 'progression' || override === 'sweep') return override
  if (!path || path.length < 2 || path.length > 3) return 'progression'
  return matchesSweepChain(path) ? 'sweep' : 'progression'
}

/** @param {string} zoneId */
function cueTermsForZone(zoneId) {
  const terms = new Set([spokenZone(zoneId), zoneId.replace(/_/g, ' ')])
  for (const a of ZONE_CUE_ALIASES[zoneId] || []) terms.add(a)
  return [...terms].sort((a, b) => b.length - a.length)
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * @param {string} cue
 * @param {string} zoneId
 */
export function stripZoneFromCue(cue, zoneId) {
  let c = cue.replace(/\s+/g, ' ').trim().replace(/\.$/, '')
  for (const term of cueTermsForZone(zoneId)) {
    const esc = escapeRe(term)
    c = c.replace(
      new RegExp(
        `\\b(on|at|around|along|into|over|through|up|down|beside|near)\\s+(the\\s+)?${esc}\\b`,
        'gi'
      ),
      ''
    )
  }
  c = c
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/^\s*(the|a)\s+/i, '')
    .trim()
  return c
}

/**
 * Brief label for sweep mid-path; full body copy lives in ANCHOR_HINTS.
 * @param {string} zoneId
 * @param {Set<string>} _glossed
 */
export function zonePhrase(zoneId, _glossed) {
  if (ANCHOR_HINTS[zoneId]) {
    const hint = ANCHOR_HINTS[zoneId]
    const short = hint.split(',')[0].trim()
    if (short.length < 55) return short
  }
  return `the ${spokenZone(zoneId)}`
}
