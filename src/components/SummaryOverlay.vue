<template>
  <div v-show="open" class="summary-overlay" @click.self="close">
    <div class="summary-card">
      <div class="summary-header">
        <h2>Phase reference</h2>
        <button type="button" class="summary-close" @click="close">×</button>
      </div>
      <div class="summary-phase-select">
        <label>Phase:</label>
        <select v-model.number="selectedPhase" class="summary-select">
          <option :value="1">1 – Warm-up</option>
          <option :value="2">2 – Heating up</option>
          <option :value="3">3 – Intimacy</option>
        </select>
      </div>
      <div class="summary-content">
        <div v-if="selectedPhase <= 2" class="summary-section">
          <h3>Locations</h3>
          <ul class="summary-list">
            <li v-for="(text, key) in phaseTable.locations" :key="key">{{ key }}. {{ text }}</li>
          </ul>
        </div>
        <div v-if="selectedPhase <= 2" class="summary-section">
          <h3>Actions</h3>
          <ul class="summary-list">
            <li v-for="(text, key) in phaseTable.actions" :key="key">{{ key }}. {{ text }}</li>
          </ul>
        </div>
        <template v-if="selectedPhase === 3">
          <div class="summary-section">
            <h3>Modifiers</h3>
            <ul class="summary-list summary-list-long">
              <li v-for="(text, key) in phase3Modifiers" :key="key">{{ key }}. {{ text }}</li>
            </ul>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { phase1And2Tables, phase3Modifiers } from '@/data/tables'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const selectedPhase = ref(1)

const phaseTable = computed(() => {
  if (selectedPhase.value === 1 || selectedPhase.value === 2) {
    return phase1And2Tables[selectedPhase.value] || { locations: {}, actions: {} }
  }
  return { locations: {}, actions: {} }
})

function close() {
  emit('close')
}
</script>

<style scoped>
.summary-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.summary-card {
  background: rgba(2,6,23,0.98); border: 1px solid #475569; border-radius: 0.75rem;
  max-width: 90vw; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;
}
.summary-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid #334155; }
.summary-header h2 { margin: 0; font-size: 1.1rem; }
.summary-close { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem; }
.summary-close:hover { color: #fff; }
.summary-phase-select { padding: 0.75rem 1rem; gap: 0.5rem; display: flex; align-items: center; }
.summary-select { padding: 0.35rem 0.75rem; border-radius: 0.5rem; border: 1px solid #475569; background: rgba(2,6,23,0.9); color: #e5e7eb; }
.summary-content { overflow-y: auto; padding: 1rem; flex: 1; }
.summary-section { margin-bottom: 1rem; }
.summary-section h3 { font-size: 0.95rem; margin: 0 0 0.5rem; color: #a855f7; }
.summary-list { margin: 0; padding-left: 1.25rem; font-size: 0.85rem; line-height: 1.4; color: #cbd5e1; }
.summary-list-long { max-height: 50vh; overflow-y: auto; }
</style>
