import { defineStore } from 'pinia'

const PROFILE_KEY = 'discoveringBetweenUsProfile'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return typeof data === 'object' && data !== null ? data : null
  } catch (_) {
    return null
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
  } catch (_) {}
}

function persist(store) {
  saveToStorage({
    onboardingComplete: store.onboardingComplete,
    displayName: store.displayName,
    voiceLanguagePreference: store.voiceLanguagePreference,
    voiceGenderPreference: store.voiceGenderPreference,
    suggestedFirstMode: store.suggestedFirstMode,
    connectionWalls: store.connectionWalls,
  })
}

export const useProfileStore = defineStore('profile', {
  state: () => {
    const saved = loadFromStorage()
    return {
      onboardingComplete: saved?.onboardingComplete ?? false,
      displayName: saved?.displayName ?? '',
      voiceLanguagePreference: saved?.voiceLanguagePreference ?? 'en-US',
      voiceGenderPreference: saved?.voiceGenderPreference ?? 'any',
      suggestedFirstMode: saved?.suggestedFirstMode ?? null, // 'guided' | 'sensate' | 'freeplay' | null
    connectionWalls: Array.isArray(saved?.connectionWalls) ? saved.connectionWalls : [], // e.g. ['anxieties', 'cant_relax']
    }
  },
  actions: {
    completeOnboarding() {
      this.onboardingComplete = true
      persist(this)
    },
    setDisplayName(name) {
      this.displayName = typeof name === 'string' ? name.trim() : ''
      persist(this)
    },
    setVoicePreferences({ language, gender }) {
      if (['en-US', 'en-GB', 'any'].includes(language)) this.voiceLanguagePreference = language
      if (['female', 'male', 'any'].includes(gender)) this.voiceGenderPreference = gender
      persist(this)
    },
    setSuggestedFirstMode(mode) {
      this.suggestedFirstMode =
        mode === 'guided' || mode === 'sensate' || mode === 'freeplay' ? mode : null
      persist(this)
    },
    setConnectionWalls(walls) {
      this.connectionWalls = Array.isArray(walls) ? walls.filter((w) => typeof w === 'string') : []
      persist(this)
    },
    load() {
      const saved = loadFromStorage()
      if (saved) {
        this.onboardingComplete = !!saved.onboardingComplete
        this.displayName = typeof saved.displayName === 'string' ? saved.displayName : ''
        if (['en-US', 'en-GB', 'any'].includes(saved.voiceLanguagePreference)) this.voiceLanguagePreference = saved.voiceLanguagePreference
        if (['female', 'male', 'any'].includes(saved.voiceGenderPreference)) this.voiceGenderPreference = saved.voiceGenderPreference
        if (
          saved.suggestedFirstMode === 'guided' ||
          saved.suggestedFirstMode === 'sensate' ||
          saved.suggestedFirstMode === 'freeplay'
        ) {
          this.suggestedFirstMode = saved.suggestedFirstMode
        }
        if (Array.isArray(saved.connectionWalls)) this.connectionWalls = saved.connectionWalls.filter((w) => typeof w === 'string')
      }
    },
  },
})
