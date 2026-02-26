import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
  },
  plugins: [
    vue(),
    // Serve /onnxe-wasm/* from public/onnxruntime-wasm/ (fix 404 when something requests the wrong path)
    {
      name: 'serve-onnxe-wasm-alias',
      configureServer(server) {
        const onnxDir = path.join(__dirname, 'public', 'onnxruntime-wasm')
        server.middlewares.use('/onnxe-wasm', (req, res, next) => {
          if (!req.url || req.url === '/') return next()
          let subPath = req.url.replace(/\?.*$/, '').replace(/^\//, '').replace(/\.\./g, '')
          if (!subPath) return next()
          // Some builds request ort-wasm-simd-thd.* (abbrev); serve ort-wasm-simd-threaded.*
          if (subPath.startsWith('ort-wasm-simd-thd.')) subPath = subPath.replace('ort-wasm-simd-thd.', 'ort-wasm-simd-threaded.')
          const filePath = path.join(onnxDir, subPath)
          if (!path.resolve(filePath).startsWith(path.resolve(onnxDir))) return next()
          fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) return next()
            const ext = path.extname(filePath).toLowerCase()
            const ct = ext === '.mjs' || ext === '.js' ? 'application/javascript' : ext === '.wasm' ? 'application/wasm' : 'application/octet-stream'
            res.setHeader('Content-Type', ct)
            fs.createReadStream(filePath).on('error', () => next()).pipe(res)
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
      'phase3-data': fileURLToPath(new URL('./phase3-positions-data.js', import.meta.url)),
    },
  },
  publicDir: 'public',
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})
