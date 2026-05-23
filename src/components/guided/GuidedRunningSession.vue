<template>
  <div>
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
    <div v-if="guided.transitionDirective" class="guided-block guided-transition-box" role="status">
      <p class="guided-transition-label">Between directions</p>
      <p class="guided-transition-text">{{ guided.transitionDirective }}</p>
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
    <GuidedDevAudioOverlay v-model:open="showDevOverlay" />
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useGuidedStore } from '@/stores/guided'
import { useFavoritesStore } from '@/stores/favorites'
import { useSpeech, resumeGuidedAudioEnvironment } from '@/composables/useSpeech'
import { publicPath } from '@/utils/publicPath'
import { useScreenWakeLock } from '@/composables/useScreenWakeLock'
import GuidedDevAudioOverlay from '@/components/guided/GuidedDevAudioOverlay.vue'

useScreenWakeLock()

const session = useSessionStore()
const guided = useGuidedStore()
const favorites = useFavoritesStore()
const { waitingForKokoroReady } = useSpeech()

function onGuidedForeground() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  resumeGuidedAudioEnvironment()
  guided.onDocumentVisible()
}

function onPageShow(e) {
  if (e.persisted) onGuidedForeground()
}

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onGuidedForeground)
  if (typeof window !== 'undefined') window.addEventListener('pageshow', onPageShow)
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onGuidedForeground)
  if (typeof window !== 'undefined') window.removeEventListener('pageshow', onPageShow)
})

const GUIDED_CIRCLE_GIF = publicPath('/GIFS/placidplace-loading-23091_512.gif')

const showDevOverlay = ref(false)
let circleClickCount = 0
let circleClickResetAt = null

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
</script>

<style scoped>
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
.guided-transition-box {
  border-color: #475569;
  margin-bottom: 0.5rem;
}
.guided-transition-label {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.guided-transition-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.45;
  color: #cbd5e1;
}
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
