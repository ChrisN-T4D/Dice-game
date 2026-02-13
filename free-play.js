'use strict';
// ----- Free Play mode functions -----

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function getPrompt(currentPhase, locationRoll, actionRoll) {
  const phaseTable = tables[currentPhase];
  if (!phaseTable) {
    return 'Unknown phase.';
  }

  let location, action;

  if (currentPhase === 3) {
    location = phaseTable.positions?.[locationRoll];
    action = phaseTable.modifiers?.[actionRoll];
  } else {
    location = phaseTable.locations[locationRoll];
    action = phaseTable.actions?.[actionRoll];
  }

  if (!location && !action) {
    return `No prompt defined yet for Phase ${currentPhase}, rolls ${locationRoll} / ${actionRoll}.`;
  }
  if (location && action) {
    return `${phaseTable.name}: ${location} + ${action}`;
  }
  if (location) {
    return `${phaseTable.name}: ${location}.`;
  }
  return `${phaseTable.name}: ${action}.`;
}

function showExercise(currentPhase, locationRoll, actionRoll, giverPartner = null, receiverPartner = null) {
  const phaseTable = tables[currentPhase];
  if (!phaseTable) {
    if (whereOutput) whereOutput.textContent = '—';
    if (whatOutput) whatOutput.textContent = 'Unknown phase.';
    return;
  }

  let where, what;

  if (currentPhase === 3) {
    where = phaseTable.positions?.[locationRoll] ?? '';
    what = phaseTable.modifiers?.[actionRoll] ?? '';
  } else {
    where = phaseTable.locations?.[locationRoll] ?? '';
    what  = phaseTable.actions?.[actionRoll] ?? '';
  }

  // Add giver/receiver context if provided (use partner names when available)
  if (giverPartner && receiverPartner) {
    const giverName = typeof getPartnerName === 'function' ? getPartnerName(giverPartner) : `Partner ${giverPartner}`;
    const receiverName = typeof getPartnerName === 'function' ? getPartnerName(receiverPartner) : `Partner ${receiverPartner}`;
    if (where) {
      where = `${giverName} (giver) touches ${receiverName}'s (receiver) ${where}`;
    }
    if (what) {
      what = `${giverName} (giver): ${what}`;
    }
  }

  if (whereOutput) whereOutput.textContent = where || '—';
  if (whatOutput) whatOutput.textContent = what || '—';

  if (typeof setCurrentPrompt === 'function') {
    setCurrentPrompt(currentPhase, locationRoll, actionRoll);
  }
}

function handleRerollPrompt() {
  clearMessages();

  // Generate a new prompt without advancing turns/rounds
  const loc = rollD20();
  const act = rollD20();

  // Update inputs so the UI stays consistent with the shown prompt
  const locationRollInput = document.getElementById('locationRoll');
  const actionRollInput = document.getElementById('actionRoll');
  if (locationRollInput) locationRollInput.value = String(loc);
  if (actionRollInput) actionRollInput.value = String(act);

  // Determine giver and receiver
  const giver = freePlayCurrentReceiver === 1 ? 2 : 1;
  const receiver = freePlayCurrentReceiver;
  
  showExercise(phase, loc, act, giver, receiver);

  // Optional UI message
  if (messageBox) {
    messageBox.textContent = "Prompt rerolled (turn/round unchanged).";
  }
}

function resetSession() {
  // Reset all game state
  phase = 1;
  rollCount = 0;
  usedWhereThisPhase = new Set();
  usedWhatThisPhase  = new Set();
  awaitingPartnerTurn = false;
  clothingPromptsEnabled = true;

  // Reset Free Play clothing state
  freePlayClothingItemsP1 = [];
  freePlayClothingItemsP2 = [];

  // Re-show clothing setup inputs, hide status display
  const setupInputs = document.getElementById('freePlayClothingSetupInputs');
  const clothingStatus = document.getElementById('freePlayClothingStatus');
  if (setupInputs) setupInputs.style.display = freePlayClothingEnabled ? 'block' : 'none';
  if (clothingStatus) clothingStatus.style.display = 'none';

  // Repopulate clothing checkboxes to clear selections
  populateFreePlayClothingCheckboxes(1);
  populateFreePlayClothingCheckboxes(2);

  // Reset turn indicator and receiver display
  freePlayCurrentReceiver = 1;
  updateTurnIndicator();
  if (typeof updateReceiverButtons === 'function') updateReceiverButtons();

  // Clear roll inputs
  const locationRollInput = document.getElementById('locationRoll');
  const actionRollInput = document.getElementById('actionRoll');
  const clothingRollInput = document.getElementById('clothingRoll');
  if (locationRollInput) locationRollInput.value = '';
  if (actionRollInput) actionRollInput.value = '';
  if (clothingRollInput) clothingRollInput.value = '';

  // Clear any running timers
  clearTimer();
  timerRemainingSeconds = 0;
  updateTimerDisplay();

  // Clear saved state so landing modal shows on next refresh
  clearSavedState();

  // Update all UI elements
  clearMessages();
  notifyPhaseChange(phase);
  updatePhaseUI(phase, rollCount);
  updateRollLabels(phase);

  // Reset output displays
  if (whereOutput) whereOutput.textContent = '—';
  if (whatOutput) whatOutput.textContent = 'New session started. Enter both d20 rolls (and optional d6) when ready.';
  if (clothingOutput) clothingOutput.textContent = '';
}

function handleUserRoll() {
  clearMessages();

  // Initialize Free Play clothing items on first roll if enabled
  if (freePlayClothingEnabled && freePlayClothingItemsP1.length === 0 && freePlayClothingItemsP2.length === 0 && phase === 1 && rollCount === 0) {
    freePlayClothingItemsP1 = getFreePlaySelectedClothingItems(1);
    freePlayClothingItemsP2 = getFreePlaySelectedClothingItems(2);
    updateFreePlayClothingDisplay();
  }

  const locationRollInput = document.getElementById('locationRoll');
  const actionRollInput = document.getElementById('actionRoll');
  const clothingRollInput = document.getElementById('clothingRoll');
  const errorBox = document.getElementById('error');

  const locRaw = locationRollInput.value;
  const actRaw = actionRollInput.value;

  const loc = Number(locRaw);
  let act = Number(actRaw);

  const validLoc = Number.isInteger(loc) && loc >= 1 && loc <= 20;
  const validAct = Number.isInteger(act) && act >= 1 && act <= 20;

  if (!validLoc || !validAct) {
    if (errorBox) {
      errorBox.textContent = 'Please enter whole numbers between 1 and 20 for both d20 rolls.';
    }
    return;
  }

  // Optional clothing roll
  let clothingRoll = null;
  if (clothingRollInput && clothingRollInput.value.trim() !== '') {
    const raw = Number(clothingRollInput.value);
    if (Number.isInteger(raw) && raw >= 1 && raw <= 6) {
      clothingRoll = raw;
    }
  }

  let extendedTime = false;
  if (act === 20) {
    extendedTime = true;
    act = Math.floor(Math.random() * 19) + 1;
    if (messageBox) {
      messageBox.textContent = '⭐ Critical roll! This action gets extended time.';
      flashMessage('flash');
    }
  }

  // Repeat detection
  let isWhereRepeat = false;
  let isWhatRepeat = false;

  if (!extendedTime) {
    isWhereRepeat = usedWhereThisPhase.has(loc);
    isWhatRepeat  = usedWhatThisPhase.has(act);

    usedWhereThisPhase.add(loc);
    usedWhatThisPhase.add(act);
  }

  showExercise(phase, loc, act);

  if (extendedTime) {
    if (whatOutput) whatOutput.textContent += ' Spend about twice as long on this location.';
  } else if (isWhereRepeat || isWhatRepeat) {
    if (isWhereRepeat && isWhatRepeat) {
      if (messageBox) {
        messageBox.textContent = "Repeat where + repeat what rolled. Explore what changes when you vary pressure/tempo/intensity.";
      }
    } else if (isWhereRepeat) {
      if (messageBox) {
        messageBox.textContent = "Repeat where rolled. Keep the same where, but try it with a different feel.";
      }
    } else {
      if (messageBox) {
        messageBox.textContent = "Repeat what rolled. Try the same what with a different vibe.";
      }
    }
    flashMessage("repeat-flash");
  }

  // Clothing prompt output
  if (clothingOutput) {
    if (!clothingPromptsEnabled || clothingRoll === null) {
      clothingOutput.textContent = '';
    } else {
      // Get the "how" description from the d6 roll
      const clothingEntry = clothingTable[clothingRoll];

      // If Free Play clothing system is enabled, combine with specific item
      if (freePlayClothingEnabled && phase < 3) {
        const currentGiver = freePlayCurrentReceiver === 1 ? 2 : 1;
        const currentReceiver = freePlayCurrentReceiver;
        const giverLabel = `${getPartnerName(currentGiver)} (giver)`;
        const receiverLabel = `${getPartnerName(currentReceiver)} (receiver)`;
        
        if (clothingRoll === 1) {
          // Roll 1: No change
          clothingOutput.textContent = `${clothingEntry.prefix} - ${clothingEntry.fullText}`;
        } else if (clothingRoll === 6) {
          // Roll 6: Remove 2 items
          const result1 = removeFreePlayClothingItem();
          const result2 = removeFreePlayClothingItem();

          if (result1 && result2) {
            const methodText = clothingEntry.method ? ` (${clothingEntry.method})` : '';
            clothingOutput.textContent = `${giverLabel} ${clothingEntry.prefix} ${receiverLabel}'s ${result1.item} and ${result2.item}${methodText}`;
          } else if (result1) {
            clothingOutput.textContent = `${giverLabel} ${clothingEntry.prefix} ${receiverLabel}'s ${result1.item} (only 1 item remaining)`;
          } else {
            clothingOutput.textContent = 'All clothing has been removed.';
          }

          // Update the display
          updateFreePlayClothingDisplay();
        } else {
          // Rolls 2-5: Remove 1 item with the specified style
          const result = removeFreePlayClothingItem();

          if (result) {
            const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
            clothingOutput.textContent = `${giverLabel} ${clothingEntry.prefix} ${receiverLabel}'s ${result.item}${methodText}`;
          } else {
            clothingOutput.textContent = 'All clothing has been removed.';
          }

          // Update the display
          updateFreePlayClothingDisplay();
        }
      } else {
        // Generic mode - just show the "how" description
        if (clothingEntry.fullText) {
          clothingOutput.textContent = `${clothingEntry.prefix} - ${clothingEntry.fullText}`;
        } else {
          const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
          clothingOutput.textContent = `${clothingEntry.prefix}${methodText}`;
        }
      }
    }
  }

  // Round tracking: two uses of handleUserRoll = one round
  if (!awaitingPartnerTurn) {
    awaitingPartnerTurn = true;
  } else {
    awaitingPartnerTurn = false;

    // Swap receiver after each round in Free Play
    if (freePlayClothingEnabled) {
      freePlayCurrentReceiver = freePlayCurrentReceiver === 1 ? 2 : 1;
      if (typeof updateReceiverButtons === 'function') updateReceiverButtons();
      updateTurnIndicator();
    }

    rollCount++;

    const internalRoll = 1 + Math.floor(Math.random() * 20); // 1–20

    if (internalRoll < rollCount && phase < maxPhase) {
      phase++;
      rollCount = 0;
      notifyPhaseChange(phase);
      usedWhereThisPhase = new Set();
      usedWhatThisPhase  = new Set();
      flashMessage('flash');

      // Update Free Play clothing display when entering phase 3
      if (phase === 3) {
        updateFreePlayClothingDisplay();
      }
    }
  }

  updatePhaseUI(phase, rollCount);
  saveState();

  // Announce results via text-to-speech
  speakInstructions();

  locationRollInput.value = '';
  actionRollInput.value = '';
  if (clothingRollInput) clothingRollInput.value = '';
}
