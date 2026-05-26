import { makeZone } from './_makeZone.js'

export default {
  perineum: makeZone({
    display_name: 'Perineum',
    description:
      'Bridge of skin between genitals and anus. Often arousing with firm palm pressure, slow strokes, and warm breath along the midline.',
    sensitivity: 'medium',
    sensitivity_score: 70,
    orientations: ['female', 'male'],
    stimulation: {
      erogenous_priority: 72,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'medium',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'stroke', 'circle'],
    musculoskeletal: { muscle_massagability: 'medium' },
  }),
  mons_pubis: makeZone({
    display_name: 'Mons pubis',
    description:
      'Soft padded mound above the vulva or base of the penis. Pleasurable when kneaded, rubbed in slow circles, or kissed through hair or skin.',
    sensitivity: 'medium',
    sensitivity_score: 65,
    orientations: ['female', 'male'],
    topology: { surface_area: 'medium' },
    stimulation: {
      erogenous_priority: 62,
      sensitivity_to_pressure: 'medium',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'medium',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'circle', 'stroke'],
    musculoskeletal: { fat_density: 'medium', muscle_massagability: 'medium' },
  }),
}
