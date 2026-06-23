/**
 * Generates 10 guided sessions with clothing removal ON, alternating the new
 * clothingRemovalMode (self-strip vs partner-removes), across varied wardrobes,
 * intensity curves, and lengths. Prints the clothing-removal lines for each
 * session (and a full turn list), and writes the output to a .txt for reference.
 *
 * Usage: node scripts/preview-clothing-sessions.mjs
 */
import { register } from 'node:module'
import fs from 'node:fs'
register('./_alias-loader.mjs', import.meta.url)

const { buildSessionPlan } = await import('@/utils/sessionPlanBuilder')
const { clothingPresets } = await import('@/data/clothing')

const MALE_WARDROBES = [
  clothingPresets.casual,        // Socks, Watch, Shirt, Pants, Underwear
  clothingPresets.fullOutfit,    // Socks, Shoes, Watch, Shirt, Undershirt, Pants, Belt, Underwear
  clothingPresets.loungeWear,    // Socks, Sweatpants, T-shirt, Underwear
  clothingPresets.cozy,          // Socks, Sweatpants, Hoodie, T-shirt, Underwear
  clothingPresets.layered,       // Tank top, Shirt, Cardigan, Pants, Scarf, Belt
]
const FEMALE_WARDROBES = [
  clothingPresets.lingerie,       // Stockings, Bra, Panties, Robe
  clothingPresets.dateNight,      // Heels, Stockings, Dress, Bra, Panties, Jewelry
  clothingPresets.lingerieClassic,// Bra, Panties, Chemise, Robe
  clothingPresets.lingerieLace,   // Stockings, Bralette, Thong, Garter belt, Babydoll
  clothingPresets.athletic,       // Sports bra, Shorts, Tank top, Sneakers, Socks
]

const CURVES = ['slow', 'balanced', 'fast', 'edging', 'balanced']
const PHASE_PCTS = [35, 35, 30]

const lines = []
const out = (s = '') => { lines.push(s); console.log(s) }

const NAMES = { 1: 'Sam', 2: 'Alex' } // Sam = penis, Alex = vulva
const recvName = (r) => NAMES[r]

for (let i = 0; i < 10; i++) {
  // Alternate who strips: even = partner removes, odd = self-strip.
  const mode = i % 2 === 0 ? 'partner' : 'self'
  const curve = CURVES[i % CURVES.length]
  const cfg = {
    totalMinutes: 30,
    turnMinutes: 2,
    pauseSeconds: 15,
    clothingRemovalSeconds: 30,
    phasePercents: PHASE_PCTS,
    clothingEnabled: true,
    clothingRemovalMode: mode,
    clothingListP1: [...MALE_WARDROBES[i % MALE_WARDROBES.length]],
    clothingListP2: [...FEMALE_WARDROBES[i % FEMALE_WARDROBES.length]],
    intensityCurve: curve,
    partnerNames: { 1: 'Sam', 2: 'Alex' },
    partnerAnatomy: { 1: 'penis', 2: 'vulva' },
    phaseCheckInEnabled: false,
    vibratorsPresent: true,
    positionIntensity: 'more_physical',
    phase3PositionMode: 'each_turn',
    phase3MaxPositions: 4,
  }
  const seed = 4000 + i
  const plan = buildSessionPlan(cfg, seed)
  const turns = plan.turns || []
  const buildup = turns.filter((t) => t.phase !== 3)
  const finish = turns.filter((t) => t.phase === 3)

  out('')
  out('#'.repeat(82))
  out(`SESSION ${i + 1} of 10   (seed ${seed})  —  REVIEW YOUR SESSION`)
  out('#'.repeat(82))
  out(`  Couple:          Sam (penis)  +  Alex (vulva)   | clothing: ON`)
  out(`  Removal mode:    ${mode === 'self' ? 'THEMSELVES (self-strip)' : 'EACH OTHER (partner removes)'}`)
  out(`  Intensity curve: ${curve}`)
  out(`  Sam wears:       ${cfg.clothingListP1.join(', ')}`)
  out(`  Alex wears:      ${cfg.clothingListP2.join(', ')}`)
  out(`  ${turns.length} turns. Reroll any turn or confirm to generate audio.`)

  out('')
  out(`  ===== BUILD-UP (${buildup.length} turns) =====`)
  for (const t of buildup) {
    out('')
    out(`  #${t.turnIndex}  ${recvName(t.giver || (t.receiver === 1 ? 2 : 1))} -> ${recvName(t.receiver)}`)
    if (t.clothing) out(`     Clothing: ${t.clothing}`)
    out(`     Where:    ${t.zoneId}${t.overFabric ? ` (over fabric: ${t.garment})` : ''}`)
    out(`     What:     ${t.instruction}`)
  }

  out('')
  out(`  ===== FINISH (${finish.length} turns) =====`)
  for (const t of finish) {
    out('')
    out(`  #${t.turnIndex}  ${recvName(t.giver || (t.receiver === 1 ? 2 : 1))} -> ${recvName(t.receiver)}`)
    if (t.clothing) out(`     Clothing: ${t.clothing}`)
    out(`     Position: ${t.where}`)
    out(`     What:     ${t.instruction}`)
  }
}

out('')
out('#'.repeat(82))
out('DONE: 10 sessions.')

fs.writeFileSync('clothing-removal-10-sessions.txt', lines.join('\n'), 'utf8')
console.log('\n[written] clothing-removal-10-sessions.txt')

