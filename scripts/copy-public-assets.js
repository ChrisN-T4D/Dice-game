#!/usr/bin/env node
/**
 * Copy project assets into public/ so the production build (dist/) includes them.
 * Run before build so Position References and Background are served in production.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')

const assets = [
  { from: 'Position References', to: 'Position References' },
  { from: 'Background', to: 'Background' },
]

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
  return true
}

console.log('Copying assets to public/ for production build...')
for (const { from, to } of assets) {
  const src = path.join(root, from)
  const dest = path.join(publicDir, to)
  if (copyDir(src, dest)) {
    console.log('  ✓', from, '→ public/' + to)
  } else {
    console.log('  —', from, '(not found, skipped)')
  }
}
console.log('Done.')
