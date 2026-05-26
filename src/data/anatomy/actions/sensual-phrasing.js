/**
 * Optional sensual modifiers for guided touch copy.
 *
 * Most cues stay plain. A minority get a modifier chosen to match the motion
 * (slow opening, teasing tap, hungry stroke on a high zone), not random decoration.
 *
 * "Languid" / languidly = very slow, relaxed, unhurried (we mostly say "slowly").
 */

/** @typedef {{ zoneId?: string, stepIndex?: number, totalSteps?: number, technique?: string, erogenousWeight?: number, form?: 'verb' | 'gerund' }} EnrichCtx */

/** @typedef {{ flavor: string, kind: 'adverb' | 'adj' }} FlavorPick */

/**
 * Each flavor changes how the line reads, not just tone.
 * @type {Record<string, { adverb: string, adj: string, retrace?: string }>}
 */
const FLAVORS = {
  slow: {
    adverb: 'slowly',
    adj: 'slow',
    retrace: 'then slowly trace back',
  },
  tender: {
    adverb: 'gently',
    adj: 'gentle',
    retrace: 'then gently trace back',
  },
  tease: {
    adverb: 'teasingly',
    adj: 'teasing',
    retrace: 'then teasingly trace back',
  },
  hungry: {
    adverb: 'hungrily',
    adj: 'hungry',
    retrace: 'then trace back with the same hunger',
  },
  greedy: {
    adverb: 'greedily',
    adj: 'greedy',
    retrace: 'then greedily retrace',
  },
  firm: {
    adverb: 'firmly',
    adj: 'steady',
    retrace: 'then trace back',
  },
  play: {
    adverb: 'playfully',
    adj: 'playful',
    retrace: 'then playfully trace back',
  },
  deliberate: {
    adverb: 'deliberately',
    adj: 'deliberate',
    retrace: 'then deliberately trace back',
  },
}

const WEAK_ADVERB =
  /\b(gently|slowly|lightly|softly|firmly|very lightly|very gently|very softly|patiently|carefully)\b/i

/** Strip light-touch adverbs before swapping in a flavor adverb. */
function stripWeakAdverbs(phrase) {
  return phrase
    .replace(/\bvery\s+(lightly|gently|softly)\b/gi, '$1')
    .replace(/\b(gently|slowly|lightly|softly|firmly|patiently|carefully)\b/gi, '')
    .replace(/\bvery\s+(?=\b(beside|along|on|at|with)\b)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const HAS_RICH_MODIFIER =
  /\b(teasingly|teasing|playfully|playful|hungrily|hungry|greedily|greedy|deliberately|deliberate|gentle|tender|soft|slow|steady|attentive)\b/i

const LEADING_VERBS = new Set([
  'stroke',
  'trace',
  'kiss',
  'tap',
  'make',
  'knead',
  'press',
  'hold',
  'drag',
  'flick',
  'slide',
  'cup',
  'wrap',
  'seal',
  'twist',
  'part',
  'roll',
  'squeeze',
  'flutter',
  'spiral',
  'widen',
  'narrow',
  'shift',
  'focus',
  'tease',
  'draw',
  'glide',
  'rest',
  'give',
  'circle',
  'spread',
  'angle',
  'curl',
  'shrink',
  'suck',
  'drum',
  'orbit',
  'chop',
])

/** @param {string} seed */
function hashPick(seed, arr) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return arr[Math.abs(h) % arr.length]
}

/** @param {EnrichCtx} ctx @param {string} phrase */
function stepMode(ctx, phrase) {
  const seed = [ctx.zoneId, ctx.stepIndex, ctx.totalSteps, ctx.technique].filter(Boolean).join('|')
  const total = ctx.totalSteps ?? 1
  const idx = ctx.stepIndex ?? 0
  const hot = (ctx.erogenousWeight ?? 50) >= 85

  if (WEAK_ADVERB.test(phrase)) return 'refine'

  if (total === 1) {
    if (hot && hashPick(`${seed}|single`, ['plain', 'plain', 'plain', 'accent']) === 'accent') {
      return 'accent'
    }
    return 'plain'
  }

  if (idx === 0 && hot && hashPick(`${seed}|open`, ['plain', 'accent', 'plain']) === 'accent') {
    return 'accent'
  }
  if (total > 1 && idx === total - 1 && hot && hashPick(`${seed}|fin`, ['accent', 'plain', 'plain']) === 'accent') {
    return 'accent'
  }
  if (total > 2 && idx > 0 && hashPick(`${seed}|mid`, ['plain', 'plain', 'plain', 'accent']) === 'accent') {
    return 'accent'
  }

  return 'plain'
}

/**
 * Pick a flavor that fits technique + zone heat + wording.
 * @param {EnrichCtx} ctx @param {string} phrase @param {string} seed
 * @returns {FlavorPick}
 */
function flavorForMotion(ctx, phrase, seed) {
  const tech = ctx.technique || 'stroke'
  const hot = (ctx.erogenousWeight ?? 50) >= 85
  const idx = ctx.stepIndex ?? 0

  if (/\blightly\b/i.test(phrase) || tech === 'tap') {
    return { flavor: 'tease', kind: 'adverb' }
  }
  if (/\bgently\b/i.test(phrase) || /\bsoftly\b/i.test(phrase)) {
    return { flavor: 'tender', kind: 'adverb' }
  }
  if (/\bslowly\b/i.test(phrase) || /\bslow\b/i.test(phrase)) {
    return { flavor: 'slow', kind: 'adverb' }
  }
  if (/\bfirmly\b/i.test(phrase) || tech === 'pressure') {
    return hot
      ? { flavor: hashPick(`${seed}|h`, ['hungry', 'greedy']), kind: 'adverb' }
      : { flavor: 'firm', kind: 'adverb' }
  }

  if (tech === 'kiss') {
    return { flavor: idx === 0 ? 'tender' : 'tease', kind: 'adverb' }
  }
  if (tech === 'circle' && /^make\s/i.test(phrase)) {
    if (hot && idx > 0) return { flavor: 'tease', kind: 'adj' }
    return { flavor: 'slow', kind: 'adj' }
  }
  if (tech === 'stroke' && hot && idx > 0) {
    return { flavor: hashPick(`${seed}|hg`, ['hungry', 'greedy']), kind: 'adverb' }
  }
  if (tech === 'stroke' && idx === 0) {
    return { flavor: 'slow', kind: 'adverb' }
  }

  return hashPick(`${seed}|def`, [
    { flavor: 'slow', kind: 'adverb' },
    { flavor: 'tender', kind: 'adverb' },
    { flavor: 'tease', kind: 'adverb' },
  ])
}

/** @param {FlavorPick} pick */
function modifierFor(pick) {
  const f = FLAVORS[pick.flavor] || FLAVORS.slow
  return pick.kind === 'adj' ? f.adj : f.adverb
}

/** @param {string} phrase @param {FlavorPick} pick */
function applyFlavor(phrase, pick) {
  const mod = modifierFor(pick)
  let c = phrase.replace(/\s+/g, ' ').trim()
  const form = pick.kind === 'adj' ? 'adj' : 'adverb'

  if (form === 'adj' && /^make\s+/i.test(c)) {
    const m = c.match(/^make\s+(\w+)\s+(.+)$/i)
    if (m && /^(slow|small|light|flat|broad|soft|steady|warm|deep|tight|wide)$/i.test(m[1])) {
      return `make ${m[1]}, ${mod} ${m[2]}`
    }
    return `make ${mod} ${c.slice(5).trim()}`
  }

  const vm = c.match(/^(\w+)(\s+.*)?$/i)
  const isGerund = /^(stroking|tracing|kissing|tapping|making|pressing|holding|dragging|sliding|cupping|twisting|teasing|gliding|spiraling|circling|kneading|squeezing|rolling|resting|drawing|fluttering|flicking|widening|narrowing|shifting|focusing|continuing|finishing|angling|curling|breathing|parting|wrapping|sealing|giving)\b/i.test(
    c
  )

  if (isGerund || (vm && LEADING_VERBS.has(vm[1].toLowerCase()))) {
    const stem = stripWeakAdverbs(c)
    return stem ? `${mod} ${stem}` : `${mod} ${c}`
  }

  if (WEAK_ADVERB.test(c)) {
    const stem = stripWeakAdverbs(c)
    return stem ? `${mod} ${stem}` : `${mod} ${c}`
  }

  return `${mod} ${c}`
}

/**
 * @param {string} phrase
 * @param {EnrichCtx} [ctx]
 */
export function enrichSensualPhrase(phrase, ctx = {}) {
  if (!phrase?.trim()) return phrase
  let c = phrase.replace(/\s+/g, ' ').trim()
  if (ctx.plain) return c
  if (HAS_RICH_MODIFIER.test(c)) return c
  if (/\bvery\s+(lightly|gently|softly)\b/i.test(c)) {
    c = c.replace(/\bvery\s+(lightly|gently|softly)\b/gi, '$1')
  }

  const hot = (ctx.erogenousWeight ?? 50) >= 85
  if (/more firmly/i.test(c)) {
    return c.replace(/more firmly/i, hot ? 'more hungrily' : 'more firmly')
  }
  if (/more lightly/i.test(c)) {
    return c.replace(/more lightly/i, 'more gently')
  }

  const seed = [ctx.zoneId, ctx.stepIndex, ctx.technique, c].filter(Boolean).join('|')
  const mode = stepMode(ctx, c)

  if (mode === 'plain') return c

  const pick = flavorForMotion(ctx, c, seed)
  if (mode === 'refine') {
    return applyFlavor(c, pick)
  }

  return applyFlavor(c, pick)
}

/** @param {string} seed @param {EnrichCtx} [ctx] */
export function enrichRetracePhrase(seed, ctx = {}) {
  if (hashPick(`${seed}|retrace-plain`, ['plain', 'plain', 'accent']) === 'plain') {
    return 'then trace back'
  }
  const pick = flavorForMotion(
    { ...ctx, stepIndex: 0, technique: ctx.technique || 'stroke' },
    'trace back',
    seed
  )
  const f = FLAVORS[pick.flavor]
  return f?.retrace || 'then trace back'
}
