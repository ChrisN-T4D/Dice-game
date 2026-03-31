/**
 * Parse guided prompt "what" text: timed segments and suggested turn length.
 * getSuggestedTurnSecondsFromPrompt aligned with archive/legacy/guided-mode.js.
 */

export function getSuggestedTurnSecondsFromPrompt(text) {
  if (!text || typeof text !== 'string') return 0
  const t = text.replace(/^Partner\s+\d+\s*:\s*/i, '').trim()
  let suggested = 0

  const secMatches = t.match(/\b(\d+)\s*s(?:econds?)?\b|for\s+(\d+)\s*s(?:econds?)?/gi)
  if (secMatches) {
    let sum = 0
    secMatches.forEach((m) => {
      const n = parseInt(m.replace(/\D/g, ''), 10)
      if (!isNaN(n)) sum += n
    })
    if (sum > 0) suggested = Math.max(suggested, sum)
  }

  const timesMatch = t.match(/(\d+)\s+times|(eight|six|four|ten)\s+times/gi)
  if (timesMatch) {
    const wordToNum = { eight: 8, six: 6, four: 4, ten: 10 }
    timesMatch.forEach((m) => {
      const digit = m.match(/\d+/)
      const n = digit ? parseInt(digit[0], 10) : (wordToNum[m.split(/\s/)[0].toLowerCase()] || 0)
      if (n > 0) suggested = Math.max(suggested, n * 10)
    })
  }

  return suggested
}

/**
 * Parse the "what" prompt for timed segments (e.g. "30s eyes closed, 30s eyes open").
 * Returns array of { seconds, label, completionLabel? } for step-by-step voice prompts.
 */
export function parseTimedSteps(text) {
  if (!text || typeof text !== 'string') return []
  const t = text.replace(/^Partner\s+\d+\s*:\s*/i, '').trim()

  const singleWithContinue = t.match(/(?:^|:\s*)(?:for\s+)?(\d+)\s*s(?:econds?)?\s+(.+?)\s*;\s*then\s+continue/i)
  if (singleWithContinue) {
    const sec = parseInt(singleWithContinue[1], 10)
    let desc = singleWithContinue[2].trim().replace(/\s+/g, ' ')
    desc = desc.replace(/\s*while\s+.*$/i, '').trim()
    desc = desc.replace(/\s*;.*$/, '').trim()
    const label = desc ? `${sec} second${sec === 1 ? '' : 's'}, ${desc}` : `${sec} second${sec === 1 ? '' : 's'}`
    const completionLabel = desc ? `${desc} done` : `${sec} second${sec === 1 ? '' : 's'} done`
    return [{ seconds: sec, label, completionLabel }]
  }

  const parts = t.split(/\s*,\s*|\s+then\s+/i)
  const segments = []
  for (const part of parts) {
    const m = part.match(/^\s*(?:for\s+)?(\d+)\s*s(?:econds?)?\s*(?:of\s+)?(.+)?$/i)
    if (m) {
      const sec = parseInt(m[1], 10)
      let desc = (m[2] || '').trim().replace(/\s+/g, ' ')
      desc = desc.replace(/\s*;.*$/, '').trim()
      const label = desc ? `${sec} second${sec === 1 ? '' : 's'}, ${desc}` : `${sec} second${sec === 1 ? '' : 's'}`
      segments.push({ seconds: sec, label })
    }
  }
  return segments.length >= 2 ? segments : []
}
