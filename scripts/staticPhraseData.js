/**
 * Static phrase groups for WAV generation — re-exported from src/data/prompts/guided/session-static.js.
 */
import { STATIC_GROUPS } from '../src/data/prompts/guided/session-static.js'

export { STATIC_GROUPS }

export const VOICE_TEST = STATIC_GROUPS.voice_test
export const INTRO_NO_CLOTHING = STATIC_GROUPS.intro_no_clothing
export const INTRO_WITH_CLOTHING = STATIC_GROUPS.intro_with_clothing
export const HOME_TRANSITION_PHRASES = STATIC_GROUPS.home_transition
export const TURN_BEGINS_PHRASES = STATIC_GROUPS.turn_start_directive
export const TURN_START_DIRECTIVE_PHRASES = STATIC_GROUPS.turn_start_directive
export const TURN_START_DIRECTIVE_WAV_PHRASES = STATIC_GROUPS.turn_start_directive
export const EASE_IN_PHRASES = STATIC_GROUPS.ease_in
export const SESSION_COMPLETE_PHRASES = STATIC_GROUPS.session_complete
export const SETTLE_INTO_POSITION = STATIC_GROUPS.settle_into_position
export const PHASE_CHECKIN_PHRASES = STATIC_GROUPS.phase_checkin

/** @deprecated Legacy switch cues; WAV files may still exist */
export { NEXT_TURN_PHRASES } from '../src/data/prompts/guided/session-static.js'
