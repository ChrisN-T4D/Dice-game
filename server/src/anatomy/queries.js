import { openDb } from '../db.js'
import {
  sortRegions,
  sortSubRegions,
  sortZones,
} from '../../../src/data/anatomy/display-order.js'
import zoneProfiles from '../../../src/data/anatomy/profiles/index.js'
import { parseSequenceMeta } from '../../../src/data/anatomy/actions/_makeSequenceAction.js'
import {
  computePerceivedStimulation,
  computeSequenceStimulation,
  stimulationBand,
} from '../../../src/data/anatomy/stimulation-math.js'

const ZONE_SUMMARY_COLS = `
  z.id,
  z.display_name,
  z.parent_id,
  z.region_id,
  z.sub_region_id,
  z.sensitivity_score,
  sl.code AS sensitivity,
  z.body_region_type
`

function mapTechniques(rows) {
  return rows.map((r) => r.code)
}

function loadZoneProfiles(db, zoneId) {
  const topology = db
    .prepare('SELECT * FROM zone_topology WHERE zone_id = ?')
    .get(zoneId)
  const stimulation = db
    .prepare('SELECT * FROM zone_stimulation WHERE zone_id = ?')
    .get(zoneId)
  const techniques = db
    .prepare(
      `SELECT t.code FROM zone_stimulation_techniques zst
       JOIN techniques t ON t.id = zst.technique_id
       WHERE zst.zone_id = ? ORDER BY zst.sort_order`
    )
    .all(zoneId)
  const musculoskeletal = db
    .prepare('SELECT * FROM zone_musculoskeletal WHERE zone_id = ?')
    .get(zoneId)
  const tickle = db.prepare('SELECT * FROM zone_tickle WHERE zone_id = ?').get(zoneId)
  const orientations = db
    .prepare('SELECT orientation FROM zone_orientations WHERE zone_id = ?')
    .all(zoneId)
    .map((r) => r.orientation)

  return {
    topology: topology
      ? {
          surface_area: topology.surface_area,
          curvature: topology.curvature,
          flexibility: topology.flexibility,
          depth: topology.depth,
          shape: topology.shape,
          contact_extent: topology.contact_extent,
          typical_contact_fu: topology.typical_contact_fu,
          max_contact_fu: topology.max_contact_fu,
        }
      : null,
    stimulation: stimulation
      ? {
          erogenous_priority: stimulation.erogenous_priority,
          sensitivity_to_pressure: stimulation.sensitivity_to_pressure,
          sensitivity_to_friction: stimulation.sensitivity_to_friction,
          sensitivity_to_teeth: stimulation.sensitivity_to_teeth,
          sensitivity_to_mouth: stimulation.sensitivity_to_mouth,
          sensitivity_to_hand: stimulation.sensitivity_to_hand,
          primary_techniques: mapTechniques(techniques),
        }
      : null,
    musculoskeletal: musculoskeletal
      ? {
          muscle_massagability: musculoskeletal.muscle_massagability,
          muscle_tension_level: musculoskeletal.muscle_tension_level,
          skin_texture: musculoskeletal.skin_texture,
          fat_density: musculoskeletal.fat_density,
          bone_proximity: musculoskeletal.bone_proximity,
          skin_thickness: musculoskeletal.skin_thickness,
        }
      : null,
    tickle: tickle
      ? {
          tickle_sensitivity: tickle.tickle_sensitivity,
          tickle_preference: tickle.tickle_preference,
          tickle_zone_type: tickle.tickle_zone_type,
          tickle_texture: tickle.tickle_texture,
          tickle_response: tickle.tickle_response,
        }
      : null,
    orientations,
  }
}

function rowToZoneSummary(row) {
  return {
    id: row.id,
    display_name: row.display_name,
    parent_id: row.parent_id,
    region: row.region_id,
    subRegion: row.sub_region_id,
    sensitivity: row.sensitivity,
    sensitivity_score: row.sensitivity_score,
    bodyRegionType: row.body_region_type,
  }
}

export function getZoneById(id) {
  const db = openDb()
  const row = db
    .prepare(
      `SELECT ${ZONE_SUMMARY_COLS}, z.description
       FROM zones z
       JOIN sensitivity_levels sl ON sl.id = z.sensitivity_level_id
       WHERE z.id = ?`
    )
    .get(id)
  if (!row) return null
  const profiles = loadZoneProfiles(db, id)
  return {
    ...rowToZoneSummary(row),
    description: row.description,
    orientation: profiles.orientations.length === 1 ? profiles.orientations[0] : profiles.orientations,
    ...profiles,
  }
}

export function listZones({ orientation, region, subRegion, parentId, limit = 100, offset = 0 } = {}) {
  const db = openDb()
  const clauses = ['1=1']
  const params = []

  if (orientation === 'male' || orientation === 'female') {
    clauses.push(
      `EXISTS (SELECT 1 FROM zone_orientations zo WHERE zo.zone_id = z.id AND zo.orientation = ?)`
    )
    params.push(orientation)
  }
  if (region) {
    clauses.push('z.region_id = ?')
    params.push(region)
  }
  if (subRegion) {
    clauses.push('z.sub_region_id = ?')
    params.push(subRegion)
  }
  if (parentId === 'null' || parentId === '') {
    clauses.push('z.parent_id IS NULL')
  } else if (parentId) {
    clauses.push('z.parent_id = ?')
    params.push(parentId)
  }

  const lim = Math.min(Math.max(1, Number(limit) || 100), 500)
  const off = Math.max(0, Number(offset) || 0)

  const sql = `
    SELECT ${ZONE_SUMMARY_COLS}
    FROM zones z
    JOIN sensitivity_levels sl ON sl.id = z.sensitivity_level_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY z.region_id, z.sub_region_id, z.display_name
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(sql).all(...params, lim, off)
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS n FROM zones z WHERE ${clauses.join(' AND ')}`
    )
    .get(...params)

  return {
    items: rows.map(rowToZoneSummary),
    total: countRow.n,
    limit: lim,
    offset: off,
  }
}

export function getZoneChildren(parentId) {
  return listZones({ parentId, limit: 200 })
}

export function getPositionByNumber(positionNumber) {
  const db = openDb()
  const row = db.prepare('SELECT * FROM positions WHERE position_number = ?').get(positionNumber)
  return row || null
}

export function getPositionZones(positionNumber) {
  const db = openDb()
  const rows = db
    .prepare(
      `SELECT pz.role, ${ZONE_SUMMARY_COLS}
       FROM position_zones pz
       JOIN zones z ON z.id = pz.zone_id
       JOIN sensitivity_levels sl ON sl.id = z.sensitivity_level_id
       WHERE pz.position_number = ?
       ORDER BY pz.role, z.display_name`
    )
    .all(positionNumber)
  return rows.map((r) => ({
    role: r.role,
    zone: rowToZoneSummary(r),
  }))
}

export function healthCheck() {
  const db = openDb()
  const zones = db.prepare('SELECT COUNT(*) AS n FROM zones').get()
  return { ok: true, zoneCount: zones.n, dbPath: process.env.ANATOMY_DB_PATH || 'default' }
}

/**
 * Nested region → sub_region → zones for admin tree navigation.
 * @param {{ orientation?: 'male'|'female'|'all' }} opts
 */
function parseActionMeta(raw) {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function profileLikeForZone(zoneId) {
  const p = zoneProfiles[zoneId]
  if (!p) return {}
  return {
    stimulation: p.stimulation,
    topology: p.topology,
    sensitivity_score: p.sensitivity_score,
    techniques: p.techniques,
  }
}

function profilesForSequence(metaObj) {
  const profilesByZone = {}
  for (const zid of metaObj.sequence_zones || []) {
    profilesByZone[zid] = profileLikeForZone(zid)
  }
  return profilesByZone
}

function mapActionRow(r, zoneLike = null, opts = {}) {
  const metaObj = parseActionMeta(r.meta)
  const isSequence = metaObj.action_kind === 'sequence'
  const stimulation = JSON.parse(r.stimulation || '{}')
  const contact = metaObj.contact || null
  const also_stimulates = metaObj.also_stimulates || []
  const spillover_weight = metaObj.spillover_weight || null
  const stimulator = metaObj.stimulator || null
  const base = {
    id: r.id,
    zone_id: r.zone_id,
    instruction: r.instruction,
    technique: r.technique_code,
    stimulator,
    modality: r.modality_code,
    display_name: r.display_name,
    erogenous_weight: r.erogenous_weight,
    intensity: r.intensity,
    sort_order: r.sort_order,
    stimulation,
    contact,
    also_stimulates,
    spillover_weight,
    meta: Object.keys(metaObj).length ? metaObj : null,
    action_kind: isSequence ? 'sequence' : 'single',
    sequence_ref: Boolean(opts.sequence_ref),
    anchor_zone_id: metaObj.anchor_zone_id || (isSequence ? r.zone_id : null),
    sequence_zones: metaObj.sequence_zones || null,
    sequence_steps: metaObj.sequence_steps || null,
    instruction_parts: metaObj.instruction_parts || null,
  }
  if (!zoneLike) return base
  const action = { ...base, contact: contact || {}, meta: metaObj }
  const breakdown = isSequence
    ? computeSequenceStimulation(action, profilesForSequence(metaObj))
    : computePerceivedStimulation(action, zoneLike)
  return {
    ...base,
    contact,
    stimulationBreakdown: breakdown,
    perceived_stimulation: breakdown.S,
    stimulation_band: stimulationBand(breakdown.S),
  }
}

export function getAnatomyHierarchy({ orientation = 'all' } = {}) {
  const db = openDb()
  const orientFilter =
    orientation === 'male' || orientation === 'female'
      ? `AND EXISTS (
          SELECT 1 FROM zone_orientations zo
          WHERE zo.zone_id = z.id AND zo.orientation = ?
        )`
      : ''
  const orientParam = orientation === 'male' || orientation === 'female' ? [orientation] : []

  const regions = db
    .prepare('SELECT id, display_name FROM regions ORDER BY id')
    .all()

  const subRows = db
    .prepare(
      `SELECT id, region_id, display_name, definition
       FROM sub_regions ORDER BY region_id, id`
    )
    .all()

  const zoneSql = `
    SELECT z.id, z.display_name, z.region_id, z.sub_region_id, z.parent_id,
           z.sensitivity_score, sl.code AS sensitivity,
           CASE WHEN z.description IS NOT NULL AND length(trim(z.description)) >= 40 THEN 1 ELSE 0 END AS has_description,
           CASE WHEN EXISTS (SELECT 1 FROM zone_topology t WHERE t.zone_id = z.id) THEN 1 ELSE 0 END AS has_topology,
           CASE WHEN EXISTS (SELECT 1 FROM zone_stimulation s WHERE s.zone_id = z.id) THEN 1 ELSE 0 END AS has_stimulation,
           CASE WHEN EXISTS (SELECT 1 FROM zone_musculoskeletal m WHERE m.zone_id = z.id) THEN 1 ELSE 0 END AS has_musculoskeletal,
           CASE WHEN EXISTS (SELECT 1 FROM zone_tickle tk WHERE tk.zone_id = z.id) THEN 1 ELSE 0 END AS has_tickle,
           (SELECT erogenous_priority FROM zone_stimulation s WHERE s.zone_id = z.id) AS erogenous_priority
    FROM zones z
    JOIN sensitivity_levels sl ON sl.id = z.sensitivity_level_id
    WHERE 1=1 ${orientFilter}
  `
  const zoneRows =
    orientParam.length > 0
      ? db.prepare(zoneSql).all(...orientParam)
      : db.prepare(zoneSql).all()

  const orientRows = db
    .prepare('SELECT zone_id, orientation FROM zone_orientations')
    .all()
  const orientByZone = new Map()
  for (const r of orientRows) {
    if (!orientByZone.has(r.zone_id)) orientByZone.set(r.zone_id, [])
    orientByZone.get(r.zone_id).push(r.orientation)
  }

  const zonesBySub = new Map()
  for (const z of zoneRows) {
    const key = `${z.region_id}:${z.sub_region_id || ''}`
    if (!zonesBySub.has(key)) zonesBySub.set(key, [])
    const profileComplete =
      z.has_description &&
      z.has_topology &&
      z.has_stimulation &&
      z.has_musculoskeletal &&
      z.has_tickle
    zonesBySub.get(key).push({
      id: z.id,
      display_name: z.display_name,
      parent_id: z.parent_id,
      sensitivity: z.sensitivity,
      sensitivity_score: z.sensitivity_score,
      erogenous_priority: z.erogenous_priority,
      profileComplete: !!profileComplete,
      orientations: orientByZone.get(z.id) || [],
    })
  }

  const actionCountByZone = countActionsByZone()

  const subsByRegion = new Map()
  for (const sr of subRows) {
    if (!subsByRegion.has(sr.region_id)) subsByRegion.set(sr.region_id, [])
    const key = `${sr.region_id}:${sr.id}`
    const zones = zonesBySub.get(key) || []
    const zonesWithActions = zones.map((z) => {
      const total = actionCountByZone.get(z.id) || 0
      return {
        ...z,
        actionCount: total,
        actionCountModalityBreakdown: countActionsByModality(z.id),
      }
    })
    subsByRegion.get(sr.region_id).push({
      id: sr.id,
      display_name: sr.display_name,
      definition: sr.definition,
      zoneCount: zonesWithActions.length,
      zones: sortZones(sr.id, zonesWithActions),
    })
  }

  const tree = sortRegions(
    regions.map((r) => {
      const subRegions = sortSubRegions(
        r.id,
        (subsByRegion.get(r.id) || []).filter((sr) => sr.zoneCount > 0)
      )
      const zoneCount = subRegions.reduce((n, sr) => n + sr.zoneCount, 0)
      const profileCompleteCount = subRegions.reduce(
        (n, sr) => n + sr.zones.filter((z) => z.profileComplete).length,
        0
      )
      return {
        id: r.id,
        display_name: r.display_name,
        zoneCount,
        profileCompleteCount,
        subRegions,
      }
    }).filter((r) => r.zoneCount > 0)
  )

  const profileCompleteCount = tree.reduce((n, r) => n + r.profileCompleteCount, 0)

  return {
    orientation,
    zoneCount: zoneRows.length,
    profileCompleteCount,
    regions: tree,
  }
}

/**
 * Load stimulation actions for a specific zone (normalized rows).
 */
export function loadZoneActions(zoneId) {
  return getZoneActions(zoneId)
}

/**
 * Count actions per zone (for actionCount in hierarchy).
 */
export function countActionsByZone() {
  const db = openDb()
  const rows = db.prepare(`
    SELECT z.id, z.display_name,
          COUNT(sa.id) AS action_count
    FROM zones z
    LEFT JOIN stimulation_actions sa ON sa.zone_id = z.id
    GROUP BY z.id
    ORDER BY z.region_id, z.display_name
  `).all()

  return new Map(rows.map((r) => [r.id, r.action_count]))
}

/**
 * Count actions by modality for a given zone.
 */
export function countActionsByModality(zoneId) {
  const db = openDb()
  const rows = db.prepare(`
    SELECT mt.code AS modality_code, COUNT(sa.id) AS count
    FROM stimulation_actions sa
    JOIN modality_types mt ON mt.id = sa.modality_id
    WHERE sa.zone_id = ?
    GROUP BY mt.code
  `).all(zoneId)

  const byModality = {}
  for (const r of rows) {
    byModality[r.modality_code] = r.count
  }
  return byModality
}

/**
 * Get zone + its actions (for admin panel).
 * @param {string} zoneId
 * @param {{ includeActions?: boolean }} opts
 */
export function loadZoneWithActions(zoneId, { includeActions = false } = {}) {
  const zone = getZoneById(zoneId)
  if (!zone) {
    return null
  }

  const zoneActionCount = countActionsByModality(zoneId)
  const totalActionCount = Object.values(zoneActionCount).reduce((a, b) => a + b, 0)

  const actions = includeActions ? getZoneActions(zoneId) : []

  return {
    ...zone,
    actions,
    actionCount: {
      total: totalActionCount,
      modalityCount: zoneActionCount,
    },
  }
}

/**
 * Query actions for the stimulation_actions table (from 002_stimulation_actions.sql).
 * @param {{ zoneId?: string, modalityId?: number, limit?: number, offset?: number }} opts
 */
export function listZoneActions({ zoneId, modalityId, limit = 100, offset = 0 } = {}) {
  const db = openDb()
  const clauses = ['1=1']
  const params = []

  if (zoneId) {
    clauses.push('sa.zone_id = ?')
    params.push(zoneId)
  }
  if (modalityId) {
    clauses.push('sa.modality_id = ?')
    params.push(modalityId)
  }

  const lim = Math.min(Math.max(1, Number(limit) || 100), 500)
  const off = Math.max(0, Number(offset) || 0)

  const sql = `
    SELECT sa.*,
           z.display_name AS zone_display_name,
           t.code AS technique_code,
           mt.code AS modality_code
    FROM stimulation_actions sa
    JOIN zones z ON z.id = sa.zone_id
    JOIN techniques t ON t.id = sa.technique_id
    JOIN modality_types mt ON mt.id = sa.modality_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY sa.sort_order, sa.display_name, sa.instruction
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(sql).all(...params, lim, off)
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS n FROM stimulation_actions sa
       WHERE ${clauses.join(' AND ')}`
    )
    .get(...params)

  return {
    items: rows.map((r) => ({
      id: r.id,
      zone_id: r.zone_id,
      zone_display_name: r.zone_display_name,
      instruction: r.instruction,
      technique: r.technique_code,
      modality: r.modality_code,
      display_name: r.display_name,
      erogenous_weight: r.erogenous_weight,
      intensity: r.intensity,
      stimulation: JSON.parse(r.stimulation),
      meta: r.meta ? JSON.parse(r.meta) : null,
    })),
    total: countRow.n,
    limit: lim,
    offset: off,
  }
}

/**
 * Get the count of actions for a given zone (e.g., for admin UI progress tracking).
 * @param {string} zoneId
 * @param {{ modalityId?: number }} opts
 */
export function getZoneActionCount(zoneId, opts = {}) {
  const db = openDb()
  const modalityCondition = opts.modalityId
    ? `AND sa.modality_id = ${opts.modalityId}`
    : 'AND sa.modality_id IN (SELECT id FROM modality_types)'

  const sql = `
    SELECT COUNT(*) AS n
    FROM stimulation_actions sa
    JOIN modality_types mt ON sa.modality_id = mt.id
    WHERE sa.zone_id = ? ${modalityCondition}
  `
  const row = db.prepare(sql).get(zoneId)
  return row.n || 0
}

/**
 * Get all actions for a zone, including metadata (erogenous_weight, intensity, stimulation).
 * Used by AdminAnatomyExplorer for displaying action lists per zone.
 * @param {string} zoneId
 */
const ACTION_SELECT = `
  SELECT sa.*,
         t.code AS technique_code,
         mt.code AS modality_code,
         mt.sort_order AS modality_sort_order
  FROM stimulation_actions sa
  JOIN techniques t ON t.id = sa.technique_id
  JOIN modality_types mt ON mt.id = sa.modality_id
`

export function getZoneActions(zoneId) {
  const db = openDb()
  const zoneLike = getZoneById(zoneId)

  const direct = db
    .prepare(
      `${ACTION_SELECT}
       WHERE sa.zone_id = ?
       ORDER BY mt.sort_order, sa.sort_order, sa.display_name, sa.instruction`
    )
    .all(zoneId)

  const out = direct.map((r) => mapActionRow(r, zoneLike))

  const seqRows = db
    .prepare(
      `${ACTION_SELECT}
       WHERE json_extract(sa.meta, '$.action_kind') = 'sequence'
       ORDER BY mt.sort_order, sa.sort_order, sa.display_name`
    )
    .all()

  for (const r of seqRows) {
    const meta = parseActionMeta(r.meta)
    const zones = meta.sequence_zones || []
    const anchor = meta.anchor_zone_id || r.zone_id
    if (!zones.includes(zoneId) || anchor === zoneId) continue
    out.push(mapActionRow(r, zoneLike, { sequence_ref: true }))
  }

  return out
}
