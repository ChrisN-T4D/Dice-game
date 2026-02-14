'use strict';
// Phase/location/action tables – edit here

const tables = {
  1: {
    name: 'Warm‑up',
    description: 'Non‑genital, low‑pressure exploration, clothing/lingerie optional.',
    locations: {
      1: 'Lips',
      2: 'Ears (Lobes or Outer Shell)',
      3: 'Nape of the Neck',
      4: 'Collarbone',
      5: 'Shoulders',
      6: 'Nipples / Areolas',
      7: 'Chest / Breasts',
      8: 'Inner Arms / Elbow Crease',
      9: 'Inner Wrists',
      10: 'Palms / Fingertips',
      11: 'Belly Button / Navel',
      12: 'Lower Back / Sacrum',
      13: 'Hips / Waist',
      14: 'Buttocks',
      15: 'Perineum',
      16: 'Inner Thighs',
      17: 'Behind the Knees',
      18: 'Feet / Arches',
      19: 'Primary Genitals',
      20: 'Critical Hit: Roller’s choice of location.'
    },
    actions: {
      1: 'Slow hand strokes: Use the full palm and fingers to make slow, steady strokes over the area.',
      2: 'Feather-light fingertips: Use only the very tips of your fingers to barely graze the surface of the skin.',
      3: 'Gentle kneading: Use the heels of your hands to gently squeeze and knead the muscles in a slow rhythm.',
      4: 'Still hand and breath: Rest a warm hand on the area and breathe slowly together, noticing warmth and contact.',
      5: 'Tracing with one finger: Use a single fingertip to trace lines, shapes, or simple patterns on the skin.',
      6: 'Alternating fingers: Alternate between one finger and all fingers to change the feel of the touch.',
      7: 'Soft tapping: Use the pads of your fingertips to make soft, rhythmic taps over the area.',
      8: 'Cupping with the hand: Gently cup the area with your palm and hold, adding tiny movements if it feels good.',
      9: 'Back of the hand: Use the backs of your fingers or hand to stroke the area for a different texture.',
      10: 'Finger circles: Use one or two fingers to draw slow circles of different sizes over the area.',
      11: 'Warm breath: Blow soft, warm air over the area, occasionally pausing to notice how the skin feels.',
      12: 'Kissing: Place slow, simple kisses on the area, without licking or nibbling.',
      13: 'Soft tongue: Use the tongue to slowly trace short lines or small shapes on the area.',
      14: 'Soft lip pressure: Press your closed lips gently against the area, then slowly release.',
      15: 'Light mouth suction: Use lips to create very gentle suction, then release in a slow rhythm.',
      16: 'Butterfly kisses: Gently flutter your eyelashes against the skin around the area.',
      17: 'Foot strokes (if comfortable): Use the underside of your toes or the ball of your foot to make slow, gentle strokes.',
      18: 'Foot tracing: Use the edge of your foot or toes to trace simple lines or shapes over the area.',
      19: 'Toe taps: Use your toes to make soft, rhythmic taps, similar to fingertip tapping.',
      20: 'Critical success: Spend about twice as long on this location, then roll again on the action table to decide how to touch it.'
    }
  },

  2: {
    name: 'Heating up',
    description: 'Breasts/chest and genitals allowed; still low pressure and exploration‑focused.',
    locations: {
  1: 'Mouth: inner lips and tongue (kissing, licking; no biting).',
  2: 'Ears: lobes and inner rim (gentle breath, lips, or fingers).',
  3: 'Front of neck and under the jawline.',
  4: 'Nape of neck and hairline (back of neck).',
  5: 'Collarbones and upper chest (above the breast/pec line).',
  6: 'Nipples and areolas (any body type; touch or mouth, no penetration).',
  7: 'Nipple–areola complex (same as 6; use for a second focus or reroll for a different location).',
  8: 'Full breast or pectoral mound (including under-breast fold and outer curves).',
  9: 'Lower belly “V” and waistband line toward the pubic hairline (external only).',
  10: 'Pubic mound (mons) and upper groin, above genitals (external only).',
  11: 'Inner thighs, upper third, and groin creases nearest to genitals (external only).',
  12: 'Inner thighs and groin creases (general area).',
  13: 'Buttocks and the crease where butt meets thighs.',
  14: 'Lower back (sacrum) and top of buttocks.',
  15: 'Perineum: the area between genitals and anus (external only).',
  16: 'Outer vulva only (outer lips / labia majora; no penetration).',
  17: 'Penis and scrotum (shaft and balls; touch or mouth, no penetration unless agreed).',
  18: 'Genital “edges”: the skin just beside genitals (where thigh meets groin, or just outside the most sensitive spots).',
  19: 'Hips and hip bones (the bony “handhold” on the sides).',
  20: 'Roller’s choice: pick any Phase 2 location you both want to revisit, or reroll.',
},

    actions: {
  1: 'Use one hand to give 20 straight strokes over the location at a steady pace; repeat this pattern for the turn.',
  2: 'Use one hand: do 10 short, rapid strokes, then 10 slow, long strokes; repeat that sequence for the turn.',
  3: 'Use hands: do 15 light brushing strokes, then 15 steadier rubbing strokes over the area; repeat that sequence for the turn.',
  4: 'Use mouth and tongue: do 10 slow licks in straight lines, then 10 small circular licks on the location; repeat that pattern for the turn.',
  5: 'Use one hand with lubricant to give 20 smooth, gliding strokes in one continuous motion; repeat for the turn.',
  6: 'Use fingers or a toy: do 15 slow back-and-forth motions with a brief pause after every fifth; repeat that pattern for the turn.',
  7: 'Use genitals: do 20 slow motions with one second of stillness after every fourth; repeat that pattern for the turn.',
  8: 'Use hands, mouth, feet, or genitals: do steady rhythm for 30 seconds, then faster for 30 seconds, then back to the original rhythm for 30 seconds; repeat that cycle for the turn.',
  9: 'The giver uses two body parts at once: one does 10 slow strokes while the other does 10 quick strokes; then swap which is slow and which is quick. Repeat that pattern for the turn.',
  10: 'Use hands or genitals: do 10 slow strokes, then 10 medium-speed strokes, then 10 fast strokes, in that order; repeat that sequence for the turn.',
  11: 'Use hands, mouth, feet, or genitals: do one slow movement, one medium, one fast; repeat that three-step pattern for the turn.',
  12: 'Using hands, mouth, feet, or genitals: do 10 strokes, pairing each with an exhale or a small vocal sound; repeat for the turn.',
  13: 'Use hands, mouth, feet, or genitals: do three light touches, then one firmer touch; repeat that sequence for the turn.',
  14: 'Use hands, mouth, feet, or genitals: do five movements in a row, then one full second of stillness; repeat that stop-start cycle for the turn.',
  15: 'Use hands, mouth, feet, or genitals: do 60 seconds of small circular motions at a constant speed; repeat for the turn.',
  16: 'Using hands, mouth, feet, or genitals: do 10 movements, then pause briefly and check in with a green / yellow / red signal; repeat for the turn.',
  17: 'Use hands, mouth, feet, or genitals: do 10 movements, then make the next 10 slightly larger; repeat that progression for the turn.',
  18: 'Use hands, mouth, feet, or genitals: do five identical movements, then five quicker, shorter ones; repeat that set for the turn.',
  19: 'Use hands, mouth, feet, or genitals: do 30 tracing movements, about one second each; repeat for the turn.',
  20: 'Use hands, mouth, feet, or genitals: do slow stroke, medium stroke, fast stroke, brief stillness; repeat that four-step sequence for the turn.'
    }
  },

  3: {
    name: 'Deep intimacy',
    description: 'Positions, rhythm, and shared pleasure; penetration and orgasm are options only if you both want.',
    positions: {
  1: {
    penisVulva: "Missionary: one partner on their back, the other on top facing them. Options: vaginal or anal penetration with penis, or clitoral/vulval contact. The partner on top can control speed, rhythm, and depth if penetration chosen.",
    vulvaPenis: "Missionary: one partner on their back, the other on top facing them. Options: lead's vulva/clitoris as main focus, or penetration with follow's penis (vaginal, between thighs, or anal). Lead controls speed, rhythm, and depth if penetration chosen.",
    vulvaVulva: "Missionary: one partner on their back, the other on top facing them. Options: vaginal or anal penetration (fingers, toys, or strap-on), or external focus on clitoral/vulval contact. The partner on top controls speed, rhythm, and depth if penetration chosen.",
    penisPenis: "Missionary: one partner on their back, the other on top facing them. Options: anal penetration or intercrural (between thighs), or focus on each other's penis/scrotum. The partner on top controls speed, rhythm, and depth if penetration chosen."
  },
  2: {
    penisVulva: "Doggy style / rear-entry: one partner on hands-and-knees or leaning forward (hips up); the other behind. Options: vaginal or anal penetration with penis, or external stimulation of vulva/clitoris from behind. The partner behind can control speed, rhythm, and depth if penetration chosen; the partner in front can adjust angle and push back. (Unlike prone: here you're on hands-and-knees, not flat.)",
    vulvaPenis: "Doggy style / rear-entry: one partner on hands-and-knees or leaning forward (hips up); the other behind. Options: follow's penis from behind (vaginal, between thighs, or anal), or external stimulation of lead's vulva/clitoris from behind. Lead can control angle and push back; the partner behind controls rhythm and depth if penetration chosen.",
    vulvaVulva: "Doggy style / rear-entry: one partner on hands-and-knees or leaning forward (hips up); the other behind. Options: vaginal or anal penetration (fingers, toys, or strap-on) from behind, or external stimulation of vulva/clitoris from behind. The partner behind can control speed, rhythm, and depth if penetration chosen; the partner in front can adjust angle and push back. (Unlike prone: here you're on hands-and-knees, not flat.)",
    penisPenis: "Doggy style / rear-entry: one partner on hands-and-knees or leaning forward (hips up); the other behind. Options: anal penetration or intercrural from behind, or external stimulation of penis/scrotum from behind. The partner behind can control speed, rhythm, and depth if penetration chosen; the partner in front can adjust angle and push back. (Unlike prone: here you're on hands-and-knees, not flat.)"
  },
  3: {
    penisVulva: "Straddle (face-to-face): the follow is on top, straddling the Lead (who is on their back), facing each other. Options: vaginal or anal penetration with lead's penis, or the follow can control their own clitoral/vulval contact by movement. The Lead controls speed, rhythm, and depth if penetration chosen.",
    vulvaPenis: "Straddle (face-to-face): the follow is on top, straddling the Lead (who is on their back), facing each other. Options: penetration with follow's penis (vaginal, between thighs, or anal), or Lead controls clitoral contact. Lead controls speed, rhythm, and depth if penetration chosen.",
    vulvaVulva: "Straddle (face-to-face): one partner is on top, straddling the other (who is on their back), facing each other. Options: vaginal or anal penetration (fingers, toys, or strap-on), or the partner on top controls clitoral/vulval contact. The partner on top controls speed, rhythm, and depth if penetration chosen.",
    penisPenis: "Straddle (face-to-face): one partner is on top, straddling the other (who is on their back), facing each other. Options: anal penetration or intercrural, or focus on each other's penis/scrotum. The partner on top controls speed, rhythm, and depth if penetration chosen."
  },
  4: {
    penisVulva: "Straddle (facing away): the follow is on top, straddling the Lead (who is on their back), facing away from the Lead. Options: vaginal or anal penetration with lead's penis, or external stimulation of follow's vulva/clitoris. The Lead controls speed, rhythm, and depth if penetration chosen.",
    vulvaPenis: "Straddle (facing away): the follow is on top, straddling the Lead (who is on their back), facing away. Options: follow's penis (vaginal, between thighs, or anal), or external stimulation of lead's vulva/clitoris. Lead controls speed, rhythm, and depth if penetration chosen.",
    vulvaVulva: "Straddle (facing away): one partner is on top, straddling the other (who is on their back), facing away. Options: vaginal or anal penetration (fingers, toys, or strap-on), or external stimulation of vulva/clitoris. The partner on top controls speed, rhythm, and depth if penetration chosen.",
    penisPenis: "Straddle (facing away): one partner is on top, straddling the other (who is on their back), facing away. Options: anal penetration or intercrural, or external stimulation of penis/scrotum. The partner on top controls speed, rhythm, and depth if penetration chosen."
  },
  5: {
    penisVulva: "Spooning: both on their sides, one partner behind the other (spooning from behind). Options: vaginal or anal penetration with penis from behind, or external stimulation of vulva/clitoris. The partner behind can control speed, rhythm, and depth if penetration chosen; intimate and comfortable for longer play.",
    vulvaPenis: "Spooning: both on their sides, one partner behind the other (spooning from behind). Options: follow's penis from behind (vaginal, between thighs, or anal), or external stimulation of lead's vulva/clitoris. Lead can control rhythm; the partner behind controls depth; intimate and comfortable for longer play.",
    vulvaVulva: "Spooning: both on their sides, one partner behind the other (spooning from behind). Options: vaginal or anal penetration (fingers, toys, or strap-on) from behind, or external stimulation of vulva/clitoris. The partner behind can control speed, rhythm, and depth if penetration chosen; intimate and comfortable for longer play.",
    penisPenis: "Spooning: both on their sides, one partner behind the other (spooning from behind). Options: anal penetration or intercrural from behind, or external stimulation of penis/scrotum. The partner behind can control speed, rhythm, and depth if penetration chosen; intimate and comfortable for longer play."
  },
  6: {
    penisVulva: "Side-by-side: both on their sides facing each other. Options: vaginal or anal penetration with penis, or mutual genital contact; both partners can use hands for additional stimulation. Both can share control of speed, rhythm, and depth; good for mutual stimulation and eye contact.",
    vulvaPenis: "Side-by-side: both on their sides facing each other. Options: penetration with follow's penis (vaginal, between thighs, or anal) or mutual genital contact; both can use hands. Lead can emphasize vulva/clitoris; both share control; good for mutual stimulation and eye contact.",
    vulvaVulva: "Side-by-side: both on their sides facing each other. Options: vaginal or anal penetration (fingers, toys, or strap-on), or mutual vulva/clitoral contact; both can use hands for additional stimulation. Both can share control of speed, rhythm, and depth; good for mutual stimulation and eye contact.",
    penisPenis: "Side-by-side: both on their sides facing each other. Options: anal penetration or intercrural, or mutual penis/scrotum contact; both can use hands. Both can share control of speed, rhythm, and depth; good for mutual stimulation and eye contact."
  },
  7: {
    penisVulva: "Seated / lap: one partner sits; the other sits or straddles on their lap (face-to-face or facing away). Options: vaginal or anal penetration with penis, or clitoral/vulval contact. The partner on lap can control speed, rhythm, and depth if penetration chosen; good for eye contact and intimacy.",
    vulvaPenis: "Seated / lap: one partner sits; the other sits or straddles on their lap (face-to-face or facing away). Options: follow's penis (vaginal, oral, between thighs, or anal) or lead's clitoral/vulval contact. Lead can control speed, rhythm, and depth; good for eye contact and intimacy.",
    vulvaVulva: "Seated / lap: one partner sits; the other sits or straddles on their lap (face-to-face or facing away). Options: vaginal or anal penetration (fingers, toys, or strap-on), or clitoral/vulval contact. The partner on lap can control speed, rhythm, and depth if penetration chosen; good for eye contact and intimacy.",
    penisPenis: "Seated / lap: one partner sits; the other sits or straddles on their lap (face-to-face or facing away). Options: anal penetration or intercrural, or focus on each other's penis/scrotum. The partner on lap can control speed, rhythm, and depth if penetration chosen; good for eye contact and intimacy."
  },
  8: {
    penisVulva: "Standing: both standing (e.g. one against a wall; alignment depends on height and comfort). Options: vaginal or anal penetration with penis, or external stimulation of vulva/clitoris. The partner not against the wall can control angle, speed, rhythm, and depth if penetration chosen; requires balance and coordination.",
    vulvaPenis: "Standing: both standing (e.g. one against a wall; alignment depends on height and comfort). Options: follow's penis (vaginal, between thighs, or anal) or external stimulation of lead's vulva/clitoris. Lead can control angle and rhythm; requires balance and coordination.",
    vulvaVulva: "Standing: both standing (e.g. one against a wall; alignment depends on height and comfort). Options: vaginal or anal penetration (fingers, toys, or strap-on), or external stimulation of vulva/clitoris. The partner not against the wall can control angle, speed, rhythm, and depth if penetration chosen; requires balance and coordination.",
    penisPenis: "Standing: both standing (e.g. one against a wall; alignment depends on height and comfort). Options: anal penetration or intercrural, or external stimulation of penis/scrotum. The partner not against the wall can control angle, speed, rhythm, and depth if penetration chosen; requires balance and coordination."
  },
  9: {
    penisVulva: "Lotus: seated face-to-face with legs wrapped around each other; close full-body contact. Options: vaginal or anal penetration with penis, or clitoral/vulval contact. Both can rock and share control; one may take the lead on speed, rhythm, and depth if penetration chosen. Intimate position with full body contact.",
    vulvaPenis: "Lotus: seated face-to-face with legs wrapped around each other; close full-body contact. Options: follow's penis (vaginal, between thighs, or anal) or lead's clitoral/vulval contact. Both can rock and share control; lead may take the lead on speed, rhythm, and depth. Intimate position with full body contact.",
    vulvaVulva: "Lotus: seated face-to-face with legs wrapped around each other; close full-body contact. Options: vaginal or anal penetration (fingers, toys, or strap-on), or clitoral/vulval contact. Both can rock and share control; one may take the lead on speed, rhythm, and depth if penetration chosen. Intimate position with full body contact.",
    penisPenis: "Lotus: seated face-to-face with legs wrapped around each other; close full-body contact. Options: anal penetration or intercrural, or focus on each other's penis/scrotum. Both can rock and share control; one may take the lead on speed, rhythm, and depth if penetration chosen. Intimate position with full body contact."
  },
  10: {
    penisVulva: "Tabletop: one partner lies back on a bed/table/counter; the other stands or kneels in front. Options: vaginal or anal penetration with penis, or oral/genital contact. The partner standing or kneeling can control speed, rhythm, and depth if penetration chosen; good access and visibility.",
    vulvaPenis: "Tabletop: one partner lies back on a bed/table/counter; the other stands or kneels in front. Options: oral or penetration with follow's penis (vaginal, between thighs, or anal), or oral on lead's vulva/clitoris. Lead or the partner in front can control speed, rhythm, and depth; good access and visibility.",
    vulvaVulva: "Tabletop: one partner lies back on a bed/table/counter; the other stands or kneels in front. Options: vaginal or anal penetration (fingers, toys, or strap-on), or oral/genital contact. The partner standing or kneeling can control speed, rhythm, and depth if penetration chosen; good access and visibility.",
    penisPenis: "Tabletop: one partner lies back on a bed/table/counter; the other stands or kneels in front. Options: anal penetration or intercrural, or oral/genital contact. The partner standing or kneeling can control speed, rhythm, and depth if penetration chosen; good access and visibility."
  },
  11: {
    penisVulva: "Prone (face-down): one partner lies flat face-down on the bed or surface, hips on the bed (unlike doggy: not on hands-and-knees); the other can lie on top or be at an angle. Options: vaginal or anal penetration from behind, or body-to-body contact. The partner on top or behind can control speed, rhythm, and depth if penetration chosen.",
    vulvaPenis: "Prone (face-down): one partner lies flat face-down on the bed or surface, hips on the bed (unlike doggy: not on hands-and-knees); the other can lie on top or be at an angle. Options: follow's penis from behind (vaginal, between thighs, or anal), or body-to-body contact. Lead or the partner behind can control speed, rhythm, and depth. Different from doggy: bent flat, not on hands-and-knees.",
    vulvaVulva: "Prone (face-down): one partner lies flat face-down on the bed or surface, hips on the bed (unlike doggy: not on hands-and-knees); the other can lie on top or be at an angle. Options: vaginal or anal penetration (fingers, toys, or strap-on) from behind, or body-to-body contact. The partner on top or behind can control speed, rhythm, and depth if penetration chosen.",
    penisPenis: "Prone (face-down): one partner lies flat face-down on the bed or surface, hips on the bed (unlike doggy: not on hands-and-knees); the other can lie on top or be at an angle. Options: anal penetration or intercrural from behind, or body-to-body contact. The partner on top or behind can control speed, rhythm, and depth if penetration chosen."
  },
  12: {
    penisVulva: "69: partners head-to-toe so each can give oral to the other at the same time. Options: each stimulates the other's penis/scrotum or vulva/clitoris with mouth; no penetration unless added manually. Both can set rhythm and intensity; mutual focus.",
    vulvaPenis: "69: partners head-to-toe so each can give oral to the other at the same time. Lead can stimulate follow's penis/scrotum with mouth; follow can stimulate lead's vulva/clitoris. No penetration unless added manually. Both can set rhythm and intensity; mutual focus.",
    vulvaVulva: "69: partners head-to-toe so each can give oral to the other at the same time. Options: each stimulates the other's vulva/clitoris with mouth; no penetration unless added manually. Both can set rhythm and intensity; mutual focus.",
    penisPenis: "69: partners head-to-toe so each can give oral to the other at the same time. Options: each stimulates the other's penis/scrotum with mouth; no penetration unless added manually. Both can set rhythm and intensity; mutual focus."
  },
  13: {
    penisVulva: "Mutual masturbation: partners touch themselves and/or each other with hands only (no penetration unless you add it). Options: hands can stimulate penis/scrotum or vulva/clitoris. Both control their own rhythm; can watch and match each other. No penetration unless manually added.",
    vulvaPenis: "Mutual masturbation: partners touch themselves and/or each other with hands only (no penetration unless you add it). Options: hands can stimulate follow's penis/scrotum or lead's vulva/clitoris. Both control their own rhythm; can watch and match each other. No penetration unless manually added.",
    vulvaVulva: "Mutual masturbation: partners touch themselves and/or each other with hands only (no penetration unless you add it). Options: hands can stimulate vulva/clitoris. Both control their own rhythm; can watch and match each other. No penetration unless manually added.",
    penisPenis: "Mutual masturbation: partners touch themselves and/or each other with hands only (no penetration unless you add it). Options: hands can stimulate penis/scrotum. Both control their own rhythm; can watch and match each other. No penetration unless manually added."
  },
  14: {
    penisVulva: "Body/genital rubbing and scissoring: bodies or genitals rubbing together with no penetration, in any configuration (e.g. between thighs, stomachs, or genitals; or legs interlocked for genital-to-genital). Both can control pressure and rhythm. No penetration.",
    vulvaPenis: "Body/genital rubbing: bodies or genitals rubbing together with no penetration (e.g. between thighs, focus on follow's penis or lead's vulva; legs interlocked). Both can control pressure and rhythm. No penetration.",
    vulvaVulva: "Body/genital rubbing and scissoring: bodies or vulvas rubbing together with no penetration, in any configuration (e.g. between thighs, stomachs, or genitals; or legs interlocked for vulva-to-vulva). Both can control pressure and rhythm. No penetration.",
    penisPenis: "Body/genital rubbing: bodies or penises rubbing together with no penetration (e.g. between thighs, frottage, or intercrural). Both can control pressure and rhythm. No penetration."
  },
  15: {
    penisVulva: "Bent over / standing rear-entry: one partner bent over a bed, table, or surface (e.g. hands on surface, hips supported); the other standing behind. Options: vaginal or anal penetration with penis from behind; the standing partner can control angle, speed, rhythm, and depth if penetration chosen. Different from doggy: bent over a surface rather than on hands-and-knees.",
    vulvaPenis: "Bent over / standing rear-entry: one partner bent over a bed, table, or surface (e.g. hands on surface, hips supported); the other standing behind. Options: follow's penis from behind (vaginal, between thighs, or anal); the standing partner can control angle, speed, rhythm, and depth. Different from doggy: bent over a surface rather than on hands-and-knees.",
    vulvaVulva: "Bent over / standing rear-entry: one partner bent over a bed, table, or surface (e.g. hands on surface, hips supported); the other standing behind. Options: vaginal or anal penetration (fingers, toys, or strap-on) from behind; the standing partner can control angle, speed, rhythm, and depth if penetration chosen. Different from doggy: bent over a surface rather than on hands-and-knees.",
    penisPenis: "Bent over / standing rear-entry: one partner bent over a bed, table, or surface (e.g. hands on surface, hips supported); the other standing behind. Options: anal penetration or intercrural from behind; the standing partner can control angle, speed, rhythm, and depth if penetration chosen. Different from doggy: bent over a surface rather than on hands-and-knees."
  },
  16: {
    penisVulva: "Kneeling (face-to-face): both kneeling, facing each other (e.g. on a bed or floor). Options: vaginal or anal penetration with penis, or genital contact; both can control angle and rhythm. Good for eye contact and balance.",
    vulvaPenis: "Kneeling (face-to-face): both kneeling, facing each other (e.g. on a bed or floor). Options: follow's penis (vaginal, oral, between thighs, or anal) or genital contact with lead's vulva/clitoris; both can control angle and rhythm. Good for eye contact and balance.",
    vulvaVulva: "Kneeling (face-to-face): both kneeling, facing each other (e.g. on a bed or floor). Options: vaginal or anal penetration (fingers, toys, or strap-on), or genital contact; both can control angle and rhythm. Good for eye contact and balance.",
    penisPenis: "Kneeling (face-to-face): both kneeling, facing each other (e.g. on a bed or floor). Options: anal penetration or intercrural, or genital contact; both can control angle and rhythm. Good for eye contact and balance."
  },
  17: {
    penisVulva: "Butterfly: one partner lies on their back with legs bent and feet on the surface (or in the air); the other kneels or stands between the legs. Options: vaginal or anal penetration with penis, or oral/genital contact. The partner between the legs can control speed, rhythm, and depth if penetration chosen; good access and visibility.",
    vulvaPenis: "Butterfly: one partner lies on their back with legs bent and feet on the surface (or in the air); the other kneels or stands between the legs. Options: oral or penetration with follow's penis (vaginal, between thighs, or anal), or oral on lead's vulva/clitoris. Good access and visibility.",
    vulvaVulva: "Butterfly: one partner lies on their back with legs bent and feet on the surface (or in the air); the other kneels or stands between the legs. Options: vaginal or anal penetration (fingers, toys, or strap-on), or oral/genital contact. The partner between the legs can control speed, rhythm, and depth if penetration chosen; good access and visibility.",
    penisPenis: "Butterfly: one partner lies on their back with legs bent and feet on the surface (or in the air); the other kneels or stands between the legs. Options: anal penetration or intercrural, or oral/genital contact. The partner between the legs can control speed, rhythm, and depth if penetration chosen; good access and visibility."
  },
  18: {
    penisVulva: "Wheelbarrow: one partner in a plank/push-up position; the other holds their legs (standing or kneeling). Options: vaginal or anal penetration with penis, or oral/genital contact. Requires strength and balance. Optional: if too demanding for either partner, agree to substitute another position (e.g. tabletop or butterfly) instead.",
    vulvaPenis: "Wheelbarrow: one partner in a plank/push-up position; the other holds their legs (standing or kneeling). Options: oral or penetration with follow's penis, or oral on lead's vulva/clitoris. Requires strength and balance. Optional: if too demanding, agree to substitute (e.g. tabletop or butterfly) instead.",
    vulvaVulva: "Wheelbarrow: one partner in a plank/push-up position; the other holds their legs (standing or kneeling). Options: vaginal or anal penetration (fingers, toys, or strap-on), or oral/genital contact. Requires strength and balance. Optional: if too demanding, agree to substitute (e.g. tabletop or butterfly) instead.",
    penisPenis: "Wheelbarrow: one partner in a plank/push-up position; the other holds their legs (standing or kneeling). Options: anal penetration or intercrural, or oral/genital contact. Requires strength and balance. Optional: if too demanding, agree to substitute (e.g. tabletop or butterfly) instead."
  },
  19: {
    penisVulva: "Bridge: one partner lifts their hips into a bridge pose (back and shoulders on surface); the other is in front (e.g. for oral or penetration). Options: vaginal or anal penetration with penis, or oral/genital contact. The person bridging can lower when needed. Good access and angle. Optional: if too demanding, agree to substitute (e.g. butterfly or tabletop) instead.",
    vulvaPenis: "Bridge: one partner lifts their hips into a bridge pose (back and shoulders on surface); the other is in front (e.g. for oral or penetration). Options: oral or penetration with follow's penis, or oral on lead's vulva/clitoris. The person bridging can lower when needed. Optional: if too demanding, agree to substitute (e.g. butterfly or tabletop) instead.",
    vulvaVulva: "Bridge: one partner lifts their hips into a bridge pose (back and shoulders on surface); the other is in front (e.g. for oral or penetration). Options: vaginal or anal penetration (fingers, toys, or strap-on), or oral/genital contact. The person bridging can lower when needed. Optional: if too demanding, agree to substitute (e.g. butterfly or tabletop) instead.",
    penisPenis: "Bridge: one partner lifts their hips into a bridge pose (back and shoulders on surface); the other is in front (e.g. for oral or penetration). Options: anal penetration or intercrural, or oral/genital contact. The person bridging can lower when needed. Optional: if too demanding, agree to substitute (e.g. butterfly or tabletop) instead."
  },
  20: {
    penisVulva: "Roller's choice: the person who rolled picks any position from this list (1–19) that you both want to try, or a variation you've been curious about. No extended time unless the modifier roll is 20.",
    vulvaPenis: "Roller's choice: the person who rolled picks any position from this list (1–19) that you both want to try, or a variation you've been curious about. No extended time unless the modifier roll is 20.",
    vulvaVulva: "Roller's choice: the person who rolled picks any position from this list (1–19) that you both want to try, or a variation you've been curious about. No extended time unless the modifier roll is 20.",
    penisPenis: "Roller's choice: the person who rolled picks any position from this list (1–19) that you both want to try, or a variation you've been curious about. No extended time unless the modifier roll is 20."
  }
},
   modifiers: {
  1:  "Timer block: for the turn, do the full block, 60s at a steady pace, then 15s of full stillness (no movement), then 45s steady again, then repeat that block for the turn.",
  2:  "Tempo ladder: for the turn, do the full cycle, 15s slow, 15s medium, 15s fast, 15s back to medium, then repeat that cycle for the turn.",
  3:  "Stop-start: for the turn, 10s of movement, then 5s pause; repeat that 6 times.",
  4:  "Pace wave: for the turn, do the full wave, 20s medium, 20s faster, 20s medium, 20s faster, 10s medium, then repeat that wave for the turn.",
  5:  "Edge-of-control: for the turn, for 90s keep intensity high but still manageable (just under “too much”); don’t change tempo.",
  6:  "Micro-pauses: for the turn, add a 1-second pause after every 8 seconds of movement.",
  7:  "Breath sync: for the turn, for 30s match your inhales and exhales while keeping the same rhythm; then continue as you like.",
  8:  "Counting focus: for the turn, count down from 30 out loud together (one number per second) while keeping the same rhythm.",
  9:  "Silence rule: for the turn, no talking for 60s (same pace throughout); then you can talk again.",
  10: "Sound-only: for the turn, for 45s only nonverbal sounds (moans, sighs, no words); keep rhythm steady.",
  11: "Eyes choice: for the turn, do the full cycle, 30s both eyes closed, 30s both eyes open, 30s your choice (keep pace the same), then repeat that cycle for the turn.",
  12: "Hands-only: for the turn, for 60s only hands may be used (no mouth, no toys); keep tempo steady.",
  13: "No-hands: for the turn, for 30s neither partner uses hands (e.g. bodies only, or mouth/toy); then 60s normal (hands allowed).",
  14: "Rhythm mirror: for the turn, do the full pattern, one partner sets the rhythm for 20s, the other copies it for 20s, then repeat once (swap who leads), so each leads twice.",
  15: "Pattern rule: for the turn, do “slow-slow-fast” for 60s, then steady medium pace for 30s.",
  16: "Size shift: for the turn, do the full cycle, keep tempo the same but for 45s gradually make each movement larger (longer/fuller), then for 45s gradually make them smaller again, then repeat that cycle for the turn.",
  17: "Vibrator ladder (if using a toy): for the turn, do the full cycle, 20s low, 20s medium, 20s high, 30s at whoever’s preferred setting (where to use it: agree together), then repeat that cycle for the turn.",
  18: "Pulse vs steady (if using a toy): for the turn, do the full cycle, 30s steady vibration, 30s pulse mode, 30s steady (where to use it: agree together), then repeat that cycle for the turn.",
  19: "Hand + toy duet: for the turn, do the full cycle, one person keeps a steady rhythm with hands while the other adds a toy for 45s, then swap roles for 45s (same tempo), then repeat that cycle for the turn.",
  20: "Finale structure: for the turn, 20s build (slower), 20s peak (faster), 20s slow down, 10s stillness; then continue at whatever pace you want (toy optional)."
}

  }
};
