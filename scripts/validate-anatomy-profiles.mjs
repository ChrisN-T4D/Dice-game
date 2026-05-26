#!/usr/bin/env node
/**
 * Verify every canonical zone from regions.js has a profile chunk entry.
 */
import { subRegionDecls } from '../src/data/anatomy/regions.js'
import zoneProfiles from '../src/data/anatomy/profiles/index.js'

const seen = new Set()
for (const subs of Object.values(subRegionDecls)) {
  for (const decl of Object.values(subs)) {
    for (const id of decl.primary_anatomy_names || []) {
      if (id) seen.add(id)
    }
  }
}

const missing = []
const extra = new Set(Object.keys(zoneProfiles))

for (const id of seen) {
  extra.delete(id)
  if (!zoneProfiles[id]) missing.push(id)
}

let ok = true
if (missing.length) {
  ok = false
  console.error('Missing profiles for zones:', missing.join(', '))
}
if (extra.size) {
  console.warn('Profile keys not in taxonomy (ignored by seed):', [...extra].sort().join(', '))
}

console.log(`Canonical zones: ${seen.size}`)
console.log(`Profile entries: ${Object.keys(zoneProfiles).length}`)
if (ok) {
  console.log('OK — all canonical zones have profiles')
  process.exit(0)
} else {
  process.exit(1)
}
