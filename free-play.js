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
    const pos = phaseTable.positions?.[locationRoll];
    location = typeof pos === 'string' ? pos : (pos && (pos.penisVulva || pos.vulvaPenis || pos.vulvaVulva || pos.penisPenis)) || '';
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
    if (instructionOutput) instructionOutput.textContent = '—';
    return;
  }

  let where, what;

  if (currentPhase === 3) {
    where = (typeof getPhase3PositionText === 'function' && giverPartner != null && receiverPartner != null)
      ? getPhase3PositionText(locationRoll, giverPartner, receiverPartner)
      : (() => { const p = phaseTable.positions?.[locationRoll]; return typeof p === 'string' ? p : (p && (p.penisVulva || p.vulvaVulva || p.vulvaPenis || p.penisPenis)) || ''; })();
    what = phaseTable.modifiers?.[actionRoll] ?? '';
    if (giverPartner != null && receiverPartner != null && what && typeof tailorPhase3Modifier === 'function') {
      what = tailorPhase3Modifier(what, giverPartner, receiverPartner);
    }
    // When vibrators not present, remove toy-optional wording from modifier text
    if (typeof vibratorsPresent !== 'undefined' && !vibratorsPresent && what) {
      what = what.replace(/\s*\(toy optional\)\.?/gi, '').trim();
    }
  } else if (currentPhase === 2) {
    where = phaseTable.locations?.[locationRoll] ?? '';
    if (locationRoll === 20) {
      where = "Roller's choice (pick any Phase 2 location or reroll)";
    }
    what  = phaseTable.actions?.[actionRoll] ?? '';
    if (giverPartner != null && receiverPartner != null) {
      if (where && typeof tailorPhase2Location === 'function') {
        where = tailorPhase2Location(where, locationRoll, receiverPartner);
      }
      if (what && typeof tailorPhase2Action === 'function') {
        what = tailorPhase2Action(what, giverPartner, receiverPartner, locationRoll);
      }
    }
  } else if (currentPhase === 1) {
    where = phaseTable.locations?.[locationRoll] ?? '';
    if (locationRoll === 20) {
      where = "Roller's choice (pick any location from the list)";
    }
    what  = phaseTable.actions?.[actionRoll] ?? '';
    if (where && receiverPartner != null && typeof tailorPhase1Location === 'function') {
      where = tailorPhase1Location(where, locationRoll, receiverPartner);
    }
  } else {
    where = phaseTable.locations?.[locationRoll] ?? '';
    what  = phaseTable.actions?.[actionRoll] ?? '';
  }

  // Beginner mode: shorten location/position and action/modifier text (before adding names)
  if (typeof shortenForDetailMode === 'function') {
    if (where) where = shortenForDetailMode(where, 'where');
    if (what) what = shortenForDetailMode(what, 'what');
  }

  // Add giver/receiver context if provided (use partner names when available)
  if (giverPartner && receiverPartner) {
    const giverName = typeof getPartnerName === 'function' ? getPartnerName(giverPartner) : `Partner ${giverPartner}`;
    const receiverName = typeof getPartnerName === 'function' ? getPartnerName(receiverPartner) : `Partner ${receiverPartner}`;
    if (where) {
      if (currentPhase === 3) {
        // Phase 3: positions - giver leads
        // For heterosexual couples with alternating focus, add instructions for both partners
        if (typeof guidedPhase3AlternatingFocus !== 'undefined' && guidedPhase3AlternatingFocus) {
          const otherName = giverPartner === 1 ? receiverName : giverName;
          where = `${giverName} leads: ${where}. Focus on ${giverName}'s pleasure, then switch to focus on ${otherName}'s pleasure, or find ways to stimulate both partners simultaneously.`;
        } else {
          where = `${giverName} leads: ${where}`;
        }
      } else {
        // Phase 1-2: locations - giver touches receiver's location
        where = `${giverName} touches ${receiverName}'s ${where}`;
      }
    }
    if (what) {
      what = `${giverName}: ${what}`;
    }
  }

  // Expand abbreviated seconds for display and TTS: "30s" -> "30 seconds"
  function expandSecondsInText(str) {
    return (str || '').replace(/\b(\d+)s\b/gi, '$1 seconds');
  }
  if (where) where = expandSecondsInText(where);
  if (what) what = expandSecondsInText(what);

  // Apply penetration preference (minimal = append focus-on-external line when prompt mentions penetration)
  if (typeof applyPenetrationPreference === 'function') {
    const applied = applyPenetrationPreference(where, what, currentPhase);
    where = applied.where;
    what = applied.what;
  }
  if (typeof applyExcludeBodyPreferences === 'function') {
    what = applyExcludeBodyPreferences(what);
  }

  if (whereOutput) whereOutput.textContent = where || '—';
  if (whatOutput) whatOutput.textContent = what || '—';
  const flowing = typeof toFlowingInstruction === 'function' ? toFlowingInstruction(where, what, currentPhase) : '';
  if (instructionOutput) instructionOutput.textContent = flowing || '—';

  if (typeof setCurrentPrompt === 'function') {
    setCurrentPrompt(currentPhase, locationRoll, actionRoll);
  }
  if (currentPhase === 3 && typeof window.refreshFavoriteButton === 'function') window.refreshFavoriteButton();
}

function handleRerollPrompt() {
  clearMessages();

  // Generate a new prompt without advancing turns/rounds
  let loc = rollD20();
  let act = rollD20();
  // Phase 3, vibrators not present: reroll vibrator-only modifiers (17, 18, 19)
  while (phase === 3 && typeof vibratorsPresent !== 'undefined' && !vibratorsPresent && typeof isPhase3VibratorModifier === 'function' && isPhase3VibratorModifier(act)) {
    act = rollD20();
  }

  // Phase 3: only the modifier (second d20) is critical. Position 20 is "Roller's choice" in the table.
  const locationRollInput = document.getElementById('locationRoll');
  const actionRollInput = document.getElementById('actionRoll');

  // Update inputs so the UI stays consistent with the shown prompt
  if (locationRollInput) locationRollInput.value = String(loc);
  if (actionRollInput) actionRollInput.value = String(act);

  // Determine giver and receiver
  const giver = freePlayCurrentReceiver === 1 ? 2 : 1;
  const receiver = freePlayCurrentReceiver;

  showExercise(phase, loc, act, giver, receiver);

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
  if (whatOutput) whatOutput.textContent = 'New session started. Enter both rolls (1–20) and optional clothing roll (1–12) when ready.';
  if (instructionOutput) instructionOutput.textContent = 'New session started. Enter both rolls (1–20) and optional clothing roll (1–12) when ready.';
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
  const positionRoll2Input = document.getElementById('positionRoll2');
  const clothingRollInput = document.getElementById('clothingRoll');
  const errorBox = document.getElementById('error');

  const locRaw = locationRollInput.value;
  const actRaw = actionRollInput.value;
  const pos2Raw = phase === 3 && positionRoll2Input ? positionRoll2Input.value : '';

  let loc = Number(locRaw);
  let act = Number(actRaw);

  if (phase === 3) {
    const pos2 = Number(pos2Raw);
    const validDie1 = Number.isInteger(loc) && loc >= 1 && loc <= 20;
    const validPos2 = Number.isInteger(pos2) && pos2 >= 1 && pos2 <= 20;
    if (!validDie1 || !validPos2) {
      if (errorBox) errorBox.textContent = 'Phase 3: enter Position die 1 (1–20), Position die 2 (1–20), and Modifier (1–20).';
      return;
    }
    loc = ((loc - 1) * 20 + pos2 - 1) % 156 + 1;
  }

  const validLoc = phase === 3 ? true : (Number.isInteger(loc) && loc >= 1 && loc <= 20);
  const validAct = Number.isInteger(act) && act >= 1 && act <= 20;

  if (!validLoc || !validAct) {
    if (errorBox) {
      errorBox.textContent = phase === 3 ? 'Enter whole numbers: Position die 1 (1–20), Position die 2 (1–20), Modifier (1–20).' : 'Please enter whole numbers between 1 and 20 for both rolls.';
    }
    return;
  }

  // Optional clothing roll
  let clothingRoll = null;
  if (clothingRollInput && clothingRollInput.value.trim() !== '') {
    const raw = Number(clothingRollInput.value);
    if (Number.isInteger(raw) && raw >= 1 && raw <= 12) {
      clothingRoll = raw;
    }
  }

  let extendedTime = false;
  // Phase 3: only the modifier (second d20) is critical. Position 20 is "Roller's choice" in the table.
  if (act === 20) {
    extendedTime = true;
    act = Math.floor(Math.random() * 19) + 1;
    if (messageBox) {
      messageBox.textContent = '⭐ Critical roll! This action gets extended time.';
      flashMessage('flash');
    }
  }
  // Phase 3, vibrators not present: reroll vibrator-only modifiers (17, 18, 19)
  while (phase === 3 && typeof vibratorsPresent !== 'undefined' && !vibratorsPresent && typeof isPhase3VibratorModifier === 'function' && isPhase3VibratorModifier(act)) {
    act = rollD20();
    if (act === 20) {
      extendedTime = true;
      act = Math.floor(Math.random() * 19) + 1;
    }
  }
  if (actionRollInput && act !== Number(actRaw)) actionRollInput.value = String(act);

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
    const ext = phase === 3 ? ' Spend about twice as long on this position.' : ' Spend about twice as long on this location.';
    if (whatOutput) whatOutput.textContent += ext;
    if (instructionOutput) instructionOutput.textContent += ext;
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
      // Get the "how" description from the d12 roll; treat 10 (music) as reroll if no music selected
      let effectiveClothingRoll = clothingRoll;
      const musicSelected = typeof window.isBackgroundMusicSelected === 'function' && window.isBackgroundMusicSelected();
      if (clothingRoll === 10 && !musicSelected) {
        const otherRolls = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12];
        effectiveClothingRoll = otherRolls[Math.floor(Math.random() * otherRolls.length)];
      }
      const clothingEntry = clothingTable[effectiveClothingRoll];

      // If Free Play clothing system is enabled, combine with specific item
      if (freePlayClothingEnabled && phase < 3) {
        const currentGiver = freePlayCurrentReceiver === 1 ? 2 : 1;
        const currentReceiver = freePlayCurrentReceiver;
        const giverLabel = getPartnerName(currentGiver);
        const receiverLabel = getPartnerName(currentReceiver);
        
        const prefixWithPartner = (clothingEntry.prefix || '').replace(/\{receiver\}/g, receiverLabel);
        if (effectiveClothingRoll === 12) {
          // Roll 12: Remove 2 items; same "how" for both
          const result1 = removeFreePlayClothingItem();
          const result2 = removeFreePlayClothingItem();

          if (result1 && result2) {
            const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
            clothingOutput.textContent = `${giverLabel} ${prefixWithPartner} ${receiverLabel}'s ${result1.item} and ${result2.item}${methodText}`;
          } else if (result1) {
            const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
            clothingOutput.textContent = `${giverLabel} ${prefixWithPartner} ${receiverLabel}'s ${result1.item}${methodText}`;
            if (clothingOutput.textContent.indexOf('(only 1 item remaining)') === -1) {
              clothingOutput.textContent += ' (only 1 item remaining)';
            }
          } else {
            clothingOutput.textContent = 'All clothing has been removed.';
          }

          // Update the display
          updateFreePlayClothingDisplay();
        } else {
          // Rolls 1-11 (or 10 rerolled): Remove 1 item with the specified style
          const result = removeFreePlayClothingItem();

          if (result) {
            const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
            clothingOutput.textContent = `${giverLabel} ${prefixWithPartner} ${receiverLabel}'s ${result.item}${methodText}`;
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
