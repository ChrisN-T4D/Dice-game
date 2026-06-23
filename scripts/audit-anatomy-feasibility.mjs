/**
 * Feasibility audit runner — zones × actions movement/feasibility calculations.
 *
 *   node scripts/audit-anatomy-feasibility.mjs            # summary + issues
 *   node scripts/audit-anatomy-feasibility.mjs --matrix   # also print broad matrix
 *   node scripts/audit-anatomy-feasibility.mjs --json      # machine-readable
 */

import { runFeasibilityLoops, VIEW_CALIBRATION } from '../src/data/anatomy/feasibility/index.js'
import { BROAD_TECHNIQUES } from '../src/data/anatomy/feasibility/capability.js'

const args = new Set(process.argv.slice(2))
const showMatrix = args.has('--matrix')
const asJson = args.has('--json')

const { loop1, loop2, loop3, loop4 } = runFeasibilityLoops()

if (asJson) {
  console.log(JSON.stringify({ loop1: { ...loop1, matrix: undefined }, loop2, loop3, loop4 }, null, 2))
  process.exit(0)
}

const h = (s) => `\n${'='.repeat(72)}\n${s}\n${'='.repeat(72)}`
const sub = (s) => `\n${s}\n${'-'.repeat(s.length)}`

console.log(h('LOOP 0 — MAP CALIBRATION (geometry primary, FU table secondary)'))
for (const [view, cal] of Object.entries(VIEW_CALIBRATION)) {
  const pxPerFu = cal.scale ? (1 / cal.scale).toFixed(1) : '?'
  console.log(`  ${view.padEnd(16)} ~${pxPerFu} px/FU  (fitted to ${cal.samples} curated edge${cal.samples === 1 ? '' : 's'})`)
  for (const d of cal.disagreements.slice(0, 4)) {
    console.log(`       FU-table vs art: ${d.a}↔${d.b} — table ${d.curated}FU, measured ~${d.geomFu}FU (${d.ratio}×)`)
  }
}

console.log(h('LOOP 1 — BROAD FEASIBILITY (which verbs are possible on each zone)'))
console.log(`Zones: ${loop1.zoneCount}  ·  Verbs: ${BROAD_TECHNIQUES.join(', ')}`)
const definitional = loop1.impossible.length - loop1.notable.length
console.log(`Combinations checked: ${loop1.combos}  ·  impossible: ${loop1.impossible.length} (${definitional} definitional penetrate, ${loop1.notable.length} notable)`)
if (loop1.notable.length) {
  console.log(sub('Notable impossibilities (beyond "non-penetrable cannot be penetrated")'))
  for (const i of loop1.notable) {
    console.log(`  ✗ ${i.zoneId} × ${i.technique} — ${i.reasons.join('; ')}`)
  }
}
if (showMatrix) {
  console.log(sub('Capability matrix (✓ feasible / ✗ impossible)'))
  const pad = (s, n) => String(s).padEnd(n)
  console.log('  ' + pad('zone', 26) + BROAD_TECHNIQUES.map((t) => pad(t, 10)).join(''))
  for (const [zoneId, byTech] of Object.entries(loop1.matrix)) {
    const row = BROAD_TECHNIQUES.map((t) => pad(byTech[t].feasible ? '  ✓' : '  ✗', 10)).join('')
    console.log('  ' + pad(zoneId, 26) + row)
  }
}

console.log(h('LOOP 2 — SINGLE-ACTION FEASIBILITY (per-zone actions)'))
console.log(`Actions: ${loop2.total}  ·  ok: ${loop2.ok}  ·  suboptimal: ${loop2.suboptimal}  ·  infeasible: ${loop2.infeasible}`)
const l2err = loop2.results.filter((r) => r.level === 'infeasible')
const l2warn = loop2.results.filter((r) => r.level === 'suboptimal')
if (l2err.length) {
  console.log(sub('Infeasible single actions'))
  for (const r of l2err) {
    console.log(`  ✗ ${r.zoneId} · ${r.technique}/${r.stimulator}`)
    for (const it of r.issues.filter((i) => i.severity === 'error')) console.log(`       ${it.msg}`)
  }
}
if (l2warn.length) {
  console.log(sub(`Suboptimal single actions (${l2warn.length})`))
  for (const r of l2warn) {
    const msgs = r.issues.filter((i) => i.severity === 'warn').map((i) => i.msg)
    console.log(`  ~ ${r.zoneId} · ${r.technique}/${r.stimulator}: ${msgs.join(' | ')}`)
  }
}

console.log(h('LOOP 3 — MULTI-ZONE MOVEMENT FEASIBILITY (sequences)'))
console.log(`Sequences: ${loop3.total}  ·  ok: ${loop3.ok}  ·  suboptimal: ${loop3.suboptimal}  ·  infeasible: ${loop3.infeasible}`)
const hs = loop3.hopSources
console.log(`Hops resolved by: geometry ${hs.geometry} · curated-FU ${hs.curated} · estimate ${hs.estimate}`)
const l3err = loop3.results.filter((r) => r.level === 'infeasible')
const l3warn = loop3.results.filter((r) => r.level === 'suboptimal')
if (l3err.length) {
  console.log(sub('Infeasible sequences'))
  for (const r of l3err) {
    console.log(`  ✗ ${r.path}  [${r.display_name}]`)
    for (const it of r.issues.filter((i) => i.severity === 'error')) console.log(`       ${it.msg}`)
  }
}
if (l3warn.length) {
  console.log(sub(`Suboptimal sequences (${l3warn.length})`))
  for (const r of l3warn) {
    const msgs = r.issues.filter((i) => i.severity === 'warn').map((i) => i.msg)
    console.log(`  ~ ${r.path}: ${msgs.slice(0, 3).join(' | ')}${msgs.length > 3 ? ` (+${msgs.length - 3} more)` : ''}`)
  }
}

console.log(h('LOOP 4 — WORDING (do prompts read as real & capable?)'))
console.log(`Prompts: ${loop4.total}  ·  clean: ${loop4.ok}  ·  rough: ${loop4.rough}  ·  broken: ${loop4.broken}`)
const byCode = {}
for (const r of loop4.results) for (const it of r.issues) byCode[it.code] = (byCode[it.code] || 0) + 1
console.log(sub('Issue counts by type'))
for (const [code, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${code}`)

const w2 = loop4.results.filter((r) => r.issues.some((i) => i.code.startsWith('w2')))
if (w2.length) {
  console.log(sub(`Capability-in-text problems (${w2.length})`))
  for (const r of w2.slice(0, 12)) {
    const m = r.issues.filter((i) => i.code.startsWith('w2')).map((i) => i.msg)
    console.log(`  • ${r.zoneId} [${r.kind}]: ${m.join(' | ')}`)
    console.log(`      "${r.instruction.slice(0, 120)}…"`)
  }
}
const broken = loop4.results.filter((r) => r.level === 'broken')
if (broken.length) {
  console.log(sub(`Broken sentences (${broken.length})`))
  for (const r of broken.slice(0, 10)) {
    const m = r.issues.filter((i) => i.severity === 'error').map((i) => i.msg)
    console.log(`  ✗ ${r.zoneId}: ${m.join(' | ')}`)
  }
}
console.log(sub('Most-reused templated openers (verbatim across zones)'))
for (const o of loop4.repetition.openers.slice(0, 6)) {
  console.log(`  ${String(o.count).padStart(3)}× across ${o.zones} zones — "${o.phrase}…"`)
}
console.log(sub('Most-reused "sensation tails"'))
for (const t of loop4.repetition.tails.slice(0, 6)) {
  console.log(`  ${String(t.count).padStart(3)}× across ${t.zones} zones — "${t.phrase}"`)
}
const lowVar = loop4.variety.lowVariety
console.log(sub('Movement variety per zone'))
const avgTech = (loop4.variety.zones.reduce((s, z) => s + z.techniques, 0) / loop4.variety.zones.length).toFixed(1)
console.log(`  avg distinct techniques/zone: ${avgTech}  ·  zones with <2 movements: ${lowVar.length}`)
for (const z of lowVar.slice(0, 8)) console.log(`    • ${z.zoneId}: ${z.techniques} technique(s) over ${z.actions} actions`)
if (loop4.variety.lowRhythm.length) {
  console.log(`  prompts lacking a repeatable-rhythm cue in ${loop4.variety.lowRhythm.length} zone(s)`)
}

console.log(h('SUMMARY'))
console.log(`Loop 1: ${loop1.notable.length} notable impossible zone×verb combos (+${definitional} definitional)`)
console.log(`Loop 2: ${loop2.infeasible} infeasible / ${loop2.suboptimal} suboptimal of ${loop2.total} actions`)
console.log(`Loop 3: ${loop3.infeasible} infeasible / ${loop3.suboptimal} suboptimal of ${loop3.total} sequences`)
console.log(`Loop 4: ${loop4.broken} broken / ${loop4.rough} rough of ${loop4.total} prompts`)
