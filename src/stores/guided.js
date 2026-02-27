/**
 * Guided mode store: session flow, turns, prompts, TTS, breaks, clothing.
 * Drives the guided experience (intro, countdown, performGuidedTurn, break timers).
 */
import { defineStore } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { phase1And2Tables, phase3Modifiers, randomRollsForPhase } from '@/data/tables'
import { getPhase3PositionName, getPhase3PositionHelp, PHASE3_POSITIONS_LIST, getPhase3PositionNumbersForReceiverAnatomy } from 'phase3-data'
import { getPromptText } from '@/utils/promptHelper'
import {
  clothingTable,
  removeClothingItem,
  getClothingRemovalComplexityMultiplier,
} from '@/data/clothing'

// -----------------------------------------------------------------------------
// Helpers and constants (rolls, timed-step parsing, fixed phrases)
// -----------------------------------------------------------------------------
function rollD20() {
  return Math.floor(Math.random() * 20) + 1
}

/** Phase 3: two d20s → position 1–156; clamped to 1–155 to match PHASE3_POSITIONS_LIST. */
function rollPhase3Position() {
  const a = rollD20()
  const b = rollD20()
  return Math.min(155, ((a - 1) * 20 + b - 1) % 156 + 1)
}

/**
 * Parse the "what" prompt for timed segments (e.g. "30s eyes closed, 30s eyes open").
 * Returns array of { seconds, label, completionLabel? } for step-by-step voice prompts.
 */
function parseTimedSteps(text) {
  if (!text || typeof text !== 'string') return []
  const t = text.replace(/^Partner\s+\d+\s*:\s*/i, '').trim()

  const singleWithContinue = t.match(/(?:^|:\s*)(?:for\s+)?(\d+)\s*s(?:econds?)?\s+(.+?)\s*;\s*then\s+continue/i)
  if (singleWithContinue) {
    const sec = parseInt(singleWithContinue[1], 10)
    let desc = singleWithContinue[2].trim().replace(/\s+/g, ' ')
    desc = desc.replace(/\s*while\s+.*$/i, '').trim()
    desc = desc.replace(/\s*;.*$/, '').trim()
    const label = desc ? `${sec} second${sec === 1 ? '' : 's'}, ${desc}` : `${sec} second${sec === 1 ? '' : 's'}`
    const completionLabel = desc ? `${desc} done` : `${sec} second${sec === 1 ? '' : 's'} done`
    return [{ seconds: sec, label, completionLabel }]
  }

  const parts = t.split(/\s*,\s*|\s+then\s+/i)
  const segments = []
  for (const part of parts) {
    const m = part.match(/^\s*(?:for\s+)?(\d+)\s*s(?:econds?)?\s*(?:of\s+)?(.+)?$/i)
    if (m) {
      const sec = parseInt(m[1], 10)
      let desc = (m[2] || '').trim().replace(/\s+/g, ' ')
      desc = desc.replace(/\s*;.*$/, '').trim()
      const label = desc ? `${sec} second${sec === 1 ? '' : 's'}, ${desc}` : `${sec} second${sec === 1 ? '' : 's'}`
      segments.push({ seconds: sec, label })
    }
  }
  return segments.length >= 2 ? segments : []
}

function getSuggestedTurnSecondsFromPrompt(text) {
  if (!text || typeof text !== 'string') return 0
  let suggested = 0
  const secMatches = text.match(/\b(\d+)\s*s(?:econds?)?\b|for\s+(\d+)\s*s(?:econds?)?/gi)
  if (secMatches) {
    secMatches.forEach((m) => {
      const n = parseInt(m.replace(/\D/g, ''), 10)
      if (!isNaN(n)) suggested = Math.max(suggested, suggested + n)
    })
  }
  const timesMatch = text.match(/(\d+)\s+times/gi)
  if (timesMatch) {
    timesMatch.forEach((m) => {
      const n = parseInt(m.replace(/\D/g, ''), 10)
      if (n > 0) suggested = Math.max(suggested, n * 10)
    })
  }
  return suggested
}

const AFTER_DONG_SEC = 2
const AFTER_NEXT_TURN_SEC = 10
const SETTLE_IN_SEC = 20

/** Fixed phrase sets for preloading so TTS never blocks. */
const NEXT_TURN_PHRASES = [
  'That finishes that turn. Time to switch.',
  "That's the end of that turn. Time to switch.",
  'This turn is over. Time to switch.',
  "Switch when you're ready.",
]
const TURN_BEGINS_PHRASES = ['Turn begins.', 'Go.', "Whenever you're ready.", 'Begin.']
const EASE_IN_PHRASES = [
  'Take the next few seconds to settle into position. No rush.',
  "Settle into position when you're ready. No rush.",
  'Use the next few seconds to get comfortable. No rush.',
  "Whenever you're ready. No rush.",
]
const SESSION_COMPLETE_PHRASES = [
  'Session complete. Check in with each other.',
  'Guided session complete. Check in with each other.',
  "That's the end of the guided session. Check in with each other.",
  'All done. Check in with each other.',
]
const SETTLE_INTO_POSITION = 'Settle into position.'

function prepAll(prep, phrases) {
  if (!prep || !Array.isArray(phrases)) return
  phrases.forEach((p) => {
    if (p) prep(p)
  })
}

// -----------------------------------------------------------------------------
// Store definition
// -----------------------------------------------------------------------------
export const useGuidedStore = defineStore('guided', {
  state: () => ({
    // Config (set by startGuidedMode)
    totalSeconds: 0,
    turnSeconds: 0,
    pauseSeconds: 0,
    clothingRemovalSeconds: 30,
    phasePercents: [33, 34, 33],
    distributionMode: 'equal',
    phaseSeconds: [0, 0, 0],
    clothingItemsP1: [],
    clothingItemsP2: [],
    clothingEnabled: false,
    clothingMilestoneInterval: 3,
    partnerNames: { 1: '', 2: '' },
    partnerAnatomy: { 1: 'penis', 2: 'vulva' },

    // Running state
    turnsSinceLastRemoval: 0,
    totalTurnsInSession: 0,
    currentPartner: 1,
    turnTimeRemaining: 0,
    phaseTimeRemaining: 0,
    totalTimeRemaining: 0,
    paused: false,
    inPause: false,
    pauseTimeRemaining: 0,
    receiverOnceP1: false,
    receiverOnceP2: false,
    sessionComplete: false,
    inPhaseCheckIn: false,
    completedPhase: 0,
    inClothingWindow: false,
    clothingWindowRemaining: 0,
    breakPhase: 'none', // 'none' | 'next_turn' | 'before_clothing' | 'clothing_window' | 'instruction' | 'settle_in' | 'turn'
    breakCountdown: 0,
    firstTurnOfSession: true,
    firstTurnOfPhase3: false,
    stepSegments: [],
    lastSpokenStepIndex: -1,

    // Current prompt (where, what, instruction, clothing text)
    currentPrompt: {
      where: '',
      what: '',
      instruction: '',
      clothing: '',
      extendedTime: false,
      locationRoll: 0,
      actionRoll: 0,
    },

    // Callbacks set by view: speak(text, opts); stopSpeak(); preparePhrase(text)
    speakRef: null,
    stopSpeakRef: null,
    preparePhraseRef: null,
    pendingSpeech: null,
    turnTimerId: null,
    breakTimerId: null,
    clothingWindowTimerId: null,
    phaseCheckInEnabled: false,
  }),

  getters: {
    receiver() {
      return this.currentPartner === 1 ? 2 : 1
    },
    isActive() {
      return this.totalSeconds > 0 && !this.sessionComplete
    },
    currentActionLabel() {
      if (this.inClothingWindow) return 'Removing clothes'
      if (this.breakPhase === 'next_turn') return 'Time to switch'
      if (this.breakPhase === 'before_clothing') return 'Switching'
      if (this.breakPhase === 'settle_in') return 'Settle into position'
      if (this.breakPhase === 'turn' || this.turnTimeRemaining > 0) return 'Turn'
      if (this.inPause) return 'Pause'
      return ''
    },
    partnerName() {
      return (num) => (this.partnerNames[num]?.trim() || `Partner ${num}`)
    },
    /** Serializable snapshot for persistence; used by persistence.js and for reactive watch. */
    persistenceSnapshot() {
      if (!this.totalSeconds || this.sessionComplete) return null
      return {
        totalSeconds: this.totalSeconds,
        turnSeconds: this.turnSeconds,
        pauseSeconds: this.pauseSeconds,
        clothingRemovalSeconds: this.clothingRemovalSeconds,
        phasePercents: [...this.phasePercents],
        distributionMode: this.distributionMode,
        phaseSeconds: [...this.phaseSeconds],
        clothingItemsP1: [...this.clothingItemsP1],
        clothingItemsP2: [...this.clothingItemsP2],
        clothingEnabled: this.clothingEnabled,
        clothingMilestoneInterval: this.clothingMilestoneInterval,
        partnerNames: { ...this.partnerNames },
        partnerAnatomy: { ...this.partnerAnatomy },
        phaseCheckInEnabled: this.phaseCheckInEnabled,
        turnsSinceLastRemoval: this.turnsSinceLastRemoval,
        totalTurnsInSession: this.totalTurnsInSession,
        currentPartner: this.currentPartner,
        turnTimeRemaining: this.turnTimeRemaining,
        phaseTimeRemaining: this.phaseTimeRemaining,
        totalTimeRemaining: this.totalTimeRemaining,
        inPause: this.inPause,
        pauseTimeRemaining: this.pauseTimeRemaining,
        receiverOnceP1: this.receiverOnceP1,
        receiverOnceP2: this.receiverOnceP2,
        sessionComplete: this.sessionComplete,
        inPhaseCheckIn: this.inPhaseCheckIn,
        completedPhase: this.completedPhase,
        inClothingWindow: this.inClothingWindow,
        clothingWindowRemaining: this.clothingWindowRemaining,
        breakPhase: this.breakPhase,
        breakCountdown: this.breakCountdown,
        firstTurnOfSession: this.firstTurnOfSession,
        firstTurnOfPhase3: this.firstTurnOfPhase3,
        currentPrompt: { ...this.currentPrompt },
      }
    },
  },

  actions: {
    /** Restore guided state after load; leaves timers cleared and sets paused so user can Resume. */
    hydrateFromSaved(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return
      this.totalSeconds = snapshot.totalSeconds ?? 0
      this.turnSeconds = snapshot.turnSeconds ?? 0
      this.pauseSeconds = snapshot.pauseSeconds ?? 0
      this.clothingRemovalSeconds = snapshot.clothingRemovalSeconds ?? 30
      this.phasePercents = Array.isArray(snapshot.phasePercents) ? [...snapshot.phasePercents] : [33, 34, 33]
      this.distributionMode = snapshot.distributionMode ?? 'equal'
      this.phaseSeconds = Array.isArray(snapshot.phaseSeconds) ? [...snapshot.phaseSeconds] : [0, 0, 0]
      this.clothingItemsP1 = Array.isArray(snapshot.clothingItemsP1) ? [...snapshot.clothingItemsP1] : []
      this.clothingItemsP2 = Array.isArray(snapshot.clothingItemsP2) ? [...snapshot.clothingItemsP2] : []
      this.clothingEnabled = !!snapshot.clothingEnabled
      this.clothingMilestoneInterval = snapshot.clothingMilestoneInterval ?? 3
      this.partnerNames = snapshot.partnerNames && typeof snapshot.partnerNames === 'object' ? { ...snapshot.partnerNames } : { 1: '', 2: '' }
      this.partnerAnatomy = snapshot.partnerAnatomy && typeof snapshot.partnerAnatomy === 'object' ? { ...snapshot.partnerAnatomy } : { 1: 'penis', 2: 'vulva' }
      this.phaseCheckInEnabled = !!snapshot.phaseCheckInEnabled
      this.turnsSinceLastRemoval = Math.max(0, Number(snapshot.turnsSinceLastRemoval) || 0)
      this.totalTurnsInSession = Math.max(0, Number(snapshot.totalTurnsInSession) || 0)
      this.currentPartner = snapshot.currentPartner === 2 ? 2 : 1
      this.turnTimeRemaining = Math.max(0, Number(snapshot.turnTimeRemaining) || 0)
      this.phaseTimeRemaining = Math.max(0, Number(snapshot.phaseTimeRemaining) || 0)
      this.totalTimeRemaining = Math.max(0, Number(snapshot.totalTimeRemaining) || 0)
      this.paused = true
      this.inPause = !!snapshot.inPause
      this.pauseTimeRemaining = Math.max(0, Number(snapshot.pauseTimeRemaining) || 0)
      this.receiverOnceP1 = !!snapshot.receiverOnceP1
      this.receiverOnceP2 = !!snapshot.receiverOnceP2
      this.sessionComplete = !!snapshot.sessionComplete
      this.inPhaseCheckIn = !!snapshot.inPhaseCheckIn
      this.completedPhase = Number(snapshot.completedPhase) || 0
      this.inClothingWindow = !!snapshot.inClothingWindow
      this.clothingWindowRemaining = Math.max(0, Number(snapshot.clothingWindowRemaining) || 0)
      this.breakPhase = snapshot.breakPhase === 'next_turn' || snapshot.breakPhase === 'before_clothing' || snapshot.breakPhase === 'settle_in' || snapshot.breakPhase === 'turn' ? snapshot.breakPhase : 'none'
      this.breakCountdown = Math.max(0, Number(snapshot.breakCountdown) || 0)
      this.firstTurnOfSession = !!snapshot.firstTurnOfSession
      this.firstTurnOfPhase3 = !!snapshot.firstTurnOfPhase3
      if (snapshot.currentPrompt && typeof snapshot.currentPrompt === 'object') {
        this.currentPrompt = { where: '', what: '', instruction: '', clothing: '', extendedTime: false, locationRoll: 0, actionRoll: 0, ...snapshot.currentPrompt }
      }
      this.turnTimerId = null
      this.breakTimerId = null
      this.clothingWindowTimerId = null
      this.pendingSpeech = null
    },

    setSpeak(fn) {
      this.speakRef = fn
    },
    setStopSpeak(fn) {
      this.stopSpeakRef = fn
    },
    setPreparePhrase(fn) {
      this.preparePhraseRef = fn
    },
    safeSpeak(phrase, onEnd) {
      if (!this.speakRef) {
        if (onEnd) onEnd()
        return
      }
      this.pendingSpeech = null
      try {
        this.stopSpeakRef?.()
      } catch (_) {}
      this.pendingSpeech = { phrase, onEnd }
      this.speakRef(phrase, {
        force: true,
        onEnd: () => {
          this.pendingSpeech = null
          if (onEnd) onEnd()
        },
      })
    },

    startGuidedMode(config, options = {}) {
      const {
        totalMinutes,
        turnMinutes,
        pauseSeconds,
        clothingRemovalSeconds,
        phasePercents,
        clothingListP1,
        clothingListP2,
        clothingEnabled,
        distributionMode,
        partnerNames,
        partnerAnatomy,
        phaseCheckInEnabled,
      } = config

      this.totalSeconds = totalMinutes * 60
      this.turnSeconds = turnMinutes * 60
      this.pauseSeconds = pauseSeconds ?? 0
      this.clothingRemovalSeconds = clothingRemovalSeconds ?? 30
      this.phasePercents = phasePercents || [33, 34, 33]
      this.distributionMode = distributionMode || 'equal'
      this.phaseSeconds[0] = Math.floor(this.totalSeconds * (this.phasePercents[0] / 100))
      this.phaseSeconds[1] = Math.floor(this.totalSeconds * (this.phasePercents[1] / 100))
      this.phaseSeconds[2] = this.totalSeconds - this.phaseSeconds[0] - this.phaseSeconds[1]
      this.clothingItemsP1 = clothingEnabled ? [...(clothingListP1 || [])] : []
      this.clothingItemsP2 = clothingEnabled ? [...(clothingListP2 || [])] : []
      this.clothingEnabled = !!clothingEnabled
      this.partnerNames = { 1: (partnerNames && partnerNames[1]) || '', 2: (partnerNames && partnerNames[2]) || '' }
      this.partnerAnatomy = { 1: (partnerAnatomy && partnerAnatomy[1]) || 'penis', 2: (partnerAnatomy && partnerAnatomy[2]) || 'vulva' }
      this.phaseCheckInEnabled = !!phaseCheckInEnabled

      const totalItems = this.clothingItemsP1.length + this.clothingItemsP2.length
      const phase12Sec = this.phaseSeconds[0] + this.phaseSeconds[1]
      const cycleSec = this.turnSeconds + this.pauseSeconds
      const estimatedTurns = cycleSec > 0 ? Math.floor(phase12Sec / cycleSec) : 0
      if (this.clothingEnabled && totalItems > 0 && estimatedTurns > 0) {
        const targetTurns = Math.max(1, Math.floor(estimatedTurns * 0.9))
        this.clothingMilestoneInterval = Math.max(1, Math.floor(targetTurns / totalItems))
      } else {
        this.clothingMilestoneInterval = 3
      }

      this.totalTimeRemaining = this.totalSeconds
      this.turnTimeRemaining = 0
      this.pauseTimeRemaining = 0
      this.inPause = false
      this.currentPartner = 1
      this.paused = false
      this.turnsSinceLastRemoval = 0
      this.totalTurnsInSession = 0
      this.receiverOnceP1 = false
      this.receiverOnceP2 = false
      this.sessionComplete = false
      this.inPhaseCheckIn = false
      this.completedPhase = 0
      this.inClothingWindow = false
      this.clothingWindowRemaining = 0
      this.breakPhase = 'none'
      this.breakCountdown = 0
      this.firstTurnOfSession = true
      this.firstTurnOfPhase3 = false
      this.currentPrompt = { where: '', what: '', instruction: '', clothing: '', extendedTime: false, locationRoll: 0, actionRoll: 0 }

      let startPhase = 1
      for (let i = 0; i < 3; i++) {
        if (this.phaseSeconds[i] > 0) {
          startPhase = i + 1
          break
        }
      }
      this.phaseTimeRemaining = this.phaseSeconds[startPhase - 1]

      const sessionStore = useSessionStore()
      sessionStore.setPhase(startPhase)
      sessionStore.setRollCount(0)
      sessionStore.uiMode = 'guided'
      sessionStore.isGuidedMode = true
      sessionStore.showLanding = false

      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
      let intro
      if (options.prebuiltIntro) {
        intro = options.prebuiltIntro
      } else {
        const introOpenings = [
          'This is guided mode. You will hear a prompt for each turn. If a prompt does not work for you, substitute something you both like. ',
          'This is guided mode. You will get a prompt each turn. Feel free to swap in something you both prefer. ',
          'This is guided mode. Each turn has a prompt. If you would rather do something else, substitute anything you both like. ',
        ]
        const introClothingLines = [
          'During the session you will hear when to remove an item of clothing and how to do it. ',
          'You will hear when to remove clothing and how. ',
          'Clothing removal prompts will tell you when and how. ',
        ]
        const introClosings = [
          'After each turn you will hear when to switch, then settle into position, then the next prompt. Let us begin.',
          'Between turns you will hear when to switch, then time to settle into position, then the next prompt. Let us begin.',
          'Each turn ends with a switch, then settle into position, then the next prompt. Let us begin.',
        ]
        intro = pick(introOpenings)
        if (this.clothingEnabled) intro += pick(introClothingLines)
        intro += pick(introClosings)
      }

      // Preload intro and fixed phrases immediately so they're ready; worker won't block.
      const prepAtStart = this.preparePhraseRef
      if (prepAtStart) {
        prepAtStart(intro)
        prepAll(prepAtStart, NEXT_TURN_PHRASES)
        prepAll(prepAtStart, TURN_BEGINS_PHRASES)
        prepAll(prepAtStart, EASE_IN_PHRASES)
        prepAll(prepAtStart, SESSION_COMPLETE_PHRASES)
        prepAtStart(SETTLE_INTO_POSITION)
      }

      let introEnded = false
      const onIntroEnd = () => {
        if (introEnded) return
        introEnded = true
        if (this._introTimeoutId) {
          clearTimeout(this._introTimeoutId)
          this._introTimeoutId = null
        }
        this.performGuidedTurn()
      }
      if (this.speakRef) {
        this._introTimeoutId = setTimeout(onIntroEnd, 30000)
        this.safeSpeak(intro, onIntroEnd)
      } else {
        this.performGuidedTurn()
      }
    },

    performGuidedTurn() {
      if (this.paused || this.sessionComplete) return

      this.totalTurnsInSession++
      this.turnsSinceLastRemoval++

      let loc, actRoll, extendedTime = false
      const sessionStore = useSessionStore()
      const phase = sessionStore.phase
      if (phase === 3) {
        const receiverAnatomy = (this.partnerAnatomy[this.receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
        const pool = getPhase3PositionNumbersForReceiverAnatomy(receiverAnatomy)
        loc = pool[Math.floor(Math.random() * pool.length)]
        actRoll = rollD20()
        if (actRoll === 20 && this.distributionMode !== 'quickie') {
          extendedTime = true
          actRoll = Math.floor(Math.random() * 19) + 1
        }
      } else {
        const r = randomRollsForPhase(sessionStore.phase)
        loc = r.location
        actRoll = r.action
        if (actRoll === 20 && this.distributionMode !== 'quickie') {
          extendedTime = true
          actRoll = Math.floor(Math.random() * 19) + 1
        }
      }

      const giver = this.currentPartner
      const receiver = this.receiver
      if (receiver === 1) this.receiverOnceP1 = true
      if (receiver === 2) this.receiverOnceP2 = true

      const partnerNames = { 1: this.partnerName(1), 2: this.partnerName(2) }
      const partnerAnatomy = { 1: this.partnerAnatomy[1], 2: this.partnerAnatomy[2] }
      const prompt = getPromptText(sessionStore.phase, loc, actRoll, giver, receiver, partnerNames, partnerAnatomy)
      if (extendedTime) {
        const ext = phase === 3 ? ' Spend about twice as long on this position.' : ' Spend about twice as long on this location.'
        prompt.what += ext
        prompt.instruction += ext
      }

      this.currentPrompt = {
        ...prompt,
        extendedTime,
        locationRoll: loc,
        actionRoll: actRoll,
      }

      // Clothing removal (Phase 1 & 2 only)
      let clothingRemoved = false
      let currentRemovedItems = []
      let currentClothingMethodText = ''
      const receiverItems = receiver === 1 ? this.clothingItemsP1 : this.clothingItemsP2
      if (this.clothingEnabled && phase < 3 && this.turnsSinceLastRemoval >= this.clothingMilestoneInterval && receiverItems.length > 0) {
        const arr = receiver === 1 ? this.clothingItemsP1 : this.clothingItemsP2
        const removed = removeClothingItem(arr)
        this.turnsSinceLastRemoval = 0
        if (removed) {
          clothingRemoved = true
          currentRemovedItems = [removed]
          let howRoll = Math.floor(Math.random() * 12) + 1
          const entry = clothingTable[howRoll]
          currentClothingMethodText = (entry && entry.method) || ''
          const receiverLabel = this.partnerName(receiver)
          const giverLabel = this.partnerName(giver)
          const prefix = (entry?.prefix || '').replace(/\{receiver\}/g, receiverLabel)
          const methodText = entry?.method ? ` ${entry.method}` : ''
          let clothingText = `${giverLabel} ${prefix} ${receiverLabel}'s ${removed}${methodText}`
          if (howRoll === 12) {
            const second = removeClothingItem(arr)
            if (second) {
              currentRemovedItems.push(second)
              clothingText = `${giverLabel} ${prefix} ${receiverLabel}'s ${removed} and ${second}${methodText}`
            }
          }
          this.currentPrompt.clothing = clothingText
        }
      } else if (this.clothingEnabled && phase < 3 && receiverItems.length > 0) {
        this.currentPrompt.clothing = 'No clothing change this turn.'
      } else {
        this.currentPrompt.clothing = ''
      }

      let effectiveClothingSeconds = 0
      if (clothingRemoved && this.clothingRemovalSeconds > 0) {
        const mult = getClothingRemovalComplexityMultiplier(currentRemovedItems, currentClothingMethodText)
        effectiveClothingSeconds = Math.round(this.clothingRemovalSeconds * mult)
      }

      let baseTurnSec = this.turnSeconds
      this.turnTimeRemaining = baseTurnSec
      if (clothingRemoved && effectiveClothingSeconds > 0) this.turnTimeRemaining += effectiveClothingSeconds
      const suggested = getSuggestedTurnSecondsFromPrompt(prompt.what)
      if (suggested > 0) this.turnTimeRemaining = Math.min(Math.max(this.turnTimeRemaining, suggested), 5 * 60)
      if (extendedTime) this.turnTimeRemaining *= 2

      const giverName = this.partnerName(giver)
      const receiverName = this.partnerName(receiver)
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
      const nextTurnPhrase = pick([
        'That finishes that turn. Time to switch.',
        "That's the end of that turn. Time to switch.",
        'This turn is over. Time to switch.',
        "Switch when you're ready.",
      ])
      const firstTurnPhrase = phase === 3
        ? pick([
            `First turn. ${giverName} leads, ${receiverName} follows.`,
            `Kicking off. ${giverName} leads, ${receiverName} follows.`,
            `Here we go. ${giverName} leads, ${receiverName} follows.`,
            `Starting with ${giverName} leading and ${receiverName} following.`,
          ])
        : pick([
            `First turn. ${giverName} is giver, ${receiverName} is receiver.`,
            `Kicking off. ${giverName} gives, ${receiverName} receives.`,
            `Here we go. ${giverName} is giver, ${receiverName} is receiver.`,
            `Starting with ${giverName} as giver and ${receiverName} as receiver.`,
          ])
      const easeInPhrase = pick([
        'Take the next few seconds to settle into position. No rush.',
        "Settle into position when you're ready. No rush.",
        'Use the next few seconds to get comfortable. No rush.',
        "Whenever you're ready. No rush.",
      ])
      const turnBeginsPhrase = pick([
        'Turn begins.',
        'Go.',
        "Whenever you're ready.",
        'Begin.',
      ])

      // Preload TTS as soon as we have the prompt so the worker has max time (break countdowns) to generate.
      // Instruction and clothing first (longest, needed after before_clothing); then transition phrases.
      const prep = this.preparePhraseRef
      if (prep) {
        if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
        if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
        prep(firstTurnPhrase)
        prepAll(prep, NEXT_TURN_PHRASES)
        prepAll(prep, TURN_BEGINS_PHRASES)
        prepAll(prep, EASE_IN_PHRASES)
        if (this.phaseCheckInEnabled) {
          const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' }
          const nextLabel = phase < 3 ? `Continue to ${phaseNames[phase + 1]}` : 'end the session'
          prep(`${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap the button to ${nextLabel}.`)
          prep(`That's the end of ${phaseNames[phase]}. Check in with each other, then tap to ${nextLabel}.`)
          prep(`${phaseNames[phase]} is complete. Check in, then tap the button to ${nextLabel}.`)
        }
      }

      const onStartTimer = () => {
        this.breakPhase = 'none'
        this.breakCountdown = 0
        this.clearBreakTimer()
        this.startTurnTimer()
      }

      const runAfterSettleIn = () => {
        this.breakPhase = 'none'
        this.breakCountdown = 0
        this.clearBreakTimer()
        if (this.speakRef) this.safeSpeak(turnBeginsPhrase, onStartTimer)
        else onStartTimer()
      }

      const runSettleIn = () => {
        if (this.speakRef) {
          this.safeSpeak(easeInPhrase, () => {
            this.breakPhase = 'settle_in'
            this.breakCountdown = SETTLE_IN_SEC
            this.clearBreakTimer()
            this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
          })
        } else {
          this.breakPhase = 'settle_in'
          this.breakCountdown = SETTLE_IN_SEC
          this.clearBreakTimer()
          this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
        }
      }

      const runClothingThenInstruction = () => {
        this.breakPhase = 'none'
        this.breakCountdown = 0
        const clothingText = this.currentPrompt.clothing
        const instructionText = this.currentPrompt.instruction
        const clothingSec = effectiveClothingSeconds || this.clothingRemovalSeconds

        if (clothingText) {
          const onClothingSpoken = () => {
            this.breakPhase = 'none'
            this.breakCountdown = 0
            this.inClothingWindow = true
            this.clothingWindowRemaining = clothingSec
            this.clearClothingWindowTimer()
            this.clothingWindowTimerId = setInterval(() => this.tickClothingWindow(), 1000)
          }
          if (this.speakRef) this.safeSpeak(clothingText, onClothingSpoken)
          else onClothingSpoken()
        } else {
          if (instructionText && this.speakRef) this.safeSpeak(instructionText, runSettleIn)
          else runSettleIn()
        }
      }

      const runAfterNextTurn = () => {
        this.breakPhase = 'before_clothing'
        this.breakCountdown = AFTER_NEXT_TURN_SEC
        this.clearBreakTimer()
        this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
        const prep = this.preparePhraseRef
        if (prep) {
          if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
          if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
          prep(SETTLE_INTO_POSITION)
          prepAll(prep, TURN_BEGINS_PHRASES)
        }
      }

      const runAfterDong = () => {
        if (this.speakRef) this.safeSpeak(nextTurnPhrase, runAfterNextTurn)
        else runAfterNextTurn()
      }

      const startNextTurnCountdown = () => {
        this.breakPhase = 'next_turn'
        this.breakCountdown = AFTER_DONG_SEC
        this.clearBreakTimer()
        this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
        const prep = this.preparePhraseRef
        if (prep) {
          prep(nextTurnPhrase)
          if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
          if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
          prep(SETTLE_INTO_POSITION)
          prepAll(prep, TURN_BEGINS_PHRASES)
        }
      }

      const useFirstTurnPhrase = this.firstTurnOfSession || this.firstTurnOfPhase3
      if (useFirstTurnPhrase) {
        this.firstTurnOfSession = false
        if (phase === 3) this.firstTurnOfPhase3 = false
        if (this.speakRef) this.safeSpeak(firstTurnPhrase, runAfterNextTurn)
        else runAfterNextTurn()
      } else {
        startNextTurnCountdown()
      }
    },

    clearBreakTimer() {
      if (this.breakTimerId) {
        clearInterval(this.breakTimerId)
        this.breakTimerId = null
      }
    },
    clearTurnTimer() {
      if (this.turnTimerId) {
        clearInterval(this.turnTimerId)
        this.turnTimerId = null
      }
    },
    clearClothingWindowTimer() {
      if (this.clothingWindowTimerId) {
        clearInterval(this.clothingWindowTimerId)
        this.clothingWindowTimerId = null
      }
    },

    tickBreak() {
      if (this.paused) return
      this.breakCountdown--
      this.phaseTimeRemaining--
      this.totalTimeRemaining--
      if (this.breakCountdown <= 0) {
        this.clearBreakTimer()
        const phase = this.breakPhase
        this.breakPhase = 'none'
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
        if (phase === 'next_turn') {
          const phrase = pick([
            'That finishes that turn. Time to switch.',
            "That's the end of that turn. Time to switch.",
            'This turn is over. Time to switch.',
            "Switch when you're ready.",
          ])
          if (this.speakRef) this.safeSpeak(phrase, () => this.runAfterNextTurnFromTick())
          else this.runAfterNextTurnFromTick()
        } else if (phase === 'before_clothing') {
          const instructionText = this.currentPrompt.instruction
          const clothingText = this.currentPrompt.clothing
          if (clothingText) {
            const onClothingSpoken = () => {
              this.inClothingWindow = true
              this.clothingWindowRemaining = this.clothingRemovalSeconds
              this.clearClothingWindowTimer()
              this.clothingWindowTimerId = setInterval(() => this.tickClothingWindow(), 1000)
            }
            if (this.speakRef) this.safeSpeak(clothingText, onClothingSpoken)
            else onClothingSpoken()
          } else if (instructionText && this.speakRef) {
            this.safeSpeak(instructionText, () => this.runSettleInFromTick())
          } else {
            this.runSettleInFromTick()
          }
        } else if (phase === 'settle_in') {
          const phrase = pick(['Turn begins.', 'Go.', "Whenever you're ready.", 'Begin.'])
          if (this.speakRef) this.safeSpeak(phrase, () => this.startTurnTimer())
          else this.startTurnTimer()
        }
      }
    },

    runAfterNextTurnFromTick() {
      this.clearBreakTimer()
      this.breakPhase = 'before_clothing'
      this.breakCountdown = AFTER_NEXT_TURN_SEC
      this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
      const prep = this.preparePhraseRef
      if (prep) {
        if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
        if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
        prep(SETTLE_INTO_POSITION)
        prepAll(prep, TURN_BEGINS_PHRASES)
      }
    },

    runSettleInFromTick() {
      this.clearBreakTimer()
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
      const easeInPhrase = pick([
        'Take the next few seconds to settle into position. No rush.',
        "Settle into position when you're ready. No rush.",
        'Use the next few seconds to get comfortable. No rush.',
        "Whenever you're ready. No rush.",
      ])
      if (this.speakRef) {
        this.safeSpeak(easeInPhrase, () => {
          this.breakPhase = 'settle_in'
          this.breakCountdown = SETTLE_IN_SEC
          this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
        })
      } else {
        this.breakPhase = 'settle_in'
        this.breakCountdown = SETTLE_IN_SEC
        this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
      }
      const prep = this.preparePhraseRef
      if (prep) prepAll(prep, TURN_BEGINS_PHRASES)
    },

    tickClothingWindow() {
      this.clothingWindowRemaining--
      this.phaseTimeRemaining--
      this.totalTimeRemaining--
      if (this.clothingWindowRemaining <= 0) {
        this.clearClothingWindowTimer()
        this.inClothingWindow = false
        const instructionText = this.currentPrompt.instruction
        if (instructionText && this.speakRef) {
          this.safeSpeak(instructionText, () => this.runSettleInFromTick())
        } else {
          this.runSettleInFromTick()
        }
      }
    },

    startTurnTimer() {
      this.clearTurnTimer()
      this.clearClothingWindowTimer()
      this.inClothingWindow = false
      this.breakPhase = 'turn'
      this.turnTimerId = setInterval(() => this.tickTurn(), 1000)
    },

    tickTurn() {
      if (this.paused) return
      this.turnTimeRemaining--
      this.phaseTimeRemaining--
      this.totalTimeRemaining--
      if (this.turnTimeRemaining <= 0) {
        this.completeTurn()
      }
    },

    completeTurn() {
      this.clearTurnTimer()
      this.currentPartner = this.currentPartner === 1 ? 2 : 1
      const sessionStore = useSessionStore()
      const phase = sessionStore.phase
      const bothReceived = this.receiverOnceP1 && this.receiverOnceP2
      if (this.phaseTimeRemaining <= 0 && bothReceived) {
        if (this.phaseCheckInEnabled) {
          this.paused = true
          this.inPhaseCheckIn = true
          this.completedPhase = phase
          this.stopSpeakRef?.()
          const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
          const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' }
          const nextLabel = phase < 3 ? `Continue to ${phaseNames[phase + 1]}` : 'end the session'
          const phrase = pick([
            `${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap the button to ${nextLabel}.`,
            `That's the end of ${phaseNames[phase]}. Check in with each other, then tap to ${nextLabel}.`,
            `${phaseNames[phase]} is complete. Check in, then tap the button to ${nextLabel}.`,
          ])
          if (this.speakRef) this.safeSpeak(phrase)
        } else {
          this.advanceGuidedPhase()
        }
        return
      }
      if (this.totalTimeRemaining <= 0) {
        this.sessionComplete = true
        sessionStore.isGuidedMode = false
        this.stopSpeakRef?.()
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
        const phrase = pick([
          'Session complete. Check in with each other.',
          'Guided session complete. Check in with each other.',
          "That's the end of the guided session. Check in with each other.",
          'All done. Check in with each other.',
        ])
        if (this.speakRef) this.safeSpeak(phrase)
        return
      }
      this.performGuidedTurn()
    },

    advanceGuidedPhase() {
      const sessionStore = useSessionStore()
      if (sessionStore.phase >= 3) {
        this.sessionComplete = true
        sessionStore.isGuidedMode = false
        this.stopSpeakRef?.()
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
        const phrase = pick([
          'Session complete. Check in with each other.',
          'Guided session complete. Check in with each other.',
          "That's the end of the guided session. Check in with each other.",
          'All done. Check in with each other.',
        ])
        if (this.speakRef) this.safeSpeak(phrase)
        return
      }

      // Bonus clothing removal at end of Phase 2
      if (sessionStore.phase === 2 && this.clothingEnabled && (this.clothingItemsP1.length > 0 || this.clothingItemsP2.length > 0)) {
        while (this.clothingItemsP1.length > 0) removeClothingItem(this.clothingItemsP1)
        while (this.clothingItemsP2.length > 0) removeClothingItem(this.clothingItemsP2)
      }

      sessionStore.advancePhase()
      this.receiverOnceP1 = false
      this.receiverOnceP2 = false
      this.phaseTimeRemaining = this.phaseSeconds[sessionStore.phase - 1]
      if (sessionStore.phase === 3) this.firstTurnOfPhase3 = true
      setTimeout(() => {
        this.performGuidedTurn()
      }, 3000)
    },

    continueAfterPhaseCheckIn() {
      this.inPhaseCheckIn = false
      this.completedPhase = 0
      this.paused = false
      this.stopSpeakRef?.()
      this.advanceGuidedPhase()
    },

    pause() {
      this.paused = true
      try { this.stopSpeakRef?.() } catch (_) {}
      this.pendingSpeech = null
      this.clearTurnTimer()
      this.clearBreakTimer()
      this.clearClothingWindowTimer()
    },

    resume() {
      this.clearTurnTimer()
      this.clearBreakTimer()
      this.clearClothingWindowTimer()
      this.paused = false
      const pending = this.pendingSpeech
      this.pendingSpeech = null
      if (pending) {
        const { phrase, onEnd } = pending
        this.speakRef?.(phrase, { force: true, onEnd: () => { if (onEnd) onEnd() } })
        return
      }
      if (this.breakPhase !== 'none' && this.breakCountdown > 0) {
        this.breakTimerId = setInterval(() => this.tickBreak(), 1000)
      } else if (this.inClothingWindow && this.clothingWindowRemaining > 0) {
        this.clothingWindowTimerId = setInterval(() => this.tickClothingWindow(), 1000)
      } else if (this.breakPhase === 'turn' && this.turnTimeRemaining > 0) {
        this.turnTimerId = setInterval(() => this.tickTurn(), 1000)
      }
    },

    stop() {
      try { this.stopSpeakRef?.() } catch (_) {}
      this.pendingSpeech = null
      this.clearTurnTimer()
      this.clearBreakTimer()
      this.clearClothingWindowTimer()
      if (this._introTimeoutId) {
        clearTimeout(this._introTimeoutId)
        this._introTimeoutId = null
      }
      this.sessionComplete = true
      this.totalSeconds = 0
      useSessionStore().isGuidedMode = false
    },

    skipToNextTurn() {
      if (this.paused) return
      this.clearTurnTimer()
      this.clearBreakTimer()
      this.clearClothingWindowTimer()
      this.inClothingWindow = false
      this.stopSpeakRef?.()
      this.pendingSpeech = null
      this.phaseTimeRemaining -= this.turnTimeRemaining
      this.totalTimeRemaining -= this.turnTimeRemaining
      this.turnTimeRemaining = 0
      this.completeTurn()
    },
  },
})
