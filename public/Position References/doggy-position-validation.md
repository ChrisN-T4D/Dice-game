# Doggy position validation

Cross-check between **position-similarity-groups.md** (Section 4: Doggy / Rear entry) and **phase3-positions-data.js** / **position-entries-by-number.json** (`group: 'doggy'`).

---

## Reference (Section 4) – positions classified as Doggy / Rear entry

6, 8, 10, 11, 14, 19, 21, 22, 23, 25, 28, 32, 40, 42, 46, 55, 65, 66, 69, 70, 74, 75, 77, 78, 81, 82, 85, 94, 103, 115, 116, 128, 129, 133, 134, 140, 144, 147, 151, 153

---

## Data – positions with `group: 'doggy'`

6, 14, 19, 20, 25, 26, 40, 42, 62, 66, 70, 71, 77, 78, 83, 86, 90, 105, 107, 116, 117, 141, 144, 148, 150

---

## Match (in both reference Section 4 and data as doggy)

| Position | Notes (from reference) |
|----------|------------------------|
| 6  | Prone doggy / head down |
| 14 | Doggy, male hands on her shoulders/back |
| 19 | Doggy, male hands on her back |
| 25 | Low/stretched doggy, forearms |
| 40 | Doggy, female arched back |
| 42 | Doggy on forearms |
| 66 | Prone with male over her back / deep squat rear |
| 70 | Doggy, male with one leg raised / upright kneeling |
| 77 | Doggy, forearms down, male hands on hips |
| 78 | Deep squat doggy, intertwined |
| 116| Doggy, hands on her lower back |
| 144| Doggy on forearms, hands on her upper back / one leg lifted |

---

## In reference as Doggy (Section 4) but in data as a different group

Check image for each; if the image is clearly doggy/rear entry, consider changing data to `group: 'doggy'` (and run `node scripts/apply-position-mapping.js` after editing `position-entries-by-number.json`).

| Position | Reference note (Section 4) | Current group in data |
|----------|----------------------------|------------------------|
| 8  | Standing doggy: female hands on ground, male standing | wheelbarrow |
| 10 | Classic doggy: both kneeling, female on all fours | prone |
| 11 | Doggy with one of her legs lifted, male standing | wheelbarrow |
| 21 | Standing doggy: female bent, hands and feet on ground | standing_lift |
| 22 | Standing doggy, female deep arch, hands and feet | standing_bent_over |
| 23 | Prone: female flat on stomach, legs splayed; male on top from behind | standing_bent_over |
| 28 | Prone rear entry, female legs splayed straight back | legs_elevated |
| 32 | Standing doggy, female bent over, hands on thighs | standing_bent_over |
| 46 | Standing doggy, hands on ground, deep bend | standing_bent_over |
| 55 | Standing with kneeling partner behind (rear embrace) | (check data) |
| 65 | Doggy, both squatting/kneeling, female upright | (check data) |
| 69 | Doggy kneeling, close embrace from behind | (check data) |
| 74 | Low doggy, female head near ground, male standing | (check data) |
| 75 | Prone, male kneeling over her | (check data) |
| 81 | Prone doggy, female on forearms | (check data) |
| 82 | Standing doggy, hands on ground, hips high | (check data) |
| 85 | Doggy, female arched back, hands on ground | (check data) |
| 94 | Doggy with pillow under forearms | (check data) |
| 103| Doggy, forearms on ground | (check data) |
| 115| Prone doggy, legs splayed and bent | (check data) |
| 128| Prone doggy, male leaning over her | (check data) |
| 129| Both prone, rear entry | (check data) |
| 133| Standing rear embrace | (check data) |
| 134| Standing, female arched back, supported | (check data) |
| 140| Doggy on forearms: female on elbows/forearms | (check data) |
| 147| Doggy with one leg lifted by male | (check data) |
| 151| Doggy on forearms | (check data) |
| 153| Doggy, hands clasped at her waist | (check data) |

---

## In data as doggy but in reference under a different section

Check image; if the image is **not** doggy/rear entry, consider changing data to the group that matches the reference (Section 2 = Reverse cowgirl, Section 3 = Missionary, Section 5 = Standing, Section 6 = Elevated legs, Section 7 = Spooning).

| Position | Data name (doggy) | Reference section | Reference note |
|----------|-------------------|-------------------|----------------|
| 20 | Doggy (one leg in, one leg out) | 5. Standing | Standing, male holding her raised leg (high leg lift) |
| 26 | Doggy (squat behind) | — | Position 26 was not found in folder |
| 62 | Doggy (bed edge, kneeling on floor) | 8. Oral | Strong back-arch mutual stimulation (oral-focused) |
| 71 | Doggy (elevated legs) | 3. Missionary | Legs-up missionary, holding her thighs |
| 83 | Doggy (standing behind, side view) | 6. Elevated legs | Rear entry, bottom on back with legs raised |
| 86 | Doggy (deep arch, side view) | 2. Reverse cowgirl | Reverse cowgirl, legs splayed, hands on thighs |
| 90 | Doggy (squat behind) | 3. Missionary | Elevated missionary, male arched back |
| 105| Doggy (hands and knees, upright) | 3. Missionary | Missionary, one leg lifted and bent |
| 107| Doggy (head down, hand held) | 2. Reverse cowgirl | Reverse cowgirl, facing his feet |
| 117| Doggy (one leg around hip) | 3. Missionary | Missionary, legs raised, hands clasped |
| 141| Doggy (forearms, side view) | 7. Spooning | Side-lying rear, her leg raised on his back |
| 148| Doggy (classic) | 7. Spooning | Spooning rear entry, legs bent and intertwined |
| 150| Doggy (holding hands) | 2. Reverse cowgirl | Seated reverse cowgirl, female upright |

---

## Suggested next steps

1. **Fix likely mix-ups (reference vs data disagree on pose):**  
   For 62, 71, 83, 86, 90, 105, 107, 117, 141, 148, 150 (and 20 if image is standing leg lift), open `position N.png` and confirm whether it’s doggy or the reference section. If it’s the reference section, update the entry in `position-entries-by-number.json` to the correct group/name, then run `node scripts/apply-position-mapping.js`.

2. **Optionally align “standing doggy” with doggy:**  
   For 8, 21, 22, 32, 46 (and 133, 134 if standing rear), decide whether to keep current groups (e.g. `standing_bent_over`) or set `group: 'doggy'` so they appear under Doggy style.

3. **Fill “(check data)” for reference-doggy positions:**  
   For 55, 65, 69, 74, 75, 81, 82, 85, 94, 103, 115, 128, 129, 133, 134, 140, 147, 151, 153, look up current group in `phase3-positions-data.js` (index = position number). If the image is clearly doggy, set that entry to `group: 'doggy'` via the JSON and re-apply mapping.

4. **Position 26:**  
   Reference says “position 26 was not found” in the folder; data has “Doggy (squat behind)”. Confirm whether image 26 exists and matches.
