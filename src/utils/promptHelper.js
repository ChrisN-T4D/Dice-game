/**
 * Build prompt text (where, what, instruction) for a given phase and rolls.
 * Instruction is a single fluid phrase with partner names and anatomy-aware wording.
 * Uses admin edits (merged) when present so in-app edits apply in play.
 */
import { phase1And2Tables, phase3Modifiers } from '@/data/tables'
import { PHASE3_POSITIONS_LIST } from 'phase3-data'
import { mergePhase3Entry, mergePhase12Table } from '@/utils/adminEdits'

// -----------------------------------------------------------------------------
// Text helpers (partner names, anatomy substitution)
// -----------------------------------------------------------------------------
/** Substitute "the giver" / "the receiver" (and variants) with partner names in text. */
function withPartnerNames(text, giverName, receiverName) {
  if (!text || (!giverName && !receiverName)) return text
  let out = text
  if (giverName) {
    out = out.replace(/\bThe giver\b/g, giverName)
    out = out.replace(/\bthe giver\b/g, giverName)
  }
  if (receiverName) {
    out = out.replace(/\bthe receiver\b/g, receiverName)
    out = out.replace(/\byour partner\b/gi, receiverName)
  }
  return out
}

/** Labels for anatomy used in instructions (giver/receiver body parts). */
function anatomyLabel(anatomy) {
  return anatomy === 'vulva' ? 'vulva' : 'penis and scrotum'
}

/** Substitute anatomy-neutral words with partner-specific anatomy (giver = who is touching, receiver = who is receiving). */
function withAnatomy(text, giverAnatomy, receiverAnatomy) {
  if (!text) return text
  const giverPart = anatomyLabel(giverAnatomy)
  const receiverPart = anatomyLabel(receiverAnatomy)
  let out = text
  // "Use genitals" / "or genitals" = giver's body part (who is doing the action)
  out = out.replace(/\bUse genitals\b/gi, () => `Use your ${giverPart}`)
  out = out.replace(/\bor genitals\b/gi, () => `or your ${giverPart}`)
  return out
}

// -----------------------------------------------------------------------------
// getPromptText (main export)
// -----------------------------------------------------------------------------
/**
 * @param {number} phase - 1, 2, or 3
 * @param {number} locationRoll - for phase 1/2: location table index; for phase 3: position number (1–155)
 * @param {number} actionRoll - for phase 1/2: action table index; for phase 3: modifier table index (1–20)
 * @param {number} giver - 1 or 2
 * @param {number} receiver - 1 or 2
 * @param {{ 1?: string, 2?: string }} partnerNames - optional names for "Partner 1" / "Partner 2"
 * @param {{ 1?: string, 2?: string }} partnerAnatomy - optional 'penis' | 'vulva' per partner
 * @returns {{ where: string, what: string, instruction: string }}
 */
export function getPromptText(phase, locationRoll, actionRoll, giver, receiver, partnerNames = {}, partnerAnatomy = {}) {
  const name = (p) => (partnerNames[p] && partnerNames[p].trim()) || `Partner ${p}`
  const giverName = name(giver)
  const receiverName = name(receiver)
  const giverAnatomy = partnerAnatomy[giver] === 'vulva' ? 'vulva' : 'penis'
  const receiverAnatomy = partnerAnatomy[receiver] === 'vulva' ? 'vulva' : 'penis'

  if (phase === 1 || phase === 2) {
    const base = phase1And2Tables[phase]
    const t = base ? mergePhase12Table(base, phase) : null
    if (!t) return { where: '', what: '', instruction: '' }
    const loc = Math.max(1, Math.min(20, locationRoll || 1))
    const act = Math.max(1, Math.min(20, actionRoll || 1))
    let where = t.locations[loc] || ''
    // Anatomy-aware location: Phase 2 has vulva (16) vs penis (17); use the one that matches the receiver.
    if (phase === 2 && (loc === 16 || loc === 17)) {
      where = receiverAnatomy === 'vulva' ? (t.locations[16] || where) : (t.locations[17] || where)
    }
    // Phase 1 "Primary Genitals" (19): use receiver's anatomy and name.
    if (phase === 1 && loc === 19) {
      where = `${receiverName}'s ${anatomyLabel(receiverAnatomy)}`
    }
    const what = t.actions[act] || ''
    const whatWithAnatomy = withAnatomy(what, giverAnatomy, receiverAnatomy)
    const whatWithNames = withPartnerNames(whatWithAnatomy, giverName, receiverName)
    const focusPart = (phase === 1 && loc === 19) ? where : `${receiverName}'s ${where}`
    const instruction = where
      ? `${giverName}, focus on ${focusPart}. ${whatWithNames}`
      : whatWithNames
    return { where, what, instruction }
  }

  if (phase === 3) {
    const pos = Math.max(1, Math.min(155, locationRoll || 1))
    const mod = Math.max(1, Math.min(20, actionRoll || 1))
    const baseEntry = PHASE3_POSITIONS_LIST[pos]
    const entry = baseEntry ? mergePhase3Entry(baseEntry, pos) : null
    const where = entry ? (entry.name || `Position ${pos}`) : `Position ${pos}`
    const what = phase3Modifiers[mod] || ''
    const help = entry ? (entry.help || '') : ''
    const whatWithAnatomy = withAnatomy(what, giverAnatomy, receiverAnatomy)
    const helpWithAnatomy = withAnatomy(help, giverAnatomy, receiverAnatomy)
    const whatWithNames = withPartnerNames(whatWithAnatomy, giverName, receiverName)
    const helpWithNames = withPartnerNames(helpWithAnatomy, giverName, receiverName)
    const parts = [helpWithNames, whatWithNames].filter(Boolean)
    const instruction = parts.length
      ? `${giverName} leads. ${parts.join('. ')}`
      : `${giverName} leads.`
    return { where, what, instruction }
  }

  return { where: '', what: '', instruction: '' }
}
