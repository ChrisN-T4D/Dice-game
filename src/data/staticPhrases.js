/**
 * Single source of truth for static phrase text (and later phrase ids for WAV resolution).
 * Used by sessionPlanBuilder, guided store, and static WAV generator.
 */

/** End-of-session script: three variations (check in, then options: save favorite / dice game / new session / continue without app). */
export const SESSION_COMPLETE_PHRASES = [
  "You've reached the end of the guided instructions. Check in with each other and decide whether to continue. You can save this session as a favorite, play the dice game, start another session, or continue on your own without the app.",
  "That's the end of the guided instructions. Take a moment to check in together. You can save this session as a favorite, play the dice game, start a new session, or put the app aside and follow what feels right.",
  "Guided instructions are complete. Check in with each other and choose what's next. You can save this session as a favorite, play the dice game, start another session, or leave the app and continue in your own way.",
]

/** Phrase ids used for static WAV resolution (getStaticAudioUrl). */
export const STATIC_PHRASE_IDS = [
  'voice_test',
  'session_complete_1',
  'session_complete_2',
  'session_complete_3',
]

/** Default voice we ship static WAVs for (Phase 1). */
export const DEFAULT_STATIC_VOICE_ID = 'af_nicole'

/** Static phrases with id and text for WAV generator and lookup. */
export const STATIC_PHRASES = [
  { id: 'voice_test', text: 'This is a quick voice check.' },
  { id: 'session_complete_1', text: SESSION_COMPLETE_PHRASES[0] },
  { id: 'session_complete_2', text: SESSION_COMPLETE_PHRASES[1] },
  { id: 'session_complete_3', text: SESSION_COMPLETE_PHRASES[2] },
]

// --- Intro phrases (match scripts/staticPhraseData.js for static WAV lookup) ---
/** Intro without clothing: 9 intentionally distinct variants (less repetitive in TTS). */
export const INTRO_NO_CLOTHING_VARIANTS = [
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

/** Parallel structure: guided mode + prompt per turn + substitute if needed. */
export const INTRO_OPENINGS = [
  'This is guided mode. You will hear a prompt for each turn. If a prompt does not work for you, substitute another action you both like. ',
  'This is guided mode. You will hear a prompt for each turn. Feel free to use another action you both prefer instead. ',
  'This is guided mode. You will hear a prompt for each turn. If you would rather do something else, substitute any other action you both like. ',
]
/** Parallel structure: [when] you will hear when to switch, then settle into position, then the next prompt. Let us begin. */
export const INTRO_CLOSINGS = [
  'After each turn you will hear when to switch, then settle into position, then the next prompt. Let us begin.',
  'Between turns you will hear when to switch, then settle into position, then the next prompt. Let us begin.',
  'When each turn ends you will hear when to switch, then settle into position, then the next prompt. Let us begin.',
]
/** Intro with clothing: 9 intentionally distinct variants (less repetitive in TTS). */
export const INTRO_WITH_CLOTHING_VARIANTS = [
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

const INTRO_NO_CLOTHING_PHRASES = (() => {
  return INTRO_NO_CLOTHING_VARIANTS.map((text, i) => ({ id: `intro_no_clothing_${i + 1}`, text }))
})()

const INTRO_WITH_CLOTHING_PHRASES = (() => {
  return INTRO_WITH_CLOTHING_VARIANTS.map((text, i) => ({ id: `intro_with_clothing_${i + 1}`, text }))
})()

/** All intro phrases (id + text) for static WAV resolution. */
const INTRO_STATIC_PHRASES = [...INTRO_NO_CLOTHING_PHRASES, ...INTRO_WITH_CLOTHING_PHRASES]

// --- Next turn, turn begins, ease in (match scripts/staticPhraseData.js) ---
/** Parallel: [That turn is over.] Time to switch. */
const NEXT_TURN_PHRASES = [
  { id: 'next_turn_1', text: 'That turn is complete. Time to switch.' },
  { id: 'next_turn_2', text: 'This turn has ended. Go ahead and switch.' },
  { id: 'next_turn_3', text: "Switch roles when you're both ready." },
  { id: 'next_turn_4', text: "Switch when you're ready." },
]
/** Short cues to start the turn (gentle, not abrupt). */
const TURN_BEGINS_PHRASES = [
  { id: 'turn_begins_1', text: "Your turn starts now." },
  { id: 'turn_begins_2', text: "Go ahead when you're ready." },
  { id: 'turn_begins_3', text: "Whenever you're ready, begin." },
  { id: 'turn_begins_4', text: 'You can begin now.' },
]
/** Settle-in: take this time to get into position before the turn starts. */
const EASE_IN_PHRASES = [
  { id: 'ease_in_1', text: 'Take a moment to settle into position. No rush.' },
  { id: 'ease_in_2', text: "Get comfortable first, then begin when you're ready." },
  { id: 'ease_in_3', text: 'Settle in at your own pace. No rush.' },
  { id: 'ease_in_4', text: "Whenever you're ready, settle into position." },
]

/** String arrays for sessionPlanBuilder and guided store (pick at random). */
export const NEXT_TURN_TEXTS = NEXT_TURN_PHRASES.map((p) => p.text)
export const TURN_BEGINS_TEXTS = TURN_BEGINS_PHRASES.map((p) => p.text)
export const EASE_IN_TEXTS = EASE_IN_PHRASES.map((p) => p.text)

// --- Session complete (3) ---
const SESSION_COMPLETE_STATIC = [
  { id: 'session_complete_1', text: SESSION_COMPLETE_PHRASES[0] },
  { id: 'session_complete_2', text: SESSION_COMPLETE_PHRASES[1] },
  { id: 'session_complete_3', text: SESSION_COMPLETE_PHRASES[2] },
]

// --- Settle into position (4) ---
const SETTLE_INTO_POSITION_PHRASES = [
  { id: 'settle_into_position_1', text: 'Settle into position together.' },
  { id: 'settle_into_position_2', text: "Settle into position when you're both ready." },
  { id: 'settle_into_position_3', text: 'Take a moment to settle into position together.' },
  { id: 'settle_into_position_4', text: 'Get into position at a pace that works for both of you.' },
]
export const SETTLE_INTO_POSITION_TEXTS = SETTLE_INTO_POSITION_PHRASES.map((p) => p.text)
export const SETTLE_INTO_POSITION_TEXT = SETTLE_INTO_POSITION_PHRASES[0].text

// --- Phase check-in: 3 phases × 3 variants = 9 (match scripts/staticPhraseData.js) ---
/** Parallel: [Phase N has ended.] Check in with each other. [Then] tap the button to [next]. */
const PHASE_CHECKIN_PHRASES = (() => {
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

/** Returns the 3 phase-check-in phrase strings for the given phase (1, 2, or 3) for use in guided store. */
export function getPhaseCheckinTexts(phaseNum) {
  const start = (phaseNum - 1) * 3
  return PHASE_CHECKIN_PHRASES.slice(start, start + 3).map((p) => p.text)
}

/** All static phrases (id + text) for cooking: use static WAV when available, else generate. */
const ALL_STATIC_PHRASES = [
  { id: 'voice_test', text: 'This is a quick voice check.' },
  ...INTRO_STATIC_PHRASES,
  ...NEXT_TURN_PHRASES,
  ...TURN_BEGINS_PHRASES,
  ...EASE_IN_PHRASES,
  ...SESSION_COMPLETE_STATIC,
  ...SETTLE_INTO_POSITION_PHRASES,
  ...PHASE_CHECKIN_PHRASES,
]

function normalizeForMatch(text) {
  return text && typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
}

/**
 * If the given text matches any pre-generated static phrase, return its phrase id.
 * Cooking uses this: if found, fetch /audio/static/{voiceId}/{phraseId}.wav; if 404, fall back to TTS.
 */
export function getStaticPhraseIdForText(text) {
  const normalized = normalizeForMatch(text)
  if (!normalized) return null
  const found = ALL_STATIC_PHRASES.find((p) => normalizeForMatch(p.text) === normalized)
  return found ? found.id : null
}

/**
 * @deprecated Use getStaticPhraseIdForText for all phrases (intro and others).
 */
export function getStaticPhraseIdForIntroText(text) {
  return getStaticPhraseIdForText(text)
}
