import { makeZone } from './_makeZone.js'

const BF = ['male', 'female']

export default {
  ankles: makeZone({
    display_name: 'Ankles',
    description: 'Bony ankle hollows and tendons; delicate—circles with thumb, light holds during leg play.',
    sensitivity: 'low',
    sensitivity_score: 38,
    orientations: BF,
    musculoskeletal: { bone_proximity: 'high' },
    stimulation: { erogenous_priority: 35, sensitivity_to_hand: 'medium' },
    techniques: ['stroke', 'circle'],
  }),
  feet: makeZone({
    display_name: 'Feet',
    description:
      'Arches and tops of feet; some partners enjoy foot massage or gentle toe sucking—confirm comfort first.',
    sensitivity: 'medium',
    sensitivity_score: 55,
    orientations: BF,
    topology: { shape: 'convex', flexibility: 'rigid' },
    stimulation: { erogenous_priority: 50, sensitivity_to_mouth: 'medium', sensitivity_to_hand: 'high' },
    techniques: ['pressure', 'stroke', 'kiss'],
    tickle: { tickle_sensitivity: 'high' },
  }),
  soles: makeZone({
    display_name: 'Soles',
    description: 'Plantar surface—often ticklish; firm thumb pressure or warmed oil if partner enjoys foot focus.',
    sensitivity: 'medium',
    sensitivity_score: 58,
    orientations: BF,
    stimulation: { erogenous_priority: 48, sensitivity_to_pressure: 'high', sensitivity_to_friction: 'medium' },
    techniques: ['pressure', 'stroke'],
    tickle: { tickle_sensitivity: 'high', tickle_zone_type: 'flat' },
  }),
  toes: makeZone({
    display_name: 'Toes',
    description: 'Individual toes and webbing; sucking, licking between toes, or interlacing fingers—highly preference-dependent.',
    sensitivity: 'medium',
    sensitivity_score: 62,
    orientations: BF,
    topology: { surface_area: 'small' },
    stimulation: { erogenous_priority: 55, sensitivity_to_mouth: 'high', sensitivity_to_friction: 'medium' },
    techniques: ['kiss', 'stroke'],
    tickle: { tickle_sensitivity: 'medium' },
  }),
}
