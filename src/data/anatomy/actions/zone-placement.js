/**
 * Where on the body each zone means — used to build human-facing action instructions.
 * @typedef {{ where: string, avoid?: string }} ZonePlacement
 */

/** @type {Record<string, ZonePlacement>} */
export const ZONE_PLACEMENT = {
  // —— Head & neck ——
  neck: {
    where:
      'from below the ear, along the soft side of the neck down toward the shoulder—not the front midline over the windpipe',
    avoid:
      'Keep to the side of the neck or the nape, and skip the front midline over the windpipe.',
  },
  throat: {
    where:
      'where the collarbones meet under the neck, in the soft hollow beside the windpipe—not on the centered trachea',
    avoid:
      'Stay in the soft hollow beside the windpipe, not on the firm midline, and go easy with any pressure there.',
  },
  base_of_neck: {
    where:
      'from the spine on your back, on the fleshy meaty pad beside the spine where the neck meets the upper back—not on the spine or bony knobs',
    avoid: 'Knead the muscle, not the spine or the front of the throat.',
  },
  ears: {
    where: 'on the earlobe, along the outer helix rim, and behind the ear in the soft spot between ear and skull—avoid shoving into the ear canal',
    avoid: 'Stay on the lobe and outer rim, and keep fingers and tongue out of the ear canal.',
  },

  // —— Upper body ——
  nipple: {
    where: 'directly on the nipple bud and the ring where areola meets nipple—small circles and sealed kisses on the tip itself',
  },
  areola: {
    where: 'across the pigmented areola pad surrounding the nipple—spiral outward from the nipple without only grazing the breast far away',
  },
  breast_tissue: {
    where: 'on the fuller breast mound away from the nipple—palms and fingers on the soft tissue above the ribcage, moving toward but not crushing the nipple unless intended',
  },
  chest: {
    where: 'on the flat sternum between the breasts or pectorals and across the upper chest muscle—mid-chest and outer pec sweep, not the throat notch',
  },
  shoulders: {
    where: 'on the rounded cap of the shoulder (deltoid) where arm meets torso—front, side, and rear deltoid curves',
  },
  clavicle: {
    where: 'along the collarbone ridge from sternum notch toward the shoulder—light touch on the bone line and the skin just above it',
    avoid: 'Go easy here; the collarbone sits right under the skin.',
  },
  deltoid: {
    where: 'on the meaty deltoid muscle between shoulder point and upper arm—side and rear head of the shoulder',
  },
  stomach: {
    where: 'on the soft abdomen between lower ribs and the navel—side-to-side across the belly, avoiding sharp navel jabs',
  },
  upper_abdomen: {
    where: 'just below the ribcage in the upper belly—horizontal strokes under the costal arch, not on the sternum bone',
  },
  lower_abdomen: {
    where: 'between the navel and the pubic hairline—low belly and hip crease approaches, lighter near the bladder zone',
  },
  hip_bone: {
    where: 'along the front hip bone (ASIS) and the iliac crest at the pant line—skin over the hip point, not deep groin yet',
  },
  groin: {
    where: 'in the crease where upper thigh meets torso at the front—inner groin fold beside genitals, not on the genitals themselves unless shifting zones',
  },

  // —— Back ——
  back: {
    where: 'across the broad back between shoulders and waist—lat sweeps and palm drags on muscle, not the spine groove',
    avoid:
      'Work the muscle on either side of the spine rather than pressing down the bony ridge.',
  },
  upper_back: {
    where: 'between the shoulder blades on the rhomboid and mid-trap meat—vertical and diagonal paths flanking the spine',
    avoid: 'Stay off the bony center of the spine and keep your touch on the meat beside it.',
  },
  lower_back: {
    where: 'in the lumbar hollow above the hips—the small-of-the-back curve beside the spine, where many people arch',
    avoid: 'Skip hard pressure right on the spine; the soft curve beside it is usually the sweeter spot.',
  },
  spine: {
    where: 'in the long muscles running parallel to the spine—one or two finger widths off the vertebral column on left and right, never on the knobs of bone',
    avoid: 'Stay a finger width off the vertebrae rather than rubbing down the knobs of bone.',
  },
  sacrum: {
    where: 'on the flat sacral plate at the base of the spine above the cleft—broad palm pressure on the triangular bone area, still avoiding the crack',
  },
  coccyx: {
    where: 'beside the tailbone in the upper cleft margins—indirect pressure on the fleshy sides of the cleft, not on the coccyx tip',
    avoid: 'The tailbone bruises easily, so press beside it rather than on the tip.',
  },

  // —— Lower body / glutes ——
  sides: {
    where: 'along the flank between ribcage and hip—side body under the bottom rib, love-handle soft tissue',
  },
  flank: {
    where: 'on the lateral waist between armpit level and hip bone—the indented side torso',
  },
  ribcage: {
    where: 'along the lower floating ribs on the side body—skin over the rib line, light to medium pressure only',
    avoid: 'Keep to the skin over the ribs, and skip digging underneath or poking into bone.',
  },
  hips: {
    where: 'on the hip shelf and side butt transition—iliac crest outward and the upper outer glute swell',
  },
  buttocks: {
    where: 'on the full cheek mounds—the meatiest part of each glute, cheek flesh away from the crack',
  },
  gluteus_maximus: {
    where: 'on the center mass of each gluteus maximus—deep cheek meat, lifts and kneads here',
  },
  gluteus_medius: {
    where: 'on the upper outer hip buttock (side hip swell)—where the hip rounds beside the lower back',
  },
  gluteus_minimus: {
    where: 'on the deeper side hip under the medius—smaller band above the thigh on the outer hip',
  },
  buttock_crease: {
    where: 'along the gluteal fold where cheek meets upper thigh—the horizontal crease line, not inside the anal cleft',
    avoid:
      'Unless you have both agreed otherwise, stay on the fold of skin and not into the anal opening.',
  },
  buttock_pad: {
    where: 'on the lower cheek padding just above the thigh—soft underside of each cheek when the hip is flexed',
  },

  // —— Limbs ——
  inner_thighs: {
    where: 'on the medial thigh from groin crease toward the knee—the soft inner leg, high up near the genitals only if that zone is in play',
  },
  outer_thighs: {
    where: 'along the lateral thigh from hip to knee—vastus lateralis sweep on the outside of the leg',
  },
  knees: {
    where: 'around the kneecap edges and the soft popliteal hollow behind the knee—patella rim, not hammering the kneecap center',
    avoid: 'Circle around the kneecap rather than driving sharp pressure into the bone itself.',
  },
  forearms: {
    where: 'along the inner and outer forearm from wrist toward elbow—fleshy flexor and extensor sides, not the bony wrist joint',
  },
  inner_arms: {
    where: 'on the ventral upper arm and inner bicep/tricep soft tissue—the tender inside arm from armpit toward elbow',
  },
  elbows: {
    where: 'around the elbow crease and the point of the elbow—cubital fossa (inner elbow) lightly; avoid nerve-pinching slam on the funny bone',
  },
  calves: {
    where: 'on the gastrocnemius belly of the calf—meaty back-of-leg muscle from knee hollow to Achilles, not the bone',
  },
  shins: {
    where: 'along the tibialis anterior on the front shin—muscle beside the shin bone, not scraping the tibia itself',
    avoid: 'Stay on the muscle beside the shin, not scraping across the sharp bone.',
  },
  ankles: {
    where: 'around the ankle bones (malleoli) and Achilles tendon padding—circles on the joint hollows, gentle on tendons',
  },
  feet: {
    where: 'across the top of the foot (dorsum) and the arch approach—metatarsal pad, not stomping toes',
  },
  soles: {
    where: 'on the plantar arch and ball of the foot under the toes—the weight-bearing pad, heel only if pressure is welcome',
  },
  toes: {
    where: 'on each toe pad and between toes at the webbing—kiss/suck individual toes, not bending joints backward',
    avoid: 'Hold each toe gently, without yanking or bending the joint backward.',
  },

  // —— Clitoral / labial ——
  clitoral_hood: {
    where:
      'at the vulva, on the small fold of skin at the top where the inner lips meet, over the clitoris',
    avoid: 'If you meet resistance, ease off and only move the hood as gently as the body allows.',
  },
  clitoral_glans: {
    where:
      'at the vulva, on the tiny sensitive bead at the top of the inner lips, just under or peeking from that fold',
  },
  labia_minora: {
    where:
      'at the vulva, on the inner lip—the thinner soft fold just inside the outer lip',
  },
  labia_majora: {
    where:
      'at the vulva, on the outer lip—the thicker padded flap on each side (a full palm cannot isolate one lip alone; expect both sides and the crease to be touched)',
  },
  vestibular_bulbs: {
    where: 'beside the vaginal opening on the swollen vestibular bulb pads—pressure through the entrance margins, not deep inside the canal unless shifting zones',
  },

  // —— Vaginal ——
  vagina: {
    where: 'inside the vaginal canal along the length of the passage—walls contacted with curved fingers or tongue at the entrance, not ramming the cervix abruptly',
    avoid: 'Before going deeper, check in, and ease back if anything feels sharp near the far end.',
  },
  vaginal_anterior_wall: {
    where: 'on the front (anterior) vaginal wall toward the belly—come-hither pressure one to two knuckles in, where G-zone tissue is often felt',
  },
  vaginal_posterior_wall: {
    where: 'on the rear (posterior) vaginal wall toward the spine—fullness pressure along the back wall, shallower than the cervix knock',
  },
  vaginal_lateral_wall: {
    where: 'against the left or right vaginal sidewall—broad side contact spreading the canal gently, alternating sides',
  },
  vaginal_introitus: {
    where: 'at the vaginal entrance ring—the introitus and first inch, circling the gateway before deeper insertion',
  },
  cervix: {
    where: 'at the deep fornix contacting the cervix only with very gentle pressure—deep inside when invited, never punched',
    avoid: 'Deep touch here can feel sharp for some people, so go slowly and keep checking in.',
  },
  cervical_os: {
    where: 'at the tiny central os of the cervix only indirectly—surround the dimple with minimal pressure, never probe the opening',
    avoid: 'Do not probe the central opening; stay on the tissue around it.',
  },
  vestibule: {
    where: 'in the vestibule between inner lips and entrance—flat tongue and finger pads on the shallow platform around the opening',
  },

  // —— Perineum / mons ——
  perineum: {
    where: 'on the perineal body between vaginal opening and anus—the short bridge of skin, midline and slightly off-center soft tissue',
    avoid:
      'Unless you have both agreed to anal touch, keep your strokes on the perineum and not dragged roughly over the anus.',
  },
  mons_pubis: {
    where: 'over the mons pubis fat pad above the vulva or base of the penis—pubic mound kneading through hair or skin, not the urethra',
  },

  // —— Penis / scrotum ——
  penis: {
    where: 'along the shaft from base to below the glans—skin of the shaft with strokes following length, not bending the shaft sharply',
  },
  penis_glans: {
    where: 'on the glans cap and corona ridge—rim kisses and tongue around the head, frenulum side especially, not teeth on the tip',
  },
  penis_shaft: {
    where: 'on the shaft skin from base to corona—full-length palm or finger wraps, uniform contact around the cylinder',
  },
  foreskin: {
    where: 'on the foreskin sleeve if present—rolling skin over the glans, strokes on the hooded shaft, retract only gently if at all',
  },
  frenulum: {
    where: 'on the frenulum V and underside seam where shaft meets glans—the most sensitive string of tissue on the ventral head',
    avoid: 'This spot runs intense for most people, so start feather-light and let sensation build.',
  },
  urethral_meatus: {
    where: 'at the urethral opening on the glans tip—peripheral kisses beside the slit, never penetrating the opening',
    avoid: 'Nothing goes inside the urethral opening; stay beside the slit.',
  },
  bulb_of_penis: {
    where: 'on the internal bulb felt through the perineum or root of the penis at the base—deep palm pressure between legs behind the scrotum',
  },
  testicles: {
    where: 'on the scrotal sac skin around each testicle—cup and roll the balls inside the sack, never crushing or sharp yanks',
    avoid: 'Pain comes easily here, so keep pressure light unless you have clear consent for more.',
  },
  scrotum: {
    where: 'on the wrinkled scrotal skin—broad tongue and fingers on the sack, separating gentle attention per side',
  },
  prostate: {
    where: 'through the perineum or rectal anterior wall (only if anal play is in scope)—firm pressure toward the belly on the prostate bump, one to two knuckles depth if internal',
    avoid: 'Use plenty of lubrication, clear consent, and never force depth.',
  },
}

/**
 * @param {string} zoneId
 * @param {object} [profile]
 * @returns {ZonePlacement}
 */
export function placementForZone(zoneId, profile = {}) {
  if (ZONE_PLACEMENT[zoneId]) return ZONE_PLACEMENT[zoneId]
  const name = profile.display_name || zoneId.replace(/_/g, ' ')
  return {
    where: `on ${name} where the skin is accessible and welcome—stay on muscle and soft tissue, not bone or openings unless this zone specifies otherwise`,
  }
}
