import { makeZone } from './_makeZone.js'

const BF = ['male', 'female']

export default {
  inner_thighs: makeZone({
    display_name: 'Inner thighs',
    description:
      'Soft inner leg from groin to knee; highly erogenous—feather strokes, kisses, and breath teasing toward genitals.',
    sensitivity: 'high',
    sensitivity_score: 80,
    orientations: BF,
    stimulation: { erogenous_priority: 82, sensitivity_to_friction: 'high', sensitivity_to_mouth: 'high', sensitivity_to_hand: 'high' },
    techniques: ['stroke', 'kiss', 'circle'],
    tickle: { tickle_sensitivity: 'medium' },
  }),
  outer_thighs: makeZone({
    display_name: 'Outer thighs',
    description: 'Lateral thigh with firmer muscle; pleasant for squeezing, massage, and gripping during positions.',
    sensitivity: 'medium',
    sensitivity_score: 52,
    orientations: BF,
    musculoskeletal: { muscle_massagability: 'high' },
    techniques: ['pressure', 'stroke'],
  }),
  knees: makeZone({
    display_name: 'Knees',
    description: 'Knee caps and hollows; bony—light caress only, rarely a focus of sensual play.',
    sensitivity: 'low',
    sensitivity_score: 28,
    orientations: BF,
    musculoskeletal: { bone_proximity: 'high' },
    stimulation: { erogenous_priority: 25, sensitivity_to_pressure: 'low' },
    techniques: ['stroke'],
  }),
}
