/**
 * Parse anatomy / guided instructions for TTS (pauses between sequence steps).
 */

export const PAUSE_MARKER_RE = /\[pause:(\d+)s\]/gi

/** @param {string} text */
export function stripPauseMarkers(text) {
  if (!text) return ''
  return String(text).replace(PAUSE_MARKER_RE, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * @typedef {{ type: 'speak', text: string } | { type: 'pause', seconds: number }} InstructionPart
 */

/**
 * Split on [pause:Ns] markers. Spoken hold lines stay on the chunk before the marker.
 * @param {string} text
 * @returns {InstructionPart[]}
 */
export function parseInstructionWithPauses(text) {
  if (!text?.trim()) return []
  const re = /\[pause:(\d+)s\]/gi
  if (!re.test(text)) {
    return [{ type: 'speak', text: stripPauseMarkers(text) }]
  }

  const parts = /** @type {InstructionPart[]} */ ([])
  re.lastIndex = 0
  let lastIndex = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      const chunk = stripPauseMarkers(text.slice(lastIndex, m.index))
      if (chunk) parts.push({ type: 'speak', text: chunk })
    }
    const seconds = Math.min(120, Math.max(1, Number(m[1]) || 7))
    parts.push({ type: 'pause', seconds })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    const chunk = stripPauseMarkers(text.slice(lastIndex))
    if (chunk) parts.push({ type: 'speak', text: chunk })
  }
  return parts.length ? parts : [{ type: 'speak', text: stripPauseMarkers(text) }]
}

/** @param {InstructionPart[]} parts */
export function hasPauseParts(parts) {
  return parts.some((p) => p.type === 'pause')
}
