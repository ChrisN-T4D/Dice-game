/**
 * Spoken first-turn role intros (session / phase 3 kickoff).
 */

export function formatFirstTurnIntro(phase, giverName, receiverName, rng) {
  const pick = (arr) => arr[Math.floor((rng || Math.random)() * arr.length)]
  if (phase === 3) {
    return pick([
      `First direction. ${giverName} leads, ${receiverName} follows.`,
      `Here is the first direction. ${giverName} leads, ${receiverName} follows.`,
      `Starting with ${giverName} leading and ${receiverName} following.`,
    ])
  }
  return pick([
    `First direction. ${giverName} is giver, ${receiverName} is receiver.`,
    `Here is the first direction. ${giverName} gives, ${receiverName} receives.`,
    `Starting with ${giverName} as giver and ${receiverName} as receiver.`,
  ])
}
