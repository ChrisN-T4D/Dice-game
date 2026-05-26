#!/usr/bin/env node
/**
 * Audit multi-zone sequence catalog (see ACTION_SCHEMA.md).
 */
import { sequenceCatalog } from '../src/data/anatomy/actions/sequences/index.js'
import zoneProfiles from '../src/data/anatomy/profiles/index.js'
import { auditSequenceCatalog } from '../src/data/anatomy/actions/sequence-audit.js'

const { ok, issues, count } = auditSequenceCatalog(sequenceCatalog, zoneProfiles)

if (!ok) {
  console.error(`Found ${issues.length} sequence issue(s):\n`)
  for (const i of issues) console.error('  -', i)
  process.exit(1)
}

console.log(`OK — ${count} sequence actions pass audit`)
