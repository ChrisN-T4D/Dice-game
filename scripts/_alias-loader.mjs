/**
 * Minimal Node ESM resolver so build-time scripts can import modules that use
 * the Vite aliases `@` and `phase3-data`. Mirrors resolve.alias in vite.config.js.
 */
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

function resolveFsPath(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base
  if (fs.existsSync(base + '.js')) return base + '.js'
  if (fs.existsSync(base + '.mjs')) return base + '.mjs'
  const idx = join(base, 'index.js')
  if (fs.existsSync(idx)) return idx
  return base
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'phase3-data') {
    return { url: pathToFileURL(join(SRC, 'data/prompts/phase3/positions.js')).href, shortCircuit: true }
  }
  if (specifier.startsWith('@/')) {
    const target = resolveFsPath(join(SRC, specifier.slice(2)))
    return { url: pathToFileURL(target).href, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
