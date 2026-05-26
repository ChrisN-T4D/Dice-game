/**
 * Keys for ensuring each zone action feels distinct (technique + stimulator + contact + channels).
 */

/** @param {object} action */
export function actionSensationKey(action) {
  const c = action.contact || {}
  const st = action.stimulation || {}
  return [
    action.technique,
    action.stimulator,
    c.footprint,
    c.coverage,
    st.pressure?.level,
    st.tempo?.level,
    st.friction?.level,
  ].join(':')
}

/** @param {object} action */
export function normalizeInstruction(action) {
  return (action.instruction || '')
    .replace(/\s*—\s*(lighter pressure|slower tempo|more friction|quicker rhythm|barely-there touch|deeper steady contact).*$/i, '')
    .trim()
}

/**
 * @param {object[]} actions
 * @returns {string[]}
 */
export function auditActionUniqueness(actions) {
  const issues = []
  const list = Array.isArray(actions) ? actions : []
  const sensation = new Map()
  const instructions = new Map()

  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    const sk = actionSensationKey(a)
    if (sensation.has(sk)) {
      issues.push(
        `action[${i}] repeats sensation profile of action[${sensation.get(sk)}] (${sk})`
      )
    } else {
      sensation.set(sk, i)
    }

    const ik = normalizeInstruction(a)
    if (instructions.has(ik)) {
      issues.push(
        `action[${i}] repeats instruction of action[${instructions.get(ik)}]`
      )
    } else {
      instructions.set(ik, i)
    }
  }

  return issues
}
