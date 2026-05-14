<template>
  <div class="free-play-view spacing-stack">
    <div class="free-play-header row center">
      <span id="phaseDisplay" class="phase-display">Phase {{ session.phase }}</span>
      <span class="roll-count">Rolls this phase: {{ session.rollCount }}</span>
    </div>

    <template v-if="session.phase <= 2">
      <div class="roll-block">
        <div class="roll-grid">
          <div class="roll-col">
            <label>Location</label>
            <input v-model.number="locationRoll" type="number" min="1" max="20" aria-label="Location roll 1–20" />
          </div>
          <div class="roll-col">
            <label>Action</label>
            <input v-model.number="actionRoll" type="number" min="1" max="20" aria-label="Action roll 1–20" />
          </div>
        </div>
        <div class="row action-row">
          <button type="button" class="primary big" @click="rollPhase12">Roll for me</button>
          <button type="button" class="secondary big" @click="submitPhase12" :disabled="submitCooldown">Submit numbers</button>
        </div>
      </div>

      <div class="roll-block clothing-roller">
        <h3 class="section-title">Clothing</h3>
        <div class="roll-grid roll-grid-single">
          <div class="roll-col">
            <label>How (1–12)</label>
            <input v-model.number="clothingHowRoll" type="number" min="1" max="12" aria-label="Clothing method 1–12" />
          </div>
        </div>
        <div class="row action-row">
          <button type="button" class="primary big" @click="rollClothing">Roll for me</button>
          <button type="button" class="secondary big" @click="submitClothing" :disabled="submitCooldown">Submit numbers</button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="roll-block">
        <div class="roll-grid">
          <div class="roll-col">
            <label>Position</label>
            <input v-model.number="positionRoll" type="number" min="1" max="155" aria-label="Position roll 1–155" />
          </div>
          <div class="roll-col">
            <label>Modifier</label>
            <input v-model.number="modifierRoll" type="number" min="1" max="20" aria-label="Modifier roll 1–20" />
          </div>
        </div>
        <div class="row action-row">
          <button type="button" class="primary big" @click="rollPhase3">Roll for me</button>
          <button type="button" class="secondary big" @click="submitPhase3" :disabled="submitCooldown">Submit numbers</button>
        </div>
      </div>
    </template>

    <div v-if="lastWhere || lastClothing" class="output-block">
      <div v-if="lastWhere" class="output-line"><strong>Where:</strong> {{ lastWhere }}</div>
      <div v-if="lastWhat" class="output-line"><strong>What:</strong> {{ lastWhat }}</div>
      <div v-if="lastClothing" class="output-line"><strong>Clothing:</strong> {{ lastClothing }}</div>
      <div v-if="lastInstruction" class="instruction-output">{{ lastInstruction }}</div>
      <div v-if="(lastInstruction || lastClothing) && speech.canSpeak()" class="read-aloud-row">
        <div class="pref-toggle pref-voice-enable read-aloud-voice-toggle">
          <span class="pref-toggle-label">Voice</span>
          <div class="row">
            <button type="button" class="secondary small" :class="{ 'preset-selected': voiceOn }" @click="setDiceVoice(true)">On</button>
            <button type="button" class="secondary small" :class="{ 'preset-selected': !voiceOn }" @click="setDiceVoice(false)">Off</button>
          </div>
        </div>
        <p v-if="!voiceOn" class="read-aloud-hint">Turn voice on to use Read aloud.</p>
        <template v-else>
          <p
            v-if="showKokoroPreparingHint"
            class="voice-preparing-hint"
            role="status"
          >
            <template v-if="kokoroWarmupErr">{{ kokoroWarmupErr }}</template>
            <template v-else-if="kokoroModelLoadingNow">Preparing voice…</template>
            <template v-else>Preparing voice… the first read aloud may take a few seconds on this device.</template>
          </p>
          <button
            v-if="!readAloudPlaying"
            type="button"
            class="secondary small read-aloud-btn"
            :disabled="readAloudLoading"
            @click="readAloud"
          >
            {{ readAloudLoading ? 'Loading voice…' : 'Read aloud' }}
          </button>
          <button
            v-else
            type="button"
            class="secondary small read-aloud-btn"
            @click="pauseReadAloud"
          >
            Pause
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import { usePreferencesStore } from '@/stores/preferences'
import { useSpeech } from '@/composables/useSpeech'
import { phase1And2Tables, phase3Modifiers, randomRollsForPhase } from '@/data/tables'
import { getPhase3PositionName, getPhase3PositionHelp, PHASE3_POSITIONS_LIST } from 'phase3-data'
import { clothingTable, getClothingItemsByBody } from '@/data/clothing'

const session = useSessionStore()
const prefs = usePreferencesStore()
const speech = useSpeech()

function unwrapSpeechRef(r) {
  return r && typeof r === 'object' && 'value' in r ? r.value : r
}

const ttsProviderVal = computed(() => unwrapSpeechRef(speech.ttsProvider))
const kokoroReadyVal = computed(() => unwrapSpeechRef(speech.kokoroReady))
const kokoroModelLoadingNow = computed(() => unwrapSpeechRef(speech.kokoroModelLoading))
const kokoroWarmupErr = computed(() => unwrapSpeechRef(speech.kokoroWarmupError))

const showKokoroPreparingHint = computed(() => {
  if (ttsProviderVal.value !== 'kokoro') return false
  if (!prefs.voiceEnabled) return false
  return !kokoroReadyVal.value
})

const voiceOn = computed(() => !!prefs.voiceEnabled)

function setDiceVoice(on) {
  prefs.$patch({ voiceEnabled: !!on })
  if (speech.voiceEnabled && typeof speech.voiceEnabled === 'object' && 'value' in speech.voiceEnabled) {
    speech.voiceEnabled.value = !!on
  }
}

const readAloudLoading = computed(() => {
  const provider = ttsProviderVal.value
  const kokoro = kokoroModelLoadingNow.value
  return provider === 'kokoro' && !!kokoro
})

const submitCooldown = ref(false)
const SUBMIT_COOLDOWN_MS = 400
function startSubmitCooldown() {
  submitCooldown.value = true
  setTimeout(() => { submitCooldown.value = false }, SUBMIT_COOLDOWN_MS)
}

const locationRoll = ref(1)
const actionRoll = ref(1)
const positionRoll = ref(1)
const modifierRoll = ref(1)
const clothingHowRoll = ref(1)

const lastWhere = ref('')
const lastWhat = ref('')
const lastInstruction = ref('')
const lastClothing = ref('')

watch(
  () => [
    !!(lastInstruction.value || lastClothing.value),
    prefs.voiceEnabled,
    ttsProviderVal.value,
    kokoroReadyVal.value,
  ],
  ([hasOut, ve, prov, ready]) => {
    if (!hasOut || !ve || prov !== 'kokoro' || ready) return
    speech.warmupWorker()
  },
  { immediate: true }
)

function rollPhase12() {
  const r = randomRollsForPhase(session.phase)
  locationRoll.value = r.location
  actionRoll.value = r.action
  submitPhase12()
}

function submitPhase12() {
  if (submitCooldown.value) return
  startSubmitCooldown()
  const phase = session.phase
  const t = phase1And2Tables[phase]
  if (!t) return
  const loc = Math.max(1, Math.min(20, locationRoll.value || 1))
  const act = Math.max(1, Math.min(20, actionRoll.value || 1))
  lastWhere.value = t.locations[loc] || ''
  lastWhat.value = t.actions[act] || ''
  lastInstruction.value = `${t.locations[loc] || ''}\n\n${t.actions[act] || ''}`
  session.setRollCount(session.rollCount + 1)
}

function rollPhase3() {
  positionRoll.value = Math.floor(Math.random() * 155) + 1
  modifierRoll.value = Math.floor(Math.random() * 20) + 1
  submitPhase3()
}

function submitPhase3() {
  if (submitCooldown.value) return
  startSubmitCooldown()
  const pos = Math.max(1, Math.min(155, positionRoll.value || 1))
  const mod = Math.max(1, Math.min(20, modifierRoll.value || 1))
  const entry = PHASE3_POSITIONS_LIST[pos]
  const posName = entry ? getPhase3PositionName(pos) : ''
  const posHelp = entry ? getPhase3PositionHelp(pos) : ''
  const modText = phase3Modifiers[mod] || ''
  lastWhere.value = posName || `Position ${pos}`
  lastWhat.value = modText
  lastInstruction.value = [posHelp, modText].filter(Boolean).join('\n\n')
  session.setRollCount(session.rollCount + 1)
}

const clothingItems = getClothingItemsByBody()

function pickRandomItem() {
  return clothingItems[Math.floor(Math.random() * clothingItems.length)]
}

function buildClothingText(howNum) {
  const num = Math.max(1, Math.min(12, howNum || 1))
  const entry = clothingTable[num]
  if (!entry) return ''
  const prefix = (entry.prefix || '').replace(/\{receiver\}/g, 'your partner')
  const method = (entry.method || '').trim()
  if (num === 12) {
    const item1 = pickRandomItem()
    let item2 = pickRandomItem()
    while (item2 === item1) item2 = pickRandomItem()
    return `${prefix}: ${item1} and ${item2}: ${method}`
  }
  const item = pickRandomItem()
  if (method) return `${prefix} ${item} ${method}`
  return `${prefix} ${item}`
}

function rollClothing() {
  clothingHowRoll.value = Math.floor(Math.random() * 12) + 1
  submitClothing()
}

function submitClothing() {
  if (submitCooldown.value) return
  startSubmitCooldown()
  lastClothing.value = buildClothingText(clothingHowRoll.value)
}

function readAloud() {
  if (!prefs.voiceEnabled) return
  const parts = [lastInstruction.value, lastClothing.value].filter(Boolean)
  if (!parts.length) return
  readAloudPlaying.value = true
  speech.speak(parts.join('\n\n'), {
    force: true,
    onEnd: () => { readAloudPlaying.value = false },
  })
}
function pauseReadAloud() {
  speech.stop()
  readAloudPlaying.value = false
}
</script>

<style scoped>
.free-play-view { padding: 0; width: 100%; max-width: 100%; }
.free-play-header.center { justify-content: center; gap: 0.75rem; margin-bottom: 0; }
.phase-display { font-size: 1.25rem; font-weight: 700; }
.roll-count { font-size: 0.9rem; color: #9ca3af; }
.roll-block { width: 100%; }
.roll-block.clothing-roller { margin-top: 0.25rem; padding-top: 0.75rem; border-top: 1px solid rgba(51,65,85,0.5); }
.roll-grid-single { grid-template-columns: 1fr; max-width: 10rem; }
.roll-grid-single .roll-col { gap: 0.6rem; }
.section-title { margin: 0 0 0.6rem; font-size: 1rem; font-weight: 700; color: #a855f7; text-align: center; }
.read-aloud-row { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; margin-top: 0.5rem; }
.read-aloud-voice-toggle { margin: 0; }
.read-aloud-hint { margin: 0; font-size: 0.85rem; color: #94a3b8; }
.voice-preparing-hint {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  color: #a5b4fc;
  line-height: 1.35;
}
.output-block {
  margin-top: 0;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgba(2,6,23,0.5);
  border: 1px solid #334155;
  width: 100%;
}
.output-line { margin-bottom: 0.35rem; }
.output-line:last-of-type { margin-bottom: 0; }
.instruction-output { white-space: pre-wrap; margin-top: 0.5rem; margin-bottom: 0; }
.read-aloud-btn { margin-top: 0.5rem; min-height: 44px; }
.clothing-roller { margin-top: 0; }
.clothing-roller .roll-grid { margin-left: auto; margin-right: auto; }
</style>
