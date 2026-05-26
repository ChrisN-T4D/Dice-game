#!/usr/bin/env node
/**
 * Strict rubric audit for anatomy profile chunks (see PROFILE_SCHEMA.md).
 */
import { subRegionDecls } from '../src/data/anatomy/regions.js'
import zoneProfiles from '../src/data/anatomy/profiles/index.js'
import { auditZoneProfile } from '../src/data/anatomy/profile-audit.js'

const issues = []

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

for (const [zoneId, p] of Object.entries(zoneProfiles)) {
  const subRegionId = zoneSubRegion(zoneId)
  const { ok, issues: zoneIssues } = auditZoneProfile(p, { subRegionId })
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
console.log(`OK — ${Object.keys(zoneProfiles).length} profiles pass strict audit`)
