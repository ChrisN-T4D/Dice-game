'use strict';
// Extended “Need help understanding?” descriptions for each prompt (attaches to tables)

(function attachPromptHelp() {
  if (typeof tables === 'undefined') return;

  // Phase 1: Warm-up – location help
  tables[1].locationHelp = {
    1: 'Focus on the lips only, no tongue inside the mouth. Gentle pressure, kissing, or light nibbles if agreed. Keeps the prompt clearly on the mouth area.',
    2: 'The outer ear (lobe and the curve around the inner rim). Use breath, lips, or fingertips. Avoid inserting anything into the ear canal.',
    3: 'The back of the neck where it meets the skull and the muscles along the spine. Great for slow strokes, light pressure, or warm breath.',
    4: 'The bony ridge between the shoulders and the base of the throat. Gentle strokes or kisses work well here.',
    5: 'The rounded top of the arm and the muscle between neck and arm. Good for kneading, squeezing, or broad palm strokes.',
    6: 'The nipple and the darker circle around it (areola). Any body type. Touch or mouth only; no pinching that hurts unless agreed.',
    7: 'The whole chest area: under the breast/pec, the sides, and the curve. Broader than just the nipple.',
    8: 'The inner arm from wrist toward armpit, and the soft fold at the elbow. Use palms or fingertips.',
    9: 'The inside of the wrist where the pulse is. Soft touch or lips; very sensitive.',
    10: 'The palm and the pads of the fingers. Stroking, tracing, or light pressure.',
    11: 'The belly button and the skin around it. Gentle circles or light tracing; no deep pressure unless agreed.',
    12: 'The lower back above the tailbone and the flat area between the hip bones. Good for firm strokes or kneading.',
    13: 'The sides of the body at the waist and the bony part of the hip. You can grip or stroke along the waistband line.',
    14: 'The buttocks only, no cleft or between. Squeezing, kneading, or broad strokes over the cheeks.',
    15: 'The perineum is the small area of skin between the genitals and the anus (external only). Gentle pressure or strokes; very sensitive.',
    16: 'The inner thigh from the knee up toward the groin. Slow strokes or light touch; avoid genitals unless you move there next.',
    17: 'The soft hollow behind the knee. Light touch or lips; ticklish for some.',
    18: 'The sole and arch of the foot. Strokes, light pressure, or tracing. Only if both are comfortable with foot touch.',
    19: 'Genitals (external). Phase 1 keeps it light: touching or stroking over clothing or with consent, no penetration.',
    20: 'The person who rolled picks any location from this list that you both want to focus on, or roll again for a new one.'
  };

  // Phase 1 – action help
  tables[1].actionHelp = {
    1: 'Use your whole palm and fingers in one direction (e.g. shoulder to wrist). Keep the pace slow and even so it feels predictable and soothing.',
    2: 'Use only the very tips of your fingers so the touch is barely there. Let the skin “wake up” without pressure.',
    3: 'Use the heel of your hand (where the palm meets the wrist) to squeeze and release the muscle in a slow rhythm, like kneading dough gently.',
    4: 'Rest your hand on the spot and do not move it much. Breathe together and notice the warmth and contact. Simple and intimate.',
    5: 'One finger only, drawing lines, circles, or simple shapes on the skin. Slow and light so they can feel the path.',
    6: 'Switch between one finger and several fingers so the sensation changes (e.g. one finger, then all five, then one again).',
    7: 'Use the pads of your fingers to tap softly and in a rhythm. Not slapping, light, repetitive taps.',
    8: 'Cup the area (e.g. shoulder, breast, buttock) in your palm and hold. You can add very small movements if it feels good.',
    9: 'Stroke with the back of your fingers or the back of your hand instead of the palm. The skin feels different (smoother, cooler).',
    10: 'Use one or two fingers to draw circles, small and large, slow, on the skin. Stay on the same spot or drift slowly.',
    11: 'Blow warm air onto the area (e.g. neck, wrist, stomach). Pause between breaths so they can feel the contrast.',
    12: 'Place closed-mouth kisses on the spot. No licking or biting unless you’ve agreed otherwise.',
    13: 'Use the tip of your tongue to draw short lines or small shapes. Keep it light and slow.',
    14: 'Press your closed lips to the skin and hold for a moment, then release. Repeat in a slow rhythm.',
    15: 'Create very gentle suction with your lips (like a light kiss that “holds”), then release. Repeat slowly.',
    16: 'Brush the skin with your eyelashes in a fluttering motion. Very light and playful.',
    17: 'Use the sole of your foot or your toes to stroke the area. Only if both of you are comfortable with foot play.',
    18: 'Use the edge of your foot or your toes to trace lines or shapes. Gentle and slow.',
    19: 'Use your toes to tap softly and in a rhythm on the area. Only if both are okay with foot contact.',
    20: 'Spend roughly twice as long on this location. Then roll the dice again on the action table to choose how to touch it (same or new action).'
  };

  // Phase 2 – location help (subset; can expand)
  tables[2].locationHelp = {
    1: 'The inside of the lips and the tongue (kissing, licking; no biting). Keeps focus on the mouth only.',
    2: 'Ear lobes and the inner rim of the ear. Gentle breath, lips, or fingers; nothing inside the ear canal.',
    3: 'The front of the neck and under the jaw. Sensitive; use light touch or kisses.',
    4: 'Back of the neck and hairline. Good for strokes, breath, or light pressure.',
    5: 'Collarbones and upper chest above the breast/pec line. Strokes or kisses work well.',
    6: 'Nipples and areolas, any body type. Touch or mouth only; no penetration.',
    7: 'Same as 6, use for a second round on nipples or reroll for a different location.',
    8: 'Full breast or pec: under the curve, sides, and outer curve. Broader than just the nipple.',
    9: 'The lower belly “V” and the line where waistband or pubic hair starts (external only).',
    10: 'The pubic mound (mons) and upper groin above the genitals (external only).',
    11: 'Inner thighs, upper third, and the crease where thigh meets groin (external only).',
    12: 'Inner thighs and groin creases in general. Stay external.',
    13: 'Buttocks and the crease where the butt meets the back of the thigh.',
    14: 'Lower back (sacrum) and the top of the buttocks.',
    15: 'Perineum: the area between genitals and anus (external only). Very sensitive.',
    16: 'Outer vulva only (outer lips); no penetration. Touch or mouth as agreed.',
    17: 'Penis and scrotum; touch or mouth as agreed. No penetration unless you both agree.',
    18: 'Skin just beside the genitals (e.g. where thigh meets groin, or just outside the most sensitive spots).',
    19: 'The bony hip bones on the sides—the “handhold” area. Gripping or stroking.',
    20: 'The person who rolled chooses any Phase 2 location you both want to revisit, or you reroll for a new one.'
  };

  // Phase 2 – action help (subset)
  tables[2].actionHelp = {
    1: 'One hand, 20 strokes in one direction at a steady pace. Count if it helps; keep the rhythm even.',
    2: 'One hand: 10 short, quick strokes, then 10 slow, long strokes. Then repeat that whole sequence once.',
    3: 'Both hands: 15 light brushing strokes, then right away 15 steadier rubbing strokes on the same area.',
    4: 'Mouth and tongue: 10 slow licks in straight lines, then 10 small circular licks. Stay on the location.',
    5: 'One hand with lube: 20 smooth, gliding strokes in one continuous motion (no stopping).',
    6: 'Fingers or a toy (e.g. dildo or vibrator): move slowly in and out (or back and forth) 15 times, with a short pause after every fifth.',
    7: 'Genitals (e.g. grinding or thrusting): 20 slow movements, with one full second of stillness after every fourth. Penetration only if agreed.',
    8: 'Use hands, mouth, feet, or genitals: 30 seconds at a steady rhythm, then 30 seconds faster, then 30 seconds back to the first steady rhythm.',
    9: 'The giver uses two body parts (e.g. one hand + mouth): one does 10 slow strokes while the other does 10 quick; then swap which is slow and which is quick.',
    10: 'Hands or genitals only: exactly 10 slow strokes, then 10 medium-speed, then 10 fast, in that order. No skipping.',
    11: 'Three-step pattern: one slow movement, one medium, one fast. Repeat that pattern 10 times.',
    12: 'With each of 10 strokes, add an exhale or a small sound (moan, sigh). Stay in rhythm.',
    13: 'Pattern: three light touches, then one firmer touch. Repeat that sequence eight times.',
    14: 'Stop-start: five movements in a row, then one full second of no movement. Repeat that cycle 10 times.',
    15: 'For 60 seconds, use only small circles at a constant speed (hands, mouth, feet, or genitals).',
    16: 'After every 10 movements, pause and check in: green = good, yellow = slow down, red = stop. Then do the next 10.',
    17: 'Keep the same action, but every 10 movements make each movement a bit larger (longer or fuller).',
    18: 'One set = five identical movements plus five quicker, shorter ones. Do four sets total.',
    19: '30 tracing movements (about one second each), no pauses. Keep a steady pace.',
    20: 'Four steps: slow stroke, medium stroke, fast stroke, brief stillness. Do that four-step sequence eight times in a row.'
  };

  // Phase 3 – position help
  tables[3].positionHelp = {
    1: 'One partner lies on their back; the other lies or kneels on top facing them. Classic position; good for eye contact and kissing.',
    2: 'Doggy: one partner on hands-and-knees (hips up); the other behind. Unlike prone, you are not flat. Check in about comfort and depth.',
    3: 'Partner on top straddles the other face-to-face. They control speed, rhythm, and depth if penetration chosen; the other can touch and kiss.',
    4: 'Partner on top facing away. Different angle and sensation; the person on bottom can touch their partner’s body.',
    5: 'Both on their sides, one behind the other (spooning). Comfortable and intimate; good for longer sessions.',
    6: 'Both on their sides facing each other. Full body contact; kissing and eye contact easy.',
    7: 'One sits (e.g. on a chair or bed); the other sits or straddles on their lap. Face-to-face or facing away by preference.',
    8: 'Both standing (e.g. one against a wall). Alignment depends on height; use pillows or a step if needed.',
    9: 'Seated face-to-face with legs wrapped around each other. Very close; movement is often subtle and rocking.',
    10: 'One lies back on a bed, table, or counter; the other stands or kneels in front. Good for oral or penetration.',
    11: 'Prone: one partner lies flat face-down, hips on the bed (unlike doggy—not on hands-and-knees); the other on top or at an angle. Good for penetration from behind or body-to-body contact.',
    12: 'Head-to-toe so each person can give oral to the other at the same time. Coordination and comfort matter; adjust angles as needed.',
    13: 'Partners touch themselves and/or each other with hands only. No penetration unless you add it. Focus on rhythm and watching.',
    14: 'Body/genital rubbing and scissoring: bodies or genitals rubbing together with no penetration, in any configuration (e.g. thighs, stomachs, genitals; or legs interlocked). Build rhythm and pressure together.',
    15: 'Bent over / standing rear-entry: one partner bent over a surface (e.g. bed, table); the other standing behind. Different from doggy: bent over a surface, not on hands-and-knees.',
    16: 'Kneeling (face-to-face): both kneeling, facing each other. Good for eye contact, penetration, or genital contact; both can control angle and rhythm.',
    17: 'One lies on their back, legs bent, feet on the surface or in the air; the other kneels or stands between the legs. Good for oral or penetration.',
    18: 'One in a plank or push-up position; the other holds their legs (like a wheelbarrow). Requires balance and strength; try only if both are comfortable.',
    19: 'One lifts their hips into a bridge (back and shoulders on the surface); the other is in front. Good for oral or penetration; the person bridging can lower when needed.',
    20: 'Critical roll: double time. Reroll for position; spend twice as long in whichever position comes up.'
  };

  // Phase 3 – modifier help
  tables[3].modifierHelp = {
    1: 'Follow the clock: 60 seconds at a steady pace, then 15 seconds of complete stillness (no movement), then 45 seconds steady again. The pause is part of the game.',
    2: 'Change tempo every 15 seconds: slow, then medium, then fast, then back to medium. One person can call the switches.',
    3: 'Do 10 seconds of movement, then 5 seconds of pause. Repeat that 6 times. Clear stop-and-go structure.',
    4: 'Pace wave: 20s medium, 20s faster, 20s medium, 20s faster, 10s medium. Build and ease in waves.',
    5: 'For 90 seconds keep the intensity high but still under “too much.” No tempo change; ride the edge together. Ease off if anyone says so.',
    6: 'For the whole round, add a 1-second pause after every 8 seconds of movement. Small breaks without losing the rhythm.',
    7: 'For 30 seconds try to match your breathing (inhale and exhale together) while keeping the same rhythm. Then continue as you like.',
    8: 'Count down from 30 out loud together (one number per second) while keeping the same rhythm. Adds focus and playfulness.',
    9: 'No talking for 60 seconds; keep the same pace. After 60 seconds you can talk again. Nonverbal only during the minute.',
    10: 'For 45 seconds only nonverbal sounds (moans, sighs, no words). Keep the rhythm steady. Then you can talk again.',
    11: '30 seconds both with eyes closed, 30 seconds both open, 30 seconds your choice. Keep the pace the same throughout.',
    12: 'For 60 seconds only hands may be used (no mouth, no toys). Keep tempo steady. Then you can add mouth or toys again.',
    13: 'For 30 seconds neither partner uses hands (e.g. bodies only, or mouth/toy). Then 60 seconds with hands allowed. Same tempo idea throughout.',
    14: 'One partner sets the rhythm for 20 seconds; the other copies it for 20 seconds. Then repeat once and swap who leads.',
    15: 'Do “slow, slow, fast” over and over for 60 seconds, then 30 seconds of steady medium pace. Simple pattern, then steady.',
    16: 'Keep the same tempo the whole time. For 45 seconds gradually make each movement larger (longer or fuller), then for 45 seconds gradually make them smaller again.',
    17: 'If using a vibrator: 20s low, 20s medium, 20s high, then 30s at whoever’s preferred setting. Where to use it: agree together first.',
    18: 'If using a vibrator: 30s steady, 30s pulse mode, 30s steady. Where to use it: agree together.',
    19: 'One person keeps a steady rhythm with hands while the other adds a toy for 45 seconds; then swap roles for 45 seconds. Same tempo throughout.',
    20: 'Structure: 20s build (slower), 20s peak (faster), 20s slow down, 10s stillness. Then continue at whatever pace you want; toy is optional.'
  };

  window.getPromptHelp = function (phase, type, roll) {
    const p = tables[phase];
    if (!p) return '';
    const r = parseInt(roll, 10);
    if (type === 'where') {
      if (phase === 3) {
        const pos = p.positions && p.positions[r];
        const posStr = typeof pos === 'string' ? pos : (pos && (pos.penisVulva || pos.vulvaPenis || pos.vulvaVulva || pos.penisPenis));
        return (p.positionHelp && p.positionHelp[r]) || posStr || '';
      }
      return (p.locationHelp && p.locationHelp[r]) || (p.locations && p.locations[r]) || '';
    }
    if (type === 'what') {
      if (phase === 3) return (p.modifierHelp && p.modifierHelp[r]) || (p.modifiers && p.modifiers[r]) || '';
      return (p.actionHelp && p.actionHelp[r]) || (p.actions && p.actions[r]) || '';
    }
    return '';
  };
})();
