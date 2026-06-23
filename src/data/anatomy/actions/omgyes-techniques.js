/**
 * OMGYES technique catalog → tagged anatomy actions.
 *
 * This bridges the research-derived technique library
 * (src/data/techniques/<sex>/entries/*.json) into first-class, machine-usable
 * actions. Each entry is wired with the same validated shape as every other
 * action (via makeAction) and carries OMGYES provenance in meta:
 *   { omgyes_family, technique_id, receiver_anatomy, category }
 *
 * These are intentionally kept OUT of the strict per-zone baseline set
 * (zoneActions) so the 6–10-per-zone count audit is unaffected. They are a
 * richer, named layer queried by family / technique_id / zone.
 *
 * Female entries mirror the published female library. Male entries are the
 * anatomically-mapped variants (homologues: glans↔clit, foreskin↔hood,
 * frenulum = the male "extra where it matters", prostate = the Deep End,
 * perineum shared).
 *
 * Instruction style: a single plain imperative describing the motion. No
 * decorative/evocative trailing clauses.
 */
import { makeAction } from './_makeAction.js'

const CONTACT = {
  point: { footprint: 'point', coverage: 'partial' },
  patch: { footprint: 'patch', coverage: 'partial' },
  linear: { footprint: 'linear', coverage: 'partial' },
  broad: { footprint: 'patch', coverage: 'full' },
}

function stim(pressure, tempo, friction = 'medium') {
  return {
    pressure: { level: pressure },
    tempo: { level: tempo },
    friction: { level: friction },
  }
}

/**
 * Compact technique definitions. `source` is the technique_id of the JSON
 * library entry this action is drawn from (female: existing; male: authored
 * variant). `family` is the OMGYES family for grouping/filtering.
 */
const DEFS = [
  /* ───────────────────────── FEMALE (wired from library) ───────────────── */
  {
    id: 'ORBITING_GLIDING',
    family: 'orbiting',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'circle',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.point,
    ew: 92,
    instruction: 'Circle one slick fingertip over the hood so the skin barely moves.',
  },
  {
    id: 'ORBITING_FIRM_MASSAGE',
    family: 'orbiting',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'circle',
    stimulator: 'finger',
    pressure: 'high',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 90,
    instruction: 'Press in and circle with firm, skin-moving pressure over the clit.',
  },
  {
    id: 'SHALLOWING_RUBBING_UP_DOWN',
    family: 'shallowing',
    receiver: 'female',
    zone: 'vaginal_introitus',
    also: ['clitoral_glans'],
    technique: 'stroke',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.linear,
    ew: 85,
    instruction:
      'Glide up and down from the perineum to the clit, dipping just inside the opening on each pass.',
  },
  {
    id: 'RHYTHM_CONSTANT_PULSATING',
    family: 'rhythm',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'tap',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'high',
    contact: CONTACT.point,
    ew: 92,
    instruction: 'Flutter the fingertip in rapid micro-shakes on the hood.',
  },
  {
    id: 'HINTING_THE_OPENING',
    family: 'hinting',
    receiver: 'female',
    zone: 'vaginal_introitus',
    also: ['clitoral_glans'],
    technique: 'stroke',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.linear,
    ew: 84,
    instruction: 'Circle the rim of the opening and almost dip in, then glide back up to the clit.',
  },
  {
    id: 'ACCENTING_EXTRA_WHERE_IT_MATTERS',
    family: 'accenting',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'circle',
    stimulator: 'fingertip',
    pressure: 'medium',
    tempo: 'low',
    contact: CONTACT.point,
    ew: 92,
    instruction:
      'Run your usual circle, then press a little harder each time you cross her offset hotspot.',
  },
  {
    id: 'WRAPPING_VIBRATION_THROUGH_FABRIC',
    family: 'wrapping',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'tap',
    stimulator: 'palm',
    pressure: 'low',
    tempo: 'high',
    contact: CONTACT.patch,
    ew: 88,
    instruction:
      'Press a vibrator through a thin layer of fabric over the clit, shifting the fabric taut or loose to reshape the buzz.',
  },
  {
    id: 'DEEP_END_PRESSING_THE_RIM',
    family: 'deep_end',
    receiver: 'female',
    zone: 'cervix',
    technique: 'pressure',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 60,
    instruction:
      'With a controlled grip, press gently against the rim around the cervix without bumping the cervix itself.',
  },
  {
    id: 'EDGING_PAUSE',
    family: 'edging',
    receiver: 'female',
    category: 'pacing',
    zone: 'clitoral_glans',
    technique: 'stroke',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'medium',
    contact: CONTACT.point,
    ew: 92,
    instruction:
      'Build to just before the edge, stop all touch and let the urge fade, then restart from a slow warmup and build again.',
  },
  {
    id: 'STAGING_BUILD_UP',
    family: 'staging',
    receiver: 'female',
    category: 'pacing',
    zone: 'clitoral_glans',
    technique: 'stroke',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.point,
    ew: 90,
    instruction:
      'Build in stages: warm up wide and indirect, then narrow to the clit only as arousal rises.',
  },
  {
    id: 'SURPRISE_SET',
    family: 'surprise',
    receiver: 'female',
    category: 'pacing',
    zone: 'clitoral_glans',
    technique: 'circle',
    stimulator: 'fingertip',
    pressure: 'medium',
    tempo: 'medium',
    contact: CONTACT.point,
    ew: 90,
    instruction:
      'Hold a steady circle, then drop in one planned change of place or speed before returning to the rhythm.',
  },

  {
    id: 'ORBITING_MOVING_SKIN',
    family: 'orbiting',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'circle',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 90,
    instruction:
      'Move the hood itself over the clit in slow circles, dragging the skin across what lies underneath.',
  },
  {
    id: 'SHALLOWING_FLUTTERING',
    family: 'shallowing',
    receiver: 'female',
    zone: 'vaginal_introitus',
    technique: 'tap',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'high',
    contact: CONTACT.point,
    ew: 84,
    instruction:
      'Flutter just inside the entrance in quick, shallow dips, never sinking past the first knuckle.',
  },
  {
    id: 'SHALLOWING_CURLING',
    family: 'shallowing',
    receiver: 'female',
    zone: 'vaginal_introitus',
    technique: 'stroke',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.linear,
    ew: 84,
    instruction: 'Curl a fingertip just inside the rim and hook forward in small repeating tugs.',
  },
  {
    id: 'RHYTHM_RAINDROPS',
    family: 'rhythm',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'tap',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'medium',
    contact: CONTACT.point,
    ew: 90,
    instruction: 'Tap in soft, scattered drops across the hood.',
  },
  {
    id: 'RHYTHM_PATTERNED_PLEASURE',
    family: 'rhythm',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'circle',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'medium',
    contact: CONTACT.point,
    ew: 90,
    instruction: 'Loop a short set pattern — three slow, one quick — and repeat it.',
  },
  {
    id: 'RHYTHM_BACK_TO_BACK',
    family: 'rhythm',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'stroke',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'medium',
    contact: CONTACT.linear,
    ew: 90,
    instruction: 'Stack strokes back to back with no pause between them.',
  },
  {
    id: 'WRAPPING_SEAM_OR_KNOT',
    family: 'wrapping',
    receiver: 'female',
    zone: 'clitoral_glans',
    technique: 'tap',
    stimulator: 'palm',
    pressure: 'low',
    tempo: 'high',
    contact: CONTACT.point,
    ew: 88,
    instruction: 'Press a vibrator through a seam or knot in the fabric to focus the buzz on one point.',
  },
  {
    id: 'MULTIPLES_SECOND_ORGASM',
    family: 'multiples',
    receiver: 'female',
    category: 'pacing',
    zone: 'clitoral_glans',
    technique: 'circle',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.point,
    ew: 90,
    instruction: 'Keep the lightest contact going straight through the first peak to coax a second wave.',
  },
  {
    id: 'SQUIRTING_WET_RELEASE',
    family: 'squirting',
    receiver: 'female',
    zone: 'vaginal_anterior_wall',
    technique: 'pressure',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'medium',
    contact: CONTACT.patch,
    ew: 80,
    instruction:
      'Stroke firm come-hither over the front wall, then bear down and let go as the pressure builds.',
  },
  {
    id: 'DEEP_END_TAKING_THE_PULSE',
    family: 'deep_end',
    receiver: 'female',
    zone: 'cervix',
    technique: 'pressure',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 60,
    instruction: 'Settle deep against the back wall, find the pulse, and ease in and out in time with it.',
  },

  /* ───────────────────────── MALE (authored variants) ──────────────────── */
  {
    id: 'ORBITING_GLANS_GLIDING',
    family: 'orbiting',
    receiver: 'male',
    zone: 'penis_glans',
    technique: 'circle',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.point,
    ew: 90,
    source: 'ORBITING_GLANS_GLIDING',
    instruction: 'Circle a slick fingertip around the glans and corona rim so the skin barely drags.',
  },
  {
    id: 'ORBITING_GLANS_FIRM',
    family: 'orbiting',
    receiver: 'male',
    zone: 'penis_glans',
    technique: 'circle',
    stimulator: 'finger',
    pressure: 'high',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 88,
    source: 'ORBITING_GLANS_FIRM_MASSAGE',
    instruction: 'Press in and circle the corona ridge with firm, skin-moving pressure.',
  },
  {
    id: 'SHALLOWING_FORESKIN_GLIDE',
    family: 'shallowing',
    receiver: 'male',
    zone: 'foreskin',
    also: ['penis_glans'],
    technique: 'stroke',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.linear,
    ew: 85,
    source: 'SHALLOWING_FORESKIN_GLIDE',
    instruction:
      'Glide the foreskin or a slick grip up and down over the glans, covering and uncovering the head on each pass.',
  },
  {
    id: 'RHYTHM_FRENULUM_FLUTTER',
    family: 'rhythm',
    receiver: 'male',
    zone: 'frenulum',
    technique: 'tap',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'high',
    contact: CONTACT.point,
    ew: 92,
    source: 'RHYTHM_FRENULUM_FLUTTER',
    instruction: 'Flutter the fingertip rapidly on the frenulum.',
  },
  {
    id: 'RHYTHM_GLANS_SKIPPING',
    family: 'rhythm',
    receiver: 'male',
    zone: 'penis_glans',
    technique: 'tap',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'medium',
    contact: CONTACT.point,
    ew: 88,
    source: 'RHYTHM_GLANS_SKIPPING',
    instruction: 'Tap the glans in a steady beat, now and then skipping a beat.',
  },
  {
    id: 'HINTING_THE_FRENULUM',
    family: 'hinting',
    receiver: 'male',
    zone: 'frenulum',
    technique: 'stroke',
    stimulator: 'fingertip',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.linear,
    ew: 90,
    source: 'HINTING_THE_FRENULUM',
    instruction:
      'Trace toward the frenulum and almost settle, then glide away before finally giving it full contact.',
  },
  {
    id: 'HINTING_THE_PERINEUM',
    family: 'hinting',
    receiver: 'male',
    zone: 'perineum',
    technique: 'pressure',
    stimulator: 'finger',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 72,
    source: 'HINTING_THE_PERINEUM',
    instruction:
      'Press in along the perineum and ease off just before the deepest spot, approaching and retreating.',
  },
  {
    id: 'ACCENTING_THE_FRENULUM',
    family: 'accenting',
    receiver: 'male',
    zone: 'frenulum',
    also: ['penis_shaft'],
    technique: 'circle',
    stimulator: 'fingertip',
    pressure: 'medium',
    tempo: 'low',
    contact: CONTACT.point,
    ew: 92,
    source: 'ACCENTING_THE_FRENULUM',
    instruction:
      'Run your usual stroke along the shaft, then add a firmer accent right at the frenulum on each pass.',
  },
  {
    id: 'WRAPPING_SHAFT_THROUGH_FABRIC',
    family: 'wrapping',
    receiver: 'male',
    zone: 'penis_shaft',
    also: ['penis_glans'],
    technique: 'stroke',
    stimulator: 'palm',
    pressure: 'low',
    tempo: 'medium',
    contact: CONTACT.broad,
    ew: 80,
    source: 'WRAPPING_SHAFT_THROUGH_FABRIC',
    instruction:
      'Wrap the shaft in soft fabric and stroke through it, or press a vibrator against the layer.',
  },
  {
    id: 'DEEP_END_PROSTATE_RIM',
    family: 'deep_end',
    receiver: 'male',
    zone: 'prostate',
    technique: 'pressure',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 82,
    source: 'DEEP_END_PROSTATE_RIM',
    instruction:
      'With a controlled grip, press a slow come-hither against the prostate, firm but never jabbing.',
  },
  {
    id: 'EDGING_PAUSE_PENIS',
    family: 'edging',
    receiver: 'male',
    category: 'pacing',
    zone: 'penis_shaft',
    also: ['penis_glans'],
    technique: 'stroke',
    stimulator: 'palm',
    pressure: 'low',
    tempo: 'medium',
    contact: CONTACT.broad,
    ew: 82,
    source: 'EDGING_PAUSE_PENIS',
    instruction:
      'Stroke to just before the edge, stop completely and let the urge fade, then restart from a slow warmup and build again.',
  },
  {
    id: 'STAGING_BUILD_UP_PENIS',
    family: 'staging',
    receiver: 'male',
    category: 'pacing',
    zone: 'penis_shaft',
    also: ['penis_glans', 'frenulum'],
    technique: 'stroke',
    stimulator: 'palm',
    pressure: 'low',
    tempo: 'low',
    contact: CONTACT.broad,
    ew: 82,
    source: 'STAGING_BUILD_UP_PENIS',
    instruction:
      'Build in stages: start with broad, slow shaft strokes, then add the glans and frenulum as arousal climbs.',
  },
  {
    id: 'SURPRISE_SET_PENIS',
    family: 'surprise',
    receiver: 'male',
    category: 'pacing',
    zone: 'penis_shaft',
    also: ['frenulum'],
    technique: 'stroke',
    stimulator: 'palm',
    pressure: 'medium',
    tempo: 'medium',
    contact: CONTACT.broad,
    ew: 82,
    source: 'SURPRISE_SET_PENIS',
    instruction:
      'Hold a steady stroke, then drop in one planned surprise — a change of grip, a quicker pace, or a flick at the frenulum — before returning to the rhythm.',
  },
  {
    id: 'MULTIPLES_PROSTATE_PATH',
    family: 'multiples',
    receiver: 'male',
    category: 'pacing',
    zone: 'prostate',
    also: ['penis_glans'],
    technique: 'pressure',
    stimulator: 'finger',
    pressure: 'medium',
    tempo: 'low',
    contact: CONTACT.patch,
    ew: 82,
    source: 'MULTIPLES_PROSTATE_PATH',
    instruction:
      'Pair slow come-hither prostate pressure with gentle glans strokes, easing off at each peak to ride wave after wave.',
  },
]

export const omgyesTechniqueActions = DEFS.map((d, i) =>
  makeAction({
    zone_id: d.zone,
    instruction: d.instruction,
    technique: d.technique,
    stimulator: d.stimulator,
    modality: d.modality || 'hand',
    stimulation: stim(d.pressure, d.tempo, d.friction),
    contact: d.contact,
    also_stimulates: d.also || [],
    erogenous_weight: d.ew ?? 80,
    sort_order: 1000 + i,
    display_name: `${d.id} on ${d.zone}`,
    meta: {
      action_kind: 'technique',
      omgyes_family: d.family,
      technique_id: d.id,
      source_technique_id: d.source || d.id,
      receiver_anatomy: d.receiver,
      category: d.category || 'manual',
    },
  })
)

/** zone_id → technique action[] */
export const omgyesByZone = omgyesTechniqueActions.reduce((acc, a) => {
  ;(acc[a.zone_id] ||= []).push(a)
  return acc
}, {})

/** 'female' | 'male' → technique action[] */
export const omgyesByReceiver = omgyesTechniqueActions.reduce((acc, a) => {
  const r = JSON.parse(a.meta).receiver_anatomy
  ;(acc[r] ||= []).push(a)
  return acc
}, {})

/** omgyes_family → technique action[] */
export const omgyesByFamily = omgyesTechniqueActions.reduce((acc, a) => {
  const f = JSON.parse(a.meta).omgyes_family
  ;(acc[f] ||= []).push(a)
  return acc
}, {})

export default omgyesTechniqueActions
