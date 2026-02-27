<template>
  <div class="guided-mode-view" :class="{ 'spacing-stack': !pendingConfig }">
    <!-- Ready screen: full-screen prompt before session starts -->
    <template v-if="pendingConfig && countdownValue === null">
      <div class="guided-ready-screen">
        <div class="guided-ready-inner">
          <h2 class="guided-ready-title">Are you ready to start?</h2>
          <p v-if="!isVoiceReadyForGuided" class="guided-ready-loading">
            Loading voice engine…
          </p>
          <div class="guided-ready-actions">
            <button
              type="button"
              class="primary guided-ready-btn"
              :disabled="!isVoiceReadyForGuided"
              @click.stop="onReadyYes"
            >
              Yes, let's go
            </button>
            <button type="button" class="secondary guided-ready-btn" @click.stop="onReadyNo">No, I need to change some settings</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Countdown screen: settle in before session begins -->
    <template v-else-if="pendingConfig && countdownValue !== null">
      <div class="guided-countdown-screen">
        <div class="guided-countdown-inner">
          <p class="guided-countdown-text">Get settled and put your phone down</p>
          <div class="guided-countdown-number" :key="countdownValue">{{ countdownValue }}</div>
        </div>
      </div>
    </template>

    <!-- Wizard: no session configured yet -->
    <template v-else-if="guided.totalSeconds === 0">
      <GuidedSetupWizard @start="onWizardStart" />
    </template>

    <template v-else-if="guided.sessionComplete">
      <div class="guided-block session-complete">
        <p class="guided-block-text">Session complete.</p>
        <div class="row guided-block-actions center">
          <button type="button" class="primary" @click="continueInFreePlay">Continue in Dice game</button>
          <button type="button" class="secondary" @click="endSession">End session</button>
        </div>
      </div>
    </template>

    <template v-else>
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
const { speak, preparePhrase, warmupWorker, stop: stopSpeech, isVoiceReadyForGuided } = useSpeech()

const pendingConfig = ref(null)
const countdownValue = ref(null)
let countdownTimer = null

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
}

function onReadyNo() {
  pendingConfig.value = null
}

function onReadyYes() {
  if (!pendingConfig.value) return
  // Prevent double-click: if countdown already running, ignore
  if (countdownTimer != null) return
  guided.setSpeak((text, opts) => speak(text, opts))
  guided.setStopSpeak(stopSpeech)
  guided.setPreparePhrase(preparePhrase)

  const prebuiltIntro = buildIntroText(pendingConfig.value.clothingEnabled)
  warmupWorker()
  preparePhrase(prebuiltIntro)

  countdownValue.value = 3
  countdownTimer = setInterval(() => {
    countdownValue.value--
    if (countdownValue.value <= 0) {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
      const config = pendingConfig.value
      pendingConfig.value = null
      countdownValue.value = null
      if (config) guided.startGuidedMode(config, { prebuiltIntro })
    }
  }, 1000)
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
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  guided.setSpeak(null)
  guided.setStopSpeak(null)
  guided.setPreparePhrase(null)
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
