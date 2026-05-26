<template>
  <section class="anatomy-explorer" aria-label="Anatomy database">
    <div class="explorer-toolbar">
      <label class="toolbar-label" for="anatomy-orientation">Orientation</label>
      <select
        id="anatomy-orientation"
        v-model="orientation"
        class="toolbar-select"
        :disabled="loading"
        @change="loadHierarchy"
      >
        <option value="all">All</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
      </select>
      <button type="button" class="secondary small" :disabled="loading" @click="loadHierarchy">
        {{ loading ? 'Loading…' : 'Reload' }}
      </button>
      <button type="button" class="secondary small" :disabled="loading || !hierarchy?.regions?.length" @click="expandAll">
        Expand all
      </button>
      <button type="button" class="secondary small" :disabled="loading || !hierarchy?.regions?.length" @click="collapseAll">
        Collapse
      </button>
      <span v-if="health" class="api-badge ok">
        {{ profileProgress }}
      </span>
      <span v-else-if="healthError" class="api-badge err">API offline</span>
    </div>

    <p v-if="loadError" class="explorer-error">
      {{ loadError }}
      <span class="explorer-error-hint">Start the anatomy API with <code>npm run api:dev</code> (port 3001), then reload.</span>
    </p>

    <div v-else class="explorer-panels">
      <nav class="explorer-tree" aria-label="Anatomy hierarchy">
        <p v-if="!loading && !hierarchy?.regions?.length" class="tree-empty">No regions match this filter.</p>
        <ul v-else class="tree-root" role="tree">
          <li
            v-for="region in orderedRegions"
            :key="region.id"
            role="treeitem"
            :aria-expanded="isExpanded(regionKey(region.id))"
          >
            <button
              type="button"
              class="tree-row tree-row-region"
              :class="{ selected: selection?.type === 'region' && selection.id === region.id }"
              @click="toggleExpand(regionKey(region.id)); selectRegion(region)"
            >
              <span class="tree-chevron" :class="{ open: isExpanded(regionKey(region.id)) }">›</span>
              <span class="tree-label">{{ region.display_name }}</span>
              <span class="tree-meta">{{ region.zoneCount }}</span>
            </button>
            <ul v-show="isExpanded(regionKey(region.id))" class="tree-children" role="group">
              <li
                v-for="sub in region.subRegions"
                :key="sub.id"
                role="treeitem"
                :aria-expanded="isExpanded(subKey(region.id, sub.id))"
              >
                <button
                  type="button"
                  class="tree-row tree-row-sub"
                  :class="{ selected: selection?.type === 'subRegion' && selection.id === sub.id }"
                  @click.stop="toggleExpand(subKey(region.id, sub.id)); selectSubRegion(region, sub)"
                >
                  <span class="tree-chevron" :class="{ open: isExpanded(subKey(region.id, sub.id)) }">›</span>
                  <span class="tree-label">{{ sub.display_name }}</span>
                  <span class="tree-meta">{{ sub.zoneCount }}</span>
                </button>
                <ul v-show="isExpanded(subKey(region.id, sub.id))" class="tree-children" role="group">
                  <li v-for="zone in sub.zones" :key="zone.id" role="treeitem">
                    <button
                      type="button"
                      class="tree-row tree-row-zone"
                      :class="{ selected: selection?.type === 'zone' && selection.id === zone.id }"
                      @click.stop="selectZone(region, sub, zone)"
                    >
                      <span class="tree-chevron spacer" />
                      <span class="tree-label">{{ zone.display_name }}</span>
                      <span
                        class="zone-status"
                        :class="zoneStatusClass(zone)"
                        :title="zoneStatusTitle(zone)"
                        aria-hidden="true"
                      />
                      <span class="tree-meta sensitivity" :data-level="zone.sensitivity">{{ zone.sensitivity }}</span>
                      <span
                        v-if="zone.actionCount"
                        class="tree-meta action-badges"
                        :title="actionBadgeTitle(zone)"
                      >
                        {{ zone.actionCount }} act
                      </span>
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      <article class="explorer-detail">
        <p v-if="!selection" class="detail-placeholder">Select a region, sub-region, or zone.</p>
        <template v-else>
          <p class="detail-breadcrumb">{{ breadcrumb }}</p>

          <template v-if="selection.type === 'region'">
            <h2 class="detail-title">{{ selection.display_name }}</h2>
            <p class="detail-id"><code>{{ selection.id }}</code></p>
            <p class="detail-summary">{{ selection.zoneCount }} zone(s) in {{ selection.subRegionCount }} sub-region(s).</p>
          </template>

          <template v-else-if="selection.type === 'subRegion'">
            <h2 class="detail-title">{{ selection.display_name }}</h2>
            <p class="detail-id"><code>{{ selection.id }}</code> · region <code>{{ selection.regionId }}</code></p>
            <p v-if="selection.definition" class="detail-definition">{{ selection.definition }}</p>
            <p class="detail-summary">{{ selection.zoneCount }} zone(s).</p>
          </template>

          <template v-else-if="selection.type === 'zone'">
            <div v-if="zoneLoading" class="detail-loading">Loading zone…</div>
            <p v-else-if="zoneError" class="detail-error">{{ zoneError }}</p>
            <template v-else-if="zoneDetail">
              <h2 class="detail-title">{{ zoneDetail.display_name }}</h2>
              <p class="detail-id"><code>{{ zoneDetail.id }}</code></p>
              <div class="detail-tags">
                <span class="tag">{{ zoneDetail.sensitivity }}</span>
                <span v-if="zoneDetail.sensitivity_score != null" class="tag">score {{ zoneDetail.sensitivity_score }}</span>
                <span v-for="o in zoneOrientations" :key="o" class="tag tag-orient">{{ o }}</span>
                <span v-if="zoneDetail.bodyRegionType" class="tag">{{ zoneDetail.bodyRegionType }}</span>
              </div>
              <p v-if="zoneDetail.description" class="detail-description">{{ zoneDetail.description }}</p>
              <p v-else class="detail-error">No description seeded for this zone.</p>

              <section v-if="zoneDetail.actionCount" class="actions-panel" aria-label="Stimulation actions">
                <h3 class="actions-heading">
                  Stimulation actions
                  <span class="actions-badges">{{ zoneDetail.actionCount.total }}</span>
                </h3>
                <div class="actions-modality-bar">
                  <template v-for="(count, code) in zoneDetail.actionCount.modalityCount" :key="code">
                    <span class="modality-pill">{{ code }} · {{ count }}</span>
                  </template>
                </div>

                <h4 class="actions-items-heading">Action items</h4>
                <ul class="actions-list">
                  <li
                    v-for="action in enrichedZoneActions"
                    :key="`${action.id}-${action.sequence_ref ? 'ref' : 'anchor'}`"
                    class="action-item"
                    :class="{
                      'action-sequence': action.action_kind === 'sequence' && !action.sequence_ref,
                      'action-sequence-ref': action.sequence_ref,
                    }"
                  >
                    <p v-if="action.sequence_ref" class="sequence-ref-badge">
                      Sequence · starts at <code>{{ action.anchor_zone_id }}</code>
                    </p>
                    <p v-else-if="action.action_kind === 'sequence'" class="sequence-path-badge">
                      Multi-zone sequence
                      <span v-if="action.sequence_zones?.length" class="sequence-path">
                        {{ action.sequence_zones.join(' → ') }}
                      </span>
                    </p>
                    <ol
                      v-if="action.action_kind === 'sequence' && action.sequence_steps?.length && !action.sequence_ref"
                      class="sequence-timeline"
                    >
                      <li v-for="(step, idx) in action.sequence_steps" :key="idx">
                        <span class="seq-step-num">{{ idx + 1 }}</span>
                        <code>{{ step.zone_id }}</code>
                        · {{ step.technique }} · {{ step.stimulator }}
                        <span v-if="step.beats"> · {{ step.beats }} beats</span>
                      </li>
                    </ol>
                    <span class="action-instruction">{{ action.instruction }}</span>
                    <p
                      v-if="action.instruction_parts?.some((p) => p.type === 'pause')"
                      class="instruction-timing-hint"
                    >
                      Audio: speaks each block, then
                      <template v-for="(part, pi) in action.instruction_parts" :key="pi">
                        <span v-if="part.type === 'pause'" class="pause-chip">{{ part.seconds }}s pause</span>
                      </template>
                      between steps.
                    </p>
                    <span v-if="action.display_name" class="action-name">{{ action.display_name }}</span>
                    <span class="action-meta">
                      <span v-if="action.stimulator" class="action-stimulator">{{ action.stimulator }}</span>
                      <span v-if="action.technique">{{ action.technique }}</span>
                      <span v-if="action.modality" class="action-modality">{{ action.modality }}</span>
                    </span>
                    <div v-if="action.stimulation" class="action-channels">
                      <span
                        v-for="(val, ch) in action.stimulation"
                        :key="ch"
                        class="channel-pill"
                      >{{ ch }}: {{ val.level }}</span>
                    </div>
                    <div v-if="action.contact" class="action-contact">
                      <span class="contact-pill">{{ action.contact.footprint }} · {{ action.contact.coverage }}</span>
                      <span v-if="zoneDetail.topology?.typical_contact_fu" class="contact-pill zone-area">
                        zone ~{{ zoneDetail.topology.typical_contact_fu }} FU
                      </span>
                      <span class="contact-pill">{{ stimulatorPadLabel(action) }}</span>
                    </div>
                    <p v-if="action.also_stimulates?.length" class="action-spillover">
                      Also stimulates:
                      <code v-for="z in action.also_stimulates" :key="z">{{ z }}</code>
                    </p>
                    <div class="action-intensity" :title="stimMathTitle(action)">
                      <span class="intensity-label">Intensity S</span>
                      <span class="stim-s">{{ action.perceived_stimulation ?? action.intensity ?? '—' }}</span>
                      <span v-if="action.stimulation_band" class="stim-band">{{ action.stimulation_band }}</span>
                    </div>
                  </li>
                </ul>
              </section>

              <section v-if="zoneActionRubric" class="rubric-panel" aria-label="Action criteria">
                <h3 class="rubric-heading">Action criteria</h3>
                <p class="rubric-hint detail-muted">
                  FU = finger widths. Stimulator pad vs zone size drives spillover (also_stimulates).
                </p>
                <p v-if="zoneActionRubric.ok" class="rubric-ok">Actions meet rubric for this zone.</p>
                <ul v-else class="rubric-issues">
                  <li v-for="(issue, i) in zoneActionRubric.issues" :key="i">{{ issue }}</li>
                </ul>
              </section>

              <section v-if="zoneRubric" class="rubric-panel" aria-label="Profile criteria">
                <h3 class="rubric-heading">
                  Profile criteria
                  <span class="rubric-badge" :class="zoneRubric.ok ? 'ok' : 'warn'">
                    {{ zoneRubric.ok ? 'Pass' : `${zoneRubric.issues.length} issue(s)` }}
                  </span>
                </h3>
                <ul v-if="zoneRubric.issues.length" class="rubric-issues">
                  <li v-for="(issue, i) in zoneRubric.issues" :key="i">{{ issue }}</li>
                </ul>
                <p v-else class="detail-muted">All rubric checks passed for this zone.</p>
              </section>

              <div v-if="selection?.type === 'zone'" class="zone-nav">
                <button type="button" class="secondary small" :disabled="!prevZone" @click="goToZone(prevZone)">
                  ← Previous
                </button>
                <span class="zone-nav-pos">{{ zoneNavLabel }}</span>
                <button type="button" class="secondary small" :disabled="!nextZone" @click="goToZone(nextZone)">
                  Next →
                </button>
              </div>

              <dl class="detail-path">
                <dt>Region</dt>
                <dd><code>{{ zoneDetail.region }}</code></dd>
                <dt>Sub-region</dt>
                <dd><code>{{ zoneDetail.subRegion || '—' }}</code></dd>
                <dt v-if="zoneDetail.parent_id">Parent zone</dt>
                <dd v-if="zoneDetail.parent_id"><code>{{ zoneDetail.parent_id }}</code></dd>
              </dl>
              <ProfileBlock v-if="zoneDetail.topology" title="Topology" :data="zoneDetail.topology" />
              <ProfileBlock v-if="zoneDetail.stimulation" title="Stimulation" :data="zoneDetail.stimulation" />
              <ProfileBlock v-if="zoneDetail.musculoskeletal" title="Musculoskeletal" :data="zoneDetail.musculoskeletal" />
              <ProfileBlock v-if="zoneDetail.tickle" title="Tickle" :data="zoneDetail.tickle" />
              <p v-if="!hasProfiles" class="detail-muted">No profile rows seeded for this zone yet.</p>
            </template>
          </template>
        </template>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineComponent, h } from 'vue'
import {
  checkAnatomyApiHealth,
  fetchAnatomyHierarchy,
  getZoneWithActions,
  enrichZoneActions,
  clearAnatomyCache,
} from '@/data/anatomy'
import { auditZoneProfile, auditZoneSummary } from '@/data/anatomy/profile-audit.js'
import { auditZoneActions, auditZoneActionSummary } from '@/data/anatomy/action-audit.js'
import { zoneProfileFromApiZone } from '@/data/anatomy/action-enrich.js'
import { getStimulatorContact } from '@/data/anatomy/contact-scale.js'

const ProfileBlock = defineComponent({
  name: 'ProfileBlock',
  props: {
    title: { type: String, required: true },
    data: { type: Object, required: true },
  },
  setup(props) {
    const entries = computed(() =>
      Object.entries(props.data).filter(([, v]) => v != null && v !== '')
    )
    return () => {
      if (!entries.value.length) return null
      return h('div', { class: 'profile-block' }, [
        h('h3', { class: 'profile-title' }, props.title),
        h(
          'dl',
          { class: 'profile-dl' },
          entries.value.flatMap(([k, v]) => [
            h('dt', null, formatKey(k)),
            h('dd', null, Array.isArray(v) ? v.join(', ') : String(v)),
          ])
        ),
      ])
    }
  },
})

const orientation = ref('all')
const loading = ref(false)
const loadError = ref('')
const hierarchy = ref(null)
const health = ref(null)
const healthError = ref(false)

const expanded = ref(new Set())
const selection = ref(null)

const zoneDetail = ref(null)
const zoneLoading = ref(false)
const zoneError = ref('')

const breadcrumb = computed(() => {
  const s = selection.value
  if (!s) return ''
  if (s.type === 'region') return s.display_name
  if (s.type === 'subRegion') return `${s.regionName} › ${s.display_name}`
  return `${s.regionName} › ${s.subRegionName} › ${s.display_name}`
})

const zoneOrientations = computed(() => {
  const o = zoneDetail.value?.orientation ?? zoneDetail.value?.orientations
  if (!o) return []
  return Array.isArray(o) ? o : [o]
})

const hasProfiles = computed(() => {
  const z = zoneDetail.value
  if (!z) return false
  return !!(z.topology || z.stimulation || z.musculoskeletal || z.tickle)
})

const orderedRegions = computed(() => hierarchy.value?.regions || [])

const profileProgress = computed(() => {
  const h = hierarchy.value
  if (!h) return `${health.value?.zoneCount ?? 0} zones`
  const total = h.zoneCount ?? 0
  const done = h.profileCompleteCount ?? 0
  return `${done}/${total} profiles complete`
})

const flatZones = computed(() => {
  const list = []
  for (const region of orderedRegions.value) {
    for (const sub of region.subRegions || []) {
      for (const zone of sub.zones || []) {
        list.push({ region, sub, zone })
      }
    }
  }
  return list
})

const currentZoneIndex = computed(() => {
  if (selection.value?.type !== 'zone') return -1
  return flatZones.value.findIndex((e) => e.zone.id === selection.value.id)
})

const prevZone = computed(() => {
  const i = currentZoneIndex.value
  return i > 0 ? flatZones.value[i - 1] : null
})

const nextZone = computed(() => {
  const i = currentZoneIndex.value
  return i >= 0 && i < flatZones.value.length - 1 ? flatZones.value[i + 1] : null
})

const zoneNavLabel = computed(() => {
  const i = currentZoneIndex.value
  if (i < 0) return ''
  return `${i + 1} / ${flatZones.value.length}`
})

const zoneRubric = computed(() => {
  const z = zoneDetail.value
  if (!z) return null
  return auditZoneProfile(z, { subRegionId: z.subRegion })
})

const enrichedZoneActions = computed(() => {
  const z = zoneDetail.value
  if (!z?.actions?.length) return []
  return enrichZoneActions(z.actions, z)
})

const zoneActionRubric = computed(() => {
  const z = zoneDetail.value
  if (!enrichedZoneActions.value.length) return null
  return auditZoneActions(enrichedZoneActions.value, {
    zoneId: z.id,
    zoneProfile: zoneProfileFromApiZone(z),
  })
})

function actionBadgeTitle(zone) {
  const summary = auditZoneActionSummary(zone, zone.actionCount || 0)
  return summary.ok ? `${zone.actionCount} actions` : summary.issues.join('; ')
}

function stimMathTitle(action) {
  const b = action.stimulationBreakdown
  if (!b) return ''
  const stim = b.stimulator || action.stimulator || 'stimulator'
  return [
    `S = k(P·v)^n → ${b.S}`,
    `P=${b.P} P_eff=${b.P_eff} v=${b.v} k=${b.k} n=${b.n}`,
    `${stim} ~${b.contact_pad_fu}FU · zone ~${b.zone_typical_fu}FU · ${b.placement_accuracy}`,
  ].join('\n')
}

function stimulatorPadLabel(action) {
  const m = getStimulatorContact(action)
  const name = m.label || m.stimulator || action.stimulator || 'stimulator'
  return `${name} ~${m.contact_pad_fu}FU · ${m.placement_accuracy}`
}

function formatKey(key) {
  return key.replace(/_/g, ' ')
}

function regionKey(id) {
  return `r:${id}`
}

function subKey(regionId, subId) {
  return `s:${regionId}:${subId}`
}

function isExpanded(key) {
  return expanded.value.has(key)
}

function toggleExpand(key) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function selectRegion(region) {
  selection.value = {
    type: 'region',
    id: region.id,
    display_name: region.display_name,
    zoneCount: region.zoneCount,
    subRegionCount: region.subRegions.length,
  }
  zoneDetail.value = null
}

function selectSubRegion(region, sub) {
  selection.value = {
    type: 'subRegion',
    id: sub.id,
    regionId: region.id,
    regionName: region.display_name,
    display_name: sub.display_name,
    definition: sub.definition,
    zoneCount: sub.zoneCount,
  }
  zoneDetail.value = null
}

function selectZone(region, sub, zone) {
  selection.value = {
    type: 'zone',
    id: zone.id,
    regionId: region.id,
    subRegionId: sub.id,
    regionName: region.display_name,
    subRegionName: sub.display_name,
    display_name: zone.display_name,
  }
  loadZoneDetail(zone.id)
}

function goToZone(entry) {
  if (!entry) return
  expanded.value = new Set([
    regionKey(entry.region.id),
    subKey(entry.region.id, entry.sub.id),
  ])
  selectZone(entry.region, entry.sub, entry.zone)
}

function zoneStatusClass(zone) {
  const summary = auditZoneSummary(zone)
  return summary.ok && zone.profileComplete ? 'ok' : 'warn'
}

function zoneStatusTitle(zone) {
  const summary = auditZoneSummary(zone)
  if (summary.ok && zone.profileComplete) return 'Profile complete'
  const parts = []
  if (!zone.profileComplete) parts.push('Missing profile tables')
  parts.push(...summary.issues)
  return parts.join('; ') || 'Needs review'
}

function expandAll() {
  const keys = new Set()
  for (const region of orderedRegions.value) {
    keys.add(regionKey(region.id))
    for (const sub of region.subRegions || []) {
      keys.add(subKey(region.id, sub.id))
    }
  }
  expanded.value = keys
}

function collapseAll() {
  expanded.value = new Set()
  selection.value = null
  zoneDetail.value = null
}

async function loadZoneDetail(id) {
  zoneLoading.value = true
  zoneError.value = ''
  zoneDetail.value = null
  try {
    zoneDetail.value = await getZoneWithActions(id, {
      includeActions: true,
      bustCache: true,
    })
  } catch (e) {
    zoneError.value = e.message || 'Failed to load zone'
  } finally {
    zoneLoading.value = false
  }
}

async function checkHealth() {
  try {
    health.value = await checkAnatomyApiHealth()
    healthError.value = false
  } catch {
    health.value = null
    healthError.value = true
  }
}

async function loadHierarchy() {
  loading.value = true
  loadError.value = ''
  try {
    await checkHealth()
    clearAnatomyCache()
    hierarchy.value = await fetchAnatomyHierarchy({
      orientation: orientation.value === 'all' ? 'all' : orientation.value,
    })
    if (hierarchy.value?.regions?.length && expanded.value.size === 0) {
      const head = hierarchy.value.regions.find((r) => r.id === 'head_neck')
      const first = head || hierarchy.value.regions[0]
      const keys = new Set([regionKey(first.id)])
      const firstSub = first.subRegions?.[0]
      if (firstSub) keys.add(subKey(first.id, firstSub.id))
      expanded.value = keys
    }
  } catch (e) {
    hierarchy.value = null
    loadError.value = e.message || 'Could not load anatomy hierarchy'
    healthError.value = true
  } finally {
    loading.value = false
  }
}

watch(orientation, () => {
  expanded.value = new Set()
  selection.value = null
  zoneDetail.value = null
})

onMounted(() => {
  loadHierarchy()
})

defineExpose({ loadHierarchy })
</script>

<style scoped>
.anatomy-explorer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}
.explorer-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.toolbar-label {
  font-size: 0.85rem;
  color: #94a3b8;
}
.toolbar-select {
  padding: 0.4rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.9rem;
  min-height: 44px;
}
.api-badge {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  margin-left: auto;
}
.api-badge.ok {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}
.api-badge.err {
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
}
.explorer-error {
  margin: 0;
  padding: 0.75rem;
  background: rgba(127, 29, 29, 0.35);
  border-radius: 0.5rem;
  color: #fecaca;
  font-size: 0.9rem;
}
.explorer-error-hint {
  display: block;
  margin-top: 0.35rem;
  color: #fca5a5;
  font-size: 0.85rem;
}
.explorer-error code {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
}
.explorer-panels {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
  overflow: hidden;
}
@media (min-width: 720px) {
  .explorer-panels {
    grid-template-columns: minmax(12rem, 38%) minmax(0, 1fr);
  }
}
.explorer-tree {
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  background: rgba(2, 6, 23, 0.6);
  padding: 0.35rem 0;
}
.tree-empty {
  margin: 0.75rem;
  font-size: 0.9rem;
  color: #94a3b8;
}
.tree-root,
.tree-children {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree-children {
  padding-left: 0.35rem;
}
.tree-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  text-align: left;
  padding: 0.45rem 0.5rem;
  border: none;
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
  font-size: 0.88rem;
  min-height: 40px;
}
.tree-row:hover {
  background: rgba(51, 65, 85, 0.45);
}
.tree-row.selected {
  background: rgba(59, 130, 246, 0.2);
}
.tree-row-sub {
  padding-left: 0.75rem;
  font-size: 0.85rem;
}
.tree-row-zone {
  padding-left: 1.25rem;
  font-size: 0.82rem;
}
.tree-chevron {
  width: 1rem;
  flex-shrink: 0;
  color: #64748b;
  transition: transform 0.15s;
  display: inline-block;
}
.tree-chevron.open {
  transform: rotate(90deg);
}
.tree-chevron.spacer {
  visibility: hidden;
}
.tree-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-meta {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: #64748b;
}
.tree-meta.sensitivity {
  text-transform: capitalize;
}
.tree-meta.action-badges {
  font-size: 0.65rem;
  padding: 0.05rem 0.2rem;
  background: rgba(168, 85, 247, 0.2);
  color: #d8b4fe;
  border-radius: 999px;
  margin-left: 0.25rem;
  white-space: nowrap;
}
.tree-meta.action-badges {
  font-size: 0.7rem;
  color: #4ade80;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background: rgba(74, 222, 128, 0.1);
  white-space: nowrap;
  margin-left: 0.2rem;
}
.tree-meta.action-badges {
  flex-shrink: 0;
  font-size: 0.65rem;
  padding: 0.15rem 0.3rem;
  border-radius: 2rem;
  background: rgba(168, 85, 247, 0.2);
  color: #c4b5fd;
}
.zone-status {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.zone-status.ok {
  background: #4ade80;
}
.zone-status.warn {
  background: #fbbf24;
}
.action-badges {
  font-size: 0.7rem;
  color: #fcd34d;
  white-space: nowrap;
  margin-right: 0.25rem;
}
.actions-panel {
  margin: 0 0 1rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.375rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid #334155;
}
.actions-heading {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #cbd5e1;
}
.actions-badges {
  font-weight: 700;
  color: #fcd34d;
  margin-left: 0.5rem;
}
.actions-modality-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0 0 0.75rem;
}
.modality-pill {
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}
.actions-items-heading {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #93c5fd;
}
.actions-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
}
.action-item {
  margin: 0 0 0.45rem;
  padding: 0.2rem 0;
  color: #cbd5e1;
}
.action-item.action-sequence-ref {
  border-left: 3px solid #6366f1;
  padding-left: 0.5rem;
  opacity: 0.92;
}
.action-item.action-sequence {
  border-left: 3px solid #a78bfa;
  padding-left: 0.5rem;
}
.sequence-ref-badge,
.sequence-path-badge {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  color: #c4b5fd;
}
.sequence-path {
  color: #94a3b8;
  margin-left: 0.35rem;
}
.sequence-timeline {
  margin: 0.25rem 0 0.35rem;
  padding-left: 1.2rem;
  font-size: 0.72rem;
  color: #94a3b8;
}
.seq-step-num {
  color: #64748b;
  margin-right: 0.25rem;
}
.action-instruction {
  color: #94a3b8;
  display: block;
}
.instruction-timing-hint {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  color: #64748b;
}
.pause-chip {
  display: inline-block;
  margin: 0 0.2rem;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.15);
  color: #fcd34d;
}
.action-name {
  color: #fcd34d;
  display: block;
  margin-top: 0.15rem;
}
.action-modality {
  color: #64748b;
  font-size: 0.75rem;
  margin-top: 0.15rem;
}
.action-channels,
.action-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}
.action-spillover {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: #c4b5fd;
}
.action-spillover code {
  margin-right: 0.35rem;
}
.action-intensity {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  margin-top: 0.3rem;
}
.action-intensity .intensity-label {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
}
.channel-pill,
.contact-pill {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}
.contact-pill.zone-area {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}
.action-intensity .stim-s {
  font-weight: 700;
  font-size: 1rem;
  color: #fbbf24;
}
.action-intensity .stim-band {
  color: #86efac;
  font-size: 0.75rem;
}
.rubric-heading {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.rubric-badge {
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-weight: 500;
}
.rubric-badge.ok {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}
.rubric-badge.warn {
  background: rgba(251, 191, 36, 0.2);
  color: #fde68a;
}
.rubric-issues {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
  color: #fde68a;
}
.zone-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.zone-nav-pos {
  font-size: 0.8rem;
  color: #94a3b8;
  flex: 1;
  text-align: center;
  min-width: 4rem;
}
.explorer-detail {
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.7);
  padding: 0.75rem 1rem;
}
.detail-placeholder,
.detail-loading,
.detail-muted {
  color: #94a3b8;
  font-size: 0.9rem;
}
.detail-breadcrumb {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: #64748b;
}
.detail-title {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
  font-weight: 700;
}
.detail-id {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  color: #94a3b8;
}
.detail-id code {
  background: rgba(2, 6, 23, 0.8);
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
}
.detail-definition,
.detail-description,
.detail-summary {
  margin: 0 0 0.75rem;
  line-height: 1.45;
  font-size: 0.9rem;
  color: #cbd5e1;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}
.tag {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: #334155;
  color: #e2e8f0;
  text-transform: capitalize;
}
.tag-orient {
  background: rgba(168, 85, 247, 0.25);
}
.detail-path {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0 0 1rem;
  font-size: 0.85rem;
}
.detail-path dt {
  color: #64748b;
}
.detail-path dd {
  margin: 0;
}
.detail-error {
  color: #fca5a5;
}
:deep(.profile-block) {
  margin-bottom: 1rem;
}
:deep(.profile-title) {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #93c5fd;
}
:deep(.profile-dl) {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.75rem;
  margin: 0;
  font-size: 0.82rem;
}
:deep(.profile-dl dt) {
  color: #64748b;
  text-transform: capitalize;
}
:deep(.profile-dl dd) {
  margin: 0;
  color: #e2e8f0;
}
</style>
