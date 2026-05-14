<template>
  <div
    class="landing-modal onboarding-modal"
    :class="{ hidden: !show, 'tour-showing-main': step === 3 && !!tourLastClicked }"
    role="dialog"
    aria-labelledby="onboardingTitle"
    aria-modal="true"
  >
    <div class="landing-content onboarding-content" :class="{ 'card-bg-fiery-heart': prefs.backgroundImage === '1' }">
      <div class="wizard-container">
        <div class="wizard-steps-scroll" :class="{ 'step-2-scroll': step === 2, 'step-3-scroll': step === 3, 'step-content-fill-scroll': step >= 4 && step <= 6 }">
          <div v-show="step !== 1 && step !== 2 && step !== 3" class="wizard-sticky-header">
            <h1 id="onboardingTitle" class="landing-title">Welcome to Between Us</h1>
            <div class="wizard-progress">
              <span class="wizard-progress-text">Step {{ step }} of {{ totalSteps }}</span>
              <div class="wizard-progress-bar">
                <div class="wizard-progress-fill" :style="{ width: progressPercent + '%' }" />
              </div>
            </div>
          </div>
          <div ref="wizardStepsBodyRef" class="wizard-steps-body" :class="{ 'step-1-fullscreen': step === 1, 'step-2-fullscreen': step === 2, 'step-3-tour': step === 3, 'step-content-fill': step >= 4 && step <= 6 }" :style="stepsBodyStyle">
        <!-- Step 1: Full-screen "We're glad you're here" (then transitions to Welcome to Between Us) -->
        <div class="wizard-step wizard-step-fullscreen-welcome" :class="{ active: step === 1 }">
          <div class="wizard-step-content fullscreen-welcome-content">
            <div class="fullscreen-welcome-bg" aria-hidden="true" />
            <div class="fullscreen-welcome-card">
              <h2 class="fullscreen-welcome-title"><span class="fullscreen-welcome-title-line1">Welcome to</span><span class="fullscreen-welcome-title-line2">Between Us</span></h2>
              <p class="fullscreen-welcome-desc">We're glad you're here. Let's show you around.</p>
              <div class="fullscreen-welcome-actions">
                <button type="button" class="primary fullscreen-welcome-btn" @click="step = 2">Take the tour</button>
                <button type="button" class="secondary fullscreen-welcome-btn" @click="skipTour">Skip tour</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: What is Between Us? (Welcome to Between Us intro) -->
        <div ref="step2Ref" class="wizard-step wizard-step-intro" :class="{ active: step === 2 }">
          <div class="wizard-step-content wizard-step-intro-content">
            <img
              src="/Images/manuelajaeger-hotel-1749602_1920.jpg"
              alt=""
              class="onboarding-intro-image"
              @load="step === 2 && updateStep2BodyHeight()"
            />
            <div class="wizard-step-header">
              <h2 class="wizard-step-title">What is Between Us?</h2>
              <p class="wizard-step-description">
                Discovering intimacy between you: a private, local-first app for couples. This includes guided sessions inspired by sensate focus (phased, timed, low-pressure) or roll-your-own dice in Dice game. Importantly, all preferences stay on your device.
              </p>
            </div>
          </div>
        </div>

        <!-- Step 3: Tour – click a mode to see its UI, then continue to setup -->
        <div class="wizard-step wizard-step-tour" :class="{ active: step === 3 }">
          <div class="wizard-step-content tour-landing-step-content">
            <div class="tour-landing-wrap">
              <div class="landing-content tour-landing-inner" :class="{ 'card-bg-fiery-heart': prefs.backgroundImage === '1' }">
                <!-- Initial: choose mode -->
                <template v-if="!tourLastClicked">
                  <h1 class="landing-title">Between Us</h1>
                  <p class="landing-subtitle">
                    Discovering intimacy together. Click a mode below to see its interface, then continue.
                  </p>
                  <SessionDisplaySleepTip />
                  <div class="mode-buttons">
                    <button
                      type="button"
                      class="mode-button freeplay"
                      :class="{ 'tour-explained': tourExplainedFreeplay }"
                      @click="onTourModeClick('freeplay')"
                    >
                      <div class="mode-button-title">🎲 Dice game</div>
                      <div class="mode-button-desc">
                        Roll dice for location, action, and (in Phase 3) position. No timer; you set the pace.
                      </div>
                    </button>
                    <button
                      type="button"
                      class="mode-button guided"
                      :class="{ 'tour-explained': tourExplainedGuided }"
                      @click="onTourModeClick('guided')"
                    >
                      <div class="mode-button-title">⏱️ Guided mode</div>
                      <div class="mode-button-desc">
                        Total time, turn length, and phased prompts (where, what, position) with optional voice.
                      </div>
                    </button>
                    <button
                      type="button"
                      class="mode-button sensate"
                      :class="{ 'tour-explained': tourExplainedSensate }"
                      @click="onTourModeClick('sensate')"
                    >
                      <div class="mode-button-title">🌿 Sensate-style sessions</div>
                      <div class="mode-button-desc">
                        Scripted presets with fixed blocks: phase-one style touch, transitions, and closings.
                      </div>
                    </button>
                  </div>
                </template>
                <!-- When a mode is selected, real main UI shows behind (tour preview); no mock so overlay sits over live app -->
                <!-- Dice game UI preview (mock only when not in tour preview – fallback) -->
                <template v-else-if="tourLastClicked === 'freeplay' && !tourShowingMain">
                  <div class="tour-mock-fill onboarding-tour-ui-freeplay">
                    <div class="play-mode-row tour-highlight-active">
                      <button type="button" class="secondary">Dice game</button>
                      <button type="button" class="secondary">Guided mode</button>
                      <button type="button" class="secondary">Sensate-style</button>
                    </div>
                    <div class="toolbar-row">
                      <button type="button" class="secondary small">Next phase</button>
                      <button type="button" class="secondary small">New session</button>
                      <button type="button" class="secondary small">Summary</button>
                    </div>
                    <div class="free-play-view">
                      <div class="free-play-header row center">
                        <span class="phase-display">Phase 1</span>
                        <span class="roll-count">Rolls this phase: 0</span>
                      </div>
                      <div class="roll-block tour-highlight-active">
                        <div class="roll-grid">
                          <div class="roll-col"><label>Location</label><input type="number" value="1" min="1" max="20" readonly /></div>
                          <div class="roll-col"><label>Action</label><input type="number" value="1" min="1" max="20" readonly /></div>
                        </div>
                        <div class="row action-row">
                          <button type="button" class="primary big">Roll for me</button>
                          <button type="button" class="secondary big">Submit numbers</button>
                        </div>
                      </div>
                      <div class="output-block tour-highlight-active">
                        <div class="output-line"><strong>Where:</strong> Bedroom</div>
                        <div class="output-line"><strong>What:</strong> Caress</div>
                        <button type="button" class="secondary small read-aloud-btn">Read aloud</button>
                      </div>
                    </div>
                  </div>
                </template>
                <!-- Guided mode UI preview – matches real GuidedModeView (center, circle, timers, instruction, controls) -->
                <template v-else-if="tourLastClicked === 'guided' && !tourShowingMain">
                  <div class="tour-mock-fill onboarding-tour-ui-guided">
                    <div class="play-mode-row tour-highlight-active">
                      <button type="button" class="secondary">Dice game</button>
                      <button type="button" class="secondary preset-selected">Guided mode</button>
                      <button type="button" class="secondary">Sensate-style</button>
                    </div>
                    <div class="tour-guided-center">
                      <div class="tour-guided-action-timer">
                        <span class="tour-guided-action-label">Where</span>
                        <span class="tour-guided-action-value">0:45</span>
                      </div>
                      <div class="tour-guided-circle-wrap">
                        <div class="tour-guided-sparkle-circle" aria-hidden="true" />
                      </div>
                      <div class="tour-guided-timers-row">
                        <div class="tour-guided-phase-cell">
                          <span class="tour-guided-phase-label">Phase 1</span>
                          <span class="tour-guided-phase-timer">2:00</span>
                        </div>
                        <span class="tour-guided-total-timer">Total 8:00</span>
                      </div>
                    </div>
                    <div class="tour-guided-block tour-guided-instruction-box tour-highlight-active">
                      <div class="tour-guided-instruction-output">Bedroom</div>
                      <div class="output-line"><strong>Clothing:</strong> Optional</div>
                    </div>
                    <p class="tour-guided-partner-label">Partner 1 → Partner 2</p>
                    <div class="tour-guided-controls tour-highlight-active">
                      <button type="button" class="secondary small">Pause</button>
                      <button type="button" class="secondary small">Skip turn</button>
                      <button type="button" class="secondary small danger">Stop session</button>
                    </div>
                  </div>
                </template>
                <!-- When tour preview: real app is visible behind; just need spacer so overlay bar lays out -->
                <div v-else-if="tourLastClicked" class="tour-preview-spacer" aria-hidden="true" />
              </div>
              <!-- Only show overlay bar when a mode is selected (so mode buttons stay fully clickable) -->
              <div v-show="tourLastClicked" class="tour-overlay-wrap" aria-hidden="true">
                <div class="tour-overlay-backdrop" />
                <div class="tour-overlay-caption">
                  <p class="tour-overlay-title">{{ tourOverlayTitle }}</p>
                  <p class="tour-overlay-desc">{{ tourOverlayDesc }}</p>
                  <div class="tour-overlay-actions">
                    <button
                      type="button"
                      class="secondary small tour-overlay-back-mode"
                      @click="backToTourModeChoice"
                    >
                      See other mode
                    </button>
                    <button type="button" class="primary tour-overlay-continue" @click="continueTourToSetup">
                      Continue to setup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Where to change settings (Preferences) -->
        <div class="wizard-step wizard-step-preferences-tour" :class="{ active: step === 4 }">
          <div class="wizard-step-content">
            <div class="wizard-step-header wizard-step-header-compact">
              <h2 class="wizard-step-title">Where to change settings</h2>
              <p class="wizard-step-description">
                Use the <strong>☰ menu</strong> in the top-left corner of the app to open <strong>Preferences</strong>. There you can change music, prompt detail, and other settings.
              </p>
            </div>
            <div class="onboarding-preferences-mock">
              <div class="preferences-mock-header">
                <span class="preferences-mock-hamburger" aria-hidden="true">☰</span>
                <span class="preferences-mock-title">Between Us</span>
              </div>
              <p class="onboarding-preferences-hint">Click the menu icon anytime to open Preferences.</p>
            </div>
          </div>
        </div>

        <!-- Step 5: Barriers to sexual connection (before preferences summary) -->
        <div class="wizard-step wizard-step-barriers" :class="{ active: step === 5 }">
          <div class="wizard-step-content">
            <div class="wizard-step-header wizard-step-header-compact">
              <h2 class="wizard-step-title">Barriers to sexual connection</h2>
              <p class="wizard-step-description">Optional. Select any that get in the way; we'll keep prompts in a range that feels right.</p>
            </div>
            <div class="onboarding-q-cards">
              <div class="onboarding-q-card onboarding-walls-card">
                <label class="onboarding-q-label">Select any that apply (optional)</label>
                <div class="onboarding-pref-buttons onboarding-walls-buttons">
                  <button
                    v-for="opt in connectionWallsOptions"
                    :key="opt.value"
                    type="button"
                    class="secondary onboarding-pref-btn"
                    :class="{ 'preset-selected': (questionnaire && questionnaire.connectionWalls) && questionnaire.connectionWalls.includes(opt.value) }"
                    @click="toggleConnectionWall(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 6: Profile + You're all set (single final step) -->
        <div class="wizard-step" :class="{ active: step === 6 }">
          <div class="wizard-step-content">
            <div class="wizard-step-header">
              <h2 class="wizard-step-title">Your profile (optional)</h2>
              <p class="wizard-step-description">
                Stored only on this device. You can change this anytime in preferences.
              </p>
            </div>
            <div class="onboarding-profile-form">
              <label for="onboarding-display-name">Display name</label>
              <input
                id="onboarding-display-name"
                type="text"
                v-model="displayName"
                placeholder="e.g. Alex"
                maxlength="64"
                class="onboarding-input"
              />
            </div>
            <div class="wizard-step-header wizard-step-header-compact onboarding-all-set-block">
              <h2 class="wizard-step-title">You're all set</h2>
              <p class="wizard-step-description">
                Choose Dice game or Guided Mode on the next screen to start. You can reopen this intro from the menu later.
              </p>
            </div>
          </div>
        </div>
          </div>
        </div>

        <div v-show="step > 1" class="wizard-navigation" :class="{ 'step-3-nav': step === 3 }">
          <button
            v-show="step > 1"
            type="button"
            class="wizard-nav-btn back"
            :disabled="navInCooldown"
            :aria-busy="navInCooldown"
            @click="goBack"
          >
            Back
          </button>
          <button
            v-if="step < totalSteps"
            type="button"
            class="wizard-nav-btn next"
            :disabled="navInCooldown"
            :aria-busy="navInCooldown"
            @click="goNext"
          >
            {{ step === 3 ? 'Continue' : 'Next' }}
          </button>
          <button
            v-else
            type="button"
            class="wizard-nav-btn next"
            :disabled="navInCooldown"
            :aria-busy="navInCooldown"
            @click="finish"
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { usePreferencesStore } from '@/stores/preferences'
import { useSessionStore } from '@/stores/session'
import { useSpeech } from '@/composables/useSpeech'
import SessionDisplaySleepTip from '@/components/SessionDisplaySleepTip.vue'

const props = defineProps({
  show: { type: Boolean, default: true },
})

const emit = defineEmits(['complete', 'tour-preview'])

const profile = useProfileStore()
const prefs = usePreferencesStore()
const session = useSessionStore()
const speech = useSpeech()
const totalSteps = 6
const step = ref(1)
const wizardStepsBodyRef = ref(null)
const step2Ref = ref(null)
const stepsBodyStyle = ref({})

/** Step 3 overlay tour: user clicks landing buttons, we show real main UI + overlay */
const tourExplainedFreeplay = ref(false)
const tourExplainedGuided = ref(false)
const tourExplainedSensate = ref(false)
const tourLastClicked = ref(null) // 'freeplay' | 'guided' | 'sensate' | null
const tourShowingMain = computed(() => step.value === 3 && !!tourLastClicked.value)
const tourOverlayTitle = computed(() => {
  if (tourLastClicked.value === 'guided') return '⏱️ Guided mode'
  if (tourLastClicked.value === 'sensate') return '🌿 Sensate-style sessions'
  if (tourLastClicked.value === 'freeplay') return '🎲 Dice game'
  return 'Try the modes'
})
const tourOverlayDesc = computed(() => {
  if (tourLastClicked.value === 'guided') {
    return 'Timed guided session: partner names, total time, and turn length, then where → what → position with optional voice.'
  }
  if (tourLastClicked.value === 'sensate') {
    return 'Choose a scripted preset, then voice (and who touches first when offered). Fixed Partner 1 / Partner 2 in script and audio—no name fields, separate from the timed guided wizard.'
  }
  if (tourLastClicked.value === 'freeplay') {
    return 'Roll dice for location, action, and (in Phase 3) position. No timer: you set the pace. Optional Read aloud and clothing prompts.'
  }
  return 'Click a mode above to see its interface. Then continue to finish setup.'
})
function onTourModeClick(mode) {
  tourLastClicked.value = mode
  if (mode === 'freeplay') tourExplainedFreeplay.value = true
  else if (mode === 'guided') tourExplainedGuided.value = true
  else if (mode === 'sensate') tourExplainedSensate.value = true
  session.$patch({
    uiMode: mode,
    isGuidedMode: mode === 'guided' || mode === 'sensate',
  })
  emit('tour-preview', mode)
}
function continueTourToSetup() {
  if (navInCooldown.value) return
  startNavCooldown()
  tourLastClicked.value = null
  tourExplainedFreeplay.value = false
  tourExplainedGuided.value = false
  tourExplainedSensate.value = false
  emit('tour-preview', null)
  step.value = 4
}
function backToTourModeChoice() {
  tourLastClicked.value = null
  tourExplainedFreeplay.value = false
  tourExplainedGuided.value = false
  tourExplainedSensate.value = false
  emit('tour-preview', null)
}
const displayName = ref(profile.displayName || '')

const questionnaire = reactive({
  experience: 'beginner',
  penetration: 'prefer',
  anal: true,
  toys: true,
  connectionWalls: [],
})

const experienceOptions = [
  { value: 'beginner', label: 'Beginner (want more guidance)' },
  { value: 'regular', label: 'Some experience' },
  { value: 'expert', label: 'Very comfortable' },
]
const penetrationOptions = [
  { value: 'prefer', label: 'Prefer penetration included' },
  { value: 'minimal', label: 'Prefer minimal or no penetration' },
]
const connectionWallsOptions = [
  { value: 'anxieties', label: 'Anxieties' },
  { value: 'cant_focus', label: "Can't focus" },
  { value: 'cant_relax', label: "Can't relax" },
  { value: 'not_comfortable', label: 'Not comfortable with each other' },
  { value: 'dont_feel_safe', label: "Don't feel safe in sex" },
  { value: 'past_experiences', label: "Past experiences prevent it from feeling safe" },
  { value: 'goes_too_quickly', label: "Feel like it goes too quickly" },
  { value: 'cant_orgasm', label: "Feel like I can't orgasm" },
  { value: 'body_image', label: 'Body image / self-consciousness' },
  { value: 'stress', label: 'Stress or life getting in the way' },
  { value: 'low_desire', label: 'Low desire or not in the mood' },
  { value: 'none', label: 'None of these' },
  { value: 'prefer_not', label: 'Prefer not to say' },
]
const preferencesSummary = computed(() => {
  const q = questionnaire
  if (!q) return { promptDetail: '', penetration: '', anal: 'No', toys: 'No', connectionWallsSummary: '' }
  const expLabel = { beginner: 'Beginner', regular: 'Some experience', expert: 'Very comfortable' }[q.experience] || q.experience
  const penLabel = q.penetration === 'minimal' ? 'Minimal penetration' : 'Prefer penetration'
  const walls = q.connectionWalls && q.connectionWalls.length ? q.connectionWalls : []
  const wallLabels = connectionWallsOptions.filter((o) => walls.includes(o.value)).map((o) => o.label)
  const connectionWallsSummary = walls.includes('prefer_not')
    ? 'Prefer not to say'
    : walls.includes('none')
      ? 'None of these'
      : wallLabels.length
        ? wallLabels.join(', ')
        : ''
  return {
    promptDetail: expLabel,
    penetration: penLabel,
    anal: q.anal ? 'Yes' : 'No',
    toys: q.toys ? 'Yes' : 'No',
    connectionWallsSummary,
  }
})

function toggleConnectionWall(value) {
  if (!questionnaire) return
  const walls = [...(questionnaire.connectionWalls || [])]
  const exclusive = ['none', 'prefer_not']
  const isExclusive = exclusive.includes(value)
  if (isExclusive) {
    if (walls.includes(value)) {
      questionnaire.connectionWalls = walls.filter((w) => w !== value)
    } else {
      questionnaire.connectionWalls = [value]
    }
  } else {
    questionnaire.connectionWalls = walls.filter((w) => !exclusive.includes(w))
    const idx = questionnaire.connectionWalls.indexOf(value)
    if (idx >= 0) questionnaire.connectionWalls.splice(idx, 1)
    else questionnaire.connectionWalls.push(value)
    questionnaire.connectionWalls = [...questionnaire.connectionWalls]
  }
}

watch(displayName, (v) => {
  profile.setDisplayName(v)
})

watch(step, (newStep, oldStep) => {
  if (newStep === 6 && oldStep === 5) applyQuestionnaire()
  nextTick(updateStep2BodyHeight)
})

function updateStep2BodyHeight() {
  /* Step 2 uses step-2-fullscreen and fills viewport; other steps may use minHeight from content */
  if (step.value === 2) {
    stepsBodyStyle.value = {}
    return
  }
  if (step2Ref.value && step.value !== 2) {
    const h = step2Ref.value.scrollHeight
    stepsBodyStyle.value = h > 0 ? { minHeight: h + 'px' } : {}
  } else {
    stepsBodyStyle.value = {}
  }
}

function applyQuestionnaire() {
  const q = questionnaire
  if (!q) return
  prefs.setPromptDetail(q.experience)
  prefs.setPenetration(q.penetration)
  prefs.analPositionsEnabled = q.anal
  prefs.vibratorsPresent = q.toys
  profile.setConnectionWalls(q.connectionWalls ?? [])
}

const progressPercent = computed(() => (step.value / totalSteps) * 100)

/** Cooldown so fast Back/Next doesn't cause lag or crash */
const NAV_COOLDOWN_MS = 420
const navInCooldown = ref(false)
let navCooldownTimer = null

function startNavCooldown() {
  navInCooldown.value = true
  if (navCooldownTimer) clearTimeout(navCooldownTimer)
  navCooldownTimer = setTimeout(() => {
    navCooldownTimer = null
    navInCooldown.value = false
  }, NAV_COOLDOWN_MS)
}

function skipTour() {
  step.value = 4
}

function goBack() {
  if (navInCooldown.value) return
  startNavCooldown()
  if (step.value === 4) {
    backToTourModeChoice()
  }
  if (step.value === 3) {
    emit('tour-preview', null)
  }
  step.value = Math.max(1, step.value - 1)
}

function goNext() {
  if (navInCooldown.value) return
  startNavCooldown()
  if (step.value === 3) {
    tourLastClicked.value = null
    tourExplainedFreeplay.value = false
    tourExplainedGuided.value = false
    tourExplainedSensate.value = false
    emit('tour-preview', null)
  }
  step.value = Math.min(totalSteps, step.value + 1)
}

watch(step, (s) => {
  if (s !== 3) emit('tour-preview', null)
})

onMounted(() => {
  questionnaire.experience = prefs.promptDetailMode
  questionnaire.penetration = prefs.penetrationPreference
  questionnaire.anal = prefs.analPositionsEnabled
  questionnaire.toys = prefs.vibratorsPresent
  questionnaire.connectionWalls = profile.connectionWalls ? [...profile.connectionWalls] : []
})

function finish() {
  profile.completeOnboarding()
  emit('complete')
}
</script>

<style scoped>
.onboarding-modal .onboarding-content {
  max-width: 560px;
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.onboarding-modal .onboarding-content.card-bg-fiery-heart {
  background-image: linear-gradient(to bottom, rgba(2,6,23,0.4) 0%, rgba(2,6,23,0.65) 50%, rgba(2,6,23,0.85) 100%), url('/Background/fiery-heart.jpg');
  background-size: cover;
  background-position: center;
}
/* Step 3 tour preview: show real main UI behind; modal becomes a bottom-centered sheet (not bottom-right) */
.onboarding-modal.tour-showing-main {
  background: rgba(2, 6, 23, 0.4);
  align-items: flex-end;
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
  padding-bottom: 0;
}
.onboarding-modal.tour-showing-main .onboarding-content {
  max-width: min(560px, 100%);
  width: 100%;
  max-height: 50%;
  height: auto;
  min-height: auto;
  border-radius: 1rem 1rem 0 0;
  border-bottom: none;
}
.onboarding-modal.tour-showing-main .wizard-steps-scroll {
  flex: 0 0 auto;
  overflow: hidden;
}
.onboarding-modal.tour-showing-main .tour-preview-spacer {
  display: none;
}
.onboarding-modal.tour-showing-main .wizard-navigation {
  flex-shrink: 0;
}
.tour-preview-spacer {
  flex: 1;
  min-height: 2rem;
}
@media (max-width: 600px) {
  .onboarding-modal {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }
  .onboarding-modal .onboarding-content {
    max-width: none;
    width: 100%;
    height: 100%;
    min-height: 100dvh;
    max-height: none;
    border-radius: 0;
    border: none;
    padding: 0;
    box-shadow: none;
  }
  .onboarding-modal .wizard-container {
    padding: 0 0.75rem;
  }
  .onboarding-modal .wizard-navigation {
    padding-left: 0;
    padding-right: 0;
  }
}
.onboarding-modal .wizard-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.onboarding-modal .wizard-sticky-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #020617;
  padding: 0.4rem 0 1.25rem;
  margin-bottom: 0.25rem;
}
.onboarding-modal .wizard-sticky-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1.5rem;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, #020617);
}
.landing-content.card-bg-fiery-heart .wizard-sticky-header::after {
  background: linear-gradient(to bottom, transparent, #020617);
}
.onboarding-modal .wizard-sticky-header .landing-title { margin-bottom: 0.5rem; }
.onboarding-modal .wizard-sticky-header .wizard-progress { margin-bottom: 0; padding: 0.5rem 0.75rem; }
.landing-content.card-bg-fiery-heart .wizard-sticky-header {
  background: #020617;
  border-radius: 0 0 0.5rem 0.5rem;
  border: 1px solid #334155;
  border-top: none;
  padding: 0.4rem 0 1.25rem;
  margin: 0 0 0.25rem;
}
.onboarding-modal .onboarding-content { padding: 1.5rem 1.25rem; }
.onboarding-modal .wizard-step-content {
  min-height: 0;
  justify-content: flex-start;
  padding: 0.75rem 0;
}
.onboarding-modal .wizard-step-header { margin-bottom: 0.75rem; }
.onboarding-modal .wizard-step-title { margin-bottom: 0.35rem; }
.onboarding-modal .wizard-step-header-compact {
  margin-bottom: 0.4rem;
}
.onboarding-modal .wizard-step-header-compact .wizard-step-title {
  font-size: 1.1rem;
  margin-bottom: 0.15rem;
}
.onboarding-all-set-block { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #334155; }
.onboarding-modal .wizard-step-header-compact .wizard-step-description {
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.35;
}
.landing-content.card-bg-fiery-heart .wizard-step-content,
.card.card-bg-fiery-heart .wizard-step-content {
  padding: 0.75rem 1rem;
}
.onboarding-modal .wizard-steps-scroll {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.7) transparent;
}
.onboarding-modal .wizard-steps-scroll.step-2-scroll {
  overflow: hidden;
  padding-bottom: 0;
}
.onboarding-modal .wizard-steps-scroll.step-3-scroll {
  overflow: hidden;
  padding-bottom: 0;
}
.onboarding-modal .wizard-steps-scroll.step-content-fill-scroll {
  overflow: hidden;
  padding-bottom: 0;
}
/* Soft fade between steps: steps stacked in body layer so opacity transition is visible (no reflow) */
.onboarding-modal .wizard-steps-body {
  position: relative;
  min-height: 52vh;
}
.onboarding-modal .wizard-steps-body.step-1-fullscreen {
  min-height: 70vh;
  /* Fill scroll area so fiery heart extends to edges in all browsers (e.g. Chromium) */
  height: 100%;
  background-image: radial-gradient(ellipse 100% 100% at 50% 50%, transparent 0%, rgba(2, 6, 23, 0.25) 45%, rgba(2, 6, 23, 0.85) 100%), url('/Background/fiery-heart.jpg');
  background-size: cover;
  background-position: center;
}
.onboarding-modal .wizard-steps-body.step-2-fullscreen {
  height: 100%;
  min-height: 100%;
}
/* Step 2: What is Between Us – content fills viewport, image grows */
.onboarding-modal .wizard-step-intro.active .wizard-step-intro-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.onboarding-modal .wizard-step-intro.active .wizard-step-intro-content .onboarding-intro-image {
  flex: 1;
  min-height: 0;
  max-height: none;
  margin-bottom: 1rem;
}
.onboarding-modal .wizard-step-intro.active .wizard-step-intro-content .wizard-step-header {
  flex-shrink: 0;
}
.onboarding-modal .wizard-steps-body.step-3-tour {
  height: 100%;
  min-height: 100%;
}
.onboarding-modal .wizard-steps-body.step-content-fill {
  height: 100%;
  min-height: 100%;
}
/* When body fills height (steps 4–8), step content is constrained so cards area can scroll */
.onboarding-modal .wizard-steps-body.step-content-fill .wizard-step.active .wizard-step-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
/* Step 5 (barriers): full card + options scroll in the step; extra bottom space so nothing is cut off */
.onboarding-modal .wizard-steps-body.step-content-fill .wizard-step-barriers.active .wizard-step-content {
  height: auto;
  min-height: 100%;
  overflow: visible;
  padding-bottom: 5rem;
  box-sizing: border-box;
}
.onboarding-modal .wizard-steps-body.step-content-fill .wizard-step-barriers.active {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  align-items: stretch;
}
.onboarding-modal .wizard-steps-body.step-content-fill .wizard-step-barriers.active .onboarding-q-cards {
  flex: none;
  min-height: 0;
  overflow: visible;
  padding-bottom: 1.5rem;
}
.onboarding-modal .wizard-steps-body.step-content-fill .wizard-step.active .onboarding-q-cards {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
  padding-bottom: 2rem;
  box-sizing: border-box;
  display: block;
}
/* Card keeps natural height so scroll shows full content (no shrinking) */
.onboarding-modal .wizard-steps-body.step-content-fill .wizard-step.active .onboarding-q-cards .onboarding-q-card {
  flex-shrink: 0;
}
/* Step 1: full-screen welcome, then transitions to What is Between Us */
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(ellipse 100% 100% at 50% 50%, transparent 0%, rgba(2, 6, 23, 0.25) 45%, rgba(2, 6, 23, 0.85) 100%), url('/Background/fiery-heart.jpg');
  background-size: cover;
  background-position: center;
  pointer-events: none;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  padding: 1.5rem 2rem;
  background: var(--card-welcome-bg);
  border: var(--card-welcome-border);
  border-radius: var(--card-welcome-radius);
  box-shadow: var(--card-welcome-shadow);
  text-align: center;
  animation: fullscreen-welcome-card-in 0.6s ease-out forwards;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-title {
  font-family: var(--font-handwritten-title);
  margin: 0 0 0.5rem;
  font-size: clamp(1.85rem, 5vmin, 2.25rem);
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.02em;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-title-line2 {
  display: block;
  font-size: clamp(2.85rem, 8vmin, 3.5rem);
  margin-top: 0.2rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(to right, #60a5fa, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-desc {
  font-family: var(--font-handwritten-body);
  font-weight: 400;
  margin: 0;
  font-size: clamp(1rem, 2.2vmin, 1.1rem);
  color: #e2e8f0;
  line-height: 1.5;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.5rem;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-btn {
  min-height: 44px;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}
@keyframes fullscreen-welcome-card-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.onboarding-modal .wizard-steps-body .wizard-step {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}
.onboarding-modal .wizard-steps-body .wizard-step.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}
.onboarding-modal .wizard-steps-scroll::-webkit-scrollbar {
  width: 6px;
}
.onboarding-modal .wizard-steps-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.onboarding-modal .wizard-steps-scroll::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.7);
  border-radius: 3px;
}
.onboarding-modal .wizard-steps-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.8);
}
.onboarding-modal .wizard-sticky-header .landing-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(to right, #60a5fa, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
}
.onboarding-modal .wizard-navigation {
  flex-shrink: 0;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 3.5rem));
  background: transparent;
  border: none;
  border-top: 1px solid #334155;
  border-radius: 0;
  gap: 0.75rem;
}
.onboarding-modal .wizard-navigation.step-3-nav {
  margin-top: 0;
  padding-top: 0.5rem;
  border-top: none;
}
.onboarding-modal .wizard-nav-btn { padding: 0.6rem 1.25rem; font-size: 0.95rem; }
.onboarding-modal .wizard-nav-btn:disabled { opacity: 0.6; cursor: not-allowed; pointer-events: none; }
.onboarding-intro-image {
  display: block;
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 0.75rem;
  margin-bottom: 1.25rem;
}
.onboarding-list {
  text-align: left;
  margin: 0;
  padding-left: 1.25rem;
  color: #d1d5db;
  font-size: 0.95rem;
  line-height: 1.6;
}
.onboarding-list li { margin-bottom: 0.75rem; }

.onboarding-tour-slide { text-align: left; margin-bottom: 1rem; }
.onboarding-tour-card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid #334155;
  border-radius: 1rem;
  padding: 1.25rem 1.25rem 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.onboarding-tour-freeplay { border-left: 4px solid #22c55e; }
.onboarding-tour-guided { border-left: 4px solid #a855f7; }
.onboarding-tour-mode-title {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #e5e7eb;
}
.onboarding-tour-desc {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  color: #d1d5db;
  line-height: 1.5;
}
.onboarding-tour-bullets {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.9rem;
  color: #9ca3af;
  line-height: 1.55;
}
.onboarding-tour-bullets li { margin-bottom: 0.5rem; }
.onboarding-tour-next-hint {
  font-family: var(--font-handwritten-body);
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 0.75rem 0 0;
  text-align: center;
  letter-spacing: 0.02em;
}

/* Tour: dark overlay so only popup and highlighted area stay bright */
.tour-overlay {
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  background: rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 10;
}
.tour-highlight-active { z-index: 15; position: relative; }

/* Step 3: overlay tour on real landing screen */
.onboarding-modal .wizard-step-tour .wizard-step-content.tour-landing-step-content {
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;
  height: 100%;
}
.tour-landing-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}
.tour-landing-inner {
  padding: 1.5rem 1.25rem 8rem;
  min-height: 100%;
  box-sizing: border-box;
}
.tour-landing-inner .landing-subtitle { margin-bottom: 1rem; }
.tour-landing-inner .mode-buttons { margin-bottom: 0; }
.tour-overlay-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 5;
}
.tour-overlay-wrap .tour-overlay-caption {
  pointer-events: auto;
}
.tour-overlay-backdrop {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 12rem;
  background: linear-gradient(to top, rgba(2, 6, 23, 0.97) 0%, rgba(2, 6, 23, 0.7) 50%, transparent 100%);
  pointer-events: none;
}
.tour-overlay-caption {
  position: relative;
  padding: 1rem 1.25rem 1.25rem;
  text-align: center;
}
.tour-overlay-title {
  font-family: var(--font-handwritten-title);
  font-size: clamp(1.15rem, 3vmin, 1.5rem);
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
  line-height: 1.25;
}
.tour-overlay-desc {
  font-family: var(--font-handwritten-body);
  font-size: clamp(0.9rem, 2.2vmin, 1.05rem);
  color: #e2e8f0;
  line-height: 1.4;
  margin: 0 0 1rem;
}
.tour-overlay-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  margin-top: 0.5rem;
}
.tour-overlay-continue {
  min-height: 48px;
  padding: 0.65rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
}
.tour-overlay-back-mode {
  min-height: 40px;
}
.mode-button.tour-explained {
  border-color: rgba(96, 165, 250, 0.6);
  background: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.25);
}
.mode-button.freeplay.tour-explained {
  border-color: rgba(34, 197, 94, 0.7);
  background: rgba(34, 197, 94, 0.1);
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.3);
}
.mode-button.sensate.tour-explained {
  border-color: #2dd4bf;
  background: rgba(45, 212, 191, 0.12);
}
.mode-button.guided.tour-explained {
  border-color: rgba(168, 85, 247, 0.7);
  background: rgba(168, 85, 247, 0.1);
  box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.3);
}
/* Mock UI fills the area above the caption bar; scrollable so highlighted portion can be centered */
.tour-mock-fill {
  position: absolute;
  inset: 0;
  z-index: 12;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1rem;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
}
.tour-mock-fill.onboarding-tour-modes-overview {
  justify-content: center;
  align-items: center;
}
.tour-modes-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
}
.tour-mock-fill.onboarding-tour-landing {
  justify-content: center;
  align-items: center;
}
.tour-mock-fill.onboarding-tour-guided-setup {
  justify-content: flex-start;
  align-items: center;
}
.tour-guided-setup-content {
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tour-setup-mock {
  padding: 0.5rem 0 1.5rem;
  max-width: 320px;
  margin: 0 auto;
  width: 100%;
  display: block;
}
/* Progress first: own block so it never merges with step header (override global .wizard-progress flex) */
.tour-setup-mock .wizard-progress {
  display: block !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.75rem 0.5rem;
  background: rgba(15,23,42,0.98);
  border-radius: 0 0 0.5rem 0.5rem;
  border: 1px solid #334155;
  border-top: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.tour-setup-mock .wizard-progress-text {
  display: block !important;
  font-size: 0.9rem;
  color: #9ca3af;
  font-weight: 600;
  margin: 0;
}
.tour-setup-mock .wizard-progress-bar {
  display: block !important;
  flex: none !important;
  width: 100% !important;
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin: 0.5rem 0 0 !important;
}
.tour-setup-mock .wizard-progress-fill { height: 100%; background: linear-gradient(90deg, #a855f7, #22c55e); border-radius: 3px; }
/* Reset onboarding stacking: step must flow after progress, not overlay it */
.tour-setup-mock .wizard-step {
  position: static !important;
  top: auto;
  left: auto;
  right: auto;
  bottom: auto;
  overflow: visible;
  display: block;
  width: 100%;
}
.tour-setup-mock .wizard-step-header {
  display: block;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
}
.tour-setup-mock .wizard-step-title {
  display: block;
  font-family: var(--font-handwritten-title);
  font-size: clamp(1.1rem, 2.8vmin, 1.35rem);
  font-weight: 700;
  color: #e5e7eb;
  margin: 0 0 0.35rem;
  line-height: 1.3;
}
.tour-setup-mock .wizard-step-description {
  display: block;
  font-family: var(--font-handwritten-body);
  font-weight: 400;
  font-size: clamp(0.85rem, 2.2vmin, 1rem);
  color: #9ca3af;
  margin: 0;
  line-height: 1.4;
}
.tour-setup-mock .wizard-step-content {
  display: block;
  padding: 0.5rem 0;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}
.tour-setup-mock .wizard-step-content > * {
  display: block;
  margin-left: auto;
  margin-right: auto;
}
.tour-setup-mock .wizard-step-content label:first-of-type {
  margin-top: 0;
}
.tour-setup-mock .wizard-step-content .row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}
.tour-setup-mock .wizard-step-content label {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  width: 100%;
  text-align: center;
}
.tour-setup-mock .wizard-step-content label.mt { margin-top: 1rem; }
.tour-setup-mock .wizard-input {
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
.tour-setup-mock .color-dots { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; padding: 0.25rem 0; }
.tour-setup-mock .color-dot {
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  border-radius: 50%;
  border: 2px solid transparent;
}
.tour-setup-mock .color-dot.selected { border-color: #fff; box-shadow: 0 0 0 2px #475569, 0 0 12px rgba(168,85,247,0.4); }
.tour-setup-mock .row { display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap; }
.tour-setup-mock .wizard-navigation {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #334155;
  width: 100%;
  max-width: 320px;
  clear: both;
}
.tour-setup-mock .wizard-nav-btn {
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: default;
  min-height: 44px;
  flex: 1;
}
.tour-setup-mock .wizard-nav-btn.back:disabled { opacity: 0.5; cursor: default; }
.tour-setup-mock .wizard-step-content .row:last-of-type { margin-bottom: 0; }
.tour-landing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
}
.tour-mock-fill.onboarding-tour-ui-guided .tour-guided-content {
  flex-shrink: 0;
  width: 100%;
}
/* Caption bar: in-flow at bottom so no overlap with mock content */
.tour-caption-bar {
  flex-shrink: 0;
  z-index: 20;
  padding: 0.5rem 1rem 0.6rem;
  text-align: center;
  pointer-events: none;
  background: rgba(2, 6, 23, 0.92);
  border-top: 1px solid rgba(51, 65, 85, 0.8);
}
.tour-caption-title {
  font-family: var(--font-handwritten-title);
  font-size: clamp(1.15rem, 3vmin, 1.5rem);
  font-weight: 700;
  color: #f1f5f9;
  display: block;
  margin-bottom: 0.1rem;
  line-height: 1.25;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
}
.tour-caption-desc {
  font-family: var(--font-handwritten-body);
  font-size: clamp(0.85rem, 2.2vmin, 1.05rem);
  font-weight: 400;
  color: #e2e8f0;
  line-height: 1.3;
  display: block;
  margin-bottom: 0.35rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.tour-caption-next {
  font-family: var(--font-handwritten-body);
  font-weight: 400;
  font-size: clamp(0.9rem, 2.2vmin, 1.05rem);
  color: #94a3b8;
  margin: 0;
  line-height: 1.3;
}
.tour-mock-fill.onboarding-tour-modes-overview .tour-mode-card {
  padding: 0.5rem 0.75rem;
  font-size: clamp(0.95rem, 2.5vmin, 1.15rem);
  flex-shrink: 0;
}
.tour-mock-fill.onboarding-tour-ui-mock {
  padding: 0.6rem 0.75rem;
}
.tour-mock-fill.onboarding-tour-ui-freeplay .play-mode-row,
.tour-mock-fill.onboarding-tour-ui-freeplay .toolbar-row { margin-bottom: 0.4rem; }
.tour-mock-fill.onboarding-tour-ui-freeplay .roll-block,
.tour-mock-fill.onboarding-tour-ui-freeplay .output-block { padding: 0.5rem; }
.tour-mock-fill.onboarding-tour-ui-freeplay .free-play-header { margin-bottom: 0.25rem; }
/* Guided mock: match real GuidedModeView (center, circle, timers, instruction, controls) */
.tour-guided-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}
.tour-guided-action-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.tour-guided-action-label { font-size: 0.95rem; font-weight: 600; color: #a855f7; }
.tour-guided-action-value { font-size: 2.5rem; font-weight: 700; color: #e5e7eb; line-height: 1; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.tour-guided-circle-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0;
}
.tour-guided-sparkle-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(ellipse 70% 70% at 35% 35%, rgba(168, 85, 247, 0.45), rgba(34, 197, 94, 0.2) 45%, rgba(15, 23, 42, 0.6) 100%);
  box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.25), 0 0 24px rgba(168, 85, 247, 0.2);
}
.tour-guided-timers-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 280px;
  padding: 0 0.5rem;
  font-size: 0.9rem;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
}
.tour-guided-phase-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}
.tour-guided-phase-label { font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }
.tour-guided-phase-timer { font-weight: 600; }
.tour-guided-total-timer { font-weight: 600; }
.tour-guided-block {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: rgba(2,6,23,0.5);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.tour-guided-instruction-output { white-space: pre-wrap; margin: 0 0 0.25rem; }
.tour-guided-instruction-box .output-line { margin-bottom: 0.35rem; }
.tour-guided-instruction-box .output-line:last-of-type { margin-bottom: 0; }
.tour-guided-partner-label { font-size: 1rem; color: #a855f7; margin: 0; text-align: center; }
.tour-guided-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  width: 100%;
}
.tour-guided-controls .danger { background: rgba(127,29,29,0.5); color: #fecaca; }
.tour-mock-fill.onboarding-tour-ui-guided .play-mode-row { margin-bottom: 0.5rem; }
.onboarding-tour-ui-mock {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #334155;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.onboarding-tour-ui-freeplay { border-left: 4px solid #22c55e; }
.onboarding-tour-ui-guided { border-left: 4px solid #a855f7; }
/* Welcome slide: kaleidoscope GIF background behind the popup, no horizontal overflow */
.onboarding-tour-welcome {
  position: absolute;
  inset: 0;
  min-height: 14rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}
.welcome-bg-animation {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, #0f172a 0%, #020617 100%);
  pointer-events: none;
}
.onboarding-tour-modes-overview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.tour-mode-card {
  font-family: var(--font-handwritten-body);
  font-weight: 400;
  background: rgba(15, 23, 42, 0.85);
  border: 2px solid rgba(148, 163, 184, 0.4);
  border-radius: 0.85rem;
  padding: 0.85rem 1rem;
  font-size: clamp(0.95rem, 2.5vmin, 1.15rem);
  color: #e2e8f0;
  line-height: 1.5;
  letter-spacing: 0.01em;
}
.tour-mode-card .tour-mode-icon { margin-right: 0.35rem; font-size: 1.1em; }
.tour-mode-card-future { opacity: 0.85; border-style: dashed; }
.onboarding-tour-landing {
  text-align: center;
  padding: 1.25rem;
}
.tour-landing-title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.5rem, 4vmin, 2rem);
  font-weight: 700;
  font-family: var(--font-handwritten-title);
  background: linear-gradient(to right, #60a5fa, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.tour-landing-subtitle { margin: 0 0 1rem; font-family: var(--font-handwritten-body); font-weight: 400; font-size: clamp(0.9rem, 2.2vmin, 1.05rem); color: #9ca3af; }
.tour-landing-buttons { display: flex; flex-direction: column; gap: 0.6rem; }
.tour-landing-buttons .mode-button {
  display: block;
  text-align: left;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: rgba(2, 6, 23, 0.6);
  color: #e5e7eb;
  font-size: 0.95rem;
  cursor: default;
}
.tour-landing-buttons .mode-button.freeplay { border-left: 4px solid #22c55e; }
.tour-landing-buttons .mode-button.guided { border-left: 4px solid #a855f7; }
.tour-landing-buttons .mode-button.sensate { border-left: 4px solid #2dd4bf; }
/* Exact copy of Dice game UI (same structure/classes as App + FreePlayView) */
.onboarding-tour-ui-freeplay .play-mode-row { margin-bottom: 0.5rem; }
.onboarding-tour-ui-freeplay .toolbar-row { margin-bottom: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: center; }
.onboarding-tour-ui-freeplay .timer-bar.tour-timer-mock {
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem; flex-shrink: 0;
}
.onboarding-tour-ui-freeplay .timer-bar .timer-label-row { display: flex; justify-content: center; }
.onboarding-tour-ui-freeplay .timer-bar .timer-label { font-weight: 600; font-size: 0.9rem; margin: 0; color: #e5e7eb; }
.onboarding-tour-ui-freeplay .timer-bar .timer-buttons-row { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: center; }
.onboarding-tour-ui-freeplay .free-play-view { padding: 0; width: 100%; max-width: 100%; }
.onboarding-tour-ui-freeplay .free-play-header.row.center { justify-content: center; gap: 0.75rem; margin-bottom: 0; }
.onboarding-tour-ui-freeplay .phase-display { font-size: 1.25rem; font-weight: 700; }
.onboarding-tour-ui-freeplay .roll-count { font-size: 0.9rem; color: #9ca3af; }
.onboarding-tour-ui-freeplay .roll-block { width: 100%; }
.onboarding-tour-ui-freeplay .roll-block.clothing-roller { margin-top: 0.25rem; padding-top: 0.75rem; border-top: 1px solid rgba(51,65,85,0.5); }
.onboarding-tour-ui-freeplay .roll-grid-single { grid-template-columns: 1fr; max-width: 10rem; }
.onboarding-tour-ui-freeplay .section-title { margin: 0 0 0.6rem; font-size: 1rem; font-weight: 700; color: #a855f7; text-align: center; }
.onboarding-tour-ui-freeplay .output-block { margin-top: 0; padding: 0.75rem; border-radius: 0.5rem; background: rgba(2,6,23,0.5); border: 1px solid #334155; width: 100%; }
.onboarding-tour-ui-freeplay .output-line { margin-bottom: 0.35rem; }
.onboarding-tour-ui-freeplay .output-line:last-of-type { margin-bottom: 0; }
.onboarding-tour-ui-freeplay .read-aloud-btn { margin-top: 0.5rem; min-height: 44px; }
.onboarding-tour-ui-freeplay .clothing-roller .roll-grid { margin-left: auto; margin-right: auto; }

button.tour-highlight-active { border-radius: 0.5rem; }
.play-mode-row.tour-highlight-active,
.timer-bar.tour-timer-mock.tour-highlight-active,
.roll-block.tour-highlight-active,
.output-block.tour-highlight-active,
.tour-guided-block.tour-highlight-active,
.tour-guided-controls.tour-highlight-active,
.partner-label.tour-highlight-active,
button.tour-highlight-active,
.output-block .read-aloud-btn.tour-highlight-active {
  --tour-glow: rgba(59, 130, 246, 0.4);
  animation: tour-highlight-pulse 2s ease-in-out infinite;
}
.roll-block.clothing-roller.tour-highlight-active { --tour-glow: rgba(168, 85, 247, 0.35); }
.output-block.tour-highlight-active { --tour-glow: rgba(168, 85, 247, 0.35); }
.output-block .read-aloud-btn.tour-highlight-active { --tour-glow: rgba(34, 197, 94, 0.35); }
/* Roll for me is a primary (blue) button – use amber glow so highlight is visible */
button.primary.tour-highlight-active { --tour-glow: rgba(251, 191, 36, 0.55); }
@keyframes tour-highlight-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--tour-glow, rgba(59, 130, 246, 0.3)); border-color: transparent; }
  50% { box-shadow: 0 0 12px 2px var(--tour-glow, rgba(59, 130, 246, 0.3)); border-color: rgba(255, 255, 255, 0.15); }
}
/* Pause tour/onboarding animations when tab hidden to reduce mobile CPU/heat */
:global(.app-root.page-hidden) .tour-highlight-active,
:global(.app-root.page-hidden) .onboarding-spinner {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .tour-highlight-active {
    animation: none;
    box-shadow: 0 0 8px 1px var(--tour-glow, rgba(59, 130, 246, 0.35));
    border-color: rgba(255, 255, 255, 0.12);
  }
  .onboarding-spinner {
    animation: none;
    border-top-color: #60a5fa;
    opacity: 0.9;
  }
}

.onboarding-preferences-mock {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #334155;
  border-radius: 1rem;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}
.preferences-mock-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #334155;
  margin-bottom: 0.75rem;
}
.preferences-mock-hamburger {
  font-size: 1.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(51, 65, 85, 0.5);
  border-radius: 0.35rem;
  color: #e2e8f0;
}
.preferences-mock-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: #e5e7eb;
}
.onboarding-preferences-hint {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0;
  text-align: center;
}
.onboarding-modal .wizard-step-preferences-tour .wizard-step-content {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.onboarding-profile-form { margin-top: 1rem; text-align: left; }
.onboarding-profile-form label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 0.35rem;
}
.onboarding-input {
  width: 100%;
  max-width: 280px;
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
  border: 2px solid #334155;
  border-radius: 0.5rem;
  background: rgba(2,6,23,0.8);
  color: #e5e7eb;
}
.onboarding-input:focus {
  outline: none;
  border-color: #60a5fa;
}
.onboarding-input::placeholder { color: #6b7280; }

.onboarding-pref-label { display: block; font-size: 0.95rem; font-weight: 600; color: #e5e7eb; margin-bottom: 0.5rem; }
.onboarding-pref-buttons { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.75rem; }
.onboarding-pref-btn {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-align: center;
}


.onboarding-modal .onboarding-q-cards { gap: 0.75rem; margin-top: 0.75rem; }
.onboarding-modal .onboarding-q-card {
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
}
.onboarding-q-cards { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; text-align: left; }
.onboarding-q-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid #334155;
  border-radius: 1rem;
  padding: 1.25rem 1.25rem 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.onboarding-q-label { display: block; font-size: 0.95rem; font-weight: 600; color: #e5e7eb; margin-bottom: 0.6rem; line-height: 1.4; }
.onboarding-q-hint { display: block; font-size: 0.8rem; color: #6b7280; margin-top: 0.35rem; margin-bottom: 0.25rem; line-height: 1.4; }

.onboarding-walls-card { max-width: 100%; }
.onboarding-walls-buttons { flex-wrap: wrap; gap: 0.5rem; }
.onboarding-modal .wizard-steps-body.step-content-fill .onboarding-walls-card .onboarding-pref-buttons {
  margin-bottom: 0.5rem;
}
.onboarding-summary-list { margin-top: 0.5rem; }
</style>
