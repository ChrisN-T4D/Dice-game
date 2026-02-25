# Position data: single source of truth

**Use one place only** so you don’t redo work or overwrite edits.

---

## Source of truth: `phase3-positions-data.js`

All position names, descriptions, and groups live in **`phase3-positions-data.js`** in the `PHASE3_POSITIONS_LIST` array (around lines 32–188).  
The app uses this file at runtime.

- **Edit there:** search for `positionNumber: N` to find the line for position N. Change `name`, `help`, `description`, `group`, etc. on that line.
- **Image reference:** position N in the list corresponds to **`Position References/position N.png`** (and to the 8 groups in `position-similarity-groups.md`).

---

## Syncing the JSON file

**`position-entries-by-number.json`** is a copy of that data, used by the apply script and the similarity-group check script.

**After you edit `phase3-positions-data.js`**, regenerate the JSON so both stay in sync:

```bash
node scripts/export-positions-from-js.js
```

That reads the JS file and overwrites `position-entries-by-number.json`. Run it whenever you’ve finished editing positions in the JS file.

---

## Scripts

| Script | Purpose |
|--------|--------|
| **export-positions-from-js.js** | **Use this.** Copies data from `phase3-positions-data.js` → `position-entries-by-number.json`. Run after editing the JS file. |
| compare-ref-to-data.js | Compares `position-similarity-groups.md` to the JS data; lists positions where name/group likely don’t match the ref (unsynced edits). Run: `node scripts/compare-ref-to-data.js`; optional: redirect to `Position References/ref-vs-data-mismatches.txt`. |
| apply-position-mapping.js | Copies data from `position-entries-by-number.json` → `phase3-positions-data.js`. Only use if you intentionally edited the JSON and want to push those edits into the JS file. |
| check-similarity-groups.js | Compares the 8 position-similarity groups (reference) to the data; run after syncing if you want to see remaining mismatches. |

---

## Summary

1. **Edit only** `phase3-positions-data.js` (the `PHASE3_POSITIONS_LIST` entries).
2. **Then run** `node scripts/export-positions-from-js.js` to update the JSON.
3. Don’t edit the JSON for position content unless you plan to run `apply-position-mapping.js` to push those edits back into the JS file.
