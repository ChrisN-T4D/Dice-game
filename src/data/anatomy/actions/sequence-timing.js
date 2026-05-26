/**
 * Pause / duration between sequence steps for guided audio.
 * Round trip → repeat the out-and-back; one-way → take your time arriving.
 */

/** @param {string} seed */
function hashPick(seed, arr) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return arr[Math.abs(h) % arr.length]
}

const WORDS = {
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
}

/**
 * @typedef {'static' | 'repeat' | 'travel'} StepMotionClass
 */

/**
 * @param {{ cue?: string, technique?: string }} step
 * @returns {StepMotionClass}
 */
export function motionClassForStep(step) {
  const cue = (step.cue || '').toLowerCase()
  const tech = step.technique || ''

  if (
    /\b(hold still|hold steady|press still|keep still|without moving)\b/i.test(cue) ||
    (tech === 'pressure' &&
      !/\b(knead|stroke|circle|along|up|down|work)\b/i.test(cue) &&
      /\b(steady|still)\b/i.test(cue))
  ) {
    return 'static'
  }
  if (/\b(rest warm|sweep outward|sweep|spread)\b/i.test(cue)) {
    return 'repeat'
  }
  if (
    /\b(drag|trace|slide|follow|along|up the|down the|toward|through|kiss (up|down)|stroke.*along|move up|move down)\b/i.test(
      cue
    )
  ) {
    return 'travel'
  }
  return 'repeat'
}

/**
 * Map step beats to a hold duration (seconds) in the 5–10s window.
 * @param {{ beats?: number }} step
 */
export function pauseSecondsForStep(step) {
  const beats = step.beats ?? 10
  const sec = Math.round(5 + ((beats - 6) / 14) * 5)
  return Math.min(10, Math.max(5, sec))
}

/**
 * Spoken line + machine marker for the audio layer.
 * @param {{ beats?: number, cue?: string, technique?: string }} step
 * @param {string} seed
 * @param {{ motion?: StepMotionClass, roundTrip?: boolean, oneWay?: boolean, near?: boolean }} [opts]
 */
export function pauseCueAfterStep(step, seed, opts = {}) {
  const seconds = pauseSecondsForStep(step)

  if (opts.near) {
    const spoken = hashPick(`${seed}|near`, [
      `Keep that touch going for ${WORDS[seconds]} seconds.`,
      `Stay with that same light motion for ${WORDS[seconds]} seconds.`,
    ])
    return { seconds, marker: `[pause:${seconds}s]`, spoken }
  }

  if (opts.roundTrip) {
    const spoken = hashPick(`${seed}|rt`, [
      `Repeat for ${WORDS[seconds]} seconds.`,
      `Repeat that back and forth for ${WORDS[seconds]} seconds.`,
    ])
    return { seconds, marker: `[pause:${seconds}s]`, spoken }
  }

  if (opts.oneWay) {
    const spoken = hashPick(`${seed}|ow`, [
      `Work your way there and take your time getting there for ${WORDS[seconds]} seconds.`,
      `Take your time working your way there for ${WORDS[seconds]} seconds.`,
    ])
    return { seconds, marker: `[pause:${seconds}s]`, spoken }
  }

  const motion = opts.motion ?? motionClassForStep(step)
  const pools = {
    static: [
      `Hold still there for ${WORDS[seconds]} seconds.`,
      `Stay in that spot without moving for ${WORDS[seconds]} seconds.`,
    ],
    repeat: [
      `Keep that motion going for ${WORDS[seconds]} seconds.`,
      `Repeat it like that for ${WORDS[seconds]} seconds.`,
    ],
    travel: [
      `Work your way there and take your time getting there for ${WORDS[seconds]} seconds.`,
      `Take your time working your way there for ${WORDS[seconds]} seconds.`,
    ],
  }

  const spoken = hashPick(`${seed}|${motion}`, pools[motion] || pools.travel)
  return {
    seconds,
    marker: `[pause:${seconds}s]`,
    spoken,
  }
}
