# Prompt data (`src/data/prompts/`)

Speakable copy and game tables live here. App code may still import legacy paths (`src/data/tables.js`, `src/data/staticPhrases.js`) that re-export from this tree.

## Layout

| Path | Purpose |
|------|---------|
| `guided/session-static.js` | Intros, ease-in, session end, phase check-in; aggregates static WAV ids |
| `guided/turn-start-directives.js` | Imperative turn-start lines (`{giver}`, `{receiver}`, `{where}`) |
| `guided/first-turn-intros.js` | First-turn spoken intros |
| `transitions/home-positions.js` | Default “home” between directions (favoritable in setup) |
| `phase12/phase-tables.js` | Phase 1/2 locations and actions |
| `phase3/positions.js` | Phase 3 position names and modifiers |
| `sensate/static-phrases.js` | Sensate preset static lines |

## Catalog

Run `npm run generate-prompt-catalog` to refresh `PROMPT-CATALOG.md` and `prompt-catalog.json` for review.

## WAV generation

Static audio uses `scripts/staticPhraseData.js` (re-exports `STATIC_GROUPS` from `guided/session-static.js`). Regenerate with `npm run generate-static-wavs`.
