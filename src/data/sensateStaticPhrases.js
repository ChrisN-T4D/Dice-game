/**
 * Fixed phrase ids + text for sensate guided sessions (static WAV lookup + plan builder).
 * Partner labels use "Partner 1" / "Partner 2" so audio matches app defaults and stays static.
 */

export const SENSATE_FIRST_TURN_TEXT =
  'First turn. Partner 1 is giver, Partner 2 is receiver.'

export const SENSATE_FIRST_TURN_P2_GIVER_TEXT =
  'First turn. Partner 2 is giver, Partner 1 is receiver.'

/** @type {{ id: string, text: string }[]} */
export const SENSATE_STATIC_PHRASES = [
  { id: 'sensate_first_turn_standard', text: SENSATE_FIRST_TURN_TEXT },
  { id: 'sensate_first_turn_p2_giver', text: SENSATE_FIRST_TURN_P2_GIVER_TEXT },
  {
    id: 'sensate_intro_phase1_non_genital',
    text: 'This is a sensate focus style session for education only; it is not medical or therapy advice. Adults in a fully consensual relationship only. Stop if there is discomfort, distress, or any sign of coercion. For personalized care, speak with a qualified professional. Phase one, non-genital mindful touch: you will hear one block at a time. Substitute anything that does not fit. Let us begin.',
  },
  {
    id: 'sensate_intro_phase1_genital',
    text: 'This is a sensate focus style session for education only; it is not medical or therapy advice. Adults in a fully consensual relationship only. Stop if there is pain, distress, or coercion. See a clinician before genital touch if you have untreated pain or new symptoms. Phase one with breasts and genitals included, still non-demand. Let us begin.',
  },
  {
    id: 'sensate_intro_lotion',
    text: 'This is a sensate focus style session for education only; it is not medical or therapy advice. Adults in a consensual relationship only. Patch test lotion and lubricant if you have sensitive skin; warm products before use. Stop if there is irritation or distress. Let us begin.',
  },
  {
    id: 'sensate_intro_mutual',
    text: 'This is a sensate focus style session for education only; it is not medical or therapy advice. Adults in a consensual relationship only. If simultaneous touch feels overwhelming, return to turn-taking. Stop for any distress. Mutual touching segment. Let us begin.',
  },
  {
    id: 'sensate_intro_phase2_comm',
    text: 'This is a sensate focus style session for education only; it is not medical or therapy advice. Adults in a consensual relationship only. Phase two style communication belongs after solid phase one practice; if feedback increases pressure, return to silent sensory focus. Let us begin.',
  },
  // --- Phase 1 non-genital turns ---
  {
    id: 'sensate_p1ng_t1',
    text: 'Set the space: private, phones away, comfortable temperature, some light. Undress to your comfort. Skip music and candles for this practice. Agree you can pause or stop anytime.',
  },
  {
    id: 'sensate_p1ng_t2',
    text: 'Partner 1 touches Partner 2. Use hands and fingers only. Explore from head to toe, front and back. Leave breasts, chest, and genitals untouched. Touch for your own interest in temperature, pressure, and texture—not to produce a response. Partner 2 notices sensations where touched; move Partner 1’s hand only for discomfort.',
  },
  {
    id: 'sensate_p1ng_t3',
    text: 'Partner 1, when you are ready, say switch aloud. Exchange roles calmly.',
  },
  {
    id: 'sensate_p1ng_t3_p2',
    text: 'Partner 2, when you are ready, say switch aloud. Exchange roles calmly.',
  },
  {
    id: 'sensate_p1ng_t4',
    text: 'Partner 2 touches Partner 1 the same way: hands and fingers only, full body except breasts, chest, and genitals. Touch for your own sensory curiosity. Partner 1 notices sensations and guides only for discomfort.',
  },
  {
    id: 'sensate_p1ng_t5',
    text: 'Closing. Dress when you like. Optionally note what you sensed, what distracted you, and how it felt to refocus. This app does not replace a therapist.',
  },
  // --- Phase 1 genital included ---
  {
    id: 'sensate_p1g_t1',
    text: 'Same calm environment as before: private, devices away, comfortable. Undress to comfort. Agree on pausing or stopping anytime.',
  },
  {
    id: 'sensate_p1g_t2',
    text: 'Partner 1 touches Partner 2. Whole body including breasts and genitals, hands and fingers. Do not dwell longer on genitals than on other areas. Touch for your own sense of temperature, pressure, and texture. Partner 2 notices sensations; if arousal appears, simply notice it without chasing or suppressing. Hand-riding is optional for gentle guidance.',
  },
  {
    id: 'sensate_p1g_t3',
    text: 'Partner 1, say switch when ready. Exchange roles.',
  },
  {
    id: 'sensate_p1g_t3_p2',
    text: 'Partner 2, say switch when ready. Exchange roles.',
  },
  {
    id: 'sensate_p1g_t4',
    text: 'Partner 2 touches Partner 1 with the same rules: full body including breasts and genitals, even attention, non-demand curiosity, noticing arousal without goals. Hand-riding optional.',
  },
  {
    id: 'sensate_p1g_t5',
    text: 'Closing. Dress if you wish. Jot sensations or distractions if helpful. Seek professional support for pain or strong anxiety.',
  },
  // --- Lotion / lubricant ---
  {
    id: 'sensate_lo_t1',
    text: 'Prepare towels. Warm lotion or oil and water-based lubricant in your hands first. Use products you tolerate; this is exploration, not romance staging.',
  },
  {
    id: 'sensate_lo_t2',
    text: 'Partner 1 touches Partner 2. Use lotion or oil on body and lubricant where appropriate for genital contact, same non-demand attitude: notice how the medium changes temperature, pressure, and glide. Partner 2 tracks the new sensations. No performance goals.',
  },
  {
    id: 'sensate_lo_t3',
    text: 'Partner 1, say switch when ready.',
  },
  {
    id: 'sensate_lo_t3_p2',
    text: 'Partner 2, say switch when ready.',
  },
  {
    id: 'sensate_lo_t4',
    text: 'Partner 2 touches Partner 1 the same way with warmed products. Stay curious about texture and glide, not outcome.',
  },
  {
    id: 'sensate_lo_t5',
    text: 'Closing. Wipe off if needed. Note what felt different in your skin attention today.',
  },
  // --- Mutual ---
  {
    id: 'sensate_mu_t1',
    text: 'Settle in the same private, distraction-free space. You will both touch at once—no single giver or receiver.',
  },
  {
    id: 'sensate_mu_t2',
    text: 'Together, touch each other at the same time. Use hands, lips, and tongue, but skip kissing and oral sex for now to avoid old automatic scripts. Each of you tracks your own experience of touching and being touched. No goal of arousal or intercourse. Pause if either of you needs a break.',
  },
  {
    id: 'sensate_mu_t3',
    text: 'Wind down when you both agree. Briefly share one sensory observation each if you want—information, not pressure. Professional guidance helps if old patterns rush back.',
  },
  // --- Phase 2 communication ---
  {
    id: 'sensate_p2_t1',
    text: 'Begin with a few minutes of phase one style touch: each person notices their own sensations without chatting.',
  },
  {
    id: 'sensate_p2_t2',
    text: 'Still in slow touch, add short phrases about what feels pleasant or connecting—offered as information, not as a demand on the other person.',
  },
  {
    id: 'sensate_p2_t3',
    text: 'Take turns naming one sensation or preference, then let the other respond with curiosity rather than obligation. Keep the pace slow.',
  },
  {
    id: 'sensate_p2_t4',
    text: 'Continue touch while practicing both self-awareness and hearing your partner. If performance worry returns, go back to silent sensing next time.',
  },
  {
    id: 'sensate_p2_t5',
    text: 'Closing. Check in kindly. Phase two works best after steady phase one skills; consider discussing this session with a qualified therapist.',
  },
]

export const SENSATE_PHRASE_BY_ID = Object.fromEntries(SENSATE_STATIC_PHRASES.map((p) => [p.id, p.text]))
