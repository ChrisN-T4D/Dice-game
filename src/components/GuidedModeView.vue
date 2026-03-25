<template>
  <div class="guided-mode-view" :class="{ 'spacing-stack': !pendingConfig }">
    <!-- Running session -->
    <template v-if="guided.totalSeconds > 0 && !guided.sessionComplete">
      <div v-if="waitingForKokoroReady" class="guided-voice-wait" role="status">
        Hold on, voice not downloaded yet.
      </div>
      <div aria-live="polite" aria-atomic="true" class="guided-sr-step">
        <span v-if="guided.lastStepLabel">{{ guided.lastStepLabel }}</span>
      </div>
      <div class="guided-center">
        <div class="guided-action-timer">
          <span v-if="guided.currentActionLabel" class="guided-action-label">{{ guided.currentActionLabel }}</span>
          <span class="guided-action-value">{{ formatTime(actionTimerValue) }}</span>
        </div>
        <div
          class="guided-circle-wrap"
          role="button"
          tabindex="0"
          aria-label="Session indicator"
          @click="onCircleClick"
        >
          <img
            :src="GUIDED_CIRCLE_GIF"
            alt=""
            class="guided-circle-gif"
            :class="{ breathing: !!guided.pendingSpeech }"
            aria-hidden="true"
          />
        </div>
        <div class="guided-timers-row">
          <div class="guided-phase-cell">
            <span class="guided-phase-label">Phase {{ session.phase }}</span>
            <span class="guided-phase-timer">{{ formatTime(guided.phaseTimeRemaining) }}</span>
          </div>
          <span class="guided-total-timer">Total {{ formatTime(guided.totalTimeRemaining) }}</span>
        </div>
      </div>
      <div v-if="guided.currentPrompt.instruction || guided.currentPrompt.clothing" class="guided-block guided-output guided-instruction-box">
        <div v-if="guided.currentPrompt.instruction" class="instruction-output instruction-fluid">{{ guided.currentPrompt.instruction }}</div>
        <div v-if="guided.currentPrompt.clothing" class="output-line clothing-line"><strong>Clothing:</strong> {{ guided.currentPrompt.clothing }}</div>
      </div>
      <div v-if="session.phase <= 2" class="partner-label">
        {{ guided.partnerName(guided.currentPartner) }} → {{ guided.partnerName(guided.receiver) }}
      </div>
      <div v-else class="partner-label">
        {{ guided.partnerName(guided.currentPartner) }} leads
      </div>
      <div v-if="session.phase === 3 && guided.currentPrompt?.locationRoll != null" class="guided-favorites-row">
        <button
          type="button"
          class="secondary guided-fav-btn"
          :class="{ 'favorited': favorites.isFavorite(guided.currentPrompt.locationRoll) }"
          @click="favorites.toggle(guided.currentPrompt.locationRoll)"
        >
          {{ favorites.isFavorite(guided.currentPrompt.locationRoll) ? '♥ Favorited' : '♡ Add to favorites' }}
        </button>
        <button type="button" class="secondary guided-fav-btn" @click="favorites.openModal()">
          View favorites
        </button>
      </div>
      <!-- Session controls always visible in the bottom nav portal -->
      <!-- Dev overlay: 5 taps on center circle to open; shows audio log and pause durations -->
      <div v-if="showDevOverlay" class="guided-dev-overlay" @click.self="showDevOverlay = false">
        <div class="guided-dev-panel">
          <div class="guided-dev-header">
            <h3>Audio dev log</h3>
            <button type="button" class="guided-dev-close" aria-label="Close" @click="showDevOverlay = false">×</button>
          </div>
          <div class="guided-dev-current">
            <strong>Current:</strong> {{ guided.pendingSpeech?.phrase ? (guided.pendingSpeech.phrase.slice(0, 60) + (guided.pendingSpeech.phrase.length > 60 ? '…' : '')) : 'idle' }}
          </div>
          <div v-if="cookingLogRows.length" class="guided-dev-section">
            <h4 class="guided-dev-section-title">Cooking log (worker responses)</h4>
            <div class="guided-dev-log guided-dev-log-cooking">
              <div
                v-for="(entry, i) in cookingLogRows"
                :key="'cook-' + i"
                class="guided-dev-row guided-dev-row-cooking"
                :class="entry.phase"
              >
                <span class="guided-dev-time">{{ entry.time }}</span>
                <span class="guided-dev-cook-phase">#{{ entry.phraseIndex }} {{ entry.phase }}</span>
                <span v-if="entry.size != null" class="guided-dev-cook-detail">size {{ entry.size }}</span>
                <span v-if="entry.message" class="guided-dev-cook-detail guided-dev-cook-msg">{{ entry.message }}</span>
                <span v-if="entry.textSnippet" class="guided-dev-text" :title="entry.textSnippet">{{ entry.textSnippet }}</span>
                <span v-if="entry.retry" class="guided-dev-cook-tag">retry</span>
                <span v-if="entry.background" class="guided-dev-cook-tag">bg</span>
              </div>
            </div>
          </div>
          <div class="guided-dev-section">
            <h4 class="guided-dev-section-title">Session audio log</h4>
            <div class="guided-dev-log guided-dev-log-session">
              <div
                v-for="(entry, i) in devLogRows"
                :key="i"
                class="guided-dev-row"
                :class="entry.type"
              >
                <span class="guided-dev-time">{{ entry.time }}</span>
                <span class="guided-dev-type">{{ entry.type }}</span>
                <span v-if="entry.type === 'step'" class="guided-dev-step">→ {{ entry.text }}</span>
                <span v-if="entry.type === 'phrase_start'" class="guided-dev-source" :class="entry.source || 'unknown'">{{ entry.source === 'kokoro' ? 'Kokoro' : entry.source === 'browser' ? 'Browser' : '—' }}</span>
                <span v-if="entry.type === 'playback_failed'" class="guided-dev-fail">fail: {{ entry.reason || 'unknown' }}</span>
                <span v-if="entry.duration != null" class="guided-dev-duration">({{ entry.duration }}s)</span>
                <span v-if="entry.text && entry.type !== 'step'" class="guided-dev-text">{{ entry.text }}</span>
              </div>
              <div v-if="!guided.devAudioLog.length" class="guided-dev-empty">No events yet.</div>
            </div>
          </div>
        </div>
      </div>
      <Teleport to="#bottom-nav-portal">
        <div v-if="guided.inPhaseCheckIn" class="guided-controls">
          <span class="guided-ctrl-checkin-label">Phase {{ guided.completedPhase }} complete</span>
          <button type="button" class="primary guided-ctrl-btn" @click="guided.continueAfterPhaseCheckIn()">Continue</button>
          <button type="button" class="secondary danger guided-ctrl-btn" @click="guided.stop()">Stop session</button>
        </div>
        <div v-else class="guided-controls">
          <button v-if="guided.paused" type="button" class="primary guided-ctrl-btn" @click="guided.resume()">Resume</button>
          <button v-else type="button" class="secondary guided-ctrl-btn" @click="guided.pause()">Pause</button>
          <button type="button" class="secondary guided-ctrl-btn" @click="guided.skipToNextTurn()">Skip turn</button>
          <button type="button" class="secondary danger guided-ctrl-btn" @click="guided.stop()">Stop session</button>
        </div>
      </Teleport>
    </template>

    <!-- Session complete (hide when user asked to show wizard, e.g. clicked Guided Mode again) -->
    <template v-else-if="guided.sessionComplete && !guided.requestShowWizard">
      <div class="guided-block session-complete">
        <p class="guided-block-text">Session complete.</p>
        <div class="row guided-block-actions center">
          <button type="button" class="secondary" @click="saveSessionAsFavorite">Save as favorite</button>
          <button type="button" class="primary" @click="continueInFreePlay">Continue in Dice game</button>
          <button type="button" class="secondary" @click="endSession">End session</button>
        </div>
        <p v-if="sessionFavoriteSaved" class="guided-session-saved-msg">Saved. You can start this session again from Saved sessions.</p>
      </div>
    </template>

    <!-- Review session plan: turns in main content, actions in nav bar -->
    <template v-else-if="guidedStep === 'review' && guided.sessionPlan">
      <Teleport to="#bottom-nav-portal">
        <div class="guided-review-nav-actions">
          <button type="button" class="secondary guided-review-nav-btn" @click="showSavedSessionsList = true">Saved</button>
          <button type="button" class="secondary guided-review-nav-btn" @click="onReviewBack">Restart setup</button>
          <button type="button" class="secondary guided-review-nav-btn" @click="onGoBackToPartnerSetup">Go to partner setup</button>
          <button type="button" class="secondary guided-review-nav-btn" @click="guided.rerollAll()">Reroll all</button>
          <button type="button" class="primary guided-review-nav-btn guided-review-confirm" @click="onConfirmSession">Confirm session</button>
        </div>
      </Teleport>
      <div v-if="showSavedSessionsList" class="guided-saved-overlay" @click.self="showSavedSessionsList = false">
        <div class="guided-saved-list">
          <h3>Saved sessions</h3>
          <p v-if="!sessionFavorites.list.length" class="guided-saved-empty">No saved sessions yet. Complete a session and use "Save as favorite".</p>
          <ul v-else>
            <li v-for="fav in sessionFavorites.list" :key="fav.id">
              <button type="button" class="guided-saved-item" @click="loadSavedSession(fav)">
                {{ fav.name }} <span class="guided-saved-date">{{ new Date(fav.createdAt).toLocaleDateString() }}</span>
              </button>
            </li>
          </ul>
          <button type="button" class="secondary" @click="showSavedSessionsList = false">Close</button>
        </div>
      </div>
      <div class="guided-review-screen">
        <div class="guided-review-inner">
          <h2 class="guided-ready-title">Review your session</h2>
          <p class="guided-review-sub">{{ guided.sessionPlan.turns.length }} turns. Reroll any turn or confirm to generate audio.</p>
          <div class="guided-review-list">
            <div
              v-for="(t, idx) in guided.sessionPlan.turns"
              :key="idx"
              class="guided-review-turn"
            >
              <div class="guided-review-turn-head">
                <span class="guided-review-turn-num">Turn {{ t.turnIndex }}</span>
                <span class="guided-review-turn-phase">Phase {{ t.phase }}</span>
                <button type="button" class="secondary small guided-review-reroll" @click="guided.rerollTurn(idx)">Reroll</button>
              </div>
              <div class="guided-review-turn-body">
                <div v-if="t.instruction" class="guided-review-instruction">{{ t.instruction }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Cooking: generating audio; nav buttons teleported to bottom nav card -->
    <template v-else-if="guidedStep === 'cooking'">
      <Teleport to="#bottom-nav-portal">
        <div class="guided-cooking-nav-actions">
          <button type="button" class="secondary guided-review-nav-btn" @click="onCookingBack">Back to setup</button>
          <button type="button" class="secondary guided-review-nav-btn" @click="onCookingQuit">Quit</button>
        </div>
      </Teleport>
      <div class="guided-cooking-screen">
        <div class="guided-cooking-inner">
          <div class="guided-cooking-gif-wrap">
            <img
              :src="cookingGifs[cookingStepIndex]"
              :alt="cookingLabels[cookingStepIndex]"
              class="guided-cooking-gif"
            />
          </div>
          <p class="guided-cooking-label">{{ cookingWaitingForModel ? 'Loading voice model…' : cookingLabels[cookingStepIndex] }}</p>
          <p class="guided-cooking-sub">{{ cookingSubtext }}</p>
          <div v-if="!cookingWaitingForModel" class="guided-cooking-progress-wrap">
            <div class="guided-cooking-progress-bar">
              <div class="guided-cooking-progress-fill" :style="{ width: cookingProgressPercent + '%' }"></div>
            </div>
            <p class="guided-cooking-count">{{ cookingProgressPercent }}%</p>
          </div>
          <p v-if="cookingKokoroFallback" class="guided-cooking-kokoro-fallback">{{ cookingKokoroFallback }}</p>
          <p v-if="cookingError" class="guided-cooking-error">{{ cookingError }}</p>
          <p v-if="cookingError && isKokoroError(cookingError)" class="guided-cooking-error-hint">Make sure the Kokoro model is in <code>public/models/</code>. Run: <code>npm run download-kokoro-model</code></p>
          <div v-if="cookingError" class="guided-review-actions">
            <button type="button" class="secondary" @click="onCookingBack">Back to review</button>
            <button type="button" class="primary" @click="startCooking">Try again</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Start: ready to begin -->
    <template v-else-if="guidedStep === 'start'">
      <div class="guided-ready-screen">
        <div class="guided-ready-inner">
          <h2 class="guided-ready-title">Your session is ready</h2>
          <p class="guided-ready-sub">Tap Start to begin. Voice will play from pre-generated audio.</p>
          <div class="guided-ready-actions">
            <button type="button" class="primary guided-ready-btn" @click.stop="onStartSession">
              Start
            </button>
            <button type="button" class="secondary guided-ready-btn" @click.stop="onStartBack">Back</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Wizard: no session configured yet or returning to edit -->
    <template v-else>
      <div class="guided-wizard-wrap">
        <GuidedSetupWizard
          :initial-step="wizardInitialStep"
          :initial-config="wizardInitialConfig"
          @start="onWizardStart"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useGuidedStore } from '@/stores/guided'
import { useFavoritesStore } from '@/stores/favorites'
import { useSessionFavoritesStore } from '@/stores/sessionFavorites'
import { useSpeech } from '@/composables/useSpeech'
import { INTRO_NO_CLOTHING_VARIANTS, INTRO_WITH_CLOTHING_VARIANTS } from '@/data/staticPhrases'
import GuidedSetupWizard from '@/components/GuidedSetupWizard.vue'

const session = useSessionStore()
const guided = useGuidedStore()
const favorites = useFavoritesStore()
const sessionFavorites = useSessionFavoritesStore()
const { speak, preparePhrase, warmupWorker, waitForWorkerReady, stop: stopSpeech, isVoiceReadyForGuided, waitingForKokoroReady, ttsWorkerProgress, generateSessionAudio, playBlob, unlockAudio } = useSpeech()

const pendingConfig = ref(null)
const guidedStep = ref(null) // 'review' | 'cooking' | 'start' | null
const wizardInitialStep = ref(1)

const wizardInitialConfig = ref(null)
const sessionFavoriteSaved = ref(false)
const showSavedSessionsList = ref(false)
/** Dev overlay: open after 5 clicks on center circle in guided session. */
const showDevOverlay = ref(false)
let circleClickCount = 0
let circleClickResetAt = null
const cookingProgressCurrent = ref(0)
const cookingProgressTotal = ref(0)
const cookingError = ref(null)
/** True while waiting for Kokoro model to load before we can generate audio (avoids showing 0% during model load). */
const cookingWaitingForModel = ref(false)
/** Labels for each phrase we're cooking (set in startCooking), e.g. ['Intro', 'First turn', 'Instruction', …]. */
const cookingPhraseLabels = ref([])
/** When set, Kokoro failed for some phrases; playback will use browser TTS for those. Shown on cooking screen. */
const cookingKokoroFallback = ref(null)

const cookingGifs = [
  '/GIFS/agp_studios-audio-22831_512.gif',
  '/GIFS/dakernet-to-write-6621_512.gif',
  '/GIFS/acatxio-procedural-generation-11379_512%20(1).gif',
]
/** Loading GIF for the center circle during guided session (placidplace loading animation). */
const GUIDED_CIRCLE_GIF = '/GIFS/placidplace-loading-23091_512.gif'
const cookingLabels = ['recording....', 'writing....', 'compiling....']
const cookingStepIndex = ref(0)
let cookingIntervalId = null

function formatTime(sec) {
  if (sec == null || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const actionTimerValue = computed(() => {
  if (guided.inClothingWindow) return guided.clothingWindowRemaining
  if (guided.breakPhase !== 'none' && guided.breakCountdown > 0) return guided.breakCountdown
  if (guided.turnTimeRemaining > 0) return guided.turnTimeRemaining
  return 0
})

function onCircleClick() {
  if (guided.totalSeconds <= 0 || guided.sessionComplete) return
  circleClickCount++
  if (circleClickResetAt != null) clearTimeout(circleClickResetAt)
  if (circleClickCount >= 5) {
    showDevOverlay.value = true
    circleClickCount = 0
    circleClickResetAt = null
    return
  }
  circleClickResetAt = setTimeout(() => { circleClickCount = 0; circleClickResetAt = null }, 1500)
}

/** Dev log rows with relative time, pause duration (pause → next resume), and TTS source (kokoro/browser). */
const devLogRows = computed(() => {
  const log = guided.devAudioLog || []
  const base = log[0]?.t ?? Date.now()
  return log.map((entry, i) => {
    const next = log[i + 1]
    const elapsed = ((entry.t - base) / 1000).toFixed(1)
    const duration = entry.type === 'pause' && next?.type === 'resume' ? ((next.t - entry.t) / 1000).toFixed(1) : null
    return {
      type: entry.type,
      time: `+${elapsed}s`,
      duration: duration ?? undefined,
      text: entry.text || undefined,
      source: entry.source || undefined,
      reason: entry.reason || undefined,
    }
  })
})

/** Cooking log rows: worker request/blob/error/timeout/static per phrase, with relative time. */
const cookingLogRows = computed(() => {
  const log = guided.cookingLog || []
  const base = log[0]?.t ?? Date.now()
  return log.map((entry) => {
    const elapsed = ((entry.t - base) / 1000).toFixed(1)
    return {
      time: `+${elapsed}s`,
      phraseIndex: entry.phraseIndex,
      phase: entry.phase,
      size: entry.size,
      message: entry.message,
      textSnippet: entry.textSnippet,
      retry: entry.retry,
      background: entry.background,
    }
  })
})

const cookingProgressPercent = computed(() => {
  const t = cookingProgressTotal.value
  return t > 0 ? Math.round((cookingProgressCurrent.value / t) * 100) : 0
})

/** Sub-text under the main cooking label: explains what’s happening (model load vs generating phrases) and where (which phrase). */
const cookingSubtext = computed(() => {
  if (cookingWaitingForModel.value) {
    return '~95 MB, usually 1–3 min (2–5 on slower connections). Loads in the background from app open.'
  }
  const total = cookingProgressTotal.value
  const current = cookingProgressCurrent.value
  const labels = cookingPhraseLabels.value
  if (total <= 0) return 'Preparing…'
  if (current >= total) {
    return `All ${total} phrase${total === 1 ? '' : 's'} ready (intro and first turn). Opening session…`
  }
  // Progress is 1-based: current = number completed; next to generate is current+1
  const nextNum = current + 1
  const label = labels[current] != null ? labels[current] : `Phrase ${nextNum}`
  const workerStatus = ttsWorkerProgress?.value?.status
  const workerNote = workerStatus === 'started' ? ' (worker started)' : workerStatus === 'running' ? ' (worker running model…)' : ''
  return `Generating phrase ${nextNum} of ${total}: ${label}${workerNote}`
})

function isKokoroError(message) {
  return message && typeof message === 'string' && /kokoro|model.*load|timed out/i.test(message)
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildIntroText(clothingEnabled) {
  return pick(clothingEnabled ? INTRO_WITH_CLOTHING_VARIANTS : INTRO_NO_CLOTHING_VARIANTS)
}

function onWizardStart(config) {
  pendingConfig.value = config
  guided.buildSessionPlanFromConfig(config)
  guidedStep.value = 'review'
  wizardInitialStep.value = 1
  wizardInitialConfig.value = null
}

function onReviewBack() {
  guidedStep.value = null
  guided.clearSessionPlan()
  pendingConfig.value = null
  wizardInitialStep.value = 1
  wizardInitialConfig.value = null
}

function onGoBackToPartnerSetup() {
  if (!pendingConfig.value) return
  wizardInitialStep.value = 5
  wizardInitialConfig.value = pendingConfig.value
  guidedStep.value = null
}

function saveSessionAsFavorite() {
  const config = guided.lastStartedConfig
  if (!config) return
  sessionFavorites.add({ name: `Session – ${new Date().toLocaleDateString()}`, config })
  sessionFavoriteSaved.value = true
}

function loadSavedSession(fav) {
  if (!fav?.config) return
  pendingConfig.value = fav.config
  guided.buildSessionPlanFromConfig(fav.config)
  guidedStep.value = 'review'
  showSavedSessionsList.value = false
}

function onConfirmSession() {
  guidedStep.value = 'cooking'
  cookingError.value = null
  startCooking()
}

async function startCooking() {
  cookingError.value = null
  cookingKokoroFallback.value = null
  const plan = guided.sessionPlan
  if (!plan?.script?.length) {
    cookingError.value = 'No session plan.'
    return
  }
  cookingWaitingForModel.value = true
  try {
    await waitForWorkerReady()
  } catch (e) {
    cookingWaitingForModel.value = false
    cookingError.value = e?.message || 'Voice not ready.'
    return
  }
  cookingWaitingForModel.value = false
  // Pre-generate intro + entire first turn via worker so there is ample audio to get into the session.
  // Ensure we always cook at least intro (script[0]) and the first turn's phrases (script[1]...).
  const firstTurnPhraseCount = plan.turns?.[0]?.phraseStrings?.length ?? 5
  const endIndex = Math.min(
    Math.max(2, 1 + firstTurnPhraseCount),
    plan.script.length
  )
  const initialScript = plan.script.slice(0, endIndex)
  cookingPhraseLabels.value = initialScript.map((text, i) => {
    if (i === 0) return 'Intro'
    if (i === 1) return 'First turn'
    const trim = text.trim().slice(0, 42)
    return trim ? (trim.length < text.trim().length ? `${trim}…` : trim) : `Phrase ${i + 1}`
  })
  cookingProgressTotal.value = endIndex
  cookingProgressCurrent.value = 0
  guided.clearCookingLog()
  const cookVoiceId = plan.config?.kokoroVoiceId?.trim()
  const cookGenOpts = cookVoiceId ? { voiceId: cookVoiceId } : {}
  try {
    const initialBlobs = await generateSessionAudio(
      initialScript,
      (current, total) => {
        cookingProgressCurrent.value = current
        cookingProgressTotal.value = total
      },
      (phraseIndex, ev) => {
        guided.addCookingLogEntry({ phraseIndex, ...ev })
      },
      cookGenOpts
    )
    // Retry any nulls in the initial batch (e.g. turn_begins / "Whenever you're ready") so playback starts immediately
    for (let i = 0; i < initialBlobs.length; i++) {
      if (initialBlobs[i] != null) continue
      try {
        const [retryBlob] = await generateSessionAudio(
          [initialScript[i]],
          undefined,
          (phraseIndex, ev) => {
            guided.addCookingLogEntry({ phraseIndex: i, ...ev, retry: true })
          },
          cookGenOpts
        )
        if (retryBlob != null) initialBlobs[i] = retryBlob
      } catch (_) {}
    }
    const fullLength = plan.script.length
    const blobs = new Array(fullLength)
    for (let i = 0; i < initialBlobs.length; i++) blobs[i] = initialBlobs[i]
    const introOk = initialBlobs[0] != null && initialBlobs[0] !== undefined
    const firstPhraseOk = endIndex < 2 || (initialBlobs[1] != null && initialBlobs[1] !== undefined)
    if (!introOk || !firstPhraseOk) {
      cookingError.value = 'Could not generate intro or first turn audio. Please try again.'
      return
    }
    const nullCount = initialBlobs.filter((b) => b == null).length
    if (nullCount > 0) {
      cookingKokoroFallback.value = `${nullCount} phrase${nullCount === 1 ? '' : 's'} could not be generated with Kokoro; browser voice will be used for those during playback.`
    }
    guided.setPreGeneratedBlobs(blobs)
    // Brief pause so the user sees "All N phrases ready. Opening session…" and 100% before the next screen
    await new Promise((r) => setTimeout(r, 1200))
    guidedStep.value = 'start'
    warmupWorker()
    // Background: generate remaining phrases and fill blobs at correct indices
    if (endIndex < fullLength) {
      ;(async () => {
        for (let j = endIndex; j < fullLength; j++) {
          if (guided.consumedPreGeneratedIndices?.has(j)) continue
          try {
            const [blob] = await generateSessionAudio(
              [plan.script[j]],
              undefined,
              (phraseIndex, ev) => {
                guided.addCookingLogEntry({ phraseIndex: j, ...ev, background: true })
              },
              cookGenOpts
            )
            if (guided.consumedPreGeneratedIndices?.has(j)) continue
            guided.setPreGeneratedBlobAt(j, blob)
          } catch (_) {
            if (!guided.consumedPreGeneratedIndices?.has(j)) guided.setPreGeneratedBlobAt(j, null)
          }
        }
      })()
    }
  } catch (e) {
    cookingError.value = e?.message || 'Failed to generate audio.'
  }
}

function onCookingBack() {
  guidedStep.value = 'review'
  cookingError.value = null
}

function onCookingQuit() {
  cookingError.value = null
  clearCookingInterval()
  guided.resetAfterSessionComplete()
  guided.clearSessionPlan()
  pendingConfig.value = null
  guidedStep.value = null
  wizardInitialStep.value = 1
  wizardInitialConfig.value = null
  session.resetSession()
}

function clearCookingInterval() {
  if (cookingIntervalId != null) {
    clearInterval(cookingIntervalId)
    cookingIntervalId = null
  }
}

watch(guidedStep, (step) => {
  clearCookingInterval()
  if (step === 'cooking') {
    cookingStepIndex.value = 0
    cookingIntervalId = setInterval(() => {
      cookingStepIndex.value = (cookingStepIndex.value + 1) % 3
    }, 2200)
  }
})

// When returning to guided mode (including on mount when uiMode is already 'guided'),
// reset any completed session so the wizard shows instead of the end screen.
// { immediate: true } ensures this fires on mount even when uiMode was already 'guided'
// (e.g. user came from landing modal after endSession() unmounted this component).
watch(() => session.uiMode, (mode) => {
  if (mode === 'guided' && guided.sessionComplete) {
    guided.resetAfterSessionComplete()
    guidedStep.value = null
  }
}, { immediate: true })
watch(() => guided.requestShowWizard, (show) => {
  if (show) {
    guidedStep.value = null
    guided.requestShowWizard = false
  }
})

onUnmounted(clearCookingInterval)

function onStartBack() {
  guidedStep.value = 'cooking'
}

function onStartSession() {
  if (!pendingConfig.value || !guided.preGeneratedBlobs) return
  unlockAudio()
  guided.setSpeak((text, opts) => speak(text, { ...opts, force: true }))
  guided.setStopSpeak(stopSpeech)
  guided.setPreparePhrase(preparePhrase)
  guided.setPlayPreGeneratedBlob((blob, onEnd, onPlaybackFailed) => playBlob(blob, onEnd, onPlaybackFailed))
  warmupWorker()
  guided.startGuidedModeWithPreGenerated(pendingConfig.value, guided.preGeneratedBlobs)
  guidedStep.value = null
  pendingConfig.value = null
}

function continueInFreePlay() {
  guided.stop()
  session.uiMode = 'freeplay'
  session.isGuidedMode = false
}

function endSession() {
  guided.stop()
  // Clear the session-complete flag before resetting session so when the landing modal
  // routes back to guided mode the watch (immediate) won't see sessionComplete=true
  guided.resetAfterSessionComplete()
  session.resetSession()
  sessionFavoriteSaved.value = false
}

onMounted(() => {
  warmupWorker() // start loading voice model as soon as user enters Guided Mode
  guided.setSpeak((text, opts) => speak(text, { ...opts, force: true }))
  guided.setStopSpeak(stopSpeech)
  guided.setPreparePhrase(preparePhrase)
  // Start loading the voice worker as soon as they enter the guided wizard so it's ready by cooking
  warmupWorker()
})

onUnmounted(() => {
  guided.setSpeak(null)
  guided.setStopSpeak(null)
  guided.setPreparePhrase(null)
  guided.setPlayPreGeneratedBlob(null)
})
</script>

<style scoped>
.guided-mode-view {
  padding: 0 0 1rem;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.guided-mode-view.spacing-stack > * + * { margin-top: 1.25rem; }

.guided-wizard-wrap {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Ready screen: full-area centered prompt */
.guided-ready-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  width: 100%;
  padding: 2rem 1rem;
  position: relative;
  z-index: 1;
  touch-action: manipulation;
}
.guided-ready-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
  max-width: 340px;
  text-align: center;
  position: relative;
  z-index: 2;
}
.guided-ready-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #e5e7eb;
  margin: 0;
  line-height: 1.3;
  text-align: center;
}
.guided-ready-loading {
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 0.75rem 0 0;
  line-height: 1.4;
}
.guided-ready-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}
.guided-ready-btn {
  width: 100%;
  padding: 0.85rem 1.25rem;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 0.65rem;
  min-height: 50px;
  cursor: pointer;
  touch-action: manipulation;
  position: relative;
  z-index: 2;
  -webkit-tap-highlight-color: transparent;
}
.guided-ready-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.guided-ready-sub {
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

/* Review session plan: fill main card and scroll when turn list is long */
.guided-review-screen {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  padding: 2rem 1rem;
  box-sizing: border-box;
}
.guided-review-inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.25rem;
  max-width: 480px;
  width: 100%;
  min-width: 0;
}
.guided-review-sub {
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 0;
}
.guided-review-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
}
.guided-review-turn {
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}
.guided-review-turn-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.guided-review-turn-num { font-weight: 700; color: #e5e7eb; }
.guided-review-turn-phase { font-size: 0.85rem; color: #94a3b8; }
.guided-review-reroll { margin-left: auto; }
.guided-review-turn-body { font-size: 0.9rem; color: #cbd5e1; line-height: 1.4; }
.guided-review-instruction { margin-top: 0.35rem; opacity: 0.95; }
.guided-review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 0.5rem;
}
/* Saved sessions overlay */
.guided-saved-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.guided-saved-list {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  padding: 1.25rem;
  max-width: 360px;
  width: 100%;
  max-height: 70vh;
  overflow: auto;
}
.guided-saved-list h3 { margin: 0 0 0.75rem; font-size: 1.1rem; color: #e5e7eb; }
.guided-saved-empty { font-size: 0.9rem; color: #94a3b8; margin: 0 0 1rem; }
.guided-saved-list ul { list-style: none; margin: 0 0 1rem; padding: 0; }
.guided-saved-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.35rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: rgba(15, 23, 42, 0.8);
  color: #e5e7eb;
  font-size: 0.95rem;
  cursor: pointer;
}
.guided-saved-date { font-size: 0.8rem; color: #94a3b8; margin-left: 0.5rem; }
.guided-session-saved-msg { font-size: 0.9rem; color: #86efac; margin: 0.5rem 0 0; }

/* Review step: actions live in nav bar (teleported), compact grid to fit nav card */
.guided-review-nav-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.guided-review-nav-btn {
  padding: 0.45rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 38px;
  border-radius: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
.guided-review-confirm {
  grid-column: 1 / -1;
}

/* Cooking: nav actions in bottom nav card (same layout as review) */
.guided-cooking-nav-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

/* Cooking */
.guided-cooking-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 1rem;
  overflow-y: auto;
  box-sizing: border-box;
}
.guided-cooking-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  max-width: 320px;
  width: 100%;
  text-align: center;
}
.guided-cooking-gif-wrap {
  width: min(220px, 40vmin);
  height: min(220px, 40vmin);
  flex-shrink: 0;
  border-radius: 0.75rem;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.25);
}
.guided-cooking-gif {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.guided-cooking-label {
  font-family: var(--font-handwritten-body);
  font-size: 1.25rem;
  font-weight: 400;
  color: #e2e8f0;
  margin: 0;
  min-height: 1.5em;
}
.guided-cooking-model-hint {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: -0.5rem 0 0;
  max-width: 280px;
  line-height: 1.4;
}
.guided-cooking-sub { font-size: 0.95rem; color: #94a3b8; margin: 0; }
.guided-cooking-progress-wrap { width: 100%; }
.guided-cooking-progress-bar {
  height: 8px;
  background: #334155;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}
.guided-cooking-progress-fill {
  height: 100%;
  background: linear-gradient(to right, #a855f7, #22c55e);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.guided-cooking-count { font-size: 0.9rem; color: #94a3b8; margin: 0; }
.guided-cooking-kokoro-fallback {
  font-size: 0.9rem;
  color: #fbbf24;
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.75rem;
  background: rgba(251, 191, 36, 0.12);
  border-radius: 0.5rem;
  border: 1px solid rgba(251, 191, 36, 0.35);
}
.guided-cooking-error {
  font-size: 0.95rem;
  color: #f87171;
  margin: 0;
}
.guided-cooking-error-hint {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0.5rem 0 0;
  line-height: 1.5;
}
.guided-cooking-error-hint code {
  background: rgba(2, 6, 23, 0.6);
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.8em;
}

/* Countdown screen */
.guided-countdown-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  width: 100%;
  padding: 2rem 1rem;
}
.guided-countdown-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  text-align: center;
}
.guided-countdown-text {
  font-size: 1.35rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
  max-width: 280px;
}
.guided-countdown-number {
  font-size: 6rem;
  font-weight: 800;
  line-height: 1;
  color: #e5e7eb;
  font-variant-numeric: tabular-nums;
  animation: countdown-pop 0.6s ease-out;
  text-shadow: 0 0 40px rgba(168, 85, 247, 0.4), 0 0 80px rgba(168, 85, 247, 0.15);
}
@keyframes countdown-pop {
  0% { transform: scale(0.4); opacity: 0; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* Voice not ready yet (waiting for Kokoro download) */
.guided-voice-wait {
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: #fbbf24;
  margin: 0 0 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(251, 191, 36, 0.12);
  border-radius: 0.5rem;
  border: 1px solid rgba(251, 191, 36, 0.35);
}

/* Screen-reader-only live region for step announcements */
.guided-sr-step {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Center area: action timer, sparkly circle, phase/total timers */
.guided-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}
.guided-action-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.guided-action-label { font-size: 0.95rem; font-weight: 600; color: #a855f7; }
.guided-action-value { font-size: 2.5rem; font-weight: 700; color: #e5e7eb; line-height: 1; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }

/* Center circle: loading GIF (was spinning shimmer); 5 taps opens dev overlay */
.guided-circle-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0;
  cursor: pointer;
  user-select: none;
}
.guided-circle-gif {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease-out;
}
.guided-circle-gif.breathing {
  animation: guided-circle-breathe 2.2s ease-in-out infinite;
}
@keyframes guided-circle-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
:global(.app-root.page-hidden) .guided-circle-gif {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .guided-circle-gif.breathing {
    animation: none;
  }
}

/* Dev overlay: audio log and pause durations */
.guided-dev-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.guided-dev-panel {
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 0.75rem;
  max-width: min(420px, 100%);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}
.guided-dev-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #334155;
}
.guided-dev-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}
.guided-dev-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0 0.25rem;
  cursor: pointer;
  border-radius: 0.25rem;
}
.guided-dev-close:hover {
  color: #e2e8f0;
  background: #334155;
}
.guided-dev-current {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  color: #94a3b8;
  border-bottom: 1px solid #334155;
  word-break: break-word;
}
.guided-dev-log {
  padding: 0.5rem 1rem;
  overflow-y: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
}
.guided-dev-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  align-items: baseline;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}
.guided-dev-section { margin-top: 0.75rem; }
.guided-dev-section:first-of-type { margin-top: 0; }
.guided-dev-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  margin: 0 0 0.35rem 0;
}
.guided-dev-log-cooking,
.guided-dev-log-session { max-height: 12rem; overflow-y: auto; }
.guided-dev-row-cooking { font-size: 0.85rem; }
.guided-dev-row-cooking.request { color: #93c5fd; }
.guided-dev-row-cooking.blob { color: #86efac; }
.guided-dev-row-cooking.static { color: #a5b4fc; }
.guided-dev-row-cooking.error { color: #fca5a5; }
.guided-dev-row-cooking.timeout { color: #fcd34d; }
.guided-dev-row-cooking.server { color: #86efac; }
.guided-dev-row-cooking.server_null { color: #64748b; }
.guided-dev-cook-phase { font-weight: 600; margin-right: 0.35rem; }
.guided-dev-cook-detail { font-size: 0.8rem; color: #94a3b8; margin-left: 0.25rem; }
.guided-dev-cook-msg { color: #f87171; }
.guided-dev-cook-tag { font-size: 0.7rem; opacity: 0.9; margin-left: 0.25rem; }
.guided-dev-row.phrase_start { color: #86efac; }
.guided-dev-row.phrase_end { color: #93c5fd; }
.guided-dev-row.playback_failed { color: #fca5a5; }
.guided-dev-row.pause { color: #fcd34d; }
.guided-dev-row.resume { color: #a5b4fc; }
.guided-dev-fail {
  font-size: 0.8rem;
  color: #f87171;
  font-weight: 600;
}
.guided-dev-time {
  color: #64748b;
  min-width: 4rem;
}
.guided-dev-type { font-weight: 600; }
.guided-dev-source {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 700;
}
.guided-dev-source.kokoro { background: rgba(34, 197, 94, 0.3); color: #4ade80; }
.guided-dev-source.browser { background: rgba(59, 130, 246, 0.3); color: #60a5fa; }
.guided-dev-source.unknown { background: rgba(100, 116, 139, 0.35); color: #94a3b8; }
.guided-dev-duration { color: #fbbf24; }
.guided-dev-text {
  color: #cbd5e1;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.guided-dev-empty {
  color: #64748b;
  font-style: italic;
  padding: 0.5rem 0;
}

/* Phase (left: label + time) and Total (right) below the circle */
.guided-timers-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 280px;
  padding: 0 0.5rem;
  font-size: 0.9rem;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
}
.guided-phase-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}
.guided-phase-label { font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }
.guided-phase-timer { font-weight: 600; }
.guided-total-timer { font-weight: 600; }

.guided-block {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: rgba(2,6,23,0.5);
}
.guided-block-text { margin: 0 0 0.75rem; }
.guided-block-text:last-child { margin-bottom: 0; }
.guided-block-actions { gap: 0.5rem; margin: 0; }
.output-line { margin-bottom: 0.35rem; }
.output-line:last-of-type { margin-bottom: 0; }
.clothing-line { margin-top: 0.25rem; }
.instruction-output { white-space: pre-wrap; margin-bottom: 0; }
.instruction-fluid { margin-top: 0; }
.instruction-fluid + .clothing-line { margin-top: 0.75rem; }
.partner-label { font-size: 1rem; color: #a855f7; margin: 0; text-align: center; }
.guided-favorites-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0 0;
}
.guided-fav-btn { font-size: 0.9rem; padding: 0.4rem 0.75rem; }
.guided-fav-btn.favorited { color: #f472b6; border-color: #f472b6; }
.guided-controls {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  width: 100%;
  max-width: 100%;
}
.guided-ctrl-btn {
  flex: 0 1 auto;
  min-height: 40px;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  white-space: nowrap;
}
.guided-ctrl-checkin-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a855f7;
  white-space: nowrap;
}
.danger { background: rgba(127,29,29,0.5); color: #fecaca; }
.danger:hover { background: rgba(127,29,29,0.8); }
</style>
