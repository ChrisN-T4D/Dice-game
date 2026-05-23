/**
 * Imperative turn-start lines (replace generic "go / begin when ready").
 * Full prompt detail stays on screen; voice gives a short directive with partner names.
 */

const TURN_START_DIRECTIVE_TEMPLATES = [
  {
    id: 'turn_start_directive_1',
    text: '{giver}, follow the on-screen prompt for {receiver}—start with slow, attentive touch.',
    phases: [1, 2, 3],
  },
  {
    id: 'turn_start_directive_2',
    text: '{giver}, begin what is shown for {receiver}. Keep pressure light until they relax into it.',
    phases: [1, 2],
  },
  {
    id: 'turn_start_directive_3',
    text: '{giver}, when you are set, start the touch described on screen for {receiver}.',
    phases: [1, 2, 3],
  },
  {
    id: 'turn_start_directive_4',
    text: '{giver}, help {receiver} into the position on screen, then begin the modifier shown.',
    phases: [3],
  },
]

const WITH_WHERE_TEMPLATES = [
  {
    id: 'turn_start_directive_where_1',
    text: '{giver}, begin on {receiver}\'s {where} as described on screen—start slow and stay attentive.',
    phases: [1, 2],
  },
  {
    id: 'turn_start_directive_where_2',
    text: '{giver}, focus on {receiver}\'s {where}. Follow the on-screen detail at a calm pace.',
    phases: [1, 2],
  },
]

function pick(arr, rng) {
  return arr[Math.floor((rng || Math.random)() * arr.length)]
}

/**
 * @param {{ giver: string, receiver: string, where?: string, phase?: number }} ctx
 * @param {() => number} [rng]
 */
export function formatTurnStartDirective(ctx, rng) {
  const phase = ctx.phase ?? 1
  const giver = ctx.giver || 'Partner 1'
  const receiver = ctx.receiver || 'Partner 2'
  const where = (ctx.where || '').trim()

  let pool = TURN_START_DIRECTIVE_TEMPLATES.filter((t) => t.phases.includes(phase))
  if (where && phase !== 3) {
    pool = [...WITH_WHERE_TEMPLATES.filter((t) => t.phases.includes(phase)), ...pool]
  }
  const entry = pick(pool, rng)
  let text = entry.text
    .replace(/\{giver\}/g, giver)
    .replace(/\{receiver\}/g, receiver)
    .replace(/\{where\}/g, where || 'body')
  return { id: entry.id, text }
}

function substituteTurnStartTemplate(text) {
  return text
    .replace(/\{giver\}/g, 'Partner 1')
    .replace(/\{receiver\}/g, 'Partner 2')
    .replace(/\{where\}/g, 'body')
}

export const TURN_START_DIRECTIVE_PHRASES = [
  ...TURN_START_DIRECTIVE_TEMPLATES,
  ...WITH_WHERE_TEMPLATES,
].map(({ id, text }) => ({ id, text }))

/** Sample names for pre-baked WAV files (runtime uses formatTurnStartDirective + phrase id lookup). */
export const TURN_START_DIRECTIVE_WAV_PHRASES = TURN_START_DIRECTIVE_PHRASES.map(({ id, text }) => ({
  id,
  text: substituteTurnStartTemplate(text),
}))

/** @deprecated Use formatTurnStartDirective */
export const TURN_BEGINS_PHRASES = TURN_START_DIRECTIVE_WAV_PHRASES

export function getTurnStartDirectiveTexts(phase, giverName, receiverName, where, rng) {
  const { text } = formatTurnStartDirective(
    { giver: giverName, receiver: receiverName, where, phase },
    rng
  )
  return [text]
}
