import { makeZone } from './_makeZone.js'

const BF = ['male', 'female']

export default {
  forearms: makeZone({
    display_name: 'Forearms',
    description: 'Forearm inside and outside; pleasant for stroking, gripping, and light scratches during embrace.',
    sensitivity: 'medium',
    sensitivity_score: 50,
    orientations: BF,
    musculoskeletal: { muscle_massagability: 'medium', skin_texture: 'fine' },
    stimulation: { erogenous_priority: 48, sensitivity_to_friction: 'medium', sensitivity_to_hand: 'high' },
    techniques: ['stroke', 'pressure'],
  }),
  inner_arms: makeZone({
    display_name: 'Inner arms',
    description: 'Soft inner upper arm to the elbow; thin skin—feather touch and kisses along the crease.',
    sensitivity: 'medium',
    sensitivity_score: 58,
    orientations: BF,
    musculoskeletal: { skin_texture: 'fine', fat_density: 'low' },
    stimulation: { erogenous_priority: 56, sensitivity_to_mouth: 'medium', sensitivity_to_friction: 'high' },
    techniques: ['stroke', 'kiss'],
    tickle: { tickle_sensitivity: 'medium' },
  }),
  elbows: makeZone({
    display_name: 'Elbows',
    description: 'Crooks of the arms; thin skin, often ticklish—light trailing touch during embrace rather than focused play.',
    sensitivity: 'low',
    sensitivity_score: 35,
    orientations: BF,
    musculoskeletal: { bone_proximity: 'high' },
    stimulation: { erogenous_priority: 30, sensitivity_to_friction: 'medium' },
    techniques: ['stroke'],
    tickle: { tickle_sensitivity: 'high' },
  }),
}
