'use strict';
/**
 * Tailor Phase 3 position (and modifier) text to the selected anatomy for each partner.
 * giverPartner / receiverPartner are 1 or 2; anatomy is read from global partnerAnatomy1 / partnerAnatomy2.
 */

/** Anatomy key for position variants: (giver anatomy)(receiver anatomy), e.g. penisVulva, vulvaPenis. */
function getPhase3AnatomyKey(giverPartner, receiverPartner) {
  const g = (giverPartner === 1 ? (typeof partnerAnatomy1 !== 'undefined' ? partnerAnatomy1 : 'penis') : (typeof partnerAnatomy2 !== 'undefined' ? partnerAnatomy2 : 'vulva')) || (giverPartner === 1 ? 'penis' : 'vulva');
  const r = (receiverPartner === 1 ? (typeof partnerAnatomy1 !== 'undefined' ? partnerAnatomy1 : 'penis') : (typeof partnerAnatomy2 !== 'undefined' ? partnerAnatomy2 : 'vulva')) || (receiverPartner === 1 ? 'penis' : 'vulva');
  const cap = (s) => (s && s[0].toUpperCase() + (s.slice(1) || '')) || '';
  return (g === 'penis' ? 'penis' : 'vulva') + (r === 'penis' ? 'Penis' : 'Vulva');
}

/**
 * Return the Phase 3 position text for the given roll and giver/receiver.
 * If positions[roll] is an object with penisVulva/vulvaPenis/vulvaVulva/penisPenis, picks the right variant; otherwise uses legacy string + tailorPhase3Position.
 */
function getPhase3PositionText(positionRoll, giverPartner, receiverPartner) {
  const phaseTable = typeof tables !== 'undefined' ? tables[3] : null;
  const positions = phaseTable && phaseTable.positions;
  if (!positions || positionRoll == null) return '';
  const raw = positions[positionRoll];
  if (raw == null) return '';
  if (typeof raw === 'string') {
    return tailorPhase3Position(raw, giverPartner, receiverPartner);
  }
  const key = getPhase3AnatomyKey(giverPartner, receiverPartner);
  const text = raw[key] || raw.penisVulva || raw.vulvaPenis || raw.vulvaVulva || raw.penisPenis || '';
  return tailorPhase3Position(text, giverPartner, receiverPartner);
}

function tailorPhase3Position(text, giverPartner, receiverPartner) {
  if (!text || typeof text !== 'string') return text;
  if (giverPartner == null || receiverPartner == null) return text;
  const giverAnatomy = (giverPartner === 1 ? (typeof partnerAnatomy1 !== 'undefined' ? partnerAnatomy1 : 'penis') : (typeof partnerAnatomy2 !== 'undefined' ? partnerAnatomy2 : 'vulva')) || (giverPartner === 1 ? 'penis' : 'vulva');
  const receiverAnatomy = (receiverPartner === 1 ? (typeof partnerAnatomy1 !== 'undefined' ? partnerAnatomy1 : 'penis') : (typeof partnerAnatomy2 !== 'undefined' ? partnerAnatomy2 : 'vulva')) || (receiverPartner === 1 ? 'penis' : 'vulva');

  let out = text;

  // Rule: vaginal is only removed when there is no vagina (i.e. both partners have penis anatomy). All other combos keep vaginal where applicable.

  // Both vulva (lead has vulva, receiver has vulva) — keep vaginal
  if (giverAnatomy === 'vulva' && receiverAnatomy === 'vulva') {
    out = out
      .replace(/\bvaginal or anal penetration with penis\b/gi, 'vaginal or anal penetration (fingers, toys, or strap-on)')
      .replace(/\bAllows for vaginal or anal penetration with penis\b/gi, 'Allows for vaginal or anal penetration (fingers, toys, or strap-on)')
      .replace(/\bpenetration with penis\b/gi, 'penetration (fingers, toys, or strap-on)')
      .replace(/\bPenis provides\b/g, 'Fingers or toys can provide')
      .replace(/\bpenis provides\b/g, 'fingers or toys can provide')
      .replace(/\bPenis can\b/g, 'Hands or toys can')
      .replace(/\bpenis can\b/g, 'hands or toys can')
      .replace(/\bpenis thrusts\b/gi, 'fingers or a toy can be used for thrusting')
      .replace(/\bpenis\/scrotum with mouth\b/gi, 'vulva/clitoris with mouth')
      .replace(/\bpenis\/scrotum or vulva\/clitoris\b/gi, 'vulva/clitoris')
      .replace(/\bpenis\/scrotum\b/gi, 'vulva/clitoris');
    // Missionary: lead (vulva) chooses position; options use fingers/toys/strap-on, not lead's penis
    out = out.replace(
      /\bAllows for vaginal or anal penetration \(fingers, toys, or strap-on\), or clitoral\/vulval contact\. The partner on top can control (?:depth and rhythm|speed, rhythm, and depth if penetration chosen)\.\b/g,
      'Lead chooses position (who is on top and who is on their back). Options: vaginal or anal penetration (fingers, toys, or strap-on), or external focus on lead\'s clitoral/vulval contact. Lead controls speed, rhythm, and depth if penetration chosen.'
    );
  } else if (giverAnatomy === 'penis' && receiverAnatomy === 'penis') {
    // Both penis — no vagina present; vaginal is the only option we remove (replace with anal/intercrural)
    out = out
      .replace(/\bvaginal or anal penetration with penis\b/gi, 'anal penetration or intercrural (between thighs)')
      .replace(/\bAllows for vaginal or anal penetration with penis\b/gi, 'Allows for anal penetration or intercrural (between thighs)')
      .replace(/\bpenetration with penis from behind\b/gi, 'anal penetration or intercrural from behind')
      .replace(/\bpenetration with penis\b/gi, 'anal penetration or intercrural')
      .replace(/\bclitoral\/vulval contact\b/gi, 'focus on each other\'s penis/scrotum')
      .replace(/\bclitoral\/vulval\b/gi, 'penis/scrotum')
      .replace(/\bexternal stimulation of vulva\/clitoris\b/gi, 'external stimulation of penis/scrotum')
      .replace(/\bvulva\/clitoris\b/gi, 'penis/scrotum')
      .replace(/\bclitoris gets contact\b/gi, 'bodies align for mutual stimulation')
      .replace(/\bclitoral stimulation during penetration\b/gi, 'mutual stimulation')
      .replace(/\bPenis provides shallow penetration\b/gi, 'Shallow thrusting or frottage')
      .replace(/\bVulva-to-vulva contact\b/gi, 'Frottage (penis-to-penis or between thighs)')
      .replace(/\bOne partner can stimulate penis\/scrotum with mouth while the other stimulates vulva\/clitoris\b/gi, 'Each can give oral to the other\'s penis/scrotum')
      .replace(/\bHands can stimulate penis\/scrotum or vulva\/clitoris\b/gi, 'Hands can stimulate penis/scrotum')
      .replace(/\bPenis can rub against vulva\b/gi, 'Penis can rub against thighs, stomach, or other')
      .replace(/\b(?:Intercrural \(thigh sex\)|Between thighs): thrusting or rubbing between (?:the receiving partner's|one partner's) closed thighs\b/gi, 'Between thighs: thrusting or rubbing between lead\'s closed thighs (follow\'s penis)');
    // Missionary: lead (penis) chooses position; options anal/intercrural or mutual penis/scrotum
    out = out.replace(
      /\bAllows for anal penetration or intercrural \(between thighs\), or focus on each other's penis\/scrotum\. The partner on top can control (?:depth and rhythm|speed, rhythm, and depth if penetration chosen)\.\b/g,
      'Lead chooses position (who is on top and who is on their back). Options: anal penetration or intercrural (between thighs), or focus on each other\'s penis/scrotum. Lead controls speed, rhythm, and depth if penetration chosen.'
    );
  } else if (giverAnatomy === 'vulva' && receiverAnatomy === 'penis') {
    // Giver vulva, receiver penis — lead has vulva, follow has penis; vaginal penetration (of lead by follow) is an option
    out = out
      .replace(/\bvaginal or anal penetration with penis\b/gi, 'penetration with follow\'s penis (vaginal, between thighs, or anal)')
      .replace(/\bAllows for vaginal or anal penetration with penis\b/gi, 'Allows for penetration with follow\'s penis (vaginal, between thighs, or anal); lead can get clitoral contact in some variants')
      .replace(/\bpenetration with penis from behind\b/gi, 'follow\'s penis from behind (vaginal, between thighs, or anal)')
      .replace(/\bpenetration with penis\b/gi, 'penetration with follow\'s penis (vaginal, between thighs, or anal)')
      .replace(/\bclitoral\/vulval contact\b/gi, 'clitoral contact for lead')
      .replace(/\bthe receiving partner can control clitoral\/vulval contact\b/gi, 'the follow (with penis) can control rhythm; lead can add clitoral touch')
      .replace(/\bexternal stimulation of vulva\/clitoris\b/gi, 'external stimulation of lead\'s vulva/clitoris')
      .replace(/\bPenis provides shallow penetration while maintaining clitoral contact\b/gi, 'Follow\'s penis can be used for shallow penetration; lead can maintain clitoral contact')
      .replace(/\bOne partner can stimulate penis\/scrotum with mouth while the other stimulates vulva\/clitoris\b/gi, 'Lead can stimulate follow\'s penis/scrotum with mouth; follow can stimulate lead\'s vulva/clitoris')
      .replace(/\bPenis can rub against vulva\b/gi, 'Follow\'s penis can rub against lead\'s vulva, thighs, or other')
      .replace(/\b(?:Intercrural \(thigh sex\)|Between thighs): thrusting or rubbing between (?:the receiving partner's|one partner's) closed thighs\b/gi, 'Between thighs: thrusting or rubbing between lead\'s closed thighs (follow\'s penis); no penetration')
      .replace(/\bVulva-to-vulva contact with rubbing motion\. No penetration involved\.\b/gi, 'Genital contact with rubbing motion (e.g. between thighs; focus on follow\'s penis or lead\'s vulva). No penetration involved.');
    // Missionary: lead (vulva) chooses position; keep penetration option but emphasize lead's vulva/clitoris
    out = out.replace(
      /\bAllows for focus on follow's penis \(oral, between thighs, or anal\); lead can get clitoral contact in some variants\.\b/g,
      'Lead chooses position (who is on top and who is on their back). Options: (1) Lead\'s vulva/clitoris as the main focus; penetration with follow\'s penis optional. (2) Penetration with follow\'s penis (vaginal, between thighs, or anal), while emphasizing lead\'s vulva/clitoris.'
    );
    out = out.replace(/\bThe partner on top can control (?:depth and rhythm|speed, rhythm, and depth if penetration chosen)\.\b/g, 'Lead controls speed, rhythm, and depth if penetration chosen.');
  } else {
    // Giver penis, receiver vulva (default combo): light tailoring — keep vaginal (follow has vulva)
    out = out
      .replace(/\bclitoral\/vulval contact\b/gi, 'follow\'s clitoral/vulval contact')
      .replace(/\bexternal stimulation of vulva\/clitoris\b/gi, 'external stimulation of follow\'s vulva/clitoris')
      .replace(/\bVulva-to-vulva contact with rubbing motion\. No penetration involved\.\b/gi, 'Genital contact with rubbing motion (focus on follow\'s vulva/clitoris). No penetration involved.');
    // Missionary (and similar): lead chooses position and controls depth/rhythm; penetration wording anatomical
    out = out.replace(
      /\bAllows for vaginal or anal penetration with penis, or follow's clitoral\/vulval contact\. The partner on top can control (?:depth and rhythm|speed, rhythm, and depth if penetration chosen)\.\b/g,
      'Lead chooses position (who is on top and who is on their back). Options: vaginal or anal penetration with lead\'s penis, or external focus on lead\'s penis (hand, mouth, or between thighs). Lead controls speed, rhythm, and depth if penetration chosen.'
    );
  }

  // Any position where "receiving partner" or "partner on top" controlled rhythm/depth → lead controls speed, rhythm, depth if penetration
  out = out.replace(/\bThe receiving partner controls (?:rhythm and depth|speed, rhythm, and depth if penetration chosen)\.\b/gi, 'Lead controls speed, rhythm, and depth if penetration chosen.');
  out = out.replace(/\bThe partner on top controls speed, rhythm, and depth if penetration chosen\.\b/g, 'Lead controls speed, rhythm, and depth if penetration chosen.');
  out = out.replace(/\bThe partner on top or behind can control speed, rhythm, and depth if penetration chosen\.\b/g, 'Lead controls speed, rhythm, and depth if penetration chosen.');
  out = out.replace(/\bThe standing partner can control angle, speed, rhythm, and depth if penetration chosen\.\b/g, 'Lead controls speed, rhythm, and depth if penetration chosen.');

  // Replace "lead"/"follow" (and "Lead partner") with specific partner names so the description is clear
  if (typeof getPartnerName === 'function') {
    const leadName = getPartnerName(giverPartner);
    const followName = getPartnerName(receiverPartner);
    out = out.replace(/\bLead partner's\b/g, leadName + "'s");
    out = out.replace(/\bLead partner\b/g, leadName);
    out = out.replace(/\blead's\b/g, leadName + "'s");
    out = out.replace(/\bLead\b/g, leadName);
    out = out.replace(/\bfollow's\b/g, followName + "'s");
    out = out.replace(/\bthe follow\b/gi, followName);
  }
  return out;
}

/**
 * Tailor Phase 3 modifier (how) text if it contains anatomy-specific wording.
 */
function tailorPhase3Modifier(text, giverPartner, receiverPartner) {
  if (!text || typeof text !== 'string') return text;
  if (giverPartner == null || receiverPartner == null) return text;
  const giverAnatomy = (giverPartner === 1 ? (typeof partnerAnatomy1 !== 'undefined' ? partnerAnatomy1 : 'penis') : (typeof partnerAnatomy2 !== 'undefined' ? partnerAnatomy2 : 'vulva')) || (giverPartner === 1 ? 'penis' : 'vulva');
  const receiverAnatomy = (receiverPartner === 1 ? (typeof partnerAnatomy1 !== 'undefined' ? partnerAnatomy1 : 'penis') : (typeof partnerAnatomy2 !== 'undefined' ? partnerAnatomy2 : 'vulva')) || (receiverPartner === 1 ? 'penis' : 'vulva');

  let out = text;
  if (giverAnatomy === 'vulva' && receiverAnatomy === 'vulva') {
    out = out.replace(/\bhands, mouth, feet, or genitals\b/gi, 'hands, mouth, feet, or genitals (fingers, toys)');
  }
  if (giverAnatomy === 'penis' && receiverAnatomy === 'penis') {
    out = out.replace(/\bgenitals\b/gi, 'penis/scrotum');
  }
  return out;
}

// ----- Shared and Phase 1 / Phase 2 anatomy-aware tailoring -----

function getAnatomy(partnerNum) {
  if (partnerNum == null) return 'vulva';
  const a = partnerNum === 1 ? (typeof partnerAnatomy1 !== 'undefined' ? partnerAnatomy1 : 'penis') : (typeof partnerAnatomy2 !== 'undefined' ? partnerAnatomy2 : 'vulva');
  return a || (partnerNum === 1 ? 'penis' : 'vulva');
}

/**
 * Tailor Phase 1 location (where) text to receiver anatomy.
 * Roll 7 = chest (breasts or pecs); roll 19 = primary genitals (vulva or penis/scrotum).
 */
function tailorPhase1Location(locationText, locationRoll, receiverPartner) {
  if (!locationText || typeof locationText !== 'string') return locationText;
  if (receiverPartner == null) return locationText;
  const receiverAnatomy = getAnatomy(receiverPartner);
  const roll = parseInt(locationRoll, 10);
  if (roll === 7) {
    return 'Chest (breasts or pecs; including under-breast/pec fold and outer curves).';
  }
  if (roll === 19) {
    if (receiverAnatomy === 'penis') {
      return 'Primary genitals (penis and scrotum; external only, no penetration).';
    }
    return 'Primary genitals (vulva; external only, no penetration).';
  }
  return locationText;
}

/**
 * Tailor Phase 2 location (where) text to receiver anatomy.
 * 16–17 = distinct genital areas (see below).
 * 10, 11, 15, 18 = replace generic "genitals" with receiver-specific wording.
 * Vulva: 16 = outer vulva (labia majora), 17 = clitoris and inner vulva (labia minora).
 * Penis: 16 = scrotum (balls), 17 = shaft and glans.
 */
function tailorPhase2Location(locationText, locationRoll, receiverPartner) {
  if (!locationText || typeof locationText !== 'string') return locationText;
  if (receiverPartner == null) return locationText;
  const receiverAnatomy = getAnatomy(receiverPartner);
  const roll = parseInt(locationRoll, 10);
  if (roll === 16) {
    if (receiverAnatomy === 'penis') {
      return 'Scrotum (balls; touch or mouth, no penetration unless agreed).';
    }
    return 'Outer vulva only (outer lips / labia majora; no penetration).';
  }
  if (roll === 17) {
    if (receiverAnatomy === 'vulva') {
      return 'Clitoris and inner vulva (clitoral hood, inner lips / labia minora; external only, no penetration).';
    }
    return 'Penis shaft and glans (touch or mouth, no penetration unless agreed).';
  }
  // Rolls 10, 11, 15, 18: replace "genitals" with receiver anatomy
  if (roll === 10 || roll === 11 || roll === 15 || roll === 18) {
    if (receiverAnatomy === 'penis') {
      return locationText
        .replace(/\babove genitals\b/gi, 'above penis and scrotum')
        .replace(/\bnearest to genitals\b/gi, 'nearest to penis and scrotum')
        .replace(/\bbetween genitals and anus\b/gi, 'between penis/scrotum and anus')
        .replace(/\bbeside genitals\b/gi, 'beside penis and scrotum')
        .replace(/\bGenital "edges": the skin just beside genitals\b/gi, 'Genital "edges": the skin just beside penis and scrotum');
    }
    return locationText
      .replace(/\babove genitals\b/gi, 'above vulva')
      .replace(/\bnearest to genitals\b/gi, 'nearest to vulva')
      .replace(/\bbetween genitals and anus\b/gi, 'between vulva and anus')
      .replace(/\bbeside genitals\b/gi, 'beside vulva')
      .replace(/\bGenital "edges": the skin just beside genitals\b/gi, 'Genital "edges": the skin just beside vulva');
  }
  return locationText;
}

/**
 * Phase 2 location rolls where using genitals on that body part is not practical
 * (e.g. nape of neck, ears, mouth—genital contact there is not feasible).
 */
var phase2GenitalCapableLocationRolls = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20];

/**
 * Tailor Phase 2 action (what) text to giver and receiver anatomy.
 * Replaces generic "genitals" with anatomy-aware wording.
 * When locationRoll is not genital-capable (e.g. nape of neck, ears), omits genitals so the prompt is feasible.
 */
function tailorPhase2Action(actionText, giverPartner, receiverPartner, locationRoll) {
  if (!actionText || typeof actionText !== 'string') return actionText;
  if (giverPartner == null || receiverPartner == null) return actionText;

  let out = actionText;

  // Capability check: on locations like nape of neck, ears, mouth, collarbone, hips—genital use isn't practical; use hands, mouth, feet only.
  const genitalCapable = locationRoll == null || phase2GenitalCapableLocationRolls.indexOf(Number(locationRoll)) !== -1;
  if (!genitalCapable) {
    out = out.replace(/\bUse genitals\b/gi, 'Use hands, mouth, or feet');
    out = out.replace(/\bUse hands or genitals\b/gi, 'Use hands');
    out = out.replace(/\bUsing hands, mouth, feet, or genitals\b/gi, 'Using hands, mouth, or feet');
    out = out.replace(/\bhands, mouth, feet, or genitals\b/gi, 'hands, mouth, or feet');
    return out;
  }

  const giverAnatomy = getAnatomy(giverPartner);
  const receiverAnatomy = getAnatomy(receiverPartner);

  if (giverAnatomy === 'vulva' && receiverAnatomy === 'vulva') {
    out = out.replace(/\bhands, mouth, feet, or genitals\b/gi, 'hands, mouth, feet, or genitals (fingers, toys)');
    out = out.replace(/\bUse hands or genitals\b/gi, 'Use hands or genitals (fingers, toys)');
    out = out.replace(/\bUse genitals\b/gi, 'Use genitals (fingers, toys, or your bodies)');
    out = out.replace(/\bor genitals\b/gi, 'or genitals (fingers, toys)');
  } else if (giverAnatomy === 'penis' && receiverAnatomy === 'penis') {
    out = out.replace(/\bhands, mouth, feet, or genitals\b/gi, 'hands, mouth, feet, or penis/scrotum');
    out = out.replace(/\bUse hands or genitals\b/gi, 'Use hands or penis/scrotum');
    out = out.replace(/\bUse genitals\b/gi, 'Use penis/scrotum');
    out = out.replace(/\bor genitals\b/gi, 'or penis/scrotum');
  } else if (giverAnatomy === 'penis' && receiverAnatomy === 'vulva') {
    out = out.replace(/\bhands, mouth, feet, or genitals\b/gi, 'hands, mouth, feet, or your penis/scrotum');
    out = out.replace(/\bUse hands or genitals\b/gi, 'Use hands or your penis/scrotum');
    out = out.replace(/\bUse genitals\b/gi, 'Use your penis/scrotum');
  } else {
    out = out.replace(/\bhands, mouth, feet, or genitals\b/gi, 'hands, mouth, feet, or your vulva/clitoris');
    out = out.replace(/\bUse hands or genitals\b/gi, 'Use hands or your vulva/clitoris');
    out = out.replace(/\bUse genitals\b/gi, 'Use your vulva/clitoris');
  }
  return out;
}
