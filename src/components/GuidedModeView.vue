<template>
  <div class="guided-mode-view" :class="{ 'spacing-stack': !pendingConfig }">
    <!-- Running session -->
    <template v-if="guided.totalSeconds > 0 && !guided.sessionComplete">
      <div v-if="waitingForKokoroReady" class="guided-voice-wait" role="status">
        Hold on, voice not downloaded yet.
      </div>
      <div class="guided-center">
        <div class="guided-action-timer">
          <span v-if="guided.currentActionLabel" class="guided-action-label">{{ guided.currentActionLabel }}</span>
          <span class="guided-action-value">{{ formatTime(actionTimerValue) }}</span>
        </div>
        <div class="guided-circle-wrap">
          <div class="guided-sparkle-circle" :class="{ breathing: !!guided.pendingSpeech }" aria-hidden="true"></div>
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
      <div v-if="guided.inPhaseCheckIn" class="guided-block phase-check-in">
        <p class="guided-block-text">Phase {{ guided.completedPhase }} complete. Ready to continue to the next phase?</p>
        <div class="row guided-block-actions center">
          <button type="button" class="primary" @click="guided.continueAfterPhaseCheckIn()">Continue</button>
          <button type="button" class="secondary danger" @click="guided.stop()">Stop session</button>
        </div>
      </div>
      <div v-else class="guided-controls">
        <button v-if="guided.paused" type="button" class="primary guided-ctrl-btn" @click="guided.resume()">Resume</button>
        <button v-else type="button" class="secondary guided-ctrl-btn" @click="guided.pause()">Pause</button>
        <button type="button" class="secondary guided-ctrl-btn" @click="guided.skipToNextTurn()">Skip turn</button>
        <button type="button" class="secondary danger guided-ctrl-btn" @click="guided.stop()">Stop session</button>
      </div>
    </template>

    <!-- Session complete -->
    <template v-else-if="guided.sessionComplete">
      <div class="guided-block session-complete">
        <p class="guided-block-text">Session complete.</p>
        <div class="row guided-block-actions center">
          <button type="button" class="primary" @click="continueInFreePlay">Continue in Dice game</button>
          <button type="button" class="secondary" @click="endSession">End session</button>
        </div>
      </div>
    </template>

    <!-- Review session plan -->
    <template v-else-if="guidedStep === 'review' && guided.sessionPlan">
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
                <div v-if="t.where" class="guided-review-where"><strong>Where:</strong> {{ t.where }}</div>
                <div v-if="t.what" class="guided-review-what"><strong>What:</strong> {{ t.what }}</div>
                <div v-if="t.instruction" class="guided-review-instruction">{{ t.instruction }}</div>
              </div>
            </div>
          </div>
          <div class="guided-review-actions">
            <button type="button" class="secondary" @click="onReviewBack">Back to setup</button>
            <button type="button" class="secondary" @click="guided.rerollAll()">Reroll all</button>
            <button type="button" class="primary" @click="onConfirmSession">Confirm session</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Cooking: generating audio -->
    <template v-else-if="guidedStep === 'cooking'">
      <div class="guided-cooking-screen">
        <div class="guided-cooking-inner">
          <h2 class="guided-ready-title">Cooking your session…</h2>
          <p class="guided-cooking-sub">Generating {{ cookingProgressTotal }} audio phrases.</p>
          <div class="guided-cooking-progress-wrap">
            <div class="guided-cooking-progress-bar">
              <div class="guided-cooking-progress-fill" :style="{ width: cookingProgressPercent + '%' }"></div>
            </div>
            <p class="guided-cooking-count">{{ cookingProgressCurrent }} of {{ cookingProgressTotal }}</p>
          </div>
          <p v-if="cookingError" class="guided-cooking-error">{{ cookingError }}</p>
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

    <!-- Wizard: no session configured yet -->
    <template v-else>
      <GuidedSetupWizard @start="onWizardStart" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useGuidedStore } from '@/stores/guided'
import { useFavoritesStore } from '@/stores/favorites'
import { useSpeech } from '@/composables/useSpeech'
import GuidedSetupWizard from '@/components/GuidedSetupWizard.vue'

const session = useSessionStore()
const guided = useGuidedStore()
const favorites = useFavoritesStore()
const { speak, preparePhrase, warmupWorker, stop: stopSpeech, isVoiceReadyForGuided, waitingForKokoroReady, generateSessionAudio, playBlob } = useSpeech()

const pendingConfig = ref(null)
const guidedStep = ref(null) // 'review' | 'cooking' | 'start' | null
const cookingProgressCurrent = ref(0)
const cookingProgressTotal = ref(0)
const cookingError = ref(null)

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

const cookingProgressPercent = computed(() => {
  const t = cookingProgressTotal.value
  return t > 0 ? Math.round((cookingProgressCurrent.value / t) * 100) : 0
})

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildIntroText(clothingEnabled) {
  const openings = [
    'This is guided mode. You will hear a prompt for each turn. If a prompt does not work for you, substitute something you both like. ',
    'This is guided mode. You will get a prompt each turn. Feel free to swap in something you both prefer. ',
    'This is guided mode. Each turn has a prompt. If you would rather do something else, substitute anything you both like. ',
  ]
  const clothingLines = [
    'During the session you will hear when to remove an item of clothing and how to do it. ',
    'You will hear when to remove clothing and how. ',
    'Clothing removal prompts will tell you when and how. ',
  ]
  const closings = [
    'After each turn you will hear when to switch, then settle into position, then the next prompt. Let us begin.',
    'Between turns you will hear when to switch, then time to settle into position, then the next prompt. Let us begin.',
    'Each turn ends with a switch, then settle into position, then the next prompt. Let us begin.',
  ]
  let text = pick(openings)
  if (clothingEnabled) text += pick(clothingLines)
  text += pick(closings)
  return text
}

function onWizardStart(config) {
  pendingConfig.value = config
  guided.buildSessionPlanFromConfig(config)
  guidedStep.value = 'review'
}

function onReviewBack() {
  guidedStep.value = null
  guided.clearSessionPlan()
  pendingConfig.value = null
}

function onConfirmSession() {
  guidedStep.value = 'cooking'
  cookingError.value = null
  startCooking()
}

async function startCooking() {
  cookingError.value = null
  const plan = guided.sessionPlan
  if (!plan?.script?.length) {
    cookingError.value = 'No session plan.'
    return
  }
  cookingProgressTotal.value = plan.script.length
  cookingProgressCurrent.value = 0
  try {
    const blobs = await generateSessionAudio(plan.script, (current, total) => {
      cookingProgressCurrent.value = current
      cookingProgressTotal.value = total
    })
    guided.setPreGeneratedBlobs(blobs)
    guidedStep.value = 'start'
  } catch (e) {
    cookingError.value = e?.message || 'Failed to generate audio.'
  }
}

function onCookingBack() {
  guidedStep.value = 'review'
  cookingError.value = null
}

function onStartBack() {
  guidedStep.value = 'cooking'
}

function onStartSession() {
  if (!pendingConfig.value || !guided.preGeneratedBlobs) return
  guided.setSpeak((text, opts) => speak(text, opts))
  guided.setStopSpeak(stopSpeech)
  guided.setPreparePhrase(preparePhrase)
  guided.setPlayPreGeneratedBlob((blob, onEnd) => playBlob(blob, onEnd))
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
  session.resetSession()
}

onMounted(() => {
  guided.setSpeak((text, opts) => speak(text, opts))
  guided.setStopSpeak(stopSpeech)
  guided.setPreparePhrase(preparePhrase)
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
.guided-mode-view { padding: 0; width: 100%; max-width: 100%; }
.guided-mode-view.spacing-stack > * + * { margin-top: 1.25rem; }

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

/* Review session plan */
.guided-review-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  width: 100%;
  padding: 2rem 1rem;
}
.guided-review-inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.25rem;
  max-width: 480px;
  width: 100%;
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
  max-height: 50vh;
  overflow-y: auto;
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
.guided-review-where, .guided-review-what { margin-bottom: 0.25rem; }
.guided-review-instruction { margin-top: 0.35rem; opacity: 0.95; }
.guided-review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 0.5rem;
}

/* Cooking */
.guided-cooking-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  width: 100%;
  padding: 2rem 1rem;
}
.guided-cooking-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 340px;
  text-align: center;
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
.guided-cooking-error {
  font-size: 0.95rem;
  color: #f87171;
  margin: 0;
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

/* Sparkly breathing circle */
.guided-circle-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0;
}
.guided-sparkle-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(ellipse 70% 70% at 35% 35%, rgba(168, 85, 247, 0.45), rgba(34, 197, 94, 0.2) 45%, rgba(15, 23, 42, 0.6) 100%);
  box-shadow:
    0 0 0 1px rgba(168, 85, 247, 0.25),
    0 0 24px rgba(168, 85, 247, 0.2),
    inset 0 0 40px rgba(255, 255, 255, 0.06),
    inset 8px -8px 16px rgba(255, 255, 255, 0.04),
    -4px 4px 12px rgba(0, 0, 0, 0.2);
  position: relative;
  transition: transform 0.4s ease-out, box-shadow 0.4s ease-out;
}
.guided-sparkle-circle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 255, 255, 0.08) 60deg, transparent 120deg, rgba(255, 255, 255, 0.05) 180deg, transparent 240deg, rgba(255, 255, 255, 0.07) 300deg, transparent 360deg);
  animation: sparkle-rotate 8s linear infinite;
  pointer-events: none;
  z-index: 0;
}
.guided-sparkle-circle::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.25) 0%, transparent 40%);
  pointer-events: none;
  z-index: 1;
}
.guided-sparkle-circle.breathing {
  animation: breathe 2.2s ease-in-out infinite;
}
.guided-sparkle-circle.breathing::before {
  animation: sparkle-rotate 6s linear infinite;
}
/* Animate only transform to avoid expensive repaints on mobile (box-shadow animation heats devices) */
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@keyframes sparkle-rotate {
  to { transform: rotate(360deg); }
}
/* Pause animations when tab is hidden to reduce CPU/heat in background */
:global(.app-root.page-hidden) .guided-sparkle-circle,
:global(.app-root.page-hidden) .guided-sparkle-circle::before,
:global(.app-root.page-hidden) .guided-sparkle-circle::after {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .guided-sparkle-circle,
  .guided-sparkle-circle::before,
  .guided-sparkle-circle::after {
    animation: none;
  }
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
.danger { background: rgba(127,29,29,0.5); color: #fecaca; }
.danger:hover { background: rgba(127,29,29,0.8); }
</style>
