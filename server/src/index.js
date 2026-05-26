/**
 * Anatomy API server (SQLite via node:sqlite). Default port 3001; proxy from Vite in dev.
 */
import http from 'http'
import fs from 'fs'
import { URL } from 'url'
import {
  getZoneById,
  listZones,
  getZoneChildren,
  getPositionByNumber,
  getPositionZones,
  healthCheck,
  getAnatomyHierarchy,
  loadZoneActions,
  countActionsByZone,
  countActionsByModality,
  loadZoneWithActions,
} from './anatomy/queries.js'
import { closeDb, assertDbReady, getDbPath } from './db.js'

const PORT = Number(process.env.ANATOMY_API_PORT) || 3001
const HOST = process.env.ANATOMY_API_HOST || '127.0.0.1'

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Anatomy API</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; max-width: 40rem; }
    a { color: #2563eb; }
    code { background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Anatomy API</h1>
  <p>This is a JSON API, not the Vue game UI. Use the links below or open the app at <a href="http://localhost:3000/">localhost:3000</a>.</p>
  <ul>
    <li><a href="/api/health">/api/health</a></li>
    <li><a href="/api/anatomy/hierarchy">/api/anatomy/hierarchy</a></li>
    <li><a href="/api/zones?orientation=female&amp;region=genitalia&amp;limit=10">/api/zones</a> (sample query)</li>
  </ul>
</body>
</html>`

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(payload)
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

function parseQuery(searchParams) {
  const q = {}
  for (const [k, v] of searchParams) q[k] = v
  return q
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/' || pathname === '/api') {
    sendHtml(res, 200, LANDING_HTML)
    return
  }

  try {
    if (pathname === '/api/health' || pathname === '/health') {
      sendJson(res, 200, healthCheck())
      return
    }

    if (pathname === '/api/anatomy/hierarchy') {
      const q = parseQuery(url.searchParams)
      const orientation = q.orientation === 'male' || q.orientation === 'female' ? q.orientation : 'all'
      sendJson(res, 200, getAnatomyHierarchy({ orientation }))
      return
    }

    // ─── Stimulation Actions endpoints ─────────────────────────────────────────────
    const actionsMatch = pathname.match(/^\/api\/anatomy\/actions\/(.+)$/)
    if (actionsMatch) {
      const actionPath = actionsMatch[1]
      const params = parseQuery(url.searchParams)

      if (actionPath === 'count') {
        // /api/anatomy/actions/count?zone=clitoral_glans
        if (params.zone) {
          const countMap = countActionsByZone()
          sendJson(res, 200, { [params.zone]: countMap.get(params.zone) || 0 })
        } else {
          sendJson(res, 200, Object.fromEntries(countActionsByZone()))
        }
        return
      }

      if (actionPath === 'modality-count') {
        // /api/anatomy/actions/modality-count?zone=clitoral_glans
        if (params.zone) {
          sendJson(res, 200, countActionsByModality(params.zone))
        } else {
          sendJson(res, 200, {})
        }
        return
      }

      if (actionPath === 'with-zone') {
        // /api/anatomy/actions/with-zone?zone=clitoral_glans
        if (params.zone) {
          // Parse query params for includeActions and includeZeroCount
          const includeActions = params.includeActions === 'true' || params.includeActions === '1'
          const includeZeroCount = params.includeZeroCount === 'true' || params.includeZeroCount === '1'
          const result = loadZoneWithActions(params.zone, { includeActions })
          if (result) {
            sendJson(res, 200, result)
          } else {
            sendJson(res, 404, { error: 'Zone not found' })
          }
        } else {
          sendJson(res, 200, { error: 'Missing ?zone parameter' })
        }
        return
      }
    }

    if (pathname === '/api/zones') {
      const q = parseQuery(url.searchParams)
      sendJson(res, 200, listZones(q))
      return
    }

    const zoneChildMatch = pathname.match(/^\/api\/zones\/([^/]+)\/children$/)
    if (zoneChildMatch) {
      const data = getZoneChildren(decodeURIComponent(zoneChildMatch[1]))
      sendJson(res, 200, data)
      return
    }

    const zoneMatch = pathname.match(/^\/api\/zones\/([^/]+)$/)
    if (zoneMatch) {
      const zone = getZoneById(decodeURIComponent(zoneMatch[1]))
      if (!zone) {
        sendJson(res, 404, { error: 'Zone not found' })
        return
      }
      sendJson(res, 200, zone)
      return
    }

    const posZonesMatch = pathname.match(/^\/api\/positions\/(\d+)\/zones$/)
    if (posZonesMatch) {
      const n = parseInt(posZonesMatch[1], 10)
      sendJson(res, 200, { position_number: n, zones: getPositionZones(n) })
      return
    }

    const posMatch = pathname.match(/^\/api\/positions\/(\d+)$/)
    if (posMatch) {
      const n = parseInt(posMatch[1], 10)
      const pos = getPositionByNumber(n)
      if (!pos) {
        sendJson(res, 404, { error: 'Position not found' })
        return
      }
      sendJson(res, 200, pos)
      return
    }

    sendJson(res, 404, { error: 'Not found', path: pathname })
  } catch (err) {
    console.error(err)
    sendJson(res, 500, {
      error: err.message || 'Internal error',
      hint: 'Run npm run db:setup. Requires Node 22.5+ (node:sqlite).',
    })
  }
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err)
    sendJson(res, 500, { error: 'Internal error' })
  })
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set ANATOMY_API_PORT.`)
    console.error('  Windows: netstat -ano | findstr :' + PORT)
  } else {
    console.error(err)
  }
  process.exit(1)
})

if (!fs.existsSync(getDbPath())) {
  console.error('Database not found:', getDbPath())
  console.error('Run: npm run db:setup')
  process.exit(1)
}

try {
  assertDbReady()
} catch (err) {
  console.error('Database failed to open:', err.message)
  console.error('Run: npm run db:setup')
  process.exit(1)
}

server.listen(PORT, HOST, () => {
  console.log('')
  console.log(`Anatomy API running at http://${HOST}:${PORT}`)
  console.log('  JSON:  /api/health')
  console.log('  JSON:  /api/anatomy/hierarchy')
  console.log('  JSON:  /api/anatomy/actions/count?zone=clitoral_glans')
  console.log('  JSON:  /api/anatomy/actions/modality-count?zone=clitoral_glans')
  console.log('  JSON:  /api/anatomy/actions/with-zone?zone=clitoral_glans')
  console.log('  JSON:  /api/zones?orientation=female&region=genitalia&limit=5')
  console.log('  Help:  /  (HTML links)')
  console.log('')
  console.log('This terminal will not return to a prompt — that is normal.')
  console.log('Leave it open. Press Ctrl+C to stop the API.')
  console.log('Game UI: npm run dev → http://localhost:3000/  (separate terminal)')
  console.log('')
})

process.on('SIGINT', () => {
  closeDb()
  process.exit(0)
})
