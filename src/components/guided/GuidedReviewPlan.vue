<template>
  <div class="guided-review-root">
    <Teleport to="#bottom-nav-portal">
      <div class="guided-review-nav-actions">
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('open-saved')">Saved</button>
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('review-back')">Restart setup</button>
        <button type="button" class="secondary guided-review-nav-btn" @click="$emit('go-partner-setup')">Partner setup</button>
        <button
          v-if="!isSensatePlan"
          type="button"
          class="secondary guided-review-nav-btn"
          @click="guided.rerollAll()"
        >
          Reroll all
        </button>
        <button type="button" class="primary guided-review-nav-btn guided-review-confirm" @click="$emit('confirm')">
          Confirm session
        </button>
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
        <header class="guided-review-header">
          <h2 class="guided-review-title">Review your session</h2>
          <p class="guided-review-lead">
            <template v-if="isSensatePlan">{{ guided.sessionPlan.turns.length }} scripted turns. Confirm to prepare audio.</template>
            <template v-else>{{ guided.sessionPlan.turns.length }} turns. Reroll any turn or confirm to generate audio.</template>
          </p>
          <p v-if="sensateFirstToucherNote" class="guided-review-meta">{{ sensateFirstToucherNote }}</p>
          <p v-if="phase3PlanSummary" class="guided-review-meta">{{ phase3PlanSummary }}</p>
          <p v-if="positionIntensitySummary" class="guided-review-meta">{{ positionIntensitySummary }}</p>
        </header>

        <section v-for="group in turnsByPhase" :key="'ph-' + group.phase" class="guided-review-phase">
          <div class="guided-review-phase-bar" :class="'phase-' + group.phase">
            <span class="guided-review-phase-label">Phase {{ group.phase }}</span>
            <span class="guided-review-phase-count">{{ group.turns.length }} turn{{ group.turns.length === 1 ? '' : 's' }}</span>
          </div>
          <ul class="guided-review-phase-list">
            <li v-for="row in group.turns" :key="row.idx" class="guided-review-card">
              <div class="guided-review-card-top">
                <span class="guided-review-badge">#{{ row.t.turnIndex }}</span>
                <span v-if="!isSensatePlan" class="guided-review-roles">{{ roleLine(row.t) }}</span>
                <button
                  v-if="!isSensatePlan"
                  type="button"
                  class="secondary small guided-review-reroll"
                  @click="guided.rerollTurn(row.idx)"
                >
                  Reroll
                </button>
              </div>
              <div v-if="row.t.clothing" class="guided-review-clothing">
                <span class="guided-review-clothing-label">Clothing</span>
                <span class="guided-review-clothing-text">{{ row.t.clothing }}</span>
              </div>
              <div v-if="row.t.instruction" class="guided-review-instruction">{{ row.t.instruction }}</div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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

const isSensatePlan = computed(() => guided.sessionPlan?.kind === 'sensate')

const sensateFirstToucherNote = computed(() => {
  const c = guided.sessionPlan?.config
  if (!c || c.sessionKind !== 'sensate' || c.sensateFirstGiverResolved == null) return ''
  const g = c.sensateFirstGiverResolved
  const pref = c.sensateFirstToucherPreference
  const who = g === 1 ? 'Partner 1' : 'Partner 2'
  if (pref === 'random') return `First toucher (random): ${who}.`
  if (pref === 1 || pref === 2) return `First toucher (your choice): ${who}.`
  return `First toucher: ${who}.`
})

const phase3PlanSummary = computed(() => {
  const plan = guided.sessionPlan
  if (!plan || plan.kind === 'sensate') return ''
  const c = plan.config
  if (!c) return ''
  if (c.phase3PositionMode === 'reuse_rotate') {
    const n = typeof c.phase3RotationCapResolved === 'number' ? c.phase3RotationCapResolved : null
    if (n != null) {
      return `Phase 3: two turns per position so each partner leads once, up to ${n} compatible positions in the rotation, new activity each turn.`
    }
    return `Phase 3: two turns per position so each partner leads once, cycling compatible positions, new activity each turn.`
  }
  if (c.phase3PositionMode === 'reuse_multi') {
    const n =
      typeof c.phase3RotationCapResolved === 'number'
        ? c.phase3RotationCapResolved
        : typeof c.phase3MaxPositions === 'number'
          ? c.phase3MaxPositions
          : 4
    const t = typeof c.phase3ResolvedTurnsPerSlot === 'number' ? c.phase3ResolvedTurnsPerSlot : null
    const est = typeof c.phase3EstimatedTurnsInPhase === 'number' ? c.phase3EstimatedTurnsInPhase : null
    if (t != null && est != null) {
      return `Phase 3: up to ${n} positions in rotation, about ${t} turns per position (from ~${est} estimated Phase 3 turns), new activity each turn.`
    }
    return `Phase 3: up to ${n} positions in rotation; turns per position follow session length and rotation size, new activity each turn.`
  }
  return ''
})

const positionIntensitySummary = computed(() => {
  const plan = guided.sessionPlan
  if (!plan || plan.kind === 'sensate') return ''
  const pi = plan.config?.positionIntensity
  if (pi === 'bed_only') return 'This session — Phase 3 positions: calmer / bed-focused (standing-heavy ideas excluded).'
  return 'This session — Phase 3 positions: full variety (including more athletic suggestions when rolled).'
})

const turnsByPhase = computed(() => {
  const turns = guided.sessionPlan?.turns
  if (!Array.isArray(turns)) return []
  const map = new Map()
  for (let idx = 0; idx < turns.length; idx++) {
    const t = turns[idx]
    const ph = t.phase ?? 1
    if (!map.has(ph)) map.set(ph, [])
    map.get(ph).push({ idx, t })
  }
  return [1, 2, 3]
    .filter((ph) => map.has(ph))
    .map((phase) => ({ phase, turns: map.get(phase) }))
})

function roleLine(t) {
  const g = t.currentPartner
  const r = t.receiver
  if (g === 1 || g === 2) {
    if (r === 1 || r === 2) return `P${g} → P${r}`
  }
  return ''
}
</script>

<style scoped>
.guided-review-root {
  width: 100%;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.guided-review-screen {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding: 1.25rem 0.75rem 2rem;
  box-sizing: border-box;
}
.guided-review-inner {
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.guided-review-header {
  text-align: center;
}
.guided-review-title {
  font-size: clamp(1.35rem, 4.2vmin, 1.85rem);
  font-weight: 700;
  color: #e5e7eb;
  margin: 0 0 0.35rem;
  line-height: 1.25;
}
.guided-review-lead {
  font-size: 0.92rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.45;
}
.guided-review-meta {
  font-size: 0.82rem;
  color: #a78bfa;
  margin: 0.65rem 0 0;
  line-height: 1.4;
}
.guided-review-phase {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.guided-review-phase-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.guided-review-phase-bar.phase-1 {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
}
.guided-review-phase-bar.phase-2 {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.35);
  color: #d8b4fe;
}
.guided-review-phase-bar.phase-3 {
  background: rgba(236, 72, 153, 0.12);
  border: 1px solid rgba(236, 72, 153, 0.35);
  color: #f9a8d4;
}
.guided-review-phase-label {
  text-transform: uppercase;
  font-size: 0.72rem;
}
.guided-review-phase-count {
  font-weight: 600;
  opacity: 0.9;
}
.guided-review-phase-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.guided-review-card {
  background: rgba(2, 6, 23, 0.55);
  border: 1px solid #334155;
  border-radius: 0.6rem;
  padding: 0.65rem 0.75rem;
}
.guided-review-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.5rem;
  margin-bottom: 0.35rem;
}
.guided-review-badge {
  font-weight: 800;
  font-size: 0.75rem;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #475569;
  border-radius: 0.35rem;
  padding: 0.15rem 0.45rem;
}
.guided-review-roles {
  font-size: 0.78rem;
  font-weight: 600;
  color: #a855f7;
  flex: 1;
  min-width: 0;
}
.guided-review-reroll {
  margin-left: auto;
}
.guided-review-clothing {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0.25rem 0 0.5rem;
  padding: 0.45rem 0.5rem;
  border-radius: 0.4rem;
  background: rgba(30, 41, 59, 0.65);
  border: 1px solid rgba(71, 85, 105, 0.6);
}
.guided-review-clothing-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}
.guided-review-clothing-text {
  font-size: 0.85rem;
  color: #fde68a;
  line-height: 1.35;
}
.guided-review-instruction {
  font-size: 0.88rem;
  color: #cbd5e1;
  line-height: 1.45;
  white-space: pre-wrap;
}
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
.guided-saved-list h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  color: #e5e7eb;
}
.guided-saved-empty {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0 0 1rem;
}
.guided-saved-list ul {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
}
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
.guided-saved-date {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-left: 0.5rem;
}
</style>
