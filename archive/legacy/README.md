# Legacy vanilla app (reference only)

This folder is the **pre-Vue** implementation. The shipped app is under `src/`; **do not** add `import` paths from `src/` into `archive/legacy/`.

- **Run locally:** open `archive/legacy/index-legacy.html` from the repo (or serve the repo root). Scripts load as siblings in `archive/legacy/`; Phase 3 data loads from **`../../phase3-positions-data.js`** at the repo root.
- **New features** belong in Vue.
- **Full UI/state narrative:** [docs/UI-AND-STATE-FLOW.md](../../docs/UI-AND-STATE-FLOW.md)

## File index → Vue counterparts

| File | Responsibility |
|------|----------------|
| `index-legacy.html` | HTML shell, large inline CSS, script tags for all legacy modules |
| `main.js` | Initial UI, mode switching, wiring to state |
| `state.js` | Central vanilla state object and persistence hooks |
| `free-play.js` | Free-play (dice) phase UI and rolls |
| `guided-mode.js` | Guided session timing, prompts, step machine |
| `clothing.js` | Clothing removal table usage |
| `tables.js` | Phase 1/2 tables and related lookups |
| `prompt-help.js` | Building prompt / instruction copy |
| `speech.js` | Legacy speech/TTS integration |
| `ui-helpers.js` | Shared DOM helpers |
| `phase3-anatomy.js` | Phase 3 anatomy tagging helpers |

Vue mapping detail: see **Legacy → Vue map** in [docs/UI-AND-STATE-FLOW.md](../../docs/UI-AND-STATE-FLOW.md).
