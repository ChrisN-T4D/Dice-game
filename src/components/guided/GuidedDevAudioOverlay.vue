<template>
  <div v-if="open" class="guided-dev-overlay" @click.self="close">
    <div class="guided-dev-panel">
      <div class="guided-dev-header">
        <h3>Audio dev log</h3>
        <button type="button" class="guided-dev-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="guided-dev-current">
        <strong>Current:</strong> {{ guided.pendingSpeech?.phrase ? (guided.pendingSpeech.phrase.slice(0, 60) + (guided.pendingSpeech.phrase.length > 60 ? '…' : '')) : 'idle' }}
      </div>
      <div v-if="cookingLogRows.length" class="guided-dev-section">
        <h4 class="guided-dev-section-title">Cooking log (worker responses)</h4>
        <div class="guided-dev-log guided-dev-log-cooking">
          <div
            v-for="(entry, i) in cookingLogRows"
            :key="'cook-' + i"
            class="guided-dev-row guided-dev-row-cooking"
            :class="entry.phase"
          >
            <span class="guided-dev-time">{{ entry.time }}</span>
            <span class="guided-dev-cook-phase">#{{ entry.phraseIndex }} {{ entry.phase }}</span>
            <span v-if="entry.size != null" class="guided-dev-cook-detail">size {{ entry.size }}</span>
            <span v-if="entry.message" class="guided-dev-cook-detail guided-dev-cook-msg">{{ entry.message }}</span>
            <span v-if="entry.textSnippet" class="guided-dev-text" :title="entry.textSnippet">{{ entry.textSnippet }}</span>
            <span v-if="entry.retry" class="guided-dev-cook-tag">retry</span>
            <span v-if="entry.background" class="guided-dev-cook-tag">bg</span>
          </div>
        </div>
      </div>
      <div class="guided-dev-section">
        <h4 class="guided-dev-section-title">Session audio log</h4>
        <div class="guided-dev-log guided-dev-log-session">
          <div
            v-for="(entry, i) in devLogRows"
            :key="i"
            class="guided-dev-row"
            :class="entry.type"
          >
            <span class="guided-dev-time">{{ entry.time }}</span>
            <span class="guided-dev-type">{{ entry.type }}</span>
            <span v-if="entry.type === 'step'" class="guided-dev-step">→ {{ entry.text }}</span>
            <span v-if="entry.type === 'phrase_start'" class="guided-dev-source" :class="entry.source || 'unknown'">{{ entry.source === 'kokoro' ? 'Kokoro' : entry.source === 'browser' ? 'Browser' : '?' }}</span>
            <span v-if="entry.type === 'playback_failed'" class="guided-dev-fail">fail: {{ entry.reason || 'unknown' }}</span>
            <span v-if="entry.duration != null" class="guided-dev-duration">({{ entry.duration }}s)</span>
            <span v-if="entry.text && entry.type !== 'step'" class="guided-dev-text">{{ entry.text }}</span>
          </div>
          <div v-if="!guided.devAudioLog.length" class="guided-dev-empty">No events yet.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGuidedStore } from '@/stores/guided'
import { useGuidedCookingLogRows, useGuidedDevLogRows } from '@/composables/useGuidedDevLogRows'

defineProps({
  open: { type: Boolean, required: true },
})

const emit = defineEmits(['update:open'])

const guided = useGuidedStore()
const devLogRows = useGuidedDevLogRows(guided)
const cookingLogRows = useGuidedCookingLogRows(guided)

function close() {
  emit('update:open', false)
}
</script>

<style scoped>
.guided-dev-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.guided-dev-panel {
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 0.75rem;
  max-width: min(420px, 100%);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}
.guided-dev-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #334155;
}
.guided-dev-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}
.guided-dev-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0 0.25rem;
  cursor: pointer;
  border-radius: 0.25rem;
}
.guided-dev-close:hover {
  color: #e2e8f0;
  background: #334155;
}
.guided-dev-current {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  color: #94a3b8;
  border-bottom: 1px solid #334155;
  word-break: break-word;
}
.guided-dev-log {
  padding: 0.5rem 1rem;
  overflow-y: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
}
.guided-dev-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  align-items: baseline;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}
.guided-dev-section { margin-top: 0.75rem; }
.guided-dev-section:first-of-type { margin-top: 0; }
.guided-dev-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  margin: 0 0 0.35rem 0;
}
.guided-dev-log-cooking,
.guided-dev-log-session { max-height: 12rem; overflow-y: auto; }
.guided-dev-row-cooking { font-size: 0.85rem; }
.guided-dev-row-cooking.request { color: #93c5fd; }
.guided-dev-row-cooking.blob { color: #86efac; }
.guided-dev-row-cooking.static { color: #a5b4fc; }
.guided-dev-row-cooking.error { color: #fca5a5; }
.guided-dev-row-cooking.timeout { color: #fcd34d; }
.guided-dev-row-cooking.server { color: #86efac; }
.guided-dev-row-cooking.server_null { color: #64748b; }
.guided-dev-cook-phase { font-weight: 600; margin-right: 0.35rem; }
.guided-dev-cook-detail { font-size: 0.8rem; color: #94a3b8; margin-left: 0.25rem; }
.guided-dev-cook-msg { color: #f87171; }
.guided-dev-cook-tag { font-size: 0.7rem; opacity: 0.9; margin-left: 0.25rem; }
.guided-dev-row.phrase_start { color: #86efac; }
.guided-dev-row.phrase_end { color: #93c5fd; }
.guided-dev-row.playback_failed { color: #fca5a5; }
.guided-dev-row.pause { color: #fcd34d; }
.guided-dev-row.resume { color: #a5b4fc; }
.guided-dev-fail {
  font-size: 0.8rem;
  color: #f87171;
  font-weight: 600;
}
.guided-dev-time {
  color: #64748b;
  min-width: 4rem;
}
.guided-dev-type { font-weight: 600; }
.guided-dev-source {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 700;
}
.guided-dev-source.kokoro { background: rgba(34, 197, 94, 0.3); color: #4ade80; }
.guided-dev-source.browser { background: rgba(59, 130, 246, 0.3); color: #60a5fa; }
.guided-dev-source.unknown { background: rgba(100, 116, 139, 0.35); color: #94a3b8; }
.guided-dev-duration { color: #fbbf24; }
.guided-dev-text {
  color: #cbd5e1;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.guided-dev-empty {
  color: #64748b;
  font-style: italic;
  padding: 0.5rem 0;
}
</style>
