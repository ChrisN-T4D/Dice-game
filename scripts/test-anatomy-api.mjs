#!/usr/bin/env node
/**
 * Smoke-test anatomy API over HTTP (no better-sqlite3 in this script).
 * Prereqs: npm run db:setup && npm run api:dev
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'server', 'db', 'anatomy.sqlite')

if (!fs.existsSync(dbPath)) {
  console.error('Missing database. Run: npm run db:setup')
  process.exit(1)
}

const base = (process.env.ANATOMY_API_URL || 'http://localhost:3001').replace(/\/$/, '')

async function get(path) {
  const res = await fetch(`${base}${path}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${path} → ${res.status}${body ? ` ${body.slice(0, 120)}` : ''}`)
  }
  return res.json()
}

try {
  const health = await get('/api/health')
  console.log('health:', health)
  const tree = await get('/api/anatomy/hierarchy')
  if (!tree.regions?.length) {
    throw new Error('Hierarchy empty — run npm run db:seed')
  }
  console.log('hierarchy:', tree.zoneCount, 'zones,', tree.regions.length, 'regions')
  const list = await get('/api/zones?orientation=female&region=genitalia&limit=5')
  if (!list.items?.length) {
    throw new Error('No zones returned — run npm run db:seed')
  }
  console.log('female genitalia sample:', list.items.map((z) => z.id))
  const zone = await get(`/api/zones/${encodeURIComponent(list.items[0].id)}`)
  console.log('zone detail:', zone.id, zone.display_name, zone.stimulation?.primary_techniques)
  console.log('OK')
} catch (e) {
  if (e.cause?.code === 'ECONNREFUSED' || e.message?.includes('fetch failed')) {
    console.error(`Cannot reach ${base}`)
    console.error('Start the API in another terminal: npm run api:dev')
    console.error('If port 3001 is in use, stop the old process or set ANATOMY_API_PORT')
  } else {
    console.error(e.message)
  }
  process.exit(1)
}
