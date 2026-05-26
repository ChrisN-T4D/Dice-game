/**
 * Normalize safety notes for guided / TTS delivery.
 */

/** Short spoken safety for sequence openers (one line max). */
const SEQUENCE_SAFETY = {
  base_of_neck: 'Keep off the front of the throat.',
  neck: 'Stay on the sides or nape, not the windpipe.',
  throat: 'Never press the centered windpipe.',
  spine: 'Stay off the bony spine.',
  lower_back: 'Avoid hard pressure on the spine.',
  knees: 'Circle around the kneecap, not on the bone.',
  clitoral_hood: 'If the hood resists, ease off.',
}

/** @param {string} text @param {string} [zoneId] */
export function safetyNoteForSpeech(text, zoneId) {
  if (zoneId && SEQUENCE_SAFETY[zoneId]) return SEQUENCE_SAFETY[zoneId]
  if (!text?.trim()) return ''
  let t = text.trim().replace(/\s+/g, ' ').replace(/—/g, ',')
  if (!/[.!?]$/.test(t)) t += '.'
  return t
}