# Male techniques database

Text reference for techniques where the **receiver** has male anatomy. Most entries here are anatomically-mapped **variants of the female library**, derived from OMGYES research techniques using homologue and functional mappings:

| Female focus | Male mapping |
|--------------|--------------|
| clitoral glans | glans / corona |
| clitoral hood | foreskin |
| offset clitoral hotspot | frenulum (the "extra where it matters most") |
| vaginal entrance cycling (Shallowing) | foreskin/glans covering–uncovering |
| cervix / back-wall deep contact (Deep End) | prostate |
| perineum | perineum (shared) |
| pacing strategies (Edging, Staging, Surprise, Multiples) | anatomy-neutral, applied to penis/prostate |

## Files

| File | Role |
|------|------|
| `entries/` | One `.json` file per technique (`<technique_id>.json`) |

Each entry follows the same schema as the female library (`../female/SCHEMA.md`) and records its source in `meta.derived_from` and `meta.homologue_mapping`.

## Wired into actions

These entries are bridged into first-class, tagged actions by `src/data/anatomy/actions/omgyes-techniques.js` (exported as `omgyesTechniqueActions`, grouped by zone / family / receiver). Run `npm run audit:omgyes-techniques` to validate entries and the wired catalog.
