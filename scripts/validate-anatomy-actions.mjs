#!/usr/bin/env node
/**
 * Validate action chunks: schema fields + every authored zone exists in taxonomy.
 */
import { subRegionDecls } from '../src/data/anatomy/regions.js'
import { zoneActions } from '../src/data/anatomy/actions/index.js'
import { auditAction } from '../src/data/anatomy/action-audit.js'

const canonical = new Set()
for (const subs of Object.values(subRegionDecls)) {
  for (const decl of Object.values(subs)) {
    for (const id of decl.primary_anatomy_names || []) {
      if (id) canonical.add(id)
    }
  }
}

let issues = 0
let actionCount = 0

for (const [zoneId, actions] of Object.entries(zoneActions)) {
  if (!canonical.has(zoneId)) {
    console.error(`Unknown zone_id in actions: ${zoneId}`)
    issues++
    continue
  }
  if (!Array.isArray(actions)) {
    console.error(`${zoneId}: expected array, got ${typeof actions}`)
    issues++
    continue
  }
  for (let i = 0; i < actions.length; i++) {
    actionCount++
    const { ok, issues: msgs } = auditAction(actions[i], { zoneId })
    if (!ok) {
      for (const msg of msgs) {
        console.error(`  ${zoneId}[${i}]: ${msg}`)
      }
      issues += msgs.length
    }
  }
}

console.log(`Action entries: ${Object.keys(zoneActions).length} zones, ${actionCount} actions`)
if (issues > 0) {
  console.error(`Validation failed (${issues} issue(s))`)
  process.exit(1)
}
console.log('OK — all actions pass validation')
process.exit(0)
