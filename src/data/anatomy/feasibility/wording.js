/**
 * Wording audit — do the action prompts read like real, capable instructions?
 *
 * Three passes of increasing specificity:
 *   W1 structure/grammar — artifacts that break the illusion of a real sentence
 *                          (broken capitalization, doubled words, dangling phrases,
 *                          nonsense fragments, missing terminal punctuation).
 *   W2 capability-in-text — the prose names a body part / motion the zone can't
 *                          actually receive (a palm at the cervix, a tongue on an
 *                          internal wall, violent verbs, teeth on delicate tissue).
 *   W3 naturalness/repetition — templated copy reused verbatim across many zones,
 *                          and "sensation tails" that contradict the zone.
 *
 * @see capability.js (mechanical feasibility), zone-traits.js
 */

import { zoneTraits } from './zone-traits.js'
import { MOUTH_UNREACHABLE_ZONES } from './technique-kinematics.js'

/** Phrases that read as filler/nonsense or anatomically wrong. */
const NONSENSE_FRAGMENTS = [
  { re: /\bwithout only\b/i, msg: '"without only …" is not meaningful' },
  { re: /\bat the boundary\b/i, msg: '"at the boundary" is vague filler' },
  { re: /\btongue['’]s sharp edge\b/i, msg: 'the tongue has no "sharp edge"' },
  { re: /\bas if asking how much is welcome\b/i, msg: 'stock "as if asking" filler' },
  { re: /\bif present\b.*\bif present\b/i, msg: 'repeated "if present" hedging' },
]

/** Words that imply force/non-consent — wrong tone for a capable, caring instruction. */
const VIOLENT_VERBS = /\b(ram|jam|punch|slam|pound|cram|wrench|yank hard|force(?:s|d|ful)?)\b/i

/** Penetration language that shouldn't appear on a non-penetrable zone. */
const PENETRATION_WORDS = /\b(inside the canal|into the canal|thrust|penetrat\w*|deep inside|come-hither|knuckles? deep|fornix|enter(?:s|ing)? (?:the )?(?:opening|canal|vagina))\b/i

/**
 * Names of parts/motions that cannot reach an internal-deep zone.
 * NB: "lips" is intentionally excluded — it collides with the labia landmark
 * ("inner lips"); mouth contact is covered by lick/suck/kiss instead.
 */
const EXTERNAL_PART_WORDS = /\b(palm|cupped|cup\b|fist|knuckle|thumb|tongue|lick|suck|kiss|toe)\b/i

/** Bone/muscle "sensation tails" that don't fit soft, boneless tissue. */
const BONE_WORDS = /\b(bone|grinding bone|near bone|sports-massage|muscle\b)\b/i

/** Tone words that imply mood but not a different *action* — to be avoided. */
const DECORATIVE_WORDS = /\b(greedily|hungrily|playfully|greedy|hungry|playful|predatory|lustily|naughtily|eagerly)\b/i

/** Pressure-class opener adverbs, used to flag modifier↔force mismatches. */
const FIRM_ADVERBS = new Set(['firmly', 'deeply'])
const LIGHT_ADVERBS = new Set(['lightly', 'softly', 'feather-lightly'])

/** Words signalling a sustained / repeatable rhythm (good — repetition stimulates). */
const RHYTHM_WORDS =
  /\b(circle|circles|circling|loop|loops|looping|ring|rings|pulse|pulses|drum|flutter|fluttering|buzz|vibrate|rhythm|beat|steady|repeat|repeated|passes|again|strokes?|taps?|over and over|come-hither|sustain|sustained|continuous)\b/i

/** @param {object} action @param {object} [profile] @param {{kind?:string}} [opts] */
export function wordingAudit(action, profile, opts = {}) {
  const text = action.instruction || ''
  const zoneId = action.zone_id
  const isSequence = opts.kind === 'sequence'
  const traits = zoneTraits(zoneId, profile)
  const issues = []
  const err = (code, msg) => issues.push({ severity: 'error', code, msg })
  const warn = (code, msg) => issues.push({ severity: 'warn', code, msg })

  // --- W1 structure / grammar ------------------------------------------------
  // A trailing [pause:Ns] tag is a legitimate terminator for sequence steps.
  const terminalCheck = text.replace(/\[pause:\d+s\]\s*$/i, '').trim()
  if (!/[.!?]\s*$/.test(terminalCheck)) warn('w1_no_terminal', 'instruction does not end with terminal punctuation')
  const dup = text.match(/\b(\w{3,})\s+\1\b/i)
  if (dup) warn('w1_doubled_word', `doubled word "${dup[1]} ${dup[1]}"`)
  // a lowercase adverb immediately followed by a capitalized word = broken splice
  const cap = text.match(/\b[a-z]+ly\s+[A-Z][a-z]+/)
  if (cap) err('w1_broken_caps', `broken capitalization mid-sentence: "${cap[0]}"`)
  // capital letter appearing after a comma/space mid-sentence (not after . ! ?)
  const midCap = text.match(/[a-z],?\s+[A-Z][a-z]{2,}/g)?.filter((s) => !/\b(I|OMG)\b/.test(s))
  for (const frag of NONSENSE_FRAGMENTS) {
    if (frag.re.test(text)) warn('w1_nonsense', frag.msg)
  }
  if (/\b(to|toward|onto|into|along|on|at|with)\s*[.!?]/i.test(text)) {
    warn('w1_dangling', 'dangling preposition before a stop')
  }

  // --- W2 capability in text -------------------------------------------------
  // Sequences legitimately traverse external→internal zones and name several
  // landmarks, so reach/penetration checks only apply to single-zone actions.
  const internalDeep = !isSequence && MOUTH_UNREACHABLE_ZONES.has(zoneId)
  if (internalDeep) {
    const m = text.match(EXTERNAL_PART_WORDS)
    if (m && !/\bfinger/i.test(m[0])) {
      err('w2_internal_part', `text names "${m[0]}" on internal-deep ${zoneId}, which only a finger can reach`)
    }
  }
  if (VIOLENT_VERBS.test(text)) {
    const m = text.match(VIOLENT_VERBS)
    // "never punched"/"not ramming" are OK (negated cautions)
    const negated = new RegExp(`\\b(never|not|no|avoid|without)\\b[^.]*${m[0]}`, 'i').test(text)
    if (!negated) warn('w2_violent', `forceful verb "${m[0]}" — soften the tone`)
  }
  // Internal-access zones (walls, cervix, prostate) are reached by a finger
  // going in, so come-hither / knuckle-depth language is correct there.
  if (!isSequence && !traits.penetrable && !MOUTH_UNREACHABLE_ZONES.has(zoneId) && PENETRATION_WORDS.test(text)) {
    const m = text.match(PENETRATION_WORDS)
    // "never penetrating", "not inside the opening" etc. are correct cautions.
    const negated = new RegExp(`\\b(never|not|no|avoid|without|don['’]?t)\\b[^.]*${m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)
    if (!negated) err('w2_penetration_nonpenetrable', `penetration language "${m[0]}" on non-penetrable ${zoneId}`)
  }
  if (/\b(bite|nibble|teeth|chew)\b/i.test(text) && traits.delicate && traits.ch.teeth <= 30) {
    const negated = /\b(no|never|not|avoid|without)\b[^.]*\b(bite|nibble|teeth)\b/i.test(text)
    if (!negated) warn('w2_teeth_delicate', `teeth language on delicate ${zoneId}`)
  }

  // --- W3 meaningful adjectives (no decorative tone; modifier matches force) ---
  const decorative = text.match(DECORATIVE_WORDS)
  if (decorative) warn('w3_decorative', `decorative tone word "${decorative[0]}" carries no action meaning`)
  const firstWord = text.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z-]/g, '')
  const p = action.stimulation?.pressure?.level
  if (p) {
    if (FIRM_ADVERBS.has(firstWord) && (p === 'low' || p === 'very_low')) {
      warn('w3_modifier_mismatch', `opens "${firstWord}" but the action is ${p} pressure`)
    }
    if (LIGHT_ADVERBS.has(firstWord) && p === 'high') {
      warn('w3_modifier_mismatch', `opens "${firstWord}" but the action is ${p} pressure`)
    }
  }

  // --- W2.5 bone/muscle tails on soft tissue ---
  const boneProx = profile?.musculoskeletal?.bone_proximity
  if (BONE_WORDS.test(text) && (boneProx === 'low' || traits.region === 'genitalia')) {
    const m = text.match(BONE_WORDS)
    const negated = /\b(no|never|not|avoid|without|skip|off the)\b[^.]*\b(bone|muscle)\b/i.test(text)
    if (!negated) warn('w2_bone_on_soft', `"${m[0]}" reference on soft/boneless ${zoneId}`)
  }

  const hasError = issues.some((i) => i.severity === 'error')
  const hasWarn = issues.some((i) => i.severity === 'warn')
  return { ok: !hasError, level: hasError ? 'broken' : hasWarn ? 'rough' : 'ok', issues }
}

const STOP = /(?<=[.!?])\s+/

/** First-sentence opener key (first 5 words, lowercased). */
function openerKey(text) {
  return text.split(/\s+/).slice(0, 5).join(' ').toLowerCase()
}
/** Last sentence (the "sensation tail"). */
function tailSentence(text) {
  const s = text.trim().split(STOP).filter(Boolean)
  return (s[s.length - 1] || '').replace(/\[pause:\d+s\]/i, '').trim()
}

/**
 * W3 — corpus-level repetition: how often each opener and tail is reused across
 * single actions, and which zones share an identical templated sentence.
 * @param {{zoneId:string, action:object}[]} entries
 */
export function repetitionReport(entries) {
  const openers = {}
  const tails = {}
  for (const { zoneId, action } of entries) {
    const ok = openerKey(action.instruction)
    const tk = tailSentence(action.instruction)
    ;(openers[ok] ||= { count: 0, zones: new Set() })
    openers[ok].count++
    openers[ok].zones.add(zoneId)
    if (tk) {
      ;(tails[tk] ||= { count: 0, zones: new Set() })
      tails[tk].count++
      tails[tk].zones.add(zoneId)
    }
  }
  const flatten = (o) =>
    Object.entries(o)
      .map(([k, v]) => ({ phrase: k, count: v.count, zones: v.zones.size }))
      .sort((a, b) => b.count - a.count)
  return { openers: flatten(openers), tails: flatten(tails), total: entries.length }
}

/**
 * Per-zone movement variety + repeatability: does a zone's action set span
 * distinct movements (interesting), and does each prompt read as a sustained,
 * repeatable rhythm (stimulating)?
 * @param {{zoneId:string, action:object}[]} entries
 */
export function varietyReport(entries) {
  const byZone = {}
  for (const { zoneId, action } of entries) {
    ;(byZone[zoneId] ||= { techniques: new Set(), verbs: new Set(), count: 0, noRhythm: 0 })
    const z = byZone[zoneId]
    z.count++
    if (action.technique) z.techniques.add(action.technique)
    const verb = (action.instruction || '').trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase()
    z.verbs.add(verb)
    if (!RHYTHM_WORDS.test(action.instruction || '')) z.noRhythm++
  }
  const zones = Object.entries(byZone).map(([zoneId, z]) => ({
    zoneId,
    actions: z.count,
    techniques: z.techniques.size,
    distinctOpeners: z.verbs.size,
    noRhythm: z.noRhythm,
  }))
  return {
    zones,
    lowVariety: zones.filter((z) => z.techniques < 2 && z.actions >= 3),
    lowRhythm: zones.filter((z) => z.noRhythm > 0),
  }
}
