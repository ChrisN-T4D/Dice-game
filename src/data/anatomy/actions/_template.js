/**
 * Template chunk for an action sub-region.
 * Copy and modify this file for each action sub-region:
 *
 * arms
 * thighs
 * calves
 * feet
 * neck_throat
 * upper_back
 * torso
 * lower_body
 * head_neck
 * genitalia
 * other
 *
 * See `ACTION_SCHEMA.md` for the full rubric.
 */

/**
 * @typedef {Object} ActionObj
 * @property {string} zone_id - Canonical zone ID
 * @property {string} instruction - 1–5 prompt-ready sentences
 * @property {'stroke'|'pressure'|'circle'|'tap'|'kiss'} technique
 * @property {1|2|3} modality - 1=hand, 2=mouth, 3=teeth
 * @property {Object} stimulation - { [type]: {type, level}, ... }
 * @property {number} erogenous_weight - 0–100
 * @property {number} intensity - 10–100
 * @property {string} [meta] - Optional JSON metadata
 * @property {number} [sort_order=0] - Display order
 * @property {string} [display_name] - Human-readable name
 */

/**
 * @typedef {Object<ActionObj, ActionObj[]>} ZoneActions
 * @property {ActionObj[]} arms - actions for the `arms` sub-region
 * @property {ActionObj[]} thighs - actions for the `thighs` sub-region
 * ... (match your sub-region IDs in regions.js)
 */

import { makeAction, zoneActions as zoneActionsFactory } from './_makeAction.js'

// Example: A single `clitoral_glans` action.
//
// Full file example (for reference):
//
// const zones = {
//   clitoral_glans: [
//     makeAction({
//       zone_id: 'clitoral_glans',
//       instruction: 'Use a small soft finger to trace very light circles...',
//       technique: 'circle',
//       modality: 1,
//       stimulation: {
//         friction: { type: 'circle', level: 'high' },
//         pressure: { type: 'pressure', level: 'low' },
//       },
//       erogenous_weight: 95,
//       intensity: 60,
//       meta: JSON.stringify({ rhythm: 'slow (3–6 circles/s)', duration: '10–30s', focus: 'edge-only' }),
//     }),
//     makeAction({
//       ...
//     }),
//     // ... up to 12–20 total
//   ],
//   clitoral_hood: [
//     ...
//   ],
// }
//
// Export as a `ZoneActions` object keyed by sub-region name:
//
// export default {
//   genitalia: zones,
// }

const zones = zoneActionsFactory({
  // TODO: Populate with your sub-region's zones
  //
  // Example for `genitalia`:
  //
  // genitalia: {
  //   clitoral_glans: [
  //     makeAction({ zone_id: 'clitoral_glans', instruction: '...', technique: 'circle', modality: 1, stimulation: {...}, erogenous_weight: 95, intensity: 60 }),
  //     makeAction({ ... }),
  //     // ...
  //   ],
  //   clitoral_hood: [...],
  //   ...
  // },
})

export default zones