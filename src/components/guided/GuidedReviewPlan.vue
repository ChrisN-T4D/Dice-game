<template>
  <div>
    <Teleport to="#bottom-nav-portal">
      <div class="guided-review-nav-actions">
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('open-saved')">Saved</button>
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('review-back')">Restart setup</button>
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('go-partner-setup')">Go to partner setup</button>
        <button type="button" class="secondary guided-review-nav-btn" @click="guided.rerollAll()">Reroll all</button>
        <button type="button" class="primary guided-review-nav-btn guided-review-confirm" @click="$emit('confirm')">Confirm session</button>
      </div>
    </Teleport>
    <div v-if="showSavedList" class="guided-saved-overlay" @click.self="$emit('update:showSavedList', false)">
      <div class="guided-saved-list">
        <h3>Saved sessions</h3>
        <p v-if="!sessionFavorites.list.length" class="guided-saved-empty">No saved sessions yet. Complete a session and use "Save as favorite".</p>
        <ul v-else>
          <li v-for="fav in sessionFavorites.list" :key="fav.id">
            <button type="button" class="guided-saved-item" @click="$emit('load-session', fav)">
              {{ fav.name }} <span class="guided-saved-date">{{ new Date(fav.createdAt).toLocaleDateString() }}</span>
            </button>
          </li>
        </ul>
        <button type="button" class="secondary" @click="$emit('update:showSavedList', false)">Close</button>
      </div>
    </div>
    <div class="guided-review-screen">
      <div class="guided-review-inner">
        <h2 class="guided-ready-title">Review your session</h2>
        <p class="guided-review-sub">{{ guided.sessionPlan.turns.length }} turns. Reroll any turn or confirm to generate audio.</p>
        <div class="guided-review-list">
          <div
            v-for="(t, idx) in guided.sessionPlan.turns"
            :key="idx"
            class="guided-review-turn"
          >
            <div class="guided-review-turn-head">
              <span class="guided-review-turn-num">Turn {{ t.turnIndex }}</span>
              <span class="guided-review-turn-phase">Phase {{ t.phase }}</span>
              <button type="button" class="secondary small guided-review-reroll" @click="guided.rerollTurn(idx)">Reroll</button>
            </div>
            <div class="guided-review-turn-body">
              <div v-if="t.instruction" class="guided-review-instruction">{{ t.instruction }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGuidedStore } from '@/stores/guided'
import { useSessionFavoritesStore } from '@/stores/sessionFavorites'

defineProps({
  showSavedList: { type: Boolean, required: true },
})

defineEmits([
  'update:showSavedList',
  'open-saved',
  'review-back',
  'go-partner-setup',
  'confirm',
  'load-session',
])

const guided = useGuidedStore()
const sessionFavorites = useSessionFavoritesStore()
</script>

<style scoped>
.guided-review-screen {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  padding: 2rem 1rem;
  box-sizing: border-box;
}
.guided-review-inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.25rem;
  max-width: 480px;
  width: 100%;
  min-width: 0;
}
.guided-ready-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #e5e7eb;
  margin: 0;
  line-height: 1.3;
  text-align: center;
}
.guided-review-sub {
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 0;
}
.guided-review-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
}
.guided-review-turn {
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}
.guided-review-turn-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.guided-review-turn-num { font-weight: 700; color: #e5e7eb; }
.guided-review-turn-phase { font-size: 0.85rem; color: #94a3b8; }
.guided-review-reroll { margin-left: auto; }
.guided-review-turn-body { font-size: 0.9rem; color: #cbd5e1; line-height: 1.4; }
.guided-review-instruction { margin-top: 0.35rem; opacity: 0.95; }
.guided-review-nav-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.guided-review-nav-btn {
  padding: 0.45rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 38px;
  border-radius: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
.guided-review-confirm {
  grid-column: 1 / -1;
}
.guided-saved-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.guided-saved-list {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  padding: 1.25rem;
  max-width: 360px;
  width: 100%;
  max-height: 70vh;
  overflow: auto;
}
.guided-saved-list h3 { margin: 0 0 0.75rem; font-size: 1.1rem; color: #e5e7eb; }
.guided-saved-empty { font-size: 0.9rem; color: #94a3b8; margin: 0 0 1rem; }
.guided-saved-list ul { list-style: none; margin: 0 0 1rem; padding: 0; }
.guided-saved-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.35rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: rgba(15, 23, 42, 0.8);
  color: #e5e7eb;
  font-size: 0.95rem;
  cursor: pointer;
}
.guided-saved-date { font-size: 0.8rem; color: #94a3b8; margin-left: 0.5rem; }
</style>
