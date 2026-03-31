<template>
  <div class="guided-ready-screen">
    <div class="guided-ready-inner">
      <h2 class="guided-ready-title">Your session is ready</h2>
      <p class="guided-ready-sub">Tap Start to begin. Voice will play from pre-generated audio.</p>
      <div class="guided-ready-actions">
        <button type="button" class="primary guided-ready-btn" @click.stop="$emit('start')">
          Start
        </button>
        <button type="button" class="secondary guided-ready-btn" @click.stop="$emit('back')">Back</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['start', 'back'])
</script>

<style scoped>
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
</style>
