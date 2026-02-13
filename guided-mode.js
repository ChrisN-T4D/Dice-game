'use strict';
// ----- Guided mode functions -----

/** Pre-rolled next turn (set at break start, used when break ends). Not persisted. */
let guidedNextTurnRolls = null;

/**
 * Parse the "what" prompt text for duration/repetition hints and return a suggested minimum turn length in seconds.
 * Used so Phase 2/3 prompts like "repeat 10 times" or "60s then 30s" get enough turn time.
 */
function getSuggestedTurnSecondsFromPrompt(text) {
  if (!text || typeof text !== 'string') return 0;
  const t = text.replace(/^Partner\s+\d+\s*:\s*/i, '').trim();
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

/**
 * Parse the "what" prompt for timed segments (e.g. "30s eyes closed, 30s eyes open").
 * Also handles single segments with "then continue" (e.g. "for 30s match breathing, then continue").
 * Returns array of { seconds, label, completionLabel? } for step-by-step voice prompts.
 */
function parseTimedSteps(text) {
  if (!text || typeof text !== 'string') return [];
  // Strip "Partner X: " prefix if present
  const t = text.replace(/^Partner\s+\d+\s*:\s*/i, '').trim();
  const segments = [];
  
  // Check for single timed segment with "then continue" pattern
  // e.g. "for 30s match your inhales; then continue" or "Breath sync: for 30s match your inhales; then continue as you like"
  const singleWithContinue = t.match(/(?:^|:\s*)(?:for\s+)?(\d+)\s*s(?:econds?)?\s+(.+?)\s*;\s*then\s+continue/i);
  if (singleWithContinue) {
    const sec = parseInt(singleWithContinue[1], 10);
    let desc = singleWithContinue[2].trim().replace(/\s+/g, ' ');
    // Extract the main action description (before any trailing clauses)
    desc = desc.replace(/\s*while\s+.*$/i, '').trim(); // drop "while keeping the same rhythm"
    desc = desc.replace(/\s*;.*$/, '').trim(); // drop any remaining semicolon clauses
    const label = desc ? `${sec} second${sec === 1 ? '' : 's'}, ${desc}` : `${sec} second${sec === 1 ? '' : 's'}`;
    // Create a completion label for when the segment ends
    const completionLabel = desc ? `${desc} done` : `${sec} second${sec === 1 ? '' : 's'} done`;
    return [{ seconds: sec, label, completionLabel }];
  }
  
  // Multi-step: split on comma or " then " to get parts
  const parts = t.split(/\s*,\s*|\s+then\s+/i);
  for (const part of parts) {
    const m = part.match(/^\s*(?:for\s+)?(\d+)\s*s(?:econds?)?\s*(?:of\s+)?(.+)?$/i);
    if (m) {
      const sec = parseInt(m[1], 10);
      let desc = (m[2] || '').trim().replace(/\s+/g, ' ');
      desc = desc.replace(/\s*;.*$/, '').trim(); // drop "; repeat that 6 times" etc.
      const label = desc ? `${sec} second${sec === 1 ? '' : 's'}, ${desc}` : `${sec} second${sec === 1 ? '' : 's'}`;
      segments.push({ seconds: sec, label });
    }
  }
  // Return segments if we got at least 2 (multi-step)
  return segments.length >= 2 ? segments : [];
}

/** Current turn's timed steps (from parseTimedSteps). Cleared when turn ends. */
let guidedStepSegments = [];
/** Index of the last step we announced (so we only speak on transition). */
let guidedLastSpokenStepIndex = -1;

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
  clothingItems = clothingEnabled ? [...clothingList] : []; // legacy combined
  guidedClothingItemsP1 = clothingEnabled ? [...(window._guidedSetupP1Items || [])] : [];
  guidedClothingItemsP2 = clothingEnabled ? [...(window._guidedSetupP2Items || [])] : [];
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

  // Phase 3 position 20 = critical: reroll position (1–19) and double time
  if (typeof phase !== 'undefined' && phase === 3 && loc === 20) {
    loc = Math.floor(Math.random() * 19) + 1;
    extendedTime = true;
  }

  // Show the exercise
  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;

  if (extendedTime && messageBox) {
    const giverName = getPartnerName(giver);
    const receiverName = getPartnerName(receiver);
    if (typeof phase !== 'undefined' && phase === 3) {
      messageBox.textContent = `⭐ Critical roll! Extended time. ${giverName} leads`;
    } else {
      messageBox.textContent = `⭐ Critical roll! Extended time. ${giverName} → ${receiverName}`;
    }
    flashMessage('flash');
  }

  showExercise(phase, loc, actRoll, giver, receiver);

  if (extendedTime && whatOutput) {
    const locationText = phase === 3 ? 'position' : 'location';
    whatOutput.textContent += ` Spend about twice as long on this ${locationText}.`;
  }

  // Milestone-based clothing removal (only in Phase 1 & 2)
  let clothingRemoved = false;
  const receiverItems = receiver === 1 ? guidedClothingItemsP1 : guidedClothingItemsP2;
  if (clothingSystemEnabled && phase < 3 && turnsSinceLastRemoval >= clothingMilestoneInterval && receiverItems.length > 0) {
    const removedItem = removeClothingItem(receiver);
    turnsSinceLastRemoval = 0;

    if (removedItem && clothingOutput) {
      clothingRemoved = true;
      // Roll d6 to determine "how" to remove
      const howRoll = Math.floor(Math.random() * 6) + 1;
      const clothingEntry = clothingTable[howRoll];
      const giverLabel = getPartnerName(giver);
      const receiverLabel = getPartnerName(receiver);

      if (howRoll === 1) {
        // Roll 1: No change (but we already removed an item, so just show it)
        clothingOutput.textContent = `${clothingEntry.prefix} - ${clothingEntry.fullText}`;
      } else if (howRoll === 6) {
        // Roll 6: Remove 2 items
        const secondItem = removeClothingItem(receiver);
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

      // Quickie double clothing: remove a second item if enabled
      if (quickieDoubleClothing && receiverItems.length > 0) {
        const bonusItem = removeClothingItem(receiver);
        if (bonusItem) {
          clothingOutput.textContent += `, also remove ${receiverLabel}'s ${bonusItem}`;
        }
      }
    } else if (receiverItems.length === 0 && clothingOutput) {
      clothingOutput.textContent = `All of ${receiverLabel}'s clothing has been removed.`;
    }
  } else if (clothingOutput) {
    // No clothing change this turn
    if (clothingSystemEnabled && phase < 3 && receiverItems.length > 0) {
      clothingOutput.textContent = 'No clothing change this turn.';
    } else {
      clothingOutput.textContent = '';
    }
  }

  // Update clothing display
  updateClothingDisplay();

  // Display which partner's turn it is (Phase 3: "Partner X leads"; else "Partner X → Partner Y")
  if (messageBox && !extendedTime) {
    const giverName = getPartnerName(guidedCurrentPartner);
    if (typeof phase !== 'undefined' && phase === 3) {
      messageBox.textContent = `${giverName} leads`;
    } else {
      const receiver = guidedCurrentPartner === 1 ? 2 : 1;
      messageBox.textContent = `${giverName} → ${getPartnerName(receiver)}`;
    }
  }

  // Set turn duration: base time, then extend if the prompt says "X times" or "Xs / X seconds"
  guidedTurnTimeRemaining = guidedTurnSeconds;
  if (clothingRemoved && guidedClothingRemovalSeconds > 0) {
    guidedTurnTimeRemaining += guidedClothingRemovalSeconds;
    if (messageBox) {
      const currentMessage = messageBox.textContent;
      messageBox.textContent = `${currentMessage}. Extra time has been added for removing the clothing item`;
    }
  }
  const whatText = (whatOutput && whatOutput.textContent) || '';
  const suggestedFromPrompt = getSuggestedTurnSecondsFromPrompt(whatText);
  guidedStepSegments = parseTimedSteps(whatText);
  if (guidedStepSegments.length >= 2) {
    // Multi-step "how": use total of all segment durations as turn time
    const totalFromSteps = guidedStepSegments.reduce((a, s) => a + s.seconds, 0);
    const cap = 5 * 60;
    guidedTurnTimeRemaining = Math.min(totalFromSteps, cap);
  } else if (guidedStepSegments.length === 1) {
    // Single segment with "then continue": use its duration, will announce completion when it ends
    const cap = 5 * 60;
    guidedTurnTimeRemaining = Math.min(guidedStepSegments[0].seconds, cap);
  } else if (suggestedFromPrompt > 0) {
    // Single duration prompt: use the suggested time (adapts turn time to prompt)
    const cap = 5 * 60; // max 5 min extension from prompt
    guidedTurnTimeRemaining = Math.min(suggestedFromPrompt, cap);
  }
  guidedLastSpokenStepIndex = -1;

  // Double time for critical roll (extended time)
  if (extendedTime) {
    guidedTurnTimeRemaining *= 2;
    // Double each segment duration for step prompts
    if (guidedStepSegments.length >= 1) {
      guidedStepSegments = guidedStepSegments.map(s => ({
        seconds: s.seconds * 2,
        label: s.label,
        completionLabel: s.completionLabel
      }));
    }
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
      if (typeof phase !== 'undefined' && phase === 3) {
        messageBox.textContent = `⭐ Critical roll! Extended time. ${giverName} leads`;
      } else {
        messageBox.textContent = `⭐ Critical roll! Extended time. ${giverName} → ${receiverName}`;
      }
      flashMessage('flash');
    }
  }

  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;
  showExercise(phase, loc, actRoll, giver, receiver);

  if (extendedTime && whatOutput) {
    whatOutput.textContent += ' Spend about twice as long on this location.';
    // Double the remaining turn time for critical roll
    guidedTurnTimeRemaining *= 2;
  }

  if (messageBox && !extendedTime) {
    if (typeof phase !== 'undefined' && phase === 3) {
      messageBox.textContent = `${getPartnerName(giver)} leads`;
    } else {
      messageBox.textContent = `${getPartnerName(giver)} → ${getPartnerName(receiver)}`;
    }
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

  // If this turn has segments (multi-step or single with completion), speak the first step now
  if (guidedStepSegments.length >= 1 && typeof speakText === 'function') {
    guidedLastSpokenStepIndex = 0;
    const firstLabel = guidedStepSegments[0].label;
    speakText(`${firstLabel}.`, { force: true });
  }

  guidedTurnTimerId = setInterval(() => {
    if (guidedPaused) return;

    guidedTurnTimeRemaining -= 1;
    guidedPhaseTimeRemaining -= 1;

    // Handle step announcements
    if (guidedStepSegments.length >= 1 && typeof speakText === 'function') {
      const total = guidedStepSegments.reduce((a, s) => a + s.seconds, 0);
      const elapsed = total - guidedTurnTimeRemaining;
      
      if (guidedStepSegments.length === 1 && guidedStepSegments[0].completionLabel) {
        // Single segment with completion: announce when the segment ends
        const segmentDuration = guidedStepSegments[0].seconds;
        if (elapsed >= segmentDuration && guidedLastSpokenStepIndex === 0) {
          guidedLastSpokenStepIndex = 1; // Mark as completed
          const completionLabel = guidedStepSegments[0].completionLabel;
          speakText(`${completionLabel}.`, { force: true });
        }
      } else if (guidedStepSegments.length >= 2) {
        // Multi-step: announce next step when we cross into it
        let cum = 0;
        let currentStepIndex = -1;
        for (let i = 0; i < guidedStepSegments.length; i++) {
          cum += guidedStepSegments[i].seconds;
          if (elapsed <= cum) {
            currentStepIndex = i;
            break;
          }
        }
        if (currentStepIndex >= 0 && currentStepIndex > guidedLastSpokenStepIndex) {
          guidedLastSpokenStepIndex = currentStepIndex;
          const label = guidedStepSegments[currentStepIndex].label;
          speakText(`${label}.`, { force: true });
        }
      }
    }

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
  guidedStepSegments = [];
  guidedLastSpokenStepIndex = -1;

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

  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;
  const giverName = typeof getPartnerName === 'function' ? getPartnerName(giver) : `Partner ${giver}`;
  const receiverName = typeof getPartnerName === 'function' ? getPartnerName(receiver) : `Partner ${receiver}`;

  if (messageBox) {
    const nextLabel = (typeof phase !== 'undefined' && phase === 3) ? `${giverName} leads` : `${giverName} → ${receiverName}`;
    messageBox.textContent = `Take this time to finish what you're doing and switch. Next: ${nextLabel}`;
  }

  // Announce the break
  if (typeof speakText === 'function') {
    speakText('Take this time to finish what you are doing and switch.', { force: true });
  }

  // Pre-roll the next turn so we can show WHERE early (position preview)
  let loc = rollD20();
  const act = rollD20();
  let actRoll = act;
  let extendedTime = false;
  if (act === 20) {
    extendedTime = true;
    actRoll = Math.floor(Math.random() * 19) + 1;
  }
  // Phase 3 position 20 = critical: reroll position (1–19) and double time; show rerolled position in preview
  if (typeof phase !== 'undefined' && phase === 3 && loc === 20) {
    loc = Math.floor(Math.random() * 19) + 1;
    extendedTime = true;
  }
  guidedNextTurnRolls = { loc, actRoll, extendedTime };

  // Show the next WHERE in the output so they can get into position
  const phaseTable = typeof tables !== 'undefined' ? tables[phase] : null;
  if (phaseTable) {
    let nextWhere = phase === 3 && typeof getPhase3PositionText === 'function'
      ? getPhase3PositionText(loc, giver, receiver)
      : (phase === 3 ? (() => { const p = phaseTable.positions?.[loc]; return typeof p === 'string' ? p : (p && (p.penisVulva || p.vulvaVulva || p.vulvaPenis || p.penisPenis)) || ''; })() : (phaseTable.locations?.[loc] ?? ''));
    if (nextWhere && phase === 2 && typeof tailorPhase2Location === 'function') {
      nextWhere = tailorPhase2Location(nextWhere, loc, receiver);
    }
    if (nextWhere && phase === 1 && typeof tailorPhase1Location === 'function') {
      nextWhere = tailorPhase1Location(nextWhere, loc, receiver);
    }
    if (nextWhere) {
      const giverName = typeof getPartnerName === 'function' ? getPartnerName(giver) : `Partner ${giver}`;
      if (phase === 3) {
        // Phase 3: positions - giver leads
        nextWhere = `Get ready, ${giverName} leads: ${nextWhere}`;
      } else {
        // Phase 1-2: locations
        const whereLabel = 'location';
        nextWhere = `Get ready, next ${whereLabel}: ${nextWhere}`;
      }
      if (whereOutput) whereOutput.textContent = nextWhere;
      if (whatOutput) whatOutput.textContent = 'Instructions coming when the turn starts...';
      if (clothingOutput) clothingOutput.textContent = '';

      // After a few seconds, announce the next location/position so they can get ready
      setTimeout(() => {
        if (!isGuidedMode || !guidedInPause || guidedPaused || typeof speakText !== 'function') return;
        speakText(nextWhere, { force: true });
      }, 4000);
    }
  }

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
      const giverName = getPartnerName(guidedCurrentPartner);
      if (typeof phase !== 'undefined' && phase === 3) {
        if (guidedInPause) {
          currentPartnerSpan.textContent = `Break - Next: ${giverName} leads`;
          currentPartnerSpan.style.fontSize = '1.2rem';
        } else {
          currentPartnerSpan.textContent = `${giverName} leads`;
          currentPartnerSpan.style.fontSize = '1.5rem';
        }
      } else {
        const receiver = guidedCurrentPartner === 1 ? 2 : 1;
        const receiverName = getPartnerName(receiver);
        if (guidedInPause) {
          currentPartnerSpan.textContent = `Break - Next: ${giverName} → ${receiverName}`;
          currentPartnerSpan.style.fontSize = '1.2rem';
        } else {
          currentPartnerSpan.textContent = `${giverName} → ${receiverName}`;
          currentPartnerSpan.style.fontSize = '1.5rem';
        }
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
        phase3: 'Emphasize Phase 3',
        quickie: 'Quickie'
      };
      if (distLabels[guidedDistributionMode]) {
        phaseAllocationSpan.textContent = `Phase allocation: ${distLabels[guidedDistributionMode]}`;
      } else {
        const times = guidedPhaseSeconds.map(s => formatTime(s));
        phaseAllocationSpan.textContent = `Phase allocation: P1: ${times[0]}, P2: ${times[1]}, P3: ${times[2]}`;
      }
    }

    // Apply partner color theming to boxes
    if (typeof window.applyPartnerColors === 'function') window.applyPartnerColors();

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
    // Reset box colors to default cyan
    if (guidedStatus) { guidedStatus.style.borderColor = ''; guidedStatus.style.background = ''; }
    if (outputBox) { outputBox.style.borderColor = ''; outputBox.style.background = ''; }

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
