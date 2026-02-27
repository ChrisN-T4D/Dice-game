/**
 * Run a callback when the main thread is idle (Safari / WebKit safe).
 * requestIdleCallback is not available in Safari (including iOS Safari and other
 * WebKit-based mobile browsers). This utility uses it when present, and a
 * safe fallback otherwise, so ~50% of users on Apple devices are covered.
 *
 * - When available: requestIdleCallback(callback, { timeout }) so the browser
 *   runs the work during idle time, with a fallback timeout.
 * - When not (Safari): requestAnimationFrame + setTimeout so the work runs
 *   after the next paint and doesn’t block the first frame.
 */

const hasRequestIdleCallback =
  typeof globalThis.requestIdleCallback === 'function' &&
  typeof globalThis.cancelIdleCallback === 'function'

/** Delay used for Safari fallback so first paint can complete (ms). */
const FALLBACK_DELAY_MS = 50

/**
 * Schedule callback to run when the main thread is idle.
 * @param {() => void} callback - Function to run once when idle (or after fallback delay).
 * @param {{ timeout?: number }} [options] - Optional. timeout: max wait in ms before running (default 2000).
 */
export function whenIdle(callback, options = {}) {
  const { timeout = 2000 } = options

  if (hasRequestIdleCallback) {
    globalThis.requestIdleCallback(callback, { timeout })
    return
  }

  // Safari / WebKit: run after next paint so we don't block first paint
  globalThis.requestAnimationFrame(() => {
    globalThis.setTimeout(callback, FALLBACK_DELAY_MS)
  })
}
