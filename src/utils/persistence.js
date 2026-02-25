/**
 * Load/save app state to localStorage key intimacyGameState (same as legacy).
 * Hydrates session, preferences, and guided stores so refresh keeps the same turn spot.
 */
const STORAGE_KEY = 'intimacyGameState'

// -----------------------------------------------------------------------------
// Load state (called on app mount)
// -----------------------------------------------------------------------------
export function loadState(sessionStore, preferencesStore, guidedStore) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return false
    const state = JSON.parse(saved)
    if (typeof state !== 'object' || state === null) return false

    if (Number.isInteger(state.phase) && state.phase >= 1 && state.phase <= 3) {
      sessionStore.setPhase(state.phase)
    }
    if (typeof state.rollCount === 'number' && state.rollCount >= 0) {
      sessionStore.setRollCount(state.rollCount)
    }
    if (state.uiMode === 'guided' || state.uiMode === 'freeplay') {
      sessionStore.uiMode = state.uiMode
      sessionStore.isGuidedMode = state.uiMode === 'guided'
    }
    if (state.uiMode === 'guided' && state.guided && guidedStore) {
      guidedStore.hydrateFromSaved(state.guided)
    }

    if (state.promptDetailMode && ['beginner', 'regular', 'expert'].includes(state.promptDetailMode)) {
      preferencesStore.setPromptDetail(state.promptDetailMode)
    }
    if (state.penetrationPreference && ['prefer', 'minimal'].includes(state.penetrationPreference)) {
      preferencesStore.setPenetration(state.penetrationPreference)
    }
    if (state.backgroundImage) {
      preferencesStore.setBackgroundImage(state.backgroundImage)
    }
    if (state.backgroundMusic != null) {
      preferencesStore.$patch({ backgroundMusic: state.backgroundMusic })
    }
    if (typeof state.backgroundMusicVolume === 'number' && state.backgroundMusicVolume >= 0 && state.backgroundMusicVolume <= 100) {
      preferencesStore.$patch({ backgroundMusicVolume: state.backgroundMusicVolume })
    }
    if (typeof state.voiceEnabled === 'boolean') {
      preferencesStore.$patch({ voiceEnabled: state.voiceEnabled })
      try { localStorage.setItem('voiceEnabled', state.voiceEnabled ? 'true' : 'false') } catch (_) {}
    }
    if (typeof state.voiceSpeed === 'number') {
      preferencesStore.$patch({ voiceSpeed: state.voiceSpeed })
      try { localStorage.setItem('voiceRate', String(state.voiceSpeed)) } catch (_) {}
    }
    if (state.partnerName1 != null) preferencesStore.$patch({ partnerName1: state.partnerName1 })
    if (state.partnerName2 != null) preferencesStore.$patch({ partnerName2: state.partnerName2 })
    if (state.partnerColor1) preferencesStore.$patch({ partnerColor1: state.partnerColor1 })
    if (state.partnerColor2) preferencesStore.$patch({ partnerColor2: state.partnerColor2 })
    if (state.partnerAnatomy1) preferencesStore.$patch({ partnerAnatomy1: state.partnerAnatomy1 })
    if (state.partnerAnatomy2) preferencesStore.$patch({ partnerAnatomy2: state.partnerAnatomy2 })

    const hasProgress =
      state.rollCount > 0 ||
      (state.phase && state.phase > 1) ||
      sessionStore.uiMode

    // Show landing only when there's no progress; if there is progress, go straight to main content.
    if (hasProgress) {
      sessionStore.showLanding = false
    }

    if (!hasProgress) return false
    return true
  } catch (_) {
    return false
  }
}

// -----------------------------------------------------------------------------
// Save state (debounced on store changes)
// -----------------------------------------------------------------------------
export function saveState(sessionStore, preferencesStore, guidedStore) {
  try {
    const state = {
      phase: sessionStore.phase,
      rollCount: sessionStore.rollCount,
      uiMode: sessionStore.uiMode,
      isGuidedMode: sessionStore.isGuidedMode,
      showLanding: sessionStore.showLanding,
      promptDetailMode: preferencesStore.promptDetailMode,
      penetrationPreference: preferencesStore.penetrationPreference,
      backgroundImage: preferencesStore.backgroundImage,
      backgroundMusic: preferencesStore.backgroundMusic,
      backgroundMusicVolume: preferencesStore.backgroundMusicVolume,
      partnerName1: preferencesStore.partnerName1,
      partnerName2: preferencesStore.partnerName2,
      partnerColor1: preferencesStore.partnerColor1,
      partnerColor2: preferencesStore.partnerColor2,
      partnerAnatomy1: preferencesStore.partnerAnatomy1,
      partnerAnatomy2: preferencesStore.partnerAnatomy2,
      voiceEnabled: preferencesStore.voiceEnabled,
      voiceSpeed: preferencesStore.voiceSpeed,
      lastSaveTime: Date.now(),
    }
    if (guidedStore?.isActive && guidedStore.persistenceSnapshot) {
      state.guided = guidedStore.persistenceSnapshot
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_) {}
}
