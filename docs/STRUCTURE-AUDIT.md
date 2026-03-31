# Structure audit (maintainability)

Separate from the security track. This document records Pass 1 inventory, agreed conventions, cleanup batches, and remaining debt.

**UI / UX state flow (navigation, portals, store map):** [UI-AND-STATE-FLOW.md](./UI-AND-STATE-FLOW.md).

---

## Pass 1: Repository map and inventory

### Entry and major modules

| Area | Role |
|------|------|
| `index.html` → `src/main.js` | Vue mount, Pinia, global error handler |
| `src/App.vue` | Root: `#admin` → AdminView; else onboarding → landing → FreePlayView / GuidedModeView |
| `src/stores/session.js` | Phase, roll count, UI mode (freeplay/guided), landing |
| `src/stores/preferences.js` | Names, anatomy, voice, music, background |
| `src/stores/profile.js` | Onboarding, suggested mode |
| `src/stores/guided.js` | Guided config, turns, breaks, TTS coordination |
| `src/composables/useSpeech.js` | TTS worker, Piper/Kokoro/Edge, speak/prepare |
| `src/composables/useBackgroundMusic.js` | Playlist and playback |

### `legacy/` coupling

- **No** `src/` imports from legacy code (now under `archive/legacy/`).
- References: comment in `src/utils/bodyPartRollExclusions.js` (ported-from note); UI/docs may mention `archive/legacy/index-legacy.html` for comparison.

### Dead / removed candidates

| Item | Finding | Action |
|------|---------|--------|
| `src/components/GuidedPlaceholder.vue` | Not imported anywhere | **Removed** (Batch A) |

### Duplicate concepts (canonical owner)

| Concept | Locations | Recommendation |
|---------|-----------|----------------|
| Body-part roll exclusions | `bodyPartRollExclusions.js` used by guided store and `sessionPlanBuilder.js` | **Keep** shared util; single source of truth |
| Prompt text | `promptHelper.js` | **Canonical** for in-game strings |
| Static phrase IDs / text | `src/data/staticPhrases.js` + `scripts/staticPhraseData.js` | Keep in sync when changing copy (documented in README) |

### `scripts/` vs runtime

- **Build path:** `copy-public-assets.js`, `list-music.js` run from `npm run build`.
- **Audio:** `generate-static-wavs.js`, `check-static-wavs.js`, `pack-audio-assets.js`, and per-phrase generators — maintained for assets; ONNX/tokenizer scripts are dev-only debugging.

---

## Pass 2: Lightweight conventions

Aligned with README **Code layout conventions**:

1. **Stores** — Persisted shapes and game orchestration (rolls, prompts, timers).
2. **Composables** — Browser APIs: speech, music; thin glue to stores.
3. **Utils** — Pure logic, persistence adapters, admin merges; shared roll filters when used in more than one place.
4. **`archive/legacy/`** — Reference-only; not part of the Vue dependency graph.

---

## Pass 3: Cleanup batches

### Batch A (low risk)

- Remove unused `GuidedPlaceholder.vue`.
- README: project tree, conventions, scripts table, Docker step numbering, `archive/legacy/` and `server/` clarity.
- Add `archive/legacy/README.md`.

**Verification:** `npm run build`; smoke: open app, freeplay roll, guided setup start, preferences.

### Batch B (medium)

- No behavioral refactors required for this audit; duplicate helpers already centralized where identified.
- Deferred: splitting oversized files (e.g. very large single components/stores) — only when a future change needs it.

### Batch C (optional legacy quarantine)

- **Done in-repo:** legacy code moved to `archive/legacy/`; `archive/legacy/index-legacy.html` relative paths updated (`../../phase3-positions-data.js`, background assets).
- **Done in-repo:** `archive/legacy/README.md` index + README statement that `src/` does not import legacy code.

---

## Pass 4–5: Doc alignment and final summary

### Documentation updated

- `README.md` — Structure tree, conventions, scripts (maintained vs dev), deploy list numbering.
- `archive/legacy/README.md` — Purpose and import policy.
- This file — Inventory, batches, debt.

### Remaining tech debt (ranked)

1. **Large files** — `stores/guided.js` and similar: split only when maintainability demands it.
2. **Script sprawl** — Many `generate-static-*` entries in `package.json`; acceptable; `generate-all` / `run-generate-sequence` documents batch runs.

### Deferred (intentional)

- Renaming symbols for style-only consistency.
- Large UX/game-logic rewrites.

---

*Generated as part of the structure audit; keep in sync when layout or policies change.*
