/**
 * Single source of truth for static phrase text (and later phrase ids for WAV resolution).
 * Used by sessionPlanBuilder, guided store, and static WAV generator.
 */

/** End-of-session script: three variations (check in, options: save favorite / dice game / new session / continue without app). */
export const SESSION_COMPLETE_PHRASES = [
  "This is the end of the guided instructions. Check in with each other and see if you're done or want to continue. You can save this session as a favorite, continue with the dice game, start another session, or continue on your own without the app.",
  "The guided instructions are complete. Take a moment to check in with each other. You can save this session as a favorite, play the dice game, start a new session, or put the app aside and follow wherever you're drawn.",
  "That's the end of the guided session. Check in with each other and decide whether you're done or want to continue. You can save this session as a favorite, continue by playing the dice game, start another session, or leave the app here and see where the moment takes you.",
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
const INTRO_CLOTHING_LINES = [
  'During the session you will hear when to remove an item of clothing and how to do it. ',
  'You will hear when to remove clothing and how. ',
  'Clothing removal prompts will tell you when and how. ',
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
const NEXT_TURN_PHRASES = [
  { id: 'next_turn_1', text: 'That finishes that turn. Time to switch.' },
  { id: 'next_turn_2', text: "That's the end of that turn. Time to switch." },
  { id: 'next_turn_3', text: 'This turn is over. Time to switch.' },
  { id: 'next_turn_4', text: "Switch when you're ready." },
]
const TURN_BEGINS_PHRASES = [
  { id: 'turn_begins_1', text: 'Turn begins.' },
  { id: 'turn_begins_2', text: 'Go.' },
  { id: 'turn_begins_3', text: "Whenever you're ready." },
  { id: 'turn_begins_4', text: 'Begin.' },
]
const EASE_IN_PHRASES = [
  { id: 'ease_in_1', text: 'Take the next few seconds to settle into position. No rush.' },
  { id: 'ease_in_2', text: "Settle into position when you're ready. No rush." },
  { id: 'ease_in_3', text: 'Use the next few seconds to get comfortable. No rush.' },
  { id: 'ease_in_4', text: "Whenever you're ready. No rush." },
]

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

// --- Phase check-in: 3 phases × 3 variants = 9 (match scripts/staticPhraseData.js) ---
const PHASE_CHECKIN_PHRASES = (() => {
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
