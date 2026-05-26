/**
 * Body Region Taxonomy (shared across male/female anatomy)
 * Provides consistent categories for filtering and organization.
 */

// Top-level regions
export const regions = [
  'genitalia',
  'torso',
  'back',
  'limbs',
  'head_neck',
  'other'  // Catch-all for undefined anatomy
]

// Sub-regions by top-level region
export const subRegions = {
  genitalia: [
    'clitoris_hierarchy',
    'vagina_hierarchy',
    'perineum_mons',
    'penis_hierarchy',
    'scrotum_testicles'
  ],
  torso: [
    'upper_body',
    'lower_body',
    'hips_buttocks'
  ],
  back: [
    'upper_back',
    'lower_back'
  ],
  limbs: [
    'arms',
    'thighs',
    'calves',
    'feet'
  ],
  head_neck: [
    'neck',
    'ears'
  ],
  other: []
}

// Sub-region definitions for detailed grouping
export const subRegionDecls = {
  genitalia: {
    clitoris_hierarchy: {
      definition: 'External clitoral structures (including hood, glans)',
      parent_region: 'genitalia',
      primary_anatomy_names: ['clitoral_hood', 'clitoral_glans', 'labia_minora', 'labia_majora', 'vestibular_bulbs']
    },
    vagina_hierarchy: {
      definition: 'Internal vaginal structures (canal, walls, introitus, cervix, cervical os, vestibule)',
      parent_region: 'genitalia',
      primary_anatomy_names: ['vagina', 'vaginal_anterior_wall', 'vaginal_posterior_wall', 'vaginal_lateral_wall', 'vaginal_introitus', 'cervix', 'cervical_os', 'vestibule']
    },
    perineum_mons: {
      definition: 'Area between vulva and anus',
      parent_region: 'genitalia',
      primary_anatomy_names: ['perineum', 'mons_pubis']
    },
    penis_hierarchy: {
      definition: 'External penile structures (including shaft, glans, foreskin, frenulum, urethral meatus, bulb of penis)',
      parent_region: 'genitalia',
      primary_anatomy_names: ['penis', 'penis_glans', 'penis_shaft', 'foreskin', 'frenulum', 'urethral_meatus', 'bulb_of_penis']
    },
    scrotum_testicles: {
      definition: 'External male genitalia (including scrotum, testicles, perineum, prostate, bulb of penis)',
      parent_region: 'genitalia',
      primary_anatomy_names: ['testicles', 'scrotum', 'prostate']
    }
  },
  torso: {
    upper_body: {
      definition: 'Chest, shoulders, upper abdomen, sides, ribs',
      parent_region: 'torso',
      primary_anatomy_names: [
        'nipple', 'areola', 'breast_tissue', 'chest', 'shoulders', 'clavicle', 'deltoid',
        'stomach', 'upper_abdomen', 'lower_abdomen', 'hip_bone', 'groin'
      ]
    },
    lower_body: {
      definition: 'Buttocks, glutes, flanks',
      parent_region: 'torso',
      primary_anatomy_names: ['sides', 'flank', 'ribcage', 'hips', 'buttocks', 'gluteus_maximus', 'gluteus_medius', 'gluteus_minimus', 'buttock_crease', 'buttock_pad']
    },
    hips_buttocks: {
      definition: 'Hip bones, glutes, buttock muscles (zones listed under lower_body)',
      parent_region: 'torso',
      primary_anatomy_names: []
    }
  },
  back: {
    upper_back: {
      definition: 'Upper and lower back, spine area',
      parent_region: 'back',
      primary_anatomy_names: ['back', 'upper_back', 'lower_back', 'spine', 'sacrum', 'coccyx']
    },
    lower_back: {
      definition: 'Lumbar and sacral back (zones listed under upper_back)',
      parent_region: 'back',
      primary_anatomy_names: []
    }
  },
  limbs: {
    arms: {
      definition: 'Elbows, forearms, inner arms',
      parent_region: 'limbs',
      primary_anatomy_names: ['elbows', 'forearms', 'inner_arms']
    },
    thighs: {
      definition: 'Inner thighs, outer thighs, knees',
      parent_region: 'limbs',
      primary_anatomy_names: ['inner_thighs', 'outer_thighs', 'knees']
    },
    calves: {
      definition: 'Calf muscles and shins',
      parent_region: 'limbs',
      primary_anatomy_names: ['calves', 'shins']
    },
    feet: {
      definition: 'Ankles, feet, soles, and toes',
      parent_region: 'limbs',
      primary_anatomy_names: ['ankles', 'feet', 'soles', 'toes']
    }
  },
  head_neck: {
    neck: {
      definition: 'Neck, Adam\'s apple, base of neck, throat',
      parent_region: 'head_neck',
      primary_anatomy_names: ['neck', 'throat', 'base_of_neck']
    },
    ears: {
      definition: 'Outer ear and lobe',
      parent_region: 'head_neck',
      primary_anatomy_names: ['ears']
    }
  },
  other: {}
}

// Helper to find sub-region for an anatomy name
export function getRegionForAnatomy(anatomyName, anatomyType) {
  if (!anatomyName || !subRegions[anatomyType]) {
    return 'other'
  }
  const lowerName = anatomyName.toLowerCase()
  for (const subRegion of subRegions[anatomyType]) {
    if (subRegion.primary_anatomy_names?.some(name => lowerName.includes(name.toLowerCase()))) {
      return subRegion
    }
  }
  return 'other'
}

// Helper to get region description
export function getRegionDisplayName(region) {
  const nameMap = {
    'genitalia': 'Genitalia',
    'torso': 'Torso',
    'back': 'Back',
    'limbs': 'Limbs',
    'head_neck': 'Head/Neck',
    'other': 'Other'
  }
  return nameMap[region] || region
}
