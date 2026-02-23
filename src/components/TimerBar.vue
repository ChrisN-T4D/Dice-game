<template>
  <div class="timer-bar">
    <div class="timer-label-row">
      <span class="timer-label">Timer</span>
    </div>
    <div class="timer-buttons-row row">
      <button type="button" class="secondary small" @click="start(30)">30s</button>
      <button type="button" class="secondary small" @click="start(60)">1 min</button>
      <button type="button" class="secondary small" @click="start(120)">2 min</button>
      <button type="button" class="secondary small" @click="start(300)">5 min</button>
      <span v-if="remaining !== null" class="timer-display">{{ formatTime(remaining) }}</span>
      <button v-if="remaining !== null" type="button" class="secondary small" @click="clear">Clear</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const remaining = ref(null)
let intervalId = null

function formatTime(sec) {
  if (sec == null || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function start(seconds) {
  clear()
  remaining.value = seconds
  intervalId = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      remaining.value = 0
      clear()
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAB')
        audio.volume = 0.3
        audio.play().catch(() => {})
      } catch (_) {}
    }
  }, 1000)
}

function clear() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  remaining.value = null
}

onUnmounted(clear)
</script>

<style scoped>
.timer-bar { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin: 0; padding: 0; }
.timer-label-row { width: 100%; display: flex; justify-content: center; }
.timer-label { font-weight: 600; font-size: 0.9rem; margin: 0; }
.timer-buttons-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  padding-bottom: 2px;
}
.timer-buttons-row button,
.timer-buttons-row .timer-display { flex-shrink: 0; }
.timer-display { font-size: 1.1rem; font-weight: 700; color: #22c55e; min-width: 3rem; }
</style>
