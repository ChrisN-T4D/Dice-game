<template>
  <div
    class="app-menu-overlay"
    :class="{ open }"
    aria-hidden="true"
    @click="close"
  />
  <aside
    class="app-menu-sidebar"
    :class="{ open }"
    role="dialog"
    aria-label="App menu"
    aria-modal="true"
  >
    <div class="app-menu-header">
      <h2 class="app-menu-title">Menu</h2>
      <button type="button" class="app-menu-close-btn" title="Close menu" aria-label="Close menu" @click="close">
        ✕
      </button>
    </div>
    <nav class="app-menu-body" aria-label="Navigation">
      <button type="button" class="secondary app-menu-primary-action" @click="emit('home')">
        <span class="app-menu-item-title">🏠 Home</span>
        <span class="app-menu-item-desc">Choose session type (same as first screen)</span>
      </button>

      <p class="app-menu-section-label">Go directly to</p>
      <ul class="app-menu-mode-list">
        <li>
          <button
            type="button"
            class="secondary app-menu-mode-btn"
            :class="{ 'preset-selected': currentMode === 'freeplay' }"
            @click="emit('go-freeplay')"
          >
            🎲 Dice game
          </button>
        </li>
        <li>
          <button
            type="button"
            class="secondary app-menu-mode-btn"
            :class="{ 'preset-selected': currentMode === 'guided' }"
            @click="emit('go-guided')"
          >
            ⏱️ Guided mode
          </button>
        </li>
        <li>
          <button
            type="button"
            class="secondary app-menu-mode-btn"
            :class="{ 'preset-selected': currentMode === 'sensate' }"
            @click="emit('go-sensate')"
          >
            🌿 Sensate-style
          </button>
        </li>
      </ul>

      <div class="app-menu-footer-sep" />
      <button type="button" class="secondary app-menu-prefs-btn" @click="emit('open-preferences')">
        <span class="app-menu-item-title">⚙️ Preferences</span>
        <span class="app-menu-item-desc">Voice, music, background, favorites, intro</span>
      </button>
    </nav>
  </aside>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  /** @type {'freeplay' | 'guided' | 'sensate' | null} */
  currentMode: { type: String, default: null },
})

const emit = defineEmits(['close', 'home', 'go-freeplay', 'go-guided', 'go-sensate', 'open-preferences'])

function close() {
  emit('close')
}
</script>

<style scoped>
.app-menu-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}
.app-menu-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.app-menu-primary-action,
.app-menu-prefs-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  width: 100%;
  padding: 0.75rem 1rem;
  gap: 0.25rem;
}
.app-menu-item-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.app-menu-item-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 400;
  line-height: 1.35;
}
.app-menu-section-label {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}
.app-menu-mode-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.app-menu-mode-btn {
  width: 100%;
  text-align: left;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
}
.app-menu-footer-sep {
  margin-top: 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid #334155;
}
</style>
