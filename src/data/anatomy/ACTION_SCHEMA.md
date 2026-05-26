# Action Schema & Rubric

Concrete stimulation actions per zone. Authored in `actions/<sub_region>.js`, seeded to `stimulation_actions`.

## Perceived stimulation model

\[
S = k \,(P_{\text{eff}} \cdot v)^{n}
\]

| Symbol | Source |
|--------|--------|
| **S** | Computed perceived stimulation (0–100); shown in admin as primary intensity |
| **P** | `stimulation.pressure.level` → scalar (`very_low` 0.15 … `high` 0.85) |
| **v** | `stimulation.tempo.level` → speed/tempo scalar |
| **P_eff** | `P × contactPressureFactor(contact, zone.topology)` |
| **k** | Zone gain from `erogenous_priority` + `sensitivity_to_pressure` |
| **n** | Zone exponent (high-sensate ≈ 1.15, moderate 1.0, low 0.85) |

Implementation: [`stimulation-math.js`](stimulation-math.js). Optional `stimulation.friction` applies a small multiplier on S for display/prompts.

**Zone topology** (DB `zone_topology`): `typical_contact_fu`, `max_contact_fu`, `contact_extent`, `shape`, `surface_area`. **1 FU** ≈ one finger width at contact.

**Stimulator contact** ([`contact-scale.js`](contact-scale.js)): pad FU and `placement_accuracy` apply only to the **stimulating body part** (`fingertip`, `finger`, `thumb`, `palm`, `toe`, `lip`, `tongue`, `teeth`, `breath`) — not the receiving zone. `modality` remains the technique channel (`hand` / `mouth` / `teeth`).

**Spillover:** required whenever effective stimulator pad FU **>** zone `typical_contact_fu`. Set `also_stimulates: ['other_zone_id']` (e.g. hood lip kiss → `clitoral_glans`).

## Per-action object shape

```js
makeAction({
  zone_id: 'clitoral_hood',
  instruction: '…',
  technique: 'kiss',
  stimulator: 'lip',
  modality: 'mouth',
  stimulation: {
    pressure: { level: 'low' },
    tempo: { level: 'low' },
    friction: { level: 'medium' },
  },
  contact: {
    footprint: 'patch',
    coverage: 'partial',
  },
  also_stimulates: ['clitoral_glans'],
  spillover_weight: { clitoral_glans: 0.75 },
  erogenous_weight: 74,
  sort_order: 0,
})
```

- **pressure** + **tempo**: required (map to P and v).
- **friction**: recommended second channel for rubric.
- **contact**: required; audit blocks teeth + enveloping/full on small zones.
- **intensity**: optional legacy DB column; seed defaults to computed S.

## Allowed values

**Techniques:** `stroke`, `pressure`, `circle`, `tap`, `kiss`

**Modalities:** `hand`, `mouth`, `teeth`

**Levels:** `very_low`, `low`, `medium`, `high`

**Contact footprint:** `point`, `linear`, `patch`, `enveloping`

**Contact coverage:** `edge_only`, `partial`, `full`

## Per-zone action counts

- **All zones:** 6–10 actions (enforced by `action-audit.js` and `actions/_actionKit.js`)
- **Uniqueness:** each action must differ in sensation profile (technique + stimulator + contact + pressure/tempo/friction) and instruction text (`actions/action-uniqueness.js`)
- **Instructions:** human how-to copy combines motion + zone placement (`actions/zone-placement.js`, `actions/instruction-compose.js`)—e.g. throat actions name the hollow beside the windpipe and forbid midline/windpipe contact

## Multi-zone sequences (50–100 catalog)

Ordered paths (e.g. nipple → areola → breast) authored in [`actions/sequences/`](actions/sequences/) via `makeSequenceAction()` ([`_makeSequenceAction.js`](actions/_makeSequenceAction.js)).

| Field | Meaning |
|-------|---------|
| `meta.action_kind` | `'sequence'` |
| `zone_id` | **Anchor** zone (listed under this zone in admin) |
| `meta.sequence_zones` | Ordered zone ids |
| `meta.sequence_steps` | Per-leg technique, stimulator, contact, beats, cue |
| `also_stimulates` | Always `[]` — spillover is expressed as the next step, not physics spillover |

- **Instruction max:** 520 chars (`sequence-instruction-compose.js`). Two spoken flows (`meta.sequence_flow`):
  - **`progression`** (discrete): place anchor → action. Anchors use consumer directions (front/back/sides/inner) plus sensory descriptors (soft, meaty, crease)—see `ANCHOR_HINTS` in `sequence-anchor-phrasing.js`. Example: `Put your thumbs on the back of the neck, on the soft meaty pads just above each collarbone, beside the spine. Knead deeply.`
  - **`sweep`** (contiguous paths, 2–3 zones): one pass through the path, then retrace — e.g. shaft through head, then back down the shaft. Inferred from zone adjacency unless `flow` is set on the sequence def.
- Safety copy only on the opening line.
- **Sensual modifiers:** `sensual-phrasing.js` leaves most cues plain; ~1 accent step per sequence (or a refined author adverb) gets a modifier chosen for the motion—e.g. `teasingly` for taps, `hungrily`/`greedily` on high zones, `slow` circles for opening.
- **Step timing (audio):** After each step (before the next), composed copy adds a spoken hold line plus `[pause:7s]` (5–10s from step `beats`). `meta.instruction_parts` lists `{ type: 'speak' | 'pause' }` for TTS (`parseInstructionWithPauses` in `src/utils/instructionTts.js`).
- **Intensity S:** beats-weighted average across steps (`computeSequenceStimulation()`)
- **Admin:** anchor zone shows full timeline; secondary zones show “Sequence · starts at **anchor**”
- **Audit:** `npm run audit:anatomy-sequences` (excluded from per-zone 6–10 single-action count)

## Workflow

1. Create `actions/<sub_region>.js` using `makeAction()` from [`_makeAction.js`](actions/_makeAction.js)
2. Register in [`actions/index.js`](actions/index.js)
3. `npm run validate:anatomy-actions`
4. `npm run audit:anatomy-actions`
5. `npm run actions:seed`
6. Admin → zone → verify channels, contact, and **S**

## Game integration hooks

- **S bands** (`stimulationBand`): `light` (&lt;25), `building` (25–49), `strong` (50–74), `intense` (75+)
- **Prompt text:** `instruction` + band label + modality
- **Dice / phase filters:** pick actions where `perceived_stimulation` is within session target range
- **Zone pick:** `phase12_location_aliases` → zone id → filter actions by modality and S
- **Player tuning (future):** override `k` and `n` per session; zone profile remains baseline
