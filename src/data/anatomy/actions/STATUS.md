# Action Chunk Status

Track per-sub-region action chunk progress.

## Sub-region layout

```text
src/data/anatomy/actions/
├── index.js                          (main aggregator)
├── _makeAction.js                    (utility)
├── _template.js                      (example)
├── ACTION_SCHEMA.md                  (rubric; see above for details)
├── STATUS.md                         (this file)
├── genitalia.js                      (13 canonical zones)
├── head_neck.js                      (4 canonical zones)
├── upper_back.js                     (6 canonical zones)
├── torso.js                          (12 canonical zones; note: hips is in lower_body)
├── lower_body.js                     (10 canonical zones)
├── thighs.js                         (3 canonical zones)
├── calves.js                         (2 canonical zones)
├── feet.js                           (4 canonical zones)
├── arms.js                           (3 canonical zones)
├── neck_throat.js                    (3 canonical zones)
└── other.js                          (2 canonical zones)
```

## Canonical zones per sub-region

| Sub-region | Zone IDs | Count |
|------------|----------|-------|
| `genitalia` (parent_region: `genitalia`) | `clitoral_hood`, `clitoral_glans`, `labia_minora`, `labia_majora`, `vestibular_bulbs`, `vagina`, `vaginal_anterior_wall`, `vaginal_posterior_wall`, `vaginal_lateral_wall`, `vaginal_introitus`, `cervix`, `cervical_os`, `vestibule`, `penis`, `penis_glans`, `penis_shaft`, `foreskin`, `frenulum`, `urethral_meatus`, `bulb_of_penis`, `testicles`, `scrotum`, `prostate` | 22 |
| `head_neck` (parent_region: `head_neck`) | `neck`, `throat`, `base_of_neck`, `ears` | 4 |
| `upper_back` (parent_region: `back`) | `back`, `upper_back`, `lower_back`, `spine`, `sacrum`, `coccyx` | 6 |
| `torso` (parent_region: `torso`) | `nipple`, `areola`, `breast_tissue`, `chest`, `shoulders`, `clavicle`, `deltoid`, `stomach`, `upper_abdomen`, `lower_abdomen`, `hip_bone`, `groin` | 12 |
| `lower_body` (parent_region: `torso`) | `sides`, `flank`, `ribcage`, `hips`, `buttocks`, `gluteus_maximus`, `gluteus_medius`, `gluteus_minimus`, `buttock_crease`, `buttock_pad` | 10 |
| `thighs` (parent_region: `limbs`) | `inner_thighs`, `outer_thighs`, `knees` | 3 |
| `calves` (parent_region: `limbs`) | `calves`, `shins` | 2 |
| `feet` (parent_region: `limbs`) | `ankles`, `feet`, `soles`, `toes` | 4 |
| `arms` (parent_region: `limbs`) | `elbows`, `forearms`, `inner_arms` | 3 |
| `neck_throat` (parent_region: `head_neck`) - legacy, merged with `head_neck` | — | 0 |
| `other` (parent_region: `other`) | `armpits` (from `axilla`), `groin` (from `inner_thighs`/`limbs`) | 2 |

**Total canonical zones:** 69

## Action count targets per zone

| Zone type | Action count |
|-----------|-------------|
| **All body parts** | **6–10** |

Generated baselines use `actions/_actionKit.js`; hand-authored pilots (e.g. `clitoris_hierarchy.js`) must stay in range.

## Example: `genitalia` pilot zone

**Target:** 6–10 actions per zone (e.g. `clitoral_glans`)

See `ACTION_SCHEMA.md` section "Example: `clitoral_glans` action chunk" for the full shape.

## Workflow per sub-region

1. Create `src/data/anatomy/actions/<sub_region>.js`
2. Fill using `_makeAction()` helper
3. Export via `src/data/anatomy/actions/index.js`
4. Run `npm run actions:seed`
5. Run `npm run dev` + `npm run api:dev`
6. Open `http://localhost:3000/#admin` → click zone → expand "Actions" → verify
7. Run `npm run audit:anatomy-actions`

## Progress tracker (actions_per_zone)

```text
genitalia:
  └── clitoral_hood: 0
  └── clitoral_glans: 0
  └── labia_minora: 0
  └── labia_majora: 0
  └── vestibular_bulbs: 0
  └── vagina: 0
  └── vaginal_anterior_wall: 0
  └── vaginal_posterior_wall: 0
  └── vaginal_lateral_wall: 0
  └── vaginal_introitus: 0
  └── cervix: 0
  └── cervical_os: 0
  └── vestibule: 0
  └── penis: 0
  └── penis_glans: 0
  └── penis_shaft: 0
  └── foreskin: 0
  └── frenulum: 0
  └── urethral_meatus: 0
  └── bulb_of_penis: 0
  └── testicles: 0
  └── scrotum: 0
  └── prostate: 0

head_neck:
  └── neck: 0
  └── throat: 0
  └── base_of_neck: 0
  └── ears: 0

upper_back:
  └── back: 0
  └── upper_back: 0
  └── lower_back: 0
  └── spine: 0
  └── sacrum: 0
  └── coccyx: 0

torso:
  └── nipple: 0
  └── areola: 0
  └── breast_tissue: 0
  └── chest: 0
  └── shoulders: 0
  └── clavicle: 0
  └── deltoid: 0
  └── stomach: 0
  └── upper_abdomen: 0
  └── lower_abdomen: 0
  └── hip_bone: 0
  └── groin: 0

lower_body:
  └── sides: 0
  └── flank: 0
  └── ribcage: 0
  └── hips: 0
  └── buttocks: 0
  └── gluteus_maximus: 0
  └── gluteus_medius: 0
  └── gluteus_minimus: 0
  └── buttock_crease: 0
  └── buttock_pad: 0

thighs:
  └── inner_thighs: 0
  └── outer_thighs: 0
  └── knees: 0

calves:
  └── calves: 0
  └── shins: 0

feet:
  └── ankles: 0
  └── feet: 0
  └── soles: 0
  └── toes: 0

arms:
  └── elbows: 0
  └── forearms: 0
  └── inner_arms: 0

other:
  └── armpits: 0
```

## Notes

- Actions use `{ modality: 1/2/3 }` for `hand/mouth/teeth`, not `modality_type` strings.
- `stimulation` composite: `{ type: { type, level } }` where `type`∈`['pressure','friction','circle','tap','kiss']` and `level`∈`['low','medium','high']`.
- `technique` ∈ `['stroke','pressure','circle','tap','kiss']` (matches `techniques` table).
- Use `_makeAction()` for shape consistency.
- See `ACTION_SCHEMA.md` for full rubric and example.
