# Female techniques database

Text reference for techniques where the **receiver** has female anatomy. Use this folder to build a series of standalone entries before they are wired into guided mode, sensate presets, or anatomy actions.

## Files

| File | Role |
|------|------|
| `SCHEMA.md` | Field definitions and authoring rules |
| `_template.json` | Copy-paste starter for a new entry |
| `entries/` | One `.json` file per technique (`<technique_id>.json`) |

## Workflow

1. Choose a stable `technique_id` (upper snake case, e.g. `CLITORAL_CIRCLES_SLOW`).
2. Duplicate `_template.json` → `entries/<technique_id>.json`.
3. Complete all required fields; keep `receiver_anatomy` as `"female"`.
4. Optional: set `related_zone_ids` to link anatomy zones (see `src/data/anatomy/regions.js`).

## Related data elsewhere

- **Sensate presets:** `src/data/sensateKnowledgeBase.json` — session-level exercises (turn-taking, phases).
- **Zone actions:** `src/data/anatomy/actions/` — prompt-ready per-zone instructions.
- **This folder:** technique-level reference text (methods, steps, safety, context) that may later feed those systems.
