<template>
  <div
    class="landing-modal"
    :class="{ hidden: !show }"
    role="dialog"
    aria-labelledby="landingTitle"
    aria-modal="true"
  >
    <div class="landing-content" :class="{ 'card-bg-fiery-heart': prefs.backgroundImage === '1' }">
      <h1 id="landingTitle" class="landing-title">Between Us</h1>
      <p class="landing-subtitle">
        Discovering intimacy together. Dice game, guided mode (timed turns and voice), or scripted sensate-style sessions.
      </p>
      <SessionDisplaySleepTip />
      <div class="mode-buttons">
        <button
          type="button"
          class="mode-button freeplay"
          :class="{ 'suggested-mode': suggestedMode === 'freeplay' }"
          @click="choose('freeplay')"
        >
          <div class="mode-button-title">🎲 Dice game <span v-if="suggestedMode === 'freeplay'" class="suggested-badge">Suggested for you</span></div>
          <div class="mode-button-desc">
            Roll dice for location, action, and (in Phase 3) position. No timer; you set the pace.
          </div>
        </button>
        <button
          type="button"
          class="mode-button guided"
          :class="{ 'suggested-mode': suggestedMode === 'guided' }"
          @click="choose('guided')"
        >
          <div class="mode-button-title">⏱️ Guided mode <span v-if="suggestedMode === 'guided'" class="suggested-badge">Suggested for you</span></div>
          <div class="mode-button-desc">
            Total time, turn length, and phased prompts (where, what, then position) with optional voice.
          </div>
        </button>
        <button
          type="button"
          class="mode-button sensate"
          :class="{ 'suggested-mode': suggestedMode === 'sensate' }"
          @click="choose('sensate')"
        >
          <div class="mode-button-title">🌿 Sensate-style sessions <span v-if="suggestedMode === 'sensate'" class="suggested-badge">Suggested for you</span></div>
          <div class="mode-button-desc">
            Pick a preset script with fixed blocks and wording: phase-one style mindful touch, transitions, and closings.
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePreferencesStore } from '@/stores/preferences'
import SessionDisplaySleepTip from '@/components/SessionDisplaySleepTip.vue'

defineProps({
  show: { type: Boolean, default: true },
  suggestedMode: { type: String, default: null }, // 'guided' | 'sensate' | 'freeplay' | null
})
const prefs = usePreferencesStore()

const emit = defineEmits(['choose'])

function choose(mode) {
  emit('choose', mode)
}
</script>

<style scoped>
/* Tighter stack: global .landing-subtitle uses a large bottom margin for mode buttons alone */
.landing-subtitle {
  margin-bottom: 1rem;
}
.suggested-badge {
  font-size: 0.7rem; font-weight: 600; color: #22c55e; margin-left: 0.35rem;
  display: inline-block;
}
.mode-button.suggested-mode { border-color: #22c55e; background: rgba(34,197,94,0.08); }
</style>
