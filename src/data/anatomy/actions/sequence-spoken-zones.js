/** Short consumer-friendly labels for sweep paths and brief refs (zone_id → phrase). */

export const ZONE_SPOKEN = {

  breast_tissue: 'front of the chest on the breast',

  clitoral_glans: 'clitoral tip',

  clitoral_hood: 'fold over the tip',

  labia_minora: 'inner lips',

  labia_majora: 'outer lips',

  mons_pubis: 'front low belly above the vulva',

  vaginal_introitus: 'vaginal opening',

  vaginal_anterior_wall: 'front wall inside',

  vaginal_posterior_wall: 'back wall inside',

  vaginal_lateral_wall: 'side inside the canal',

  penis_glans: 'head of the penis',

  penis_shaft: 'shaft of the penis',

  base_of_neck: 'meaty pad beside the spine where neck meets back',

  upper_abdomen: 'upper front belly',

  lower_abdomen: 'lower front belly',

  stomach: 'front of the belly',

  hip_bone: 'front of the hip',

  inner_thighs: 'inner thigh',

  outer_thighs: 'outer thigh',

  inner_arms: 'inner arm',

  buttock_crease: 'crease under the buttock',

  buttock_pad: 'lower buttock',

  gluteus_maximus: 'center of the buttock',

  gluteus_medius: 'upper outer buttock',

  gluteus_minimus: 'side of the hip',

  vestibular_bulbs: 'swollen area beside the opening',

  upper_back: 'upper back',

  lower_back: 'lower back',

  vagina: 'vaginal opening inside',

  vestibule: 'area at the opening',

  perineum: 'bridge between the genitals and the anus',

  scrotum: 'sack under the shaft',

  frenulum: 'underside of the head',

  foreskin: 'skin over the head',

  buttocks: 'buttock cheek',

  groin: 'groin crease',

  nipple: 'nipple',

  areola: 'ring around the nipple',

  chest: 'front of the chest',

  neck: 'side of the neck',

  ears: 'ear',

  shoulders: 'shoulder',

  throat: 'front of the neck',

  clavicle: 'collarbone',

  hips: 'hip',

  knees: 'knee',

  calves: 'calf',

  shins: 'shin',

  ankles: 'ankle',

  feet: 'top of the foot',

  soles: 'bottom of the foot',

  toes: 'toes',

  forearms: 'forearm',

  elbows: 'inner elbow',

  deltoid: 'shoulder muscle',

  spine: 'muscles beside the spine',

  sacrum: 'base of the spine',

  sides: 'side of the waist',

  back: 'back',

  ribcage: 'side of the ribs',

}



/** @param {string} zoneId */

export function spokenZone(zoneId) {

  return ZONE_SPOKEN[zoneId] || zoneId.replace(/_/g, ' ')

}


