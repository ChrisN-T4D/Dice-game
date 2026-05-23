/**
 * Build a review catalog of speakable prompt arrays under src/data/prompts/.
 * Run: npm run generate-prompt-catalog
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { STATIC_GROUPS } from '../src/data/prompts/guided/session-static.js'
import { HOME_POSITIONS } from '../src/data/prompts/transitions/home-positions.js'
import { TURN_START_DIRECTIVE_PHRASES } from '../src/data/prompts/guided/turn-start-directives.js'
import { phase1And2Tables } from '../src/data/prompts/phase12/phase-tables.js'
import { SENSATE_STATIC_PHRASES } from '../src/data/prompts/sensate/static-phrases.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'src/data/prompts')
const outMd = path.join(outDir, 'PROMPT-CATALOG.md')
const outJson = path.join(outDir, 'prompt-catalog.json')

function countTableEntries(obj) {
  if (!obj || typeof obj !== 'object') return 0
  return Object.keys(obj).length
}

function summarizeStaticGroups() {
  return Object.fromEntries(
    Object.entries(STATIC_GROUPS).map(([key, phrases]) => [
      key,
      {
        count: phrases.length,
        ids: phrases.map((p) => p.id),
      },
    ])
  )
}

const catalog = {
  generatedAt: new Date().toISOString(),
  homePositions: HOME_POSITIONS.map((h) => ({
    id: h.id,
    name: h.name,
    isAppDefault: !!h.isAppDefault,
  })),
  staticGroups: summarizeStaticGroups(),
  turnStartDirectives: {
    count: TURN_START_DIRECTIVE_PHRASES.length,
    ids: TURN_START_DIRECTIVE_PHRASES.map((p) => p.id),
  },
  phase12: {
    phase1Locations: countTableEntries(phase1And2Tables[1]?.locations),
    phase1Actions: countTableEntries(phase1And2Tables[1]?.actions),
    phase2Locations: countTableEntries(phase1And2Tables[2]?.locations),
    phase2Actions: countTableEntries(phase1And2Tables[2]?.actions),
  },
  sensateStatic: {
    count: SENSATE_STATIC_PHRASES.length,
    ids: SENSATE_STATIC_PHRASES.map((p) => p.id),
  },
  promptTree: listPromptFiles(path.join(root, 'src/data/prompts')),
}

function listPromptFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const out = []
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) {
      out.push(...listPromptFiles(path.join(dir, e.name), rel))
    } else if (/\.(js|md)$/.test(e.name) && e.name !== 'prompt-catalog.json') {
      out.push(rel)
    }
  }
  return out
}

fs.writeFileSync(outJson, JSON.stringify(catalog, null, 2), 'utf8')

const md = [
  '# Spoken prompt catalog',
  '',
  `_Generated ${catalog.generatedAt}. Run \`npm run generate-prompt-catalog\` to refresh._`,
  '',
  '## Home positions (between directions)',
  '',
  ...HOME_POSITIONS.map((h) => `- **${h.name}** (\`${h.id}\`)${h.isAppDefault ? ' — app default' : ''}`),
  '',
  '## Static WAV groups',
  '',
  ...Object.entries(catalog.staticGroups).map(
    ([key, g]) => `- **${key}**: ${g.count} phrase(s)`
  ),
  '',
  '## Phase 1/2 tables (string counts)',
  '',
  `- Phase 1 locations: ${catalog.phase12.phase1Locations}`,
  `- Phase 1 actions: ${catalog.phase12.phase1Actions}`,
  `- Phase 2 locations: ${catalog.phase12.phase2Locations}`,
  `- Phase 2 actions: ${catalog.phase12.phase2Actions}`,
  '',
  '## Sensate static phrases',
  '',
  `${catalog.sensateStatic.count} entries`,
  '',
  '## Files under src/data/prompts/',
  '',
  ...catalog.promptTree.map((f) => `- \`${f}\``),
  '',
]

fs.writeFileSync(outMd, md.join('\n'), 'utf8')
console.log('Wrote', outMd)
console.log('Wrote', outJson)
