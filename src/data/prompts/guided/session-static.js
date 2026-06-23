/**
 * Guided session static phrases: intros, ease-in, session end, phase check-in.
 * Between-segment transitions use home positions (../transitions/home-positions.js).
 */
import { SENSATE_STATIC_PHRASES } from '../sensate/static-phrases.js'
import { HOME_TRANSITION_PHRASES } from '../transitions/home-positions.js'
import { TURN_START_DIRECTIVE_WAV_PHRASES } from './turn-start-directives.js'

export { formatTurnStartDirective, TURN_START_DIRECTIVE_PHRASES, TURN_START_DIRECTIVE_WAV_PHRASES } from './turn-start-directives.js'
export { formatFirstTurnIntro } from './first-turn-intros.js'
export {
  HOME_POSITIONS,
  formatHomeTransition,
  formatHomeOpening,
  getHomePositionById,
  getDefaultHomePosition,
  HOME_TRANSITION_PHRASES,
} from '../transitions/home-positions.js'

/** End-of-session script */
export const SESSION_COMPLETE_PHRASES = [
  "You've reached the end of the guided instructions. Check in with each other and decide whether to continue. You can save this session as a favorite, play the dice game, start another session, or continue on your own without the app.",
  "That's the end of the guided instructions. Take a moment to check in together. You can save this session as a favorite, play the dice game, start a new session, or put the app aside and follow what feels right.",
  "Guided instructions are complete. Check in with each other and choose what's next. You can save this session as a favorite, play the dice game, start another session, or leave the app and continue in your own way.",
]

export const STATIC_PHRASE_IDS = [
  'voice_test',
  'session_complete_1',
  'session_complete_2',
  'session_complete_3',
]

export const DEFAULT_STATIC_VOICE_ID = 'af_nicole'

export const STATIC_PHRASES = [
  { id: 'voice_test', text: 'This is a quick voice check.' },
  { id: 'session_complete_1', text: SESSION_COMPLETE_PHRASES[0] },
  { id: 'session_complete_2', text: SESSION_COMPLETE_PHRASES[1] },
  { id: 'session_complete_3', text: SESSION_COMPLETE_PHRASES[2] },
]

export const INTRO_NO_CLOTHING_VARIANTS = [
  'Welcome to guided mode. You will hear one direction at a time. If something does not fit, choose another action you both enjoy. Between directions you will flow back into your neutral position, then hear what to do next. Let us begin.',
  'This is guided mode. One prompt per direction. Substitute anything that feels better for both of you. Between directions you will flow back into your neutral position, stay connected, then continue. Let us begin.',
  'Guided mode is on. Each direction has a single prompt. You can choose another action together any time. Between directions, flow back into your neutral position, then hear the next instruction. Let us begin.',
  "You're in guided mode. We'll give one direction at a time. If a suggestion does not work, swap in something you both like. After each block, flow back into your neutral position, then move to the next direction. Let us begin.",
  'This session uses guided mode. Clear directions each step. You can always substitute another action you both prefer. Between steps, flow back into your neutral position and stay connected before the next instruction. Let us begin.',
  "Welcome to this guided session. You'll hear one direction for every step. Flow back into your neutral position between steps, then continue when you hear the next prompt. Let us begin.",
  'Guided mode walks you through one direction at a time. Flow back into your neutral position between steps, stay connected, then follow the next line. Let us begin.',
  "This is a guided session with one direction at a time. Between steps you'll flow back into your neutral position, stay connected, then hear what comes next. Let us begin.",
  'You are in guided mode. We offer one direction at a time. Between steps, flow back into your neutral position, then hear the next instruction. Let us begin.',
]

export const INTRO_WITH_CLOTHING_VARIANTS = [
  'Welcome to guided mode. You will hear one direction at a time. Clothing removal is included when needed. Between directions, flow back into your neutral position, stay connected, then hear the next instruction. Let us begin.',
  'This is guided mode with clothing guidance when it applies. Flow back into your neutral position between directions, then continue. Let us begin.',
  'Guided mode is on. You will hear when and how to remove clothing. Between directions, flow back into your neutral position, then the next prompt. Let us begin.',
  "You're in guided mode. Flow back into your neutral position between directions. Clothing steps are announced clearly. Let us begin.",
  'This session uses guided mode. Flow back into your neutral position between directions. Clothing removal is cued at the right times. Let us begin.',
  "Welcome to this guided session. We'll guide clothing removal when needed, then flow back into your neutral position between directions. Let us begin.",
  'Guided mode walks you through each direction. Flow back into your neutral position between steps; clothing cues appear when relevant. Let us begin.',
  "This guided session flows you back into your neutral position between directions. Clothing guidance is included as needed. Let us begin.",
  'You are in guided mode. Flow back into your neutral position between directions. Listen for clothing removal and the next instruction. Let us begin.',
]

const INTRO_NO_CLOTHING_PHRASES = INTRO_NO_CLOTHING_VARIANTS.map((text, i) => ({
  id: `intro_no_clothing_${i + 1}`,
  text,
}))
const INTRO_WITH_CLOTHING_PHRASES = INTRO_WITH_CLOTHING_VARIANTS.map((text, i) => ({
  id: `intro_with_clothing_${i + 1}`,
  text,
}))
const INTRO_STATIC_PHRASES = [...INTRO_NO_CLOTHING_PHRASES, ...INTRO_WITH_CLOTHING_PHRASES]

/** @deprecated Replaced by home transition; kept for WAV lookup of legacy files */
export const NEXT_TURN_PHRASES = [
  { id: 'next_turn_1', text: 'That turn is complete. Time to switch.' },
  { id: 'next_turn_2', text: 'This turn has ended. Go ahead and switch.' },
  { id: 'next_turn_3', text: "Switch roles when you're both ready." },
  { id: 'next_turn_4', text: "Switch when you're ready." },
]
export const NEXT_TURN_TEXTS = NEXT_TURN_PHRASES.map((p) => p.text)

const EASE_IN_PHRASES = [
  { id: 'ease_in_1', text: 'Take a moment to settle into position for the next direction. No rush.' },
  { id: 'ease_in_2', text: 'Get comfortable for what comes next, then follow the on-screen prompt.' },
  { id: 'ease_in_3', text: 'Settle in at your own pace before the next direction.' },
  { id: 'ease_in_4', text: 'Line up your bodies for the next instruction when you are ready.' },
]
export const EASE_IN_TEXTS = EASE_IN_PHRASES.map((p) => p.text)

const SESSION_COMPLETE_STATIC = [
  { id: 'session_complete_1', text: SESSION_COMPLETE_PHRASES[0] },
  { id: 'session_complete_2', text: SESSION_COMPLETE_PHRASES[1] },
  { id: 'session_complete_3', text: SESSION_COMPLETE_PHRASES[2] },
]

const SETTLE_INTO_POSITION_PHRASES = [
  { id: 'settle_into_position_1', text: 'Settle into position together for the next direction.' },
  { id: 'settle_into_position_2', text: "Settle into position when you're both ready for what comes next." },
  { id: 'settle_into_position_3', text: 'Take a moment to settle into position together.' },
  { id: 'settle_into_position_4', text: 'Get into position at a pace that works for both of you.' },
]
export const SETTLE_INTO_POSITION_TEXTS = SETTLE_INTO_POSITION_PHRASES.map((p) => p.text)
export const SETTLE_INTO_POSITION_TEXT = SETTLE_INTO_POSITION_PHRASES[0].text

const PHASE_CHECKIN_PHRASES = (() => {
  // Build-up (former phases 1 & 2) is one continuous section; the only check-in
  // is the hand-off into the positions. Keep the wording as a natural escalation
  // ("keep going / ready for more") rather than announcing a new "Finish" phase.
  const fromLabel = (p) => (p >= 3 ? 'That' : 'Build-up')
  const nextLabel = (p) => (p < 3 ? 'keep going' : 'end the session')
  const variants = (p) => [
    `${fromLabel(p)} is complete. Take a moment to check in together, then tap the button to ${nextLabel(p)} when you're both ready for more.`,
    `${fromLabel(p)} has ended. Pause and check in with each other. When you're both ready for more, tap the button to ${nextLabel(p)}.`,
    `${fromLabel(p)} is done. Check in together, and tap the button when you're both ready to ${nextLabel(p)}.`,
  ]
  const out = []
  let i = 0
  for (const p of [1, 2, 3]) {
    for (const text of variants(p)) {
      out.push({ id: `phase_checkin_${++i}`, text })
    }
  }
  return out
})()

export function getPhaseCheckinTexts(phaseNum) {
  const start = (phaseNum - 1) * 3
  return PHASE_CHECKIN_PHRASES.slice(start, start + 3).map((p) => p.text)
}

/** @deprecated Use formatTurnStartDirective */
export const TURN_BEGINS_PHRASES = TURN_START_DIRECTIVE_WAV_PHRASES
export const TURN_BEGINS_TEXTS = TURN_START_DIRECTIVE_WAV_PHRASES.map((p) => p.text)

const ALL_GUIDED_STATIC_PHRASES = [
  { id: 'voice_test', text: 'This is a quick voice check.' },
  ...INTRO_STATIC_PHRASES,
  ...HOME_TRANSITION_PHRASES,
  ...TURN_START_DIRECTIVE_WAV_PHRASES,
  ...EASE_IN_PHRASES,
  ...SESSION_COMPLETE_STATIC,
  ...SETTLE_INTO_POSITION_PHRASES,
  ...PHASE_CHECKIN_PHRASES,
]

const ALL_STATIC_PHRASES_WITH_SENSATE = [...ALL_GUIDED_STATIC_PHRASES, ...SENSATE_STATIC_PHRASES]

function normalizeForMatch(text) {
  return text && typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
}

export function getStaticPhraseIdForText(text, opts = {}) {
  const normalized = normalizeForMatch(text)
  if (!normalized) return null
  const list = opts.staticPresetKind === 'sensate' ? ALL_STATIC_PHRASES_WITH_SENSATE : ALL_GUIDED_STATIC_PHRASES
  const found = list.find((p) => normalizeForMatch(p.text) === normalized)
  if (found) return found.id
  return null
}

/** Lookup static WAV by phrase id (e.g. turn-start directives with runtime partner names). */
export function getStaticPhraseIdById(phraseId) {
  if (!phraseId || typeof phraseId !== 'string') return null
  const found = ALL_STATIC_PHRASES_WITH_SENSATE.find((p) => p.id === phraseId)
  return found ? found.id : null
}

export function getStaticPhraseIdForIntroText(text) {
  return getStaticPhraseIdForText(text)
}

/** For WAV generator script grouping */
export const STATIC_GROUPS = {
  voice_test: [{ id: 'voice_test', text: 'This is a quick voice check.' }],
  intro_no_clothing: INTRO_NO_CLOTHING_PHRASES,
  intro_with_clothing: INTRO_WITH_CLOTHING_PHRASES,
  home_transition: HOME_TRANSITION_PHRASES,
  turn_start_directive: TURN_START_DIRECTIVE_WAV_PHRASES,
  ease_in: EASE_IN_PHRASES,
  session_complete: SESSION_COMPLETE_STATIC,
  settle_into_position: SETTLE_INTO_POSITION_PHRASES,
  phase_checkin: PHASE_CHECKIN_PHRASES,
  sensate: SENSATE_STATIC_PHRASES,
}
