/**
 * Fixed phrase ids + text for sensate sessions (plan builder + static WAV when shipped).
 * Partner labels use "Partner 1" / "Partner 2" so audio matches app defaults.
 * The app only tries /audio/static/{voice}/{id}.wav for these lines in sensate mode (see getStaticPhraseIdForText staticPresetKind).
 */

export const SENSATE_FIRST_TURN_TEXT =
  'For this first stretch, Partner 1 is giving touch and Partner 2 is receiving.'

export const SENSATE_FIRST_TURN_P2_GIVER_TEXT =
  'For this first stretch, Partner 2 is giving touch and Partner 1 is receiving.'

/** After a sensate touch block ends (no “time to switch”—switching is cued in the transition pause line). */
export const SENSATE_TURN_COMPLETE_CUE = 'That turn is complete.'

/**
 * Replaces the generic duration line on transition turns: one minute to switch roles and settle before the role-switch script.
 */
export const SENSATE_TRANSITION_PAUSE_ABOUT_ONE_MINUTE =
  'You have about one minute to switch who gives and who receives, and to settle before the next instructions.'

/** @type {{ id: string, text: string }[]} */
export const SENSATE_STATIC_PHRASES = [
  { id: 'sensate_first_turn_standard', text: SENSATE_FIRST_TURN_TEXT },
  { id: 'sensate_first_turn_p2_giver', text: SENSATE_FIRST_TURN_P2_GIVER_TEXT },
  { id: 'sensate_turn_complete', text: SENSATE_TURN_COMPLETE_CUE },
  { id: 'sensate_transition_pause_one_minute', text: SENSATE_TRANSITION_PAUSE_ABOUT_ONE_MINUTE },
  // Timer lines — must match formatSensateBlockDurationSpeech(durationSec) exactly (sensate uses static WAV only).
  { id: 'sensate_duration_15_min', text: 'This part is set for about 15 minutes.' },
  { id: 'sensate_duration_10_min', text: 'This part is set for about 10 minutes.' },
  { id: 'sensate_duration_6_min', text: 'This part is set for about 6 minutes.' },
  { id: 'sensate_duration_5_min', text: 'This part is set for about 5 minutes.' },
  { id: 'sensate_duration_4_min', text: 'This part is set for about 4 minutes.' },
  { id: 'sensate_duration_3_min', text: 'This part is set for about 3 minutes.' },
  {
    id: 'sensate_intro_phase1_non_genital',
    text: 'Welcome to a sensate-style session: phase one, with mindful touch that stays non-genital. This is for adults in a fully consensual relationship. What you hear is not medical or therapy advice, and it does not replace care from a qualified clinician or therapist when you need that care. If you notice discomfort, distress, or anything that feels like coercion, pause or stop together. When you are ready, settle somewhere private, put phones aside, and adjust the temperature and lighting so you can see each other easily. Undress only as far as it feels right today. Many couples keep this simple, without music or candles, so attention can rest on touch and sensation; use whatever honestly helps you both stay present. Either of you can pause or stop at any time. You can treat this as a full session on its own or as one phase-one visit among others on different days. You will hear one short block at a time. Let us begin.',
  },
  {
    id: 'sensate_intro_phase1_genital',
    text: 'Welcome to a sensate-style session: phase one, with whole-body touch that can include breasts and genitals. This is for adults in a fully consensual relationship. What you hear is not medical or therapy advice, and it does not replace professional care when you need it. If you feel pain, distress, or coercion, pause or stop together. If you have untreated genital pain or new symptoms, speak with a clinician before adding genital touch. When you are ready, settle into a calm, private space. Put devices away, choose a temperature that feels easy, and dress or undress for your own comfort, knowing either of you may pause or stop at any time. There is no pressure to perform or to respond in a particular way. Some people practice non-genital sessions first; others use this format on its own, and both are fine. You can stop after this visit or plan another phase-one session on another day. You will hear one short block at a time. Let us begin.',
  },
  {
    id: 'sensate_intro_lotion',
    text: 'Welcome to a sensate-style session that uses lotion, oil, and lubricant where those suit your bodies. This is for adults in a fully consensual relationship. What you hear is not medical or therapy advice, and it does not replace care from a qualified professional when you need it. If your skin is sensitive, patch-test products first, and warm them in your hands before you use them. Stop if you feel irritation or distress. Keep towels within reach. Use products you already trust on your skin; this is quiet exploration, not decorating a scene. You can use this as a full practice on its own or alongside other phase-one sessions whenever you choose. You will hear one short block at a time. Let us begin.',
  },
  {
    id: 'sensate_intro_mutual',
    text: 'This segment is sensate-style mutual touch for adults in a consensual relationship. It is not medical or therapy advice and does not replace professional support. If touching each other at the same time feels overwhelming, return to turn-taking. Stop if either of you feels distressed. Let us begin.',
  },
  {
    id: 'sensate_intro_phase2_comm',
    text: 'This is a sensate-style session that adds short, gentle communication for adults in a consensual relationship. It is not medical or therapy advice and does not replace therapy when you need it. This kind of phase-two sharing usually works best after you are steady with quiet phase-one sensing; if talking ramps up pressure, shift back to silent focus. Let us begin.',
  },
  // --- Phase 1 non-genital turns ---
  {
    id: 'sensate_p1ng_t2',
    text: 'Partner 1 is giving touch, and Partner 2 is receiving. Partner 1, use your hands and fingers only, moving from head to toe, front and back, while leaving breasts, chest, and genitals untouched. Let your attention wander through temperature, pressure, and texture for your own curiosity, not to pull a particular response from Partner 2. Partner 2, notice what you feel where you are touched, and guide Partner 1’s hand only if something is uncomfortable.',
  },
  {
    id: 'sensate_p1ng_t3',
    text: 'You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends.',
  },
  {
    id: 'sensate_p1ng_t3_p2',
    text: 'You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends.',
  },
  {
    id: 'sensate_p1ng_t4',
    text: 'Partner 2 gives touch, and Partner 1 receives: hands and fingers only, over the whole body except breasts, chest, and genitals. Partner 2, follow your own sensory curiosity. Partner 1, notice what you feel, and guide only for discomfort.',
  },
  {
    id: 'sensate_p1ng_t5',
    text: 'Time is up. This guided session is complete. You can stop and dress, continue without the app, or open another guided session. If it helps, you might each share briefly what you sensed, what pulled your attention away, and what it was like to come back to the touch. As a reminder, this app is not a substitute for working with a therapist.',
  },
  // --- Phase 1 genital included ---
  {
    id: 'sensate_p1g_t2',
    text: 'Partner 1 is giving touch, and Partner 2 is receiving. Partner 1, use your hands and fingers over the whole body, including breasts and genitals, letting attention move so you are not parked only on the most charged spots. Stay curious about temperature, pressure, and texture. Partner 2, let sensations come and go; if arousal shows up, you can notice it without chasing it or shutting it down. Optional hand-riding is fine for gentle guidance.',
  },
  {
    id: 'sensate_p1g_t3',
    text: 'You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends.',
  },
  {
    id: 'sensate_p1g_t3_p2',
    text: 'You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends.',
  },
  {
    id: 'sensate_p1g_t4',
    text: 'Partner 2 gives touch, and Partner 1 receives: full body including breasts and genitals, attention spread evenly, gentle curiosity, and room to notice arousal without making it the point of the exercise. Hand-riding stays optional if it helps.',
  },
  {
    id: 'sensate_p1g_t5',
    text: 'Time is up. This guided session is complete. You can stop and dress, continue without the app, or open another guided session. A few notes about sensations or distractions can help some people make sense of what happened. If this kind of touch brings ongoing pain or strong anxiety, consider reaching out to a professional for support. As a reminder, this app is not a substitute for working with a therapist.',
  },
  // --- Lotion / lubricant ---
  {
    id: 'sensate_lo_t2',
    text: 'Partner 1 is giving touch, and Partner 2 is receiving. Partner 1, use lotion or oil on the body and lubricant where genital contact is part of your plan. Keep a calm, curious attitude. Notice how slip and glide change temperature, pressure, and texture. Partner 2, ride those sensations without trying to perform. There is nothing here to get right.',
  },
  {
    id: 'sensate_lo_t3',
    text: 'You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends.',
  },
  {
    id: 'sensate_lo_t3_p2',
    text: 'You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends.',
  },
  {
    id: 'sensate_lo_t4',
    text: 'Partner 2 gives touch, and Partner 1 receives, with warmed lotion, oil, or lubricant as needed, staying curious about texture and glide rather than about any particular outcome.',
  },
  {
    id: 'sensate_lo_t5',
    text: 'Time is up. This guided session is complete. You can stop and dress, continue without the app, or open another guided session. As you finish, wipe off if you need to. If you like, name one thing that felt different in how you paid attention to your skin today. As a reminder, this app is not a substitute for working with a therapist.',
  },
  // --- Mutual ---
  {
    id: 'sensate_mu_t1',
    text: 'Settle in the same private, distraction-free space. You will both touch at once, with no single giver or receiver.',
  },
  {
    id: 'sensate_mu_t2',
    text: 'Together, touch each other at the same time. Use hands, lips, and tongue, but skip kissing and oral sex for now to avoid old automatic scripts. Each of you tracks your own experience of touching and being touched. No goal of arousal or intercourse. Pause if either of you needs a break.',
  },
  {
    id: 'sensate_mu_t3',
    text: 'Wind down when you both agree. Briefly share one sensory observation each if you want: information, not pressure. Professional guidance helps if old patterns rush back.',
  },
  // --- Phase 2 communication ---
  {
    id: 'sensate_p2_t1',
    text: 'Begin with a few minutes of phase-one-style touch: each person notices their own sensations without chatting.',
  },
  {
    id: 'sensate_p2_t2',
    text: 'Still in slow touch, add short phrases about what feels pleasant or connecting, offered as information, not as a demand on the other person.',
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
    text: 'Closing. Check in kindly. Phase two works best after steady phase-one skills; consider discussing this session with a qualified therapist.',
  },
]

export const SENSATE_PHRASE_BY_ID = Object.fromEntries(SENSATE_STATIC_PHRASES.map((p) => [p.id, p.text]))
