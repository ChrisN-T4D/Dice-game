import { makeZone } from './_makeZone.js'

const BF = ['male', 'female']

export default {
  ears: makeZone({
    display_name: 'Ears',
    description:
      'Outer ear and lobe; whispering, nibbling the lobe, and tracing the helix with warm breath and tongue.',
    sensitivity: 'medium',
    sensitivity_score: 68,
    orientations: BF,
    topology: { shape: 'concave', surface_area: 'small' },
    stimulation: {
      erogenous_priority: 70,
      sensitivity_to_mouth: 'high',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_hand: 'medium',
    },
    techniques: ['kiss', 'stroke'],
    tickle: { tickle_sensitivity: 'medium' },
  }),
}
