# Anatomy Profile Schema & Rubric

Use this rubric when filling chunk profile files. Keep entries consistent, not clinical.

## Allowed enum values (match exactly what `scripts/seed-anatomy.mjs` inserts)

**sensitivity_level:** `low` | `medium` | `high`
- Used by `sensitivity_levels` table; maps to sensitivity score buckets:
  - `low` → score 20–40 (bone/low-nerve density)
  - `medium` → score 50–70 (normal skin, moderate arousal weight)
  - `high` → score 80–100 (glans/frenulum; mouth/hand friction/pressure high)

**sensitivity scores for stimulation fields (0–100):**
- `erogenous_priority`: 0–100, higher = more arousal focus; keep in line with anatomy (glans/frenulum clitoris 80–100, thighs 40–60, clavicle 20–40)
- `sensitivity_to_pressure`, `sensitivity_to_friction`, `sensitivity_to_teeth`, `sensitivity_to_mouth`, `sensitivity_to_hand`:
  - `low` | `medium` | `high` (e.g. glans: friction/mouth = `high`; teeth = `low`; clavicle: pressure = `low`, teeth = `low`)

**techniques arrays for each zone:** subset of `['stroke','pressure','circle','tap','kiss']`
- Order matters: most arousing / preferred first. Example:
  - Clitoral glans: `['circle','stroke','kiss']`
  - Nipple: `['circle','tap','pressure']`

**topology fields:** `surface_area|curvature|flexibility|depth|shape|contact_extent|typical_contact_fu|max_contact_fu`
- **typical_contact_fu:** finger-width scale (clitoral glans ~0.5, penis glans ~2, labia majora ~2.5, full back canvas ~18)
- **surface_area:** `small|medium|large|canvas` — `canvas` maps to ~18 FU for the full back; use explicit `typical_contact_fu` for sub-regions (upper back ~10, lower back ~8)
- **contact_extent:** `micro|narrow|modest|broad|extended` (auto-derived from FU if omitted)
- **shape:** use `linear` for minora/hood strips, `convex` for glans

**musculoskeletal fields:** `muscle_massagability|muscle_tension_level|skin_texture|fat_density|bone_proximity|skin_thickness`
- Levels: use `low` | `medium` | `high` (not `slight` or `thin`). `skin_texture` uses `fine` | `medium` | `coarse`.
- Example: glutes = massagability `high`, bone = `low`; clavicle = bone_proximity `high`

**tickle fields:** `tickle_sensitivity|tickle_preference|tickle_zone_type|tickle_texture|tickle_response`
- Example: inner arm = tickle_sensitivity `high`; genital glans = `low` or `medium`

**orientations per zone:**
- `['male']` or `['female']` for exclusive sub-regions
- `['male', 'female']` for everything else

---

## Sensate touch guidelines (for description + profile ratings)

Separate high-sensate zones that behave differently:

| Zone pair | Why distinct |
|-----------|--------------|
| `clitoral_glans` vs `clitoral_hood` | Glans = highest friction/mouth sensitivity; hood = softer, larger surface area |
| `vagina` vs `vaginal_introitus` | Introitus = external/pressure/mouth focus; deeper vaginal walls = more pressure/deep stimulation, less teeth/mouth |
| `penis_glans` vs `penis_shaft` | Glans = friction/mouth high; shaft = pressure moderate; frenulum = one of highest friction |
| `labia_minora` vs `labia_majora` | Minora = thin, high nerve density; majora = more cushion/fat, lower sensitivity |
| `buttocks` (glutes/pad) vs `buttock_crease` | Glutes/buttocks_pad = massagable + moderate-high erogenous for hand pressure; crease = pressure/friction focal point |

### Oral vs hand vs teeth

- **Mouth/lips:** Glans/frenulum = `high`; inner thigh/neck/throat = `medium`–`high`; bone/ribs/spine = `low`–`medium`
- **Hand:** Frenulum/glans = `high` (stroking/circle); thighs/buttocks = `medium`–`high` (palms/forefingers); inner arms = `low`–`medium`
- **Teeth:** Most high-sensate zones avoid teeth (`low`), unless specified (e.g. `throat` = `medium`); `clitoris_glans` = `low` to avoid overstimulation

---

## Per-zone object shape (copy-paste template)

```js
// zone_id must match regions.js primary_anatomy_names
export const zones = {
  clitoral_glans: {
    display_name: 'Clitoral glans',
    description: 'Sensitive clitoral tip; small, rounded, responds strongly to friction and oral contact. Often the primary focus for intimate touch.',
    // Sensitivity level & numeric score
    sensitivity: 'high',
    sensitivity_score: 95,
    orientations: ['female'],
    // Topology
    topology: {
      surface_area: 'small',
      curvature: 'slight',
      flexibility: 'flexible',
      depth: 'shallow',
      shape: 'convex',
    },
    // Stimulation
    stimulation: {
      erogenous_priority: 95,
      sensitivity_to_pressure: 'medium',   // soft contact
      sensitivity_to_friction: 'high',    // circle/stroke
      sensitivity_to_teeth: 'low',        // avoid overstimulation
      sensitivity_to_mouth: 'high',       // luscious, oral focus
      sensitivity_to_hand: 'high',        // stroking/circle
    },
    techniques: ['circle', 'stroke', 'kiss'], // ordered
    // Musculoskeletal
    musculoskeletal: {
      muscle_massagability: 'low',
      muscle_tension_level: 'medium',
      skin_texture: 'fine',
      fat_density: 'medium',
      bone_proximity: 'low',
      skin_thickness: 'medium',
    },
    // Tickle
    tickle: {
      tickle_sensitivity: 'medium',
      tickle_preference: 'medium',
      tickle_zone_type: 'flat',
      tickle_texture: 'fine',
      tickle_response: 'medium',
    },
  },
}
```

---

## Writing descriptions (useful for prompt generation)

Keep them 1–3 short sentences, sensual but usable:

- ✅ "Clitoral glans: Sensitive clitoral tip; small, rounded. Responds strongly to friction and oral contact. Often the primary focus for intimate touch."
- ❌ "The clitoral glans is the distal end of the clitoris, containing the highest concentration of nerve endings." (too clinical)

Use terms you can naturally plug into future prompts: *"soft and yielding,"* *"velvety,"* *"warm and responsive,"* and avoid *"tactile," "haptic,"* or medical jargon.

---

## Canonical zones list (from `regions.js`; keep these IDs)

**clitoris hierarchy (5):** `clitoral_hood`, `clitoral_glans`, `labia_minora`, `labia_majora`, `vestibular_bulbs`
- `genitalia` sub-region.

**vagina hierarchy (8):** `vagina`, `vaginal_anterior_wall`, `vaginal_posterior_wall`, `vaginal_lateral_wall`, `vaginal_introitus`, `cervix`, `cervical_os`, `vestibule`
- `genitalia` sub-region.

**perineum/mons (2):** `perineum`, `mons_pubis`
- `genitalia` sub-region.

**penis hierarchy (7):** `penis`, `penis_glans`, `penis_shaft`, `foreskin`, `frenulum`, `urethral_meatus`, `bulb_of_penis`
- `genitalia` sub-region.

**scrotum/testicles/prostate (4 canonical; 3 in file + 1 shared):** `testicles`, `scrotum`, `prostate`
- `genitalia` sub-region. Note: `bulb_of_penis` is also seeded by `penis_hierarchy`; keep it there only.

**upper body (12):** `nipple`, `areola`, `breast_tissue`, `chest`, `shoulders`, `clavicle`, `deltoid`, `stomach`, `upper_abdomen`, `lower_abdomen`, `hip_bone`, `groin`
- `torso` sub-region (`hips` is in `lower_body`).

**lower body (10):** `sides`, `flank`, `ribcage`, `hips`, `buttocks`, `gluteus_maximus`, `gluteus_medius`, `gluteus_minimus`, `buttock_crease`, `buttock_pad`
- `torso` sub-region.

**upper back (6):** `back`, `upper_back`, `lower_back`, `spine`, `sacrum`, `coccyx`
- `back` sub-region.

**thighs (3):** `inner_thighs`, `outer_thighs`, `knees`
- `limbs` sub-region.

**calves (2):** `calves`, `shins` — **feet (4):** `ankles`, `feet`, `soles`, `toes`
- `limbs` sub-region.

**neck/throat (3):** `neck`, `throat`, `base_of_neck` — **ears (1):** `ears`
- `head_neck` sub-region.

**arms (3):** `elbows`, `forearms`, `inner_arms`
- `limbs` sub-region.

**Total:** 69 canonical zone IDs. Run `npm run audit:anatomy-profiles` after edits.

---

## Chunk workflow per file

1. Edit only `src/data/anatomy/profiles/<sub_region>.js`.
2. After edit: `npm run db:seed`
3. Run `npm run dev` + `npm run api:dev`
4. Open `http://localhost:3000/#admin`
5. Unlock → expand tree → click each zone → confirm unique, non-default profiles.
6. Mark done in `STATUS.md`.
