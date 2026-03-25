/**
 * Body-area roll exclusions for guided Phases 1–2 (location + Phase 1 actions) and Phase 3 vibrator modifiers.
 * Ported from legacy/state.js — same category → d20 index maps and OR rule across touching/touched prefs.
 */

export const EXCLUDE_BODY_KEYS = ['feet', 'licking', 'nipples', 'genitals', 'buttocks', 'perineum']

const DEFAULT_EXCLUDE = { feet: false, licking: false, nipples: false, genitals: false, buttocks: false, perineum: false }

/** Merge partial exclude prefs with defaults (all false). */
export function mergeExcludePrefs(obj) {
  return obj && typeof obj === 'object' ? { ...DEFAULT_EXCLUDE, ...obj } : { ...DEFAULT_EXCLUDE }
}

/** Max reroll attempts to avoid infinite loops if preferences exclude everything (degenerate). */
export const MAX_REROLL_ATTEMPTS = 50

/** Location rolls that fall into each body-part category (phase -> category -> roll numbers). */
export const LOCATION_CATEGORIES = {
  1: {
    feet: [17, 18],
    licking: [],
    nipples: [6, 7],
    genitals: [19],
    buttocks: [14],
    perineum: [15],
  },
  2: {
    feet: [],
    licking: [1],
    nipples: [6, 7, 8],
    genitals: [16, 17, 18],
    buttocks: [13],
    perineum: [15],
  },
  3: {},
}

/** Phase 1 action rolls for feet / licking only (other categories use location table). */
export const ACTION_CATEGORIES_P1 = {
  feet: [17, 18, 19],
  licking: [13],
  nipples: [],
  genitals: [],
  buttocks: [],
  perineum: [],
}

function isBodyPartExcluded(key, excludeWhenTouching, excludeWhenTouched) {
  const t = excludeWhenTouching && excludeWhenTouching[key] === true
  const u = excludeWhenTouched && excludeWhenTouched[key] === true
  return t || u
}

export function shouldRerollLocation(phase, locationRoll, excludeWhenTouching, excludeWhenTouched) {
  const cats = LOCATION_CATEGORIES[phase]
  if (!cats) return false
  for (const key of EXCLUDE_BODY_KEYS) {
    if (!isBodyPartExcluded(key, excludeWhenTouching, excludeWhenTouched)) continue
    const rolls = cats[key]
    if (rolls && rolls.includes(locationRoll)) return true
  }
  return false
}

export function shouldRerollActionPhase1(actionRoll, excludeWhenTouching, excludeWhenTouched) {
  for (const key of EXCLUDE_BODY_KEYS) {
    if (!isBodyPartExcluded(key, excludeWhenTouching, excludeWhenTouched)) continue
    const rolls = ACTION_CATEGORIES_P1[key]
    if (rolls && rolls.length && rolls.includes(actionRoll)) return true
  }
  return false
}

/** Phase 3 modifier rolls that require a vibrator/toy (17–19). */
export function isPhase3VibratorModifier(roll) {
  return roll === 17 || roll === 18 || roll === 19
}

/**
 * Phase 1/2: sample location + action with body-area rerolls (seeded or Math.random via rng).
 * @param {function} rng - () => number in [0, 1)
 * @returns {{ loc: number, actRoll: number, extendedTime: boolean }}
 */
export function rollPhase12WithExclusions(phase, rng, distributionMode, excludeWhenTouching, excludeWhenTouched) {
  const rollD20 = () => Math.floor(rng() * 20) + 1
  let loc = rollD20()
  let guard = 0
  while (shouldRerollLocation(phase, loc, excludeWhenTouching, excludeWhenTouched) && guard < MAX_REROLL_ATTEMPTS) {
    loc = rollD20()
    guard++
  }
  let actRoll = rollD20()
  let extendedTime = false
  if (actRoll === 20 && distributionMode !== 'quickie') {
    extendedTime = true
    actRoll = Math.floor(rng() * 19) + 1
  }
  if (phase === 1) {
    guard = 0
    while (shouldRerollActionPhase1(actRoll, excludeWhenTouching, excludeWhenTouched) && guard < MAX_REROLL_ATTEMPTS) {
      actRoll = rollD20()
      extendedTime = false
      if (actRoll === 20 && distributionMode !== 'quickie') {
        extendedTime = true
        actRoll = Math.floor(rng() * 19) + 1
      }
      guard++
    }
  }
  return { loc, actRoll, extendedTime }
}

/**
 * Phase 3: modifier d20 with vibrator reroll when toys disabled.
 * @param {function} rng - () => number in [0, 1)
 */
export function rollPhase3ModifierWithVibratorRule(rng, distributionMode, vibratorsPresent) {
  const rollD20 = () => Math.floor(rng() * 20) + 1
  let actRoll = rollD20()
  let extendedTime = false
  if (actRoll === 20 && distributionMode !== 'quickie') {
    extendedTime = true
    actRoll = Math.floor(rng() * 19) + 1
  }
  let guard = 0
  while (!vibratorsPresent && isPhase3VibratorModifier(actRoll) && guard < MAX_REROLL_ATTEMPTS) {
    actRoll = rollD20()
    extendedTime = false
    if (actRoll === 20 && distributionMode !== 'quickie') {
      extendedTime = true
      actRoll = Math.floor(rng() * 19) + 1
    }
    guard++
  }
  return { actRoll, extendedTime }
}
