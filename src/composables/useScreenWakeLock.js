import { onMounted, onUnmounted } from 'vue'

/**
 * Keeps the device screen awake while a guided / sensate session is active (Screen Wake Lock API).
 * Re-requests when the tab becomes visible again (the OS releases the lock while hidden; do not skip re-request).
 */
export function useScreenWakeLock() {
  let lock = null

  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function'

  async function acquire() {
    if (!supported || document.visibilityState !== 'visible') return
    try {
      if (lock && lock.released === false) return
      lock = await navigator.wakeLock.request('screen')
      lock.addEventListener('release', () => {
        lock = null
      })
    } catch (_) {
      lock = null
    }
  }

  function release() {
    try {
      lock?.release?.()
    } catch (_) {}
    lock = null
  }

  async function onVisibility() {
    if (document.visibilityState === 'visible') await acquire()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    void acquire()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    release()
  })
}
