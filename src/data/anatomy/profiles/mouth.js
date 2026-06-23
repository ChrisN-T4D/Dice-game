import { makeZone } from './_makeZone.js'

const BF = ['male', 'female']

export default {
  // Lips/mouth as a touch target: kissing and tongue play only. Hand and teeth
  // modalities are gated off (sensitivity_to_hand/teeth = 'low' with mouth high),
  // so buildActionsFromProfiles emits oral-only actions — this is what fixes the
  // old "foot on mouth" pairing by giving the mouth its own honest action set.
  mouth: makeZone({
    display_name: 'Mouth',
    description:
      'The lips and mouth: soft kisses, light nibbles of the lower lip, and slow tongue play. A warm, intimate place to start and to return to.',
    sensitivity: 'high',
    sensitivity_score: 64,
    orientations: BF,
    topology: { shape: 'flat', surface_area: 'small' },
    stimulation: {
      erogenous_priority: 62,
      sensitivity_to_mouth: 'high',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_hand: 'low',
      techniques: ['kiss', 'stroke', 'circle', 'tap'],
    },
    tickle: { tickle_sensitivity: 'low' },
  }),
}
