# Sensate preset scripts — review before WAV generation

**Workflow**

1. Read this file **preset by preset**, line by line (same order as playback).
2. Edit copy in **`src/data/sensateStaticPhrases.js`** (and, for shared cues, **`src/data/staticPhrases.js`** / **`scripts/staticPhraseData.js`** — keep those pairs in sync when you change guided + static WAV data).
3. When you are satisfied, say **OK to generate** and we can run the static WAV pipeline phrase-by-phrase (e.g. `npm run generate-static-wavs -- --phrase <id> --voice af_nicole`).

**Legend**

- **Phrase id** — file will be `public/audio/static/<voice>/<id>.wav` when generated.
- **Shared cue** — intro/ease/turn lines that use the **first variant** in code (`next_turn_1`, `ease_in_1`, `turn_begins_1`). Same IDs as guided static audio.
- **Duration line** — text from `formatSensateBlockDurationSpeech(durationSec)` in `src/utils/sensateSessionPlanBuilder.js`. There is **no separate phrase id** in `sensateStaticPhrases.js` yet; static lookup uses **exact text match**. After you lock wording, we can add explicit `sensate_duration_…` ids if you want one WAV filename per duration.

**Reversible presets** (Phase 1 non-genital, genital, lotion) have **two orderings**: Partner 1 leads first vs Partner 2 leads first. Both are listed below.

---

## 1. Phase 1: Non-genital touch (`phase1_non_genital`)

### A. Partner 1 leads first (`sensateFirstGiverResolved: 1`)

| # | Phrase id / note | Text |
|---|------------------|------|
| 1 | `sensate_intro_phase1_non_genital` | Welcome to a sensate-style session: phase one, with mindful touch that stays non-genital. This is for adults in a fully consensual relationship. What you hear is not medical or therapy advice, and it does not replace care from a qualified clinician or therapist when you need that care. If you notice discomfort, distress, or anything that feels like coercion, pause or stop together. When you are ready, settle somewhere private, put phones aside, and adjust the temperature and lighting so you can see each other easily. Undress only as far as it feels right today. Many couples keep this simple, without music or candles, so attention can rest on touch and sensation; use whatever honestly helps you both stay present. Either of you can pause or stop at any time. You can treat this as a full session on its own or as one phase-one visit among others on different days. You will hear one short block at a time. Let us begin. |
| 2 | `sensate_first_turn_standard` | For this first stretch, Partner 1 is giving touch and Partner 2 is receiving. |
| 3 | *(duration 600 s)* | This part is set for about 10 minutes. |
| 4 | `sensate_p1ng_t2` | Partner 1 is giving touch, and Partner 2 is receiving. Partner 1, use your hands and fingers only, moving from head to toe, front and back, while leaving breasts, chest, and genitals untouched. Let your attention wander through temperature, pressure, and texture for your own curiosity, not to pull a particular response from Partner 2. Partner 2, notice what you feel where you are touched, and guide Partner 1’s hand only if something is uncomfortable. |
| 5 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 6 | `turn_begins_1` | Your turn starts now. |
| 7 | `next_turn_1` | That turn is complete. Time to switch. |
| 8 | *(duration 60 s)* | This part is set for about one minute. |
| 9 | `sensate_p1ng_t3` | You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends. |
| 10 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 11 | `turn_begins_1` | Your turn starts now. |
| 12 | `next_turn_1` | That turn is complete. Time to switch. |
| 13 | *(duration 600 s)* | This part is set for about 10 minutes. |
| 14 | `sensate_p1ng_t4` | Partner 2 gives touch, and Partner 1 receives: hands and fingers only, over the whole body except breasts, chest, and genitals. Partner 2, follow your own sensory curiosity. Partner 1, notice what you feel, and guide only for discomfort. |
| 15 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 16 | `turn_begins_1` | Your turn starts now. |
| 17 | `sensate_p1ng_t5` | Time is up. This guided session is complete. You can stop and dress, continue without the app, or open another guided session. If it helps, you might each share briefly what you sensed, what pulled your attention away, and what it was like to come back to the touch. As a reminder, this app is not a substitute for working with a therapist. |

### B. Partner 2 leads first (`sensateFirstGiverResolved: 2`)

| # | Phrase id / note | Text |
|---|------------------|------|
| 1 | `sensate_intro_phase1_non_genital` | *(same intro as A)* |
| 2 | `sensate_first_turn_p2_giver` | For this first stretch, Partner 2 is giving touch and Partner 1 is receiving. |
| 3 | *(duration 600 s)* | This part is set for about 10 minutes. |
| 4 | `sensate_p1ng_t4` | Partner 2 gives touch, and Partner 1 receives: hands and fingers only, over the whole body except breasts, chest, and genitals. Partner 2, follow your own sensory curiosity. Partner 1, notice what you feel, and guide only for discomfort. |
| 5 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 6 | `turn_begins_1` | Your turn starts now. |
| 7 | `next_turn_1` | That turn is complete. Time to switch. |
| 8 | *(duration 60 s)* | This part is set for about one minute. |
| 9 | `sensate_p1ng_t3_p2` | You are switching roles for the second round of touch in this session: whoever was receiving will give, and whoever was giving will receive. If you are already repositioned, tap Skip turn to hear the next instructions. If you want more time, use what remains of this pause to settle. The next prompt begins when the timer ends. |
| 10 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 11 | `turn_begins_1` | Your turn starts now. |
| 12 | `next_turn_1` | That turn is complete. Time to switch. |
| 13 | *(duration 600 s)* | This part is set for about 10 minutes. |
| 14 | `sensate_p1ng_t2` | Partner 1 is giving touch, and Partner 2 is receiving. Partner 1, use your hands and fingers only, moving from head to toe, front and back, while leaving breasts, chest, and genitals untouched. Let your attention wander through temperature, pressure, and texture for your own curiosity, not to pull a particular response from Partner 2. Partner 2, notice what you feel where you are touched, and guide Partner 1’s hand only if something is uncomfortable. |
| 15 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 16 | `turn_begins_1` | Your turn starts now. |
| 17 | `sensate_p1ng_t5` | Time is up. This guided session is complete. You can stop and dress, continue without the app, or open another guided session. If it helps, you might each share briefly what you sensed, what pulled your attention away, and what it was like to come back to the touch. As a reminder, this app is not a substitute for working with a therapist. |

---

## 2. Phase 1: Full body / non-demand (`phase1_genital_included`)

Same **structure** as §1, with these substitutions:

- Intro: `sensate_intro_phase1_genital`
- Long touch blocks: `sensate_p1g_t2`, `sensate_p1g_t3` / `sensate_p1g_t3_p2`, `sensate_p1g_t4`
- Closing: `sensate_p1g_t5`

Durations and shared cues (`next_turn_1`, `ease_in_1`, `turn_begins_1`) are the same pattern as §1 (600 → switch 60 → 600 → closing).

---

## 3. Lotion and lubricant (`phase1_lotion`)

Same **structure** as §1, with:

- Intro: `sensate_intro_lotion`
- Blocks: `sensate_lo_t2`, `sensate_lo_t3` / `sensate_lo_t3_p2`, `sensate_lo_t4`
- Closing: `sensate_lo_t5`

---

## 4. Mutual touching (`mutual_touching`)

Single ordering (no first-toucher choice). **Note:** Turn 1 still uses the standard “Partner 1 gives / Partner 2 receives” first-turn line from code; if you want mutual-specific wording for that slot, change `SENSATE_FIRST_TURN_TEXT` / builder logic.

| # | Phrase id / note | Text |
|---|------------------|------|
| 1 | `sensate_intro_mutual` | This segment is sensate-style mutual touch for adults in a consensual relationship. It is not medical or therapy advice and does not replace professional support. If touching each other at the same time feels overwhelming, return to turn-taking. Stop if either of you feels distressed. Let us begin. |
| 2 | `sensate_first_turn_standard` | For this first stretch, Partner 1 is giving touch and Partner 2 is receiving. |
| 3 | *(duration 180 s)* | This part is set for about 3 minutes. |
| 4 | `sensate_mu_t1` | Settle in the same private, distraction-free space. You will both touch at once, with no single giver or receiver. |
| 5 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 6 | `turn_begins_1` | Your turn starts now. |
| 7 | `next_turn_1` | That turn is complete. Time to switch. |
| 8 | *(duration 900 s)* | This part is set for about 15 minutes. |
| 9 | `sensate_mu_t2` | Together, touch each other at the same time. Use hands, lips, and tongue, but skip kissing and oral sex for now to avoid old automatic scripts. Each of you tracks your own experience of touching and being touched. No goal of arousal or intercourse. Pause if either of you needs a break. |
| 10 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 11 | `turn_begins_1` | Your turn starts now. |
| 12 | `next_turn_1` | That turn is complete. Time to switch. |
| 13 | *(duration 180 s)* | This part is set for about 3 minutes. |
| 14 | `sensate_mu_t3` | Wind down when you both agree. Briefly share one sensory observation each if you want: information, not pressure. Professional guidance helps if old patterns rush back. |
| 15 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 16 | `turn_begins_1` | Your turn starts now. |

---

## 5. Phase 2: Gentle communication (`phase2_communication`)

| # | Phrase id / note | Text |
|---|------------------|------|
| 1 | `sensate_intro_phase2_comm` | This is a sensate-style session that adds short, gentle communication for adults in a consensual relationship. It is not medical or therapy advice and does not replace therapy when you need it. This kind of phase-two sharing usually works best after you are steady with quiet phase-one sensing; if talking ramps up pressure, shift back to silent focus. Let us begin. |
| 2 | `sensate_first_turn_standard` | For this first stretch, Partner 1 is giving touch and Partner 2 is receiving. |
| 3 | *(duration 300 s)* | This part is set for about 5 minutes. |
| 4 | `sensate_p2_t1` | Begin with a few minutes of phase-one-style touch: each person notices their own sensations without chatting. |
| 5 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 6 | `turn_begins_1` | Your turn starts now. |
| 7 | `next_turn_1` | That turn is complete. Time to switch. |
| 8 | *(duration 240 s)* | This part is set for about 4 minutes. |
| 9 | `sensate_p2_t2` | Still in slow touch, add short phrases about what feels pleasant or connecting, offered as information, not as a demand on the other person. |
| 10 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 11 | `turn_begins_1` | Your turn starts now. |
| 12 | `next_turn_1` | That turn is complete. Time to switch. |
| 13 | *(duration 360 s)* | This part is set for about 6 minutes. |
| 14 | `sensate_p2_t3` | Take turns naming one sensation or preference, then let the other respond with curiosity rather than obligation. Keep the pace slow. |
| 15 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 16 | `turn_begins_1` | Your turn starts now. |
| 17 | `next_turn_1` | That turn is complete. Time to switch. |
| 18 | *(duration 600 s)* | This part is set for about 10 minutes. |
| 19 | `sensate_p2_t4` | Continue touch while practicing both self-awareness and hearing your partner. If performance worry returns, go back to silent sensing next time. |
| 20 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 21 | `turn_begins_1` | Your turn starts now. |
| 22 | `next_turn_1` | That turn is complete. Time to switch. |
| 23 | *(duration 180 s)* | This part is set for about 3 minutes. |
| 24 | `sensate_p2_t5` | Closing. Check in kindly. Phase two works best after steady phase-one skills; consider discussing this session with a qualified therapist. |
| 25 | `ease_in_1` | Take a moment to settle into position. No rush. |
| 26 | `turn_begins_1` | Your turn starts now. |

---

## After you approve

Reply with something like **“OK to generate”** (and which preset or “all”). Next step is generating WAVs, e.g.:

- `npm run generate-static-wavs -- --voice af_nicole --phrase <phraseId> [--local] [--skip-existing]`

Shared cues may already exist from guided static generation; sensate-specific ids are the `sensate_*` entries in `src/data/sensateStaticPhrases.js`.
