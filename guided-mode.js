'use strict';
// ----- Guided mode functions -----

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

  // Auto-roll for current partner
  const loc = rollD20();
  const act = rollD20();

  // Show the exercise
  let actRoll = act;
  let extendedTime = false;

  if (act === 20) {
    extendedTime = true;
    actRoll = Math.floor(Math.random() * 19) + 1;
    if (messageBox) {
      const receiver = guidedCurrentPartner === 1 ? 2 : 1;
      messageBox.textContent = `⭐ Critical roll! Extended time. P${guidedCurrentPartner} (giver) → P${receiver} (receiver)`;
      flashMessage('flash');
    }
  }

  // Determine giver and receiver for guided mode
  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;
  
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
      const giverLabel = `Partner ${giver} (giver)`;
      const receiverLabel = `Partner ${receiver} (receiver)`;

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
    messageBox.textContent = `Partner ${guidedCurrentPartner} (giver) → Partner ${receiver} (receiver)`;
  }

  // Start turn timer (add extra time if clothing was removed)
  guidedTurnTimeRemaining = guidedTurnSeconds;
  if (clothingRemoved && guidedClothingRemovalSeconds > 0) {
    guidedTurnTimeRemaining += guidedClothingRemovalSeconds;
    if (messageBox) {
      const currentMessage = messageBox.textContent;
      messageBox.textContent = `${currentMessage} (+${Math.floor(guidedClothingRemovalSeconds / 60)}:${String(guidedClothingRemovalSeconds % 60).padStart(2, '0')} for clothing removal)`;
    }
  }
  startGuidedTurnTimer();
  saveState();

  // Announce the turn instructions via text-to-speech
  speakInstructions();
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
    messageBox.textContent = `Break time - Next: P${guidedCurrentPartner} (giver) → P${receiver} (receiver)`;
  }

  // Announce the break
  speakText('Break time. Switch partners.');

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
  const phaseTimeLeftSpan = document.getElementById('phaseTimeLeft');
  const turnTimeLeftSpan = document.getElementById('turnTimeLeft');
  const turnTimeLeftLabel = document.getElementById('turnTimeLeftLabel');
  const phaseAllocationSpan = document.getElementById('phaseAllocation');
  const nextTurnBtn = document.getElementById('nextTurnGuided');
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
      if (guidedInPause) {
        currentPartnerSpan.textContent = `Break - Next: P${guidedCurrentPartner} (giver) → P${receiver} (receiver)`;
        currentPartnerSpan.style.fontSize = '1.2rem';
      } else {
        currentPartnerSpan.textContent = `P${guidedCurrentPartner} (giver) → P${receiver} (receiver)`;
        currentPartnerSpan.style.fontSize = '1.5rem';
      }
    }

    // Update timer displays
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
    if (pauseBtn && resumeBtn) {
      pauseBtn.style.display = guidedPaused ? 'none' : 'inline-block';
      resumeBtn.style.display = guidedPaused ? 'inline-block' : 'none';
    }
  } else {
    // === GUIDED MODE STOPPED - restore free play UI ===
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
