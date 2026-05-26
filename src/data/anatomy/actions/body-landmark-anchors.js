/**
 * Landmark-first placement: start from a body part most people can find,
 * then offset to the specific zone (see sequence-anchor-phrasing.js).
 *
 * Pattern: from/at [known landmark], [specific spot + sensory cue]
 */
import { spokenZone } from './sequence-spoken-zones.js'

/** @type {Record<string, string>} */
export const ANCHOR_HINTS = {
  // Head & neck
  base_of_neck:
    'from the spine on your back, on the fleshy meaty pad just beside the spine where the neck meets the upper back—not on the spine or the bony knobs',
  neck:
    'from below the ear, along the soft side of the neck down toward the shoulder—not on the front of the throat or the windpipe',
  throat:
    'from where the collarbones meet under the neck, in the soft hollow just beside the windpipe—never on the firm strip down the middle',
  ears:
    'from the side of the head, on the earlobe or the soft rim of the ear—not inside the ear canal',
  clavicle:
    'from the center of the chest, along the collarbone toward the shoulder—the bone you can feel under the skin',
  shoulders:
    'from the neck or upper arm, on the rounded cap of the shoulder muscle—not the hard bone point at the very top',

  // Front torso
  chest:
    'from the collarbones, on the front of the chest—the flat or softly curved area above the belly',
  upper_abdomen:
    'from the ribs, on the front of the belly just under the rib cage in the softer upper belly',
  stomach:
    'from the ribs, on the front of the belly around the navel',
  lower_abdomen:
    'from the navel, low on the front of the belly above the pelvic line and pubic hair',
  ribcage:
    'from the waist, along the side of the torso over the ribs—on the soft skin, not digging under the ribs',

  // Back
  upper_back:
    'from the spine on your back, on the soft meaty muscle between the shoulder blades, a finger width off the spine',
  lower_back:
    'from the spine, on the lower back in the shallow curve beside the spine above the hips—not on the bony knobs',
  back:
    'from the spine, on the broad soft muscle on either side of the spine on the back',
  spine:
    'from the spine, in the long muscles running parallel to the spine—a finger width off the bony knobs',
  sacrum:
    'from the spine, on the flat plate at the base of the spine above the cleft between the buttocks',
  sides:
    'from the ribs and hip, on the soft waist on the side of the torso',

  // Breasts
  nipple:
    'from the front of the chest, on the nipple bud at the center of the areola',
  areola:
    'from the nipple, on the darker ring of skin circling the nipple',
  breast_tissue:
    'from the nipple, on the soft full mound of the breast away from the nipple',

  // Hips, groin, glutes
  hips:
    'from the waist, on the hip shelf where the pelvis rounds outward on the side of the body',
  groin:
    'from the inner thigh, in the warm crease where the leg meets the torso at the top of the leg',
  inner_thighs:
    'from the groin, on the soft inside of the thigh from the crease toward the knee',
  outer_thighs:
    'from the hip, on the meaty muscle along the outside of the thigh',
  hip_bone:
    'from the front of the hip, on the bony point at the top of the pant line—light pressure only',
  mons_pubis:
    'from the lower belly, on the soft padded mound above the vulva or the base of the penis',
  perineum:
    'from the genitals toward the anus, on the short bridge of skin between them',
  buttocks:
    'from the lower back, on the full soft cheek of the buttock below the waist',
  gluteus_maximus:
    'from the buttock cheek, on the meatiest center of the cheek',
  gluteus_medius:
    'from the hip and lower back, on the upper outer swell of the buttock',
  buttock_crease:
    'from the buttock cheek, along the horizontal crease where the cheek meets the upper thigh',
  buttock_pad:
    'from the buttock cheek, on the soft lower curve of the cheek just above the leg',

  // Limbs
  inner_arms:
    'from the armpit, on the soft tender skin along the inside of the upper arm toward the elbow',
  forearms:
    'from the elbow, on the fleshy forearm away from the hard wrist bone',
  elbows:
    'from the upper arm, in the soft crease on the inside of the elbow—not on the funny bone point',
  deltoid:
    'from the shoulder, on the rounded cap of shoulder muscle on the side or back of the arm',
  knees:
    'from the thigh, around the kneecap on soft tissue—not on the hard cap of the knee',
  calves:
    'from the knee, on the meaty calf muscle on the back of the lower leg',
  shins:
    'from the knee, on the muscle beside the shin bone on the front of the lower leg',
  ankles:
    'from the foot, in the soft hollow on the side of the ankle bone',
  feet:
    'from the ankle, on the top of the foot—the arch and pad behind the toes',
  soles:
    'from the heel, on the padded arch and ball on the bottom of the foot',
  toes:
    'from the ball of the foot, on each toe pad and the soft webs between the toes',

  // Vulva (landmark: outer/inner lips, opening, then clitoris at top where lips meet)
  labia_majora:
    'at the vulva, on the outer lip—the thicker padded flap on each side',
  labia_minora:
    'at the vulva, on the inner lip—the thinner soft fold just inside the outer lip',
  clitoral_hood:
    'at the vulva, on the small fold of skin at the top where the inner lips meet, over the clitoris',
  clitoral_glans:
    'at the vulva, on the tiny sensitive bead at the top of the inner lips, just under or peeking from that fold',
  vestibule:
    'at the vulva, on the soft skin between the inner lips, just above the vaginal opening',
  vestibular_bulbs:
    'at the vulva, on the swollen soft pads beside the vaginal opening, felt through the skin',
  vaginal_introitus:
    'at the vulva, at the vaginal opening between the inner lips',
  vagina:
    'at the vulva, at the vaginal opening between the inner lips',
  vaginal_anterior_wall:
    'at the vulva, at the vaginal opening between the inner lips',
  vaginal_posterior_wall:
    'at the vulva, at the vaginal opening between the inner lips',
  vaginal_lateral_wall:
    'at the vulva, at the vaginal opening between the inner lips',
  cervix:
    'at the vulva, at the vaginal opening between the inner lips',

  // Penis / scrotum (landmark: shaft, head, opening, scrotum)
  penis:
    'at the base of the penis shaft where it meets the body',
  penis_shaft:
    'on the penis, along the shaft from the base toward the head',
  penis_glans:
    'on the penis, on the rounded head at the tip',
  frenulum:
    'on the penis, on the thin sensitive strip on the underside of the head where the head meets the shaft',
  foreskin:
    'on the penis, on the sleeve of skin over the head when present',
  scrotum:
    'under the penis, on the scrotum—the soft wrinkled sack that holds the testicles',
}

/**
 * Short spot names for travel legs ("work from X to Y", "move back to X").
 * Same landmarks the listener already found in the opening placement.
 */
export const SPOT_SHORT = {
  neck: 'the side of the neck below the ear',
  base_of_neck: 'the meaty pad beside the spine where the neck meets the back',
  throat: 'the hollow beside the windpipe at the base of the neck',
  ears: 'the earlobe',
  shoulders: 'the rounded cap of the shoulder',
  clavicle: 'the collarbone toward the shoulder',
  upper_back: 'the soft muscle between the shoulder blades',
  lower_back: 'the lower back above the hips',
  chest: 'the center of the chest',
  upper_abdomen: 'the upper belly under the ribs',
  stomach: 'the belly around the navel',
  lower_abdomen: 'the low front of the belly',
  nipple: 'the nipple',
  areola: 'the ring around the nipple',
  breast_tissue: 'the soft mound of the breast',
  penis_glans: 'the head of the penis',
  penis_shaft: 'the middle of the shaft',
  frenulum: 'the strip under the head',
  scrotum: 'the scrotum under the shaft',
  labia_majora: 'the outer lip',
  labia_minora: 'the inner lips',
  clitoral_hood: 'the fold where the inner lips meet at the top',
  clitoral_glans: 'the tiny bead at the top of the inner lips',
  vestibule: 'the soft skin just above the opening',
  vaginal_introitus: 'the vaginal opening',
  vagina: 'just inside the opening',
  mons_pubis: 'the soft mound above the vulva',
  groin: 'the crease where the leg meets the body',
  inner_thighs: 'the inner thigh toward the knee',
  penis: 'the base of the shaft',
  foreskin: 'the skin over the head',
  back: 'the broad muscle beside the spine',
  spine: 'the muscles beside the spine',
  sacrum: 'the flat base of the spine',
  buttocks: 'the cheek of the buttock',
  gluteus_maximus: 'the center of the buttock cheek',
  perineum: 'the bridge between the genitals and the anus',
  hips: 'the hip shelf',
  hip_bone: 'the front hip bone',
  inner_arms: 'the soft inside of the upper arm',
  forearms: 'the forearm',
  elbows: 'the inner elbow crease',
  deltoid: 'the shoulder muscle cap',
  knees: 'the knee',
  calves: 'the calf',
  shins: 'the shin',
  ankles: 'the ankle',
  feet: 'the top of the foot',
  soles: 'the arch of the foot',
  toes: 'the toe pads',
  ribcage: 'the side of the ribs',
  sides: 'the side of the waist',
  vestibular_bulbs: 'the swollen pads beside the opening',
  vaginal_anterior_wall: 'the belly-side wall inside',
  vaginal_posterior_wall: 'the back wall inside',
  vaginal_lateral_wall: 'the side wall inside',
  cervix: 'the firm dome at the end of the canal',
  gluteus_medius: 'the upper outer buttock',
  buttock_crease: 'the crease above the thigh',
  buttock_pad: 'the lower curve of the buttock',
  outer_thighs: 'the outer thigh',
}

/** @deprecated use SPOT_SHORT — kept for sweep paths */
export const REACH_LABEL = { ...SPOT_SHORT }

/** "Once you're at …" phrasing — natural arrival, not "when you reach". */
export const ARRIVAL_PHRASE = {
  base_of_neck: 'those back muscles where the neck meets the back',
  upper_back: 'the soft muscle between your shoulder blades',
  neck: 'the side of your neck below the ear',
  throat: 'the hollow beside the windpipe at the base of your neck',
  ears: 'the earlobe',
  shoulders: 'the cap of the shoulder',
  clitoral_glans: 'the tiny bead at the top of the inner lips',
  clitoral_hood: 'the fold where the inner lips meet',
  vaginal_introitus: 'the vaginal opening',
  vagina: 'just inside the opening',
  penis_glans: 'the head of the penis',
  penis_shaft: 'the shaft',
  frenulum: 'the strip under the head',
  nipple: 'the nipple',
  areola: 'the ring around the nipple',
  breast_tissue: 'the soft breast mound',
  stomach: 'the belly around the navel',
  upper_abdomen: 'the upper belly under the ribs',
  lower_abdomen: 'the low belly',
  chest: 'the center of the chest',
  inner_thighs: 'the inner thigh',
  groin: 'the crease at the top of the leg',
}

/** @param {string} zoneId */
export function spotShort(zoneId) {
  return SPOT_SHORT[zoneId] || `the ${spokenZone(zoneId)}`
}

/** @param {string} zoneId */
export function arrivalPhrase(zoneId) {
  return ARRIVAL_PHRASE[zoneId] || spotShort(zoneId)
}
