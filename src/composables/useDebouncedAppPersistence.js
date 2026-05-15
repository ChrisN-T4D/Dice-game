import { watch } from 'vue'

/** Debounced save of session, preferences, and guided snapshot (see utils/persistence). */
export function useDebouncedAppPersistence(session, prefs, guided, saveStateFn, delayMs = 500) {
  let saveTimeout = null
  function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveStateFn(session, prefs, guided)
      saveTimeout = null
    }, delayMs)
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
      () => (guided.isActive ? JSON.stringify(guided.persistenceSnapshot) : null),
    ],
    scheduleSave
  )
}
