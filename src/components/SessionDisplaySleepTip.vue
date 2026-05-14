<template>
  <div class="session-display-sleep-tip" role="region" aria-label="Display and screen lock tip">
    <p class="session-display-sleep-tip__title">Before you start</p>
    <p class="session-display-sleep-tip__body">
      Phones often dim or lock the screen when they think you are idle. If you can, open your system
      <strong>Display</strong> or <strong>Screen timeout</strong> settings now and choose a longer time—or turn
      auto-lock off—until the session is over. That avoids interruptions if the browser cannot keep the display on.
    </p>
    <p v-if="!wakeLockSupported" class="session-display-sleep-tip__extra">
      This browser does not support the “keep screen on” feature; adjusting display sleep is especially helpful here.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const wakeLockSupported = computed(() => {
  if (typeof navigator === 'undefined') return false
  return 'wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function'
})
</script>

<style scoped>
.session-display-sleep-tip {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 0.65rem;
  border: 1px solid rgba(168, 85, 247, 0.45);
  background: rgba(88, 28, 135, 0.22);
  text-align: left;
}
.session-display-sleep-tip__title {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #e9d5ff;
}
.session-display-sleep-tip__body,
.session-display-sleep-tip__extra {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #d8b4fe;
}
.session-display-sleep-tip__extra {
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(168, 85, 247, 0.25);
  color: #fbbf24;
}
.session-display-sleep-tip__body strong {
  color: #f3e8ff;
  font-weight: 600;
}
</style>
