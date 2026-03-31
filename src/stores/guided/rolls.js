/** Phase 3: two d20s → position 1–156; clamped to 1–155 to match PHASE3_POSITIONS_LIST. */

export function rollD20() {
  return Math.floor(Math.random() * 20) + 1
}

export function rollPhase3Position() {
  const a = rollD20()
  const b = rollD20()
  return Math.min(155, ((a - 1) * 20 + b - 1) % 156 + 1)
}
