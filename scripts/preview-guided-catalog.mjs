/**
 * Preview + sanity-check the Phase 1/2 action-catalog wiring in the guided
 * session builder.
 *
 *  - Prints the narrowed sub-zone + technique each coarse region now produces.
 *  - Asserts selection is deterministic (same rolls -> identical text).
 *  - Asserts unmapped regions fall back to the phase tables.
 *  - Asserts Phase 3 is unchanged by the catalog flag.
 *
 * Usage: node scripts/preview-guided-catalog.mjs
 * (registers a small alias loader so Vite's `@`/`phase3-data` resolve in Node)
 */
import { register } from 'node:module'
register('./_alias-loader.mjs', import.meta.url)

const { getPromptText } = await import('@/utils/promptHelper')
const { phase1And2Tables } = await import('@/data/tables')

let failures = 0
function check(label, cond) {
  if (!cond) {
    failures++
    console.log(`  FAIL: ${label}`)
  }
}

const NAMES = { 1: 'Sam', 2: 'Alex' }
// Receiver = partner 2. vulva-receiver: anatomy {1:penis(giver),2:vulva}.
const VULVA = { 1: 'penis', 2: 'vulva' }
const PENIS = { 1: 'vulva', 2: 'penis' }
const ON = { useCatalog: true }
const OFF = { useCatalog: false }

function run(phase, loc, act, anatomy, opts) {
  return getPromptText(phase, loc, act, 1, 2, NAMES, anatomy, opts)
}

function sample(title, phase, anatomy) {
  console.log(`\n=== ${title} ===`)
  for (let loc = 1; loc <= 20; loc++) {
    const region = phase1And2Tables[phase].locations[loc]
    const cat = run(phase, loc, 7, anatomy, ON)
    const base = run(phase, loc, 7, anatomy, OFF)
    const usedCatalog = cat.instruction !== base.instruction
    const tag = usedCatalog ? 'CATALOG' : 'fallback'
    console.log(`  [${tag}] roll ${String(loc).padStart(2)} (${region.slice(0, 34)})`)
    console.log(`     where: ${cat.where}`)
    console.log(`     say:   ${cat.shortInstruction}`)
  }
}

sample('Phase 1 - receiver: vulva', 1, VULVA)
sample('Phase 2 - receiver: vulva', 2, VULVA)
sample('Phase 1 - receiver: penis', 1, PENIS)
sample('Phase 2 - receiver: penis', 2, PENIS)

console.log('\n=== assertions ===')

// Determinism: same rolls -> identical output.
for (const [phase, loc, act, anat] of [
  [1, 19, 7, VULVA],
  [2, 17, 12, PENIS],
  [1, 6, 3, VULVA],
]) {
  const a = run(phase, loc, act, anat, ON)
  const b = run(phase, loc, act, anat, ON)
  check(`deterministic P${phase} loc${loc} act${act}`, JSON.stringify(a) === JSON.stringify(b))
}

// Unmapped region (Phase 1 roll 1 = "Lips") must fall back to the table text.
{
  const cat = run(1, 1, 7, VULVA, ON)
  const base = run(1, 1, 7, VULVA, OFF)
  check('unmapped P1 loc1 (Lips) falls back to table', cat.instruction === base.instruction)
}

// Mapped genital region differs from the table baseline (catalog actually used).
{
  const cat = run(1, 19, 7, VULVA, ON)
  const base = run(1, 19, 7, VULVA, OFF)
  check('mapped P1 loc19 (genitals) uses catalog', cat.instruction !== base.instruction)
  check('P1 loc19 vulva announces a female sub-zone', /clitoral|labia|introitus|mons|hood/i.test(cat.where))
}
{
  const cat = run(2, 17, 7, PENIS, ON)
  check('P2 loc17 penis announces a male sub-zone', /penis|glans|frenulum|foreskin|scrotum|shaft/i.test(cat.where))
}

// Phase 3 must be identical with or without the catalog flag.
{
  const on = run(3, 42, 5, VULVA, ON)
  const off = run(3, 42, 5, VULVA, OFF)
  check('Phase 3 unchanged by catalog flag', JSON.stringify(on) === JSON.stringify(off))
}

console.log('\n=== result ===')
if (failures) {
  console.log(`FAIL - ${failures} assertion(s) failed`)
  process.exit(1)
}
console.log('PASS - catalog wiring deterministic, mapped/fallback correct, Phase 3 intact')
