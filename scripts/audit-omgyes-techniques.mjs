/**
 * Audits the OMGYES technique library + the wired technique-action catalog.
 *
 *  - Validates every female/male JSON entry has the required fields.
 *  - Confirms each male variant's `derived_from` points at a real female entry
 *    (anatomy-neutral pacing variants may stand alone).
 *  - Confirms the wired catalog (omgyes-techniques.js) only references real
 *    zone ids and builds without error.
 *  - Prints a coverage summary by family and receiver.
 *
 * Usage: node scripts/audit-omgyes-techniques.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const TECH = join(ROOT, 'src/data/techniques')

const REQUIRED = [
  'technique_id',
  'name',
  'receiver_anatomy',
  'category',
  'summary',
  'stepwise_structure',
  'related_zone_ids',
]

function loadEntries(sex) {
  const dir = join(TECH, sex, 'entries')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = readFileSync(join(dir, f), 'utf8')
      let json
      try {
        json = JSON.parse(raw)
      } catch (e) {
        throw new Error(`${sex}/${f}: invalid JSON — ${e.message}`)
      }
      return { file: f, sex, json }
    })
}

const female = loadEntries('female')
const male = loadEntries('male')
const femaleIds = new Set(female.map((e) => e.json.technique_id))

const problems = []

for (const { file, sex, json } of [...female, ...male]) {
  for (const k of REQUIRED) {
    if (json[k] == null || (Array.isArray(json[k]) && json[k].length === 0)) {
      problems.push(`${sex}/${file}: missing/empty "${k}"`)
    }
  }
  if (json.receiver_anatomy !== sex) {
    problems.push(`${sex}/${file}: receiver_anatomy="${json.receiver_anatomy}" != ${sex}`)
  }
}

const PACING = new Set(['pacing'])
for (const { file, json } of male) {
  const df = json.meta?.derived_from
  if (!df) {
    problems.push(`male/${file}: meta.derived_from missing`)
  } else if (!femaleIds.has(df) && !PACING.has(json.category)) {
    problems.push(
      `male/${file}: derived_from "${df}" is not a female technique_id (and not a pacing variant)`
    )
  }
}

// Wired catalog
const { omgyesTechniqueActions, omgyesByReceiver, omgyesByFamily } = await import(
  '../src/data/anatomy/actions/omgyes-techniques.js'
)
const { zoneActions } = await import('../src/data/anatomy/actions/index.js')
const realZones = new Set(Object.keys(zoneActions))

for (const a of omgyesTechniqueActions) {
  if (!realZones.has(a.zone_id)) {
    problems.push(`catalog: action references unknown zone "${a.zone_id}"`)
  }
}

console.log('=== OMGYES technique library ===')
console.log(`female entries: ${female.length}`)
console.log(`male entries:   ${male.length}`)

console.log('\n=== Wired technique-action catalog ===')
console.log(`total actions: ${omgyesTechniqueActions.length}`)
console.log(
  'by receiver:',
  Object.fromEntries(Object.entries(omgyesByReceiver).map(([k, v]) => [k, v.length]))
)
console.log(
  'by family:  ',
  Object.fromEntries(Object.entries(omgyesByFamily).map(([k, v]) => [k, v.length]))
)

console.log('\n=== Male variants ===')
for (const { json } of male.sort((a, b) => a.json.name.localeCompare(b.json.name))) {
  console.log(
    `  ${json.technique_id}  (← ${json.meta?.derived_from})\n     ${json.summary}`
  )
}

console.log('\n=== Result ===')
if (problems.length) {
  console.log(`FAIL — ${problems.length} problem(s):`)
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log('PASS — all entries valid, derivations resolve, catalog zones exist.')
