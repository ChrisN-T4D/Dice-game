import { makeZone } from './_makeZone.js'

const M = ['male']

export default {
  testicles: makeZone({
    display_name: 'Testicles',
    description:
      'Testes within the scrotum; sensitive to weight, warmth, and gentle cupping. Avoid sharp squeezing or sudden pulls.',
    sensitivity: 'high',
    sensitivity_score: 80,
    orientations: M,
    stimulation: {
      erogenous_priority: 82,
      sensitivity_to_pressure: 'medium',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'medium',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'stroke'],
    tickle: { tickle_sensitivity: 'medium' },
  }),
  scrotum: makeZone({
    display_name: 'Scrotum',
    description:
      'Pouch of skin surrounding the testes; thin, wrinkled, and responsive to licking, light tugging, and warm breath.',
    sensitivity: 'medium',
    sensitivity_score: 68,
    orientations: M,
    topology: { flexibility: 'flexible' },
    stimulation: {
      erogenous_priority: 70,
      sensitivity_to_friction: 'high',
      sensitivity_to_mouth: 'high',
      sensitivity_to_hand: 'high',
    },
    techniques: ['stroke', 'kiss', 'circle'],
    musculoskeletal: { skin_texture: 'fine', skin_thickness: 'medium' },
  }),
  prostate: makeZone({
    display_name: 'Prostate (internal)',
    description:
      'Internal gland reached through the rectum; deep, full pressure and rhythmic contact. Not a surface skin zone but central to male pleasure for many.',
    sensitivity: 'high',
    sensitivity_score: 85,
    orientations: M,
    topology: { depth: 'deep', shape: 'convex' },
    stimulation: {
      erogenous_priority: 88,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'low',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'low',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'circle'],
    musculoskeletal: { bone_proximity: 'high' },
  }),
}
