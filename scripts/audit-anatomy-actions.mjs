#!/usr/bin/env node
/**
 * Strict rubric audit for anatomy action chunks (see ACTION_SCHEMA.md).
 */
import { subRegionDecls } from '../src/data/anatomy/regions.js'
import { zoneActions } from '../src/data/anatomy/actions/index.js'
import zoneProfiles from '../src/data/anatomy/profiles/index.js'
import { auditZoneActions } from '../src/data/anatomy/action-audit.js'

function zoneSubRegion(zoneId) {
  for (const subs of Object.values(subRegionDecls)) {
    for (const [subId, decl] of Object.entries(subs)) {
      if ((decl.primary_anatomy_names || []).includes(zoneId)) {
        return subId
      }
    }
  }
  return null
}

const issues = []

for (const [zoneId, actions] of Object.entries(zoneActions)) {
  const subRegionId = zoneSubRegion(zoneId)
  const profile = zoneProfiles[zoneId]
  const { ok, issues: zoneIssues } = auditZoneActions(actions, {
    zoneId,
    zoneProfile: profile,
  })
  if (!ok) {
    for (const msg of zoneIssues) {
      issues.push(`${zoneId}${subRegionId ? ` (${subRegionId})` : ''}: ${msg}`)
    }
  }
}

if (issues.length) {
  console.error(`Found ${issues.length} issue(s):\n`)
  for (const i of issues) console.error('  -', i)
  process.exit(1)
}

const total = Object.values(zoneActions).reduce(
  (n, list) => n + (Array.isArray(list) ? list.length : 0),
  0
)
console.log(`OK — ${Object.keys(zoneActions).length} zones, ${total} actions pass strict audit`)
