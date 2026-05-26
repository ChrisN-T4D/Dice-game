import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const target = path.join(__dirname, '../src/data/anatomy/actions/clitoris_hierarchy.js')
let s = fs.readFileSync(target, 'utf8')

if (!s.includes('zoneInstruction')) {
  s = s.replace(
    "import { makeAction } from './_makeAction.js'",
    "import { makeAction } from './_makeAction.js'\nimport { zoneInstruction } from './instruction-compose.js'"
  )
}

s = s.replace(
  /zone_id: '([^']+)',\r?\n    instruction:\r?\n      '((?:\\'|[^'])*)',\r?\n    technique:/g,
  (_, zone, instr) =>
    `zone_id: '${zone}',\n    instruction: zoneInstruction('${zone}', '${instr.replace(/'/g, "\\'")}', '', { omitWhere: true }),\n    technique:`
)

fs.writeFileSync(target, s)
console.log('zoneInstruction calls:', (s.match(/zoneInstruction/g) || []).length)
