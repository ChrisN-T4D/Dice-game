/**
 * Calibrated zone geometry over the anatomy illustrations.
 *
 * Coordinates are in the prototype's normalized 0–1000 viewBox (see
 * prototypes/anatomy-map-image.html) and were hand-calibrated against the art.
 * This is now the PRIMARY spatial source for feasibility movement math; the
 * hand-tuned FU edge table is the fallback.
 *
 * Each view is one image/coordinate space. Left/right pairs (labia_minora_l/r,
 * glans_l/r, …) and multi-part structures (corona+glans) are merged into a single
 * canonical zone (centroid + mean radii) so they line up with the action/profile
 * zone ids.
 *
 * @see ../profiles/index.js (canonical zone ids), ../feasibility/geometry-distance.js
 */

/** Prototype zone id → canonical zone id (action/profile vocabulary). */
const PROTO_CANON = {
  inner_thigh_l: 'inner_thighs', inner_thigh_r: 'inner_thighs',
  groin_l: 'groin', groin_r: 'groin',
  mons_pubis: 'mons_pubis', pubic_mound: 'mons_pubis',
  labia_majora_l: 'labia_majora', labia_majora_r: 'labia_majora',
  labia_minora_l: 'labia_minora', labia_minora_r: 'labia_minora',
  clitoral_hood: 'clitoral_hood', clitoral_glans: 'clitoral_glans',
  vaginal_introitus: 'vaginal_introitus', perineum: 'perineum', anus: 'anus',
  shaft: 'penis_shaft', corona: 'penis_glans', glans_l: 'penis_glans', glans_r: 'penis_glans',
  frenulum: 'frenulum', scrotum_l: 'scrotum', scrotum_r: 'scrotum',
  mouth_lips: 'mouth_lips',
  ear_l: 'ears', ear_r: 'ears', neck: 'neck', collarbone: 'clavicle',
  shoulder_l: 'shoulders', shoulder_r: 'shoulders',
  breast_l: 'breast_tissue', breast_r: 'breast_tissue',
  pec_l: 'chest', pec_r: 'chest',
  nipple_l: 'nipple', nipple_r: 'nipple',
  navel: 'stomach', abdomen: 'stomach',
  hip_l: 'hips', hip_r: 'hips',
  vulva: 'vulva', genitals: 'genitals',
  knee_l: 'knees', knee_r: 'knees',
  calf_l: 'calves', calf_r: 'calves',
  foot_l: 'feet', foot_r: 'feet',
  arm_l: 'inner_arms', arm_r: 'inner_arms',
  hand_l: 'hands', hand_r: 'hands',
}

/**
 * Canonical zones that have no own geometry but sit at another zone's location
 * (or are reached via it). Lets the genital walls / testicles borrow a sensible
 * external anchor for spatial reasoning.
 */
export const GEOMETRY_ALIAS = {
  testicles: 'scrotum',
  foreskin: 'penis_glans',
  vagina: 'vaginal_introitus',
}

/** Raw calibrated ellipses per view, prototype ids. {cx,cy,rx,ry,rot?} in 0–1000. */
const RAW = {
  female_closeup: [
    { id: 'inner_thigh_l', cx: 230, cy: 531, rx: 165, ry: 250 },
    { id: 'inner_thigh_r', cx: 803, cy: 545, rx: 165, ry: 250 },
    { id: 'groin_l', cx: 409, cy: 503, rx: 20, ry: 150, rot: -10 },
    { id: 'groin_r', cx: 627, cy: 504, rx: 20, ry: 150, rot: 13 },
    { id: 'mons_pubis', cx: 522, cy: 321, rx: 120, ry: 96 },
    { id: 'labia_majora_l', cx: 463, cy: 590, rx: 32, ry: 116, rot: -8 },
    { id: 'labia_majora_r', cx: 577, cy: 588, rx: 24, ry: 122, rot: 14 },
    { id: 'labia_minora_l', cx: 499, cy: 598, rx: 14, ry: 97, rot: -7 },
    { id: 'labia_minora_r', cx: 533, cy: 599, rx: 16, ry: 98, rot: 9 },
    { id: 'clitoral_hood', cx: 520, cy: 458, rx: 24, ry: 27 },
    { id: 'clitoral_glans', cx: 519, cy: 497, rx: 12, ry: 17 },
    { id: 'vaginal_introitus', cx: 515, cy: 656, rx: 13, ry: 29 },
    { id: 'perineum', cx: 516, cy: 715, rx: 29, ry: 12 },
    { id: 'anus', cx: 514, cy: 760, rx: 27, ry: 33 },
  ],
  male_closeup: [
    { id: 'inner_thigh_l', cx: 425, cy: 686, rx: 67, ry: 78, rot: -12 },
    { id: 'inner_thigh_r', cx: 611, cy: 695, rx: 57, ry: 70 },
    { id: 'groin_l', cx: 458, cy: 625, rx: 7, ry: 57, rot: -26 },
    { id: 'groin_r', cx: 568, cy: 641, rx: 6, ry: 59, rot: 29 },
    { id: 'pubic_mound', cx: 543, cy: 610, rx: 22, ry: 29, rot: -11 },
    { id: 'shaft', cx: 497, cy: 620, rx: 26, ry: 82, rot: -16 },
    { id: 'corona', cx: 472, cy: 540, rx: 36, ry: 6, rot: 1 },
    { id: 'glans_l', cx: 453, cy: 519, rx: 20, ry: 8, rot: -57 },
    { id: 'glans_r', cx: 480, cy: 521, rx: 26, ry: 14, rot: 43 },
    { id: 'frenulum', cx: 460, cy: 530, rx: 6, ry: 6, rot: -2 },
    { id: 'scrotum_l', cx: 487, cy: 713, rx: 25, ry: 34 },
    { id: 'scrotum_r', cx: 522, cy: 713, rx: 27, ry: 35, rot: 16 },
    { id: 'perineum', cx: 508, cy: 751, rx: 14, ry: 6 },
    { id: 'anus', cx: 520, cy: 762, rx: 16, ry: 6 },
  ],
  female_full: [
    { id: 'mouth_lips', cx: 500, cy: 153, rx: 11, ry: 6 },
    { id: 'ear_l', cx: 458, cy: 118, rx: 7, ry: 13, rot: -17 },
    { id: 'ear_r', cx: 541, cy: 120, rx: 6, ry: 11, rot: 18 },
    { id: 'neck', cx: 499, cy: 193, rx: 24, ry: 35 },
    { id: 'collarbone', cx: 501, cy: 216, rx: 70, ry: 12 },
    { id: 'shoulder_l', cx: 441, cy: 241, rx: 38, ry: 26 },
    { id: 'shoulder_r', cx: 557, cy: 241, rx: 38, ry: 26 },
    { id: 'breast_l', cx: 460, cy: 292, rx: 29, ry: 35, rot: 12 },
    { id: 'breast_r', cx: 539, cy: 291, rx: 28, ry: 38, rot: -18 },
    { id: 'nipple_l', cx: 448, cy: 299, rx: 6, ry: 6 },
    { id: 'nipple_r', cx: 554, cy: 299, rx: 8, ry: 7 },
    { id: 'navel', cx: 502, cy: 427, rx: 64, ry: 73 },
    { id: 'hip_l', cx: 449, cy: 520, rx: 40, ry: 52, rot: -20 },
    { id: 'hip_r', cx: 554, cy: 533, rx: 44, ry: 52, rot: 18 },
    { id: 'vulva', cx: 499, cy: 523, rx: 19, ry: 12 },
    { id: 'inner_thigh_l', cx: 460, cy: 621, rx: 32, ry: 90 },
    { id: 'inner_thigh_r', cx: 542, cy: 627, rx: 32, ry: 90 },
    { id: 'knee_l', cx: 468, cy: 698, rx: 22, ry: 27 },
    { id: 'knee_r', cx: 533, cy: 699, rx: 24, ry: 25 },
    { id: 'calf_l', cx: 463, cy: 815, rx: 28, ry: 70 },
    { id: 'calf_r', cx: 534, cy: 816, rx: 28, ry: 70 },
    { id: 'foot_l', cx: 475, cy: 935, rx: 19, ry: 33 },
    { id: 'foot_r', cx: 527, cy: 931, rx: 20, ry: 32 },
    { id: 'arm_l', cx: 404, cy: 433, rx: 19, ry: 72, rot: 11 },
    { id: 'arm_r', cx: 596, cy: 435, rx: 15, ry: 77, rot: -12 },
    { id: 'hand_l', cx: 388, cy: 541, rx: 16, ry: 29 },
    { id: 'hand_r', cx: 609, cy: 542, rx: 15, ry: 23 },
  ],
  male_full: [
    { id: 'mouth_lips', cx: 523, cy: 124, rx: 13, ry: 6 },
    { id: 'ear_l', cx: 481, cy: 98, rx: 6, ry: 15, rot: -13 },
    { id: 'ear_r', cx: 567, cy: 98, rx: 6, ry: 16, rot: 7 },
    { id: 'neck', cx: 523, cy: 169, rx: 36, ry: 51 },
    { id: 'collarbone', cx: 521, cy: 203, rx: 85, ry: 14 },
    { id: 'shoulder_l', cx: 433, cy: 234, rx: 46, ry: 32 },
    { id: 'shoulder_r', cx: 610, cy: 232, rx: 46, ry: 32 },
    { id: 'pec_l', cx: 473, cy: 271, rx: 52, ry: 42 },
    { id: 'pec_r', cx: 572, cy: 273, rx: 52, ry: 42 },
    { id: 'nipple_l', cx: 459, cy: 296, rx: 9, ry: 6 },
    { id: 'nipple_r', cx: 590, cy: 296, rx: 9, ry: 8 },
    { id: 'abdomen', cx: 524, cy: 415, rx: 76, ry: 88 },
    { id: 'hip_l', cx: 472, cy: 495, rx: 28, ry: 51, rot: -24 },
    { id: 'hip_r', cx: 573, cy: 494, rx: 28, ry: 56, rot: 22 },
    { id: 'genitals', cx: 522, cy: 547, rx: 28, ry: 36 },
    { id: 'inner_thigh_l', cx: 458, cy: 626, rx: 43, ry: 108, rot: 4 },
    { id: 'inner_thigh_r', cx: 574, cy: 609, rx: 37, ry: 96, rot: -12 },
    { id: 'knee_l', cx: 446, cy: 733, rx: 29, ry: 24 },
    { id: 'knee_r', cx: 594, cy: 728, rx: 26, ry: 24 },
    { id: 'calf_l', cx: 438, cy: 844, rx: 32, ry: 76 },
    { id: 'calf_r', cx: 597, cy: 838, rx: 32, ry: 76 },
    { id: 'foot_l', cx: 423, cy: 956, rx: 26, ry: 38, rot: 39 },
    { id: 'foot_r', cx: 614, cy: 956, rx: 26, ry: 34, rot: -37 },
    { id: 'arm_l', cx: 379, cy: 409, rx: 26, ry: 100, rot: 1 },
    { id: 'arm_r', cx: 663, cy: 414, rx: 26, ry: 100 },
    { id: 'hand_l', cx: 390, cy: 544, rx: 26, ry: 40, rot: -13 },
    { id: 'hand_r', cx: 649, cy: 540, rx: 26, ry: 40, rot: 14 },
  ],
}

export const VIEW_META = {
  female_closeup: { sex: 'female', scope: 'closeup' },
  male_closeup: { sex: 'male', scope: 'closeup' },
  female_full: { sex: 'female', scope: 'full' },
  male_full: { sex: 'male', scope: 'full' },
}

/** Precision order: closeups (fine genital detail) before full-body. */
export const VIEW_ORDER = ['female_closeup', 'male_closeup', 'female_full', 'male_full']

/**
 * Merge prototype ellipses into canonical zones per view.
 * @returns {Record<string, Record<string, { cx:number, cy:number, rx:number, ry:number, side:string, parts:number }>>}
 */
function buildCanonGeometry() {
  /** @type {any} */
  const out = {}
  for (const [view, list] of Object.entries(RAW)) {
    /** @type {Record<string, any[]>} */
    const groups = {}
    for (const z of list) {
      const canon = PROTO_CANON[z.id] || z.id
      ;(groups[canon] ||= []).push(z)
    }
    out[view] = {}
    for (const [canon, members] of Object.entries(groups)) {
      const n = members.length
      const cx = members.reduce((s, m) => s + m.cx, 0) / n
      const cy = members.reduce((s, m) => s + m.cy, 0) / n
      const rx = members.reduce((s, m) => s + m.rx, 0) / n
      const ry = members.reduce((s, m) => s + m.ry, 0) / n
      // Per-member centroids are kept so distance to a bilateral zone measures to
      // the NEARER side, not the (midline) average — averaging L+R would wrongly
      // collapse the gap between, say, the inner thighs and a midline zone.
      const pts = members.map((m) => ({ cx: m.cx, cy: m.cy }))
      const sides = new Set(members.map((m) => (m.cx < 480 ? 'L' : m.cx > 520 ? 'R' : 'M')))
      const side = sides.size > 1 ? 'B' : [...sides][0]
      out[view][canon] = { cx, cy, rx, ry, side, parts: n, pts }
    }
  }
  return out
}

export const CANON_GEOMETRY = buildCanonGeometry()

/** @param {string} zoneId @param {string} view */
export function geometryInView(zoneId, view) {
  const g = CANON_GEOMETRY[view]
  if (!g) return null
  return g[zoneId] || g[GEOMETRY_ALIAS[zoneId]] || null
}

/**
 * Nearest-side Euclidean distance (0–1000 px units) within one view: the minimum
 * over each zone's member centroids, so bilateral zones measure to the near side.
 */
export function pixelDistance(a, b, view) {
  const ga = geometryInView(a, view)
  const gb = geometryInView(b, view)
  if (!ga || !gb) return null
  const pa = ga.pts || [{ cx: ga.cx, cy: ga.cy }]
  const pb = gb.pts || [{ cx: gb.cx, cy: gb.cy }]
  let min = Infinity
  for (const x of pa) for (const y of pb) min = Math.min(min, Math.hypot(x.cx - y.cx, x.cy - y.cy))
  return min
}

export { PROTO_CANON, RAW }
