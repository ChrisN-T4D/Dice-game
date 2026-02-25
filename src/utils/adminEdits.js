/**
 * Admin edits: persist description/text overrides and optional images in localStorage.
 * Merged data is used by promptHelper and the game so edits apply in play.
 */

// -----------------------------------------------------------------------------
// Storage keys
// -----------------------------------------------------------------------------
const KEY_PHASE3 = 'adminPhase3Edits'
const KEY_PHASE12 = 'adminPhase12Edits'
const KEY_PHASE12_IMAGES = 'adminPhase12Images'

// -----------------------------------------------------------------------------
// Helpers (localStorage read/write)
// -----------------------------------------------------------------------------
function readJson(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (_) {
    return fallback
  }
}

function writeJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (_) {}
}

// -----------------------------------------------------------------------------
// Phase 3: position edits (name, help, description)
// -----------------------------------------------------------------------------
/** Get saved Phase 3 edits for a position. */
export function getPhase3Edits(position) {
  const data = readJson(KEY_PHASE3)
  return data[String(position)] || null
}

/** Save Phase 3 edits for a position. { name?, help?, description? } */
export function savePhase3Entry(position, fields) {
  const data = readJson(KEY_PHASE3)
  const key = String(position)
  if (!data[key]) data[key] = {}
  if (fields.name !== undefined) data[key].name = fields.name
  if (fields.help !== undefined) data[key].help = fields.help
  if (fields.description !== undefined) data[key].description = fields.description
  writeJson(KEY_PHASE3, data)
}

/** Clear saved Phase 3 edits for a position so base data from phase3-positions-data.js is used. */
export function clearPhase3Entry(position) {
  const data = readJson(KEY_PHASE3)
  const key = String(position)
  if (data[key]) {
    delete data[key]
    writeJson(KEY_PHASE3, data)
  }
}

/** Get merged Phase 3 entry (base + edits). Pass base list entry for the position. */
export function mergePhase3Entry(baseEntry, position) {
  const edits = getPhase3Edits(position)
  if (!edits || !baseEntry) return baseEntry
  return { ...baseEntry, ...edits }
}

// -----------------------------------------------------------------------------
// Phase 1 & 2: table text edits (locations, actions)
// -----------------------------------------------------------------------------
/** Get saved Phase 1/2 text edits. { "1": { locations: { "1": "text", ... }, actions: { ... } }, "2": { ... } } */
export function getPhase12Edits() {
  return readJson(KEY_PHASE12)
}

/** Save one Phase 1/2 cell. type = 'locations' | 'actions', key = roll number (1-20). */
export function savePhase12Cell(phase, type, key, text) {
  const data = readJson(KEY_PHASE12)
  const p = String(phase)
  if (!data[p]) data[p] = { locations: {}, actions: {} }
  if (!data[p][type]) data[p][type] = {}
  data[p][type][String(key)] = text
  writeJson(KEY_PHASE12, data)
}

/** Get merged Phase 1 or 2 table (base + edits). Pass base table from phase1And2Tables[phase]. */
export function mergePhase12Table(baseTable, phase) {
  const edits = getPhase12Edits()[String(phase)]
  if (!edits || !baseTable) return baseTable
  return {
    ...baseTable,
    locations: { ...baseTable.locations, ...(edits.locations || {}) },
    actions: { ...baseTable.actions, ...(edits.actions || {}) },
  }
}

// -----------------------------------------------------------------------------
// Phase 1 & 2: location images (optional paths per location)
// -----------------------------------------------------------------------------
/** Get saved Phase 1/2 location images. { "1": { "5": "/path/to.png", ... }, "2": { ... } } */
export function getPhase12Images() {
  return readJson(KEY_PHASE12_IMAGES)
}

/** Save image path for a Phase 1/2 location. phase = 1|2, locationKey = roll 1-20, path = url or path. */
export function savePhase12Image(phase, locationKey, path) {
  const data = readJson(KEY_PHASE12_IMAGES)
  const p = String(phase)
  if (!data[p]) data[p] = {}
  if (path) data[p][String(locationKey)] = path
  else delete data[p][String(locationKey)]
  writeJson(KEY_PHASE12_IMAGES, data)
}

/** Get image path for a Phase 1/2 location, or null. */
export function getPhase12ImagePath(phase, locationKey) {
  const data = getPhase12Images()
  return data[String(phase)]?.[String(locationKey)] || null
}
