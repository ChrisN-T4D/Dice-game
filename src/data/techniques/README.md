# Techniques text database

Structured reference copy for intimate techniques, separate from in-game prompt tables and anatomy action chunks.

## Layout

| Path | Purpose |
|------|---------|
| `female/` | Female-receiver technique entries (active collection) |
| `male/` | Reserved for male-receiver entries (not started) |

Each audience folder holds one JSON file per technique under `entries/`, plus schema and template files for authoring.

## Adding entries

1. Copy `female/_template.json` to `female/entries/<technique_id>.json`.
2. Fill in fields per `female/SCHEMA.md`.
3. Run `npm run techniques:validate` (when wired) or manually check JSON syntax.

Runtime code does not import this tree yet; it is a staging area for curated text you will add over time.
