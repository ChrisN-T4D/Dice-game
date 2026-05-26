/**
 * Grammar checks for composed sequence instructions.
 */

/** @param {string} instr */
export function grammarIssuesForInstruction(instr) {
  const issues = []
  if (!instr?.trim()) return ['empty instruction']

  if (/\bthen in (?:one finger stroke|a short sweep|a soft kiss) ease onto\b/i.test(instr)) {
    issues.push('awkward micro hop ("then in one finger stroke ease onto")')
  }
  if (/\b[A-Z][a-z]+ing (?:lightly|slowly|gently|firmly|deeply), then in \b/i.test(instr)) {
    issues.push('gerund + "then in"')
  }
  if (
    /\b(stroking|tapping|kissing|tracing|dragging|parting|squeezing|kneading|circling|pressing|feathering|fluttering|making|giving|resting|rolling|wrapping)\b[^.]{0,50}, (?:work from|then shift to)\b/i.test(
      instr
    )
  ) {
    issues.push('gerund before "work from" or "then shift to"')
  }
  if (/\bthrough the [^.]+ and from the\b/i.test(instr)) {
    issues.push('awkward sweep ("through X and from Y")')
  }
  if (/\.\s+then [a-z]/.test(instr)) {
    issues.push('sentence starts with lowercase "then"')
  }
  if (/\b(toward|to|at|on|along|through|into)\s*\./i.test(instr)) {
    issues.push('dangling preposition before period')
  }
  if (/\bfinish with…/i.test(instr)) {
    issues.push('truncated ending')
  }
  if (/\bshift to the (deep dome|firm dome)\b/i.test(instr)) {
    issues.push('shift to deep dome')
  }
  if (/\bease onto[^.]{10,120}ease onto/i.test(instr)) {
    issues.push('duplicate "ease onto"')
  }
  if (/\b,([a-z])/i.test(instr)) {
    issues.push('missing space after comma')
  }
  if (/\bThen then\b/i.test(instr)) {
    issues.push('duplicate "Then then"')
  }

  return issues
}

/** @param {string} instr */
export function hasGrammarIssues(instr) {
  return grammarIssuesForInstruction(instr).length > 0
}
