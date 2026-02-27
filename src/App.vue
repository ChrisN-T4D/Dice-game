<template>
  <div class="app-root" :class="{ 'page-hidden': !pageVisible }">
    <!-- Admin page (hash #admin) -->
    <AdminView v-if="showAdmin" />
    <template v-else>
    <OnboardingWizard
      :show="showOnboarding"
      @complete="onOnboardingComplete"
    />
    <LandingModal
      :show="showLandingAfterOnboarding"
      :suggested-mode="profile.suggestedFirstMode"
      @choose="onChooseMode"
    />

    <div v-show="showMainContent" class="page">
      <div class="card" :class="{ 'card-bg-fiery-heart': prefs?.backgroundImage === '1' }">
        <header class="card-header">
          <button
            type="button"
            class="hamburger-menu-btn"
            title="Open preferences"
            aria-label="Open preferences"
            @click="preferencesOpen = true"
          >
            ☰
          </button>
          <h1
            role="button"
            tabindex="0"
            class="card-header-title"
            title="Between Us"
            @click="onTitleClick"
            @keydown.enter.space.prevent="onTitleClick"
          >
            Between Us
          </h1>
          <button
            type="button"
            class="play-mode-in-header"
            :aria-expanded="playModeExpanded"
            aria-controls="play-mode-options"
            :aria-label="playModeExpanded ? 'Collapse play mode' : 'Expand play mode'"
            @click="playModeExpanded = !playModeExpanded"
          >
            <span class="play-mode-in-header-label">{{ session.uiMode === 'freeplay' ? 'Dice game' : session.uiMode === 'guided' ? 'Guided Mode' : 'Choose mode' }}</span>
            <span class="play-mode-in-header-chevron" aria-hidden="true">{{ playModeExpanded ? '▲' : '▼' }}</span>
          </button>
        </header>

        <PreferencesSidebar
          :open="preferencesOpen"
          @close="preferencesOpen = false"
          @show-onboarding="openOnboardingAgain"
          @show-favorites="openFavoritesModal"
        />
        <FavoritesModal />

        <div
          v-show="playModeExpanded"
          id="play-mode-options"
          class="play-mode-row"
          role="region"
          aria-label="Play mode options"
        >
          <div class="row">
            <button
              type="button"
              class="secondary"
              :class="{ 'preset-selected': session.uiMode === 'freeplay' }"
              @click="session.uiMode = 'freeplay'"
            >
              Dice game
            </button>
            <button
              type="button"
              class="secondary"
              :class="{ 'preset-selected': session.uiMode === 'guided' }"
              @click="session.uiMode = 'guided'"
            >
              Guided Mode
            </button>
          </div>
        </div>

        <div v-if="session.uiMode === 'freeplay'" class="main-content">
            <div class="toolbar-row">
              <button type="button" class="secondary small" @click="goToNextPhase" :disabled="session.phase >= session.maxPhase">
                Next phase
              </button>
              <button type="button" class="secondary small" @click="session.showLandingModal()">
                New session
              </button>
              <button type="button" class="secondary small" @click="summaryOpen = true">
                Summary
              </button>
              <TimerBar />
            </div>
            <FreePlayView />
            <SummaryOverlay :open="summaryOpen" @close="summaryOpen = false" />
          </div>

          <div v-else-if="session.uiMode === 'guided'" class="main-content">
            <GuidedModeView />
          </div>

          <div v-else class="main-content">
            <p class="choose-mode-prompt">Choose <strong>Dice game</strong> or <strong>Guided Mode</strong> above to start.</p>
          </div>
      </div>
    </div>
    </template>
    <div class="app-version" aria-hidden="true">v{{ appVersion }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'

function isMobileOrTouch() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 768px)').matches
}
import { useSessionStore } from '@/stores/session'
import { usePreferencesStore } from '@/stores/preferences'
import { useProfileStore } from '@/stores/profile'
import { useGuidedStore } from '@/stores/guided'
import { useFavoritesStore } from '@/stores/favorites'
import { useSpeech } from '@/composables/useSpeech'
import { loadState, saveState } from '@/utils/persistence'
import { whenIdle } from '@/utils/whenIdle'
import { useBackgroundMusic } from '@/composables/useBackgroundMusic'
import LandingModal from '@/components/LandingModal.vue'
import OnboardingWizard from '@/components/OnboardingWizard.vue'
import PreferencesSidebar from '@/components/PreferencesSidebar.vue'
import GuidedModeView from '@/components/GuidedModeView.vue'
import FavoritesModal from '@/components/FavoritesModal.vue'
import TimerBar from '@/components/TimerBar.vue'
import SummaryOverlay from '@/components/SummaryOverlay.vue'
const AdminView = defineAsyncComponent(() => import('@/views/AdminView.vue'))

/** Injected at build time from package.json version */
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
const FreePlayView = defineAsyncComponent(() => import('@/components/FreePlayView.vue'))

const session = useSessionStore()
const profile = useProfileStore()
const prefs = usePreferencesStore()
const guided = useGuidedStore()
const favoritesStore = useFavoritesStore()
const { play: playBackgroundMusic, stop: stopBackgroundMusic } = useBackgroundMusic(prefs)
prefs.setPlayBackgroundMusic(playBackgroundMusic)
prefs.setStopBackgroundMusic(stopBackgroundMusic)

const showAdmin = ref(false)
const showOnboardingAgain = ref(false)

const showOnboarding = computed(() => !profile.onboardingComplete || showOnboardingAgain.value)
const showLandingAfterOnboarding = computed(
  () => profile.onboardingComplete && !showOnboardingAgain.value && session.showLanding
)
const showMainContent = computed(
  () => profile.onboardingComplete && !showOnboardingAgain.value && !session.showLanding
)

function onOnboardingComplete() {
  profile.completeOnboarding()
  showOnboardingAgain.value = false
  session.showLandingModal() // Show landing page so user can choose Dice game or Guided Mode
}

function openOnboardingAgain() {
  preferencesOpen.value = false
  showOnboardingAgain.value = true
}

function openFavoritesModal() {
  preferencesOpen.value = false
  favoritesStore.openModal()
}

function updateShowAdmin() {
  showAdmin.value = window.location.hash === '#admin'
}
const preferencesOpen = ref(false)
const playModeExpanded = ref(false)
let titleClickCount = 0
let titleClickResetTimer = null
function onTitleClick() {
  titleClickCount++
  if (titleClickResetTimer) clearTimeout(titleClickResetTimer)
  if (titleClickCount >= 3) {
    titleClickCount = 0
    window.location.hash = '#admin'
  } else {
    titleClickResetTimer = setTimeout(() => { titleClickCount = 0; titleClickResetTimer = null }, 1500)
  }
}
const summaryOpen = ref(false)
const pageVisible = ref(typeof document !== 'undefined' ? !document.hidden : true)

function onChooseMode(mode) {
  session.startSession(mode)
  if (mode === 'freeplay') {
    session.setPhase(1)
    session.setRollCount(0)
  }
}

function goToNextPhase() {
  if (session.advancePhase()) {
    // could flash phase change
  }
}

function updateBodyClass() {
  document.body.classList.remove('phase-1', 'phase-2', 'phase-3', 'bg-image-1', 'bg-image-2')
  document.body.classList.add(`phase-${session.phase}`)
  if (prefs.backgroundImage !== 'none') document.body.classList.add(`bg-image-${prefs.backgroundImage}`)
}

watch([() => session.phase, () => prefs.backgroundImage], updateBodyClass, { immediate: true })
watch(showAdmin, (isAdmin) => {
  document.body.classList.toggle('admin-open', isAdmin)
}, { immediate: true })
watch(
  () => !showAdmin.value && showMainContent.value,
  (mainVisible) => {
    document.body.classList.toggle('app-main-visible', mainVisible)
  },
  { immediate: true }
)

let saveTimeout = null
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveState(session, prefs, guided)
    saveTimeout = null
  }, 500)
}
watch(
  [
    () => session.phase,
    () => session.rollCount,
    () => session.uiMode,
    () => session.showLanding,
    () => prefs.promptDetailMode,
    () => prefs.penetrationPreference,
    () => prefs.backgroundImage,
    () => prefs.partnerName1,
    () => prefs.partnerName2,
    () => prefs.voiceEnabled,
    () => prefs.voiceSpeed,
    () => (guided.isActive ? guided.persistenceSnapshot : null),
  ],
  scheduleSave,
  { deep: true }
)

function onVisibility() {
  pageVisible.value = !document.hidden
}
onMounted(() => {
  updateShowAdmin()
  window.addEventListener('hashchange', updateShowAdmin)
  document.addEventListener('visibilitychange', onVisibility)
  pageVisible.value = !document.hidden
  updateBodyClass()
  profile.load()
  loadState(session, prefs, guided)
  // Preload Kokoro once when they enter the app (worker downloads and caches; no second download later).
  const speech = useSpeech()
  const runPreload = () => {
    speech.preloadAllEngines({
      language: profile.voiceLanguagePreference,
      gender: profile.voiceGenderPreference,
    })
  }
  if (isMobileOrTouch()) {
    whenIdle(runPreload, { timeout: 4000 })
  } else {
    runPreload()
  }
})
onUnmounted(() => {
  window.removeEventListener('hashchange', updateShowAdmin)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.app-root { min-height: 100vh; }
.main-content { padding: 0.25rem 0; }
.choose-mode-prompt { margin: 0; color: #9ca3af; font-size: 0.95rem; text-align: center; }
.card-header-title {
  cursor: pointer;
  border: none;
  padding: 0;
  text-align: center;
  outline: none;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-handwritten-title);
  background: linear-gradient(to right, #60a5fa, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.card-header-title:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.6);
  outline-offset: 4px;
  border-radius: 4px;
}

/* Play mode collapsed into header: toggle lives in header, options row below when expanded */
.play-mode-in-header {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.6rem;
  margin: 0;
  background: rgba(2, 6, 23, 0.95);
  border: 1px solid #475569;
  border-radius: 0.5rem;
  color: inherit;
  font: inherit;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.play-mode-in-header:hover {
  background: rgba(2, 6, 23, 1);
}
.play-mode-in-header:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.6);
  outline-offset: 2px;
}
.play-mode-in-header-label {
  color: #94a3b8;
  font-weight: 600;
}
.play-mode-in-header-chevron {
  font-size: 0.7rem;
  opacity: 0.85;
}
.play-mode-row .row {
  justify-content: center;
}

.app-version {
  position: fixed;
  bottom: 0;
  left: 0;
  font-size: 0.7rem;
  color: #64748b;
  padding: 0.2rem 0.5rem;
  z-index: 10001;
  pointer-events: none;
}
</style>
