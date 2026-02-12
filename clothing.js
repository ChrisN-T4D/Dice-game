'use strict';
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

// Roll d6 and remove a random item from the given array, return the removed item or null
function removeRandomClothingItem(itemsArray) {
  if (itemsArray.length === 0) return null;

  const roll = Math.floor(Math.random() * 6) + 1;
  let index;
  if (itemsArray.length === 1) {
    index = 0;
  } else if (itemsArray.length <= 6) {
    index = (roll - 1) % itemsArray.length;
  } else {
    index = Math.floor((roll - 1) * (itemsArray.length / 6));
  }

  const removedItem = itemsArray[index];
  itemsArray.splice(index, 1);
  return removedItem;
}

// Shared function to populate clothing checkboxes for any container
function populateClothingCheckboxes(containerId, prefix, itemsToCheck = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear existing content safely
  while (container.firstChild) container.removeChild(container.firstChild);

  allClothingItems.forEach(item => {
    const label = document.createElement('label');
    label.className = 'clothing-item';
    if (itemsToCheck.includes(item)) label.classList.add('selected');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${prefix}_${item.replace(/\s+/g, '_')}`;
    checkbox.value = item;
    checkbox.checked = itemsToCheck.includes(item);

    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';
    checkmark.textContent = '\u2713';

    const text = document.createElement('span');
    text.textContent = item;

    label.appendChild(checkbox);
    label.appendChild(checkmark);
    label.appendChild(text);

    label.addEventListener('click', (e) => {
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
      label.classList.toggle('selected', checkbox.checked);
    });

    container.appendChild(label);
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

function removeClothingItem() {
  const removedItem = removeRandomClothingItem(clothingItems);
  if (removedItem) saveState();
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
