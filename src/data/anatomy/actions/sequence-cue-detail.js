/**
 * Clarify sequence step cues: which body part (stimulator) and how the motion works.
 */

/** @typedef {import('./_makeSequenceAction.js').SequenceStep} SequenceStep */

const STIMULATOR_PHRASE = {
  finger: 'with one or two fingers',
  fingertip: 'with a fingertip',
  palm: 'with your palm',
  thumb: 'with your thumb',
  tongue: 'with your tongue',
  lip: 'with your lips',
  hand: 'with your hand',
  knuckle: 'with your knuckles',
}

const ACTOR_IN_CUE =
  /\b(fingers?|fingertips?|palms?|tongues?|thumbs?|lips?|hands?|mouth|knuckles?|teeth)\b/i

const MOTION_VERBS =
  /^(stroke|press|circle|trace|tap|kiss|slide|curl|drag|knead|hold|make|part|cup|wrap|squeeze|roll|twist|flick|flutter|spiral|widen|narrow|shift|focus|tease|draw|glide|rest|give|spread|angle|suck|orbit|chop)\b/i

/**
 * @param {string} cue
 * @param {SequenceStep} step
 */
export function clarifySequenceCue(cue, step) {
  let c = cue.replace(/\s+/g, ' ').trim().replace(/\.$/, '')
  if (!c) return c

  c = expandVagueMotion(c, step)
  c = ensureStimulatorInCue(c, step)
  c = stripRedundantZoneWords(c, step.zone_id)
  return c.replace(/\s+/g, ' ').trim()
}

/**
 * @param {string} cue
 * @param {SequenceStep} step
 */
function expandVagueMotion(cue, step) {
  const stim = stimPhrase(step)
  let c = cue

  if (/^stroke\s+(slowly\s+)?in and out\b/i.test(c)) {
    return `slide ${stim} in and out, one to two knuckles deep`
  }
  if (/^stroke\s+in and out\b/i.test(c)) {
    return `slide ${stim} in and out, one to two knuckles deep`
  }
  if (/^stroke\s+externally\b/i.test(c)) {
    return `stroke ${stim} along the outside, without penetrating`
  }
  if (/^stroke\s*$/i.test(c) || /^stroke\s+(up|down|apart|broader|lighter)\b/i.test(c)) {
    return `stroke ${stim} in slow, even passes`
  }
  if (/^circle\s+at\b/i.test(c)) {
    return `make small circles ${stim} at the entrance`
  }
  if (/^circle\s*$/i.test(c) || /^circle\s+to\b/i.test(c)) {
    return `make small circles ${stim}`
  }
  if (/^press\s+the\s+tongue\b/i.test(c)) return c
  if (/^press\s+(along|at|upward|still)\b/i.test(c) && !ACTOR_IN_CUE.test(c)) {
    return c.replace(/^press\b/i, `press ${stim}`)
  }
  if (/^angle\s+to\s+press\b/i.test(c)) {
    return `angle ${stim} upward to press the wall`
  }
  if (/^wrap\s+to\s+stroke\b/i.test(c)) {
    return `wrap ${stim} around the waist and stroke`
  }
  if (/^slide\s+up\s+to\s+stroke\b/i.test(c)) {
    return `slide ${stim} up to stroke`
  }

  return c
}

/**
 * @param {string} cue
 * @param {SequenceStep} step
 */
function ensureStimulatorInCue(cue, step) {
  if (ACTOR_IN_CUE.test(cue)) return cue
  if (/\bwith (one or two )?fingers?|with (your |a )?(palm|thumb|tongue|hand|knuckle|lip|lips)\b/i.test(cue)) {
    return cue
  }
  const stim = stimPhrase(step)
  if (/^make\s+/i.test(cue)) {
    return `${cue} ${stim}`
  }
  const m = cue.match(MOTION_VERBS)
  if (m) {
    const verb = m[1]
    const rest = cue.slice(verb.length).trim()
    return `${verb} ${stim}${rest ? ` ${rest}` : ''}`
  }
  if (step.modality === 'mouth') return `${cue} with your mouth`
  return `${cue} ${stim}`
}

/** @param {SequenceStep} step */
function stimPhrase(step) {
  const key = step.stimulator || 'finger'
  if (STIMULATOR_PHRASE[key]) return STIMULATOR_PHRASE[key]
  if (key === 'tongue' || step.modality === 'mouth') return 'with your tongue'
  return `with your ${key}`
}

/**
 * Drop cue words that repeat the zone label already spoken in the sentence.
 * @param {string} cue
 * @param {string} zoneId
 */
function stripRedundantZoneWords(cue, zoneId) {
  let c = cue
  const redundant = {
    vaginal_posterior_wall: /\b(the\s+)?back\s+wall\b/gi,
    vaginal_anterior_wall: /\b(the\s+)?front\s+wall\b/gi,
    vaginal_lateral_wall: /\b(one\s+)?side\s+wall\b/gi,
    vaginal_introitus: /\b(the\s+)?opening\b/gi,
    clitoral_glans: /\b(?:on|at|toward|to)\s+(?:the\s+)?tip\b/gi,
    clitoral_hood: /\b(?:on|along|over)\s+(?:the\s+)?hood(?:\s+fold)?\b/gi,
    penis_glans: /\b(the\s+)?head\b/gi,
  }
  const re = redundant[zoneId]
  if (re) c = c.replace(re, '').replace(/\s+/g, ' ').trim()
  c = c.replace(/\s+(?:toward|to|at|on|along|through|into)\s*$/i, '')
  c = c.replace(/\s+with\s*$/i, '')
  if (zoneId === 'cervix') {
    c = c.replace(/\b(?:the\s+)?deep\s+dome\b/gi, '').trim()
  }
  return c.replace(/\s+/g, ' ').trim()
}
