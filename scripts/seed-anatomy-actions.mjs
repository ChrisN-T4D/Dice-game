#!/usr/bin/env node
/**
 * Seed stimulation_actions from src/data/anatomy/actions/ (flat zone_id map).
 * Run after: npm run db:migrate && npm run db:seed
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { openDatabase, runTransaction } from '../server/src/sqlite-open.js'
import { zoneActions } from '../src/data/anatomy/actions/index.js'
import zoneProfiles from '../src/data/anatomy/profiles/index.js'
import { isSequenceAction } from '../src/data/anatomy/actions/_makeSequenceAction.js'
import {
  computePerceivedStimulation,
  computeSequenceStimulation,
} from '../src/data/anatomy/stimulation-math.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'server', 'db', 'anatomy.sqlite')

const TECHNIQUE_CODES = ['stroke', 'pressure', 'circle', 'tap', 'kiss']
const MODALITY_CODES = ['hand', 'mouth', 'teeth']

function techniqueIdForCode(code) {
  const idx = TECHNIQUE_CODES.indexOf(code)
  return idx >= 0 ? idx + 1 : 1
}

function modalityIdForCode(code) {
  const idx = MODALITY_CODES.indexOf(code)
  return idx >= 0 ? idx + 1 : 1
}

const db = openDatabase(dbPath)

let inserted = 0
let skipped = 0

runTransaction(db, () => {
  db.prepare('DELETE FROM stimulation_actions').run()

  const insAction = db.prepare(`
    INSERT INTO stimulation_actions (
      zone_id, sort_order, instruction, technique_id, modality_id,
      stimulation, intensity, erogenous_weight, meta, display_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insZoneModality = db.prepare(
    'INSERT OR IGNORE INTO zone_modalities (zone_id, modality_id) VALUES (?, ?)'
  )

  const zoneExists = db.prepare('SELECT 1 FROM zones WHERE id = ?')
  const usedSortKeys = new Set()

  function resolveSortOrder(zoneId, techniqueId, modalityId, requested) {
    let sortOrder = requested ?? 0
    for (;;) {
      const key = `${zoneId}:${techniqueId}:${modalityId}:${sortOrder}`
      if (!usedSortKeys.has(key)) {
        usedSortKeys.add(key)
        return sortOrder
      }
      sortOrder += 1
    }
  }

  for (const [zoneId, actions] of Object.entries(zoneActions)) {
    if (!Array.isArray(actions)) {
      console.warn(`Skip ${zoneId}: expected action array`)
      continue
    }
    if (!zoneExists.get(zoneId)) {
      console.warn(`Skip ${zoneId}: not in zones table`)
      skipped += actions.length
      continue
    }

    for (const action of actions) {
      if (!action?.instruction || !action.zone_id) {
        skipped++
        continue
      }
      if (!action.stimulation?.pressure?.level || !action.stimulation?.tempo?.level) {
        console.warn(`Skip ${action.zone_id}: missing pressure/tempo`, action.technique)
        skipped++
        continue
      }
      if (!action.contact?.footprint || !action.contact?.coverage) {
        console.warn(`Skip ${action.zone_id}: missing contact`, action.technique)
        skipped++
        continue
      }
      const profilesByZone = {}
      if (isSequenceAction(action)) {
        const meta =
          typeof action.meta === 'object' ? action.meta : JSON.parse(action.meta || '{}')
        for (const zid of meta.sequence_zones || []) {
          const p = zoneProfiles[zid]
          profilesByZone[zid] = p
            ? {
                stimulation: p.stimulation,
                topology: p.topology,
                sensitivity_score: p.sensitivity_score,
              }
            : {}
        }
      }
      const profile = zoneProfiles[action.zone_id]
      const zoneLike = profile
        ? { stimulation: profile.stimulation, topology: profile.topology, sensitivity_score: profile.sensitivity_score }
        : {}
      const { S } = isSequenceAction(action)
        ? computeSequenceStimulation(action, profilesByZone)
        : computePerceivedStimulation(action, zoneLike)
      const modId = modalityIdForCode(action.modality)
      insZoneModality.run(action.zone_id, modId)
      let metaObj = {}
      if (action.meta) {
        try {
          metaObj = typeof action.meta === 'string' ? JSON.parse(action.meta) : action.meta
        } catch {
          metaObj = { note: action.meta }
        }
      }
      metaObj.contact = action.contact
      metaObj.stimulator = action.stimulator
      if (action.also_stimulates?.length) metaObj.also_stimulates = action.also_stimulates
      if (action.spillover_weight) metaObj.spillover_weight = action.spillover_weight
      const techId = techniqueIdForCode(action.technique)
      const sortOrder = resolveSortOrder(action.zone_id, techId, modId, action.sort_order ?? 0)
      insAction.run(
        action.zone_id,
        sortOrder,
        action.instruction,
        techId,
        modId,
        JSON.stringify(action.stimulation),
        Math.max(10, Math.min(100, action.intensity ?? S)),
        action.erogenous_weight ?? 50,
        JSON.stringify(metaObj),
        action.display_name ?? null
      )
      inserted++
    }
  }
})

db.close()
console.log(`Actions seeded: ${inserted} inserted, ${skipped} skipped`)
console.log('Database:', dbPath)
