#!/usr/bin/env node
/**
 * Seed anatomy.sqlite from regions taxonomy + profile chunks + action chunks.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { openDatabase, runTransaction } from '../server/src/sqlite-open.js'
import { regions, subRegions, subRegionDecls } from '../src/data/anatomy/regions.js'
import zoneProfiles from '../src/data/anatomy/profiles/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'server', 'db', 'anatomy.sqlite')

const FEMALE_ONLY_SUBS = new Set(['clitoris_hierarchy', 'vagina_hierarchy'])
const MALE_ONLY_SUBS = new Set(['penis_hierarchy', 'scrotum_testicles'])

const TECHNIQUE_CODES = ['stroke', 'pressure', 'circle', 'tap', 'kiss']

const MODALITY_CODES = ['hand', 'mouth', 'teeth']

function humanize(id) {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function orientationsForSubRegion(subRegionId) {
  if (FEMALE_ONLY_SUBS.has(subRegionId)) return ['female']
  if (MALE_ONLY_SUBS.has(subRegionId)) return ['male']
  return ['male', 'female']
}

function sensitivityLevelId(code) {
  if (code === 'low') return 1
  if (code === 'high') return 3
  return 2
}

function techniqueIdForCode(code) {
  const idx = TECHNIQUE_CODES.indexOf(code)
  return idx >= 0 ? idx + 1 : 1
}

function modalityIdForCode(code) {
  const idx = MODALITY_CODES.indexOf(code)
  return idx >= 0 ? idx + 1 : 1
}

const DEFAULT_MODALITIES = ['hand', 'mouth']

function applyZoneProfile(db, zoneId, profile, stmts) {
  const {
    insTopology,
    insStimulation,
    insZoneTech,
    insMusculo,
    insTickle,
    defaultTopology,
    defaultStim,
    defaultMusculo,
    defaultTickle,
  } = stmts

  if (!profile) {
    defaultTopology.run(zoneId)
    defaultStim.run(zoneId)
    insZoneTech.run(zoneId, 1, 0)
    insZoneTech.run(zoneId, 2, 1)
    insZoneTech.run(zoneId, 3, 2)
    defaultMusculo.run(zoneId)
    defaultTickle.run(zoneId)
    return false
  }

  const topo = profile.topology || {}
  insTopology.run(
    zoneId,
    topo.surface_area || 'medium',
    topo.curvature || 'slight',
    topo.flexibility || 'flexible',
    topo.depth || 'shallow',
    topo.shape || 'flat',
    topo.contact_extent || null,
    topo.typical_contact_fu ?? null,
    topo.max_contact_fu ?? null
  )

  const stim = profile.stimulation || {}
  insStimulation.run(
    zoneId,
    stim.erogenous_priority ?? 50,
    stim.sensitivity_to_pressure || 'medium',
    stim.sensitivity_to_friction || 'medium',
    stim.sensitivity_to_teeth || 'low',
    stim.sensitivity_to_mouth || 'low',
    stim.sensitivity_to_hand || 'medium'
  )

  const techniques = profile.techniques || ['stroke', 'pressure', 'circle']
  techniques.forEach((code, i) => {
    insZoneTech.run(zoneId, techniqueIdForCode(code), i)
  })

  const ms = profile.musculoskeletal || {}
  insMusculo.run(
    zoneId,
    ms.muscle_massagability || 'medium',
    ms.muscle_tension_level || 'medium',
    ms.skin_texture || 'fine',
    ms.fat_density || 'medium',
    ms.bone_proximity || 'medium',
    ms.skin_thickness || 'medium'
  )

  const t = profile.tickle || {}
  insTickle.run(
    zoneId,
    t.tickle_sensitivity || 'medium',
    t.tickle_preference || 'medium',
    t.tickle_zone_type || 'flat',
    t.tickle_texture || 'fine',
    t.tickle_response || 'medium'
  )

  return true
}

const db = openDatabase(dbPath)
let profileApplied = 0
let profileMissing = 0

runTransaction(db, () => {
  db.prepare('DELETE FROM zone_stimulation_techniques').run()
  db.prepare('DELETE FROM zone_stimulation').run()
  db.prepare('DELETE FROM zone_topology').run()
  db.prepare('DELETE FROM zone_musculoskeletal').run()
  db.prepare('DELETE FROM zone_tickle').run()
  db.prepare('DELETE FROM zone_orientations').run()
  db.prepare('DELETE FROM position_zones').run()
  db.prepare('DELETE FROM phase12_location_aliases').run()
  db.prepare('DELETE FROM stimulation_actions').run()
  db.prepare('DELETE FROM zone_modalities').run()
  db.prepare('DELETE FROM modality_types').run()
  db.prepare('DELETE FROM zones').run()
  db.prepare('DELETE FROM sub_regions').run()
  db.prepare('DELETE FROM regions').run()
  db.prepare('DELETE FROM techniques').run()
  db.prepare('DELETE FROM scale_values').run()
  db.prepare('DELETE FROM sensitivity_levels').run()

  const insLevel = db.prepare(
    'INSERT INTO sensitivity_levels (id, code, sort_order) VALUES (?, ?, ?)'
  )
  ;[
    ['low', 1],
    ['medium', 2],
    ['high', 3],
  ].forEach(([code, order], i) => insLevel.run(i + 1, code, order))

  const insScale = db.prepare('INSERT OR IGNORE INTO scale_values (id, code) VALUES (?, ?)')
  const scales = [
    'small',
    'medium',
    'large',
    'slight',
    'moderate',
    'pronounced',
    'flexible',
    'rigid',
    'shallow',
    'deep',
    'flat',
    'convex',
    'concave',
    'fine',
    'coarse',
  ]
  scales.forEach((code, i) => insScale.run(i + 1, code))

  const insTech = db.prepare('INSERT INTO techniques (id, code) VALUES (?, ?)')
  TECHNIQUE_CODES.forEach((code, i) => insTech.run(i + 1, code))

  const insModality = db.prepare(
    'INSERT INTO modality_types (id, code, sort_order, contact_pad_fu, placement_accuracy) VALUES (?, ?, ?, ?, ?)'
  )
  const modalityDefaults = {
    hand: [1, 'high'],
    mouth: [1.5, 'medium'],
    teeth: [0.35, 'medium'],
  }
  MODALITY_CODES.forEach((code, i) => {
    const [pad, acc] = modalityDefaults[code] || [1, 'medium']
    insModality.run(i + 1, code, i, pad, acc)
  })

  const insZoneModality = db.prepare(
    'INSERT OR IGNORE INTO zone_modalities (zone_id, modality_id) VALUES (?, ?)'
  )

  const insRegion = db.prepare('INSERT INTO regions (id, display_name) VALUES (?, ?)')
  const regionNames = {
    genitalia: 'Genitalia',
    torso: 'Torso',
    back: 'Back',
    limbs: 'Limbs',
    head_neck: 'Head/Neck',
    other: 'Other',
  }
  for (const r of regions) {
    insRegion.run(r, regionNames[r] || humanize(r))
  }

  const insSub = db.prepare(
    'INSERT INTO sub_regions (id, region_id, display_name, definition) VALUES (?, ?, ?, ?)'
  )
  for (const [regionId, subs] of Object.entries(subRegions)) {
    for (const subId of subs) {
      const decl = subRegionDecls[regionId]?.[subId] || subRegionDecls.other?.[subId]
      const regId = decl?.parent_region || regionId
      insSub.run(subId, regId, humanize(subId), decl?.definition ?? null)
    }
  }

  const insZone = db.prepare(`
    INSERT INTO zones (
      id, display_name, parent_id, region_id, sub_region_id,
      sensitivity_level_id, sensitivity_score, body_region_type, description
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
  `)

  const insOrient = db.prepare(
    'INSERT INTO zone_orientations (zone_id, orientation) VALUES (?, ?)'
  )

  const defaultTopology = db.prepare(`
    INSERT INTO zone_topology (
      zone_id, surface_area, curvature, flexibility, depth, shape,
      contact_extent, typical_contact_fu, max_contact_fu
    ) VALUES (?, 'medium', 'slight', 'flexible', 'shallow', 'flat', 'modest', 2, 3)
  `)

  const defaultStim = db.prepare(`
    INSERT INTO zone_stimulation (
      zone_id, erogenous_priority, sensitivity_to_pressure, sensitivity_to_friction,
      sensitivity_to_teeth, sensitivity_to_mouth, sensitivity_to_hand
    ) VALUES (?, 50, 'medium', 'medium', 'low', 'low', 'medium')
  `)

  const insZoneTech = db.prepare(
    'INSERT INTO zone_stimulation_techniques (zone_id, technique_id, sort_order) VALUES (?, ?, ?)'
  )

  const defaultMusculo = db.prepare(`
    INSERT INTO zone_musculoskeletal (
      zone_id, muscle_massagability, muscle_tension_level, skin_texture,
      fat_density, bone_proximity, skin_thickness
    ) VALUES (?, 'medium', 'medium', 'fine', 'medium', 'medium', 'medium')
  `)

  const defaultTickle = db.prepare(`
    INSERT INTO zone_tickle (
      zone_id, tickle_sensitivity, tickle_preference, tickle_zone_type, tickle_texture, tickle_response
    ) VALUES (?, 'medium', 'medium', 'flat', 'fine', 'medium')
  `)

  const insTopology = db.prepare(`
    INSERT INTO zone_topology (
      zone_id, surface_area, curvature, flexibility, depth, shape,
      contact_extent, typical_contact_fu, max_contact_fu
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insStimulation = db.prepare(`
    INSERT INTO zone_stimulation (
      zone_id, erogenous_priority, sensitivity_to_pressure, sensitivity_to_friction,
      sensitivity_to_teeth, sensitivity_to_mouth, sensitivity_to_hand
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insMusculo = db.prepare(`
    INSERT INTO zone_musculoskeletal (
      zone_id, muscle_massagability, muscle_tension_level, skin_texture,
      fat_density, bone_proximity, skin_thickness
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

const insTickle = db.prepare(`
  INSERT INTO zone_tickle (
    zone_id, tickle_sensitivity, tickle_preference, tickle_zone_type, tickle_texture, tickle_response
  ) VALUES (?, ?, ?, ?, ?, ?)
`)

  const profileStmts = {
    insTopology,
    insStimulation,
    insZoneTech,
    insMusculo,
    insTickle,
    defaultTopology,
    defaultStim,
    defaultMusculo,
    defaultTickle,
  }

  const seen = new Set()

  for (const [regionId, subs] of Object.entries(subRegionDecls)) {
    for (const [subId, decl] of Object.entries(subs)) {
      const names = decl.primary_anatomy_names || []
      const defaultOrientations = orientationsForSubRegion(subId)
      const isGenital = regionId === 'genitalia' || decl.parent_region === 'genitalia'

      for (const zoneId of names) {
        if (!zoneId || seen.has(zoneId)) continue
        seen.add(zoneId)

        const regId = decl.parent_region || regionId
        const profile = zoneProfiles[zoneId]
        const levelId = profile
          ? sensitivityLevelId(profile.sensitivity)
          : 2
        const score = profile?.sensitivity_score ?? 50
        const displayName = profile?.display_name || humanize(zoneId)
        const description = profile?.description || null
        const orientations = profile?.orientations || defaultOrientations

        insZone.run(
          zoneId,
          displayName,
          regId,
          subId,
          levelId,
          score,
          isGenital ? 'genitalia' : regId,
          description
        )

        for (const o of orientations) insOrient.run(zoneId, o)

        for (const code of DEFAULT_MODALITIES) {
          insZoneModality.run(zoneId, modalityIdForCode(code))
        }

        if (applyZoneProfile(db, zoneId, profile, profileStmts)) {
          profileApplied++
        } else {
          profileMissing++
        }
      }
    }
  }

  console.log('Seeded zones:', seen.size)
  console.log('Profiles applied:', profileApplied, '| missing (defaults):', profileMissing)
})

db.close()
console.log('Seed complete:', dbPath)
