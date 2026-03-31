<template>
  <div class="guided-mode-view" :class="{ 'spacing-stack': !pendingConfig }">
    <GuidedRunningSession v-if="guided.totalSeconds > 0 && !guided.sessionComplete" />

    <GuidedSessionComplete
      v-else-if="guided.sessionComplete && !guided.requestShowWizard"
      :session-favorite-saved="sessionFavoriteSaved"
      @save-favorite="saveSessionAsFavorite"
      @continue-freeplay="continueInFreePlay"
      @end-session="endSession"
    />

    <GuidedReviewPlan
      v-else-if="guidedStep === 'review' && guided.sessionPlan"
      :show-saved-list="showSavedSessionsList"
      @update:showSavedList="showSavedSessionsList = $event"
      @open-saved="showSavedSessionsList = true"
      @review-back="onReviewBack"
      @go-partner-setup="onGoBackToPartnerSetup"
      @confirm="onConfirmSession"
      @load-session="loadSavedSession"
    />

    <GuidedCookingProgress
      v-else-if="guidedStep === 'cooking'"
      :cooking-gifs="cookingGifs"
      :cooking-labels="cookingLabels"
      :cooking-step-index="cookingStepIndex"
      :cooking-waiting-for-model="cookingWaitingForModel"
      :cooking-subtext="cookingSubtext"
      :cooking-progress-percent="cookingProgressPercent"
      :cooking-kokoro-fallback="cookingKokoroFallback"
      :cooking-error="cookingError"
      @back="onCookingBack"
      @quit="onCookingQuit"
      @retry="startCooking"
    />

    <GuidedReadyScreen
      v-else-if="guidedStep === 'start'"
      @start="onStartSession"
      @back="onStartBack"
    />

    <div v-else class="guided-wizard-wrap">
      <GuidedSetupWizard
        :initial-step="wizardInitialStep"
        :initial-config="wizardInitialConfig"
        @start="onWizardStart"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useGuidedStore } from '@/stores/guided'
import { useSessionFavoritesStore } from '@/stores/sessionFavorites'
import { useSpeech } from '@/composables/useSpeech'
import GuidedSetupWizard from '@/components/GuidedSetupWizard.vue'
import GuidedRunningSession from '@/components/guided/GuidedRunningSession.vue'
import GuidedSessionComplete from '@/components/guided/GuidedSessionComplete.vue'
import GuidedReviewPlan from '@/components/guided/GuidedReviewPlan.vue'
import GuidedCookingProgress from '@/components/guided/GuidedCookingProgress.vue'
import GuidedReadyScreen from '@/components/guided/GuidedReadyScreen.vue'

const session = useSessionStore()
const guided = useGuidedStore()
const sessionFavorites = useSessionFavoritesStore()
const { speak, preparePhrase, warmupWorker, waitForWorkerReady, stop: stopSpeech, ttsWorkerProgress, generateSessionAudio, playBlob, unlockAudio } = useSpeech()

const pendingConfig = ref(null)
const guidedStep = ref(null) // 'review' | 'cooking' | 'start' | null
const wizardInitialStep = ref(1)

const wizardInitialConfig = ref(null)
const sessionFavoriteSaved = ref(false)
const showSavedSessionsList = ref(false)
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
const cookingLabels = ['recording....', 'writing....', 'compiling....']
const cookingStepIndex = ref(0)
let cookingIntervalId = null

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
</style>