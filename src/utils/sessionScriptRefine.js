/**
 * Two refinement passes applied to a built SessionPlan, in order:
 *
 *   1. refineInstructionContinuity(plan, ctx)
 *      Makes the instructions read sensibly from one turn to the next:
 *      - Finish positions that repeat across consecutive turns (reuse modes play
 *        the same position with the lead swapped) no longer say "ease back to
 *        neutral, get into the position" again; they say "stay in this position,
 *        switch who leads".
 *      - Guards against a spoken instruction being a verbatim repeat of the one
 *        right before it.
 *
 *   2. polishSpokenFluency(plan, ctx)
 *      Edits each instruction for spoken delivery: speakable seconds ("45s" ->
 *      "45 seconds"), numeric ranges ("1–63" -> "1 to 63"), em-dash asides into
 *      natural comma pauses, common abbreviations spelled out, curly quotes and
 *      stray double punctuation/whitespace cleaned, and a guaranteed terminal stop.
 *      Also breaks up back-to-back identical ease-in cues using the existing
 *      ease-in catalog (so the audio stays bakeable).
 *
 * Both passes operate in place and PRESERVE the per-turn phraseStrings line count,
 * so plan.script (rebuilt here) stays index-aligned with the turns — the reroll
 * splice logic and pre-generated audio indexing both rely on that.
 */
import { EASE_IN_TEXTS } from '@/data/staticPhrases'

/** Index of the spoken instruction line within a turn's phraseStrings. */
function instructionLineIndex(turn) {
  const spoken = turn.shortInstruction || turn.instruction
  const idx = (turn.phraseStrings || []).indexOf(spoken)
  if (idx !== -1) return idx
  // Fallback to the known chunk order: [transition, (clothing), instruction, ease, start]
  return turn.clothing ? 2 : 1
}

/** Write a new spoken instruction into the turn record and its phraseStrings slot. */
function setSpokenInstruction(turn, text) {
  const idx = instructionLineIndex(turn)
  if (turn.phraseStrings && idx >= 0 && idx < turn.phraseStrings.length) {
    turn.phraseStrings[idx] = text
  }
  turn.shortInstruction = text
}

// -----------------------------------------------------------------------------
// Pass 1 — continuity / clarity
// -----------------------------------------------------------------------------
/**
 * @param {{turns: object[], script: string[]}} plan
 * @param {{ partnerName: (n:number)=>string }} ctx
 */
export function refineInstructionContinuity(plan, ctx) {
  const turns = plan?.turns || []
  const partnerName = (ctx && ctx.partnerName) || ((n) => `Partner ${n}`)

  let prevFinishPos = null
  let prevSpoken = null

  for (const turn of turns) {
    if (turn.phase === 3) {
      const pos = turn.locationRoll
      const giverName = partnerName(turn.currentPartner)
      const sameAsPrev = prevFinishPos != null && pos === prevFinishPos
      if (sameAsPrev) {
        // Continuation of the same position: don't reset to neutral, just swap lead.
        if (turn.phraseStrings && turn.phraseStrings.length > 0) {
          turn.phraseStrings[0] = 'Stay in the same position together. Now just switch who leads.'
        }
        const positionName = turn.where ? String(turn.where).replace(/\.+$/, '') : 'the position'
        setSpokenInstruction(turn, `Same position. ${giverName} now leads.`)
        // Rebuild the on-screen full instruction from parts so it doesn't repeat
        // the position setup they're already in — keep only the per-turn modifier.
        const modifier = (turn.what || '').trim()
        turn.instruction = `Staying in ${positionName}, ${giverName} now leads.${modifier ? ` ${modifier}` : ''}`
      }
      prevFinishPos = pos
    } else {
      prevFinishPos = null
    }

    // Verbatim back-to-back spoken instruction guard.
    const spoken = turn.shortInstruction || turn.instruction
    if (spoken && spoken === prevSpoken) {
      setSpokenInstruction(turn, `Again—${spoken.charAt(0).toLowerCase()}${spoken.slice(1)}`)
    }
    prevSpoken = turn.shortInstruction || turn.instruction
  }

  rebuildScript(plan)
  return plan
}

// -----------------------------------------------------------------------------
// Pass 2 — flow & spoken fluency
// -----------------------------------------------------------------------------
/**
 * Edit one instruction string for natural spoken delivery.
 * @param {string} s
 */
export function polishLineForSpeech(s) {
  if (!s || typeof s !== 'string') return s
  let t = s
  // Numeric ranges first ("1–63", "20–30") so the dash cleanup below can't split them.
  t = t.replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2')
  // Speakable durations: "45s" / "45 s" -> "45 seconds".
  t = t.replace(/\b(\d+)\s*s\b/g, '$1 seconds')
  // Common abbreviations spelled out for the voice.
  t = t.replace(/\be\.g\.\s*,?/gi, 'for example, ')
  t = t.replace(/\bi\.e\.\s*,?/gi, 'that is, ')
  t = t.replace(/\betc\.?/gi, 'and so on')
  t = t.replace(/\bvs\.?\b/gi, 'versus')
  t = t.replace(/\s*&\s*/g, ' and ')
  // Curly quotes confuse TTS; drop doubles, normalize singles.
  t = t.replace(/[“”]/g, '').replace(/[‘’]/g, "'")
  // Remaining em/en dashes become a natural comma pause.
  t = t.replace(/\s*[—–]\s*/g, ', ')
  // Tidy spacing and punctuation.
  t = t.replace(/\s{2,}/g, ' ')
  t = t.replace(/\s+([,.;:!?])/g, '$1')
  t = t.replace(/([,;:])(?=\S)/g, '$1 ')
  t = t.replace(/,\s*,/g, ',')
  t = t.replace(/([.!?]){2,}/g, '$1')
  t = t.trim()
  if (t && !/[.!?]$/.test(t)) t += '.'
  return t
}

/**
 * @param {{turns: object[], script: string[]}} plan
 */
export function polishSpokenFluency(plan) {
  const turns = plan?.turns || []
  let prevEaseIn = null

  for (const turn of turns) {
    // Polish the spoken instruction (and the on-screen full instruction).
    const spoken = turn.shortInstruction || turn.instruction
    if (spoken) setSpokenInstruction(turn, polishLineForSpeech(spoken))
    if (turn.instruction) turn.instruction = polishLineForSpeech(turn.instruction)

    // Avoid the same ease-in cue twice running (swap within the catalog only,
    // so the line still maps to a pre-bakeable phrase).
    const ps = turn.phraseStrings || []
    for (let i = 0; i < ps.length; i++) {
      if (!EASE_IN_TEXTS.includes(ps[i])) continue
      if (ps[i] === prevEaseIn) {
        const alt = EASE_IN_TEXTS.find((e) => e !== prevEaseIn)
        if (alt) ps[i] = alt
      }
      prevEaseIn = ps[i]
      break
    }
  }

  rebuildScript(plan)
  return plan
}

// -----------------------------------------------------------------------------
// Shared
// -----------------------------------------------------------------------------
/** Rebuild plan.script from intro + every turn's phraseStrings + trailing lines. */
function rebuildScript(plan) {
  if (!plan || !Array.isArray(plan.script) || !Array.isArray(plan.turns)) return
  const phraseTotal = plan.turns.reduce((n, t) => n + (t.phraseStrings ? t.phraseStrings.length : 0), 0)
  const intro = plan.script.slice(0, 1)
  const trailing = plan.script.slice(1 + phraseTotal)
  const body = plan.turns.flatMap((t) => t.phraseStrings || [])
  plan.script = [...intro, ...body, ...trailing]
}

/** Convenience: run both passes in order. */
export function refineSessionScript(plan, ctx) {
  refineInstructionContinuity(plan, ctx)
  polishSpokenFluency(plan)
  return plan
}
