/**
 * Static phrase groups for WAV generation scripts. Single source of truth for phrase id + text.
 * Kept in sync with src/data/staticPhrases.js and guided/sessionPlanBuilder phrase sets.
 */

// --- Voice test (1) ---
export const VOICE_TEST = [
  { id: 'voice_test', text: 'This is a quick voice test.' },
]

// --- Intro no clothing: 3 openings × 3 closings = 9 ---
const INTRO_OPENINGS = [
  'This is guided mode. You will hear a prompt for each turn. If a prompt does not work for you, substitute something you both like. ',
  'This is guided mode. You will get a prompt each turn. Feel free to swap in something you both prefer. ',
  'This is guided mode. Each turn has a prompt. If you would rather do something else, substitute anything you both like. ',
]
const INTRO_CLOSINGS = [
  'After each turn you will hear when to switch, then settle into position, then the next prompt. Let us begin.',
  'Between turns you will hear when to switch, then time to settle into position, then the next prompt. Let us begin.',
  'Each turn ends with a switch, then settle into position, then the next prompt. Let us begin.',
]
export const INTRO_NO_CLOTHING = (() => {
  const out = []
  let i = 0
  for (const open of INTRO_OPENINGS) {
    for (const close of INTRO_CLOSINGS) {
      out.push({ id: `intro_no_clothing_${++i}`, text: open + close })
    }
  }
  return out
})()

// --- Intro with clothing: 3 openings × 3 clothing × 3 closings = 9 ---
const INTRO_CLOTHING_LINES = [
  'During the session you will hear when to remove an item of clothing and how to do it. ',
  'You will hear when to remove clothing and how. ',
  'Clothing removal prompts will tell you when and how. ',
]
export const INTRO_WITH_CLOTHING = (() => {
  const out = []
  let i = 0
  for (const open of INTRO_OPENINGS) {
    for (const clothing of INTRO_CLOTHING_LINES) {
      for (const close of INTRO_CLOSINGS) {
        out.push({ id: `intro_with_clothing_${++i}`, text: open + clothing + close })
      }
    }
  }
  return out
})()

// --- Turn switch (4) ---
export const NEXT_TURN_PHRASES = [
  { id: 'next_turn_1', text: 'That finishes that turn. Time to switch.' },
  { id: 'next_turn_2', text: "That's the end of that turn. Time to switch." },
  { id: 'next_turn_3', text: 'This turn is over. Time to switch.' },
  { id: 'next_turn_4', text: "Switch when you're ready." },
]

// --- Turn begins (4) ---
export const TURN_BEGINS_PHRASES = [
  { id: 'turn_begins_1', text: 'Turn begins.' },
  { id: 'turn_begins_2', text: 'Go.' },
  { id: 'turn_begins_3', text: "Whenever you're ready." },
  { id: 'turn_begins_4', text: 'Begin.' },
]

// --- Ease in (4) ---
export const EASE_IN_PHRASES = [
  { id: 'ease_in_1', text: 'Take the next few seconds to settle into position. No rush.' },
  { id: 'ease_in_2', text: "Settle into position when you're ready. No rush." },
  { id: 'ease_in_3', text: 'Use the next few seconds to get comfortable. No rush.' },
  { id: 'ease_in_4', text: "Whenever you're ready. No rush." },
]

// --- Session complete (3) ---
export const SESSION_COMPLETE_PHRASES = [
  {
    id: 'session_complete_1',
    text: "This is the end of the guided instructions. Check in with each other and see if you're done or want to continue. You can save this session as a favorite, continue with the dice game, start another session, or continue on your own without the app.",
  },
  {
    id: 'session_complete_2',
    text: "The guided instructions are complete. Take a moment to check in with each other. You can save this session as a favorite, play the dice game, start a new session, or put the app aside and follow wherever you're drawn.",
  },
  {
    id: 'session_complete_3',
    text: "That's the end of the guided session. Check in with each other and decide whether you're done or want to continue. You can save this session as a favorite, continue by playing the dice game, start another session, or leave the app here and see where the moment takes you.",
  },
]

// --- Settle into position (1) ---
export const SETTLE_INTO_POSITION = [
  { id: 'settle_into_position_1', text: 'Settle into position.' },
]

// --- Phase check-in: 3 phases × 3 variants = 9 ---
export const PHASE_CHECKIN_PHRASES = (() => {
  const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' }
  const variants = (phaseNum, nextLabel) => [
    `${phaseNames[phaseNum]} has ended. Check in with each other. When you're both ready, tap the button to ${nextLabel}.`,
    `That's the end of ${phaseNames[phaseNum]}. Check in with each other, then tap to ${nextLabel}.`,
    `${phaseNames[phaseNum]} is complete. Check in, then tap the button to ${nextLabel}.`,
  ]
  const out = []
  let i = 0
  for (const p of [1, 2, 3]) {
    const nextLabel = p < 3 ? `Continue to ${phaseNames[p + 1]}` : 'end the session'
    for (const text of variants(p, nextLabel)) {
      out.push({ id: `phase_checkin_${++i}`, text })
    }
  }
  return out
})()

/** All groups keyed by name for script selection. */
export const STATIC_GROUPS = {
  voice_test: VOICE_TEST,
  intro_no_clothing: INTRO_NO_CLOTHING,
  intro_with_clothing: INTRO_WITH_CLOTHING,
  next_turn: NEXT_TURN_PHRASES,
  turn_begins: TURN_BEGINS_PHRASES,
  ease_in: EASE_IN_PHRASES,
  session_complete: SESSION_COMPLETE_PHRASES,
  settle_into_position: SETTLE_INTO_POSITION,
  phase_checkin: PHASE_CHECKIN_PHRASES,
}
