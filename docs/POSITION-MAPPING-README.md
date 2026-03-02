# Position mapping: link descriptions to images

*File paths below are from the project root.*

**Goal:** Each **position N** in the list should match **`Position References/position N.png`**. The list had been updated with the wrong slots (same text replaced the first match instead of the slot for that position). This setup lets you fix that safely.

## Files

- **`position-entries-by-number.json`** – One entry per position. Keys are position numbers `"1"` … `"155"`. Value for each key is the **full line** for that position (same format as in `phase3-positions-data.js`). This is your mapping: edit this file to say what position N should be.
- **`scripts/apply-position-mapping.js`** – Reads the JSON and updates **only** the line in `phase3-positions-data.js` that contains `positionNumber: N` for each N. So each position is updated in the correct slot.

## How to use

1. **Edit the mapping**  
   Open `position-entries-by-number.json`. For each position N you want to fix:
   - Look at **`Position References/position N.png`**.
   - Find the position in the JSON that currently has the **correct** name/description for that image (might be under another number).
   - Copy that entry value (the whole line) and paste it as the value for key `"N"`.
   - Ensure the line ends with `positionNumber: N },` (so N is the position number you are mapping).

2. **Apply the mapping**  
   Run:
   ```bash
   node scripts/apply-position-mapping.js
   ```
   This replaces, for each N in the JSON, **only** the line in `phase3-positions-data.js` that contains `positionNumber: N`. No other lines are changed.

3. **Repeat**  
   You can edit the JSON in batches (e.g. by group or range), run the script, then edit more and run again.

## Rebuilding the mapping from scratch

The current `position-entries-by-number.json` was exported from the list as it is now (so it still has the wrong assignments). To rebuild:

- Edit the JSON: for each position N, set the value to the line that **correctly** describes **`position N.png`** (copy from another key if that line is correct for N, and change `positionNumber` in that line to N).
- Or get the correct line for position N and paste it into the file, then run the apply script.

Either way, **only the apply script should write to `phase3-positions-data.js`**, and it always targets by `positionNumber: N`, so updates go to the right slot.
