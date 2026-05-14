import { defineStore } from 'pinia'

const BODY_KEYS = ['feet', 'licking', 'nipples', 'genitals', 'buttocks', 'perineum']

function defaultExclude() {
  return Object.fromEntries(BODY_KEYS.map((k) => [k, false]))
}

export const usePreferencesStore = defineStore('preferences', {
  state: () => ({
    promptDetailMode: 'regular', // 'beginner' | 'regular' | 'expert'
    penetrationPreference: 'prefer', // 'prefer' | 'minimal'
    backgroundImage: '1', // 'none' | '1' (Fiery hearts) | '2' (Triangles)
    backgroundMusic: 'none',
    backgroundMusicVolume: 50,
    backgroundMusicPlaying: false,
    excludeWhenTouching: defaultExclude(),
    excludeWhenTouched: defaultExclude(),
    analPositionsEnabled: true,
    phase3EnabledGroupIds: null,
    phase3DoubleTime: false,
    vibratorsPresent: true,
    guidedPhaseCheckInEnabled: false,
    voiceEnabled: true,
    voiceSpeed: 1,
    partnerName1: '',
    partnerName2: '',
    partnerColor1: '#3b82f6',
    partnerColor2: '#ec4899',
    partnerAnatomy1: 'penis',
    partnerAnatomy2: 'vulva',
    positionIntensity: 'more_physical', // 'bed_only' | 'more_physical'
  }),
  getters: {
    promptDetailLabel() {
      const l = { beginner: 'Beginner', regular: 'Regular', expert: 'Expert' }
      return l[this.promptDetailMode] || 'Regular'
    },
    penetrationLabel() {
      return this.penetrationPreference === 'minimal' ? 'Minimal penetration' : 'Prefer penetration'
    },
    partnerName() {
      return (num) => (num === 1 ? (this.partnerName1?.trim() || 'Partner 1') : (this.partnerName2?.trim() || 'Partner 2'))
    },
  },
  actions: {
    setPromptDetail(mode) {
      if (['beginner', 'regular', 'expert'].includes(mode)) this.promptDetailMode = mode
    },
    setPenetration(pref) {
      if (['prefer', 'minimal'].includes(pref)) this.penetrationPreference = pref
    },
    setPositionIntensity(pref) {
      if (pref === 'bed_only' || pref === 'more_physical') this.positionIntensity = pref
    },
    setBackgroundImage(value) {
      this.backgroundImage = value
    },
    setPreferencesOpen(open) {
      this.preferencesOpen = open
    },
    /** Set by App so the preferences menu can start/stop playback. Not persisted. */
    setPlayBackgroundMusic(fn) {
      this._playBackgroundMusic = typeof fn === 'function' ? fn : null
    },
    setStopBackgroundMusic(fn) {
      this._stopBackgroundMusic = typeof fn === 'function' ? fn : null
    },
    setBackgroundMusicPlaying(playing) {
      this.backgroundMusicPlaying = !!playing
    },
    /** Call from preferences UI to stop/pause background music. */
    stopBackgroundMusic() {
      if (typeof this._stopBackgroundMusic === 'function') this._stopBackgroundMusic()
    },
    /** Call from preferences UI when user selects music; stops when selection is "none". Idempotent: does nothing if already playing this selection. */
    playBackgroundMusicNow(selection) {
      const isNone = !selection || String(selection).toLowerCase().trim() === 'none'
      if (isNone) {
        if (typeof this._stopBackgroundMusic === 'function') this._stopBackgroundMusic()
        return
      }
      if (this.backgroundMusicPlaying && this.backgroundMusic === selection) return
      this._playingFromUI = true
      try {
        if (typeof this._playBackgroundMusic === 'function') this._playBackgroundMusic(selection)
      } finally {
        setTimeout(() => { this._playingFromUI = false }, 0)
      }
    },
  },
})
