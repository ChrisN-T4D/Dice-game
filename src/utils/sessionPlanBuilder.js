/**
 * Session plan builder: deterministic dry-run of guided mode.
 * Produces SessionPlan { config, turns, script } for review and pre-generate audio.
 */
import { getPhase3PositionNumbersForReceiverAnatomy } from 'phase3-data'
import { getPromptText, composeBuildupPrompt, normalizeParenthesesForTts, slashToAndForTts } from '@/utils/promptHelper'
import { selectBuildupTurn, mergedExcludeKeys, getBuildupTarget, COVERED_CEILING } from '@/utils/sessionSelection'
import {
  removeClothingItem,
  removeSpecificItem,
  composeClothingRemoval,
  computeClothingMilestoneInterval,
} from '@/data/clothing'
import {
  SESSION_COMPLETE_PHRASES,
  INTRO_NO_CLOTHING_VARIANTS,
  INTRO_WITH_CLOTHING_VARIANTS,
  EASE_IN_TEXTS,
  formatHomeTransition,
  formatHomeOpening,
  formatFirstTurnIntro,
  formatTurnStartDirective,
} from '@/data/staticPhrases'
import { getDefaultHomePosition } from '@/data/prompts/transitions/home-positions'
import { rollPhase12WithExclusions, rollPhase3ModifierWithVibratorRule, mergeExcludePrefs } from '@/utils/bodyPartRollExclusions'
import { refineSessionScript } from '@/utils/sessionScriptRefine'

// -----------------------------------------------------------------------------
// Seeded RNG (LCG) for deterministic plans
// -----------------------------------------------------------------------------
export function createSeededRng(seed) {
  let state = typeof seed === 'number' && Number.isInteger(seed) ? seed : (Date.now() ^ (Math.random() * 0x100000000)) >>> 0
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function rollD20(rng) {
  return Math.floor(rng() * 20) + 1
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
  return arr
}

/** Positions that appear in both partners' Phase 3 pools so the same position can span several turns when reuse modes are on. */
function phase3PositionsEligibleForReuse(partnerAnatomy, positionIntensity) {
  const a1 = (partnerAnatomy[1] || 'penis').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
  const a2 = (partnerAnatomy[2] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
  const pool1 = getPhase3PositionNumbersForReceiverAnatomy(a1, positionIntensity)
  if (a1 === a2) return [...pool1]
  const set2 = new Set(getPhase3PositionNumbersForReceiverAnatomy(a2, positionIntensity))
  const inter = pool1.filter((n) => set2.has(n))
  return inter.length > 0 ? inter : [...pool1]
}

const AFTER_NEXT_TURN_SEC = 10
const SETTLE_IN_SEC = 20

// -----------------------------------------------------------------------------
// buildSessionPlan
// -----------------------------------------------------------------------------
/**
 * @param {object} config - phase3PositionMode ('each_turn' | 'reuse_rotate' | 'reuse_multi'). phase3MaxPositions applies only to reuse_multi. reuse_rotate cycles up to 20 compatible positions (all eligible if fewer).
 * @param {number} [seed] - Optional seed for RNG; if omitted uses Date.now()
 * @returns {{ config: object, turns: Turn[], script: string[] }}
 */
export function buildSessionPlan(config, seed) {
  const rng = createSeededRng(seed)
  const {
    totalMinutes,
    turnMinutes,
    pauseSeconds = 0,
    clothingRemovalSeconds = 30,
    phasePercents = [33, 34, 33],
    clothingListP1 = [],
    clothingListP2 = [],
    clothingEnabled = false,
    clothingRemovalMode = 'partner',
    distributionMode = 'equal',
    partnerNames = { 1: '', 2: '' },
    partnerAnatomy = { 1: 'penis', 2: 'vulva' },
    excludeWhenTouching: _exTouch,
    excludeWhenTouched: _exTouched,
    vibratorsPresent = true,
    phase3PositionMode = 'each_turn',
    phase3MaxPositions = 4,
    positionIntensity = 'more_physical',
    homePositionId = getDefaultHomePosition().id,
    useActionCatalog = true,
    intensityCurve = 'balanced',
  } = config

  const promptOptions = { useCatalog: useActionCatalog !== false }

  const excludeWhenTouching = mergeExcludePrefs(_exTouch)
  const excludeWhenTouched = mergeExcludePrefs(_exTouched)
  const buildupExcludeKeys = mergedExcludeKeys(excludeWhenTouching, excludeWhenTouched)

  const totalSeconds = totalMinutes * 60
  const turnSeconds = turnMinutes * 60
  const phaseSeconds = [
    Math.floor(totalSeconds * (phasePercents[0] / 100)),
    Math.floor(totalSeconds * (phasePercents[1] / 100)),
    totalSeconds - Math.floor(totalSeconds * (phasePercents[0] / 100)) - Math.floor(totalSeconds * (phasePercents[1] / 100)),
  ]
  let clothingItemsP1 = clothingEnabled ? [...clothingListP1] : []
  let clothingItemsP2 = clothingEnabled ? [...clothingListP2] : []
  const totalItems = clothingItemsP1.length + clothingItemsP2.length
  const phase12Sec = phaseSeconds[0] + phaseSeconds[1]
  const clothingMilestoneInterval = computeClothingMilestoneInterval(
    phase12Sec,
    turnSeconds,
    pauseSeconds,
    clothingEnabled,
    clothingListP1,
    clothingListP2
  )

  const partnerName = (num) => (partnerNames[num]?.trim() || `Partner ${num}`)

  let startPhase = 1
  for (let i = 0; i < 3; i++) {
    if (phaseSeconds[i] > 0) {
      startPhase = i + 1
      break
    }
  }

  const script = []
  const turns = []
  let currentPartner = 1
  let phase = startPhase
  let phaseTimeRemaining = phaseSeconds[phase - 1]
  let totalTimeRemaining = totalSeconds
  let turnsSinceLastRemoval = 0
  let firstTurnOfSession = true
  let receiverOnceP1 = false
  let receiverOnceP2 = false
  let turnIndex = 0
  const buildupTotalSec = Math.max(1, phaseSeconds[0] + phaseSeconds[1])
  let buildupElapsedSec = 0
  let buildupTurnCount = 0
  let lastBuildupZoneId = null
  let phase3ReusePlan = null
  let phase3ReuseSlot = 0
  let phase3TurnInSlot = 0
  const usePhase3Reuse =
    phase3PositionMode === 'reuse_rotate' || phase3PositionMode === 'reuse_multi'

  let phase3EligibleList = []
  let phase3RotationCap = 1
  if (usePhase3Reuse) {
    phase3EligibleList = phase3PositionsEligibleForReuse(partnerAnatomy, positionIntensity)
    if (phase3PositionMode === 'reuse_rotate') {
      phase3RotationCap = Math.max(1, Math.min(20, phase3EligibleList.length))
    } else {
      const rawCap = Number(phase3MaxPositions)
      phase3RotationCap = Math.max(
        1,
        Math.min(Number.isFinite(rawCap) ? rawCap : 4, 20, phase3EligibleList.length)
      )
    }
  }

  const phase3TurnCostApprox = Math.max(1, turnSeconds + AFTER_NEXT_TURN_SEC + SETTLE_IN_SEC)
  const estPhase3TurnCount = Math.max(1, Math.floor(phaseSeconds[2] / phase3TurnCostApprox))

  let phase3TurnsPerSlot = 1
  if (phase3PositionMode === 'reuse_rotate') {
    phase3TurnsPerSlot = 2
  } else if (phase3PositionMode === 'reuse_multi') {
    const per =
      phase3RotationCap > 0 ? Math.round(estPhase3TurnCount / phase3RotationCap) : estPhase3TurnCount
    phase3TurnsPerSlot = Math.max(3, per)
  }

  // Intro (from staticPhrases) + opening instruction to settle into the home position.
  const intro = pick(clothingEnabled ? INTRO_WITH_CLOTHING_VARIANTS : INTRO_NO_CLOTHING_VARIANTS, rng)
  script.push(`${intro} ${formatHomeOpening(homePositionId)}`)

  while (totalTimeRemaining > 0 && phase <= 3) {
    turnIndex++
    const receiver = currentPartner === 1 ? 2 : 1
    if (receiver === 1) receiverOnceP1 = true
    if (receiver === 2) receiverOnceP2 = true

    let loc, actRoll, extendedTime = false
    let buildupSelection = null
    turnsSinceLastRemoval++
    let clothingText = ''
    let effectiveClothingSeconds = 0
    let motivatedRemoval = false
    if (phase === 3) {
      if (usePhase3Reuse) {
        if (phase3ReusePlan === null) {
          const eligible = [...phase3EligibleList]
          shuffleInPlace(eligible, rng)
          phase3ReusePlan = eligible.slice(0, phase3RotationCap)
          phase3ReuseSlot = 0
          phase3TurnInSlot = 0
        }
        loc = phase3ReusePlan[phase3ReuseSlot % phase3ReusePlan.length]
      } else {
        const receiverAnatomyVal = (partnerAnatomy[receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
        const pool = getPhase3PositionNumbersForReceiverAnatomy(receiverAnatomyVal, positionIntensity)
        loc = pool[Math.floor(rng() * pool.length)]
      }
      const mod = rollPhase3ModifierWithVibratorRule(rng, distributionMode, !!vibratorsPresent)
      actRoll = mod.actRoll
      extendedTime = mod.extendedTime
    } else {
      // Build-up turn: clothing-aware, intensity-curve-driven zone + action selection.
      buildupTurnCount++
      const recvAnatomy = (partnerAnatomy[receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
      const progress = Math.min(1, buildupElapsedSec / buildupTotalSec)
      const targetT = getBuildupTarget(intensityCurve, progress)
      const receiverArr = receiver === 1 ? clothingItemsP1 : clothingItemsP2
      const wardrobe = clothingEnabled ? receiverArr : null

      let sel = selectBuildupTurn(rng, {
        receiverAnatomy: recvAnatomy,
        progress,
        intensityCurve,
        isFirstTurn: buildupTurnCount === 1,
        lastZoneId: lastBuildupZoneId,
        excludeKeys: buildupExcludeKeys,
        wardrobe,
      })

      // Motivated removal: when the curve wants to push a covered region past the
      // over-fabric ceiling, take that garment off this turn so the touch is direct.
      if (
        sel &&
        sel.overFabric &&
        sel.garment &&
        clothingEnabled &&
        targetT > COVERED_CEILING &&
        turnsSinceLastRemoval >= 1
      ) {
        const removed = removeSpecificItem(receiverArr, sel.garment)
        if (removed) {
          turnsSinceLastRemoval = 0
          motivatedRemoval = true
          const res = composeClothingRemoval({
            giverName: partnerName(currentPartner),
            receiverName: partnerName(receiver),
            items: [removed],
            rng,
            mode: clothingRemovalMode,
            receiverAnatomy: recvAnatomy,
          })
          clothingText = res.text
          effectiveClothingSeconds = Math.round(clothingRemovalSeconds * res.complexityMultiplier)
          const sel2 = selectBuildupTurn(rng, {
            receiverAnatomy: recvAnatomy,
            progress,
            intensityCurve,
            excludeKeys: buildupExcludeKeys,
            forceZoneId: sel.zoneId,
            wardrobe: clothingEnabled ? receiverArr : null,
          })
          if (sel2) sel = sel2
        }
      }

      if (sel) {
        buildupSelection = sel
        lastBuildupZoneId = sel.zoneId
        loc = 0
        actRoll = 0
      } else {
        const r = rollPhase12WithExclusions(phase, rng, distributionMode, excludeWhenTouching, excludeWhenTouched)
        loc = r.loc
        actRoll = r.actRoll
        extendedTime = r.extendedTime
      }
    }

    const partnerNamesMap = { 1: partnerName(1), 2: partnerName(2) }
    const partnerAnatomyMap = { 1: partnerAnatomy[1] || 'penis', 2: partnerAnatomy[2] || 'vulva' }
    let prompt = buildupSelection
      ? composeBuildupPrompt({
          where: buildupSelection.where,
          instruction: buildupSelection.instruction,
          giverName: partnerNamesMap[currentPartner],
          receiverName: partnerNamesMap[receiver],
          overFabric: buildupSelection.overFabric,
          garment: buildupSelection.garment,
        })
      : getPromptText(phase, loc, actRoll, currentPartner, receiver, partnerNamesMap, partnerAnatomyMap, promptOptions)
    if (extendedTime) {
      const ext = phase === 3 ? ' Spend about twice as long on this position.' : ' Spend about twice as long on this location.'
      prompt.what += ext
      prompt.instruction += ext
    }

    const receiverItems = receiver === 1 ? clothingItemsP1 : clothingItemsP2
    if (!motivatedRemoval && clothingEnabled && phase < 3 && turnsSinceLastRemoval >= clothingMilestoneInterval && receiverItems.length > 0) {
      const arr = receiver === 1 ? clothingItemsP1 : clothingItemsP2
      const removed = removeClothingItem(arr, rng)
      turnsSinceLastRemoval = 0
      if (removed) {
        const removedItems = [removed]
        if (Math.floor(rng() * 12) + 1 === 12) {
          const second = removeClothingItem(arr, rng)
          if (second) removedItems.push(second)
        }
        const res = composeClothingRemoval({
          giverName: partnerName(currentPartner),
          receiverName: partnerName(receiver),
          items: removedItems,
          rng,
          mode: clothingRemovalMode,
          receiverAnatomy: (partnerAnatomy[receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis',
        })
        clothingText = res.text
        effectiveClothingSeconds = Math.round(clothingRemovalSeconds * res.complexityMultiplier)

        // If this removal stripped the very garment the touch was teasing through,
        // recompute the instruction as direct so we don't say "through the X" in the
        // same turn we take X off.
        if (
          buildupSelection &&
          buildupSelection.overFabric &&
          buildupSelection.garment &&
          removedItems.includes(buildupSelection.garment)
        ) {
          const recvAnatomyDirect = (partnerAnatomy[receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
          const directSel = selectBuildupTurn(rng, {
            receiverAnatomy: recvAnatomyDirect,
            progress: Math.min(1, buildupElapsedSec / buildupTotalSec),
            intensityCurve,
            excludeKeys: buildupExcludeKeys,
            forceZoneId: buildupSelection.zoneId,
            wardrobe: clothingEnabled ? arr : null,
          })
          if (directSel) {
            buildupSelection = directSel
            prompt = composeBuildupPrompt({
              where: directSel.where,
              instruction: directSel.instruction,
              giverName: partnerNamesMap[currentPartner],
              receiverName: partnerNamesMap[receiver],
              overFabric: directSel.overFabric,
              garment: directSel.garment,
            })
            if (extendedTime) {
              prompt.what += ' Spend about twice as long on this location.'
              prompt.instruction += ' Spend about twice as long on this location.'
            }
          }
        }
      }
    }

    let turnTime = turnSeconds
    if (effectiveClothingSeconds > 0) turnTime += effectiveClothingSeconds
    const breakOverhead = AFTER_NEXT_TURN_SEC + SETTLE_IN_SEC + (effectiveClothingSeconds || 0)

    const turnRecord = {
      phase,
      turnIndex,
      currentPartner,
      receiver,
      locationRoll: loc,
      actionRoll: actRoll,
      zoneId: buildupSelection ? buildupSelection.zoneId : null,
      intensity: buildupSelection ? buildupSelection.intensity : null,
      overFabric: buildupSelection ? !!buildupSelection.overFabric : false,
      garment: buildupSelection ? buildupSelection.garment || null : null,
      where: prompt.where,
      what: prompt.what,
      instruction: prompt.instruction,
      shortInstruction: prompt.shortInstruction || prompt.instruction,
      clothing: clothingText || prompt.clothing || '',
      durationSec: turnTime,
      extendedTime,
      phraseStrings: [],
    }
    const phraseCfg = { partnerNames, partnerAnatomy, distributionMode, vibratorsPresent }
    const { phraseStrings } = buildTurnPhraseStringsOnly(rng, phraseCfg, {
      phase,
      giver: currentPartner,
      receiver,
      locationRoll: loc,
      actionRoll: actRoll,
      extendedTime,
      clothingText: clothingText || undefined,
      firstTurn: firstTurnOfSession,
      precomputedPrompt: prompt,
      homePositionId,
    })
    for (const s of phraseStrings) script.push(s)
    turnRecord.phraseStrings = phraseStrings
    turns.push(turnRecord)

    if (phase === 3 && usePhase3Reuse && phase3ReusePlan?.length) {
      phase3TurnInSlot++
      if (phase3TurnInSlot >= phase3TurnsPerSlot) {
        phase3TurnInSlot = 0
        phase3ReuseSlot++
      }
    }

    firstTurnOfSession = false

    phaseTimeRemaining -= turnTime + breakOverhead
    totalTimeRemaining -= turnTime + breakOverhead
    if (phase < 3) buildupElapsedSec += turnTime + breakOverhead

    const bothReceived = receiverOnceP1 && receiverOnceP2
    if (phaseTimeRemaining <= 0 && bothReceived) {
      // Build-up (phases 1+2) is one continuous section. The first Finish turn is
      // treated like any other turn (flows back to neutral, then the position) —
      // no special intro and no check-in pause at any boundary.
      if (phase >= 3) {
        script.push(pick(SESSION_COMPLETE_PHRASES, rng))
        break
      }
      phase++
      phaseTimeRemaining = phaseSeconds[phase - 1]
      receiverOnceP1 = false
      receiverOnceP2 = false
      currentPartner = currentPartner === 1 ? 2 : 1
      continue
    }
    if (totalTimeRemaining <= 0) {
      script.push(pick(SESSION_COMPLETE_PHRASES, rng))
      break
    }
    currentPartner = currentPartner === 1 ? 2 : 1
  }

  const outConfig = { ...config, homePositionId }
  delete outConfig.phase3TurnsPerPosition
  if (phase3PositionMode === 'reuse_multi') {
    outConfig.phase3ResolvedTurnsPerSlot = phase3TurnsPerSlot
    outConfig.phase3EstimatedTurnsInPhase = estPhase3TurnCount
  } else {
    delete outConfig.phase3ResolvedTurnsPerSlot
    delete outConfig.phase3EstimatedTurnsInPhase
  }
  if (usePhase3Reuse) {
    outConfig.phase3RotationCapResolved = phase3RotationCap
  } else {
    delete outConfig.phase3RotationCapResolved
  }

  const plan = {
    config: outConfig,
    turns,
    script,
  }

  // Refinement passes: (1) make instructions read sensibly turn-to-turn, then
  // (2) edit each instruction for spoken fluency. Both preserve phraseStrings
  // line counts and rebuild plan.script so audio/reroll indexing stays aligned.
  refineSessionScript(plan, { partnerName })

  return plan
}

/**
 * Build phrase strings for a single turn (matches pushTurnPhrases order in buildSessionPlan).
 * @param {() => number} rng
 * @param {object} config - same shape as buildSessionPlan config (partnerNames, partnerAnatomy, distributionMode, vibratorsPresent)
 * @param {object} params
 */
export function buildTurnPhraseStringsOnly(rng, config, params) {
  const {
    phase: p,
    giver,
    receiver,
    locationRoll: loc,
    actionRoll,
    extendedTime,
    clothingText,
    firstTurn,
    precomputedPrompt,
  } = params
  const { partnerNames = { 1: '', 2: '' }, partnerAnatomy = { 1: 'penis', 2: 'vulva' } } = config
  const partnerName = (num) => (partnerNames[num]?.trim() || `Partner ${num}`)
  const giverName = partnerName(giver)
  const receiverName = partnerName(receiver)
  let prompt = precomputedPrompt
  if (!prompt) {
    const partnerNamesMap = { 1: partnerName(1), 2: partnerName(2) }
    const partnerAnatomyMap = { 1: partnerAnatomy[1] || 'penis', 2: partnerAnatomy[2] || 'vulva' }
    prompt = getPromptText(p, loc, actionRoll, giver, receiver, partnerNamesMap, partnerAnatomyMap, {
      useCatalog: config.useActionCatalog !== false,
    })
    if (extendedTime) {
      const ext = p === 3 ? ' Spend about twice as long on this position.' : ' Spend about twice as long on this location.'
      prompt = { ...prompt, what: prompt.what + ext, instruction: prompt.instruction + ext }
    }
  }
  const chunk = []
  const homeId = params.homePositionId || getDefaultHomePosition().id
  if (firstTurn) {
    chunk.push(formatFirstTurnIntro(p, giverName, receiverName, rng))
  } else {
    chunk.push(formatHomeTransition(homeId))
  }
  if (clothingText) chunk.push(normalizeParenthesesForTts(slashToAndForTts(clothingText)))
  const instructionForTts = prompt.shortInstruction || prompt.instruction
  if (instructionForTts) chunk.push(instructionForTts)
  chunk.push(pick(EASE_IN_TEXTS, rng))
  const { text: turnStart } = formatTurnStartDirective(
    { giver: giverName, receiver: receiverName, where: prompt.where, phase: p },
    rng
  )
  chunk.push(turnStart)
  return { prompt, phraseStrings: chunk }
}

/**
 * @param {'location'|'action'} mode
 * @returns {null | { locationRoll, actionRoll, extendedTime, where, what, instruction, shortInstruction, clothing, phraseStrings }}
 */
export function computePartialRerollTurn(turn, config, mode, rng) {
  const excludeWhenTouching = mergeExcludePrefs(config.excludeWhenTouching)
  const excludeWhenTouched = mergeExcludePrefs(config.excludeWhenTouched)
  const distributionMode = config.distributionMode || 'equal'
  const vibratorsPresent = config.vibratorsPresent !== false
  const positionIntensity = config.positionIntensity === 'bed_only' ? 'bed_only' : 'more_physical'
  const partnerAnatomy = config.partnerAnatomy || { 1: 'penis', 2: 'vulva' }

  let loc = turn.locationRoll
  let actRoll = turn.actionRoll
  let extendedTime = !!turn.extendedTime

  const partnerName = (num) => (config.partnerNames?.[num]?.trim() || `Partner ${num}`)
  const partnerNamesMap = { 1: partnerName(1), 2: partnerName(2) }
  const partnerAnatomyMap = { 1: partnerAnatomy[1] || 'penis', 2: partnerAnatomy[2] || 'vulva' }

  // Build-up turn: re-roll via the intensity selector at the same target intensity.
  if (turn.phase !== 3 && turn.intensity != null) {
    const recvAnatomy = (partnerAnatomy[turn.receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
    const sel = selectBuildupTurn(rng, {
      receiverAnatomy: recvAnatomy,
      targetIntensity: turn.intensity,
      excludeKeys: mergedExcludeKeys(excludeWhenTouching, excludeWhenTouched),
      forceZoneId: mode === 'action' ? turn.zoneId : null,
      lastZoneId: mode === 'location' ? turn.zoneId : null,
      // Preserve coverage context: if the original turn was over-fabric, keep the
      // re-rolled action over that same garment.
      wardrobe: turn.overFabric && turn.garment ? [turn.garment] : null,
    })
    if (sel) {
      const prompt = composeBuildupPrompt({
        where: sel.where,
        instruction: sel.instruction,
        giverName: partnerNamesMap[turn.currentPartner],
        receiverName: partnerNamesMap[turn.receiver],
        overFabric: sel.overFabric,
        garment: sel.garment,
      })
      const firstTurnBu = turn.turnIndex === 1
      const clothingTextBu = turn.clothing || ''
      const { phraseStrings } = buildTurnPhraseStringsOnly(rng, config, {
        phase: turn.phase,
        giver: turn.currentPartner,
        receiver: turn.receiver,
        locationRoll: 0,
        actionRoll: 0,
        extendedTime: false,
        clothingText: clothingTextBu || undefined,
        firstTurn: firstTurnBu,
        precomputedPrompt: prompt,
        homePositionId: config.homePositionId || getDefaultHomePosition().id,
      })
      return {
        locationRoll: 0,
        actionRoll: 0,
        zoneId: sel.zoneId,
        intensity: sel.intensity,
        overFabric: !!sel.overFabric,
        garment: sel.garment || null,
        extendedTime: false,
        where: prompt.where,
        what: prompt.what,
        instruction: prompt.instruction,
        shortInstruction: prompt.shortInstruction || prompt.instruction,
        clothing: clothingTextBu || prompt.clothing || '',
        phraseStrings,
      }
    }
  }

  if (mode === 'location') {
    if (turn.phase === 3 && config.phase3PositionMode !== 'each_turn') return null
    if (turn.phase === 3) {
      const receiverAnatomyVal = (partnerAnatomy[turn.receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
      const pool = getPhase3PositionNumbersForReceiverAnatomy(receiverAnatomyVal, positionIntensity)
      if (!pool.length) return null
      loc = pool[Math.floor(rng() * pool.length)]
    } else {
      const r = rollPhase12WithExclusions(turn.phase, rng, distributionMode, excludeWhenTouching, excludeWhenTouched)
      loc = r.loc
    }
  } else {
    if (turn.phase === 3) {
      const mod = rollPhase3ModifierWithVibratorRule(rng, distributionMode, !!vibratorsPresent)
      actRoll = mod.actRoll
      extendedTime = mod.extendedTime
    } else {
      const r = rollPhase12WithExclusions(turn.phase, rng, distributionMode, excludeWhenTouching, excludeWhenTouched)
      actRoll = r.actRoll
      extendedTime = r.extendedTime
    }
  }

  const prompt = getPromptText(turn.phase, loc, actRoll, turn.currentPartner, turn.receiver, partnerNamesMap, partnerAnatomyMap, {
    useCatalog: config.useActionCatalog !== false,
  })
  if (extendedTime) {
    const ext =
      turn.phase === 3 ? ' Spend about twice as long on this position.' : ' Spend about twice as long on this location.'
    prompt.what += ext
    prompt.instruction += ext
  }

  const firstTurn = turn.turnIndex === 1
  const clothingText = turn.clothing || ''
  const { phraseStrings } = buildTurnPhraseStringsOnly(rng, config, {
    phase: turn.phase,
    giver: turn.currentPartner,
    receiver: turn.receiver,
    locationRoll: loc,
    actionRoll: actRoll,
    extendedTime: false,
    clothingText: clothingText || undefined,
    firstTurn,
    precomputedPrompt: prompt,
    homePositionId: config.homePositionId || getDefaultHomePosition().id,
  })

  return {
    locationRoll: loc,
    actionRoll: actRoll,
    extendedTime,
    where: prompt.where,
    what: prompt.what,
    instruction: prompt.instruction,
    shortInstruction: prompt.shortInstruction || prompt.instruction,
    clothing: clothingText || prompt.clothing || '',
    phraseStrings,
  }
}
