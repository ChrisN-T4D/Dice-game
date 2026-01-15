// ----- Clothing presets and items -----

const clothingPresets = {
  casual: ['Socks', 'Watch', 'Shirt', 'Pants', 'Underwear'],
  dressCasual: ['Socks', 'Watch', 'Dress', 'Underwear'],
  lingerie: ['Stockings', 'Bra', 'Panties', 'Robe'],
  minimal: ['Top', 'Bottom', 'Underwear'],
  fullOutfit: ['Socks', 'Shoes', 'Watch', 'Shirt', 'Undershirt', 'Pants', 'Belt', 'Underwear'],
  dateNight: ['Heels', 'Stockings', 'Dress', 'Bra', 'Panties', 'Jewelry'],
  loungeWear: ['Socks', 'Sweatpants', 'T-shirt', 'Underwear']
};

const allClothingItems = [
  'Socks', 'Shoes', 'Watch', 'Jewelry', 'Heels', 'Stockings',
  'Shirt', 'Undershirt', 'T-shirt', 'Dress', 'Top',
  'Pants', 'Sweatpants', 'Bottom', 'Belt',
  'Bra', 'Panties', 'Underwear', 'Robe'
];

// Clothing d6 table (applies in any phase while clothingPromptsEnabled)
const clothingTable = {
  1: 'Roller makes no changes to the receiver's clothing; all touch stays over whatever the receiver is currently wearing for this round.',
  2: 'Roller removes or loosens one small item of the receiver's clothing (for example, a sock, jewelry, watch, scarf, or hair tie), keeping everything else the same.',
  3: 'Roller uncovers one specific body area of the receiver by adjusting clothing (such as sliding up a sleeve to reveal a forearm or moving a pant leg to reveal part of a calf), leaving all other clothing as it is.',
  4: 'Roller removes one article of clothing from the receiver (any agreed item), while keeping all remaining clothing as it is for this round.',
  5: 'Roller removes one additional article of clothing from the receiver later in this same round, so that a total of two items may come off or be loosened, with all remaining clothing unchanged.',
  6: 'Critical change: roller may remove or loosen up to two articles of the receiver's clothing and also re‑position any remaining clothing to reveal new non‑genital areas, stopping or scaling back immediately if the receiver signals they have reached their limit.'
};

// ----- Guided Mode clothing functions -----

function populateClothingCheckboxes(itemsToCheck = []) {
  const container = document.getElementById('clothingCheckboxContainer');
  if (!container) return;

  container.innerHTML = '';

  allClothingItems.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `clothing_${item.replace(/\s+/g, '_')}`;
    checkbox.value = item;
    checkbox.checked = itemsToCheck.includes(item);
    checkbox.style.cssText = 'cursor: pointer;';

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = item;
    label.style.cssText = 'cursor: pointer; font-size: 0.85rem; user-select: none;';

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
}

function getSelectedClothingItems() {
  const container = document.getElementById('clothingCheckboxContainer');
  if (!container) return [];

  const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

function removeClothingItem() {
  if (clothingItems.length === 0) {
    return null;
  }

  // Roll d6 to determine which item
  const roll = Math.floor(Math.random() * 6) + 1;

  // Map d6 roll to array index (with wraparound for small lists)
  let index;
  if (clothingItems.length === 1) {
    index = 0;
  } else if (clothingItems.length <= 6) {
    index = (roll - 1) % clothingItems.length;
  } else {
    // For longer lists, distribute rolls across items
    index = Math.floor((roll - 1) * (clothingItems.length / 6));
  }

  const removedItem = clothingItems[index];
  clothingItems.splice(index, 1);

  return removedItem;
}

function updateClothingDisplay() {
  const clothingStatus = document.getElementById('clothingStatus');
  const clothingItemsList = document.getElementById('clothingItemsList');
  const clothingMilestoneProgress = document.getElementById('clothingMilestoneProgress');

  if (!clothingSystemEnabled || phase >= 3) {
    if (clothingStatus) clothingStatus.style.display = 'none';
    return;
  }

  if (clothingStatus && isGuidedMode) {
    clothingStatus.style.display = 'block';

    if (clothingItemsList) {
      if (clothingItems.length === 0) {
        clothingItemsList.textContent = 'None (all removed)';
      } else {
        clothingItemsList.textContent = clothingItems.join(', ');
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
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  allClothingItems.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `freeplay_p${partner}_${item.replace(/\s+/g, '_')}`;
    checkbox.value = item;
    checkbox.checked = itemsToCheck.includes(item);
    checkbox.style.cssText = 'cursor: pointer;';

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = item;
    label.style.cssText = 'cursor: pointer; font-size: 0.85rem; user-select: none;';

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
}

function getFreePlaySelectedClothingItems(partner) {
  const containerId = partner === 1 ? 'freePlayClothingCheckboxContainerP1' : 'freePlayClothingCheckboxContainerP2';
  const container = document.getElementById(containerId);
  if (!container) return [];

  const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
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
  // Remove from current receiver's clothing list
  const clothingItems = freePlayCurrentReceiver === 1 ? freePlayClothingItemsP1 : freePlayClothingItemsP2;

  if (clothingItems.length === 0) {
    return null;
  }

  // Roll d6 to determine which item
  const roll = Math.floor(Math.random() * 6) + 1;

  // Map d6 roll to array index (with wraparound for small lists)
  let index;
  if (clothingItems.length === 1) {
    index = 0;
  } else if (clothingItems.length <= 6) {
    index = (roll - 1) % clothingItems.length;
  } else {
    // For longer lists, distribute rolls across items
    index = Math.floor((roll - 1) * (clothingItems.length / 6));
  }

  const removedItem = clothingItems[index];
  clothingItems.splice(index, 1);

  return { item: removedItem, partner: freePlayCurrentReceiver };
}
