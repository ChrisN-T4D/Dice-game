import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles.css'

/**
 * Safe area fallback: some browsers (e.g. Chrome on Android) don't set env(safe-area-inset-bottom).
 * Detect when it's 0 on a mobile-sized viewport and set a CSS variable so the bottom nav stays above the OS bar.
 */
function applySafeAreaFallback() {
  if (typeof document === 'undefined' || !document.documentElement) return
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-9999px;padding-bottom:env(safe-area-inset-bottom);'
  document.body.appendChild(el)
  const computed = getComputedStyle(el)
  const paddingBottom = computed.paddingBottom
  document.body.removeChild(el)
  const px = parseFloat(paddingBottom)
  const isMobileSized = window.innerWidth < 768 || 'ontouchstart' in window
  if (isMobileSized && (Number.isNaN(px) || px === 0)) {
    document.documentElement.style.setProperty('--safe-area-bottom-fallback', '48px')
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applySafeAreaFallback)
} else {
  applySafeAreaFallback()
}

function showMountError(err) {
  console.error('App mount failed:', err)
  const el = document.getElementById('app')
  if (!el) return
  const msg = err?.message || String(err)
  const stack = err?.stack ? `<pre style="text-align:left;font-size:0.75rem;overflow:auto;max-height:200px;">${escapeHtml(err.stack)}</pre>` : ''
  el.innerHTML = `<div style="margin:0;padding:2rem;max-width:600px;margin:0 auto;color:#fca5a5;font-size:1rem;">
    <p><strong>Something went wrong</strong></p>
    <p>${escapeHtml(msg)}</p>
    ${stack}
  </div>`
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

try {
  const app = createApp(App)
  app.config.errorHandler = (err, instance, info) => {
    console.error('Vue error:', err, info)
    showMountError(err)
  }
  app.use(createPinia())
  app.mount('#app')
} catch (err) {
  showMountError(err)
}
