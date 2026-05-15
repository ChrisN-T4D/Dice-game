<template>
  <div class="app-root" :class="{ 'page-hidden': !pageVisible }">
    <!-- Admin page (hash #admin) -->
    <AdminView v-if="showAdmin" />
    <template v-else>
    <OnboardingWizard
      :show="showOnboarding"
      @complete="onOnboardingComplete"
      @tour-preview="onTourPreview"
    />
    <LandingModal
      :show="showLandingAfterOnboarding"
      :suggested-mode="profile.suggestedFirstMode"
      @choose="onChooseMode"
    />

    <div v-show="showMainContent" class="page" :class="{ 'page-bg-fiery-heart': prefs?.backgroundImage === '1', 'guided-mode': session.uiMode === 'guided' || session.uiMode === 'sensate' }">
      <AppMenuSidebar
        :open="appMenuOpen"
        :current-mode="session.uiMode"
        @close="appMenuOpen = false"
        @home="onAppMenuHome"
        @go-freeplay="onAppMenuGoFreePlay"
        @go-guided="onAppMenuGoGuided"
        @go-sensate="onAppMenuGoSensate"
        @open-preferences="onAppMenuOpenPreferences"
      />
      <PreferencesSidebar
        v-if="preferencesOpen"
        :open="preferencesOpen"
        @close="preferencesOpen = false"
        @show-onboarding="openOnboardingAgain"
        @show-favorites="openFavoritesModal"
      />
      <FavoritesModal />

      <!-- Card 1: Header -->
      <div class="card card-header-panel">
        <button type="button" class="hamburger-menu-btn" title="Open menu" aria-label="Open menu" @click="appMenuOpen = true">☰</button>
        <h1 role="button" tabindex="0" class="card-header-title" title="Between Us" @click="onTitleClick" @keydown.enter.space.prevent="onTitleClick">Between Us</h1>
        <button type="button" class="play-mode-in-header" :aria-expanded="playModeExpanded" aria-controls="play-mode-options" :aria-label="playModeExpanded ? 'Collapse play mode' : 'Expand play mode'" @click="playModeExpanded = !playModeExpanded">
          <span class="play-mode-in-header-label">{{
            session.uiMode === 'freeplay'
              ? 'Dice game'
              : session.uiMode === 'guided'
                ? 'Guided mode'
                : session.uiMode === 'sensate'
                  ? 'Sensate-style sessions'
                  : 'Choose mode'
          }}</span>
          <span class="play-mode-in-header-chevron" aria-hidden="true">{{ playModeExpanded ? '▲' : '▼' }}</span>
        </button>
        <div v-show="playModeExpanded" id="play-mode-options" class="play-mode-row" role="region" aria-label="Play mode options">
          <div class="row">
            <button type="button" class="secondary" :class="{ 'preset-selected': session.uiMode === 'freeplay' }" @click="onFreePlayModeClick">Dice game</button>
            <button type="button" class="secondary" :class="{ 'preset-selected': session.uiMode === 'guided' }" @click="onGuidedModeClick">Guided mode</button>
            <button type="button" class="secondary" :class="{ 'preset-selected': session.uiMode === 'sensate' }" @click="onSensateModeClick">Sensate-style</button>
          </div>
        </div>
      </div>

      <!-- Card 1b: Step bar (portal target: wizard teleports its progress bar here, hidden when empty) -->
      <div id="step-bar-portal" class="card card-step-bar-panel"></div>

      <!-- Card 2: Main content (scrollable, fills remaining space) -->
      <div class="card card-content-panel">
        <template v-if="session.uiMode === 'freeplay'">
          <div class="toolbar-row">
            <button type="button" class="secondary small" @click="goToNextPhase" :disabled="session.phase >= session.maxPhase">Next phase</button>
            <button type="button" class="secondary small" @click="session.showLandingModal()">New session</button>
            <button type="button" class="secondary small" @click="summaryOpen = true">Summary</button>
            <TimerBar />
          </div>
          <FreePlayView />
          <SummaryOverlay :open="summaryOpen" @close="summaryOpen = false" />
        </template>
        <GuidedModeView v-else-if="session.uiMode === 'guided' || session.uiMode === 'sensate'" />
        <div v-else class="choose-mode-stack">
          <SessionDisplaySleepTip />
          <p class="choose-mode-prompt">
            Choose <strong>Dice game</strong>, <strong>Guided mode</strong> (dice-based setup), or <strong>Sensate-style</strong> above to start.
          </p>
        </div>
      </div>

      <!-- Card 3: Bottom navigation (portal target: components teleport their nav here) -->
      <div id="bottom-nav-portal" class="card card-nav-panel"></div>
    </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Root shell: admin hash, onboarding → landing → main. Game views do not receive props from here;
 * they use Pinia (session, guided, preferences, …). See docs/UI-AND-STATE-FLOW.md for navigation,
 * store ownership, and Teleport targets (#step-bar-portal, #bottom-nav-portal).
 */
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent, h } from 'vue'

import { useSessionStore } from '@/stores/session'
import { usePreferencesStore } from '@/stores/preferences'
import { useProfileStore } from '@/stores/profile'
import { useGuidedStore } from '@/stores/guided'
import { useFavoritesStore } from '@/stores/favorites'
import { loadState, saveState } from '@/utils/persistence'
import { useBackgroundMusic } from '@/composables/useBackgroundMusic'
import { useAppBodyClasses } from '@/composables/useAppBodyClasses'
import { useDebouncedAppPersistence } from '@/composables/useDebouncedAppPersistence'
import LandingModal from '@/components/LandingModal.vue'
import OnboardingWizard from '@/components/OnboardingWizard.vue'
import SessionDisplaySleepTip from '@/components/SessionDisplaySleepTip.vue'
import AppMenuSidebar from '@/components/AppMenuSidebar.vue'
import FavoritesModal from '@/components/FavoritesModal.vue'
import TimerBar from '@/components/TimerBar.vue'
import SummaryOverlay from '@/components/SummaryOverlay.vue'
const AdminView = defineAsyncComponent(() => import('@/views/AdminView.vue'))

const asyncViewLoading = {
  name: 'AsyncViewLoading',
  render() {
    return h('p', {
      class: 'async-chunk-fallback',
      role: 'status',
    }, 'Loading this screen…')
  },
}

const FreePlayView = defineAsyncComponent({
  loader: () => import('@/components/FreePlayView.vue'),
  loadingComponent: asyncViewLoading,
  delay: 150,
  timeout: 120000,
})

const GuidedModeView = defineAsyncComponent({
  loader: () => import('@/components/GuidedModeView.vue'),
  loadingComponent: asyncViewLoading,
  delay: 150,
  timeout: 120000,
})

const PreferencesSidebar = defineAsyncComponent({
  loader: () => import('@/components/PreferencesSidebar.vue'),
  loadingComponent: asyncViewLoading,
  delay: 50,
  timeout: 120000,
})

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
const tourPreviewMode = ref(null) // 'freeplay' | 'guided' | 'sensate' | null – when set, show main UI during tour step 3
const showMainContent = computed(
  () => (profile.onboardingComplete && !showOnboardingAgain.value && !session.showLanding) || tourPreviewMode.value !== null
)
function onTourPreview(mode) {
  tourPreviewMode.value = mode
  if (mode) {
    session.$patch({
      uiMode: mode,
      isGuidedMode: mode === 'guided' || mode === 'sensate',
    })
  }
}

function onOnboardingComplete() {
  tourPreviewMode.value = null
  profile.completeOnboarding()
  showOnboardingAgain.value = false
  session.showLandingModal() // Show landing page so user can choose Dice game or Guided Mode
}

function openOnboardingAgain() {
  preferencesOpen.value = false
  appMenuOpen.value = false
  showOnboardingAgain.value = true
}

function openFavoritesModal() {
  preferencesOpen.value = false
  appMenuOpen.value = false
  favoritesStore.openModal()
}

function updateShowAdmin() {
  showAdmin.value = window.location.hash === '#admin'
}
const appMenuOpen = ref(false)
const preferencesOpen = ref(false)
const playModeExpanded = ref(false)

watch(preferencesOpen, (open) => {
  if (open) appMenuOpen.value = false
})
watch(appMenuOpen, (open) => {
  if (open) preferencesOpen.value = false
})
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

const { updateBodyClass } = useAppBodyClasses({ session, prefs, showAdmin, showMainContent })
useDebouncedAppPersistence(session, prefs, guided, saveState)

function onChooseMode(mode) {
  session.startSession(mode)
  if (mode === 'freeplay') {
    session.setPhase(1)
    session.setRollCount(0)
  }
}

function onFreePlayModeClick() {
  session.$patch({ uiMode: 'freeplay', isGuidedMode: false })
}

function onGuidedModeClick() {
  if (guided.sessionComplete) guided.resetAfterSessionComplete()
  session.$patch({ uiMode: 'guided', isGuidedMode: true })
}

function onSensateModeClick() {
  if (guided.sessionComplete) guided.resetAfterSessionComplete()
  session.$patch({ uiMode: 'sensate', isGuidedMode: true })
}

function closeAppMenuAndCollapsePlayMode() {
  appMenuOpen.value = false
  playModeExpanded.value = false
}

function onAppMenuHome() {
  closeAppMenuAndCollapsePlayMode()
  session.showLandingModal()
}

function onAppMenuGoFreePlay() {
  closeAppMenuAndCollapsePlayMode()
  onFreePlayModeClick()
}

function onAppMenuGoGuided() {
  closeAppMenuAndCollapsePlayMode()
  onGuidedModeClick()
}

function onAppMenuGoSensate() {
  closeAppMenuAndCollapsePlayMode()
  onSensateModeClick()
}

function onAppMenuOpenPreferences() {
  appMenuOpen.value = false
  playModeExpanded.value = false
  preferencesOpen.value = true
}

function goToNextPhase() {
  if (session.advancePhase()) {
    // could flash phase change
  }
}

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
  void import('@/composables/useSpeech')
    .then((m) => {
      m.useSpeech().syncVoiceFromStorage()
    })
    .catch(() => {})
})
onUnmounted(() => {
  window.removeEventListener('hashchange', updateShowAdmin)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.app-root { min-height: 100vh; }
.async-chunk-fallback {
  margin: 0;
  padding: 1.25rem 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.95rem;
}
.choose-mode-stack {
  max-width: 28rem;
  margin: 0 auto;
  width: 100%;
}
.choose-mode-prompt { margin: 0; color: #9ca3af; font-size: 0.95rem; text-align: center; }

/* Header card: grid layout without the old card-header wrapper */
.card-header-panel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  row-gap: 0.5rem;
}
.card-header-panel .play-mode-row {
  grid-column: 1 / -1;
}
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

</style>
