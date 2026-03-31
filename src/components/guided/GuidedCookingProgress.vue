<template>
  <div>
    <Teleport to="#bottom-nav-portal">
      <div class="guided-cooking-nav-actions">
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('back')">Back to setup</button>
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('quit')">Quit</button>
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
          <button type="button" class="secondary" @click="$emit('back')">Back to review</button>
          <button type="button" class="primary" @click="$emit('retry')">Try again</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cookingGifs: { type: Array, required: true },
  cookingLabels: { type: Array, required: true },
  cookingStepIndex: { type: Number, required: true },
  cookingWaitingForModel: { type: Boolean, required: true },
  cookingSubtext: { type: String, required: true },
  cookingProgressPercent: { type: Number, required: true },
  cookingKokoroFallback: { type: String, default: null },
  cookingError: { type: String, default: null },
})

defineEmits(['back', 'quit', 'retry'])

function isKokoroError(message) {
  return message && typeof message === 'string' && /kokoro|model.*load|timed out/i.test(message)
}
</script>

<style scoped>
.guided-cooking-nav-actions {
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
.guided-review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 0.5rem;
}
</style>
