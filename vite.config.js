import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))

/**
 * GitHub Pages project URL is https://<user>.github.io/<repo>/ — relative base "./"
 * breaks when the site is opened as …/Dice-game (no trailing slash): ./assets resolves to /assets.
 * Use an absolute base matching this repo name. Override for root deploy: `vite build --base /`
 * or `npm run build -- --base /`.
 */
const DEFAULT_SITE_BASE = '/Dice-game/'

function normalizeExplicitBase(raw) {
  const s = String(raw).trim()
  if (s === '/') return '/'
  return s.endsWith('/') ? s : `${s}/`
}

export default defineConfig(({ mode }) => {
  const explicitBase =
    process.env.VITE_BASE !== undefined && String(process.env.VITE_BASE).trim() !== ''
      ? normalizeExplicitBase(process.env.VITE_BASE)
      : null
  /** Dev server: keep "/" so http://localhost:3000/ works. Production build: repo subpath for GitHub Pages. */
  const base = explicitBase ?? (mode === 'development' ? '/' : DEFAULT_SITE_BASE)

  return {
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
  },
  plugins: [
    vue(),
    // Catch-all: intercept ANY request for ort-wasm*.wasm or ort-wasm*.mjs files
    // regardless of URL path, and serve from node_modules/onnxruntime-web/dist/
    // with correct MIME type. This prevents SPA fallback from returning index.html.
    {
      name: 'serve-onnx-wasm',
      configureServer(server) {
        const distDir = path.join(__dirname, 'node_modules', 'onnxruntime-web', 'dist')
        const publicDir = path.join(__dirname, 'public', 'onnxruntime-wasm')
        server.middlewares.use((req, res, next) => {
          const url = (req.url || '').replace(/\?.*$/, '')
          const basename = url.split('/').pop() || ''
          if (!/^ort-wasm.*\.(wasm|mjs)$/.test(basename)) return next()
          const tryDirs = [distDir, publicDir]
          const tryServe = (idx) => {
            if (idx >= tryDirs.length) return next()
            const filePath = path.join(tryDirs[idx], basename)
            if (!path.resolve(filePath).startsWith(path.resolve(tryDirs[idx]))) return next()
            fs.stat(filePath, (err, stat) => {
              if (err || !stat.isFile()) return tryServe(idx + 1)
              const ext = path.extname(filePath).toLowerCase()
              const ct = ext === '.mjs' || ext === '.js' ? 'application/javascript'
                : ext === '.wasm' ? 'application/wasm' : 'application/octet-stream'
              res.setHeader('Content-Type', ct)
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
              fs.createReadStream(filePath).on('error', () => next()).pipe(res)
            })
          }
          tryServe(0)
        })
      },
    },
    // Serve /models/* from public/models/; return 404 for missing files (do not fall through to SPA index.html)
    {
      name: 'serve-models-no-spa-fallback',
      configureServer(server) {
        const modelsDir = path.join(__dirname, 'public', 'models')
        server.middlewares.use('/models', (req, res, next) => {
          if (!req.url || req.url === '/') return next()
          // req.url is e.g. "/models/Kokoro-82M-v1.0-ONNX/config.json" – strip /models/ prefix for subPath
          let subPath = req.url.replace(/\?.*$/, '').replace(/^\//, '').replace(/\.\./g, '')
          if (subPath.toLowerCase().startsWith('models/')) subPath = subPath.slice(7)
          else if (subPath.toLowerCase() === 'models') return next()
          if (!subPath) return next()
          const filePath = path.join(modelsDir, subPath)
          if (!path.resolve(filePath).startsWith(path.resolve(modelsDir))) return next()
          fs.stat(filePath, (err, stat) => {
            if (err || !stat?.isFile()) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'text/plain')
              res.end('Not Found')
              return
            }
            const ext = path.extname(filePath).toLowerCase()
            const ct =
              ext === '.json' ? 'application/json'
              : ext === '.onnx' || ext === '.bin' ? 'application/octet-stream'
              : 'application/octet-stream'
            res.setHeader('Content-Type', ct)
            fs.createReadStream(filePath).on('error', () => { res.statusCode = 500; res.end() }).pipe(res)
          })
        })
      },
    },
    // Serve "Position References" folder from project root at /Position References so admin images load in dev
    {
      name: 'serve-position-references',
      configureServer(server) {
        const positionRefDir = path.join(__dirname, 'Position References')
        server.middlewares.use('/Position%20References', (req, res, next) => {
          // req.url is e.g. "/position%201.png" (prefix may be stripped by connect) or "/Position%20References/position%201.png"
          let subPath = (req.url || '/').replace(/\?.*$/, '').replace(/^\/Position%20References\/?/i, '').replace(/^\//, '')
          subPath = decodeURIComponent(subPath)
          if (!subPath || subPath.includes('..')) return next()
          const filePath = path.join(positionRefDir, subPath)
          if (!path.resolve(filePath).startsWith(path.resolve(positionRefDir))) return next()
          fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) return next()
            const ext = path.extname(filePath).toLowerCase()
            const ct = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'
            res.setHeader('Content-Type', ct)
            fs.createReadStream(filePath).on('error', () => next()).pipe(res)
          })
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'phase3-data': fileURLToPath(new URL('./src/data/prompts/phase3/positions.js', import.meta.url)),
      // Stub Node "module" for browser so espeak-ng doesn't trigger externalize warning
      module: path.join(__dirname, 'src', 'tts', 'browser-module-stub.js'),
    },
  },
  publicDir: 'public',
  worker: {
    format: 'es',
  },
  build: {
    /** Avoid parallel modulepreload of several chunks on first paint (helps low-RAM phones). */
    modulePreload: false,
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
}
})
