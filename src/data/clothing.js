/**
 * Clothing presets and removal logic for Guided Mode.
 * Ported from clothing.js.
 */
export const clothingPresets = {
  casual: ['Socks', 'Watch', 'Shirt', 'Pants', 'Underwear'],
  dressCasual: ['Socks', 'Watch', 'Dress', 'Underwear'],
  lingerie: ['Stockings', 'Bra', 'Panties', 'Robe'],
  lingerieLace: ['Stockings', 'Bralette', 'Thong', 'Garter belt', 'Babydoll'],
  lingerieClassic: ['Bra', 'Panties', 'Chemise', 'Robe'],
  minimal: ['Top', 'Bottom', 'Underwear'],
  fullOutfit: ['Socks', 'Shoes', 'Watch', 'Shirt', 'Undershirt', 'Pants', 'Belt', 'Underwear'],
  dateNight: ['Heels', 'Stockings', 'Dress', 'Bra', 'Panties', 'Jewelry'],
  loungeWear: ['Socks', 'Sweatpants', 'T-shirt', 'Underwear'],
  athletic: ['Sports bra', 'Shorts', 'Tank top', 'Sneakers', 'Socks'],
  cozy: ['Socks', 'Sweatpants', 'Hoodie', 'T-shirt', 'Underwear'],
  layered: ['Tank top', 'Shirt', 'Cardigan', 'Pants', 'Scarf', 'Belt'],
  undergarmentsMale: ['Underwear', 'Undershirt'],
  undergarmentsFemale: ['Bra', 'Underwear', 'Undershirt'],
  /** Build your own from the full list (grouped by body region). */
  custom: [],
}

export const clothingEmoji = {
  Socks: '🧦', Shoes: '👟', Watch: '⌚', Jewelry: '💍', Heels: '👠', Stockings: '🧦',
  Shirt: '👕', Undershirt: '👕', 'T-shirt': '👕', Dress: '👗', Top: '👚',
  Pants: '👖', Sweatpants: '🩳', Bottom: '👖', Belt: '🪢',
  Bra: '👙', Panties: '🩲', Underwear: '🩲', Robe: '🧥',
  Shorts: '🩳', Skirt: '👗', Cardigan: '🧥', Jacket: '🧥', Hoodie: '🧥',
  'Tank top': '👕', Scarf: '🧣', Hat: '🧢', Glasses: '👓',
  'Sports bra': '👙', Sneakers: '👟',
  Bralette: '👙', Teddy: '👗', 'Garter belt': '🎀', Corset: '👗', Babydoll: '👗',
  Chemise: '👗', Thong: '🩲', Boyshorts: '🩲', Bodysuit: '👗', Camisole: '👚',
}

const allClothingItems = [
  'Socks', 'Shoes', 'Watch', 'Jewelry', 'Heels', 'Stockings',
  'Shirt', 'Undershirt', 'T-shirt', 'Dress', 'Top', 'Tank top',
  'Pants', 'Sweatpants', 'Shorts', 'Skirt', 'Bottom', 'Belt',
  'Cardigan', 'Jacket', 'Hoodie', 'Scarf', 'Hat', 'Glasses',
  'Bra', 'Sports bra', 'Panties', 'Underwear', 'Robe',
  'Bralette', 'Teddy', 'Garter belt', 'Corset', 'Babydoll', 'Chemise', 'Thong', 'Boyshorts', 'Bodysuit', 'Camisole',
]

const clothingBodyRegion = {
  Hat: 0, Glasses: 0, Jewelry: 0, Watch: 0, Scarf: 1,
  Cardigan: 2, Jacket: 2, Hoodie: 2, Robe: 2,
  Shirt: 3, Undershirt: 3, 'T-shirt': 3, 'Tank top': 3, Dress: 3, Top: 3, Camisole: 3,
  Bra: 3, 'Sports bra': 3, Bralette: 3, Corset: 3, Bodysuit: 3, Babydoll: 3, Chemise: 3, Teddy: 3,
  Belt: 4,
  Pants: 5, Sweatpants: 5, Shorts: 5, Skirt: 5, Bottom: 5,
  Panties: 5, Underwear: 5, Thong: 5, Boyshorts: 5, 'Garter belt': 5,
  Stockings: 6, Socks: 6, Heels: 6, Sneakers: 6, Shoes: 6,
}

const bodyRegionLabels = {
  0: 'Head & accessories', 1: 'Neck', 2: 'Upper body (outer)', 3: 'Upper body',
  4: 'Waist', 5: 'Lower body', 6: 'Feet & legs',
}

export const removalPrerequisite = {
  Socks: 'Shoes', Pants: 'Belt', Stockings: 'Shoes', Undershirt: 'Shirt',
  'T-shirt': 'Hoodie', 'Tank top': 'Shirt', Skirt: 'Belt', Shorts: 'Belt',
  Bottom: 'Belt', Sweatpants: 'Belt', 'Garter belt': 'Stockings',
}

const removalPriority = {
  Socks: 0, Shoes: 0, Watch: 0, Jewelry: 0, Heels: 0, Sneakers: 0, Scarf: 0, Hat: 0, Glasses: 0, Belt: 0,
  Jacket: 1, Cardigan: 1, Robe: 1,
  Shirt: 2, Undershirt: 2, 'T-shirt': 2, Dress: 2, Top: 2, 'Tank top': 2, Pants: 2, Sweatpants: 2, Shorts: 2, Skirt: 2, Bottom: 2, Camisole: 2,
  Bra: 3, 'Sports bra': 3, Panties: 3, Underwear: 3, Stockings: 3,
  Bralette: 3, Teddy: 3, 'Garter belt': 3, Corset: 3, Babydoll: 3, Chemise: 3, Thong: 3, Boyshorts: 3, Bodysuit: 3,
}

/**
 * Item-appropriate removal verb templates. `{item}` is replaced with the spoken
 * item phrase (e.g. "Alex's panties"). Items not listed fall back to a verb
 * chosen by body region (see regionRemovalVerb).
 */
export const removalVerb = {
  Bra: 'unclasp {item} and draw it off {pos} shoulders',
  'Sports bra': 'peel {item} up and off',
  Bralette: 'unclasp {item} and slip it off {pos} shoulders',
  Corset: 'unlace {item} and ease it off {pos} shoulders',
  Bodysuit: 'unsnap {item} and peel it all the way off',
  Shirt: 'unbutton {item} and slide it off {pos} shoulders',
  Cardigan: 'slip {item} off {pos} shoulders',
  Jacket: 'slip {item} off {pos} shoulders',
  Robe: 'untie {item} and slide it off {pos} shoulders',
  Hoodie: 'unzip {item} and peel it off',
  Undershirt: 'lift {item} up and off over {pos} head',
  'T-shirt': 'lift {item} up and off over {pos} head',
  'Tank top': 'peel {item} up and off',
  Top: 'lift {item} up and off',
  Camisole: 'slip {item} off {pos} shoulders',
  Dress: 'ease {item} down off {pos} shoulders',
  Chemise: 'slip {item} off {pos} shoulders',
  Babydoll: 'slip {item} off {pos} shoulders',
  Teddy: 'unsnap {item} and ease it off',
  Pants: 'slide {item} down over {pos} hips',
  Sweatpants: 'slide {item} down over {pos} hips',
  Shorts: 'slide {item} down over {pos} hips',
  Skirt: 'slide {item} down over {pos} hips',
  Bottom: 'slide {item} down over {pos} hips',
  Underwear: 'slide {item} down and off',
  Panties: 'slide {item} down and off',
  Thong: 'slide {item} down and off',
  Boyshorts: 'slide {item} down and off',
  Stockings: 'roll {item} down {pos} legs',
  'Garter belt': 'unclip {item} and slide it off',
  Socks: 'peel {item} off',
  Belt: 'unbuckle {item}',
  Shoes: 'slip {item} off',
  Heels: 'slip {item} off',
  Sneakers: 'slip {item} off',
  Watch: 'take {item} off and set it aside',
  Jewelry: 'take {item} off and set it aside',
  Glasses: 'take {item} off and set it aside',
  Hat: 'take {item} off and set it aside',
  Scarf: 'unwind {item} and set it aside',
}

const regionRemovalVerb = {
  0: 'take {item} off and set it aside',
  1: 'unwind {item} and set it aside',
  2: 'slip {item} off {pos} shoulders',
  3: 'lift {item} up and off',
  4: 'unfasten {item}',
  5: 'slide {item} down and off',
  6: 'slip {item} off',
}

/** Coarse category used to gate which manners physically fit which garments. */
export function garmentCategory(item) {
  if (['Bra', 'Sports bra', 'Bralette'].includes(item)) return 'bra'
  if (['Corset', 'Bodysuit', 'Teddy'].includes(item)) return 'shaper'
  if (['Shirt', 'Cardigan', 'Jacket', 'Robe', 'Hoodie'].includes(item)) return 'openTop'
  if (['Undershirt', 'T-shirt', 'Tank top', 'Top', 'Camisole'].includes(item)) return 'pullTop'
  if (['Dress', 'Chemise', 'Babydoll'].includes(item)) return 'dress'
  if (['Pants', 'Sweatpants', 'Shorts', 'Skirt', 'Bottom'].includes(item)) return 'bottoms'
  if (['Underwear', 'Panties', 'Thong', 'Boyshorts'].includes(item)) return 'underwear'
  if (['Stockings', 'Garter belt'].includes(item)) return 'legwear'
  if (item === 'Socks') return 'socks'
  if (item === 'Belt') return 'belt'
  if (['Shoes', 'Heels', 'Sneakers'].includes(item)) return 'shoes'
  return 'accessory'
}

const SKIN_CATEGORIES = ['bra', 'shaper', 'openTop', 'pullTop', 'dress', 'bottoms', 'underwear', 'legwear']
const DOWN_CATEGORIES = ['bottoms', 'underwear', 'legwear']
const STRAP_CATEGORIES = ['bra', 'dress']
const NON_ACCESSORY = [
  'bra', 'shaper', 'openTop', 'pullTop', 'dress', 'bottoms', 'underwear', 'legwear', 'socks', 'shoes',
]
// Garments with shoulder straps / shoulder seams you can bare one side at a time.
const SHOULDER_CATEGORIES = ['bra', 'shaper', 'openTop', 'pullTop', 'dress']
// Bottoms/underwear that ride over the hips and have a waistband to play with.
const HIPS_CATEGORIES = ['bottoms', 'underwear']
// Leg-hugging garments peeled down the leg (stocking / sock peel).
// Items you actually roll/peel down the leg (stocking & sock peel).
const STOCKING_PEEL_ITEMS = ['Stockings', 'Socks']
// Light enough to drape over a partner on the way down.
const DRAPE_CATEGORIES = ['openTop', 'pullTop', 'dress']
// Garments you can grip and peel with your teeth/mouth.
const MOUTH_FEASIBLE_CATEGORIES = ['bra', 'underwear', 'legwear', 'socks']
// Garments that sit directly over an erogenous zone (worth teasing underneath).
const OVER_ZONE_CATEGORIES = ['bra', 'underwear', 'bottoms', 'dress']
// Grippable garments you can tease before committing — not legwear you just roll down.
const TEASE_CATEGORIES = ['bra', 'shaper', 'openTop', 'pullTop', 'dress', 'bottoms', 'underwear']

/**
 * Tasteful striptease-inspired removal manners. Each is only offered for garment
 * categories where it makes physical sense (no "one strap at a time" on socks),
 * and for the removal mode it suits: `mode: 'both'` works whoever undresses;
 * `'partner'` is the giver acting on the receiver (mouth/lips/lift their foot);
 * `'self'` is the receiver stripping for the watching partner (sway your hips,
 * arch your back, teeth peel). Modeled on burlesque/striptease craft with
 * concrete tempo cues (to the music, a slow ten-count) rather than vague pacing.
 * `lead` is an adverb placed before the verb; `trail` is a clause appended after.
 * `allow: null` = any garment category; `allowItems` further restricts to exact
 * item names (e.g. the belt pull only on a Belt, button-by-button only on shirts).
 */
export const removalManners = [
  // Plain & simple — works for anything, accessories included. Repeated so a fair
  // share of lines stay bare instead of always ending in a tacked-on flourish.
  { lead: '', trail: '', allow: null, mode: 'both' },
  { lead: '', trail: '', allow: null, mode: 'both' },
  { lead: 'slowly', trail: '', allow: null, mode: 'both' },
  // Slow-tempo cues only read naturally on an actual garment reveal — not a watch or belt.
  { lead: '', trail: 'taking your time', allow: SKIN_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'nice and slow', allow: SKIN_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'to the rhythm of the music', allow: SKIN_CATEGORIES, mode: 'both' },
  // Eye contact / smoulder / toss
  { lead: '', trail: 'holding their gaze the whole time', allow: NON_ACCESSORY, mode: 'both' },
  { lead: '', trail: 'with a slow smoulder, never breaking their gaze', allow: NON_ACCESSORY, mode: 'both' },
  { lead: '', trail: 'watching their reaction', allow: NON_ACCESSORY, mode: 'partner' },
  { lead: '', trail: 'tossing {g} aside once free', allow: NON_ACCESSORY, mode: 'both' },
  // Peek-a-boo / tease — reveal a little, make them wait
  { lead: '', trail: 'giving {g} a teasing tug first, as if you might not', allow: TEASE_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'leaving {g} half-on a moment to make them wait', allow: SKIN_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'revealing a little, then a little more', allow: SKIN_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'with a teasing smile', allow: NON_ACCESSORY, mode: 'both' },
  // Straps & shoulders
  { lead: '', trail: 'one strap at a time', allow: STRAP_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'one clasp at a time', allow: ['bra'], mode: 'both' },
  { lead: '', trail: 'baring one shoulder, then the other', allow: SHOULDER_CATEGORIES, mode: 'both' },
  // Down & over the hips
  { lead: '', trail: 'teasing {g} down inch by inch', allow: DOWN_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'then stepping out of {g}', allow: HIPS_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'snapping the waistband once before easing {g} down', allow: HIPS_CATEGORIES, mode: 'both' },
  // Garment-specific craft (gated to exact items so it never lands on the wrong piece)
  { lead: '', trail: 'undoing one button at a time, each a little reveal', allowItems: ['Shirt', 'Cardigan'], mode: 'both' },
  { lead: '', trail: 'undoing {g} slowly, button by button', allowItems: ['Shirt', 'Cardigan'], mode: 'both' },
  { lead: '', trail: 'drawing {g} slowly out of the loops', allowItems: ['Belt'], mode: 'both' },
  { lead: '', trail: 'stepping out one leg at a time', allowItems: ['Pants', 'Sweatpants', 'Shorts', 'Bottom'], mode: 'both' },
  // Showmanship & pacing (any non-accessory garment, either mode)
  { lead: '', trail: 'pausing a beat after the reveal', allow: NON_ACCESSORY, mode: 'both' },
  { lead: '', trail: 'turning to show the front, then the back', allow: NON_ACCESSORY, mode: 'both' },
  // Playful constraints — make the removal itself a little game
  { lead: '', trail: 'using just one hand', allow: NON_ACCESSORY, mode: 'both' },
  { lead: '', trail: 'without using your thumbs', allow: SKIN_CATEGORIES, mode: 'both' },
  { lead: '', trail: 'using only your teeth', allow: MOUTH_FEASIBLE_CATEGORIES, mode: 'partner' },

  // --- Partner removes (the giver acting on the receiver) ---
  { lead: '', trail: 'pausing to admire every newly bared inch', allow: SKIN_CATEGORIES, mode: 'partner' },
  { lead: '', trail: 'kissing each new patch of skin you uncover', allow: SKIN_CATEGORIES, mode: 'partner' },
  { lead: '', trail: 'letting your fingertips trail the skin you bare', allow: SKIN_CATEGORIES, mode: 'partner' },
  { lead: '', trail: 'grazing the freshly bared skin with your lips', allow: SKIN_CATEGORIES, mode: 'partner' },
  { lead: '', trail: 'easing the straps down with your mouth', allow: ['bra'], mode: 'partner' },
  { lead: '', trail: 'turning them away to ease {g} off from behind', allow: HIPS_CATEGORIES, mode: 'partner' },
  // Multitasking — keep a hand working the zone the garment is leaving
  { lead: '', trail: 'petting the skin underneath the whole time', allow: OVER_ZONE_CATEGORIES, mode: 'partner' },
  { lead: '', trail: 'keeping one hand busy underneath as you peel {g} away', allow: OVER_ZONE_CATEGORIES, mode: 'partner' },
  { lead: '', trail: 'stroking what you uncover before {g} {are} even off', allow: OVER_ZONE_CATEGORIES, mode: 'partner' },
  { lead: '', trail: 'tracing a hand down {pos} body as {g} come{s} off', allow: NON_ACCESSORY, mode: 'partner' },
  { lead: '', trail: 'smoothing a hand down {pos} skin as you go', allowItems: STOCKING_PEEL_ITEMS, mode: 'partner' },
  { lead: '', trail: 'lifting each foot in turn', allowItems: STOCKING_PEEL_ITEMS, mode: 'partner' },
  { lead: '', trail: 'gathering the hem in both hands first', allow: ['pullTop'], mode: 'partner' },
  { lead: '', trail: 'drawing {g} free in one slow pull', allowItems: ['Belt'], mode: 'partner' },
  { lead: '', trail: 'draping {g} over them on the way down', allow: DRAPE_CATEGORIES, mode: 'partner' },

  // --- Self removes (a striptease for the watching partner) ---
  // Skin reveals (the biggest pool, so it gets the most variety)
  { lead: '', trail: 'pausing to show off every newly bared inch', allow: SKIN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'arching your back as you ease {g} off', allow: SKIN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'running a slow hand down the skin you just bared', allow: SKIN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'biting your lip as more skin shows', allow: SKIN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'flashing a teasing look as {g} come{s} free', allow: SKIN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'rolling your shoulders back as {g} slip{s} off', allow: SKIN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'tracing the edge before you let {g} go', allow: SKIN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'making them wait for the full reveal', allow: SKIN_CATEGORIES, mode: 'self' },
  // Sliding down / over the hips
  { lead: '', trail: 'swaying your hips as {g} slide{s} down', allow: DOWN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'dipping low as {g} slide{s} past your hips', allow: DOWN_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'wiggling {g} down over your hips', allow: HIPS_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'swaying side to side to work {g} past your hips', allow: HIPS_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'turning your back as you let {g} drop', allow: HIPS_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'tracing a hand down {pos} body as {g} come{s} off', allow: NON_ACCESSORY, mode: 'self' },
  // Shoulders / straps / over the head
  { lead: '', trail: 'turning around to show off your back first', allow: SHOULDER_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'shimmying {g} off your shoulders', allow: SHOULDER_CATEGORIES, mode: 'self' },
  { lead: '', trail: 'crossing your arms to grip the hem, then peeling {g} up slow', allow: ['pullTop'], mode: 'self' },
  // The leg / stocking peel — flourishes only (foot up, arch, pointed toes)
  { lead: '', trail: 'one foot propped up, toes pointed', allowItems: STOCKING_PEEL_ITEMS, mode: 'self' },
  { lead: '', trail: 'smoothing a hand down {pos} skin as you go', allowItems: STOCKING_PEEL_ITEMS, mode: 'self' },
  { lead: '', trail: 'foot up, back arched', allowItems: STOCKING_PEEL_ITEMS, mode: 'self' },
  { lead: '', trail: 'toes pointed the whole way', allowItems: STOCKING_PEEL_ITEMS, mode: 'self' },
  { lead: '', trail: 'catching the edge in your teeth first', allowItems: STOCKING_PEEL_ITEMS, mode: 'self' },
  // The belt pull (a classic — whip it free, even from behind)
  { lead: '', trail: 'whipping {g} free from behind in one slow pull', allowItems: ['Belt'], mode: 'self' },
]

const removalComplexityByItem = {
  Corset: 1.8, 'Garter belt': 1.5, Bodysuit: 1.5, Teddy: 1.3, Stockings: 1.2,
  Bra: 1.2, Bralette: 1.2, Dress: 1.2, Heels: 1.2, Belt: 1.1,
}

function getMethodComplexityMultiplier(methodText) {
  if (!methodText || typeof methodText !== 'string') return 1.0
  const t = methodText.toLowerCase()
  if (t.includes('as slowly as possible') || t.includes('inch by inch') || t.includes('one button or strap')) return 1.5
  if (
    t.includes('slowly') ||
    t.includes('ten-count') ||
    t.includes('ten seconds') ||
    t.includes('rhythm of the music') ||
    t.includes('one slow beat') ||
    t.includes('one clasp') ||
    t.includes('one strap')
  ) return 1.3
  if (t.includes('mouth') || t.includes('teeth')) return 1.2
  if (
    t.includes('gaze') ||
    t.includes('eye contact') ||
    t.includes('eyes closed') ||
    t.includes('watching') ||
    t.includes('show off') ||
    t.includes('arch')
  ) return 1.1
  return 1.0
}

export function getClothingRemovalComplexityMultiplier(items, methodText) {
  let itemMult = 1.0
  if (Array.isArray(items) && items.length > 0) {
    const maxItem = Math.max(...items.map((it) => removalComplexityByItem[it] || 1.0))
    itemMult = maxItem
  }
  return Math.min(2.0, itemMult * getMethodComplexityMultiplier(methodText))
}

function getRemovableCandidates(itemsArray) {
  return itemsArray.filter((item) => {
    const mustBeOffFirst = removalPrerequisite[item]
    if (!mustBeOffFirst) return true
    return !itemsArray.includes(mustBeOffFirst)
  })
}

function getRemovalPriority(item) {
  return removalPriority[item] !== undefined ? removalPriority[item] : 2
}

/**
 * Turns between optional clothing-removal prompts in Phases 1–2.
 * Must stay in sync with sessionPlanBuilder and guided store.
 */
export function computeClothingMilestoneInterval(phase12Sec, turnSeconds, pauseSeconds, clothingEnabled, clothingListP1, clothingListP2) {
  const p1 = Array.isArray(clothingListP1) ? clothingListP1.length : 0
  const p2 = Array.isArray(clothingListP2) ? clothingListP2.length : 0
  const totalItems = p1 + p2
  const cycleSec = (Number(turnSeconds) || 0) + (Number(pauseSeconds) || 0)
  const estimatedTurns = cycleSec > 0 ? Math.floor(Number(phase12Sec) / cycleSec) : 0
  if (!clothingEnabled || totalItems <= 0 || estimatedTurns <= 0) return 3
  return Math.max(
    1,
    Math.floor((Math.max(1, Math.floor(estimatedTurns * 0.9)) * 0.9) / totalItems)
  )
}

/**
 * Remove one item from the array (mutates). Returns removed item or null.
 * @param {string[]} itemsArray
 * @param {() => number} [rng] - seeded rng for reproducible plans; defaults to Math.random for live play.
 */
export function removeClothingItem(itemsArray, rng) {
  if (!itemsArray || itemsArray.length === 0) return null
  const candidates = getRemovableCandidates(itemsArray)
  if (candidates.length === 0) return null
  const rand = typeof rng === 'function' ? rng : Math.random
  const minPriority = Math.min(...candidates.map(getRemovalPriority))
  const tier = candidates.filter((item) => getRemovalPriority(item) === minPriority)
  const roll = Math.floor(rand() * 6) + 1
  let index = tier.length <= 6 ? (roll - 1) % tier.length : Math.floor((roll - 1) * (tier.length / 6))
  const removedItem = tier[index]
  const spliceIndex = itemsArray.indexOf(removedItem)
  if (spliceIndex !== -1) itemsArray.splice(spliceIndex, 1)
  return removedItem
}

/**
 * Remove a specific named item from the wardrobe (mutates), respecting removal
 * prerequisites (won't strip an inner layer while its outer layer is still on).
 * Returns the removed item or null. Used for contextual, targeted removal.
 */
export function removeSpecificItem(itemsArray, item) {
  if (!Array.isArray(itemsArray) || !item) return null
  const prereq = removalPrerequisite[item]
  if (prereq && itemsArray.includes(prereq)) return null
  const idx = itemsArray.indexOf(item)
  if (idx === -1) return null
  itemsArray.splice(idx, 1)
  return item
}

function spokenItemPhrase(item, receiverName, self) {
  const lower = (item || '').toLowerCase()
  if (self) return `your ${lower}`
  return receiverName ? `${receiverName}'s ${lower}` : lower
}

function fillRemovalVerb(item, receiverName, self) {
  const tmpl = removalVerb[item] || regionRemovalVerb[getBodyRegion(item)] || 'take {item} off'
  return tmpl.replace('{item}', spokenItemPhrase(item, receiverName, self))
}

function pickRemovalManner(category, rand, mode = 'partner', item = null) {
  const pool = removalManners.filter(
    (m) =>
      (!m.allow || m.allow.includes(category)) &&
      (!m.allowItems || (item && m.allowItems.includes(item))) &&
      (m.mode === 'both' || m.mode === mode)
  )
  return pool[Math.floor(rand() * pool.length)] || removalManners[0]
}

function capitalizeFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Possessive for the body whose clothing is coming off. */
function receiverPossessive(self, receiverAnatomy) {
  if (self) return 'your'
  if (receiverAnatomy === 'vulva') return 'her'
  if (receiverAnatomy === 'penis') return 'his'
  return 'their'
}

// Garments that are grammatically plural ("them"/plural verb agreement).
const PLURAL_GARMENTS = new Set([
  'Socks', 'Stockings', 'Pants', 'Sweatpants', 'Shorts', 'Panties', 'Boyshorts', 'Heels', 'Sneakers', 'Shoes', 'Glasses',
])
function isPluralGarment(item) {
  return PLURAL_GARMENTS.has(item)
}

/**
 * Build the token resolver for a single garment. Tokens used in verbs/manners:
 *   {pos}  - the wearer's possessive (her/his/their/your)
 *   {g}    - the garment named ("your socks" in self mode, "the socks" otherwise)
 *   {s}    - "" for plural garments, "s" for singular (3rd-person verb agreement)
 *   {are}  - "are" for plural garments, "is" for singular
 * Using {g} instead of "it"/"them" keeps every instruction unambiguous.
 */
function makeTokenResolver(item, self, pos) {
  const noun = (item || '').toLowerCase()
  const plural = isPluralGarment(item)
  const g = `${self ? 'your' : 'the'} ${noun}`
  return (s) =>
    s
      .replace(/\{pos\}/g, pos)
      .replace(/\{g\}/g, g)
      .replace(/\{s\}/g, plural ? '' : 's')
      .replace(/\{are\}/g, plural ? 'are' : 'is')
}

/**
 * Compose a realistic, item-appropriate clothing-removal instruction.
 * @param {Object} args
 * @param {string} [args.giverName] - the partner who removes (partner mode)
 * @param {string} [args.receiverName] - whose clothing; also the actor in self mode
 * @param {string[]|string} args.items - one or two item names being removed
 * @param {() => number} [args.rng] - optional rng for manner choice (defaults Math.random)
 * @param {'partner'|'self'} [args.mode] - 'partner' (giver undresses receiver) or
 *   'self' (receiver strips for the partner). Defaults to 'partner'.
 * @param {string} [args.receiverAnatomy] - 'vulva' | 'penis'; sets the possessive
 *   ({pos}) used for the wearer's body parts (her / his / their; your in self mode).
 * @returns {{ text: string, complexityMultiplier: number }}
 */
export function composeClothingRemoval({ giverName, receiverName, items, rng, mode = 'partner', receiverAnatomy } = {}) {
  const rand = typeof rng === 'function' ? rng : Math.random
  const self = mode === 'self'
  const list = (Array.isArray(items) ? items : [items]).filter(Boolean)
  if (list.length === 0) return { text: '', complexityMultiplier: 1 }
  const recv = receiverName || 'your partner'
  // In self mode the receiver undresses themselves; in partner mode the giver does it.
  const actorName = self ? receiverName : giverName
  const pos = receiverPossessive(self, receiverAnatomy)

  if (list.length === 1) {
    const item = list[0]
    const resolve = makeTokenResolver(item, self, pos)
    const manner = pickRemovalManner(garmentCategory(item), rand, mode, item)
    let body = fillRemovalVerb(item, recv, self)
    // Verbs that are already a multi-clause sentence read as a run-on if we append
    // another clause, so drop the trailing flourish for them.
    const compoundVerb = body.includes(',')
    const trail = compoundVerb ? '' : manner.trail
    if (manner.lead) body = `${manner.lead} ${body}`
    let sentence = actorName ? `${actorName}, ${body}` : capitalizeFirst(body)
    if (trail) sentence += `, ${trail}`
    sentence += '.'
    const methodText = [manner.lead, trail].filter(Boolean).join(' ')
    return { text: resolve(sentence), complexityMultiplier: getClothingRemovalComplexityMultiplier([item], methodText) }
  }

  const resolve = (s) => s.replace(/\{pos\}/g, pos)

  const [a, b] = list
  const both = self
    ? `your ${a.toLowerCase()} and ${b.toLowerCase()}`
    : recv
      ? `${recv}'s ${a.toLowerCase()} and ${b.toLowerCase()}`
      : `${a.toLowerCase()} and ${b.toLowerCase()}`
  const mouthFeasible = !self && [a, b].every((it) => MOUTH_FEASIBLE_CATEGORIES.includes(garmentCategory(it)))
  const trailPool = mouthFeasible
    ? [
        'the first with your hands, the second with your mouth',
        'slowly, one then the other, kissing the skin bared between them',
        'one then the other, never breaking their gaze',
      ]
    : self
      ? [
          'slowly, one then the other',
          'to the rhythm of the music',
          'swaying as each one comes off',
        ]
      : [
          'slowly, one then the other',
          'one then the other, pausing to admire between them',
          'taking your time, watching their reaction',
        ]
  const trail = trailPool[Math.floor(rand() * trailPool.length)]
  const lead = actorName ? `${actorName}, take off both ${both}` : `Take off both ${both}`
  return {
    text: resolve(`${lead}, ${trail}.`),
    complexityMultiplier: getClothingRemovalComplexityMultiplier([a, b], trail),
  }
}

export function getBodyRegion(item) {
  return clothingBodyRegion[item] !== undefined ? clothingBodyRegion[item] : 3
}

export function getClothingItemsByBody() {
  return [...allClothingItems].sort((a, b) => {
    const rA = getBodyRegion(a)
    const rB = getBodyRegion(b)
    return rA !== rB ? rA - rB : a.localeCompare(b)
  })
}

/** Sort a list of item names head-to-toe by body region. */
export function sortClothingByBodyRegion(items) {
  if (!Array.isArray(items)) return []
  return [...items].sort((a, b) => {
    const rA = getBodyRegion(a)
    const rB = getBodyRegion(b)
    return rA !== rB ? rA - rB : (a || '').localeCompare(b || '')
  })
}

/** Group items by body region for display; returns [{ region, label, items }, ...]. */
export function groupClothingByBodyRegion(items) {
  if (!Array.isArray(items) || items.length === 0) return []
  const sorted = sortClothingByBodyRegion(items)
  const groups = []
  let lastRegion = -1
  for (const item of sorted) {
    const r = getBodyRegion(item)
    if (r !== lastRegion) {
      groups.push({ region: r, label: bodyRegionLabels[r] || 'Other', items: [] })
      lastRegion = r
    }
    groups[groups.length - 1].items.push(item)
  }
  return groups
}

export function getClothingEmoji(item) {
  return clothingEmoji[item] || (item ? item.charAt(0).toUpperCase() : '•')
}

// -----------------------------------------------------------------------------
// Clothing coverage model — which build-up zones a garment physically hides.
// Used to make build-up touch contextual: a covered zone is an intensity barrier
// (over-fabric tease, capped intensity) until the covering garment comes off.
// Accessories (watch/jewelry/glasses/hat/belt/shoes) never count as coverage.
// -----------------------------------------------------------------------------
const COVER_UPPER = ['chest', 'breast_tissue', 'nipple', 'areola']
const COVER_LOWER = [
  'mons_pubis',
  'perineum',
  'clitoral_hood',
  'labia_majora',
  'labia_minora',
  'vestibular_bulbs',
  'clitoral_glans',
  'vaginal_introitus',
  'penis_shaft',
  'foreskin',
  'frenulum',
  'penis_glans',
  'scrotum',
  'testicles',
  'buttocks',
  'buttock_crease',
  'gluteus_maximus',
  'gluteus_medius',
  'gluteus_minimus',
]
const COVER_INNER_THIGH = ['inner_thighs']
const COVER_FEET = ['feet', 'soles', 'toes', 'ankles']

/** garment -> build-up zones it physically covers. */
const GARMENT_COVERAGE = {
  Bra: COVER_UPPER,
  'Sports bra': COVER_UPPER,
  Bralette: COVER_UPPER,
  Corset: COVER_UPPER,
  Shirt: COVER_UPPER,
  Undershirt: COVER_UPPER,
  'T-shirt': COVER_UPPER,
  'Tank top': COVER_UPPER,
  Top: COVER_UPPER,
  Camisole: COVER_UPPER,
  Cardigan: COVER_UPPER,
  Jacket: COVER_UPPER,
  Hoodie: COVER_UPPER,
  Robe: COVER_UPPER,
  Dress: [...COVER_UPPER, ...COVER_LOWER, ...COVER_INNER_THIGH],
  Chemise: [...COVER_UPPER, ...COVER_LOWER],
  Babydoll: [...COVER_UPPER, ...COVER_LOWER],
  Teddy: [...COVER_UPPER, ...COVER_LOWER],
  Bodysuit: [...COVER_UPPER, ...COVER_LOWER],
  Pants: [...COVER_LOWER, ...COVER_INNER_THIGH],
  Sweatpants: [...COVER_LOWER, ...COVER_INNER_THIGH],
  Shorts: [...COVER_LOWER, ...COVER_INNER_THIGH],
  Skirt: [...COVER_LOWER, ...COVER_INNER_THIGH],
  Bottom: [...COVER_LOWER, ...COVER_INNER_THIGH],
  Underwear: COVER_LOWER,
  Panties: COVER_LOWER,
  Thong: COVER_LOWER,
  Boyshorts: COVER_LOWER,
  Stockings: [...COVER_FEET, ...COVER_INNER_THIGH],
  Socks: COVER_FEET,
}

/** zoneId -> Set of garments that cover it (derived from GARMENT_COVERAGE). */
export const ZONE_COVERAGE = (() => {
  const map = {}
  for (const [garment, zones] of Object.entries(GARMENT_COVERAGE)) {
    for (const z of zones) {
      ;(map[z] || (map[z] = new Set())).add(garment)
    }
  }
  return map
})()

/**
 * The outermost remaining garment covering `zoneId` in `wardrobe` (the layer a
 * hand actually feels and the next to come off), or null when the zone is bare.
 * @param {string} zoneId
 * @param {string[]} wardrobe - remaining items on the receiver
 * @returns {string|null}
 */
export function coveringGarmentFor(zoneId, wardrobe) {
  if (!zoneId || !Array.isArray(wardrobe) || wardrobe.length === 0) return null
  const coverers = ZONE_COVERAGE[zoneId]
  if (!coverers) return null
  let best = null
  let bestPriority = Infinity
  for (const item of wardrobe) {
    if (!coverers.has(item)) continue
    const pr = getRemovalPriority(item)
    if (pr < bestPriority) {
      bestPriority = pr
      best = item
    }
  }
  return best
}

export { bodyRegionLabels }
