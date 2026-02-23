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

export const clothingTable = {
  1: { prefix: 'Remove', method: 'with your eyes closed' },
  2: { prefix: 'Remove', method: 'using only one hand' },
  3: { prefix: 'Remove', method: 'using only your mouth/teeth (no hands)' },
  4: { prefix: 'Remove', method: 'slowly, one button or strap at a time' },
  5: { prefix: 'Guide {receiver}\'s hands in taking off', method: 'hand on top of hand' },
  6: { prefix: 'Remove', method: 'using only your non-dominant hand' },
  7: { prefix: 'Remove', method: 'without using your thumbs (fingertips only)' },
  8: { prefix: 'Remove', method: 'while maintaining eye contact throughout' },
  9: { prefix: 'Remove', method: 'as slowly as possible' },
  10: { prefix: 'Remove', method: 'to the rhythm of the music' },
  11: { prefix: 'Have {receiver} keep their eyes closed while you remove', method: '' },
  12: { prefix: 'Critical: Remove 2 items', method: 'one with your hands, one with your mouth' },
}

const removalComplexityByItem = {
  Corset: 1.8, 'Garter belt': 1.5, Bodysuit: 1.5, Teddy: 1.3, Stockings: 1.2,
  Bra: 1.2, Bralette: 1.2, Dress: 1.2, Heels: 1.2, Belt: 1.1,
}

function getMethodComplexityMultiplier(methodText) {
  if (!methodText || typeof methodText !== 'string') return 1.0
  const t = methodText.toLowerCase()
  if (t.includes('as slowly as possible') || t.includes('one button or strap')) return 1.5
  if (t.includes('slowly') || t.includes('one button')) return 1.3
  if (t.includes('mouth') || t.includes('teeth')) return 1.2
  if (t.includes('eye contact') || t.includes('eyes closed')) return 1.1
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
 * Remove one item from the array (mutates). Returns removed item or null.
 */
export function removeClothingItem(itemsArray) {
  if (!itemsArray || itemsArray.length === 0) return null
  const candidates = getRemovableCandidates(itemsArray)
  if (candidates.length === 0) return null
  const minPriority = Math.min(...candidates.map(getRemovalPriority))
  const tier = candidates.filter((item) => getRemovalPriority(item) === minPriority)
  const roll = Math.floor(Math.random() * 6) + 1
  let index = tier.length <= 6 ? (roll - 1) % tier.length : Math.floor((roll - 1) * (tier.length / 6))
  const removedItem = tier[index]
  const spliceIndex = itemsArray.indexOf(removedItem)
  if (spliceIndex !== -1) itemsArray.splice(spliceIndex, 1)
  return removedItem
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

export { bodyRegionLabels }
