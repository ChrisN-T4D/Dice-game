'use strict';
// ----- Clothing presets and items -----

const clothingPresets = {
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
  layered: ['Tank top', 'Shirt', 'Cardigan', 'Pants', 'Scarf', 'Belt']
};

// Visual: emoji (or short label) per item for card-style selection
const clothingEmoji = {
  Socks: '🧦', Shoes: '👟', Watch: '⌚', Jewelry: '💍', Heels: '👠', Stockings: '🧦',
  Shirt: '👕', Undershirt: '👕', 'T-shirt': '👕', Dress: '👗', Top: '👚',
  Pants: '👖', Sweatpants: '🩳', Bottom: '👖', Belt: '🪢',
  Bra: '👙', Panties: '🩲', Underwear: '🩲', Robe: '🧥',
  Shorts: '🩳', Skirt: '👗', Cardigan: '🧥', Jacket: '🧥', Hoodie: '🧥',
  'Tank top': '👕', Scarf: '🧣', Hat: '🧢', Glasses: '👓',
  'Sports bra': '👙', Sneakers: '👟',
  Bralette: '👙', Teddy: '👗', 'Garter belt': '🎀', Corset: '👗', Babydoll: '👗',
  Chemise: '👗', Thong: '🩲', Boyshorts: '🩲', Bodysuit: '👗', Camisole: '👚'
};

const allClothingItems = [
  'Socks', 'Shoes', 'Watch', 'Jewelry', 'Heels', 'Stockings',
  'Shirt', 'Undershirt', 'T-shirt', 'Dress', 'Top', 'Tank top',
  'Pants', 'Sweatpants', 'Shorts', 'Skirt', 'Bottom', 'Belt',
  'Cardigan', 'Jacket', 'Hoodie', 'Scarf', 'Hat', 'Glasses',
  'Bra', 'Sports bra', 'Panties', 'Underwear', 'Robe',
  'Bralette', 'Teddy', 'Garter belt', 'Corset', 'Babydoll', 'Chemise', 'Thong', 'Boyshorts', 'Bodysuit', 'Camisole'
];

// Body region for display order (top to bottom). Shoes/feet = bottom row.
const clothingBodyRegion = {
  Hat: 0, Glasses: 0, Jewelry: 0, Watch: 0,
  Scarf: 1,
  Cardigan: 2, Jacket: 2, Hoodie: 2, Robe: 2,
  Shirt: 3, Undershirt: 3, 'T-shirt': 3, 'Tank top': 3, Dress: 3, Top: 3, Camisole: 3,
  Bra: 3, 'Sports bra': 3, Bralette: 3, Corset: 3, Bodysuit: 3, Babydoll: 3, Chemise: 3, Teddy: 3,
  Belt: 4,
  Pants: 5, Sweatpants: 5, Shorts: 5, Skirt: 5, Bottom: 5,
  Panties: 5, Underwear: 5, Thong: 5, Boyshorts: 5, 'Garter belt': 5,
  Stockings: 6, Socks: 6, Heels: 6, Sneakers: 6, Shoes: 6
};

const bodyRegionLabels = {
  0: 'Head & accessories',
  1: 'Neck',
  2: 'Upper body (outer)',
  3: 'Upper body',
  4: 'Waist',
  5: 'Lower body',
  6: 'Feet & legs'
};

function getBodyRegion(item) {
  return clothingBodyRegion[item] !== undefined ? clothingBodyRegion[item] : 3;
}

// Items sorted by body position (head → feet)
function getClothingItemsByBody() {
  return [...allClothingItems].sort((a, b) => {
    const rA = getBodyRegion(a);
    const rB = getBodyRegion(b);
    return rA !== rB ? rA - rB : a.localeCompare(b);
  });
}

// Removal order: item can only be removed after its prerequisite is off
// (Outer layer / supporting item must be removed first.)
const removalPrerequisite = {
  Socks: 'Shoes',           // shoes before socks
  Pants: 'Belt',            // belt before pants
  Stockings: 'Shoes',       // shoes/heels before stockings
  Undershirt: 'Shirt',      // shirt before undershirt (layering)
  'T-shirt': 'Hoodie',      // hoodie before t-shirt
  'Tank top': 'Shirt',     // shirt before tank when layered
  Skirt: 'Belt',
  Shorts: 'Belt',
  Bottom: 'Belt',
  Sweatpants: 'Belt',
  'Garter belt': 'Stockings'  // stockings off before garter belt
};

// Removal priority: lower = removed first. Lingerie/intimate kept on longer (higher number).
const removalPriority = {
  Socks: 0, Shoes: 0, Watch: 0, Jewelry: 0, Heels: 0, Sneakers: 0, Scarf: 0, Hat: 0, Glasses: 0, Belt: 0,
  Jacket: 1, Cardigan: 1, Robe: 1,
  Shirt: 2, Undershirt: 2, 'T-shirt': 2, Dress: 2, Top: 2, 'Tank top': 2, Pants: 2, Sweatpants: 2, Shorts: 2, Skirt: 2, Bottom: 2, Camisole: 2,
  Bra: 3, 'Sports bra': 3, Panties: 3, Underwear: 3, Stockings: 3,
  Bralette: 3, Teddy: 3, 'Garter belt': 3, Corset: 3, Babydoll: 3, Chemise: 3, Thong: 3, Boyshorts: 3, Bodysuit: 3
};

// Clothing d6 table - describes HOW to remove clothing
// The program will determine WHAT item to remove
// Format: verb phrase that can be followed by "their [item]"
const clothingTable = {
  1: { prefix: 'No clothing change', fullText: 'all touch stays over whatever is currently being worn' },
  2: { prefix: 'Remove', method: 'using only one hand' },
  3: { prefix: 'Remove', method: 'using only your mouth/teeth (no hands)' },
  4: { prefix: 'Remove', method: 'while maintaining eye contact throughout' },
  5: { prefix: 'Have the receiver keep their hands behind their back while you remove', method: '' },
  6: { prefix: 'Critical: Remove 2 items', method: 'one with your hands, one with your mouth' }
};

// ----- Shared clothing removal logic -----

// Items that can be removed: prerequisite must be absent (e.g. Socks only if Shoes not in list)
function getRemovableCandidates(itemsArray) {
  return itemsArray.filter(item => {
    const mustBeOffFirst = removalPrerequisite[item];
    if (!mustBeOffFirst) return true;
    return !itemsArray.includes(mustBeOffFirst);
  });
}

// Priority for removal (default 2 if unknown). Lower = removed first; lingerie = 3 (last).
function getRemovalPriority(item) {
  return removalPriority[item] !== undefined ? removalPriority[item] : 2;
}

// Remove one item: shoes before socks (prerequisite), and remove less-intimate items first (priority).
// Returns the removed item or null.
function removeRandomClothingItem(itemsArray) {
  if (itemsArray.length === 0) return null;

  const candidates = getRemovableCandidates(itemsArray);
  if (candidates.length === 0) return null;

  const minPriority = Math.min(...candidates.map(getRemovalPriority));
  const tier = candidates.filter(item => getRemovalPriority(item) === minPriority);

  const roll = Math.floor(Math.random() * 6) + 1;
  let index;
  if (tier.length === 1) {
    index = 0;
  } else if (tier.length <= 6) {
    index = (roll - 1) % tier.length;
  } else {
    index = Math.floor((roll - 1) * (tier.length / 6));
  }

  const removedItem = tier[index];
  const spliceIndex = itemsArray.indexOf(removedItem);
  if (spliceIndex !== -1) itemsArray.splice(spliceIndex, 1);
  return removedItem;
}

// Get emoji for a clothing item (fallback: first letter in a circle-style)
function getClothingEmoji(item) {
  return clothingEmoji[item] || (item ? item.charAt(0).toUpperCase() : '•');
}

// Shared function to populate clothing checkboxes with visual card UI, grouped by body region
function populateClothingCheckboxes(containerId, prefix, itemsToCheck = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  while (container.firstChild) container.removeChild(container.firstChild);

  const itemsByBody = getClothingItemsByBody();
  const byRegion = {};
  itemsByBody.forEach(item => {
    const r = getBodyRegion(item);
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(item);
  });

  const regionOrder = [0, 1, 2, 3, 4, 5, 6];
  regionOrder.forEach(regionNum => {
    const items = byRegion[regionNum];
    if (!items || items.length === 0) return;

    const rowWrap = document.createElement('div');
    rowWrap.className = 'clothing-body-row';

    const regionLabel = document.createElement('div');
    regionLabel.className = 'clothing-region-label';
    regionLabel.textContent = bodyRegionLabels[regionNum] || '';
    rowWrap.appendChild(regionLabel);

    const row = document.createElement('div');
    row.className = 'clothing-body-row-items';

    items.forEach(item => {
      const label = document.createElement('label');
      label.className = 'clothing-item clothing-card';
      if (itemsToCheck.includes(item)) label.classList.add('selected');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `${prefix}_${item.replace(/\s+/g, '_')}`;
      checkbox.value = item;
      checkbox.checked = itemsToCheck.includes(item);

      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'clothing-emoji';
      emojiSpan.textContent = getClothingEmoji(item);
      emojiSpan.setAttribute('aria-hidden', 'true');

      const checkmark = document.createElement('span');
      checkmark.className = 'checkmark';
      checkmark.textContent = '\u2713';

      const text = document.createElement('span');
      text.className = 'clothing-label';
      text.textContent = item;

      label.appendChild(checkbox);
      label.appendChild(emojiSpan);
      label.appendChild(checkmark);
      label.appendChild(text);

      label.addEventListener('click', (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        label.classList.toggle('selected', checkbox.checked);
      });

      row.appendChild(label);
    });

    rowWrap.appendChild(row);
    container.appendChild(rowWrap);
  });
}

// Shared function to get selected clothing items from any container
function getSelectedClothingItems(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

// Shared function to clear all selections in a clothing container
function clearClothingSelections(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.clothing-item').forEach(label => {
    label.classList.remove('selected');
    const checkbox = label.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = false;
  });
}

// ----- Guided Mode clothing functions -----

function populateGuidedClothingCheckboxes(partner, itemsToCheck = []) {
  const containerId = partner === 1 ? 'guidedClothingCheckboxContainerP1' : 'guidedClothingCheckboxContainerP2';
  populateClothingCheckboxes(containerId, `guided_p${partner}`, itemsToCheck);
}

function getGuidedSelectedClothingItems(partner) {
  const containerId = partner === 1 ? 'guidedClothingCheckboxContainerP1' : 'guidedClothingCheckboxContainerP2';
  return getSelectedClothingItems(containerId);
}

function removeClothingItem(receiverPartner) {
  // Remove from the receiver's per-partner array
  const partnerItems = receiverPartner === 1 ? guidedClothingItemsP1 : guidedClothingItemsP2;
  const removedItem = removeRandomClothingItem(partnerItems);
  // Also remove from the legacy combined array
  if (removedItem) {
    const idx = clothingItems.indexOf(removedItem);
    if (idx !== -1) clothingItems.splice(idx, 1);
    saveState();
  }
  return removedItem;
}

function updateClothingDisplay() {
  const clothingStatus = document.getElementById('clothingStatus');
  const clothingItemsList = document.getElementById('clothingItemsList');
  const clothingMilestoneProgress = document.getElementById('clothingMilestoneProgress');
  const clothingLabel = document.getElementById('clothingRemainingLabel');

  if (!clothingSystemEnabled || phase >= 3) {
    if (clothingStatus) clothingStatus.style.display = 'none';
    return;
  }

  if (clothingStatus && isGuidedMode) {
    clothingStatus.style.display = 'block';

    // Show only the current receiver's clothing
    const receiver = guidedCurrentPartner === 1 ? 2 : 1;
    const receiverItems = receiver === 1 ? guidedClothingItemsP1 : guidedClothingItemsP2;
    const receiverName = typeof getPartnerName === 'function' ? getPartnerName(receiver) : `Partner ${receiver}`;

    if (clothingLabel) {
      clothingLabel.textContent = `${receiverName}'s clothing remaining:`;
    }

    if (clothingItemsList) {
      if (receiverItems.length === 0) {
        clothingItemsList.textContent = 'None (all removed)';
      } else {
        clothingItemsList.textContent = receiverItems.join(', ');
      }
    }

    if (clothingMilestoneProgress) {
      const turnsUntilNext = clothingMilestoneInterval - turnsSinceLastRemoval;
      clothingMilestoneProgress.textContent = `Next removal in ${turnsUntilNext} turn${turnsUntilNext === 1 ? '' : 's'}`;
    }
  }
}

// ----- Free Play clothing functions -----

function populateFreePlayClothingCheckboxes(partner, itemsToCheck = []) {
  const containerId = partner === 1 ? 'freePlayClothingCheckboxContainerP1' : 'freePlayClothingCheckboxContainerP2';
  populateClothingCheckboxes(containerId, `freeplay_p${partner}`, itemsToCheck);
}

function getFreePlaySelectedClothingItems(partner) {
  const containerId = partner === 1 ? 'freePlayClothingCheckboxContainerP1' : 'freePlayClothingCheckboxContainerP2';
  return getSelectedClothingItems(containerId);
}

function updateTurnIndicator() {
  const p1Card = document.getElementById('p1ClothingStatusCard');
  const p2Card = document.getElementById('p2ClothingStatusCard');

  if (!freePlayClothingEnabled) return;

  // Highlight current receiver's card
  if (p1Card) {
    if (freePlayCurrentReceiver === 1) {
      p1Card.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.6)';
      p1Card.style.borderColor = '#60a5fa';
    } else {
      p1Card.style.boxShadow = 'none';
      p1Card.style.borderColor = '#3b82f6';
    }
  }

  if (p2Card) {
    if (freePlayCurrentReceiver === 2) {
      p2Card.style.boxShadow = '0 0 12px rgba(236, 72, 153, 0.6)';
      p2Card.style.borderColor = '#f472b6';
    } else {
      p2Card.style.boxShadow = 'none';
      p2Card.style.borderColor = '#ec4899';
    }
  }
}

function updateFreePlayClothingDisplay() {
  const setupInputs = document.getElementById('freePlayClothingSetupInputs');
  const clothingStatus = document.getElementById('freePlayClothingStatus');
  const clothingItemsListP1 = document.getElementById('freePlayClothingItemsListP1');
  const clothingItemsListP2 = document.getElementById('freePlayClothingItemsListP2');

  if (!freePlayClothingEnabled || phase >= 3) {
    if (clothingStatus) clothingStatus.style.display = 'none';
    if (setupInputs && phase >= 3) setupInputs.style.display = 'none';
    return;
  }

  // Hide setup, show status during play
  const hasClothing = freePlayClothingItemsP1.length > 0 || freePlayClothingItemsP2.length > 0;
  if (hasClothing && setupInputs && clothingStatus) {
    setupInputs.style.display = 'none';
    clothingStatus.style.display = 'block';

    if (clothingItemsListP1) {
      if (freePlayClothingItemsP1.length === 0) {
        clothingItemsListP1.textContent = 'None (all removed)';
      } else {
        clothingItemsListP1.textContent = freePlayClothingItemsP1.join(', ');
      }
    }

    if (clothingItemsListP2) {
      if (freePlayClothingItemsP2.length === 0) {
        clothingItemsListP2.textContent = 'None (all removed)';
      } else {
        clothingItemsListP2.textContent = freePlayClothingItemsP2.join(', ');
      }
    }

    // Update turn indicator
    updateTurnIndicator();
  } else if (freePlayClothingEnabled && !hasClothing) {
    // Show setup if no items selected yet
    if (setupInputs) setupInputs.style.display = 'block';
    if (clothingStatus) clothingStatus.style.display = 'none';
  }
}

function removeFreePlayClothingItem() {
  const items = freePlayCurrentReceiver === 1 ? freePlayClothingItemsP1 : freePlayClothingItemsP2;
  const removedItem = removeRandomClothingItem(items);
  if (removedItem) {
    saveState();
    return { item: removedItem, partner: freePlayCurrentReceiver };
  }
  return null;
}
