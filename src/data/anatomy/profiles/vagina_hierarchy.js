import { makeZone } from './_makeZone.js'

const F = ['female']

export default {
  vagina: makeZone({
    display_name: 'Vagina (canal)',
    description:
      'Internal canal with warm, enveloping walls. Responds to steady pressure, fullness, and rhythmic motion more than light surface friction.',
    sensitivity: 'high',
    sensitivity_score: 82,
    orientations: F,
    topology: { depth: 'deep', shape: 'concave', flexibility: 'flexible' },
    stimulation: {
      erogenous_priority: 85,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'low',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'stroke', 'circle'],
    tickle: { tickle_sensitivity: 'low', tickle_preference: 'low' },
  }),
  vaginal_anterior_wall: makeZone({
    display_name: 'Vaginal anterior wall',
    description:
      'Front wall of the vaginal canal; often more responsive to firm pressure and curved fingers. Associated with deeper, fuller sensation.',
    sensitivity: 'high',
    sensitivity_score: 88,
    orientations: F,
    topology: { depth: 'deep', shape: 'concave' },
    stimulation: {
      erogenous_priority: 90,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'low',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'circle', 'stroke'],
  }),
  vaginal_posterior_wall: makeZone({
    display_name: 'Vaginal posterior wall',
    description:
      'Rear vaginal wall; plush and yielding. Pleasurable with sustained pressure and slow strokes along the length of the canal.',
    sensitivity: 'high',
    sensitivity_score: 80,
    orientations: F,
    topology: { depth: 'deep', shape: 'concave' },
    stimulation: {
      erogenous_priority: 82,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'low',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'stroke'],
  }),
  vaginal_lateral_wall: makeZone({
    display_name: 'Vaginal lateral walls',
    description:
      'Side walls of the canal; broad contact area that enjoys even pressure and gentle spreading motion.',
    sensitivity: 'medium',
    sensitivity_score: 68,
    orientations: F,
    topology: { depth: 'deep', surface_area: 'large' },
    stimulation: {
      erogenous_priority: 70,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'medium',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'low',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure', 'stroke'],
  }),
  vaginal_introitus: makeZone({
    display_name: 'Vaginal introitus',
    description:
      'Entrance to the vagina; rim where inner and outer tissues meet. Sensitive to circling touch, wet kisses, and careful finger pressure.',
    sensitivity: 'high',
    sensitivity_score: 86,
    orientations: F,
    topology: { depth: 'shallow', shape: 'concave', curvature: 'moderate' },
    stimulation: {
      erogenous_priority: 88,
      sensitivity_to_pressure: 'medium',
      sensitivity_to_friction: 'high',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'high',
      sensitivity_to_hand: 'high',
    },
    techniques: ['circle', 'kiss', 'stroke'],
  }),
  cervix: makeZone({
    display_name: 'Cervix',
    description:
      'Deep cervical region; firm round tissue felt at the top of the canal. Responds to slow, intentional pressure—not sharp or rushed touch.',
    sensitivity: 'medium',
    sensitivity_score: 70,
    orientations: F,
    topology: { depth: 'deep', shape: 'convex', flexibility: 'rigid' },
    stimulation: {
      erogenous_priority: 72,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'low',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'low',
      sensitivity_to_hand: 'high',
    },
    techniques: ['pressure'],
    musculoskeletal: { bone_proximity: 'high' },
  }),
  cervical_os: makeZone({
    display_name: 'Cervical os',
    description:
      'Central opening of the cervix; very localized deep sensation. Light, patient contact only when welcomed.',
    sensitivity: 'medium',
    sensitivity_score: 65,
    orientations: F,
    topology: { surface_area: 'small', depth: 'deep', shape: 'concave' },
    stimulation: {
      erogenous_priority: 68,
      sensitivity_to_pressure: 'high',
      sensitivity_to_friction: 'low',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'low',
      sensitivity_to_hand: 'medium',
    },
    techniques: ['pressure'],
  }),
  vestibule: makeZone({
    display_name: 'Vestibule',
    description:
      'Vaginal vestibule between the labia; warm hollow that bridges external and internal play. Enjoys soft oral attention and cupped hand warmth.',
    sensitivity: 'high',
    sensitivity_score: 84,
    orientations: F,
    topology: { depth: 'shallow', shape: 'concave' },
    stimulation: {
      erogenous_priority: 86,
      sensitivity_to_pressure: 'medium',
      sensitivity_to_friction: 'high',
      sensitivity_to_teeth: 'low',
      sensitivity_to_mouth: 'high',
      sensitivity_to_hand: 'high',
    },
    techniques: ['kiss', 'circle', 'stroke'],
  }),
}
