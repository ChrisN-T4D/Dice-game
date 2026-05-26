import { makeZone } from './_makeZone.js'

const BF = ['male', 'female']

export default {
  calves: makeZone({
    display_name: 'Calves',
    description:
      'Gastrocnemius and soleus—firm muscle bellies; massage, kneading, and trailing nails down the back of the lower leg.',
    sensitivity: 'medium',
    sensitivity_score: 52,
    orientations: BF,
    musculoskeletal: { muscle_massagability: 'high', muscle_tension_level: 'medium' },
    stimulation: { erogenous_priority: 50, sensitivity_to_pressure: 'medium', sensitivity_to_hand: 'high' },
    techniques: ['pressure', 'stroke'],
  }),
  shins: makeZone({
    display_name: 'Shins',
    description: 'Anterior lower leg over tibia; thin skin, bony—light strokes only, rarely a primary erogenous focus.',
    sensitivity: 'low',
    sensitivity_score: 32,
    orientations: BF,
    musculoskeletal: { bone_proximity: 'high', skin_thickness: 'low' },
    stimulation: { erogenous_priority: 28, sensitivity_to_pressure: 'low' },
    techniques: ['stroke'],
  }),
}
