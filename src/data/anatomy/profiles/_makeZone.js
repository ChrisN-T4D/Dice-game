import { extentFromFu, defaultFuFromSurfaceArea } from '../contact-scale.js'

/**
 * A factory to create zone profile objects with default values. * Ensures consistency across all profile chunks.
 *
 * @param {Object} opts
 * @param {string} opts.display_name - Display name for the zone
 * @param {string} opts.description - Sensual, 1–3 sentence description
 * @param {'low'|'medium'|'high'} opts.sensitivity - Sensitivity level
 * @param {number} opts.sensitivity_score - Numeric sensitivity (0–100)
 * @param {string[]} opts.orientations - ['male'], ['female'], or ['male', 'female']
 * @param {Object} opts.topology - { surface_area, shape, contact_extent?, typical_contact_fu?, max_contact_fu?, curvature, flexibility, depth }
 * @param {Object} opts.stimulation - { erogenous_priority, sensitivity_to_pressure/friiction/teeth/mouth/hand, techniques: string[] }
 * @param {Object} opts.musculoskeletal - { muscle_massagability, muscle_tension_level, skin_texture, fat_density, bone_proximity, skin_thickness }
 * @param {Object} opts.tickle - { tickle_sensitivity, tickle_preference, tickle_zone_type, tickle_texture, tickle_response }
 */
export function makeZone(opts = {}) {
  const {
    display_name,
    description,
    sensitivity = 'medium',
    sensitivity_score = 50,
    orientations = ['male', 'female'],
    topology = { surface_area: 'medium', curvature: 'slight', flexibility: 'flexible', depth: 'shallow', shape: 'flat' },
    stimulation = { erogenous_priority: 50, sensitivity_to_pressure: 'medium', sensitivity_to_friction: 'medium', sensitivity_to_teeth: 'low', sensitivity_to_mouth: 'low', sensitivity_to_hand: 'medium', techniques: ['stroke', 'pressure', 'circle'] },
    musculoskeletal = { muscle_massagability: 'medium', muscle_tension_level: 'medium', skin_texture: 'fine', fat_density: 'medium', bone_proximity: 'medium', skin_thickness: 'medium' },
    tickle = { tickle_sensitivity: 'medium', tickle_preference: 'medium', tickle_zone_type: 'flat', tickle_texture: 'fine', tickle_response: 'medium' },
  } = opts

  const typicalFu =
    topology.typical_contact_fu ?? defaultFuFromSurfaceArea(topology.surface_area)
  const maxFu = topology.max_contact_fu ?? typicalFu * 1.5
  const topologyOut = {
    ...topology,
    typical_contact_fu: typicalFu,
    max_contact_fu: maxFu,
    contact_extent: topology.contact_extent ?? extentFromFu(typicalFu),
  }

  return {
    display_name,
    description,
    sensitivity,
    sensitivity_score,
    orientations,
    topology: topologyOut,
    stimulation,
    techniques: stimulation.techniques,
    musculoskeletal,
    tickle,
  }
}