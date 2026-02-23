<template>
  <div
    class="landing-modal onboarding-modal"
    :class="{ hidden: !show }"
    role="dialog"
    aria-labelledby="onboardingTitle"
    aria-modal="true"
  >
    <div class="landing-content onboarding-content" :class="{ 'card-bg-fiery-heart': prefs.backgroundImage === '1' }">
      <div class="wizard-container">
        <div class="wizard-steps-scroll" :class="{ 'step-2-scroll': step === 2, 'step-3-scroll': step === 3, 'step-content-fill-scroll': step >= 4 && step <= 7 }">
          <div v-show="step !== 1 && step !== 2 && step !== 3" class="wizard-sticky-header">
            <h1 id="onboardingTitle" class="landing-title">Welcome to Between Us</h1>
            <div class="wizard-progress">
              <span class="wizard-progress-text">Step {{ step }} of {{ totalSteps }}</span>
              <div class="wizard-progress-bar">
                <div class="wizard-progress-fill" :style="{ width: progressPercent + '%' }" />
              </div>
            </div>
          </div>
          <div ref="wizardStepsBodyRef" class="wizard-steps-body" :class="{ 'step-1-fullscreen': step === 1, 'step-2-fullscreen': step === 2, 'step-3-tour': step === 3, 'step-content-fill': step >= 4 && step <= 7 }" :style="stepsBodyStyle">
        <!-- Step 1: Full-screen "We're glad you're here" (then transitions to Welcome to Between Us) -->
        <div class="wizard-step wizard-step-fullscreen-welcome" :class="{ active: step === 1 }">
          <div class="wizard-step-content fullscreen-welcome-content">
            <div class="fullscreen-welcome-bg" aria-hidden="true" />
            <div class="fullscreen-welcome-card">
              <h2 class="fullscreen-welcome-title"><span class="fullscreen-welcome-title-line1">Welcome to</span><span class="fullscreen-welcome-title-line2">Between Us</span></h2>
              <p class="fullscreen-welcome-desc">We're glad you're here. Let's show you around.</p>
              <div class="fullscreen-welcome-actions">
                <button type="button" class="primary fullscreen-welcome-btn" @click="step = 2">First time</button>
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

        <!-- Step 3: Quick tour (modes, landing, Dice game, Guided) -->
        <div class="wizard-step wizard-step-tour" :class="{ active: step === 3 }">
          <div class="wizard-step-content">
            <div class="onboarding-tour-preview">
              <div ref="tourPreviewMockAreaRef" class="tour-preview-mock-area">
                <div class="tour-overlay" aria-hidden="true" />
                <!-- Mock UI fills the mock area above the caption bar -->
                <div v-show="currentTourView === 'modes'" class="onboarding-tour-modes-overview tour-mock-fill">
                <div class="tour-modes-cards" data-tour-focus>
                <div class="tour-mode-card">
                  <span class="tour-mode-icon">🎲</span>
                  <strong>Dice game</strong> — Roll dice for location, action, position. No timer; optional Read aloud.
                </div>
                <div class="tour-mode-card">
                  <span class="tour-mode-icon">⏱️</span>
                  <strong>Guided Mode</strong> — Set time; app guides phases (where → what → position) with timed turns.
                </div>
                <div class="tour-mode-card tour-mode-card-future">
                  <span class="tour-mode-icon">🌡️</span>
                  <strong>Preset Guided Sensate</strong> — Ready-made sessions for your barriers. (Coming later.)
                </div>
                </div>
              </div>
              <div v-show="currentTourView === 'landing'" class="onboarding-tour-ui-mock onboarding-tour-landing tour-mock-fill">
                <div class="tour-landing-content" data-tour-focus>
                <h3 class="tour-landing-title">Between Us</h3>
                <p class="tour-landing-subtitle">Discovering intimacy together guided sessions or roll your own in Dice game</p>
                <div class="tour-landing-buttons">
                  <button type="button" class="mode-button freeplay" :class="{ 'tour-highlight-active': currentLandingHighlight === 'freeplay' }">🎲 Dice game — Roll dice, no timer</button>
                  <button type="button" class="mode-button guided" :class="{ 'tour-highlight-active': currentLandingHighlight === 'guided' }">⏱️ Guided Mode — Timed, phased turns</button>
                </div>
                </div>
              </div>
              <div v-show="currentTourView === 'guidedSetup'" class="onboarding-tour-ui-mock onboarding-tour-guided-setup tour-mock-fill">
                <div class="tour-guided-setup-content" data-tour-focus>
                  <div class="guided-setup-wizard tour-setup-mock">
                    <div class="wizard-progress">
                      <span class="wizard-progress-text">Step 1 of 7</span>
                      <div class="wizard-progress-bar">
                        <div class="wizard-progress-fill" style="width: 14%" />
                      </div>
                    </div>
                    <div class="wizard-step active">
                      <div class="wizard-step-header">
                        <div class="wizard-step-title">Partner 1</div>
                        <div class="wizard-step-description">Name, color, and anatomy</div>
                      </div>
                      <div class="wizard-step-content">
                        <label>Name</label>
                        <input type="text" placeholder="Partner 1" class="wizard-input" readonly />
                        <label class="mt">Color</label>
                        <div class="row color-dots">
                          <span class="color-dot selected" style="background: #3b82f6" />
                          <span class="color-dot" style="background: #22d3ee" />
                          <span class="color-dot" style="background: #22c55e" />
                          <span class="color-dot" style="background: #a855f7" />
                          <span class="color-dot" style="background: #f59e0b" />
                          <span class="color-dot" style="background: #ef4444" />
                          <span class="color-dot" style="background: #f97316" />
                          <span class="color-dot" style="background: #ec4899" />
                          <span class="color-dot" style="background: #e5e7eb" />
                        </div>
                        <label class="mt">Anatomy</label>
                        <div class="row">
                          <button type="button" class="secondary preset-selected">Penis & scrotum</button>
                          <button type="button" class="secondary">Vulva</button>
                        </div>
                      </div>
                    </div>
                    <!-- No nav inside mock: main tour Back/Next at bottom of modal (matches real wizard feel) -->
                  </div>
                </div>
              </div>
              <div v-show="currentTourView === 'freeplay'" class="onboarding-tour-ui-mock onboarding-tour-ui-freeplay tour-mock-fill">
                <div class="play-mode-row" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'mode' }">
                  <label class="play-mode-label">Play Mode</label>
                  <div class="row">
                    <button type="button" class="secondary preset-selected">Dice game</button>
                    <button type="button" class="secondary">Guided Mode</button>
                  </div>
                </div>
                <div class="toolbar-row">
                  <button type="button" class="secondary small">Next phase</button>
                  <button type="button" class="secondary small">New session</button>
                  <button type="button" class="secondary small">Summary</button>
                  <div class="timer-bar tour-timer-mock" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'timer' }">
                    <div class="timer-label-row">
                      <span class="timer-label">Timer</span>
                    </div>
                    <div class="timer-buttons-row row">
                      <button type="button" class="secondary small">30s</button>
                      <button type="button" class="secondary small">1 min</button>
                      <button type="button" class="secondary small">2 min</button>
                      <button type="button" class="secondary small">5 min</button>
                    </div>
                  </div>
                </div>
                <div class="free-play-view spacing-stack tour-freeplay-copy">
                  <div class="free-play-header row center">
                    <span class="phase-display">Phase 1</span>
                    <span class="roll-count">Rolls this phase: 0</span>
                  </div>
                  <div class="roll-block" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'rolls' }">
                    <div class="roll-grid">
                      <div class="roll-col">
                        <label>Location</label>
                        <input type="number" value="7" min="1" max="20" readonly aria-label="Location roll 1–20" />
                      </div>
                      <div class="roll-col">
                        <label>Action</label>
                        <input type="number" value="12" min="1" max="20" readonly aria-label="Action roll 1–20" />
                      </div>
                    </div>
                    <div class="row action-row">
                      <button type="button" class="primary big" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'roll-for-me' }">Roll for me</button>
                      <button type="button" class="secondary big" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'submit-numbers' }">Submit numbers</button>
                    </div>
                  </div>
                  <div class="roll-block clothing-roller" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'clothing' }">
                    <h3 class="section-title">Clothing</h3>
                    <div class="roll-grid roll-grid-single">
                      <div class="roll-col">
                        <label>How (1–12)</label>
                        <input type="number" value="3" min="1" max="12" readonly aria-label="Clothing method 1–12" />
                      </div>
                    </div>
                    <div class="row action-row">
                      <button type="button" class="primary big">Roll for me</button>
                      <button type="button" class="secondary big">Submit numbers</button>
                    </div>
                  </div>
                  <div class="output-block" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'output' }">
                    <div class="output-line"><strong>Where:</strong> Bedroom</div>
                    <div class="output-line"><strong>What:</strong> Touch and explore</div>
                    <button type="button" class="secondary small read-aloud-btn" :class="{ 'tour-highlight-active': currentFreeplayHighlight === 'read-aloud' }">Read aloud</button>
                  </div>
                </div>
              </div>
              <div v-show="currentTourView === 'guided'" class="onboarding-tour-ui-mock onboarding-tour-ui-guided tour-mock-fill">
                <div class="tour-guided-content" data-tour-focus>
                <div class="play-mode-row" :class="{ 'tour-highlight-active': currentGuidedHighlight === 'mode' }">
                  <label class="play-mode-label">Play Mode</label>
                  <div class="row">
                    <button type="button" class="secondary">Dice game</button>
                    <button type="button" class="secondary preset-selected">Guided Mode</button>
                  </div>
                </div>
                <div class="guided-mode-view spacing-stack tour-guided-copy">
                  <div class="guided-header row center" :class="{ 'tour-highlight-active': currentGuidedHighlight === 'header' }">
                    <span class="phase-display">Phase 1</span>
                    <span class="time-display">Total: 15:00</span>
                    <span class="time-display">Phase: 5:00</span>
                    <span class="action-label">Turn: 0:45</span>
                  </div>
                  <div class="guided-block guided-output" :class="{ 'tour-highlight-active': currentGuidedHighlight === 'output' }">
                    <div class="output-line"><strong>Where:</strong> Bedroom</div>
                    <div class="output-line"><strong>What:</strong> Touch and explore</div>
                  </div>
                  <div class="partner-label" :class="{ 'tour-highlight-active': currentGuidedHighlight === 'partner' }">Partner 1 → Partner 2</div>
                  <div class="row guided-controls center">
                    <button type="button" class="secondary" :class="{ 'tour-highlight-active': currentGuidedHighlight === 'pause' }">Pause</button>
                    <button type="button" class="secondary" :class="{ 'tour-highlight-active': currentGuidedHighlight === 'skip' }">Skip to next turn</button>
                    <button type="button" class="secondary danger" :class="{ 'tour-highlight-active': currentGuidedHighlight === 'stop' }">Stop session</button>
                  </div>
                </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Text-to-speech voice preferences -->
        <div class="wizard-step wizard-step-voice" :class="{ active: step === 4 }">
          <div class="wizard-step-content">
            <div class="wizard-step-header wizard-step-header-compact">
              <h2 class="wizard-step-title">Voice preferences</h2>
              <p class="wizard-step-description">For read-aloud and voice prompts. We'll preload matching voices first.</p>
            </div>
            <div class="onboarding-q-cards">
              <div class="onboarding-q-card">
                <label class="onboarding-pref-label">Preferred language for text-to-speech</label>
                <div class="onboarding-pref-buttons">
                  <button
                    v-for="opt in voiceLanguageOptions"
                    :key="opt.value"
                    type="button"
                    class="secondary onboarding-pref-btn"
                    :class="{ 'preset-selected': profile.voiceLanguagePreference === opt.value }"
                    @click="profile.setVoicePreferences({ language: opt.value, gender: profile.voiceGenderPreference })"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
              <div class="onboarding-q-card">
                <label class="onboarding-pref-label">Voice style you prefer (e.g. female or male)</label>
                <div class="onboarding-pref-buttons">
                  <button
                    v-for="opt in voiceGenderOptions"
                    :key="opt.value"
                    type="button"
                    class="secondary onboarding-pref-btn"
                    :class="{ 'preset-selected': profile.voiceGenderPreference === opt.value }"
                    @click="profile.setVoicePreferences({ language: profile.voiceLanguagePreference, gender: opt.value })"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
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

        <!-- Step 6: Profile -->
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
          </div>
        </div>

        <!-- Step 7: Voice setup (preload when leaving tour; recommendations) -->
        <div class="wizard-step" :class="{ active: step === 7 }">
          <div class="wizard-step-content">
            <div class="wizard-step-header">
              <h2 class="wizard-step-title">Voice setup</h2>
              <p v-if="!preloadDone" class="wizard-step-description">
                Preloading Piper so it's ready when you start…
              </p>
              <p v-else class="wizard-step-description">
                We use Piper and Kokoro (Browser as backup). Options below match your female or male preference. Try one and choose it.
              </p>
            </div>
            <div v-if="!preloadDone" class="onboarding-preload-status">
              <p class="onboarding-preload-text">Loading Piper…</p>
              <p class="onboarding-preload-hint">Kokoro loads on first use. You can continue without waiting.</p>
              <div class="onboarding-spinner" aria-hidden="true" />
              <button
                type="button"
                class="secondary small onboarding-skip-preload"
                @click="skipPreload"
              >
                Continue without waiting
              </button>
            </div>
            <div v-else class="onboarding-recommended-voices">
              <p class="onboarding-voice-try-all-hint">To try more voices, open ☰ menu → Preferences → Voice (read aloud).</p>
              <div
                v-for="rec in recommendedVoices"
                :key="rec.provider + '-' + rec.voiceId"
                class="onboarding-voice-row"
              >
                <span class="onboarding-voice-name">{{ rec.name }}</span>
                <div class="onboarding-voice-actions">
                  <button
                    type="button"
                    class="secondary small"
                    :disabled="samplePlaying"
                    @click="playSample(rec)"
                  >
                    {{ samplePlaying ? 'Playing…' : 'Play' }}
                  </button>
                  <button
                    type="button"
                    class="wizard-nav-btn next onboarding-use-voice-btn"
                    @click="useVoice(rec)"
                  >
                    Use this
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 8: All set -->
        <div class="wizard-step" :class="{ active: step === 8 }">
          <div class="wizard-step-content">
            <div class="wizard-step-header">
              <h2 class="wizard-step-title">You're all set</h2>
              <p class="wizard-step-description">
                Choose Dice game or Guided Mode on the next screen to start. You can reopen this intro from the menu later.
              </p>
            </div>
          </div>
        </div>
          </div>
        </div>

        <!-- Tour instructions bar: static right above Next/Back when on step 3 -->
        <div v-show="step === 3" class="tour-caption-bar">
          <span class="tour-caption-title">{{ tourSteps[tourSlide]?.title }}</span>
          <span class="tour-caption-desc">{{ tourSteps[tourSlide]?.description }}</span>
          <p v-if="tourSlide < tourSteps.length - 1" class="tour-caption-next">Next: {{ tourSteps[tourSlide + 1]?.title }}</p>
          <p v-else class="tour-caption-next">You'll choose a voice next, then you're all set.</p>
        </div>

        <div v-show="step > 1" class="wizard-navigation" :class="{ 'step-3-nav': step === 3 }">
          <button
            v-show="step > 1"
            type="button"
            class="wizard-nav-btn back"
            @click="goBack"
          >
            Back
          </button>
          <button
            v-if="step < totalSteps"
            type="button"
            class="wizard-nav-btn next"
            @click="goNext"
          >
            {{ step === 3 && tourSlide < lastTourSlide ? 'Next' : step === 3 && tourSlide === lastTourSlide ? 'Continue' : 'Next' }}
          </button>
          <button
            v-else
            type="button"
            class="wizard-nav-btn next"
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
import { useSpeech } from '@/composables/useSpeech'

const props = defineProps({
  show: { type: Boolean, default: true },
})

const emit = defineEmits(['complete'])

const profile = useProfileStore()
const prefs = usePreferencesStore()
const speech = useSpeech()
const totalSteps = 8
const step = ref(1)
const tourSlide = ref(0)
const wizardStepsBodyRef = ref(null)
const step2Ref = ref(null)
const tourPreviewMockAreaRef = ref(null)
const stepsBodyStyle = ref({})
const tourSteps = [
  { view: 'modes', title: 'Three modes', description: 'Between Us offers Dice game, Guided Mode, and (for some preferences) a preset guided sensate option.' },
  { view: 'landing', title: 'Main screen', description: "After setup you'll see this screen. Choose a mode to start." },
  { view: 'landing', landingHighlight: 'freeplay', title: 'Main screen', description: 'Choose Dice game to try roll-the-dice mode first.' },
  { view: 'freeplay', freeplayHighlight: 'mode', title: 'Dice game', description: "Clicking Dice game takes you here. Roll dice for a random experience—no time limit, no guided flow, just randomness." },
  { view: 'freeplay', freeplayHighlight: 'timer', title: 'Timer', description: 'Optional countdown: 30s, 1 min, 2 min, or 5 min. Use it to pace turns or phases.' },
  { view: 'freeplay', freeplayHighlight: 'rolls', title: 'Your rolls', description: 'Enter your dice numbers here: Location (1–20) and Action (1–20). In Phase 3 you\'ll also have Position and Modifier.' },
  { view: 'freeplay', freeplayHighlight: 'roll-for-me', title: 'Roll for me', description: 'Want the app to roll for you? Tap this and it will pick random numbers and show the result.' },
  { view: 'freeplay', freeplayHighlight: 'submit-numbers', title: 'Submit numbers', description: "When you've entered numbers (from dice or Roll for me), tap here to get your outcome." },
  { view: 'freeplay', freeplayHighlight: 'clothing', title: 'Clothing', description: 'Optional: roll for a clothing-removal prompt (how to undress) in the same phase.' },
  { view: 'freeplay', freeplayHighlight: 'output', title: 'Your result', description: 'The instructions for your roll appear here—where to go, what to do, and any clothing prompt.' },
  { view: 'freeplay', freeplayHighlight: 'read-aloud', title: 'Read aloud', description: 'Tap to hear the instructions read out loud with your chosen voice.' },
  { view: 'landing', landingHighlight: 'guided', title: 'Main screen', description: 'From the main screen, choose Guided Mode for timed, phased sessions.' },
  { view: 'guidedSetup', title: 'Guided setup (first screen)', description: 'Choosing Guided Mode opens this wizard first. Set partner names, phase distribution, total time, turn length, and options—then start your session.' },
  { view: 'guided', guidedHighlight: 'mode', title: 'After setup: session screen', description: 'Once you finish the wizard, your session looks like this. You can switch back to Dice game or start a new guided session from here.' },
  { view: 'guided', guidedHighlight: 'header', title: 'Phase and time', description: 'See the current phase (1–3), total time remaining, phase time remaining, and the current turn or action countdown.' },
  { view: 'guided', guidedHighlight: 'output', title: 'Current prompt', description: 'The instructions for this turn appear here—where to go, what to do, and any clothing or position prompt.' },
  { view: 'guided', guidedHighlight: 'partner', title: 'Turn order', description: 'Shows who is giving and who is receiving this turn (Partner 1 → Partner 2), or who leads in Phase 3.' },
  { view: 'guided', guidedHighlight: 'pause', title: 'Pause', description: 'Pause the timer anytime. Tap Resume to continue.' },
  { view: 'guided', guidedHighlight: 'skip', title: 'Skip to next turn', description: 'Skip the current turn and move to the next prompt without waiting for the timer.' },
  { view: 'guided', guidedHighlight: 'stop', title: 'Stop session', description: 'End the guided session. You can start a new one later or switch to Dice game.' },
]
const currentTourView = computed(() => tourSteps[tourSlide.value]?.view ?? 'modes')
const currentFreeplayHighlight = computed(() => tourSteps[tourSlide.value]?.freeplayHighlight ?? null)
const currentLandingHighlight = computed(() => tourSteps[tourSlide.value]?.landingHighlight ?? null)
const currentGuidedHighlight = computed(() => tourSteps[tourSlide.value]?.guidedHighlight ?? null)
const tourPopupPositionClass = computed(() => {
  const v = currentTourView.value
  const h = currentFreeplayHighlight.value
  const g = currentGuidedHighlight.value
  if (v === 'modes') return 'tour-popup--modes'
  if (v === 'landing') return 'tour-popup--landing'
  if (v === 'guidedSetup') return 'tour-popup--guided-setup'
  if (v === 'guided') return 'tour-popup--guided-' + (g || 'mode')
  return 'tour-popup--fp-' + (h || 'mode')
})
const displayName = ref(profile.displayName || '')
const preloadDone = ref(false)
const samplePlaying = ref(false)
const recommendedVoices = ref([])

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
const voiceLanguageOptions = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'any', label: 'Any' },
]
const voiceGenderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'any', label: 'Any' },
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

function startVoicePreload() {
  speech.preloadAllEngines({
    language: profile.voiceLanguagePreference,
    gender: profile.voiceGenderPreference,
  })
}

watch(step, (newStep, oldStep) => {
  if (newStep === 6 && oldStep === 5) applyQuestionnaire()
  // Start preloading voices from step 1 (first page) so they load during the tour
  if (newStep === 1) startVoicePreload()
  // When landing on voice setup (step 7), wait for preload (started at step 1) then show recommendations
  if (newStep === 7 && !preloadDone.value) {
    const opts = { language: profile.voiceLanguagePreference, gender: profile.voiceGenderPreference }
    const promise = speech.preloadAllEngines(opts)
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS))
    Promise.race([promise, timeoutPromise]).then(showRecommendations)
    promise.catch(showRecommendations)
  }
  // Size steps body to active step content so it doesn't scroll when content fits (step 2, etc.)
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

const lastTourSlide = tourSteps.length - 1

function skipTour() {
  step.value = 4
}

function goBack() {
  if (step.value === 3 && tourSlide.value > 0) {
    tourSlide.value--
  } else {
    step.value = Math.max(1, step.value - 1)
  }
}

function goNext() {
  if (step.value === 3 && tourSlide.value < lastTourSlide) {
    tourSlide.value++
  } else {
    if (step.value === 3) tourSlide.value = 0
    step.value++
  }
}

function scrollTourHighlightToCenter() {
  nextTick(() => {
    const area = tourPreviewMockAreaRef.value
    if (!area || step.value !== 3) return
    const candidates = area.querySelectorAll('.tour-mock-fill')
    const scrollContainer = [...candidates].find((el) => getComputedStyle(el).display !== 'none')
    if (!scrollContainer) return
    const highlight = scrollContainer.querySelector('.tour-highlight-active')
    const focusEl = scrollContainer.querySelector('[data-tour-focus]')
    const target = highlight || focusEl
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'nearest' })
    }
  })
}

watch([tourSlide, step], () => {
  if (step.value === 3) scrollTourHighlightToCenter()
})

const PRELOAD_TIMEOUT_MS = 45_000 // stop waiting after 45s and show recommendations anyway

function showRecommendations() {
  preloadDone.value = true
  recommendedVoices.value = speech.getRecommendedVoices(
    profile.voiceLanguagePreference,
    profile.voiceGenderPreference
  )
}

onMounted(() => {
  questionnaire.experience = prefs.promptDetailMode
  questionnaire.penetration = prefs.penetrationPreference
  questionnaire.anal = prefs.analPositionsEnabled
  questionnaire.toys = prefs.vibratorsPresent
  questionnaire.connectionWalls = profile.connectionWalls ? [...profile.connectionWalls] : []
  // Start voice preload as soon as the first page (step 1) is shown
  if (step.value === 1) startVoicePreload()
})

function skipPreload() {
  preloadDone.value = true
  recommendedVoices.value = speech.getRecommendedVoices(
    profile.voiceLanguagePreference,
    profile.voiceGenderPreference
  )
}

watch([() => step.value, preloadDone], () => {
  if ((step.value === 7 || step.value === 8) && preloadDone.value) {
    recommendedVoices.value = speech.getRecommendedVoices(
      profile.voiceLanguagePreference,
      profile.voiceGenderPreference
    )
  }
})

function playSample(rec) {
  if (samplePlaying.value) return
  const prevProvider = speech.ttsProvider.value
  const prevPiper = speech.piperVoiceId.value
  const prevKokoro = speech.kokoroVoiceId.value
  const prevUri = speech.selectedVoiceURI.value
  speech.ttsProvider.value = rec.provider
  if (rec.provider === 'piper') speech.piperVoiceId.value = rec.voiceId
  else if (rec.provider === 'kokoro') speech.kokoroVoiceId.value = rec.voiceId
  else if (rec.provider === 'browser') speech.selectedVoiceURI.value = rec.voiceId
  samplePlaying.value = true
  const sample = 'You can use this voice for prompts and read aloud.'
  speech.speak(sample, {
    force: true,
    onEnd: () => {
      samplePlaying.value = false
      speech.ttsProvider.value = prevProvider
      speech.piperVoiceId.value = prevPiper
      speech.kokoroVoiceId.value = prevKokoro
      speech.selectedVoiceURI.value = prevUri
    },
  })
}

function useVoice(rec) {
  speech.ttsProvider.value = rec.provider
  if (rec.provider === 'piper') speech.piperVoiceId.value = rec.voiceId
  else if (rec.provider === 'kokoro') speech.kokoroVoiceId.value = rec.voiceId
  else if (rec.provider === 'browser') speech.selectedVoiceURI.value = rec.voiceId
  speech.voiceEnabled.value = true
}

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
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  text-align: center;
  animation: fullscreen-welcome-card-in 0.6s ease-out forwards;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-title {
  font-family: var(--font-handwritten-title);
  margin: 0 0 0.5rem;
  font-size: 1.35rem;
  font-weight: 400;
  color: #f8fafc;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-title-line2 {
  display: block;
  font-size: 2rem;
  margin-top: 0.15rem;
  font-weight: 700;
  background: linear-gradient(to right, #60a5fa, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
}
.onboarding-modal .wizard-step-fullscreen-welcome .fullscreen-welcome-desc {
  font-family: var(--font-handwritten-body);
  margin: 0;
  font-size: 1rem;
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
  padding-bottom: 0;
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

/* Tour step: fill step area so preview and content are visible */
.onboarding-modal .wizard-step-tour .wizard-step-content {
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;
  height: 100%;
}
/* Tour: full-screen; flex column so caption bar is in-flow and does not overlap mock */
.onboarding-tour-preview {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.tour-preview-mock-area {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
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
  font-size: 1.2rem;
  font-weight: 700;
  color: #e5e7eb;
  margin: 0 0 0.35rem;
  line-height: 1.3;
}
.tour-setup-mock .wizard-step-description {
  display: block;
  font-size: 0.9rem;
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
  font-size: 1.05rem;
  font-weight: 400;
  color: #f1f5f9;
  display: block;
  margin-bottom: 0.1rem;
  line-height: 1.25;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
}
.tour-caption-desc {
  font-family: var(--font-handwritten-body);
  font-size: 0.8rem;
  color: #e2e8f0;
  line-height: 1.3;
  display: block;
  margin-bottom: 0.35rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.tour-caption-next {
  font-family: var(--font-handwritten-body);
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.3;
}
.tour-mock-fill.onboarding-tour-modes-overview .tour-mode-card {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
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
.tour-mock-fill.onboarding-tour-ui-guided .guided-header { margin-bottom: 0.25rem; }
.tour-mock-fill.onboarding-tour-ui-guided .guided-block { padding: 0.5rem; }
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
  background: rgba(15, 23, 42, 0.85);
  border: 2px solid rgba(148, 163, 184, 0.4);
  border-radius: 0.85rem;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
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
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-handwritten-title);
  background: linear-gradient(to right, #60a5fa, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.tour-landing-subtitle { margin: 0 0 1rem; font-size: 0.9rem; color: #9ca3af; }
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

/* Exact copy of Guided Mode UI (same structure/classes as App + GuidedModeView) */
.onboarding-tour-ui-guided .guided-mode-view { padding: 0; width: 100%; max-width: 100%; }
.onboarding-tour-ui-guided .guided-header { gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0; }
.onboarding-tour-ui-guided .guided-header .phase-display { font-size: 1.25rem; font-weight: 700; }
.onboarding-tour-ui-guided .time-display { font-size: 0.9rem; color: #9ca3af; }
.onboarding-tour-ui-guided .action-label { font-size: 0.9rem; color: #a855f7; }
.onboarding-tour-ui-guided .guided-block { padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #334155; background: rgba(2,6,23,0.5); }
.onboarding-tour-ui-guided .output-line { margin-bottom: 0.35rem; }
.onboarding-tour-ui-guided .output-line:last-of-type { margin-bottom: 0; }
.onboarding-tour-ui-guided .partner-label { font-size: 1rem; color: #a855f7; margin: 0; text-align: center; }
.onboarding-tour-ui-guided .guided-controls { gap: 0.5rem; margin: 0; min-height: 44px; }
.onboarding-tour-ui-guided .guided-controls button { min-height: 44px; }

button.tour-highlight-active { border-radius: 0.5rem; }
.play-mode-row.tour-highlight-active,
.timer-bar.tour-timer-mock.tour-highlight-active,
.roll-block.tour-highlight-active,
.output-block.tour-highlight-active,
.guided-header.tour-highlight-active,
.guided-block.tour-highlight-active,
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

.onboarding-preload-status { margin-top: 1rem; text-align: center; }
.onboarding-preload-text { color: #9ca3af; font-size: 0.95rem; margin-bottom: 0.5rem; }
.onboarding-preload-hint { color: #6b7280; font-size: 0.85rem; margin-bottom: 1rem; max-width: 320px; margin-left: auto; margin-right: auto; }
.onboarding-voice-try-all-hint { color: #6b7280; font-size: 0.85rem; margin-bottom: 0.75rem; }
.onboarding-skip-preload { margin-top: 1rem; }
.onboarding-spinner {
  width: 2.5rem; height: 2.5rem; margin: 0 auto; border: 3px solid #334155; border-top-color: #60a5fa;
  border-radius: 50%; animation: onboarding-spin 0.8s linear infinite;
}
@keyframes onboarding-spin { to { transform: rotate(360deg); } }

.onboarding-recommended-voices { margin-top: 1rem; text-align: left; }
.onboarding-voice-row {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
  padding: 0.6rem 0; border-bottom: 1px solid #334155;
}
.onboarding-voice-row:last-child { border-bottom: none; }
.onboarding-voice-name { font-size: 0.95rem; color: #e5e7eb; flex: 1 1 140px; }
.onboarding-voice-actions { display: flex; gap: 0.5rem; align-items: center; }
.onboarding-use-voice-btn { flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.9rem; }

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
