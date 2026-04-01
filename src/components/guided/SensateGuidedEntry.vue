<template>
  <div class="sensate-entry">
    <Teleport to="#bottom-nav-portal">
      <div v-if="screen === 'pick'" class="sensate-entry-nav">
        <button type="button" class="secondary sensate-nav-btn" @click="$emit('choose-classic')">Classic dice setup</button>
        <button type="button" class="primary sensate-nav-btn" :disabled="!selectedPresetId" @click="screen = 'setup'">
          Continue
        </button>
      </div>
      <div v-else class="sensate-entry-nav">
        <button type="button" class="secondary sensate-nav-btn" @click="screen = 'pick'">Back</button>
      </div>
    </Teleport>

    <div v-if="screen === 'pick'" class="sensate-entry-inner">
      <h2 class="sensate-title">Sensate-style sessions</h2>
      <p class="sensate-disclaimer">
        For adults in consensual relationships only. This is educational, not medical or therapy advice—not a substitute for
        professional assessment. Stop if there is discomfort, distress, coercion, or pain. For pain or new symptoms, see a
        clinician before intimate touch exercises.
      </p>
      <p class="sensate-hint">Pick a scripted session, then enter partner labels and voice. Or use classic dice-based guided setup.</p>
      <ul class="sensate-preset-list">
        <li v-for="p in SENSATE_PRESETS" :key="p.id">
          <button
            type="button"
            class="sensate-preset-card"
            :class="{ selected: selectedPresetId === p.id }"
            @click="selectedPresetId = p.id"
          >
            <span class="sensate-preset-title">{{ p.title }}</span>
            <span class="sensate-preset-blurb">{{ p.blurb }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-else class="sensate-entry-inner">
      <h2 class="sensate-title">Session setup</h2>
      <p class="sensate-setup-summary">{{ selectedPreset?.title }}</p>
      <label class="sensate-label">
        <span>Partner 1 name (optional)</span>
        <input v-model.trim="partner1" type="text" class="sensate-input" maxlength="40" autocomplete="nickname" />
      </label>
      <label class="sensate-label">
        <span>Partner 2 name (optional)</span>
        <input v-model.trim="partner2" type="text" class="sensate-input" maxlength="40" autocomplete="nickname" />
      </label>
      <label class="sensate-label">
        <span>Voice for this session</span>
        <select v-model="kokoroVoiceId" class="sensate-select" aria-label="Kokoro voice for guided session">
          <option v-for="v in kokoroVoicesList" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </label>
      <fieldset v-if="selectedPreset?.supportsFirstToucherChoice" class="sensate-fieldset">
        <legend class="sensate-legend">Who touches first (after setup)?</legend>
        <label class="sensate-radio">
          <input v-model="firstToucherPreference" type="radio" value="random" />
          <span>Random (50/50 each time you start)</span>
        </label>
        <label class="sensate-radio">
          <input v-model="firstToucherPreference" type="radio" value="1" />
          <span>Partner 1 is the first toucher</span>
        </label>
        <label class="sensate-radio">
          <input v-model="firstToucherPreference" type="radio" value="2" />
          <span>Partner 2 is the first toucher</span>
        </label>
      </fieldset>
      <p class="sensate-voice-hint">Audio uses fixed “Partner 1 / Partner 2” wording for static files; names are for your screen only.</p>
      <button type="button" class="primary sensate-start-btn" :disabled="!selectedPresetId" @click="emitStart">Review session</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { SENSATE_PRESETS } from '@/data/sensatePresets'
import { useSpeech } from '@/composables/useSpeech'

const props = defineProps({
  /** When set (e.g. from review “partner setup”), open setup for this preset. */
  resumePresetId: { type: String, default: null },
})

const emit = defineEmits(['choose-classic', 'start-sensate'])

const screen = ref('pick')
const selectedPresetId = ref(null)
const partner1 = ref('')
const partner2 = ref('')
/** 'random' | '1' | '2' — only used when preset supports first toucher choice */
const firstToucherPreference = ref('random')

const speech = useSpeech()
const kokoroVoicesList = computed(() => speech.kokoroVoicesListForLocale?.value ?? [])
const kokoroVoiceId = ref('af_nicole')

const selectedPreset = computed(() => SENSATE_PRESETS.find((p) => p.id === selectedPresetId.value))

watch(
  () => props.resumePresetId,
  (id) => {
    if (id) {
      selectedPresetId.value = id
      screen.value = 'setup'
    }
  },
  { immediate: true }
)

onMounted(() => {
  const raw = speech.kokoroVoiceId
  const kid = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw
  if (typeof kid === 'string' && kid.trim()) kokoroVoiceId.value = kid.trim()
})

function emitStart() {
  if (!selectedPresetId.value) return
  const preset = selectedPreset.value
  const pref = preset?.supportsFirstToucherChoice
    ? firstToucherPreference.value === '1' || firstToucherPreference.value === '2'
      ? Number(firstToucherPreference.value)
      : 'random'
    : 'random'
  emit('start-sensate', {
    presetId: selectedPresetId.value,
    partnerNames: { 1: partner1.value, 2: partner2.value },
    kokoroVoiceId: kokoroVoiceId.value?.trim() || 'af_nicole',
    sensateFirstToucherPreference: pref,
  })
}
</script>

<style scoped>
.sensate-entry {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  width: 100%;
  padding: 1.5rem 1rem 5rem;
  box-sizing: border-box;
}
.sensate-entry-inner {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.sensate-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 700;
  color: #e5e7eb;
}
.sensate-disclaimer {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: #9ca3af;
}
.sensate-hint {
  margin: 0;
  font-size: 0.9rem;
  color: #d1d5db;
}
.sensate-preset-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.sensate-preset-card {
  width: 100%;
  text-align: left;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px solid #374151;
  background: #1f2937;
  color: #e5e7eb;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.sensate-preset-card:hover {
  border-color: #6b7280;
}
.sensate-preset-card.selected {
  border-color: #a78bfa;
  box-shadow: 0 0 0 1px #a78bfa;
}
.sensate-preset-title {
  font-weight: 600;
  font-size: 1rem;
}
.sensate-preset-blurb {
  font-size: 0.85rem;
  color: #9ca3af;
  line-height: 1.35;
}
.sensate-entry-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  padding: 0.5rem;
}
.sensate-nav-btn {
  min-width: 8rem;
}
.sensate-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #d1d5db;
}
.sensate-input,
.sensate-select {
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid #4b5563;
  background: #111827;
  color: #f3f4f6;
  font-size: 1rem;
}
.sensate-setup-summary {
  margin: 0;
  color: #c4b5fd;
  font-weight: 500;
}
.sensate-voice-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
}
.sensate-start-btn {
  margin-top: 0.5rem;
  align-self: flex-start;
}
.sensate-fieldset {
  margin: 0;
  padding: 0.75rem 1rem;
  border: 1px solid #4b5563;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.sensate-legend {
  padding: 0 0.35rem;
  font-size: 0.9rem;
  color: #d1d5db;
}
.sensate-radio {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #e5e7eb;
  cursor: pointer;
}
.sensate-radio input {
  margin-top: 0.2rem;
}
</style>
