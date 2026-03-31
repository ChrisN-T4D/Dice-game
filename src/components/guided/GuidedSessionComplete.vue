<template>
  <div class="guided-block session-complete">
    <p class="guided-block-text">Session complete.</p>
    <div class="row guided-block-actions center">
      <button type="button" class="secondary" @click="$emit('save-favorite')">Save as favorite</button>
      <button type="button" class="primary" @click="$emit('continue-freeplay')">Continue in Dice game</button>
      <button type="button" class="secondary" @click="$emit('end-session')">End session</button>
    </div>
    <p v-if="sessionFavoriteSaved" class="guided-session-saved-msg">Saved. You can start this session again from Saved sessions.</p>
  </div>
</template>

<script setup>
defineProps({
  sessionFavoriteSaved: { type: Boolean, default: false },
})
defineEmits(['save-favorite', 'continue-freeplay', 'end-session'])
</script>

<style scoped>
.guided-block {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: rgba(2,6,23,0.5);
}
.guided-block-text { margin: 0 0 0.75rem; }
.guided-block-text:last-child { margin-bottom: 0; }
.guided-block-actions { gap: 0.5rem; margin: 0; }
.guided-session-saved-msg { font-size: 0.9rem; color: #86efac; margin: 0.5rem 0 0; }
</style>
