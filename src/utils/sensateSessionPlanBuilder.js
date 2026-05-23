/**
 * Builds scripted sensate session plans compatible with cooking and playback.
 * Audio is fully pre-baked per phrase (static WAV per script line); users only skip ahead in the moment.
 * Each turn’s phrases are contiguous in `plan.script` / preGeneratedBlobs; `scriptIndexStart` marks where that turn’s audio begins for skip alignment.
 */
import { normalizeParenthesesForTts, slashToAndForTts } from '@/utils/promptHelper'
import { EASE_IN_TEXTS, formatTurnStartDirective } from '@/data/staticPhrases'
import { formatHomeTransition, getDefaultHomePosition } from '@/data/prompts/transitions/home-positions'
import {
  SENSATE_PHRASE_BY_ID,
  SENSATE_FIRST_TURN_TEXT,
  SENSATE_FIRST_TURN_P2_GIVER_TEXT,
  SENSATE_TRANSITION_PAUSE_ABOUT_ONE_MINUTE,
} from '@/data/sensateStaticPhrases'
import { getSensatePresetById } from '@/data/sensatePresets'
import { mergeExcludePrefs } from '@/utils/bodyPartRollExclusions'

const EASE_FIXED = EASE_IN_TEXTS[0]

/**
 * @typedef {{
 *   instructionId: string,
 *   durationSec: number,
 *   currentPartner: number,
 *   receiver: number,
 *   transitionOnly?: boolean,
 *   skipLeadLine?: boolean,
 *   closingOnly?: boolean,
 * }} SensateTurnSpec
 */

/**
 * @param {'random' | 1 | 2 | null | undefined} preference
 * @returns {1 | 2}
 */
export function resolveSensateFirstToucher(preference) {
  if (preference === 1 || preference === 2) return preference
  return Math.random() < 0.5 ? 1 : 2
}

/**
 * Turn-taking Phase 1 presets: touch block A → switch → touch block B → close.
 * Setup (space, phones, clothing) is folded into each preset’s intro phrase.
 * When first giver is Partner 2, order is block B → switch (P2) → block A → close.
 */
const REVERSIBLE_SPECS = {
  phase1_non_genital: {
    introPhraseId: 'sensate_intro_phase1_non_genital',
    touchP1toP2: {
      instructionId: 'sensate_p1ng_t2',
      durationSec: 600,
      currentPartner: 1,
      receiver: 2,
    },
    switchP1: {
      instructionId: 'sensate_p1ng_t3',
      durationSec: 60,
      currentPartner: 1,
      receiver: 2,
      transitionOnly: true,
    },
    switchP2: {
      instructionId: 'sensate_p1ng_t3_p2',
      durationSec: 60,
      currentPartner: 2,
      receiver: 1,
      transitionOnly: true,
    },
    touchP2toP1: {
      instructionId: 'sensate_p1ng_t4',
      durationSec: 600,
      currentPartner: 2,
      receiver: 1,
    },
    closeAfterP2Last: {
      instructionId: 'sensate_p1ng_t5',
      durationSec: 180,
      currentPartner: 2,
      receiver: 1,
      closingOnly: true,
    },
    closeAfterP1Last: {
      instructionId: 'sensate_p1ng_t5',
      durationSec: 180,
      currentPartner: 1,
      receiver: 2,
      closingOnly: true,
    },
  },
  phase1_genital_included: {
    introPhraseId: 'sensate_intro_phase1_genital',
    touchP1toP2: {
      instructionId: 'sensate_p1g_t2',
      durationSec: 600,
      currentPartner: 1,
      receiver: 2,
    },
    switchP1: {
      instructionId: 'sensate_p1g_t3',
      durationSec: 60,
      currentPartner: 1,
      receiver: 2,
      transitionOnly: true,
    },
    switchP2: {
      instructionId: 'sensate_p1g_t3_p2',
      durationSec: 60,
      currentPartner: 2,
      receiver: 1,
      transitionOnly: true,
    },
    touchP2toP1: {
      instructionId: 'sensate_p1g_t4',
      durationSec: 600,
      currentPartner: 2,
      receiver: 1,
    },
    closeAfterP2Last: {
      instructionId: 'sensate_p1g_t5',
      durationSec: 180,
      currentPartner: 2,
      receiver: 1,
      closingOnly: true,
    },
    closeAfterP1Last: {
      instructionId: 'sensate_p1g_t5',
      durationSec: 180,
      currentPartner: 1,
      receiver: 2,
      closingOnly: true,
    },
  },
  phase1_lotion: {
    introPhraseId: 'sensate_intro_lotion',
    touchP1toP2: {
      instructionId: 'sensate_lo_t2',
      durationSec: 600,
      currentPartner: 1,
      receiver: 2,
    },
    switchP1: {
      instructionId: 'sensate_lo_t3',
      durationSec: 60,
      currentPartner: 1,
      receiver: 2,
      transitionOnly: true,
    },
    switchP2: {
      instructionId: 'sensate_lo_t3_p2',
      durationSec: 60,
      currentPartner: 2,
      receiver: 1,
      transitionOnly: true,
    },
    touchP2toP1: {
      instructionId: 'sensate_lo_t4',
      durationSec: 600,
      currentPartner: 2,
      receiver: 1,
    },
    closeAfterP2Last: {
      instructionId: 'sensate_lo_t5',
      durationSec: 180,
      currentPartner: 2,
      receiver: 1,
      closingOnly: true,
    },
    closeAfterP1Last: {
      instructionId: 'sensate_lo_t5',
      durationSec: 180,
      currentPartner: 1,
      receiver: 2,
      closingOnly: true,
    },
  },
}

/** @type {Record<string, { introPhraseId: string, turnSpecs: SensateTurnSpec[] }>} */
const FIXED_PRESET_SPECS = {
  mutual_touching: {
    introPhraseId: 'sensate_intro_mutual',
    turnSpecs: [
      { instructionId: 'sensate_mu_t1', durationSec: 180, currentPartner: 1, receiver: 2 },
      { instructionId: 'sensate_mu_t2', durationSec: 900, currentPartner: 1, receiver: 2 },
      { instructionId: 'sensate_mu_t3', durationSec: 180, currentPartner: 1, receiver: 2 },
    ],
  },
  phase2_communication: {
    introPhraseId: 'sensate_intro_phase2_comm',
    turnSpecs: [
      { instructionId: 'sensate_p2_t1', durationSec: 300, currentPartner: 1, receiver: 2 },
      { instructionId: 'sensate_p2_t2', durationSec: 240, currentPartner: 1, receiver: 2 },
      { instructionId: 'sensate_p2_t3', durationSec: 360, currentPartner: 2, receiver: 1 },
      { instructionId: 'sensate_p2_t4', durationSec: 600, currentPartner: 1, receiver: 2 },
      { instructionId: 'sensate_p2_t5', durationSec: 180, currentPartner: 2, receiver: 1 },
    ],
  },
}

/**
 * @param {keyof typeof REVERSIBLE_SPECS} presetId
 * @param {1 | 2} firstGiver - who does the first long touch block
 * @returns {SensateTurnSpec[]}
 */
function buildReversibleTurnSpecs(presetId, firstGiver) {
  const R = REVERSIBLE_SPECS[presetId]
  if (!R) throw new Error(`Not a reversible sensate preset: ${presetId}`)
  if (firstGiver === 1) {
    return [R.touchP1toP2, R.switchP1, R.touchP2toP1, R.closeAfterP2Last]
  }
  return [R.touchP2toP1, R.switchP2, R.touchP1toP2, R.closeAfterP1Last]
}

/**
 * Spoken cue for the timer length of one sensate block (matches durationSec on each turn).
 * @param {number} durationSec
 * @returns {string}
 */
export function formatSensateBlockDurationSpeech(durationSec) {
  const s = Math.max(0, Math.round(Number(durationSec) || 0))
  if (s === 0) {
    return 'There is no fixed timer for this part.'
  }
  if (s < 60) {
    return s === 1
      ? 'This part is set for about one second.'
      : `This part is set for about ${s} seconds.`
  }
  const minutes = s / 60
  if (Number.isInteger(minutes)) {
    if (minutes === 1) return 'This part is set for about one minute.'
    return `This part is set for about ${minutes} minutes.`
  }
  const rounded = Math.round(minutes)
  if (rounded === 1) return 'This part is set for about one minute.'
  return `This part is set for about ${rounded} minutes.`
}

function getIntroAndTurnSpecs(presetId, firstGiver) {
  if (REVERSIBLE_SPECS[presetId]) {
    const R = REVERSIBLE_SPECS[presetId]
    return {
      introPhraseId: R.introPhraseId,
      turnSpecs: buildReversibleTurnSpecs(presetId, firstGiver),
    }
  }
  const fixed = FIXED_PRESET_SPECS[presetId]
  if (fixed) {
    return { introPhraseId: fixed.introPhraseId, turnSpecs: fixed.turnSpecs }
  }
  throw new Error(`Unknown sensate preset: ${presetId}`)
}

function pushSensateTurnScript(
  script,
  instructionRaw,
  { firstTurn, firstGiver, durationSec, transitionOnly, skipLeadLine, closingOnly, homePositionId, currentPartner, receiver }
) {
  const inst = instructionRaw ? normalizeParenthesesForTts(slashToAndForTts(instructionRaw)) : ''

  if (closingOnly) {
    if (inst) script.push(inst)
    return
  }

  if (firstTurn) {
    script.push(firstGiver === 2 ? SENSATE_FIRST_TURN_P2_GIVER_TEXT : SENSATE_FIRST_TURN_TEXT)
  } else if (!skipLeadLine) {
    script.push(formatHomeTransition(homePositionId))
  }

  const durationSpeech = transitionOnly
    ? SENSATE_TRANSITION_PAUSE_ABOUT_ONE_MINUTE
    : formatSensateBlockDurationSpeech(durationSec)
  script.push(normalizeParenthesesForTts(durationSpeech))
  if (inst) script.push(inst)
  if (!transitionOnly) {
    script.push(EASE_FIXED)
    const giver = `Partner ${currentPartner}`
    const recv = `Partner ${receiver}`
    const { text: turnStart } = formatTurnStartDirective({
      giver,
      receiver: recv,
      where: 'Sensate focus',
      phase: 1,
    })
    script.push(turnStart)
  }
}

/**
 * @param {string} presetId - key in PRESET_SPECS / sensatePresets
 * @param {object} config - partnerAnatomy, kokoroVoiceId; partnerNames usually empty (fixed Partner 1/2 in script+audio); sensateFirstToucherPreference 'random'|1|2
 * @returns {{ kind: 'sensate', config: object, turns: object[], script: string[] }}
 */
export function buildSensateSessionPlan(presetId, config) {
  const preset = getSensatePresetById(presetId)
  if (!preset) {
    throw new Error(`Unknown sensate preset: ${presetId}`)
  }

  const pref = config.sensateFirstToucherPreference
  const firstGiver =
    preset.supportsFirstToucherChoice === true ? resolveSensateFirstToucher(pref) : 1

  const { introPhraseId, turnSpecs } = getIntroAndTurnSpecs(presetId, firstGiver)

  const introText = SENSATE_PHRASE_BY_ID[introPhraseId]
  if (!introText) {
    throw new Error(`Missing intro phrase: ${introPhraseId}`)
  }

  const partnerNames = {
    1: (config.partnerNames && config.partnerNames[1]) || '',
    2: (config.partnerNames && config.partnerNames[2]) || '',
  }
  const partnerAnatomy = {
    1: (config.partnerAnatomy && config.partnerAnatomy[1]) || 'penis',
    2: (config.partnerAnatomy && config.partnerAnatomy[2]) || 'vulva',
  }

  const mergedConfig = {
    totalMinutes: 120,
    turnMinutes: 10,
    pauseSeconds: 0,
    clothingRemovalSeconds: 30,
    phasePercents: [100, 0, 0],
    clothingListP1: [],
    clothingListP2: [],
    clothingEnabled: false,
    distributionMode: 'equal',
    partnerNames,
    partnerAnatomy,
    phaseCheckInEnabled: false,
    excludeWhenTouching: mergeExcludePrefs(config.excludeWhenTouching),
    excludeWhenTouched: mergeExcludePrefs(config.excludeWhenTouched),
    vibratorsPresent: config.vibratorsPresent !== false,
    kokoroVoiceId: (config.kokoroVoiceId && String(config.kokoroVoiceId).trim()) || '',
    sessionKind: 'sensate',
    sensatePresetId: presetId,
    sensateTechniqueId: preset.techniqueId,
    homePositionId: config.homePositionId || getDefaultHomePosition().id,
    ...(preset.supportsFirstToucherChoice === true
      ? {
          sensateFirstToucherPreference:
            pref === 1 || pref === 2 || pref === 'random' ? pref : 'random',
          sensateFirstGiverResolved: firstGiver,
        }
      : {}),
  }

  const script = [normalizeParenthesesForTts(slashToAndForTts(introText))]
  const turns = []
  let turnIndex = 0

  for (let i = 0; i < turnSpecs.length; i++) {
    const t = turnSpecs[i]
    const instructionRaw = SENSATE_PHRASE_BY_ID[t.instructionId]
    if (!instructionRaw) {
      throw new Error(`Missing sensate instruction: ${t.instructionId}`)
    }
    turnIndex++
    const phraseStart = script.length
    pushSensateTurnScript(script, instructionRaw, {
      firstTurn: i === 0,
      firstGiver,
      durationSec: t.durationSec,
      transitionOnly: t.transitionOnly === true,
      skipLeadLine: t.skipLeadLine === true,
      closingOnly: t.closingOnly === true,
      homePositionId: mergedConfig.homePositionId,
      currentPartner: t.currentPartner,
      receiver: t.receiver,
    })
    const instruction = instructionRaw ? normalizeParenthesesForTts(slashToAndForTts(instructionRaw)) : ''

    turns.push({
      phase: 1,
      turnIndex,
      /** Index into plan.script / preGeneratedBlobs for this turn’s first phrase (intro is always index 0). */
      scriptIndexStart: phraseStart,
      currentPartner: t.currentPartner,
      receiver: t.receiver,
      locationRoll: 0,
      actionRoll: 0,
      where: 'Sensate focus',
      what: instruction,
      instruction,
      shortInstruction: instruction,
      clothing: '',
      durationSec: t.durationSec,
      extendedTime: false,
      phraseStrings: script.slice(phraseStart),
    })
  }

  return {
    kind: 'sensate',
    config: mergedConfig,
    turns,
    script,
  }
}
