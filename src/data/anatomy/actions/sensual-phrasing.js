/**
 * Meaningful touch modifiers for guided-touch copy.
 *
 * A modifier here is never decorative — it encodes a real OMGYES control
 * dimension so the word implies a *different action*:
 *   • pressure  — gliding/light → moving-the-skin/steady → firm/deep
 *   • rhythm/tempo — fluttering/quick vs. slow/lingering
 * (See src/data/techniques/female/entries — Orbiting pressure levels, Rhythm
 *  flutter/skipping, etc.)
 *
 * Selection is deterministic per (zone, technique), so a given zone always
 * reads the same way (repetition can be stimulating) while different zones get
 * different words (variety stays interesting). Phrases that already carry a
 * meaningful descriptor are left alone rather than double-modified.
 */

/** @typedef {{ zoneId?: string, stepIndex?: number, totalSteps?: number, technique?: string, pressure?: string, tempo?: string, erogenousWeight?: number, form?: 'verb' | 'gerund', plain?: boolean }} EnrichCtx */

/**
 * Meaningful adverb pools by control band. Each has synonyms so repeated use
 * across zones varies without losing the encoded meaning.
 * @type {Record<string, string[]>}
 */
const BANDS = {
  light: ['lightly', 'softly', 'feather-lightly'],
  steady: ['steadily', 'evenly', 'smoothly'],
  firm: ['firmly', 'deeply'],
  fast: ['rapidly', 'quickly', 'briskly'],
  slow: ['slowly', 'languidly'],
  teasing: ['teasingly', 'tantalizingly'],
}

/** Retrace phrasing per band (used when stepping back to a start spot). */
const BAND_RETRACE = {
  light: 'then lightly trace back',
  steady: 'then steadily trace back',
  firm: 'then firmly retrace',
  fast: 'then quickly trace back',
  slow: 'then slowly trace back',
  teasing: 'then teasingly trace back',
}

const WEAK_ADVERB =
  /\b(gently|slowly|lightly|softly|firmly|very lightly|very gently|very softly|patiently|carefully)\b/i

/** Strip light-touch adverbs before swapping in a meaningful modifier. */
function stripWeakAdverbs(phrase) {
  return phrase
    .replace(/\bvery\s+(lightly|gently|softly)\b/gi, '$1')
    .replace(/\b(gently|slowly|lightly|softly|firmly|patiently|carefully)\b/gi, '')
    .replace(/\bvery\s+(?=\b(beside|along|on|at|with)\b)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * If the phrase already carries a meaningful pressure/speed/shape descriptor,
 * we leave it as-is — adding another modifier would be redundant or clashing
 * ("quickly buzz … in rapid micro-shakes").
 */
const HAS_MEANINGFUL_DESCRIPTOR =
  /\b(rapid|rapidly|quick|quickly|brisk|briskly|fast|firm|firmly|deep|deeply|hard|weighted|weight|pushing|thick|heavy|broad|long|slow|slowly|languid|tight|light|mild|soft|softly|yielding|loose|warm|wet|flat|even|steady|feather|feather-light|floating|micro|skin-moving|grinding|pulsing|pulsating|fluttering|gliding|grazing|skimming|kneading|come-hither)\b/i

const LEADING_VERBS = new Set([
  'stroke', 'trace', 'kiss', 'tap', 'make', 'knead', 'press', 'hold', 'drag',
  'flick', 'slide', 'cup', 'wrap', 'seal', 'twist', 'part', 'roll', 'squeeze',
  'flutter', 'spiral', 'widen', 'narrow', 'shift', 'focus', 'tease', 'draw',
  'glide', 'rest', 'give', 'circle', 'spread', 'angle', 'curl', 'shrink',
  'suck', 'drum', 'orbit', 'chop', 'ease', 'sink', 'sweep', 'buzz', 'creep',
  'feather', 'trail', 'paint', 'wash', 'streak', 'pulse', 'sketch', 'lay',
  'peck', 'loop', 'nibble', 'brush', 'hover', 'rock',
])

/** @param {string} seed @param {string[]} arr */
function hashPick(seed, arr) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return arr[Math.abs(h) % arr.length]
}

/**
 * Choose the meaningful control band for this action from its real mechanics.
 * @param {EnrichCtx} ctx
 * @returns {keyof typeof BANDS}
 */
function bandForAction(ctx) {
  const tech = ctx.technique || 'stroke'
  const p = ctx.pressure
  const t = ctx.tempo
  const hot = (ctx.erogenousWeight ?? 50) >= 85

  // Rhythm-led moves: tapping / fast oscillation read by speed, not pressure.
  if (tech === 'tap' || t === 'high') return 'fast'
  // Kissing reads by pacing/tenderness.
  if (tech === 'kiss') return t === 'low' || t === 'very_low' ? 'slow' : 'light'

  if (p === 'high') return 'firm'
  if (p === 'medium') return 'steady'
  if (p === 'low' || p === 'very_low') {
    if (t === 'low' || t === 'very_low') return 'slow'
    return hot ? 'teasing' : 'light'
  }

  // No pressure signal (e.g. sequence steps): fall back to tempo/technique.
  if (t === 'low' || t === 'very_low') return 'slow'
  if (tech === 'pressure') return 'firm'
  return 'light'
}

/** @param {string} phrase @param {string} adverb */
function applyAdverb(phrase, adverb) {
  let c = phrase.replace(/\s+/g, ' ').trim()

  // "make <adj> X" → keep the shape adjective, weave the modifier in.
  if (/^make\s+/i.test(c)) {
    const m = c.match(/^make\s+(\w+)\s+(.+)$/i)
    if (m && /^(slow|small|light|flat|broad|soft|steady|warm|deep|tight|wide)$/i.test(m[1])) {
      return `make ${m[1]}, ${adverb} ${m[2]}`
    }
    return `make ${adverb} ${c.slice(5).trim()}`
  }

  const vm = c.match(/^(\w+)(\s+.*)?$/i)
  const isGerund =
    /^(stroking|tracing|kissing|tapping|making|pressing|holding|dragging|sliding|cupping|twisting|teasing|gliding|spiraling|circling|kneading|squeezing|rolling|resting|drawing|fluttering|flicking|widening|narrowing|shifting|focusing|continuing|finishing|angling|curling|breathing|parting|wrapping|sealing|giving)\b/i.test(
      c
    )

  if (isGerund || (vm && LEADING_VERBS.has(vm[1].toLowerCase()))) {
    const stem = stripWeakAdverbs(c)
    return stem ? `${adverb} ${stem}` : `${adverb} ${c}`
  }
  if (WEAK_ADVERB.test(c)) {
    const stem = stripWeakAdverbs(c)
    return stem ? `${adverb} ${stem}` : `${adverb} ${c}`
  }
  return `${adverb} ${c}`
}

/**
 * @param {string} phrase
 * @param {EnrichCtx} [ctx]
 */
export function enrichSensualPhrase(phrase, ctx = {}) {
  if (!phrase?.trim()) return phrase
  let c = phrase.replace(/\s+/g, ' ').trim()
  if (ctx.plain) return c
  // Already meaningfully described — don't pile on another modifier.
  if (HAS_MEANINGFUL_DESCRIPTOR.test(c)) {
    return c.replace(/\bvery\s+(lightly|gently|softly)\b/gi, '$1')
  }

  if (/more firmly/i.test(c)) return c
  if (/more lightly/i.test(c)) return c.replace(/more lightly/i, 'more gently')

  const seed = [ctx.zoneId, ctx.stepIndex, ctx.technique, c].filter(Boolean).join('|')
  const band = bandForAction(ctx)
  const adverb = hashPick(seed, BANDS[band])
  return applyAdverb(c, adverb)
}

/** @param {string} seed @param {EnrichCtx} [ctx] */
export function enrichRetracePhrase(seed, ctx = {}) {
  if (hashPick(`${seed}|retrace-plain`, ['plain', 'plain', 'accent']) === 'plain') {
    return 'then trace back'
  }
  const band = bandForAction({ ...ctx, technique: ctx.technique || 'stroke' })
  return BAND_RETRACE[band] || 'then trace back'
}
