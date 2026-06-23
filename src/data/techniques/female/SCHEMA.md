# Female technique entry schema

Each file in `entries/` is a single JSON object.

## Required fields

| Field | Type | Notes |
|-------|------|-------|
| `technique_id` | string | Unique ID; must match filename without `.json`. Upper snake case. |
| `name` | string | Short display title |
| `receiver_anatomy` | `"female"` | Fixed for this folder |
| `summary` | string | 1–3 sentences; suitable for cards or list views |
| `stepwise_structure` | string[] | Ordered steps; prefix with `1.`, `2.`, … for consistency |

## Recommended fields

| Field | Type | Notes |
|-------|------|-------|
| `category` | string | e.g. `manual`, `oral`, `partnered`, `solo`, `communication`, `warmup` |
| `detailed_description` | string | Longer prose; technique rationale, pacing, what to notice |
| `body_areas` | string[] | Human-readable areas (e.g. `clitoris`, `vulva`, `inner thighs`) |
| `session_parameters` | object | Optional timing, frequency, environment, materials |
| `safety_notes` | string[] | Consent, pain, medical, trauma-informed cautions |
| `tags` | string[] | Free-form filters (`slow`, `non-demand`, `external`, …) |

## Optional fields

| Field | Type | Notes |
|-------|------|-------|
| `related_zone_ids` | string[] | Canonical anatomy zone IDs when applicable |
| `modality` | string | `hand`, `mouth`, `toy`, `partnered`, `mixed` |
| `references` | object[] | `{ "title": "...", "url": "...", "note": "..." }` |
| `meta` | object | Arbitrary metadata (author, version, draft flag) |

## Authoring rules

- Write for **adults in consensual contexts**; include stop/slow-down language where relevant.
- Prefer **clear, imperative steps** in `stepwise_structure` (same tone as `sensateKnowledgeBase.json`).
- Do not duplicate full sensate phase protocols here unless the technique is distinct; link by `technique_id` in `meta` if needed.
- Keep one technique per file; split variants (e.g. fast vs slow) into separate IDs.

## Example

See `_template.json` for a minimal valid entry.
