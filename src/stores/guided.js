/**
 * Guided mode store: session flow, turns, prompts, TTS, breaks, clothing.
 * Drives the guided experience (intro, countdown, performGuidedTurn, break timers).
 */
import { defineStore } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { phase1And2Tables, phase3Modifiers } from '@/data/tables'
import { getPhase3PositionName, getPhase3PositionHelp, PHASE3_POSITIONS_LIST, getPhase3PositionNumbersForReceiverAnatomy } from 'phase3-data'
import { getPromptText, normalizeParenthesesForTts, slashToAndForTts } from '@/utils/promptHelper'
import {
  clothingTable,
  removeClothingItem,
  getClothingRemovalComplexityMultiplier,
  computeClothingMilestoneInterval,
} from '@/data/clothing'
import { buildSessionPlan } from '@/utils/sessionPlanBuilder'
import { buildSensateSessionPlan } from '@/utils/sensateSessionPlanBuilder'
import { getSuggestedTurnSecondsFromPrompt } from './guided/promptParsing.js'
import { rollPhase12WithExclusions, rollPhase3ModifierWithVibratorRule, mergeExcludePrefs } from '@/utils/bodyPartRollExclusions'
import {
  AFTER_DONG_SEC,
  AFTER_INSTRUCTION_TO_SETTLE_MS,
  AFTER_NEXT_TURN_SEC,
  SETTLE_IN_SEC,
  SETTLE_IN_SEC_FIRST_TURN,
  SKIP_TURN_GUARD_MS,
} from './guided/constants.js'
import {
  SESSION_COMPLETE_PHRASES,
  INTRO_NO_CLOTHING_VARIANTS,
  INTRO_WITH_CLOTHING_VARIANTS,
  NEXT_TURN_TEXTS,
  TURN_BEGINS_TEXTS,
  EASE_IN_TEXTS,
  SETTLE_INTO_POSITION_TEXT,
  getPhaseCheckinTexts,
} from '@/data/staticPhrases'

// -----------------------------------------------------------------------------
// Helpers (fixed phrase prep); timing constants in ./guided/constants.js; prompt parsing in ./guided/promptParsing.js
// -----------------------------------------------------------------------------
// Canonical session order (no duplicates, no extra phrases):
// 1. Intro phrase → (optional) "Kicking off" / first-turn intro
// 2. Turn 1: instruction (and clothing if any) → settle-in phrase → 15s → start phrase → turn timer
// 3. End-turn phrase ("Time to switch") → [AFTER_DONG_SEC] → next turn instructions (instruction + clothing if any) → settle-in → 15s → start phrase → turn
// 4. Repeat until last turn of phase
// 5. End of phase: phase check-in or "Phase N complete" → advance to next phase
// 6. Next phase: turn instruction → settle-in → 15s → start phrase → ... until session complete

function prepAll(prep, phrases) {
  if (!prep || !Array.isArray(phrases)) return
  phrases.forEach((p) => {
    if (p) prep(p)
  })
}

function clearNavigatorMediaSession() {
  try {
    if (typeof navigator !== 'undefined' && navigator.mediaSession) {
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.metadata = null
    }
  } catch (_) {}
}

// Guard against rapid double-click on Skip turn
let skipToNextTurnGuardUntil = 0

/** When the tab is hidden, main-thread timers are throttled; short intervals + wall-clock steps keep countdowns accurate after wake. */
const GUIDED_CLOCK_TICK_MS = 250

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
    excludeWhenTouching: mergeExcludePrefs(),
    excludeWhenTouched: mergeExcludePrefs(),
    vibratorsPresent: true,
    /** Kokoro voice id for this session; empty = use global preference at speak time. */
    sessionKokoroVoiceId: '',

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
      shortInstruction: '',
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

    /** Wall-clock anchors so timers catch up after tab sleep / throttled intervals (screen off). */
    _turnTickAnchorMs: null,
    _breakTickAnchorMs: null,
    _clothingTickAnchorMs: null,

    // Pre-generated session: plan (for review) and audio blobs (for playback)
    sessionPlan: null,
    preGeneratedBlobs: null,
    preGeneratedIndex: 0,
    /** Indices we already played via TTS because the blob was late; background fill should not write these (discard late blob). */
    consumedPreGeneratedIndices: new Set(),
    playPreGeneratedBlob: null,
    /** Config used to start the current/last session (for saving as favorite). */
    lastStartedConfig: null,
    /** Set true by resetAfterSessionComplete so the view can switch to wizard. */
    requestShowWizard: false,
    /** True when we played script[1] from blob right after intro to avoid TTS pause. */
    firstTurnPhrasePlayedFromBlob: false,
    /** Re-entry guard: true while settle-in phrase + countdown is in progress so we don't start it twice. */
    _settleInStarted: false,
    /** Guard: true after we've started speaking the ease-in phrase this turn (avoids duplicate phrase_start). */
    _easeInSpeakStarted: false,
    /** Dev overlay: log of audio events (phrase_start, phrase_end, pause, resume) with timestamps. */
    devAudioLog: [],
    /** Dev overlay: detailed cooking log (worker request/blob/error/timeout per phrase). */
    cookingLog: [],
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
    /** Last step label from dev log (for aria-live announcement). */
    lastStepLabel() {
      const log = this.devAudioLog || []
      for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].type === 'step' && log[i].text) return log[i].text
      }
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
        excludeWhenTouching: mergeExcludePrefs(this.excludeWhenTouching),
        excludeWhenTouched: mergeExcludePrefs(this.excludeWhenTouched),
        vibratorsPresent: this.vibratorsPresent,
        sessionKokoroVoiceId: this.sessionKokoroVoiceId,
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
      this.excludeWhenTouching = mergeExcludePrefs(snapshot.excludeWhenTouching)
      this.excludeWhenTouched = mergeExcludePrefs(snapshot.excludeWhenTouched)
      this.vibratorsPresent = snapshot.vibratorsPresent !== false
      this.sessionKokoroVoiceId = typeof snapshot.sessionKokoroVoiceId === 'string' ? snapshot.sessionKokoroVoiceId : ''
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
        this.currentPrompt = { where: '', what: '', instruction: '', shortInstruction: '', clothing: '', extendedTime: false, locationRoll: 0, actionRoll: 0, ...snapshot.currentPrompt }
      }
      this.turnTimerId = null
      this.breakTimerId = null
      this.clothingWindowTimerId = null
      this.pendingSpeech = null
      this._settleInStarted = false
      this._easeInSpeakStarted = false
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
    _devLog(type, text = '', extra = null) {
      const o = extra != null && typeof extra === 'object' ? extra : {}
      const source = o.source || null
      const reason = o.reason != null ? String(o.reason) : null
      this.devAudioLog.push({
        t: Date.now(),
        type,
        text: text ? String(text).slice(0, 120) : '',
        ...(source ? { source } : {}),
        ...(reason ? { reason } : {}),
      })
    },
    /** Options for speakRef; use browser TTS for short cues (ease-in, turn-begins) so fallback is instant. */
    _speakOpts(phrase, onEnd) {
      const voiceId = this.sessionKokoroVoiceId?.trim?.() || null
      const base = {
        force: true,
        onEnd: this._oncePhraseEnd(onEnd),
        onSource: (s) => this._devLog('phrase_start', phrase, { source: s }),
        onPlaybackFailed: (reason) => this._devLog('playback_failed', phrase, { source: 'kokoro', reason }),
        ...(voiceId ? { voiceId } : {}),
      }
      const shortCue = phrase && (EASE_IN_TEXTS.includes(phrase) || TURN_BEGINS_TEXTS.includes(phrase))
      return shortCue ? { ...base, forceTtsMode: 'browser' } : base
    },
    /** Wrap onEnd so it runs only once (prevents duplicate phrase_end from stale audio handlers). */
    _oncePhraseEnd(onEnd) {
      let done = false
      return () => {
        if (done) return
        done = true
        this.pendingSpeech = null
        this._devLog('phrase_end')
        if (onEnd) onEnd()
      }
    },
    /**
     * Sensate scripted playback uses only pre-baked blobs for plan lines (no live synthesis).
     * When blobs are active, missing clips skip straight to onEnd instead of Kokoro/browser.
     */
    sensateSkipLiveTtsFallback() {
      return this.sessionPlan?.kind === 'sensate' && this.preGeneratedBlobs != null
    },
    /** Play one phrase: use pre-generated blob if set and ready, else TTS. Falls back to TTS when blob is null/not ready so turn description always plays. */
    safeSpeak(phrase, onEnd) {
      phrase = phrase != null ? normalizeParenthesesForTts(slashToAndForTts(String(phrase))) : ''
      if (this.preGeneratedBlobs != null && this.playPreGeneratedBlob != null && this.preGeneratedIndex < this.preGeneratedBlobs.length) {
        let blob = this.preGeneratedBlobs[this.preGeneratedIndex]
        if (blob !== undefined && blob != null) {
          this.preGeneratedIndex++
          this.pendingSpeech = { phrase, onEnd }
          this._devLog('phrase_start', phrase, { source: 'kokoro' })
          const onPlaybackFailed = (reason) => {
            this._devLog('playback_failed', phrase, { source: 'kokoro', reason: reason || 'unknown' })
            if (this.sensateSkipLiveTtsFallback()) {
              if (onEnd) onEnd()
              return
            }
            if (this.speakRef && phrase) {
              this.pendingSpeech = { phrase, onEnd }
              this.speakRef(phrase, this._speakOpts(phrase, onEnd))
            } else if (onEnd) onEnd()
          }
          try {
            this.playPreGeneratedBlob(blob, this._oncePhraseEnd(onEnd), onPlaybackFailed)
          } catch (_) {
            onPlaybackFailed('exception')
          }
          return
        }
        if (blob === undefined) {
          const idx = this.preGeneratedIndex
          const start = Date.now()
          // Short cues (settle-in, turn-begins): don't wait long so we don't add a big pause
          const isShortCue = phrase && (EASE_IN_TEXTS.includes(phrase) || TURN_BEGINS_TEXTS.includes(phrase))
          const WAIT_MS = isShortCue ? 600 : 3000
          const iv = setInterval(() => {
            blob = this.preGeneratedBlobs[idx]
            if (blob !== undefined) {
              clearInterval(iv)
              if (blob != null) {
                this.preGeneratedIndex = idx + 1
                this.pendingSpeech = { phrase, onEnd }
                this._devLog('phrase_start', phrase, { source: 'kokoro' })
                const onPlaybackFailed = (reason) => {
                  this._devLog('playback_failed', phrase, { source: 'kokoro', reason: reason || 'unknown' })
                  if (this.sensateSkipLiveTtsFallback()) {
                    if (onEnd) onEnd()
                    return
                  }
                  if (this.speakRef && phrase) {
                    this.pendingSpeech = { phrase, onEnd }
                    this.speakRef(phrase, this._speakOpts(phrase, onEnd))
                  } else if (onEnd) onEnd()
                }
                try {
                  this.playPreGeneratedBlob(blob, this._oncePhraseEnd(onEnd), onPlaybackFailed)
                } catch (_) {
                  onPlaybackFailed('exception')
                }
              } else {
                this.markPreGeneratedSlotConsumed(idx)
                this.preGeneratedIndex = idx + 1
                if (this.speakRef && phrase && !this.sensateSkipLiveTtsFallback()) {
                  this.pendingSpeech = { phrase, onEnd }
                  this.speakRef(phrase, this._speakOpts(phrase, onEnd))
                } else if (onEnd) onEnd()
              }
            } else if (Date.now() - start > WAIT_MS) {
              clearInterval(iv)
              this.markPreGeneratedSlotConsumed(idx)
              this.preGeneratedIndex = idx + 1
              if (this.speakRef && phrase && !this.sensateSkipLiveTtsFallback()) {
                this.pendingSpeech = { phrase, onEnd }
                this.speakRef(phrase, this._speakOpts(phrase, onEnd))
              } else if (onEnd) onEnd()
            }
          }, 200)
          return
        }
        this.markPreGeneratedSlotConsumed(this.preGeneratedIndex)
        this.preGeneratedIndex++
        if (this.speakRef && phrase && !this.sensateSkipLiveTtsFallback()) {
          this.pendingSpeech = { phrase, onEnd }
          this.speakRef(phrase, this._speakOpts(phrase, onEnd))
          return
        }
        if (onEnd) onEnd()
        return
      }
      if (!this.speakRef) {
        if (onEnd) onEnd()
        return
      }
      if (this.sensateSkipLiveTtsFallback()) {
        if (onEnd) onEnd()
        return
      }
      this.pendingSpeech = { phrase, onEnd }
      this.speakRef(phrase, this._speakOpts(phrase, onEnd))
    },

    setSessionPlan(plan) {
      this.sessionPlan = plan
    },
    clearSessionPlan() {
      this.sessionPlan = null
      this.preGeneratedBlobs = null
      this.preGeneratedIndex = 0
    },
    /** Call when user clicks Guided Mode after a completed session; resets so they see setup from the start. */
    resetAfterSessionComplete() {
      this.sessionComplete = false
      this.totalSeconds = 0
      this.clearSessionPlan()
      this.requestShowWizard = true
    },
    buildSessionPlanFromConfig(config, seed) {
      const plan = buildSessionPlan(config, seed)
      this.sessionPlan = plan
      return plan
    },
    buildSensatePlanFromPreset(presetId, config) {
      const plan = buildSensateSessionPlan(presetId, config)
      this.sessionPlan = plan
      return plan
    },
    rerollTurn(turnIndex) {
      if (!this.sessionPlan || this.sessionPlan.kind === 'sensate') return
      const plan = this.sessionPlan
      const newPlan = buildSessionPlan(plan.config, Date.now())
      if (newPlan.turns[turnIndex] == null) return
      const oldTurn = plan.turns[turnIndex]
      const newTurn = newPlan.turns[turnIndex]
      const scriptStart =
        1 +
        plan.turns
          .slice(0, turnIndex)
          .reduce((acc, t) => acc + (t.phraseStrings?.length ?? 0), 0)
      const oldLen = oldTurn.phraseStrings?.length ?? 0
      plan.turns[turnIndex] = newTurn
      plan.script.splice(scriptStart, oldLen, ...(newTurn.phraseStrings ?? []))
    },
    rerollAll() {
      if (!this.sessionPlan || this.sessionPlan.kind === 'sensate') return
      const plan = buildSessionPlan(this.sessionPlan.config, Date.now())
      this.sessionPlan = plan
    },
    setPlayPreGeneratedBlob(fn) {
      this.playPreGeneratedBlob = fn
    },
    /** Append one entry to the cooking dev log (worker request/blob/error/timeout). */
    addCookingLogEntry(entry) {
      this.cookingLog.push({ t: Date.now(), ...entry })
    },
    /** Clear cooking log (call when starting a new cooking run). */
    clearCookingLog() {
      this.cookingLog = []
    },
    setPreGeneratedBlobs(blobs) {
      this.preGeneratedBlobs = blobs
      this.preGeneratedIndex = 0
      this.consumedPreGeneratedIndices = new Set()
      this.firstTurnPhrasePlayedFromBlob = false
    },
    /** Background fill: write a blob at index so playback can grab it (keeps store reactivity in sync). */
    setPreGeneratedBlobAt(index, blob) {
      if (this.preGeneratedBlobs && index >= 0 && index < this.preGeneratedBlobs.length) {
        this.preGeneratedBlobs[index] = blob
      }
    },
    /** Call when we fell back to TTS for this slot (blob was late); late blob should be discarded, not played. */
    markPreGeneratedSlotConsumed(idx) {
      this.consumedPreGeneratedIndices.add(idx)
    },

    /** Start guided session using pre-generated audio blobs (same order as sessionPlan.script). */
    startGuidedModeWithPreGenerated(config, blobs) {
      this.startGuidedMode(config, { usePreGeneratedBlobs: true, preGeneratedBlobs: blobs })
    },

    startGuidedMode(config, options = {}) {
      if (config) {
        this.lastStartedConfig = {
          ...config,
          excludeWhenTouching: mergeExcludePrefs(config.excludeWhenTouching),
          excludeWhenTouched: mergeExcludePrefs(config.excludeWhenTouched),
        }
      } else {
        this.lastStartedConfig = null
      }
      const blobArr = options.preGeneratedBlobs
      const usePreGeneratedBlobs =
        !!options.usePreGeneratedBlobs && Array.isArray(blobArr) && blobArr.length > 0
      if (usePreGeneratedBlobs) {
        this.preGeneratedBlobs = blobArr
        this.preGeneratedIndex = 0
      }
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
        excludeWhenTouching: cfgExTouch,
        excludeWhenTouched: cfgExTouched,
        vibratorsPresent: cfgVibrators,
        kokoroVoiceId: cfgVoiceId,
      } = config

      this.excludeWhenTouching = mergeExcludePrefs(cfgExTouch)
      this.excludeWhenTouched = mergeExcludePrefs(cfgExTouched)
      this.vibratorsPresent = cfgVibrators !== false
      this.sessionKokoroVoiceId = (cfgVoiceId && String(cfgVoiceId).trim()) || ''

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

      const phase12Sec = this.phaseSeconds[0] + this.phaseSeconds[1]
      this.clothingMilestoneInterval = computeClothingMilestoneInterval(
        phase12Sec,
        this.turnSeconds,
        this.pauseSeconds,
        this.clothingEnabled,
        this.clothingItemsP1,
        this.clothingItemsP2
      )

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
      this._settleInStarted = false
      this._easeInSpeakStarted = false
      this.firstTurnOfSession = true
      this.firstTurnOfPhase3 = false
      this.currentPrompt = { where: '', what: '', instruction: '', shortInstruction: '', clothing: '', extendedTime: false, locationRoll: 0, actionRoll: 0 }
      this.devAudioLog = []

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
      sessionStore.uiMode = this.sessionPlan?.kind === 'sensate' ? 'sensate' : 'guided'
      sessionStore.isGuidedMode = true
      sessionStore.showLanding = false

      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
      let intro
      if (options.prebuiltIntro) {
        intro = options.prebuiltIntro
      } else {
        intro = pick(this.clothingEnabled ? INTRO_WITH_CLOTHING_VARIANTS : INTRO_NO_CLOTHING_VARIANTS)
      }

      // Preload intro and fixed phrases immediately so they're ready; worker won't block.
      const prepAtStart = this.preparePhraseRef
      if (prepAtStart && this.sessionPlan?.kind !== 'sensate') {
        const vid = this.sessionKokoroVoiceId?.trim() || undefined
        const runPrep = (phrase) => prepAtStart(phrase, undefined, vid)
        runPrep(intro)
        prepAll(runPrep, NEXT_TURN_TEXTS)
        prepAll(runPrep, TURN_BEGINS_TEXTS)
        prepAll(runPrep, EASE_IN_TEXTS)
        prepAll(runPrep, SESSION_COMPLETE_PHRASES)
        runPrep(SETTLE_INTO_POSITION_TEXT)
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
      if (usePreGeneratedBlobs && this.playPreGeneratedBlob && this.preGeneratedBlobs.length > 0) {
        const blob = this.preGeneratedBlobs[this.preGeneratedIndex++]
        if (blob == null) {
          onIntroEnd()
          return
        }
        const nextBlob = this.preGeneratedBlobs[this.preGeneratedIndex]
        if (nextBlob != null) {
          this.preGeneratedIndex++
          this.playPreGeneratedBlob(blob, () => {
            this.playPreGeneratedBlob(nextBlob, () => {
              this.firstTurnPhrasePlayedFromBlob = true
              onIntroEnd()
            })
          })
        } else {
          this.playPreGeneratedBlob(blob, onIntroEnd)
        }
        return
      }
      if (this.speakRef) {
        this._introTimeoutId = setTimeout(onIntroEnd, 30000)
        this.safeSpeak(intro, onIntroEnd)
      } else {
        this.performGuidedTurn()
      }
    },

    /** Run one turn: set prompt, then either first-turn path (instruction → settle in → 15s → start phrase) or end-turn path (Time to switch → next instruction → settle in → 15s → start phrase). See canonical session order at top of file. */
    performGuidedTurn() {
      if (this.paused || this.sessionComplete) return

      this.totalTurnsInSession++
      this._devLog('step', `turn P${this.currentPartner}→P${this.receiver} #${this.totalTurnsInSession}`)
      this.turnsSinceLastRemoval++

      const sessionStore = useSessionStore()
      const phase = sessionStore.phase
      const giver = this.currentPartner
      const receiver = this.receiver
      if (receiver === 1) this.receiverOnceP1 = true
      if (receiver === 2) this.receiverOnceP2 = true

      let loc, actRoll, extendedTime = false
      let clothingRemoved = false
      let currentRemovedItems = []
      let currentClothingMethodText = ''

      const usePlanTurn = this.sessionPlan && this.preGeneratedBlobs?.length > 0 && this.sessionPlan.turns[this.totalTurnsInSession - 1]
      if (usePlanTurn) {
        const planTurn = this.sessionPlan.turns[this.totalTurnsInSession - 1]
        if (this.sessionPlan.kind === 'sensate') {
          this.currentPartner = planTurn.currentPartner
        }
        loc = planTurn.locationRoll
        actRoll = planTurn.actionRoll
        extendedTime = !!planTurn.extendedTime
        this.currentPrompt = {
          where: planTurn.where,
          what: planTurn.what,
          instruction: planTurn.instruction,
          shortInstruction: planTurn.shortInstruction || planTurn.instruction,
          clothing: planTurn.clothing || '',
          extendedTime,
          locationRoll: loc,
          actionRoll: actRoll,
        }
        if (planTurn.clothing) {
          clothingRemoved = true
          this.turnsSinceLastRemoval = 0
          const arr = receiver === 1 ? this.clothingItemsP1 : this.clothingItemsP2
          if (this.clothingEnabled && arr.length > 0) {
            removeClothingItem(arr)
            if (/Critical:\s*Remove\s*2\s*items|Remove\s*2\s*items/i.test(planTurn.clothing)) {
              removeClothingItem(arr)
            }
          }
        }
      } else {
        const rng = Math.random
        if (phase === 3) {
          const receiverAnatomy = (this.partnerAnatomy[this.receiver] || 'vulva').toLowerCase() === 'vulva' ? 'vulva' : 'penis'
          const posIntensity =
            (this.lastStartedConfig && this.lastStartedConfig.positionIntensity) || 'more_physical'
          const pool = getPhase3PositionNumbersForReceiverAnatomy(receiverAnatomy, posIntensity)
          loc = pool[Math.floor(Math.random() * pool.length)]
          const mod = rollPhase3ModifierWithVibratorRule(rng, this.distributionMode, this.vibratorsPresent)
          actRoll = mod.actRoll
          extendedTime = mod.extendedTime
        } else {
          const r = rollPhase12WithExclusions(phase, rng, this.distributionMode, this.excludeWhenTouching, this.excludeWhenTouched)
          loc = r.loc
          actRoll = r.actRoll
          extendedTime = r.extendedTime
        }

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
        } else {
          this.currentPrompt.clothing = ''
        }
      }

      let effectiveClothingSeconds = 0
      if (clothingRemoved && this.clothingRemovalSeconds > 0) {
        const mult = getClothingRemovalComplexityMultiplier(currentRemovedItems, currentClothingMethodText)
        effectiveClothingSeconds = Math.round(this.clothingRemovalSeconds * mult)
      }

      let baseTurnSec = this.turnSeconds
      this.turnTimeRemaining = baseTurnSec
      if (clothingRemoved && effectiveClothingSeconds > 0) this.turnTimeRemaining += effectiveClothingSeconds
      const planTurnForDuration =
        usePlanTurn && this.sessionPlan?.turns ? this.sessionPlan.turns[this.totalTurnsInSession - 1] : null
      if (
        planTurnForDuration &&
        this.sessionPlan?.kind === 'sensate' &&
        typeof planTurnForDuration.durationSec === 'number' &&
        planTurnForDuration.durationSec > 0
      ) {
        this.turnTimeRemaining = planTurnForDuration.durationSec
        if (clothingRemoved && effectiveClothingSeconds > 0) this.turnTimeRemaining += effectiveClothingSeconds
        if (extendedTime) this.turnTimeRemaining *= 2
      } else {
        const whatForSuggest = usePlanTurn ? this.currentPrompt.what : prompt.what
        const suggested = getSuggestedTurnSecondsFromPrompt(whatForSuggest)
        if (suggested > 0) this.turnTimeRemaining = Math.min(Math.max(this.turnTimeRemaining, suggested), 5 * 60)
        if (extendedTime) this.turnTimeRemaining *= 2
      }

      const giverName = this.partnerName(giver)
      const receiverName = this.partnerName(receiver)
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
      const nextTurnPhrase = pick(NEXT_TURN_TEXTS)
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
      const turnBeginsPhrase = pick(TURN_BEGINS_TEXTS)

      // Preload TTS in the worker so audio is ready when needed. Worker runs in background; preparePhrase
      // sends generate and caches the blob; when we speak() the same text we play from cache immediately.
      // Instruction and clothing first (longest); then transition phrases.
      const prep = this.preparePhraseRef
      if (prep && this.sessionPlan?.kind !== 'sensate') {
        if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
        if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
        prep(firstTurnPhrase)
        prepAll(prep, NEXT_TURN_TEXTS)
        prepAll(prep, TURN_BEGINS_TEXTS)
        prepAll(prep, EASE_IN_TEXTS)
        if (this.phaseCheckInEnabled) {
          const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' }
          const nextLabel = phase < 3 ? `Continue to ${phaseNames[phase + 1]}` : 'end the session'
          prep(`${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap the button to ${nextLabel}.`)
          prep(`That's the end of ${phaseNames[phase]}. Check in with each other, then tap to ${nextLabel}.`)
          prep(`${phaseNames[phase]} is complete. Check in, then tap the button to ${nextLabel}.`)
        }
      }

      const onStartTimer = () => {
        this._settleInStarted = false
        this._easeInSpeakStarted = false
        this.breakPhase = 'none'
        this.breakCountdown = 0
        this.clearBreakTimer()
        this.startTurnTimer()
      }

      const runSettleIn = () => {
        setTimeout(() => this.runSettleInFromTick(), AFTER_INSTRUCTION_TO_SETTLE_MS)
      }

      // Order: [clothing if any] → instruction → settle-in phrase → 15s → start phrase (via runSettleIn → runSettleInFromTick → tickBreak settle_in)
      const runClothingThenInstruction = () => {
        this._settleInStarted = false
        this._easeInSpeakStarted = false
        this.breakPhase = 'none'
        this.breakCountdown = 0
        const clothingText = this.currentPrompt.clothing
        const instructionText = this.currentPrompt.instruction
        const instructionToSpeak = (this.currentPrompt.shortInstruction || instructionText).trim() || instructionText
        const clothingSec = effectiveClothingSeconds || this.clothingRemovalSeconds

        if (clothingText) {
          this._devLog('step', 'phrase: clothing')
          const onClothingSpoken = () => {
            this.breakPhase = 'none'
            this.breakCountdown = 0
            this.inClothingWindow = true
            this.clothingWindowRemaining = clothingSec
            this.clearClothingWindowTimer()
            this._clothingTickAnchorMs = Date.now()
            this.clothingWindowTimerId = setInterval(() => this.tickClothingWindow(), GUIDED_CLOCK_TICK_MS)
          }
          if (this.speakRef) this.safeSpeak(clothingText, onClothingSpoken)
          else onClothingSpoken()
        } else {
          const playInstructionThenSettle = () => {
            if (instructionToSpeak && this.speakRef) {
              this._devLog('step', 'phrase: instruction')
              this.safeSpeak(instructionToSpeak, runSettleIn)
            } else runSettleIn()
          }
          playInstructionThenSettle()
        }
      }

      // After "Time to switch": short countdown then play next turn's instruction/clothing → settle-in → 15s → start phrase
      const runAfterNextTurn = () => {
        this.breakPhase = 'before_clothing'
        this.breakCountdown = AFTER_NEXT_TURN_SEC
        this.clearBreakTimer()
        this._breakTickAnchorMs = Date.now()
        this.breakTimerId = setInterval(() => this.tickBreak(), GUIDED_CLOCK_TICK_MS)
        const prep = this.preparePhraseRef
        if (prep && this.sessionPlan?.kind !== 'sensate') {
          if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
          if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
          prep(SETTLE_INTO_POSITION_TEXT)
          prepAll(prep, TURN_BEGINS_TEXTS)
        }
      }

      const runAfterDong = () => {
        if (this.speakRef) this.safeSpeak(nextTurnPhrase, runAfterNextTurn)
        else runAfterNextTurn()
      }

      // End-turn: show "Time to switch" countdown, then runAfterNextTurn → next turn instruction → settle-in → 15s → start phrase
      const startNextTurnCountdown = () => {
        this._devLog('step', 'next_turn_countdown')
        this.breakPhase = 'next_turn'
        this.breakCountdown = AFTER_DONG_SEC
        this.clearBreakTimer()
        this._breakTickAnchorMs = Date.now()
        this.breakTimerId = setInterval(() => this.tickBreak(), GUIDED_CLOCK_TICK_MS)
        const prep = this.preparePhraseRef
        if (prep && this.sessionPlan?.kind !== 'sensate') {
          prep(nextTurnPhrase)
          if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
          if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
          prep(SETTLE_INTO_POSITION_TEXT)
          prepAll(prep, TURN_BEGINS_TEXTS)
        }
      }

      // First turn of session or first turn of phase 3: [optional first-turn intro] → turn instruction → settle in → 15s → start phrase → turn
      const useFirstTurnPhrase = this.firstTurnOfSession || this.firstTurnOfPhase3
      if (useFirstTurnPhrase) {
        this.firstTurnOfSession = false
        if (phase === 3) this.firstTurnOfPhase3 = false
        if (this.firstTurnPhrasePlayedFromBlob) {
          this.firstTurnPhrasePlayedFromBlob = false
          runClothingThenInstruction()
        } else {
          if (this.speakRef) this.safeSpeak(firstTurnPhrase, () => runClothingThenInstruction())
          else runClothingThenInstruction()
        }
      } else {
        startNextTurnCountdown()
      }
    },

    clearBreakTimer() {
      if (this.breakTimerId) {
        clearInterval(this.breakTimerId)
        this.breakTimerId = null
      }
      this._breakTickAnchorMs = null
    },
    clearTurnTimer() {
      if (this.turnTimerId) {
        clearInterval(this.turnTimerId)
        this.turnTimerId = null
      }
      this._turnTickAnchorMs = null
    },
    clearClothingWindowTimer() {
      if (this.clothingWindowTimerId) {
        clearInterval(this.clothingWindowTimerId)
        this.clothingWindowTimerId = null
      }
      this._clothingTickAnchorMs = null
    },

    tickBreak() {
      if (this.paused) return
      const now = Date.now()
      if (this._breakTickAnchorMs == null) this._breakTickAnchorMs = now
      const elapsedMs = now - this._breakTickAnchorMs
      let stepSec = Math.min(300, Math.floor(elapsedMs / 1000))
      if (stepSec < 1) return
      this._breakTickAnchorMs += stepSec * 1000
      this.breakCountdown -= stepSec
      this.phaseTimeRemaining -= stepSec
      this.totalTimeRemaining -= stepSec
      if (this.breakCountdown > 0) return
      this.clearBreakTimer()
      const phase = this.breakPhase
      this.breakPhase = 'none'
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
      if (phase === 'next_turn') {
        // End-turn phrase ("Time to switch") → then next turn instructions
        this._devLog('step', 'phrase: next_turn (switch)')
        const phrase = pick(NEXT_TURN_TEXTS)
        if (this.speakRef) this.safeSpeak(phrase, () => this.runAfterNextTurnFromTick())
        else this.runAfterNextTurnFromTick()
      } else if (phase === 'before_clothing') {
        // Next turn: instruction (and clothing if any) → settle-in → 15s → start phrase
        this._settleInStarted = false
        this._easeInSpeakStarted = false
        const instructionToSpeak = (this.currentPrompt.shortInstruction || this.currentPrompt.instruction).trim() || this.currentPrompt.instruction
        const clothingText = this.currentPrompt.clothing
        if (clothingText) {
          this._devLog('step', 'phrase: clothing')
          const onClothingSpoken = () => {
            this.inClothingWindow = true
            this.clothingWindowRemaining = this.clothingRemovalSeconds
            this.clearClothingWindowTimer()
            this._clothingTickAnchorMs = Date.now()
            this.clothingWindowTimerId = setInterval(() => this.tickClothingWindow(), GUIDED_CLOCK_TICK_MS)
          }
          if (this.speakRef) this.safeSpeak(clothingText, onClothingSpoken)
          else onClothingSpoken()
        } else if (instructionToSpeak && this.speakRef) {
          this._devLog('step', 'phrase: instruction')
          this.safeSpeak(instructionToSpeak, () => { setTimeout(() => this.runSettleInFromTick(), AFTER_INSTRUCTION_TO_SETTLE_MS) })
        } else {
          setTimeout(() => this.runSettleInFromTick(), AFTER_INSTRUCTION_TO_SETTLE_MS)
        }
      } else if (phase === 'settle_in') {
        // 15s countdown finished → start phrase ("Whenever you're ready") → turn timer
        this._devLog('step', 'phrase: turn_begins')
        const phrase = pick(TURN_BEGINS_TEXTS)
        if (this.speakRef) this.safeSpeak(phrase, () => this.startTurnTimer())
        else this.startTurnTimer()
      }
    },

    // After end-turn phrase: start countdown; when it hits 0, tickBreak(before_clothing) plays instruction → settle-in → 15s → start phrase
    runAfterNextTurnFromTick() {
      this._devLog('step', 'before_clothing_countdown')
      this.clearBreakTimer()
      this.breakPhase = 'before_clothing'
      this.breakCountdown = AFTER_NEXT_TURN_SEC
      this._breakTickAnchorMs = Date.now()
      this.breakTimerId = setInterval(() => this.tickBreak(), GUIDED_CLOCK_TICK_MS)
      const prep = this.preparePhraseRef
      if (prep && this.sessionPlan?.kind !== 'sensate') {
        if (this.currentPrompt.clothing) prep(this.currentPrompt.clothing)
        if (this.currentPrompt.instruction) prep(this.currentPrompt.instruction)
        prep(SETTLE_INTO_POSITION_TEXT)
        prepAll(prep, TURN_BEGINS_TEXTS)
      }
    },

    /** Single place: play settle-in phrase then start 15s countdown; when 0, tickBreak(settle_in) plays start phrase and starts turn. */
    runSettleInFromTick() {
      this._devLog('step', 'settle_in')
      this.clearBreakTimer()
      if (this._settleInStarted) return
      this._settleInStarted = true
      const settleSec = this.totalTurnsInSession === 1 ? SETTLE_IN_SEC_FIRST_TURN : SETTLE_IN_SEC
      const startCountdown = () => {
        this._devLog('step', `settle_in_countdown ${settleSec}s`)
        this.breakPhase = 'settle_in'
        this.breakCountdown = settleSec
        this._breakTickAnchorMs = Date.now()
        this.breakTimerId = setInterval(() => this.tickBreak(), GUIDED_CLOCK_TICK_MS)
      }
      if (this._easeInSpeakStarted) {
        startCountdown()
        return
      }
      this._easeInSpeakStarted = true
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
      // Use the plan's ease-in phrase when we have one (matches pre-generated blob); else pick at random
      const scriptPhrase = this.sessionPlan?.script?.[this.preGeneratedIndex]
      const easeInPhrase =
        scriptPhrase && EASE_IN_TEXTS.includes(scriptPhrase) ? scriptPhrase : pick(EASE_IN_TEXTS)
      // If next blob is turn-begins (we're one ahead), speak ease-in via TTS only so we don't consume it
      const nextBlobIsTurnBegins = scriptPhrase && TURN_BEGINS_TEXTS.includes(scriptPhrase)
      if (this.speakRef) {
        // Sensate uses only pre-baked blobs for these cues; avoid live TTS here so playback stays aligned with script indices.
        if (nextBlobIsTurnBegins && this.sessionPlan?.kind !== 'sensate') {
          this.pendingSpeech = { phrase: easeInPhrase, onEnd: startCountdown }
          this._devLog('phrase_start', easeInPhrase, { source: 'kokoro' })
          this.speakRef(easeInPhrase, this._speakOpts(easeInPhrase, startCountdown))
        } else {
          this.safeSpeak(easeInPhrase, startCountdown)
        }
      } else {
        startCountdown()
      }
      const prep = this.preparePhraseRef
      if (prep && this.sessionPlan?.kind !== 'sensate') prepAll(prep, TURN_BEGINS_TEXTS)
    },

    tickClothingWindow() {
      if (this.paused) return
      const now = Date.now()
      if (this._clothingTickAnchorMs == null) this._clothingTickAnchorMs = now
      const elapsedMs = now - this._clothingTickAnchorMs
      let stepSec = Math.min(300, Math.floor(elapsedMs / 1000))
      if (stepSec < 1) return
      this._clothingTickAnchorMs += stepSec * 1000
      this.clothingWindowRemaining -= stepSec
      this.phaseTimeRemaining -= stepSec
      this.totalTimeRemaining -= stepSec
      if (this.clothingWindowRemaining > 0) return
      this.clearClothingWindowTimer()
      this.inClothingWindow = false
      const instructionToSpeak = (this.currentPrompt.shortInstruction || this.currentPrompt.instruction).trim() || this.currentPrompt.instruction
      if (instructionToSpeak && this.speakRef) {
        this.safeSpeak(instructionToSpeak, () => { setTimeout(() => this.runSettleInFromTick(), AFTER_INSTRUCTION_TO_SETTLE_MS) })
      } else {
        setTimeout(() => this.runSettleInFromTick(), AFTER_INSTRUCTION_TO_SETTLE_MS)
      }
    },

    startTurnTimer() {
      this._devLog('step', 'turn')
      this.clearTurnTimer()
      this.clearClothingWindowTimer()
      this.inClothingWindow = false
      this.breakPhase = 'turn'
      this._turnTickAnchorMs = Date.now()
      this.turnTimerId = setInterval(() => this.tickTurn(), GUIDED_CLOCK_TICK_MS)
    },

    tickTurn() {
      if (this.paused) return
      const now = Date.now()
      if (this._turnTickAnchorMs == null) this._turnTickAnchorMs = now
      const elapsedMs = now - this._turnTickAnchorMs
      let stepSec = Math.min(300, Math.floor(elapsedMs / 1000))
      if (stepSec < 1) return
      this._turnTickAnchorMs += stepSec * 1000
      this.turnTimeRemaining -= stepSec
      this.phaseTimeRemaining -= stepSec
      this.totalTimeRemaining -= stepSec
      if (this.turnTimeRemaining > 0) return
      this.completeTurn()
    },

    completeTurn() {
      this._devLog('step', 'complete_turn')
      this.clearTurnTimer()
      this.currentPartner = this.currentPartner === 1 ? 2 : 1
      const sessionStore = useSessionStore()
      const phase = sessionStore.phase
      const bothReceived = this.receiverOnceP1 && this.receiverOnceP2
      const sensatePlan = this.sessionPlan?.kind === 'sensate' ? this.sessionPlan : null
      if (sensatePlan && this.totalTurnsInSession >= sensatePlan.turns.length) {
        this.sessionComplete = true
        sessionStore.isGuidedMode = false
        this.stopSpeakRef?.()
        this.preGeneratedBlobs = null
        this.preGeneratedIndex = 0
        clearNavigatorMediaSession()
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
        const phrase = pick(SESSION_COMPLETE_PHRASES)
        // Closing line is not part of the fixed sensate script; allow Kokoro/static as for guided cues.
        if (this.speakRef) this.speakRef(phrase, { ...this._speakOpts(phrase, () => {}), staticPresetKind: 'guided' })
        return
      }
      // Last turn of phase: insert end-of-phase then next phase (turn instruction → settle in → 15s → start phrase …)
      if (!sensatePlan && this.phaseTimeRemaining <= 0 && bothReceived) {
        if (this.phaseCheckInEnabled) {
          this.paused = true
          this.inPhaseCheckIn = true
          this.completedPhase = phase
          this.stopSpeakRef?.()
          const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
          const phrase = pick(getPhaseCheckinTexts(phase))
          if (this.speakRef) this.safeSpeak(phrase)
        } else {
          this.advanceGuidedPhase()
        }
        return
      }
      if (!sensatePlan && this.totalTimeRemaining <= 0) {
        this.sessionComplete = true
        sessionStore.isGuidedMode = false
        this.stopSpeakRef?.()
        this.preGeneratedBlobs = null
        this.preGeneratedIndex = 0
        clearNavigatorMediaSession()
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
        const phrase = pick(SESSION_COMPLETE_PHRASES)
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
        this.preGeneratedBlobs = null
        this.preGeneratedIndex = 0
        clearNavigatorMediaSession()
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
        const phrase = pick(SESSION_COMPLETE_PHRASES)
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
      // Brief pause then start next phase: first turn of new phase (instruction → settle in → 15s → start phrase → …)
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

    /**
     * When the tab becomes visible again, timers may have been frozen for a long interval.
     * Run one wall-clock tick for whichever countdown is active so the session catches up immediately.
     */
    onDocumentVisible() {
      if (this.paused || this.sessionComplete) return
      if (this.turnTimerId) this.tickTurn()
      else if (this.clothingWindowTimerId) this.tickClothingWindow()
      else if (this.breakTimerId) this.tickBreak()
    },

    pause() {
      this.paused = true
      this._devLog('pause')
      this._turnTickAnchorMs = null
      this._breakTickAnchorMs = null
      this._clothingTickAnchorMs = null
      try { this.stopSpeakRef?.() } catch (_) {}
      // Keep pendingSpeech so resume() can replay the current phrase
      this.clearTurnTimer()
      this.clearBreakTimer()
      this.clearClothingWindowTimer()
    },

    resume() {
      this._devLog('resume')
      this.clearTurnTimer()
      this.clearBreakTimer()
      this.clearClothingWindowTimer()
      this.paused = false
      const pending = this.pendingSpeech
      this.pendingSpeech = null
      if (pending) {
        const { phrase, onEnd } = pending
        this.speakRef?.(phrase, this._speakOpts(phrase, onEnd))
      }
      // Always re-establish timers so countdown continues (with or without pending speech)
      if (this.breakPhase !== 'none' && this.breakCountdown > 0) {
        this._breakTickAnchorMs = Date.now()
        this.breakTimerId = setInterval(() => this.tickBreak(), GUIDED_CLOCK_TICK_MS)
      } else if (this.inClothingWindow && this.clothingWindowRemaining > 0) {
        this._clothingTickAnchorMs = Date.now()
        this.clothingWindowTimerId = setInterval(() => this.tickClothingWindow(), GUIDED_CLOCK_TICK_MS)
      } else if (this.breakPhase === 'turn' && this.turnTimeRemaining > 0) {
        this._turnTickAnchorMs = Date.now()
        this.turnTimerId = setInterval(() => this.tickTurn(), GUIDED_CLOCK_TICK_MS)
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
      this.preGeneratedBlobs = null
      this.preGeneratedIndex = 0
      this.sessionComplete = true
      this.totalSeconds = 0
      useSessionStore().isGuidedMode = false
      clearNavigatorMediaSession()
    },

    skipToNextTurn() {
      if (this.paused) return
      const now = Date.now()
      if (now < skipToNextTurnGuardUntil) return
      skipToNextTurnGuardUntil = now + SKIP_TURN_GUARD_MS
      this.clearTurnTimer()
      this.clearBreakTimer()
      this.clearClothingWindowTimer()
      this.inClothingWindow = false
      this.stopSpeakRef?.()
      this.pendingSpeech = null
      // Sensate: each turn maps to a contiguous slice of script/blobs — jump to the next turn’s first clip so skip doesn’t desync playback.
      if (this.sessionPlan?.kind === 'sensate') {
        const plan = this.sessionPlan
        const turns = plan.turns
        if (turns?.length) {
          if (this.totalTurnsInSession <= 0) {
            const first = turns[0]?.scriptIndexStart
            if (typeof first === 'number') this.preGeneratedIndex = first
          } else {
            const t = this.totalTurnsInSession - 1
            if (t >= 0 && t < turns.length) {
              if (t + 1 < turns.length) {
                this.preGeneratedIndex = turns[t + 1].scriptIndexStart
              } else {
                this.preGeneratedIndex = plan.script.length
              }
            }
          }
        }
      }
      this.phaseTimeRemaining -= this.turnTimeRemaining
      this.totalTimeRemaining -= this.turnTimeRemaining
      this.turnTimeRemaining = 0
      this.completeTurn()
    },
  },
})
