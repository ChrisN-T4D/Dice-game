import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const target = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/anatomy/actions/clitoris_hierarchy.js'
)
let s = fs.readFileSync(target, 'utf8')
s = s.replace(
  /zoneInstruction\(([^)]+)\),/g,
  (m, args) => (args.includes('omitWhere') ? m : `zoneInstruction(${args}, '', { omitWhere: true }),`)
)
fs.writeFileSync(target, s)
console.log('done', (s.match(/omitWhere/g) || []).length)
