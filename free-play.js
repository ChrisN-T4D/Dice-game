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

function showExercise(currentPhase, locationRoll, actionRoll) {
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

  if (whereOutput) whereOutput.textContent = where || '—';
  if (whatOutput) whatOutput.textContent = what || '—';
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

  showExercise(phase, loc, act);

  // Optional UI message
  if (messageBox) {
    messageBox.textContent = "Prompt rerolled (turn/round unchanged).";
  }
}

function resetSession() {
  phase = 1;
  rollCount = 0;
  usedWhereThisPhase = new Set();
  usedWhatThisPhase  = new Set();
  awaitingPartnerTurn = false;
  clothingPromptsEnabled = true;

  // Reset Free Play clothing
  freePlayClothingItemsP1 = [];
  freePlayClothingItemsP2 = [];
  const setupInputs = document.getElementById('freePlayClothingSetupInputs');
  const clothingStatus = document.getElementById('freePlayClothingStatus');
  if (setupInputs) setupInputs.style.display = freePlayClothingEnabled ? 'block' : 'none';
  if (clothingStatus) clothingStatus.style.display = 'none';

  // Reset turn indicator
  updateTurnIndicator();

  saveState();
  clearMessages();
  notifyPhaseChange(phase);
  updatePhaseUI(phase, rollCount);
  if (whereOutput) whereOutput.textContent = 'New session started. Enter both d20 rolls (and optional d6) when ready.';
  if (whatOutput) whatOutput.textContent = 'New session started. Enter both d20 rolls (and optional d6) when ready.';
  if (clothingOutput) clothingOutput.textContent = 'New session started. Enter both d20 rolls (and optional d6) when ready.';
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
        if (clothingRoll === 1) {
          // Roll 1: No change
          clothingOutput.innerHTML = `${clothingEntry.prefix} - ${clothingEntry.fullText}`;
        } else if (clothingRoll === 6) {
          // Roll 6: Remove 2 items
          const result1 = removeFreePlayClothingItem();
          const result2 = removeFreePlayClothingItem();

          if (result1 && result2) {
            const methodText = clothingEntry.method ? ` (${clothingEntry.method})` : '';
            clothingOutput.innerHTML = `Partner ${result1.partner}: ${clothingEntry.prefix} their <strong>${result1.item}</strong> and <strong>${result2.item}</strong>${methodText}`;
          } else if (result1) {
            clothingOutput.innerHTML = `Partner ${result1.partner}: ${clothingEntry.prefix} their <strong>${result1.item}</strong> (only 1 item remaining)`;
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
            clothingOutput.innerHTML = `Partner ${result.partner}: ${clothingEntry.prefix} their <strong>${result.item}</strong>${methodText}`;
          } else {
            clothingOutput.textContent = 'All clothing has been removed.';
          }

          // Update the display
          updateFreePlayClothingDisplay();
        }
      } else {
        // Generic mode - just show the "how" description
        if (clothingEntry.fullText) {
          clothingOutput.innerHTML = `${clothingEntry.prefix} - ${clothingEntry.fullText}`;
        } else {
          const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
          clothingOutput.innerHTML = `${clothingEntry.prefix}${methodText}`;
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

  saveState();
  updatePhaseUI(phase, rollCount);

  locationRollInput.value = '';
  actionRollInput.value = '';
  if (clothingRollInput) clothingRollInput.value = '';
}
