/**
 * Validates the intensity-driven build-up selection:
 *  1. The new `mouth` zone generates ONLY oral (modality 'mouth') actions.
 *  2. selectBuildupTurn never opens (turn 1) on a >80-priority zone.
 *  3. Average chosen priority rises across build-up for the 'balanced' curve.
 *  4. 'fast' reaches high priority earlier than 'slow'.
 *  5. A mouth turn never uses a foot/hand-only action (oral-only by construction).
 *  6. buildSessionPlan produces build-up turns carrying zoneId + intensity.
 *
 * Usage: node scripts/validate-buildup-selection.mjs
 */
import { register } from 'node:module'
register('./_alias-loader.mjs', import.meta.url)

const { zoneActionsWithTechniques } = await import('@/data/anatomy/actions/index.js')
const profiles = (await import('@/data/anatomy/profiles/index.js')).default
const { selectBuildupTurn, INTENSITY_CURVES, BUILDUP_ZONES, COVERED_CEILING } = await import('@/utils/sessionSelection')
const { buildSessionPlan } = await import('@/utils/sessionPlanBuilder')
const { coveringGarmentFor, composeClothingRemoval, garmentCategory } = await import('@/data/clothing')
const { composeBuildupPrompt } = await import('@/utils/promptHelper')

let failures = 0
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!cond) failures++
}

// --- 1 & 5: mouth zone is oral-only ---
const mouthActions = zoneActionsWithTechniques['mouth'] || []
ok(mouthActions.length > 0, `mouth zone has generated actions (${mouthActions.length})`)
const nonOral = mouthActions.filter((a) => a.modality !== 'mouth')
ok(nonOral.length === 0, `all mouth actions are oral (modality 'mouth'); non-oral=${nonOral.length}`)
const footStim = mouthActions.filter((a) => a.stimulator === 'toe' || a.stimulator === 'finger' || a.stimulator === 'thumb' || a.stimulator === 'palm')
ok(footStim.length === 0, `no mouth action uses a hand/foot stimulator; bad=${footStim.length}`)
console.log('   mouth stimulators:', [...new Set(mouthActions.map((a) => a.stimulator))].join(', '))

// deterministic rng for reproducibility
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function priorityOf(zoneId) {
  const p = profiles[zoneId]
  return (p && p.stimulation && p.stimulation.erogenous_priority) || 0
}

// --- 2: turn-1 guard ---
{
  const rng = lcg(42)
  let violations = 0
  for (let i = 0; i < 400; i++) {
    const sel = selectBuildupTurn(rng, {
      receiverAnatomy: i % 2 ? 'vulva' : 'penis',
      progress: 0,
      intensityCurve: 'balanced',
      isFirstTurn: true,
    })
    if (sel && priorityOf(sel.zoneId) > 80) violations++
  }
  ok(violations === 0, `turn-1 never opens on >80-priority zone (violations=${violations}/400)`)
}

// --- 3: balanced rises across build-up ---
function avgPriorityAtProgress(curve, progress, anatomy, n = 600, seed = 7) {
  const rng = lcg(seed)
  let sum = 0
  let cnt = 0
  for (let i = 0; i < n; i++) {
    const sel = selectBuildupTurn(rng, { receiverAnatomy: anatomy, progress, intensityCurve: curve })
    if (sel) {
      sum += priorityOf(sel.zoneId)
      cnt++
    }
  }
  return cnt ? sum / cnt : 0
}
{
  const early = avgPriorityAtProgress('balanced', 0.1, 'vulva')
  const mid = avgPriorityAtProgress('balanced', 0.5, 'vulva')
  const late = avgPriorityAtProgress('balanced', 0.95, 'vulva')
  console.log(`   balanced avg priority: early=${early.toFixed(1)} mid=${mid.toFixed(1)} late=${late.toFixed(1)}`)
  ok(early < mid && mid < late, 'balanced curve average priority rises early < mid < late')
}

// --- 4: fast reaches high earlier than slow ---
{
  const fastEarly = avgPriorityAtProgress('fast', 0.25, 'vulva')
  const slowEarly = avgPriorityAtProgress('slow', 0.25, 'vulva')
  console.log(`   at p=0.25: fast=${fastEarly.toFixed(1)} slow=${slowEarly.toFixed(1)}`)
  ok(fastEarly > slowEarly, 'fast curve is hotter than slow curve early (p=0.25)')
}

// --- licking exclusion removes mouth zone ---
{
  const rng = lcg(99)
  let mouthHits = 0
  for (let i = 0; i < 400; i++) {
    const sel = selectBuildupTurn(rng, {
      receiverAnatomy: 'vulva',
      progress: 0.4,
      intensityCurve: 'balanced',
      excludeKeys: { licking: true },
    })
    if (sel && sel.zoneId === 'mouth') mouthHits++
  }
  ok(mouthHits === 0, `licking exclusion removes the mouth zone (mouthHits=${mouthHits})`)
}

// --- 6: buildSessionPlan build-up turns carry zoneId + intensity ---
{
  const cfg = {
    totalMinutes: 30,
    turnMinutes: 2,
    phasePercents: [33, 33, 34],
    partnerNames: { 1: 'Sam', 2: 'Alex' },
    partnerAnatomy: { 1: 'penis', 2: 'vulva' },
    intensityCurve: 'balanced',
    clothingEnabled: false,
  }
  const plan = buildSessionPlan(cfg, 1234)
  const buildup = plan.turns.filter((t) => t.phase !== 3)
  const withZone = buildup.filter((t) => t.zoneId && typeof t.intensity === 'number')
  ok(buildup.length > 0 && withZone.length === buildup.length, `all ${buildup.length} build-up turns carry zoneId + intensity`)
  const turn1 = buildup[0]
  ok(!turn1 || priorityOf(turn1.zoneId) <= 80, `plan turn 1 zone (${turn1?.zoneId}=${turn1 ? priorityOf(turn1.zoneId) : '-'}) is <=80 priority`)
  console.log('\n   sample build-up turns:')
  for (const t of buildup.slice(0, 8)) {
    console.log(`     P${t.phase} #${t.turnIndex} zone=${t.zoneId}(${priorityOf(t.zoneId)}) T=${t.intensity} | ${t.where}`)
  }
}

// --- 7: coverage helper picks the OUTERMOST covering garment; accessories ignored ---
{
  ok(coveringGarmentFor('nipple', ['Bra', 'Shirt']) === 'Shirt', `nipple over [Bra,Shirt] -> outermost Shirt (${coveringGarmentFor('nipple', ['Bra', 'Shirt'])})`)
  ok(coveringGarmentFor('clitoral_glans', ['Watch', 'Panties']) === 'Panties', `genitals over [Watch,Panties] -> Panties (accessory ignored)`)
  ok(coveringGarmentFor('mouth', ['Shirt', 'Pants']) === null, `mouth is never covered`)
  ok(coveringGarmentFor('feet', ['Stockings']) === 'Stockings', `feet covered by stockings`)
  ok(coveringGarmentFor('feet', ['Shoes']) === null, `shoes are not coverage for feet`)
}

// --- 8: covered genital zone stays over-fabric and capped at the ceiling ---
{
  const rng = lcg(11)
  let bad = 0
  let n = 0
  for (let i = 0; i < 300; i++) {
    const sel = selectBuildupTurn(rng, {
      receiverAnatomy: 'vulva',
      targetIntensity: 95,
      forceZoneId: 'clitoral_glans',
      wardrobe: ['Panties'],
    })
    if (sel) {
      n++
      if (!sel.overFabric || sel.intensity > COVERED_CEILING) bad++
    }
  }
  ok(n > 0 && bad === 0, `covered genital zone stays over-fabric & capped <=${COVERED_CEILING} (bad=${bad}/${n})`)
}

// --- 9: removing the garment flips the same zone to direct (uncapped) ---
{
  const rng = lcg(12)
  const sel = selectBuildupTurn(rng, {
    receiverAnatomy: 'vulva',
    targetIntensity: 95,
    forceZoneId: 'clitoral_glans',
    wardrobe: [],
  })
  ok(sel && !sel.overFabric && sel.intensity > COVERED_CEILING, `uncovered genital zone is direct & uncapped (overFabric=${sel?.overFabric}, T=${sel?.intensity})`)
}

// --- 10: removal text has no "Critical" / mismatched verbs / grammar issues ---
{
  const items = [
    'Socks', 'Shoes', 'Watch', 'Shirt', 'Pants', 'Skirt', 'Bra', 'Panties', 'Stockings', 'Dress',
    'Belt', 'Heels', 'T-shirt', 'Thong', 'Cardigan', 'Hoodie', 'Sports bra', 'Scarf', 'Hat',
    'Glasses', 'Undershirt', 'Tank top', 'Bralette', 'Boyshorts', 'Sweatpants', 'Camisole',
  ]
  const rng = lcg(5)
  const issues = []
  for (const it of items) {
    const cat = garmentCategory(it)
    for (let i = 0; i < 12; i++) {
      const { text } = composeClothingRemoval({ giverName: 'Sam', receiverName: 'Alex', items: [it], rng })
      if (/\bcritical\b/i.test(text)) issues.push(`Critical in "${it}": ${text}`)
      if (/\bstrap\b/i.test(text) && !['bra', 'dress'].includes(cat)) issues.push(`strap on "${it}": ${text}`)
      if (/over the head/i.test(text) && cat !== 'pullTop') issues.push(`over-the-head on "${it}": ${text}`)
      if (/\bunbutton\b/i.test(text) && it !== 'Shirt') issues.push(`unbutton on "${it}": ${text}`)
      if (!text || !/^[A-Z].*\.$/.test(text)) issues.push(`grammar on "${it}": ${text}`)
    }
  }
  // two-item phrasing also free of "Critical"
  const rng2 = lcg(6)
  const two = composeClothingRemoval({ giverName: 'Sam', receiverName: 'Alex', items: ['Bra', 'Panties'], rng: rng2 })
  if (/\bcritical\b/i.test(two.text)) issues.push(`Critical in two-item: ${two.text}`)
  ok(issues.length === 0, `removal text clean (no Critical/mismatch/grammar): issues=${issues.length}`)
  issues.slice(0, 10).forEach((s) => console.log('     -', s))
}

// --- 11: over-fabric phrasing frames the touch over the garment ---
{
  const rng = lcg(21)
  const sel = selectBuildupTurn(rng, {
    receiverAnatomy: 'vulva',
    targetIntensity: 90,
    forceZoneId: 'clitoral_glans',
    wardrobe: ['Panties'],
  })
  const prompt = composeBuildupPrompt({
    where: sel.where,
    instruction: sel.instruction,
    giverName: 'Sam',
    receiverName: 'Alex',
    overFabric: sel.overFabric,
    garment: sel.garment,
  })
  const framed = /through (the|her|his|their) (panties|fabric)|fabric/i.test(prompt.instruction)
  ok(framed, `over-fabric prompt frames touch over the garment`)
  console.log('   over-fabric sample:', prompt.instruction)
  const rng2 = lcg(22)
  const selDirect = selectBuildupTurn(rng2, { receiverAnatomy: 'vulva', targetIntensity: 90, forceZoneId: 'clitoral_glans', wardrobe: [] })
  const promptDirect = composeBuildupPrompt({
    where: selDirect.where,
    instruction: selDirect.instruction,
    giverName: 'Sam',
    receiverName: 'Alex',
    overFabric: selDirect.overFabric,
    garment: selDirect.garment,
  })
  console.log('   direct sample:    ', promptDirect.instruction)
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
