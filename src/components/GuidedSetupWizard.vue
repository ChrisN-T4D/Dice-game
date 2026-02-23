<template>
  <div class="guided-setup-wizard">
    <div class="wizard-body">
    <div class="wizard-progress">
      <span class="wizard-progress-text">Step {{ step }} of {{ totalSteps }}</span>
      <div class="wizard-progress-bar">
        <div class="wizard-progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Step 1: Phase distribution (compact so it fits without scrolling) -->
    <div v-show="step === 1" class="wizard-step active wizard-step-phase-distribution">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Phase time distribution</div>
        <div class="wizard-step-description">How to split time across the three phases</div>
      </div>
      <div class="wizard-step-content">
        <div class="row wrap">
          <button v-for="opt in phaseOptions" :key="opt.value" type="button" class="secondary wizard-opt wizard-opt-compact" :class="{ 'preset-selected': config.distributionMode === opt.value }" @click="selectPhaseOption(opt)">
            <span class="wizard-opt-label">{{ opt.label }}</span>
            <span class="wizard-opt-sub">{{ opt.sub }}</span>
          </button>
        </div>
        <div v-if="config.distributionMode === 'custom'" class="custom-sliders custom-sliders-compact">
          <div class="row align-center"><label>Phase 1</label><span class="pct">{{ config.phasePercents[0] }}%</span><input v-model.number="config.phasePercents[0]" type="range" min="0" max="100" /></div>
          <div class="row align-center"><label>Phase 2</label><span class="pct">{{ config.phasePercents[1] }}%</span><input v-model.number="config.phasePercents[1]" type="range" min="0" max="100" /></div>
          <div class="row align-center"><label>Phase 3</label><span class="pct">{{ config.phasePercents[2] }}%</span><input v-model.number="config.phasePercents[2]" type="range" min="0" max="100" /></div>
        </div>
      </div>
    </div>

    <!-- Step 2: Total time -->
    <div v-show="step === 2" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Total session time</div>
        <div class="wizard-step-description">How long should the session be?</div>
      </div>
      <div class="wizard-step-content">
        <div class="row wrap">
          <button v-for="m in [15, 30, 45, 60, 90, 120]" :key="m" type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.totalMinutes === m }" @click="config.totalMinutes = m">{{ m }} min</button>
        </div>
      </div>
    </div>

    <!-- Step 3: Turn & Pause -->
    <div v-show="step === 3" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Turn and pause</div>
        <div class="wizard-step-description">Turn length and pause between turns</div>
      </div>
      <div class="wizard-step-content">
        <label>Turn duration</label>
        <div class="row wrap">
          <button v-for="m in [1, 2, 3, 5]" :key="m" type="button" class="secondary" :class="{ 'preset-selected': config.turnMinutes === m }" @click="config.turnMinutes = m">{{ m }} min</button>
        </div>
        <label class="mt">Pause between turns</label>
        <div class="row wrap">
          <button v-for="s in pauseOptions" :key="s.v" type="button" class="secondary small" :class="{ 'preset-selected': config.pauseSeconds === s.v }" @click="config.pauseSeconds = s.v">{{ s.label }}</button>
        </div>
      </div>
    </div>

    <!-- Step 4: Clothing removal (enabled/disabled) – before partners -->
    <div v-show="step === 4" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Clothing removal</div>
        <div class="wizard-step-description">Clothing removal during Phase 1 & 2?</div>
      </div>
      <div class="wizard-step-content">
        <div class="row">
          <button type="button" class="secondary" :class="{ 'preset-selected': config.clothingEnabled }" @click="config.clothingEnabled = true">Enabled</button>
          <button type="button" class="secondary" :class="{ 'preset-selected': !config.clothingEnabled }" @click="config.clothingEnabled = false">Disabled</button>
        </div>
      </div>
    </div>

    <!-- Step 5: Partner 1 -->
    <div v-show="step === 5" class="wizard-step active wizard-step-partner">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 1</div>
        <div class="wizard-step-description">Name, color, and anatomy</div>
      </div>
      <div class="wizard-step-content">
        <label>Name</label>
        <input v-model="config.partnerNames[1]" type="text" placeholder="Partner 1" maxlength="30" class="wizard-input" />
        <label class="mt">Color</label>
        <div class="row color-dots">
          <span
            v-for="c in colors"
            :key="c"
            class="color-dot"
            :class="{ selected: config.partnerColors[1] === c }"
            :style="{ background: c }"
            @click="config.partnerColors[1] = c"
          ></span>
        </div>
        <label class="mt">Anatomy</label>
        <div class="row">
          <button type="button" class="secondary" :class="{ 'preset-selected': config.partnerAnatomy[1] === 'penis' }" @click="config.partnerAnatomy[1] = 'penis'">Penis & scrotum</button>
          <button type="button" class="secondary" :class="{ 'preset-selected': config.partnerAnatomy[1] === 'vulva' }" @click="config.partnerAnatomy[1] = 'vulva'">Vulva</button>
        </div>
      </div>
    </div>

    <!-- Step 6: Partner 1 clothing -->
    <div v-show="step === 6" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 1 – clothing</div>
        <div class="wizard-step-description">Choose a preset, then add or remove items as you like.</div>
      </div>
      <div class="wizard-step-content">
        <template v-if="config.clothingEnabled">
          <label>Preset</label>
          <div class="row wrap clothing-presets">
            <button
              v-for="preset in presetNames"
              :key="'p1-' + preset"
              type="button"
              class="clothing-preset-btn"
              :class="{ 'preset-selected': listMatchesPreset(config.clothingListP1, preset) }"
              :title="preset"
              @click="setPreset(1, preset)"
            >
              <span class="clothing-preset-icon">{{ presetIcon(preset) }}</span>
              {{ presetLabel(preset) }}
            </button>
          </div>
          <div class="clothing-list-by-body mt">
            <div class="clothing-list-intro">Choose a preset to add its items, then tap any item to turn it on or off. Grouped by body region (head to toe).</div>
            <div v-for="grp in fullClothingGroups" :key="'p1-full-' + grp.region" class="clothing-region">
              <div class="clothing-region-label">{{ grp.label }}</div>
              <div class="clothing-region-items">
                <button
                  v-for="item in grp.items"
                  :key="'p1-' + item"
                  type="button"
                  class="clothing-item-btn"
                  :class="{ 'preset-selected': config.clothingListP1.includes(item) }"
                  @click="toggleClothingItem(1, item)"
                >
                  <span class="clothing-item-icon">{{ getClothingEmoji(item) }}</span>
                  {{ item }}
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="wizard-step-description">Clothing is disabled. Enable it in step 4 to choose items.</p>
      </div>
    </div>

    <!-- Step 7: Partner 2 -->
    <div v-show="step === 7" class="wizard-step active wizard-step-partner">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 2</div>
        <div class="wizard-step-description">Name, color, and anatomy</div>
      </div>
      <div class="wizard-step-content">
        <label>Name</label>
        <input v-model="config.partnerNames[2]" type="text" placeholder="Partner 2" maxlength="30" class="wizard-input" />
        <label class="mt">Color</label>
        <div class="row color-dots">
          <span
            v-for="c in colors"
            :key="c"
            class="color-dot"
            :class="{ selected: config.partnerColors[2] === c }"
            :style="{ background: c }"
            @click="config.partnerColors[2] = c"
          ></span>
        </div>
        <label class="mt">Anatomy</label>
        <div class="row">
          <button type="button" class="secondary" :class="{ 'preset-selected': config.partnerAnatomy[2] === 'penis' }" @click="config.partnerAnatomy[2] = 'penis'">Penis & scrotum</button>
          <button type="button" class="secondary" :class="{ 'preset-selected': config.partnerAnatomy[2] === 'vulva' }" @click="config.partnerAnatomy[2] = 'vulva'">Vulva</button>
        </div>
      </div>
    </div>

    <!-- Step 8: Partner 2 clothing -->
    <div v-show="step === 8" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 2 – clothing</div>
        <div class="wizard-step-description">Choose a preset, then add or remove items as you like.</div>
      </div>
      <div class="wizard-step-content">
        <template v-if="config.clothingEnabled">
          <label>Preset</label>
          <div class="row wrap clothing-presets">
            <button
              v-for="preset in presetNames"
              :key="'p2-' + preset"
              type="button"
              class="clothing-preset-btn"
              :class="{ 'preset-selected': listMatchesPreset(config.clothingListP2, preset) }"
              :title="preset"
              @click="setPreset(2, preset)"
            >
              <span class="clothing-preset-icon">{{ presetIcon(preset) }}</span>
              {{ presetLabel(preset) }}
            </button>
          </div>
          <div class="clothing-list-by-body mt">
            <div class="clothing-list-intro">Choose a preset to add its items, then tap any item to turn it on or off. Grouped by body region (head to toe).</div>
            <div v-for="grp in fullClothingGroups" :key="'p2-full-' + grp.region" class="clothing-region">
              <div class="clothing-region-label">{{ grp.label }}</div>
              <div class="clothing-region-items">
                <button
                  v-for="item in grp.items"
                  :key="'p2-' + item"
                  type="button"
                  class="clothing-item-btn"
                  :class="{ 'preset-selected': config.clothingListP2.includes(item) }"
                  @click="toggleClothingItem(2, item)"
                >
                  <span class="clothing-item-icon">{{ getClothingEmoji(item) }}</span>
                  {{ item }}
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="wizard-step-description">Clothing is disabled. Enable it in step 4 to choose items.</p>
      </div>
    </div>

    <!-- Step 9: Phase check-in option & Start -->
    <div v-show="step === 9" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Phase check-in</div>
        <div class="wizard-step-description">Pause between phases to check in with each other before continuing?</div>
      </div>
      <div class="wizard-step-content">
        <div class="row">
          <button type="button" class="secondary" :class="{ 'preset-selected': config.phaseCheckInEnabled }" @click="config.phaseCheckInEnabled = true">Yes</button>
          <button type="button" class="secondary" :class="{ 'preset-selected': !config.phaseCheckInEnabled }" @click="config.phaseCheckInEnabled = false">No</button>
        </div>
      </div>
    </div>
    </div>

    <div class="wizard-solid-footer" aria-hidden="true"></div>
    <div class="wizard-fade-overlay" aria-hidden="true"></div>
    <div class="wizard-navigation">
      <div class="wizard-navigation-inner">
        <button type="button" class="wizard-nav-btn back" :disabled="step <= 1" @click="step--">← Back</button>
        <button v-if="step < totalSteps" type="button" class="wizard-nav-btn next" @click="step++">Next →</button>
        <button v-else type="button" class="primary wizard-nav-btn" @click="onStart">Start session</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { clothingPresets, getClothingEmoji, getClothingItemsByBody, groupClothingByBodyRegion, sortClothingByBodyRegion } from '@/data/clothing'

const totalSteps = 9
const step = ref(1)
const progressPercent = computed(() => (step.value / totalSteps) * 100)

const colors = ['#3b82f6', '#22d3ee', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#f97316', '#ec4899', '#e5e7eb']

const phaseOptions = [
  { value: 'equal', label: 'Equal', sub: '33/33/34%' },
  { value: 'phase1', label: 'Sensate-focused', sub: '50/30/20%' },
  { value: 'phase2', label: 'A little spicy', sub: '30/40/30%' },
  { value: 'phase3', label: 'Intimacy-focused', sub: '20/30/50%' },
  { value: 'quickie', label: 'Quickie', sub: '10/30/60%' },
  { value: 'custom', label: 'Custom', sub: 'Set your own' },
]

const phasePercentsByMode = {
  equal: [33, 33, 34],
  phase1: [50, 30, 20],
  phase2: [30, 40, 30],
  phase3: [20, 30, 50],
  quickie: [10, 30, 60],
  custom: [33, 33, 34],
}

const pauseOptions = [
  { v: 0, label: 'None' },
  { v: 10, label: '10 sec' },
  { v: 15, label: '15 sec' },
  { v: 30, label: '30 sec' },
  { v: 60, label: '1 min' },
]

const presetNames = Object.keys(clothingPresets)
/** Shorter labels for preset buttons so they fit better. */
const presetDisplayNames = {
  casual: 'Casual',
  dressCasual: 'Dress',
  lingerie: 'Lingerie',
  lingerieLace: 'Lace',
  lingerieClassic: 'Classic',
  minimal: 'Minimal',
  fullOutfit: 'Full',
  dateNight: 'Date',
  loungeWear: 'Lounge',
  athletic: 'Athletic',
  cozy: 'Cozy',
  layered: 'Layered',
  undergarmentsMale: 'Undies\nMale',
  undergarmentsFemale: 'Undies\nFemale',
  custom: 'Custom',
}
function presetLabel(key) {
  return presetDisplayNames[key] || key
}
/** Full list of clothing items grouped by body region (head to toe), for Custom mode. */
const fullClothingGroups = groupClothingByBodyRegion(getClothingItemsByBody())

const config = reactive({
  partnerNames: { 1: '', 2: '' },
  partnerColors: { 1: '#3b82f6', 2: '#ec4899' },
  partnerAnatomy: { 1: 'penis', 2: 'vulva' },
  distributionMode: 'equal',
  phasePercents: [33, 33, 34],
  totalMinutes: 30,
  turnMinutes: 2,
  pauseSeconds: 15,
  clothingRemovalSeconds: 30,
  clothingEnabled: false,
  clothingListP1: [...clothingPresets.undergarmentsMale],
  clothingListP2: [...clothingPresets.undergarmentsFemale],
  phaseCheckInEnabled: false,
})

function selectPhaseOption(opt) {
  config.distributionMode = opt.value
  config.phasePercents = [...phasePercentsByMode[opt.value]]
  if (opt.value === 'quickie') {
    config.totalMinutes = 15
    config.turnMinutes = 1
  }
}

function setPreset(partner, presetKey) {
  const list = clothingPresets[presetKey]
  if (!list) return
  if (partner === 1) config.clothingListP1 = [...list]
  else config.clothingListP2 = [...list]
}

function listMatchesPreset(list, presetKey) {
  if (!Array.isArray(list)) return false
  if (presetKey === 'custom') {
    if (list.length === 0) return true
    return !presetNames.some((p) => p !== 'custom' && listMatchesPreset(list, p))
  }
  const preset = clothingPresets[presetKey]
  if (!preset) return false
  if (list.length !== preset.length) return false
  const a = [...list].sort()
  const b = [...preset].sort()
  return a.every((item, i) => item === b[i])
}

function isCustomClothingMode(partner) {
  const list = partner === 1 ? config.clothingListP1 : config.clothingListP2
  return listMatchesPreset(list, 'custom')
}

function toggleClothingItem(partner, item) {
  const list = partner === 1 ? config.clothingListP1 : config.clothingListP2
  const idx = list.indexOf(item)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(item)
  const sorted = sortClothingByBodyRegion(list)
  if (partner === 1) config.clothingListP1 = [...sorted]
  else config.clothingListP2 = [...sorted]
}

function presetIcon(presetKey) {
  const list = clothingPresets[presetKey]
  if (!list || list.length === 0) return '👕'
  return getClothingEmoji(list[0])
}

const emit = defineEmits(['start'])

function onStart() {
  const phasePercents = config.distributionMode === 'custom' ? [...config.phasePercents] : phasePercentsByMode[config.distributionMode]
  if (config.distributionMode === 'quickie') {
    config.totalMinutes = 15
    config.turnMinutes = 1
  }
  emit('start', {
    totalMinutes: config.totalMinutes,
    turnMinutes: config.turnMinutes,
    pauseSeconds: config.pauseSeconds,
    clothingRemovalSeconds: config.clothingRemovalSeconds,
    phasePercents,
    clothingListP1: config.clothingEnabled ? config.clothingListP1 : [],
    clothingListP2: config.clothingEnabled ? config.clothingListP2 : [],
    clothingEnabled: config.clothingEnabled,
    distributionMode: config.distributionMode,
    partnerNames: { 1: config.partnerNames[1], 2: config.partnerNames[2] },
    partnerAnatomy: { 1: config.partnerAnatomy[1], 2: config.partnerAnatomy[2] },
    phaseCheckInEnabled: config.phaseCheckInEnabled,
  })
}
</script>

<style scoped>
.guided-setup-wizard {
  padding: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding-bottom: 0;
}
.wizard-body {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 5.5rem;
  /* Invisible-style scrollbar: thin floating thumb, no visible track */
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
}
.wizard-body::-webkit-scrollbar {
  width: 6px;
}
.wizard-body::-webkit-scrollbar-track {
  background: transparent;
}
.wizard-body::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}
.wizard-body:hover::-webkit-scrollbar-thumb,
.wizard-body:focus-within::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.5);
}
.wizard-body::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 85, 105, 0.75);
}
/* Full-width block behind Back/Next: solid at bottom, fading to transparent about halfway up */
.wizard-solid-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: calc(4.25rem + 5rem + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, rgb(15, 23, 42) 0%, rgb(15, 23, 42) 45%, transparent 100%);
  pointer-events: none;
  z-index: 18;
}
/* Gradient overlay on top of solid footer for fade effect; nav sits above this */
.wizard-fade-overlay {
  position: fixed;
  bottom: calc(4.25rem + env(safe-area-inset-bottom, 0px));
  left: 0;
  right: 0;
  height: 5rem;
  pointer-events: none;
  background: linear-gradient(to top, rgb(15, 23, 42) 0%, rgba(15, 23, 42, 0.6) 40%, transparent 100%);
  z-index: 19;
}
.wizard-progress {
  flex-shrink: 0;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.75rem 0.5rem;
  background: rgba(15,23,42,0.98);
  border-radius: 0 0 0.5rem 0.5rem;
  border: 1px solid #334155;
  border-top: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.wizard-progress-text { font-size: 1rem; color: #9ca3af; font-weight: 600; }
.wizard-progress-bar {
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
}
.wizard-progress-fill { height: 100%; background: linear-gradient(90deg, #a855f7, #22c55e); transition: width 0.3s ease; border-radius: 3px; }
.wizard-step-header {
  margin-bottom: 1rem;
  text-align: center;
}
.wizard-step-title { font-size: 1.25rem; font-weight: 700; color: #e5e7eb; margin: 0; }
.wizard-step-description { font-size: 1rem; color: #9ca3af; margin-top: 0.35rem; }
.wizard-step-content {
  padding: 0.5rem 0;
  width: 100%;
  max-width: 320px;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.wizard-step-content label {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  width: 100%;
  text-align: center;
}
.wizard-step-content label.mt { margin-top: 1rem; }
.wizard-input {
  width: 100%;
  max-width: 280px;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: rgba(2,6,23,0.8);
  color: #e5e7eb;
  min-height: 44px;
  box-sizing: border-box;
  margin: 0 auto;
}
.mt { margin-top: 1rem; }
/* Compact partner steps so name, color, anatomy fit without scrolling */
.wizard-step-partner .wizard-step-header { margin-bottom: 0.5rem; }
.wizard-step-partner .wizard-step-title { font-size: 1.1rem; }
.wizard-step-partner .wizard-step-description { font-size: 0.85rem; margin-top: 0.2rem; }
.wizard-step-partner .wizard-step-content { padding: 0.25rem 0; }
.wizard-step-partner .wizard-step-content label { font-size: 0.85rem; margin-bottom: 0.35rem; }
.wizard-step-partner .wizard-step-content label.mt { margin-top: 0.5rem; }
.wizard-step-partner .wizard-input { padding: 0.4rem 0.6rem; min-height: 36px; }
.wizard-step-partner .color-dots { gap: 0.35rem; padding: 0.15rem 0; }
.wizard-step-partner .color-dot {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
}
.wizard-step-partner .wizard-step-content .row { gap: 0.35rem; }

/* Phase distribution step: compact so it fits without scrolling */
.wizard-step-phase-distribution .wizard-step-header { margin-bottom: 0.5rem; }
.wizard-step-phase-distribution .wizard-step-title { font-size: 1.1rem; }
.wizard-step-phase-distribution .wizard-step-description { font-size: 0.95rem; margin-top: 0.2rem; }
.wizard-step-phase-distribution .wizard-step-content { padding: 0.25rem 0; }
.wizard-step-phase-distribution .wizard-step-content .row { gap: 0.35rem; }
.wizard-step-phase-distribution .wizard-opt-compact {
  min-width: 0;
  padding: 0.35rem 0.5rem;
  min-height: 32px;
  font-size: 0.8rem;
  line-height: 1.25;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.wizard-step-phase-distribution .wizard-opt-label { font-weight: 600; }
.wizard-step-phase-distribution .wizard-opt-sub { font-size: 0.65rem; color: #9ca3af; margin-top: 0.05rem; }
.wizard-step-phase-distribution .custom-sliders-compact { margin-top: 0.5rem; gap: 0.25rem; max-width: 280px; }
.wizard-step-phase-distribution .custom-sliders-compact .row { margin-bottom: 0.25rem; gap: 0.35rem; }
.wizard-step-phase-distribution .custom-sliders-compact label { font-size: 0.8rem; margin: 0; }

.color-dots {
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0.25rem 0;
}
.color-dot {
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, box-shadow 0.15s;
}
.color-dot:hover { transform: scale(1.08); }
.color-dot.selected { border-color: #fff; box-shadow: 0 0 0 2px #475569, 0 0 12px rgba(168,85,247,0.4); }
.wizard-step-content .row {
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.wrap { flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
.wizard-opt {
  min-width: 90px;
  padding: 0.6rem 0.75rem;
  text-align: center;
  min-height: 44px;
}
.wizard-opt .sub { font-size: 0.8rem; color: #9ca3af; display: block; margin-top: 0.2rem; }
.custom-sliders { gap: 0.5rem; width: 100%; max-width: 280px; }
.custom-sliders .row { gap: 0.5rem; margin-bottom: 0.5rem; justify-content: center; }
.custom-sliders input[type="range"] { flex: 1; min-width: 80px; accent-color: #a855f7; }
.pct { min-width: 3rem; text-align: right; font-weight: 700; }
.align-center { align-items: center; gap: 0.5rem; }
.wizard-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  padding: 0.75rem 1rem;
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  background: rgb(15, 23, 42);
  border-top: 1px solid #334155;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
  z-index: 20;
  isolation: isolate;
}
.wizard-navigation-inner {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}
.wizard-nav-btn {
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  flex: 1;
}
.wizard-nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
/* Presets: 3 columns for a comfortable layout; no horizontal overflow */
.clothing-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  justify-items: stretch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.clothing-preset-btn {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre-line;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0.5rem;
  min-height: 36px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: #020617;
  color: #e5e7eb;
  border: 1px solid #4b5563;
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
}
.clothing-preset-btn:hover {
  background-color: rgba(2, 6, 23, 0.9);
  border-color: #64748b;
}
.clothing-preset-btn.preset-selected {
  background-color: rgba(59, 130, 246, 0.25);
  border-color: #3b82f6;
  color: #93c5fd;
  font-weight: 600;
}
.clothing-preset-btn.preset-selected:hover {
  background-color: rgba(59, 130, 246, 0.35);
  border-color: #60a5fa;
}
.clothing-preset-icon { font-size: 1em; flex-shrink: 0; }
.clothing-list-by-body {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  text-align: left;
  overflow-x: hidden;
}
.clothing-list-intro { font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.75rem; }
.clothing-region { margin-bottom: 0.75rem; min-width: 0; }
.clothing-region-label {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.35rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.clothing-region-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-width: 0;
}
.clothing-item { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; color: #e5e7eb; }
/* Clothing item toggles: comfortable tap targets, clear selected state; no horizontal overflow */
.clothing-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.65rem;
  min-height: 42px;
  min-width: 0;
  max-width: 100%;
  font-size: 0.85rem;
  font-weight: 500;
  background-color: #020617;
  color: #e5e7eb;
  border: 1px solid #4b5563;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.clothing-item-btn:hover {
  background-color: rgba(2, 6, 23, 0.9);
  border-color: #64748b;
}
.clothing-item-btn.preset-selected {
  background-color: rgba(59, 130, 246, 0.3);
  border-color: #3b82f6;
  color: #93c5fd;
  font-weight: 600;
}
.clothing-item-btn.preset-selected:hover {
  background-color: rgba(59, 130, 246, 0.4);
  border-color: #60a5fa;
}
.clothing-item-icon { font-size: 1.1em; flex-shrink: 0; }
</style>
