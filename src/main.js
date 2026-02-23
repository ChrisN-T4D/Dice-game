import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles.css'

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
