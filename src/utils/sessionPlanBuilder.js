/**
 * Session plan builder: deterministic dry-run of guided mode.
 * Produces SessionPlan { config, turns, script } for review and pre-generate audio.
 */
import { getPhase3PositionNumbersForReceiverAnatomy } from 'phase3-data'
import { getPromptText, normalizeParenthesesForTts, slashToAndForTts } from '@/utils/promptHelper'
import {
  clothingTable,
  removeClothingItem,
  getClothingRemovalComplexityMultiplier,
  computeClothingMilestoneInterval,
} from '@/data/clothing'
import {
  SESSION_COMPLETE_PHRASES,
  INTRO_NO_CLOTHING_VARIANTS,
  INTRO_WITH_CLOTHING_VARIANTS,
  NEXT_TURN_TEXTS,
  TURN_BEGINS_TEXTS,
  EASE_IN_TEXTS,
} from '@/data/staticPhrases'
import { rollPhase12WithExclusions, rollPhase3ModifierWithVibratorRule, mergeExcludePrefs } from '@/utils/bodyPartRollExclusions'

// -----------------------------------------------------------------------------
// Seeded RNG (LCG) for deterministic plans
// -----------------------------------------------------------------------------
function createSeededRng(seed) {
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
    distributionMode = 'equal',
    partnerNames = { 1: '', 2: '' },
    partnerAnatomy = { 1: 'penis', 2: 'vulva' },
    phaseCheckInEnabled = false,
    excludeWhenTouching: _exTouch,
    excludeWhenTouched: _exTouched,
    vibratorsPresent = true,
    phase3PositionMode = 'each_turn',
    phase3MaxPositions = 4,
    positionIntensity = 'more_physical',
  } = config

  const excludeWhenTouching = mergeExcludePrefs(_exTouch)
  const excludeWhenTouched = mergeExcludePrefs(_exTouched)

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
  let firstTurnOfPhase3 = phase === 3
  let receiverOnceP1 = false
  let receiverOnceP2 = false
  let turnIndex = 0
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

  // Intro (from staticPhrases)
  const intro = pick(clothingEnabled ? INTRO_WITH_CLOTHING_VARIANTS : INTRO_NO_CLOTHING_VARIANTS, rng)
  script.push(intro)

  const pushTurnPhrases = (turnData) => {
    const { phase: p, giver, receiver, prompt, clothingText, extendedTime, firstTurn } = turnData
    const giverName = partnerName(giver)
    const receiverName = partnerName(receiver)
    const partnerNamesMap = { 1: partnerName(1), 2: partnerName(2) }
    const partnerAnatomyMap = { 1: partnerAnatomy[1] || 'penis', 2: partnerAnatomy[2] || 'vulva' }

    if (firstTurn) {
      const firstTurnPhrase =
        p === 3
          ? pick(
              [
                `First turn. ${giverName} leads, ${receiverName} follows.`,
                `Kicking off. ${giverName} leads, ${receiverName} follows.`,
                `Here we go. ${giverName} leads, ${receiverName} follows.`,
                `Starting with ${giverName} leading and ${receiverName} following.`,
              ],
              rng
            )
          : pick(
              [
                `First turn. ${giverName} is giver, ${receiverName} is receiver.`,
                `Kicking off. ${giverName} gives, ${receiverName} receives.`,
                `Here we go. ${giverName} is giver, ${receiverName} is receiver.`,
                `Starting with ${giverName} as giver and ${receiverName} as receiver.`,
              ],
              rng
            )
      script.push(firstTurnPhrase)
    } else {
      script.push(pick(NEXT_TURN_TEXTS, rng))
    }
    if (clothingText) script.push(normalizeParenthesesForTts(slashToAndForTts(clothingText)))
    const instructionForTts = prompt.shortInstruction || prompt.instruction
    if (instructionForTts) script.push(instructionForTts)
    script.push(pick(EASE_IN_TEXTS, rng))
    script.push(pick(TURN_BEGINS_TEXTS, rng))
  }

  while (totalTimeRemaining > 0 && phase <= 3) {
    turnIndex++
    const receiver = currentPartner === 1 ? 2 : 1
    if (receiver === 1) receiverOnceP1 = true
    if (receiver === 2) receiverOnceP2 = true

    let loc, actRoll, extendedTime = false
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
      const r = rollPhase12WithExclusions(phase, rng, distributionMode, excludeWhenTouching, excludeWhenTouched)
      loc = r.loc
      actRoll = r.actRoll
      extendedTime = r.extendedTime
    }

    const partnerNamesMap = { 1: partnerName(1), 2: partnerName(2) }
    const partnerAnatomyMap = { 1: partnerAnatomy[1] || 'penis', 2: partnerAnatomy[2] || 'vulva' }
    const prompt = getPromptText(phase, loc, actRoll, currentPartner, receiver, partnerNamesMap, partnerAnatomyMap)
    if (extendedTime) {
      const ext = phase === 3 ? ' Spend about twice as long on this position.' : ' Spend about twice as long on this location.'
      prompt.what += ext
      prompt.instruction += ext
    }

    turnsSinceLastRemoval++
    let clothingText = ''
    let effectiveClothingSeconds = 0
    const receiverItems = receiver === 1 ? clothingItemsP1 : clothingItemsP2
    if (clothingEnabled && phase < 3 && turnsSinceLastRemoval >= clothingMilestoneInterval && receiverItems.length > 0) {
      const arr = receiver === 1 ? clothingItemsP1 : clothingItemsP2
      const removed = removeClothingItem(arr)
      turnsSinceLastRemoval = 0
      if (removed) {
        const howRoll = Math.floor(rng() * 12) + 1
        const entry = clothingTable[howRoll]
        const receiverLabel = partnerName(receiver)
        const giverLabel = partnerName(currentPartner)
        const prefix = (entry?.prefix || '').replace(/\{receiver\}/g, receiverLabel)
        const methodText = entry?.method ? ` ${entry.method}` : ''
        clothingText = `${giverLabel} ${prefix} ${receiverLabel}'s ${removed}${methodText}`
        if (howRoll === 12) {
          const second = removeClothingItem(arr)
          if (second) clothingText = `${giverLabel} ${prefix} ${receiverLabel}'s ${removed} and ${second}${methodText}`
        }
        effectiveClothingSeconds = Math.round(clothingRemovalSeconds * getClothingRemovalComplexityMultiplier([removed], entry?.method || ''))
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
      where: prompt.where,
      what: prompt.what,
      instruction: prompt.instruction,
      shortInstruction: prompt.shortInstruction || prompt.instruction,
      clothing: clothingText || prompt.clothing || '',
      durationSec: turnTime,
      extendedTime,
      phraseStrings: [],
    }
    const phraseStartIndex = script.length
    pushTurnPhrases({
      phase,
      giver: currentPartner,
      receiver,
      prompt,
      clothingText: clothingText || undefined,
      extendedTime,
      firstTurn: firstTurnOfSession || firstTurnOfPhase3,
    })
    turnRecord.phraseStrings = script.slice(phraseStartIndex)
    turns.push(turnRecord)

    if (phase === 3 && usePhase3Reuse && phase3ReusePlan?.length) {
      phase3TurnInSlot++
      if (phase3TurnInSlot >= phase3TurnsPerSlot) {
        phase3TurnInSlot = 0
        phase3ReuseSlot++
      }
    }

    firstTurnOfSession = false
    if (phase === 3) firstTurnOfPhase3 = false

    phaseTimeRemaining -= turnTime + breakOverhead
    totalTimeRemaining -= turnTime + breakOverhead

    const bothReceived = receiverOnceP1 && receiverOnceP2
    if (phaseTimeRemaining <= 0 && bothReceived) {
      if (phaseCheckInEnabled) {
        const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' }
        const nextLabel = phase < 3 ? `Continue to ${phaseNames[phase + 1]}` : 'end the session'
        script.push(
          pick(
            [
              `${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap the button to ${nextLabel}.`,
              `That's the end of ${phaseNames[phase]}. Check in with each other, then tap to ${nextLabel}.`,
              `${phaseNames[phase]} is complete. Check in, then tap the button to ${nextLabel}.`,
            ],
            rng
          )
        )
      }
      if (phase >= 3) {
        script.push(pick(SESSION_COMPLETE_PHRASES, rng))
        break
      }
      phase++
      phaseTimeRemaining = phaseSeconds[phase - 1]
      receiverOnceP1 = false
      receiverOnceP2 = false
      if (phase === 3) firstTurnOfPhase3 = true
      currentPartner = currentPartner === 1 ? 2 : 1
      continue
    }
    if (totalTimeRemaining <= 0) {
      script.push(pick(SESSION_COMPLETE_PHRASES, rng))
      break
    }
    currentPartner = currentPartner === 1 ? 2 : 1
  }

  const outConfig = { ...config }
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

  return {
    config: outConfig,
    turns,
    script,
  }
}
