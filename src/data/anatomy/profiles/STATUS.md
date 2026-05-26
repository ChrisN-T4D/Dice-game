# Profile Chunk Checklist

Canonical zones from [`regions.js`](../regions.js): **69** unique IDs (after dedup at seed).  
Profile chunk files: **14**.

| # | Chunk file | Sub-region | Zones | Status |
|---|------------|------------|-------|--------|
| 1 | `clitoris_hierarchy.js` | External clitoral/labial | 5 | done |
| 2 | `vagina_hierarchy.js` | Vaginal/cervical | 8 | done |
| 3 | `perineum_mons.js` | Perineum, mons | 2 | done |
| 4 | `penis_hierarchy.js` | Penis external | 7 | done |
| 5 | `scrotum_testicles.js` | Scrotum, testicles, prostate | 3 | done |
| 6 | `upper_body.js` | Chest/abdomen | 11 | done |
| 7 | `lower_body.js` | Flanks/buttocks | 10 | done |
| 8 | `upper_back.js` | Back/spine | 6 | done |
| 9 | `thighs.js` | Thighs, knees | 3 | done |
| 10 | `neck.js` | Neck/throat | 3 | done |
| 11 | `ears.js` | Ears | 1 | done |
| 12 | `arms.js` | Arms (elbows, forearms, inner arms) | 3 | done |
| 13 | `calves.js` | Calves, shins | 2 | done |
| 14 | `feet.js` | Ankles, feet, soles, toes | 4 | done |

## Verify

```powershell
npm run audit:anatomy-profiles
npm run validate:anatomy-profiles
npm run db:seed
npm run api:dev
npm run dev
```

Admin: `http://localhost:3000/#admin` — tree order is **head/neck → torso → back → genitalia → limbs**. Green dot = profile complete; yellow = needs review. Use **Next →** to walk all 69 zones in body order. Detail panel shows **Profile criteria** pass/fail.

## Dedup notes

- `perineum`, `bulb_of_penis`: only in `perineum_mons` / `penis_hierarchy` (removed from scrotum list).
- `hips`: only in `lower_body` (removed from `upper_body`).
- `hips_buttocks` sub-region kept for taxonomy but has empty `primary_anatomy_names`.
