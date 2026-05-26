import { makeZone } from './_makeZone.js'

const BF = ['male', 'female']

export default {
  neck: makeZone({
    display_name: 'Neck',
    description: 'Sides and back of the neck; nape kisses, breath on the skin, and lips along the tendon lines.',
    sensitivity: 'high',
    sensitivity_score: 82,
    orientations: BF,
    stimulation: { erogenous_priority: 82, sensitivity_to_mouth: 'high', sensitivity_to_friction: 'medium', sensitivity_to_hand: 'medium' },
    techniques: ['kiss', 'stroke'],
    tickle: { tickle_sensitivity: 'medium' },
  }),
  throat: makeZone({
    display_name: 'Throat (front)',
    description: 'Front of the neck at the windpipe; vulnerable—very light touch, breath, and kissing only with care.',
    sensitivity: 'medium',
    sensitivity_score: 65,
    orientations: BF,
    stimulation: { erogenous_priority: 68, sensitivity_to_mouth: 'high', sensitivity_to_teeth: 'low', sensitivity_to_pressure: 'low' },
    techniques: ['kiss', 'stroke'],
  }),
  base_of_neck: makeZone({
    display_name: 'Base of neck',
    description:
      'Upper trapezius above each collarbone—the thick muscle beside the spine, not the bones. Good for thumb kneading and slow kisses at the nape.',
    sensitivity: 'medium',
    sensitivity_score: 60,
    orientations: BF,
    musculoskeletal: { muscle_tension_level: 'high' },
    techniques: ['kiss', 'pressure', 'stroke'],
  }),
}
