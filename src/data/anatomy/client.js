/**
 * Thin HTTP client for server-side anatomy DB. No full matrix in the bundle.
 */
import { sortAnatomyHierarchy } from './display-order.js'

const cache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

function apiBase() {
  if (typeof process !== 'undefined' && process.env?.ANATOMY_API_URL) {
    return String(process.env.ANATOMY_API_URL).replace(/\/$/, '')
  }
  const env =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ANATOMY_API_URL
  if (env != null && String(env).trim() !== '') {
    return String(env).replace(/\/$/, '')
  }
  return ''
}

function url(path) {
  const base = apiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

async function fetchJson(path) {
  const res = await fetch(url(path), { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Anatomy API ${res.status}`)
  }
  return res.json()
}

function cacheKey(path) {
  return path
}

function getCached(path) {
  const entry = cache.get(cacheKey(path))
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(cacheKey(path))
    return null
  }
  return entry.data
}

function setCached(path, data) {
  cache.set(cacheKey(path), { at: Date.now(), data })
}

export function clearAnatomyCache() {
  cache.clear()
}

/** @param {string} id */
export async function getZone(id) {
  const path = `/api/zones/${encodeURIComponent(id)}`
  const hit = getCached(path)
  if (hit) return hit
  const data = await fetchJson(path)
  setCached(path, data)
  return data
}

/**
 * @param {{ orientation?: 'male'|'female', region?: string, subRegion?: string, parentId?: string, limit?: number, offset?: number }} params
 */
export async function listZones(params = {}) {
  const q = new URLSearchParams()
  if (params.orientation) q.set('orientation', params.orientation)
  if (params.region) q.set('region', params.region)
  if (params.subRegion) q.set('subRegion', params.subRegion)
  if (params.parentId) q.set('parentId', params.parentId)
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const qs = q.toString()
  const path = `/api/zones${qs ? `?${qs}` : ''}`
  return fetchJson(path)
}

export async function getZoneChildren(parentId) {
  const path = `/api/zones/${encodeURIComponent(parentId)}/children`
  return fetchJson(path)
}

export async function getPosition(positionNumber) {
  return fetchJson(`/api/positions/${positionNumber}`)
}

export async function getPositionZones(positionNumber) {
  return fetchJson(`/api/positions/${positionNumber}/zones`)
}

/** Partner anatomy in app: penis | vulva → API orientation filter */
export function partnerAnatomyToOrientation(anatomy) {
  const a = (anatomy || '').toLowerCase()
  return a === 'vulva' || a === 'female' ? 'female' : 'male'
}

/** @deprecated Use getZone */
export async function getAnatomyById(id, { orientation } = {}) {
  const zone = await getZone(id)
  if (!zone) return null
  if (orientation) {
    const list = Array.isArray(zone.orientation) ? zone.orientation : [zone.orientation]
    const want = partnerAnatomyToOrientation(orientation)
    if (!list.includes(want)) return null
  }
  return zone
}

export async function getAnatomyByRegion(sexOrAnatomy, region, subRegion = null) {
  const orientation = typeof sexOrAnatomy === 'number'
    ? sexOrAnatomy === 1 ? 'male' : 'female'
    : partnerAnatomyToOrientation(sexOrAnatomy)
  const { items } = await listZones({
    orientation,
    region,
    subRegion: subRegion || undefined,
    parentId: 'null',
    limit: 200,
  })
  return items
}

export async function checkAnatomyApiHealth() {
  return fetchJson('/api/health')
}

/** @param {{ orientation?: 'male'|'female'|'all' }} [params] */
export function invalidateZoneActionsCache(zoneId) {
  const q = new URLSearchParams({ zone: zoneId, includeActions: 'true' })
  cache.delete(cacheKey(`/api/anatomy/actions/with-zone?${q}`))
}

/** @param {string} zoneId @param {{ includeActions?: boolean, bustCache?: boolean }} [opts] */
export async function getZoneWithActions(zoneId, opts = {}) {
  const q = new URLSearchParams({ zone: zoneId })
  if (opts.includeActions !== false) q.set('includeActions', 'true')
  const path = `/api/anatomy/actions/with-zone?${q}`
  if (opts.bustCache) cache.delete(cacheKey(path))
  const hit = getCached(path)
  if (hit) return hit
  const data = await fetchJson(path)
  setCached(path, data)
  return data
}

export async function fetchAnatomyHierarchy(params = {}) {
  const q = new URLSearchParams()
  if (params.orientation && params.orientation !== 'all') {
    q.set('orientation', params.orientation)
  }
  const qs = q.toString()
  const path = `/api/anatomy/hierarchy${qs ? `?${qs}` : ''}`
  const data = await fetchJson(path)
  return sortAnatomyHierarchy(data)
}
