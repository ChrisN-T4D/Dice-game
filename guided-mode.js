// ----- Guided mode functions -----

function startGuidedMode(totalMinutes, turnMinutes, phasePercents, clothingList, milestoneInterval, clothingEnabled, distributionMode) {
  isGuidedMode = true;
  guidedTotalSeconds = totalMinutes * 60;
  guidedTurnSeconds = turnMinutes * 60;
  guidedDistributionMode = distributionMode; // Store the mode name

  // Calculate phase time allocations based on percentages
  guidedPhaseSeconds[0] = Math.floor(guidedTotalSeconds * (phasePercents[0] / 100));
  guidedPhaseSeconds[1] = Math.floor(guidedTotalSeconds * (phasePercents[1] / 100));
  guidedPhaseSeconds[2] = Math.floor(guidedTotalSeconds * (phasePercents[2] / 100));

  guidedPhaseTimeRemaining = guidedPhaseSeconds[0]; // Start with phase 1
  guidedTurnTimeRemaining = guidedTurnSeconds;
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
      messageBox.textContent = `⭐ Critical roll for Partner ${guidedCurrentPartner}! Extended time.`;
      flashMessage('flash');
    }
  }

  showExercise(phase, loc, actRoll);

  if (extendedTime && whatOutput) {
    whatOutput.textContent += ' Spend about twice as long on this location.';
  }

  // Milestone-based clothing removal (only in Phase 1 & 2)
  if (clothingSystemEnabled && phase < 3 && turnsSinceLastRemoval >= clothingMilestoneInterval) {
    const removedItem = removeClothingItem();
    turnsSinceLastRemoval = 0;

    if (removedItem && clothingOutput) {
      // Roll d6 to determine "how" to remove
      const howRoll = Math.floor(Math.random() * 6) + 1;
      const clothingEntry = clothingTable[howRoll];

      if (howRoll === 1) {
        // Roll 1: No change (but we already removed an item, so just show it)
        clothingOutput.innerHTML = `${clothingEntry.prefix} - ${clothingEntry.fullText}`;
      } else if (howRoll === 6) {
        // Roll 6: Remove 2 items
        const secondItem = removeClothingItem();
        if (secondItem) {
          const methodText = clothingEntry.method ? ` (${clothingEntry.method})` : '';
          clothingOutput.innerHTML = `${clothingEntry.prefix} their <strong>${removedItem}</strong> and <strong>${secondItem}</strong>${methodText}`;
        } else {
          clothingOutput.innerHTML = `${clothingEntry.prefix} their <strong>${removedItem}</strong> (only 1 item remaining)`;
        }
      } else {
        // Rolls 2-5: Remove with style
        const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
        clothingOutput.innerHTML = `${clothingEntry.prefix} their <strong>${removedItem}</strong>${methodText}`;
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
    messageBox.textContent = `Partner ${guidedCurrentPartner}'s turn`;
  }

  // Start turn timer
  guidedTurnTimeRemaining = guidedTurnSeconds;
  startGuidedTurnTimer();
}

function startGuidedTurnTimer() {
  clearInterval(guidedTurnTimerId);

  guidedTurnTimerId = setInterval(() => {
    if (guidedPaused) return;

    guidedTurnTimeRemaining -= 1;
    guidedPhaseTimeRemaining -= 1;

    updateGuidedModeUI();

    // Check if turn is complete
    if (guidedTurnTimeRemaining <= 0) {
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
        // Continue with next turn
        setTimeout(() => {
          performGuidedTurn();
        }, 2000); // 2 second pause between turns
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

    // Continue with next turn after phase change
    setTimeout(() => {
      performGuidedTurn();
    }, 3000); // 3 second pause for phase change
  } else {
    // Session complete
    stopGuidedMode();
    if (messageBox) {
      messageBox.textContent = 'Guided session complete! Check in with each other.';
    }
  }
}

function pauseGuidedMode() {
  guidedPaused = true;
  updateGuidedModeUI();
}

function resumeGuidedMode() {
  guidedPaused = false;
  updateGuidedModeUI();
}

function stopGuidedMode() {
  isGuidedMode = false;
  guidedPaused = false;
  clearInterval(guidedTurnTimerId);
  clearInterval(guidedPhaseTimerId);
  updateGuidedModeUI();
}

function updateGuidedModeUI() {
  const guidedSetup = document.getElementById('guidedSetup');
  const guidedStatus = document.getElementById('guidedStatus');
  const freePlayControls = document.getElementById('freePlayControls');
  const actionTimerSection = document.getElementById('actionTimerSection');
  const currentPartnerSpan = document.getElementById('currentPartner');
  const phaseTimeLeftSpan = document.getElementById('phaseTimeLeft');
  const turnTimeLeftSpan = document.getElementById('turnTimeLeft');
  const phaseAllocationSpan = document.getElementById('phaseAllocation');
  const pauseBtn = document.getElementById('pauseGuided');
  const resumeBtn = document.getElementById('resumeGuided');

  if (isGuidedMode) {
    if (guidedSetup) guidedSetup.style.display = 'none';
    if (guidedStatus) guidedStatus.style.display = 'flex';
    if (freePlayControls) freePlayControls.style.display = 'none';
    if (actionTimerSection) actionTimerSection.style.display = 'none';

    if (currentPartnerSpan) currentPartnerSpan.textContent = `Partner ${guidedCurrentPartner}`;
    if (phaseTimeLeftSpan) phaseTimeLeftSpan.textContent = formatTime(guidedPhaseTimeRemaining);
    if (turnTimeLeftSpan) turnTimeLeftSpan.textContent = formatTime(guidedTurnTimeRemaining);

    // Show phase allocation name or breakdown
    if (phaseAllocationSpan) {
      if (guidedDistributionMode === 'equal') {
        phaseAllocationSpan.textContent = 'Phase allocation: Equal';
      } else if (guidedDistributionMode === 'phase1') {
        phaseAllocationSpan.textContent = 'Phase allocation: Emphasize Phase 1';
      } else if (guidedDistributionMode === 'phase2') {
        phaseAllocationSpan.textContent = 'Phase allocation: Emphasize Phase 2';
      } else if (guidedDistributionMode === 'phase3') {
        phaseAllocationSpan.textContent = 'Phase allocation: Emphasize Phase 3';
      } else {
        // Show custom breakdown
        const p1 = formatTime(guidedPhaseSeconds[0]);
        const p2 = formatTime(guidedPhaseSeconds[1]);
        const p3 = formatTime(guidedPhaseSeconds[2]);
        phaseAllocationSpan.textContent = `Phase allocation: P1: ${p1}, P2: ${p2}, P3: ${p3}`;
      }
    }

    if (pauseBtn && resumeBtn) {
      if (guidedPaused) {
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-block';
      } else {
        pauseBtn.style.display = 'inline-block';
        resumeBtn.style.display = 'none';
      }
    }
  } else {
    if (guidedSetup) guidedSetup.style.display = 'flex';
    if (guidedStatus) guidedStatus.style.display = 'none';
    if (freePlayControls) freePlayControls.style.display = 'block';
    if (actionTimerSection) actionTimerSection.style.display = 'block';
  }
}
