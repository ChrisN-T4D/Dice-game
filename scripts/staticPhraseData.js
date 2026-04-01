/**
 * Static phrase groups for WAV generation scripts. Single source of truth for phrase id + text.
 * Kept in sync with src/data/staticPhrases.js and guided/sessionPlanBuilder phrase sets.
 */
import { SENSATE_STATIC_PHRASES } from '../src/data/sensateStaticPhrases.js'

// --- Voice test (1) ---
export const VOICE_TEST = [
  { id: 'voice_test', text: 'This is a quick voice check.' },
]

// --- Intro no clothing: 9 intentionally distinct variants ---
const INTRO_NO_CLOTHING_VARIANTS = [
  'Welcome to guided mode. You will hear one prompt each turn. If something does not fit, choose another action you both enjoy. We will tell you when to switch, settle in, and begin the next prompt. Let us begin.',
  'This is guided mode. You will hear one prompt per turn. Feel free to substitute anything that feels better for both of you. Between turns, you will hear when to switch, settle into position, and continue. Let us begin.',
  'Guided mode is on. Each turn comes with a single prompt. If you prefer something else, choose another action together. At each transition, you will hear switch, settle in, then the next prompt. Let us begin.',
  "You're in guided mode. We'll give one prompt at a time. If a suggestion does not work, swap in something you both like. After each turn, you'll hear when to switch, settle, and start the next prompt. Let us begin.",
  'This session uses guided mode. You will hear clear prompts for each turn. You can always substitute another action you both prefer. You will also hear cues to switch, settle into position, and continue. Let us begin.',
  "Welcome to this guided session. You'll hear one prompt for every turn. If a prompt is not right today, choose another action you both want. We'll guide each transition: switch, settle in, then the next prompt. Let us begin.",
  'Guided mode will walk you through one prompt at a time. Use any substitute you both enjoy whenever needed. At the end of each turn, you will hear cues to switch, settle into position, and move on. Let us begin.',
  "This is a guided session with one prompt per turn. If you'd rather do something else, use any action you both like. You'll hear transition cues for switching, settling in, and starting the next prompt. Let us begin.",
  'You are in guided mode. We will offer one prompt each turn, and you may substitute freely when needed. Between turns, listen for switch and settle-in cues before the next prompt. Let us begin.',
]

export const INTRO_NO_CLOTHING = (() => {
  return INTRO_NO_CLOTHING_VARIANTS.map((text, i) => ({ id: `intro_no_clothing_${i + 1}`, text }))
})()

// --- Intro with clothing: 9 intentionally distinct variants ---
const INTRO_WITH_CLOTHING_VARIANTS = [
  'Welcome to guided mode. You will hear one prompt each turn. If a prompt does not fit, choose another action you both enjoy. You will hear when and how to remove clothing. After each turn, you will hear when to switch, settle into position, and begin the next prompt. Let us begin.',
  'This is guided mode. You will hear one prompt per turn, and you can substitute anything that feels better for both of you. Clothing-removal guidance is included when needed. Between turns, you will hear when to switch, settle in, and continue. Let us begin.',
  'Guided mode is on. Each turn has one prompt, and you can choose another action together any time. You will also hear when and how to remove clothing. When a turn ends, you will hear switch, settle into position, then the next prompt. Let us begin.',
  "You're in guided mode. We'll give one prompt at a time, and you can swap in something you both like whenever needed. We will cue clothing-removal moments clearly. After each turn, listen for switch, settle, and next-prompt cues. Let us begin.",
  'This session uses guided mode with clear turn-by-turn prompts. You can always choose another action you both prefer. Clothing-removal steps will be announced at the right times. Between turns, you will hear when to switch, settle into position, and move on. Let us begin.',
  "Welcome to this guided session. You'll hear one prompt for every turn. If a prompt is not right today, choose another action you both want. We will guide when and how to remove clothing, then cue each transition to switch, settle, and continue. Let us begin.",
  'Guided mode will walk you through one prompt at a time. Use any substitute you both enjoy whenever needed. You will hear calm cues for clothing removal when it applies. At each transition, we will cue switch, settle in, and the next prompt. Let us begin.',
  "This is a guided session with one prompt per turn. If you'd rather do something else, use any action you both like. We will include clothing-removal guidance as needed. When turns change, you will hear cues to switch, settle into position, and continue. Let us begin.",
  'You are in guided mode. We will offer one prompt each turn, and you may substitute freely when needed. You will also hear clear cues for clothing removal during the flow. Between turns, listen for switch and settle-in cues before the next prompt. Let us begin.',
]

export const INTRO_WITH_CLOTHING = (() => {
  return INTRO_WITH_CLOTHING_VARIANTS.map((text, i) => ({ id: `intro_with_clothing_${i + 1}`, text }))
})()

// --- Turn switch (4) ---
export const NEXT_TURN_PHRASES = [
  { id: 'next_turn_1', text: 'That turn is complete. Time to switch.' },
  { id: 'next_turn_2', text: 'This turn has ended. Go ahead and switch.' },
  { id: 'next_turn_3', text: "Switch roles when you're both ready." },
  { id: 'next_turn_4', text: "Switch when you're ready." },
]

// --- Turn begins (4) ---
export const TURN_BEGINS_PHRASES = [
  { id: 'turn_begins_1', text: "Your turn starts now." },
  { id: 'turn_begins_2', text: "Go ahead when you're ready." },
  { id: 'turn_begins_3', text: "Whenever you're ready, begin." },
  { id: 'turn_begins_4', text: 'You can begin now.' },
]

// --- Ease in (4) ---
export const EASE_IN_PHRASES = [
  { id: 'ease_in_1', text: 'Take a moment to settle into position. No rush.' },
  { id: 'ease_in_2', text: "Get comfortable first, then begin when you're ready." },
  { id: 'ease_in_3', text: 'Settle in at your own pace. No rush.' },
  { id: 'ease_in_4', text: "Whenever you're ready, settle into position." },
]

// --- Session complete (3) ---
export const SESSION_COMPLETE_PHRASES = [
  {
    id: 'session_complete_1',
    text: "You've reached the end of the guided instructions. Check in with each other and decide whether to continue. You can save this session as a favorite, play the dice game, start another session, or continue on your own without the app.",
  },
  {
    id: 'session_complete_2',
    text: "That's the end of the guided instructions. Take a moment to check in together. You can save this session as a favorite, play the dice game, start a new session, or put the app aside and follow what feels right.",
  },
  {
    id: 'session_complete_3',
    text: "Guided instructions are complete. Check in with each other and choose what's next. You can save this session as a favorite, play the dice game, start another session, or leave the app and continue in your own way.",
  },
]

// --- Settle into position (4) ---
export const SETTLE_INTO_POSITION = [
  { id: 'settle_into_position_1', text: 'Settle into position together.' },
  { id: 'settle_into_position_2', text: "Settle into position when you're both ready." },
  { id: 'settle_into_position_3', text: 'Take a moment to settle into position together.' },
  { id: 'settle_into_position_4', text: 'Get into position at a pace that works for both of you.' },
]

// --- Phase check-in: 3 phases × 3 variants = 9 ---
export const PHASE_CHECKIN_PHRASES = (() => {
  const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' }
  const variants = (phaseNum, nextLabel) => [
    `${phaseNames[phaseNum]} is complete. Take a moment to check in together, then tap the button to ${nextLabel} when you're ready.`,
    `${phaseNames[phaseNum]} has ended. Pause and check in with each other. When you're both ready, tap the button to ${nextLabel}.`,
    `${phaseNames[phaseNum]} is done. Check in together, and tap the button when you're ready to ${nextLabel}.`,
  ]
  const out = []
  let i = 0
  for (const p of [1, 2, 3]) {
    const nextLabel = p < 3 ? `continue to ${phaseNames[p + 1]}` : 'end the session'
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
  sensate: SENSATE_STATIC_PHRASES,
}
