/**
 * Platform detection utilities.
 */

let _isWebKit = null

/**
 * Detect Safari / WebKit browsers (macOS Safari, iOS Safari, and all iOS
 * browsers which are forced to use WebKit). Kokoro TTS crashes on these
 * engines so the app should fall back to browser voices.
 */
export function isWebKit() {
  if (_isWebKit !== null) return _isWebKit
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  _isWebKit = /AppleWebKit/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua)
  return _isWebKit
}
