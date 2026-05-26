/**
 * Shared grammar polish for single-zone and sequence instructions.
 */

/**
 * @param {string} text
 */
export function polishInstruction(text) {
  return text
    .replace(/\bThen then\b/gi, 'Then')
    .replace(/\s+on the ([^,]+),\s+on the \1\b/gi, ' on the $1')
    .replace(/\bat the vaginal opening,\s+with fingers\b/gi, 'at the vaginal opening—slip fingers')
    .replace(/,(\S)/g, ', $1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * @param {string} instruction
 * @param {number} maxLen
 */
export function trimInstructionToMax(instruction, maxLen) {
  if (instruction.length <= maxLen) return instruction
  const pauseMatch = instruction.match(/\[pause:\d+s\]\s*$/i)
  const pauseSuffix = pauseMatch ? pauseMatch[0].trim() : ''
  if (pauseSuffix) {
    const body = instruction.slice(0, instruction.length - pauseSuffix.length).replace(/\s+/g, ' ').trim()
    const budget = maxLen - pauseSuffix.length - 1
    if (budget > 40) {
      let trimmed = body
      while (trimmed.length > budget && trimmed.length > 40) {
        trimmed = trimmed.replace(/\s+\S*$/, '').trim()
      }
      if (trimmed.length <= budget) {
        return `${trimmed} ${pauseSuffix}`.trim()
      }
    }
  }
  const pauseIdx = instruction.lastIndexOf('[pause:')
  if (pauseIdx > 40) {
    const trimmed = instruction.slice(0, pauseIdx).replace(/\s+/g, ' ').trim()
    const pausePart = instruction.slice(pauseIdx).trim()
    if (trimmed.length + pausePart.length + 1 <= maxLen) {
      return `${trimmed} ${pausePart}`.trim()
    }
  }
  return instruction.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…'
}
