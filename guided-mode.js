'use strict';
// ----- Guided mode functions -----

/** Pre-rolled next turn (set at break start, used when break ends). Not persisted. */
let guidedNextTurnRolls = null;

/**
 * Build instruction text for the next turn (used to speak 5s into break). Uses current phase and guidedCurrentPartner.
 */
function buildInstructionsTextForNextTurn(loc, actRoll, extendedTime) {
  if (typeof tables === 'undefined' || !tables[phase]) return '';
  const phaseTable = tables[phase];
  let where = phase === 3
    ? (phaseTable.positions?.[loc] ?? '')
    : (phaseTable.locations?.[loc] ?? '');
  let what = phase === 3
    ? (phaseTable.modifiers?.[actRoll] ?? '')
    : (phaseTable.actions?.[actRoll] ?? '');
  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;
  const giverName = getPartnerName(giver);
  const receiverName = getPartnerName(receiver);
  if (where) {
    const whereLabel = phase === 3 ? 'position' : 'location';
    where = `${giverName} (giver) touches ${receiverName}'s (receiver) ${where}`;
  }
  if (what) what = `${giverName} (giver): ${what}`;
  const parts = [`${giverName} (giver) to ${receiverName} (receiver)`];
  if (where) parts.push('Where: ' + where);
  if (what) parts.push('How: ' + what);
  if (extendedTime) parts.push('Spend about twice as long on this location.');
  return parts.join('. ') + '.';
}

/**
 * Parse the "what" prompt text for duration/repetition hints and return a suggested minimum turn length in seconds.
 * Used so Phase 2/3 prompts like "repeat 10 times" or "60s then 30s" get enough turn time.
 */
function getSuggestedTurnSecondsFromPrompt(text) {
  if (!text || typeof text !== 'string') return 0;
  const t = text.replace(/^Partner\s+\d+\s+\(giver\):\s*/i, '').trim();
  let suggested = 0;

  // Explicit seconds: "60s", "30 seconds", "for 90 seconds", "60s steady then 15s stillness"
  const secMatches = t.match(/\b(\d+)\s*s(?:econds?)?\b|for\s+(\d+)\s*s(?:econds?)?/gi);
  if (secMatches) {
    let sum = 0;
    secMatches.forEach(m => {
      const n = parseInt(m.replace(/\D/g, ''), 10);
      if (!isNaN(n)) sum += n;
    });
    if (sum > 0) suggested = Math.max(suggested, sum);
  }

  // "X times" (e.g. "repeat 10 times", "eight times") – estimate ~10 seconds per repetition
  const timesMatch = t.match(/(\d+)\s+times|(eight|six|four|ten)\s+times/gi);
  if (timesMatch) {
    const wordToNum = { eight: 8, six: 6, four: 4, ten: 10 };
    timesMatch.forEach(m => {
      const digit = m.match(/\d+/);
      const n = digit ? parseInt(digit[0], 10) : (wordToNum[m.split(/\s/)[0].toLowerCase()] || 0);
      if (n > 0) suggested = Math.max(suggested, n * 10);
    });
  }

  return suggested;
}

function startGuidedMode(totalMinutes, turnMinutes, pauseSeconds, clothingRemovalSeconds, phasePercents, clothingList, milestoneInterval, clothingEnabled, distributionMode) {
  isGuidedMode = true;
  guidedTotalSeconds = totalMinutes * 60;
  guidedTurnSeconds = turnMinutes * 60;
  guidedPauseSeconds = pauseSeconds;
  guidedClothingRemovalSeconds = clothingRemovalSeconds;
  guidedDistributionMode = distributionMode; // Store the mode name

  // Calculate phase time allocations based on percentages
  guidedPhaseSeconds[0] = Math.floor(guidedTotalSeconds * (phasePercents[0] / 100));
  guidedPhaseSeconds[1] = Math.floor(guidedTotalSeconds * (phasePercents[1] / 100));
  guidedPhaseSeconds[2] = Math.floor(guidedTotalSeconds * (phasePercents[2] / 100));

  guidedPhaseTimeRemaining = guidedPhaseSeconds[0]; // Start with phase 1
  guidedTurnTimeRemaining = guidedTurnSeconds;
  guidedPauseTimeRemaining = 0;
  guidedInPause = false;
  guidedCurrentPartner = 1;
  guidedPaused = false;

  // Initialize clothing system
  clothingSystemEnabled = clothingEnabled;
  clothingItems = clothingEnabled ? [...clothingList] : [];
  clothingMilestoneInterval = milestoneInterval;
  turnsSinceLastRemoval = 0;
  totalTurnsInSession = 0;

  // Reset to phase 1
  phase = 1;
  rollCount = 0;
  usedWhereThisPhase = new Set();
  usedWhatThisPhase = new Set();
  awaitingPartnerTurn = false;

  // Update UI
  updateGuidedModeUI();
  updateClothingDisplay();
  notifyPhaseChange(phase);

  // Start first turn
  performGuidedTurn();
}

function performGuidedTurn() {
  if (!isGuidedMode || guidedPaused) return;

  // Increment turn counter
  totalTurnsInSession++;
  turnsSinceLastRemoval++;

  // Use pre-rolled next turn (from break) or roll now
  let loc, actRoll, extendedTime;
  if (guidedNextTurnRolls) {
    loc = guidedNextTurnRolls.loc;
    actRoll = guidedNextTurnRolls.actRoll;
    extendedTime = guidedNextTurnRolls.extendedTime;
    guidedNextTurnRolls = null;
  } else {
    loc = rollD20();
    const act = rollD20();
    actRoll = act;
    extendedTime = false;
    if (act === 20) {
      extendedTime = true;
      actRoll = Math.floor(Math.random() * 19) + 1;
    }
  }

  // Show the exercise
  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;

  if (extendedTime && messageBox) {
    const giverName = getPartnerName(giver);
    const receiverName = getPartnerName(receiver);
    messageBox.textContent = `⭐ Critical roll! Extended time. ${giverName} (giver) → ${receiverName} (receiver)`;
    flashMessage('flash');
  }

  showExercise(phase, loc, actRoll, giver, receiver);

  if (extendedTime && whatOutput) {
    whatOutput.textContent += ' Spend about twice as long on this location.';
  }

  // Milestone-based clothing removal (only in Phase 1 & 2)
  let clothingRemoved = false;
  if (clothingSystemEnabled && phase < 3 && turnsSinceLastRemoval >= clothingMilestoneInterval) {
    const removedItem = removeClothingItem();
    turnsSinceLastRemoval = 0;

    if (removedItem && clothingOutput) {
      clothingRemoved = true;
      // Roll d6 to determine "how" to remove
      const howRoll = Math.floor(Math.random() * 6) + 1;
      const clothingEntry = clothingTable[howRoll];
      const giverLabel = `${getPartnerName(giver)} (giver)`;
      const receiverLabel = `${getPartnerName(receiver)} (receiver)`;

      if (howRoll === 1) {
        // Roll 1: No change (but we already removed an item, so just show it)
        clothingOutput.textContent = `${clothingEntry.prefix} - ${clothingEntry.fullText}`;
      } else if (howRoll === 6) {
        // Roll 6: Remove 2 items
        const secondItem = removeClothingItem();
        if (secondItem) {
          const methodText = clothingEntry.method ? ` (${clothingEntry.method})` : '';
          clothingOutput.textContent = `${giverLabel} ${clothingEntry.prefix} ${receiverLabel}'s ${removedItem} and ${secondItem}${methodText}`;
        } else {
          clothingOutput.textContent = `${giverLabel} ${clothingEntry.prefix} ${receiverLabel}'s ${removedItem} (only 1 item remaining)`;
        }
      } else {
        // Rolls 2-5: Remove with style
        const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
        clothingOutput.textContent = `${giverLabel} ${clothingEntry.prefix} ${receiverLabel}'s ${removedItem}${methodText}`;
      }
    } else if (clothingItems.length === 0 && clothingOutput) {
      clothingOutput.textContent = 'All clothing has been removed.';
    }
  } else if (clothingOutput) {
    // No clothing change this turn
    if (clothingSystemEnabled && phase < 3 && clothingItems.length > 0) {
      clothingOutput.textContent = 'No clothing change this turn.';
    } else {
      clothingOutput.textContent = '';
    }
  }

  // Update clothing display
  updateClothingDisplay();

  // Display which partner's turn it is
  if (messageBox && !extendedTime) {
    const receiver = guidedCurrentPartner === 1 ? 2 : 1;
    messageBox.textContent = `${getPartnerName(guidedCurrentPartner)} (giver) → ${getPartnerName(receiver)} (receiver)`;
  }

  // Set turn duration: base time, then extend if the prompt says "X times" or "Xs / X seconds"
  guidedTurnTimeRemaining = guidedTurnSeconds;
  if (clothingRemoved && guidedClothingRemovalSeconds > 0) {
    guidedTurnTimeRemaining += guidedClothingRemovalSeconds;
    if (messageBox) {
      const currentMessage = messageBox.textContent;
      messageBox.textContent = `${currentMessage} (+${Math.floor(guidedClothingRemovalSeconds / 60)}:${String(guidedClothingRemovalSeconds % 60).padStart(2, '0')} for clothing removal)`;
    }
  }
  const whatText = (whatOutput && whatOutput.textContent) || '';
  const suggestedFromPrompt = getSuggestedTurnSecondsFromPrompt(whatText);
  if (suggestedFromPrompt > 0) {
    const cap = 5 * 60; // max 5 min extension from prompt
    guidedTurnTimeRemaining = Math.max(guidedTurnTimeRemaining, Math.min(suggestedFromPrompt, cap));
  }

  // Read instructions aloud (always, even if Voice is off), then start timer when reading is done
  if (typeof speakInstructionsThen === 'function') {
    speakInstructionsThen({ includeMessage: true }, () => {
      startGuidedTurnTimer();
      saveState();
    });
  } else {
    startGuidedTurnTimer();
    saveState();
  }
}

/**
 * Reroll location and action for the current guided turn (same partner, same turn time).
 * Does not increment turn count or change clothing.
 */
function rerollGuidedPrompt() {
  if (!isGuidedMode || guidedPaused || guidedInPause) return;

  const loc = rollD20();
  const act = rollD20();
  let actRoll = act;
  let extendedTime = false;

  if (act === 20) {
    extendedTime = true;
    actRoll = Math.floor(Math.random() * 19) + 1;
    if (messageBox) {
      const receiver = guidedCurrentPartner === 1 ? 2 : 1;
      const giverName = getPartnerName(guidedCurrentPartner);
      const receiverName = getPartnerName(receiver);
      messageBox.textContent = `⭐ Critical roll! Extended time. ${giverName} (giver) → ${receiverName} (receiver)`;
      flashMessage('flash');
    }
  }

  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;
  showExercise(phase, loc, actRoll, giver, receiver);

  if (extendedTime && whatOutput) {
    whatOutput.textContent += ' Spend about twice as long on this location.';
  }

  if (messageBox && !extendedTime) {
    messageBox.textContent = `${getPartnerName(giver)} (giver) → ${getPartnerName(receiver)} (receiver)`;
  }

  // Re-speak the new prompt (turn timer keeps running)
  if (typeof speakInstructionsThen === 'function') {
    speakInstructionsThen({ includeMessage: true }, () => {});
  }

  updateClothingDisplay();
  saveState();
}

function startGuidedTurnTimer() {
  clearInterval(guidedTurnTimerId);

  guidedTurnTimerId = setInterval(() => {
    if (guidedPaused) return;

    guidedTurnTimeRemaining -= 1;
    guidedPhaseTimeRemaining -= 1;

    updateGuidedModeUI();
    
    // Save state every 5 seconds
    if (guidedTurnTimeRemaining % 5 === 0) {
      saveState();
    }

    // Check if turn is complete
    if (guidedTurnTimeRemaining <= 0) {
      completeTurn();
    }
  }, 1000);
}

function completeTurn() {
  clearInterval(guidedTurnTimerId);

  // Play sound
  if (timerSound) {
    timerSound.currentTime = 0;
    timerSound.play().catch(() => {});
  }

  // Switch partner
  guidedCurrentPartner = guidedCurrentPartner === 1 ? 2 : 1;

  // Check if phase time is up
  if (guidedPhaseTimeRemaining <= 0) {
    advanceGuidedPhase();
  } else {
    // Start pause between turns (if configured)
    if (guidedPauseSeconds > 0) {
      startGuidedPause();
    } else {
      // No pause, continue immediately
      performGuidedTurn();
    }
  }
}

function skipToNextTurn() {
  if (!isGuidedMode || guidedPaused || guidedInPause) return;
  
  // Deduct remaining turn time from phase time before completing
  guidedPhaseTimeRemaining -= guidedTurnTimeRemaining;
  guidedTurnTimeRemaining = 0;
  
  completeTurn();
}

function startGuidedPause() {
  guidedInPause = true;
  guidedPauseTimeRemaining = guidedPauseSeconds;
  
  if (messageBox) {
    const receiver = guidedCurrentPartner === 1 ? 2 : 1;
    messageBox.textContent = `Break time - Next: ${getPartnerName(guidedCurrentPartner)} (giver) → ${getPartnerName(receiver)} (receiver)`;
  }

  // Say "Time to switch" at the immediate start of the break
  if (typeof speakText === 'function') speakText('Time to switch.', { force: true });

  // Pre-roll the next turn so we can announce it 5 seconds into the break
  const loc = rollD20();
  const act = rollD20();
  let actRoll = act;
  let extendedTime = false;
  if (act === 20) {
    extendedTime = true;
    actRoll = Math.floor(Math.random() * 19) + 1;
  }
  guidedNextTurnRolls = { loc, actRoll, extendedTime };

  // 5 seconds into the break, read the next turn's instructions aloud (and clothing reminder if next turn has removal)
  const nextTurnHasClothingRemoval = clothingSystemEnabled && phase < 3 && clothingItems.length > 0 && (turnsSinceLastRemoval + 1) >= clothingMilestoneInterval;
  setTimeout(() => {
    if (!isGuidedMode || !guidedInPause || guidedPaused || !guidedNextTurnRolls || typeof speakText !== 'function') return;
    let text = buildInstructionsTextForNextTurn(guidedNextTurnRolls.loc, guidedNextTurnRolls.actRoll, guidedNextTurnRolls.extendedTime);
    if (nextTurnHasClothingRemoval && text) text = 'Time to remove clothing if you haven\'t already. ' + text;
    else if (nextTurnHasClothingRemoval) text = 'Time to remove clothing if you haven\'t already.';
    if (text) speakText(text, { force: true });
  }, 5000);

  guidedTurnTimerId = setInterval(() => {
    if (guidedPaused) return;

    guidedPauseTimeRemaining -= 1;
    guidedPhaseTimeRemaining -= 1; // Pause counts against phase time

    updateGuidedModeUI();
    
    // Save state every 5 seconds
    if (guidedPauseTimeRemaining % 5 === 0) {
      saveState();
    }

    if (guidedPauseTimeRemaining <= 0) {
      clearInterval(guidedTurnTimerId);
      guidedInPause = false;

      // Check if phase time ran out during pause
      if (guidedPhaseTimeRemaining <= 0) {
        advanceGuidedPhase();
      } else {
        performGuidedTurn();
      }
    }
  }, 1000);
}

function advanceGuidedPhase() {
  if (phase < maxPhase) {
    phase++;
    guidedPhaseTimeRemaining = guidedPhaseSeconds[phase - 1];
    usedWhereThisPhase = new Set();
    usedWhatThisPhase = new Set();
    rollCount = 0;

    notifyPhaseChange(phase);
    updatePhaseUI(phase, rollCount);
    updateGuidedModeUI();
    updateClothingDisplay();
    saveState();

    // Continue with next turn after phase change (brief pause for notification)
    setTimeout(() => {
      performGuidedTurn();
    }, 3000);
  } else {
    // Session complete
    stopGuidedMode();
    if (messageBox) {
      messageBox.textContent = 'Guided session complete! Check in with each other.';
    }
    speakText('Session complete. Check in with each other.');
  }
}

function pauseGuidedMode() {
  guidedPaused = true;
  updateGuidedModeUI();
  saveState();
}

function resumeGuidedMode() {
  guidedPaused = false;
  updateGuidedModeUI();
  saveState();
  // Restart the turn timer if we're in the middle of a turn (not in break)
  if (!guidedInPause && guidedTurnTimeRemaining > 0 && typeof startGuidedTurnTimer === 'function') {
    startGuidedTurnTimer();
  }
  // If we're in the break (pause between turns), restart the pause countdown only (don't reset pause)
  if (guidedInPause && guidedPauseTimeRemaining > 0) {
    clearInterval(guidedTurnTimerId);
    guidedTurnTimerId = setInterval(() => {
      if (guidedPaused) return;
      guidedPauseTimeRemaining -= 1;
      guidedPhaseTimeRemaining -= 1;
      updateGuidedModeUI();
      if (guidedPauseTimeRemaining % 5 === 0) saveState();
      if (guidedPauseTimeRemaining <= 0) {
        clearInterval(guidedTurnTimerId);
        guidedInPause = false;
        if (guidedPhaseTimeRemaining <= 0) advanceGuidedPhase();
        else performGuidedTurn();
      }
    }, 1000);
  }
}

function stopGuidedMode() {
  isGuidedMode = false;
  guidedPaused = false;
  clearInterval(guidedTurnTimerId);
  clearInterval(guidedPhaseTimerId);
  stopSpeaking();
  updateGuidedModeUI();
  clearSavedState();
}

function updateGuidedModeUI() {
  // Get ALL elements this function needs to manage
  const guidedSetup = document.getElementById('guidedSetup');
  const guidedStatus = document.getElementById('guidedStatus');
  const freePlayControls = document.getElementById('freePlayControls');
  const actionTimerSection = document.getElementById('actionTimerSection');
  const rollGrid = document.querySelector('.roll-grid');
  const submitRow = document.getElementById('submitRoll')?.closest('.row');
  const phaseRow = document.getElementById('goToNextPhase')?.closest('.row');
  const voiceToggleRow = document.getElementById('voiceToggleRow');
  const outputBox = getOutputDisplayBox();
  const messageDiv = document.getElementById('message');
  const errorDiv = document.getElementById('error');

  const currentPartnerSpan = document.getElementById('currentPartner');
  const totalTimeLeftSpan = document.getElementById('totalTimeLeft');
  const phaseTimeLeftSpan = document.getElementById('phaseTimeLeft');
  const turnTimeLeftSpan = document.getElementById('turnTimeLeft');
  const turnTimeLeftLabel = document.getElementById('turnTimeLeftLabel');
  const phaseAllocationSpan = document.getElementById('phaseAllocation');
  const nextTurnBtn = document.getElementById('nextTurnGuided');
  const rerollPromptBtn = document.getElementById('rerollGuidedPrompt');
  const pauseBtn = document.getElementById('pauseGuided');
  const resumeBtn = document.getElementById('resumeGuided');

  if (isGuidedMode) {
    // === GUIDED MODE ACTIVE ===
    // Hide setup, free play controls, and free-play-only inputs
    if (guidedSetup) guidedSetup.style.display = 'none';
    if (freePlayControls) freePlayControls.style.display = 'none';
    if (actionTimerSection) actionTimerSection.style.display = 'none';
    if (rollGrid) rollGrid.style.display = 'none';
    if (submitRow) submitRow.style.display = 'none';
    if (phaseRow) phaseRow.style.display = 'none';

    // Show guided status panel and output displays
    if (guidedStatus) guidedStatus.style.display = 'flex';
    if (voiceToggleRow) voiceToggleRow.style.display = '';
    if (outputBox) outputBox.style.display = 'block';
    if (messageDiv) messageDiv.style.display = '';
    if (errorDiv) errorDiv.style.display = '';

    // Update partner display
    if (currentPartnerSpan) {
      const receiver = guidedCurrentPartner === 1 ? 2 : 1;
      const giverName = getPartnerName(guidedCurrentPartner);
      const receiverName = getPartnerName(receiver);
      if (guidedInPause) {
        currentPartnerSpan.textContent = `Break - Next: ${giverName} (giver) → ${receiverName} (receiver)`;
        currentPartnerSpan.style.fontSize = '1.2rem';
      } else {
        currentPartnerSpan.textContent = `${giverName} (giver) → ${receiverName} (receiver)`;
        currentPartnerSpan.style.fontSize = '1.5rem';
      }
    }

    // Update timer displays
    if (totalTimeLeftSpan) {
      const remainingLaterPhases = phase === 1 ? (guidedPhaseSeconds[1] || 0) + (guidedPhaseSeconds[2] || 0)
        : phase === 2 ? (guidedPhaseSeconds[2] || 0) : 0;
      totalTimeLeftSpan.textContent = formatTime(guidedPhaseTimeRemaining + remainingLaterPhases);
    }
    if (phaseTimeLeftSpan) phaseTimeLeftSpan.textContent = formatTime(guidedPhaseTimeRemaining);
    if (turnTimeLeftLabel) {
      turnTimeLeftLabel.textContent = guidedInPause ? 'Pause Time:' : 'Turn Time Left:';
    }
    if (turnTimeLeftSpan) {
      if (guidedInPause) {
        turnTimeLeftSpan.textContent = formatTime(guidedPauseTimeRemaining);
        turnTimeLeftSpan.style.color = '#a7f3d0';
      } else {
        turnTimeLeftSpan.textContent = formatTime(guidedTurnTimeRemaining);
        turnTimeLeftSpan.style.color = '#e5e7eb';
      }
    }

    // Show phase allocation
    if (phaseAllocationSpan) {
      const distLabels = {
        equal: 'Equal',
        phase1: 'Emphasize Phase 1',
        phase2: 'Emphasize Phase 2',
        phase3: 'Emphasize Phase 3'
      };
      if (distLabels[guidedDistributionMode]) {
        phaseAllocationSpan.textContent = `Phase allocation: ${distLabels[guidedDistributionMode]}`;
      } else {
        const times = guidedPhaseSeconds.map(s => formatTime(s));
        phaseAllocationSpan.textContent = `Phase allocation: P1: ${times[0]}, P2: ${times[1]}, P3: ${times[2]}`;
      }
    }

    // Control buttons visibility
    if (nextTurnBtn) {
      nextTurnBtn.style.display = (guidedInPause || guidedPaused) ? 'none' : 'inline-block';
    }
    if (rerollPromptBtn) {
      rerollPromptBtn.style.display = (guidedInPause || guidedPaused) ? 'none' : 'inline-block';
    }
    if (pauseBtn && resumeBtn) {
      pauseBtn.style.display = guidedPaused ? 'none' : 'inline-block';
      resumeBtn.style.display = guidedPaused ? 'inline-block' : 'none';
    }
  } else {
    // === GUIDED MODE STOPPED - only show free play UI if user chose free play (don't overwrite guided-setup) ===
    const wantFreePlay = (typeof window.currentUIMode !== 'undefined' && window.currentUIMode === 'freeplay');
    if (wantFreePlay) {
      if (guidedSetup) guidedSetup.style.display = 'none';
      if (guidedStatus) guidedStatus.style.display = 'none';
      if (freePlayControls) freePlayControls.style.display = 'block';
      if (actionTimerSection) actionTimerSection.style.display = 'block';
      if (rollGrid) rollGrid.style.display = '';
      if (submitRow) submitRow.style.display = '';
      if (phaseRow) phaseRow.style.display = '';
      if (voiceToggleRow) voiceToggleRow.style.display = '';
      if (outputBox) outputBox.style.display = '';
      if (messageDiv) messageDiv.style.display = '';
      if (errorDiv) errorDiv.style.display = '';
    }
  }
}
