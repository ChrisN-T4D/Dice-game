import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    phase: 1,
    rollCount: 0,
    maxPhase: 3,
    showLanding: true,
    uiMode: null, // 'guided' | 'sensate' | 'freeplay'
    isGuidedMode: false,
  }),
  getters: {
    phaseDisplay() {
      return `Phase ${this.phase}`
    },
  },
  actions: {
    setPhase(p) {
      if (p >= 1 && p <= this.maxPhase) this.phase = p
    },
    advancePhase() {
      if (this.phase < this.maxPhase) {
        this.phase++
        this.rollCount = 0
        return true
      }
      return false
    },
    setRollCount(n) {
      this.rollCount = Math.max(0, n)
    },
    startSession(mode) {
      this.uiMode = mode
      this.isGuidedMode = mode === 'guided' || mode === 'sensate'
      this.showLanding = false
    },
    showLandingModal() {
      this.showLanding = true
    },
    resetSession() {
      this.phase = 1
      this.rollCount = 0
      this.uiMode = null
      this.isGuidedMode = false
      this.showLanding = true
    },
  },
})
