/**
 * Single source of truth for static phrase text (and later phrase ids for WAV resolution).
 * Used by sessionPlanBuilder, guided store, and static WAV generator.
 */

/** End-of-session script: three variations (check in, then options: save favorite / dice game / new session / continue without app). */
export const SESSION_COMPLETE_PHRASES = [
  "That's the end of the guided instructions. Check in with each other and see if you're done or want to continue. You can save this session as a favorite, play the dice game, start another session, or continue on your own without the app.",
  "That's the end of the guided instructions. Take a moment to check in with each other. You can save this session as a favorite, play the dice game, start a new session, or put the app aside and follow wherever you're drawn.",
  "That's the end of the guided instructions. Check in with each other and decide whether you're done or want to continue. You can save this session as a favorite, play the dice game, start another session, or leave the app here and see where the moment takes you.",
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
  { id: 'voice_test', text: 'This is a quick voice test.' },
  { id: 'session_complete_1', text: SESSION_COMPLETE_PHRASES[0] },
  { id: 'session_complete_2', text: SESSION_COMPLETE_PHRASES[1] },
  { id: 'session_complete_3', text: SESSION_COMPLETE_PHRASES[2] },
]

// --- Intro phrases (match scripts/staticPhraseData.js for static WAV lookup) ---
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
/** Parallel structure: You will hear when [and how] to remove [clothing]. */
export const INTRO_CLOTHING_LINES = [
  'You will hear when to remove an item of clothing and how. ',
  'You will hear when to remove clothing and how. ',
  'You will hear when and how to remove clothing. ',
]

const INTRO_NO_CLOTHING_PHRASES = (() => {
  const out = []
  let i = 0
  for (const open of INTRO_OPENINGS) {
    for (const close of INTRO_CLOSINGS) {
      out.push({ id: `intro_no_clothing_${++i}`, text: open + close })
    }
  }
  return out
})()

const INTRO_WITH_CLOTHING_PHRASES = (() => {
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

/** All intro phrases (id + text) for static WAV resolution. */
const INTRO_STATIC_PHRASES = [...INTRO_NO_CLOTHING_PHRASES, ...INTRO_WITH_CLOTHING_PHRASES]

// --- Next turn, turn begins, ease in (match scripts/staticPhraseData.js) ---
/** Parallel: [That turn is over.] Time to switch. */
const NEXT_TURN_PHRASES = [
  { id: 'next_turn_1', text: 'That turn is over. Time to switch.' },
  { id: 'next_turn_2', text: "That's the end of that turn. Time to switch." },
  { id: 'next_turn_3', text: 'This turn is over. Time to switch.' },
  { id: 'next_turn_4', text: "Switch when you're ready." },
]
/** Short cues to start the turn (gentle, not abrupt). */
const TURN_BEGINS_PHRASES = [
  { id: 'turn_begins_1', text: 'Turn begins.' },
  { id: 'turn_begins_2', text: "Start when you're ready." },
  { id: 'turn_begins_3', text: "Whenever you're ready." },
  { id: 'turn_begins_4', text: "Begin when you're ready." },
]
/** Parallel: [Settle/get comfortable when ready.] No rush. */
const EASE_IN_PHRASES = [
  { id: 'ease_in_1', text: 'Take a few seconds to settle into position. No rush.' },
  { id: 'ease_in_2', text: "Settle into position when you're ready. No rush." },
  { id: 'ease_in_3', text: 'Take a few seconds to get comfortable. No rush.' },
  { id: 'ease_in_4', text: "Whenever you're ready. No rush." },
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

// --- Settle into position (1) ---
const SETTLE_INTO_POSITION_PHRASES = [
  { id: 'settle_into_position_1', text: 'Settle into position.' },
]
export const SETTLE_INTO_POSITION_TEXT = SETTLE_INTO_POSITION_PHRASES[0].text

// --- Phase check-in: 3 phases × 3 variants = 9 (match scripts/staticPhraseData.js) ---
/** Parallel: [Phase N has ended.] Check in with each other. [Then] tap the button to [next]. */
const PHASE_CHECKIN_PHRASES = (() => {
  const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' }
  const variants = (phaseNum, nextLabel) => [
    `${phaseNames[phaseNum]} has ended. Check in with each other. When you're both ready, tap the button to ${nextLabel}.`,
    `${phaseNames[phaseNum]} has ended. Check in with each other, then tap the button to ${nextLabel}.`,
    `${phaseNames[phaseNum]} is complete. Check in with each other, then tap the button to ${nextLabel}.`,
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
  { id: 'voice_test', text: 'This is a quick voice test.' },
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
