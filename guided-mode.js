'use strict';
// ----- Guided mode functions -----

/** Pre-rolled next turn (set at break start, used when break ends). Not persisted. */
let guidedNextTurnRolls = null;

/** Phase complete: awaiting check-in before advancing. guidedCompletedPhase = phase that just ended (1 or 2). */
let guidedInPhaseCheckIn = false;
let guidedCompletedPhase = 0;

/** Each phase: each partner must be receiver at least once before we can advance. */
let guidedReceiverOnceP1 = false;
let guidedReceiverOnceP2 = false;

/** Session just completed: show "Continue in free play" / "End session" instead of stopping immediately. */
let guidedSessionComplete = false;

/** Current action: "Removing clothes" window countdown (so UI and total time run continuously). */
let guidedInClothingWindow = false;
let guidedClothingWindowRemaining = 0;
let guidedClothingWindowTimerId = null;

/** Break flow countdown: 'next_turn' (2s), 'before_clothing' (10s), 'settle_in' (20s). So Current action can show switch/settle-in countdown. */
let guidedBreakPhase = 'none';
let guidedBreakCountdown = 0;
let guidedBreakTimerId = null;

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
  // Use Math.floor for first two, then assign remainder to last phase to ensure sum equals total
  guidedPhaseSeconds[0] = Math.floor(guidedTotalSeconds * (phasePercents[0] / 100));
  guidedPhaseSeconds[1] = Math.floor(guidedTotalSeconds * (phasePercents[1] / 100));
  guidedPhaseSeconds[2] = guidedTotalSeconds - guidedPhaseSeconds[0] - guidedPhaseSeconds[1]; // Ensure sum equals total

  guidedTotalTimeRemaining = guidedTotalSeconds; // Initialize total time remaining
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

  // Find first phase with allocation > 0 (skip phases with 0% allocation)
  let startPhase = 1;
  for (let i = 0; i < 3; i++) {
    if (guidedPhaseSeconds[i] > 0) {
      startPhase = i + 1;
      break;
    }
  }
  phase = startPhase;
  guidedPhaseTimeRemaining = guidedPhaseSeconds[startPhase - 1];
  rollCount = 0;
  guidedReceiverOnceP1 = false;
  guidedReceiverOnceP2 = false;
  usedWhereThisPhase = new Set();
  usedWhatThisPhase = new Set();
  awaitingPartnerTurn = false;

  // Update UI
  updateGuidedModeUI();
  updateClothingDisplay();
  notifyPhaseChange(phase);
  if (typeof updateRollLabels === 'function') updateRollLabels(phase);

  // Speak guided-mode intro once (how it works, can substitute, flow; add clothing only if enabled), then start first turn.
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const introOpenings = [
    'Guided mode: you will hear a prompt for each turn. If a prompt does not work for you, substitute something you both like. ',
    'In guided mode you will get a prompt each turn. Feel free to swap in something you both prefer. ',
    'Guided mode: each turn has a prompt. If you would rather do something else, substitute anything you both like. ',
  ];
  const introClothingLines = [
    'During the session you will hear when to remove an item of clothing and how to do it. ',
    'You will hear when to remove clothing and how. ',
    'Clothing removal prompts will tell you when and how. ',
  ];
  const introClosings = [
    'After each turn you will hear when to switch, then settle in, then the next prompt. Let us begin.',
    'Between turns you will hear when to switch, then time to settle in, then the next prompt. Let us begin.',
    'Each turn ends with a switch, then settle in, then the next prompt. Let us begin.',
  ];
  let intro = pick(introOpenings);
  if (clothingEnabled) intro += pick(introClothingLines);
  intro += pick(introClosings);
  const hasVoice = typeof speakText === 'function' && (typeof isSpeechSupported !== 'function' || isSpeechSupported());
  if (hasVoice) {
    speakText(intro, { force: true, onEnd: () => { performGuidedTurn(); } });
  } else {
    performGuidedTurn();
  }
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
    if (phase === 3) {
      // Phase 3: two d20s combine to position 1–100; one d20 for modifier
      let loc1 = rollD20();
      let loc2 = rollD20();
      loc = ((loc1 - 1) * 20 + loc2 - 1) % 156 + 1;
      while (typeof shouldRerollPhase3Position === 'function' && shouldRerollPhase3Position(loc)) {
        loc1 = rollD20();
        loc2 = rollD20();
        loc = ((loc1 - 1) * 20 + loc2 - 1) % 156 + 1;
      }
    } else {
      loc = rollD20();
      while (typeof shouldRerollLocation === 'function' && shouldRerollLocation(phase, loc)) {
        loc = rollD20();
      }
    }
    const act = rollD20();
    actRoll = act;
    extendedTime = false;
    if (act === 20 && guidedDistributionMode !== 'quickie') {
      extendedTime = true;
      actRoll = Math.floor(Math.random() * 19) + 1;
    }
    // Phase 3, vibrators not present: reroll vibrator-only modifiers (17, 18, 19)
    while (phase === 3 && typeof vibratorsPresent !== 'undefined' && !vibratorsPresent && typeof isPhase3VibratorModifier === 'function' && isPhase3VibratorModifier(actRoll)) {
      actRoll = rollD20();
      if (actRoll === 20 && guidedDistributionMode !== 'quickie') {
        extendedTime = true;
        actRoll = Math.floor(Math.random() * 19) + 1;
      }
    }
    // Phase 1: reroll action if it falls in an excluded body-part category (e.g. feet, licking)
    while (phase === 1 && typeof shouldRerollActionPhase1 === 'function' && shouldRerollActionPhase1(actRoll)) {
      actRoll = rollD20();
      if (actRoll === 20 && guidedDistributionMode !== 'quickie') {
        extendedTime = true;
        actRoll = Math.floor(Math.random() * 19) + 1;
      }
    }
  }

  // Phase 3: only the modifier (second d20) is critical. Position 20 is now "Roller's choice" in the table, no reroll.

  // Show the exercise
  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;

  // Track that this partner has been receiver at least once this phase
  if (receiver === 1) guidedReceiverOnceP1 = true;
  if (receiver === 2) guidedReceiverOnceP2 = true;

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
  if (typeof setCurrentPrompt === 'function') setCurrentPrompt(phase, loc, actRoll);
  // Ensure Phase 3 buttons (view position reference, favorites) are visible
  if (phase === 3 && typeof updateRollLabels === 'function') updateRollLabels(phase);

  if (extendedTime) {
    const locationText = phase === 3 ? 'position' : 'location';
    const ext = ` Spend about twice as long on this ${locationText}.`;
    if (whatOutput) whatOutput.textContent += ext;
    if (instructionOutput) instructionOutput.textContent += ext;
  }

  // Milestone-based clothing removal (only in Phase 1 & 2)
  let clothingRemoved = false;
  let currentRemovedItems = [];
  let currentClothingMethodText = '';
  const receiverItems = receiver === 1 ? guidedClothingItemsP1 : guidedClothingItemsP2;
  if (clothingSystemEnabled && phase < 3 && turnsSinceLastRemoval >= clothingMilestoneInterval && receiverItems.length > 0) {
    const removedItems = [];
    removedItems.push(removeClothingItem(receiver));
    turnsSinceLastRemoval = 0;

    if (removedItems[0] && clothingOutput) {
      clothingRemoved = true;
      // Roll d12 to determine "how" to remove; reroll 10 (music) if no music selected
      let howRoll = Math.floor(Math.random() * 12) + 1;
      const musicSelected = typeof window.isBackgroundMusicSelected === 'function' && window.isBackgroundMusicSelected();
      while (howRoll === 10 && !musicSelected) {
        howRoll = Math.floor(Math.random() * 12) + 1;
      }
      const clothingEntry = clothingTable[howRoll];
      currentClothingMethodText = (clothingEntry && clothingEntry.method) || '';
      currentRemovedItems = removedItems.slice();
      const giverLabel = getPartnerName(giver);
      const receiverLabel = getPartnerName(receiver);

      // Critical (12): remove a second item; same "how" applies to both
      if (howRoll === 12) {
        const secondItem = removeClothingItem(receiver);
        if (secondItem) removedItems.push(secondItem);
      }
      // Quickie double: remove one more item; same "how" applies to all
      if (quickieDoubleClothing && (receiver === 1 ? guidedClothingItemsP1 : guidedClothingItemsP2).length > 0) {
        const bonusItem = removeClothingItem(receiver);
        if (bonusItem) removedItems.push(bonusItem);
      }
      currentRemovedItems = removedItems.slice();

      const prefixWithPartner = (clothingEntry.prefix || '').replace(/\{receiver\}/g, receiverLabel);
      const methodText = clothingEntry.method ? ` ${clothingEntry.method}` : '';
      const itemsPhrase = removedItems.length === 1
        ? `${removedItems[0]}`
        : removedItems.slice(0, -1).join(', ') + ' and ' + removedItems[removedItems.length - 1];
      let text = `${giverLabel} ${prefixWithPartner} ${receiverLabel}'s ${itemsPhrase}${methodText}`;
      if (howRoll === 12 && removedItems.length === 1) text += ' (only 1 item remaining)';
      clothingOutput.textContent = text;
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

  // Clothing removal time: base, doubled if receiver has 2x items, then multiplied by item/method complexity
  let effectiveClothingSeconds = 0;
  if (clothingRemoved && guidedClothingRemovalSeconds > 0) {
    const receiverRemaining = receiver === 1 ? guidedClothingItemsP1.length : guidedClothingItemsP2.length;
    const otherRemaining = receiver === 1 ? guidedClothingItemsP2.length : guidedClothingItemsP1.length;
    let base = (receiverRemaining >= 2 * otherRemaining)
      ? 2 * guidedClothingRemovalSeconds
      : guidedClothingRemovalSeconds;
    if (typeof getClothingRemovalComplexityMultiplier === 'function') {
      base = Math.round(base * getClothingRemovalComplexityMultiplier(currentRemovedItems, currentClothingMethodText));
    }
    effectiveClothingSeconds = base;
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

  // Set turn duration: base time (double in Phase 3 if "double Phase 3 time" is on), then extend if the prompt says "X times" or "Xs / X seconds"
  const baseTurnSec = (phase === 3 && typeof phase3DoubleTime !== 'undefined' && phase3DoubleTime) ? guidedTurnSeconds * 2 : guidedTurnSeconds;
  guidedTurnTimeRemaining = baseTurnSec;
  if (clothingRemoved && effectiveClothingSeconds > 0) {
    guidedTurnTimeRemaining += effectiveClothingSeconds;
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

  // Break order: dong → 2s → "next turn" + giver/receiver → 10s → clothing (variable time) → instructions read → settle in 20s → "turn begins" → start timer.
  const clothingText = (clothingRemoved && clothingOutput && clothingOutput.textContent) ? clothingOutput.textContent.trim() : '';
  const instructionText = (instructionOutput && instructionOutput.textContent) ? instructionOutput.textContent.trim() : '';
  const AFTER_DONG_MS = 2000;
  const AFTER_NEXT_TURN_MS = 10000;
  const SETTLE_IN_PAUSE_SECONDS = 20;
  const onStartTimer = () => {
    guidedBreakPhase = 'none';
    guidedBreakCountdown = 0;
    if (guidedBreakTimerId) clearInterval(guidedBreakTimerId);
    guidedBreakTimerId = null;
    startGuidedTurnTimer();
    saveState();
  };

  const giverName = getPartnerName(giver);
  const receiverName = getPartnerName(receiver);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nextTurnPhraseOptions = [
    'That finishes that turn. Time to switch.',
    'That\'s the end of that turn. Time to switch.',
    'Turn over. Time to switch.',
    'Switch when you\'re ready.',
  ];
  const nextTurnPhrase = pick(nextTurnPhraseOptions);
  const firstTurnPhraseOptions = (typeof phase !== 'undefined' && phase === 3)
    ? [
        `First turn. ${giverName} leads, ${receiverName} follows.`,
        `Kicking off. ${giverName} leads, ${receiverName} follows.`,
        `Here we go. ${giverName} leads, ${receiverName} follows.`,
        `Starting with ${giverName} leading and ${receiverName} following.`,
      ]
    : [
        `First turn. ${giverName} is giver, ${receiverName} is receiver.`,
        `Kicking off. ${giverName} gives, ${receiverName} receives.`,
        `Here we go. ${giverName} is giver, ${receiverName} is receiver.`,
        `Starting with ${giverName} as giver and ${receiverName} as receiver.`,
      ];
  const firstTurnPhrase = pick(firstTurnPhraseOptions);
  const easeInPhraseOptions = [
    'Take the next few seconds to settle in. No rush.',
    'Settle in when you\'re ready. No rush.',
    'Use the next few seconds to get comfortable. No rush.',
    'Whenever you\'re ready. No rush.',
  ];
  const easeInPhrase = pick(easeInPhraseOptions);
  const turnBeginsOptions = [
    'Turn begins.',
    'Go.',
    'Whenever you\'re ready.',
    'Begin.',
  ];
  const turnBeginsPhrase = pick(turnBeginsOptions);

  const runAfterSettleIn = () => {
    guidedBreakPhase = 'none';
    guidedBreakCountdown = 0;
    if (guidedBreakTimerId) clearInterval(guidedBreakTimerId);
    guidedBreakTimerId = null;
    if (typeof speakText === 'function') {
      speakText(turnBeginsPhrase, { force: true, onEnd: onStartTimer });
    } else {
      onStartTimer();
    }
  };

  const runSettleIn = () => {
    if (typeof speakText === 'function') {
      speakText(easeInPhrase, { force: true, onEnd: () => {
        guidedBreakPhase = 'settle_in';
        guidedBreakCountdown = SETTLE_IN_PAUSE_SECONDS;
        if (guidedBreakTimerId) clearInterval(guidedBreakTimerId);
        guidedBreakTimerId = setInterval(() => {
          if (guidedPaused) return;
          guidedBreakCountdown -= 1;
          updateGuidedModeUI();
          if (guidedBreakCountdown <= 0) {
            clearInterval(guidedBreakTimerId);
            guidedBreakTimerId = null;
            runAfterSettleIn();
          }
        }, 1000);
      } });
    } else {
      guidedBreakPhase = 'settle_in';
      guidedBreakCountdown = SETTLE_IN_PAUSE_SECONDS;
      if (guidedBreakTimerId) clearInterval(guidedBreakTimerId);
      guidedBreakTimerId = setInterval(() => {
        guidedBreakCountdown -= 1;
        updateGuidedModeUI();
        if (guidedBreakCountdown <= 0) {
          clearInterval(guidedBreakTimerId);
          guidedBreakTimerId = null;
          runAfterSettleIn();
        }
      }, 1000);
    }
  };

  const runAfterInstructions = () => { runSettleIn(); };

  const runClothingThenInstruction = () => {
    guidedBreakPhase = 'none';
    guidedBreakCountdown = 0;
    if (clothingText) {
      const sayClothing = typeof speakText === 'function';
      const onClothingSpoken = () => {
        guidedBreakPhase = 'none';
        guidedBreakCountdown = 0;
        const clothingSec = effectiveClothingSeconds > 0 ? effectiveClothingSeconds : (typeof guidedClothingRemovalSeconds === 'number' ? guidedClothingRemovalSeconds : 30);
        guidedInClothingWindow = true;
        guidedClothingWindowRemaining = clothingSec;
        if (guidedClothingWindowTimerId) clearInterval(guidedClothingWindowTimerId);
        guidedClothingWindowTimerId = setInterval(() => {
          guidedClothingWindowRemaining -= 1;
          guidedPhaseTimeRemaining -= 1;
          guidedTotalTimeRemaining -= 1; // Decrement total time
          updateGuidedModeUI();
          if (guidedClothingWindowRemaining <= 0) {
            clearInterval(guidedClothingWindowTimerId);
            guidedClothingWindowTimerId = null;
            guidedInClothingWindow = false;
            if (instructionText && sayClothing) {
              speakText(instructionText, { force: true, onEnd: runAfterInstructions });
            } else {
              runAfterInstructions();
            }
          }
        }, 1000);
      };
      if (sayClothing) {
        speakText(clothingText, { force: true, onEnd: onClothingSpoken });
      } else {
        onClothingSpoken();
      }
    } else {
      if (instructionText && typeof speakText === 'function') {
        speakText(instructionText, { force: true, onEnd: runAfterInstructions });
      } else {
        runAfterInstructions();
      }
    }
  };

  const runAfterNextTurn = () => {
    guidedBreakPhase = 'before_clothing';
    guidedBreakCountdown = Math.floor(AFTER_NEXT_TURN_MS / 1000);
    if (guidedBreakTimerId) clearInterval(guidedBreakTimerId);
      guidedBreakTimerId = setInterval(() => {
        if (guidedPaused) return;
        guidedBreakCountdown -= 1;
        updateGuidedModeUI();
        if (guidedBreakCountdown <= 0) {
          clearInterval(guidedBreakTimerId);
          guidedBreakTimerId = null;
          runClothingThenInstruction();
        }
      }, 1000);
  };

  const runAfterDong = () => {
    if (typeof speakText === 'function') {
      speakText(nextTurnPhrase, { force: true, onEnd: runAfterNextTurn });
    } else {
      runAfterNextTurn();
    }
  };

  const startNextTurnCountdown = () => {
    guidedBreakPhase = 'next_turn';
    guidedBreakCountdown = Math.floor(AFTER_DONG_MS / 1000);
    if (guidedBreakTimerId) clearInterval(guidedBreakTimerId);
    guidedBreakTimerId = setInterval(() => {
      if (guidedPaused) return;
      guidedBreakCountdown -= 1;
      updateGuidedModeUI();
      if (guidedBreakCountdown <= 0) {
        clearInterval(guidedBreakTimerId);
        guidedBreakTimerId = null;
        runAfterDong();
      }
    }, 1000);
  };

  const hasVoice = typeof speakText === 'function' && (typeof isSpeechSupported !== 'function' || isSpeechSupported());
  const isFirstTurn = totalTurnsInSession === 1;
  if (isFirstTurn) {
    // First turn: show popup for duration of TTS (or fallback), no dong, no "That finishes that turn".
    if (typeof showFirstTurnPopup === 'function') showFirstTurnPopup(firstTurnPhrase);
    if (hasVoice) {
      speakText(firstTurnPhrase, { force: true, onEnd: () => {
        if (typeof hideFirstTurnPopup === 'function') hideFirstTurnPopup();
        runAfterNextTurn();
      } });
    } else {
      const firstTurnPopupDurationMs = 4000;
      setTimeout(() => {
        if (typeof hideFirstTurnPopup === 'function') hideFirstTurnPopup();
        runAfterNextTurn();
      }, firstTurnPopupDurationMs);
    }
  } else {
    // Dong sound removed per user request
    startNextTurnCountdown();
  }
}

/**
 * Reroll location and action for the current guided turn (same partner, same turn time).
 * Does not increment turn count or change clothing.
 */
function rerollGuidedPrompt() {
  if (!isGuidedMode || guidedPaused || guidedInPause) return;

  let loc = rollD20();
  const act = rollD20();
  let actRoll = act;
  let extendedTime = false;

  while (typeof shouldRerollLocation === 'function' && shouldRerollLocation(phase, loc)) {
    loc = rollD20();
  }
  while (phase === 3 && typeof shouldRerollPhase3Position === 'function' && shouldRerollPhase3Position(loc)) {
    loc = rollD20();
  }

  // Quickie preset: no critical rolls (no extended time)
  if (act === 20 && guidedDistributionMode !== 'quickie') {
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
  // Phase 3, vibrators not present: reroll vibrator-only modifiers (17, 18, 19)
  while (phase === 3 && typeof vibratorsPresent !== 'undefined' && !vibratorsPresent && typeof isPhase3VibratorModifier === 'function' && isPhase3VibratorModifier(actRoll)) {
    actRoll = rollD20();
    if (actRoll === 20 && guidedDistributionMode !== 'quickie') {
      extendedTime = true;
      actRoll = Math.floor(Math.random() * 19) + 1;
    }
  }
  // Phase 1: reroll action if excluded body-part category (feet, licking)
  while (phase === 1 && typeof shouldRerollActionPhase1 === 'function' && shouldRerollActionPhase1(actRoll)) {
    actRoll = rollD20();
    if (actRoll === 20 && guidedDistributionMode !== 'quickie') {
      extendedTime = true;
      actRoll = Math.floor(Math.random() * 19) + 1;
    }
  }

  const giver = guidedCurrentPartner;
  const receiver = guidedCurrentPartner === 1 ? 2 : 1;
  showExercise(phase, loc, actRoll, giver, receiver);
  if (typeof setCurrentPrompt === 'function') setCurrentPrompt(phase, loc, actRoll);
  // Ensure Phase 3 buttons (view position reference, favorites) are visible
  if (phase === 3 && typeof updateRollLabels === 'function') updateRollLabels(phase);

  if (extendedTime) {
    const ext = ' Spend about twice as long on this location.';
    if (whatOutput) whatOutput.textContent += ext;
    if (instructionOutput) instructionOutput.textContent += ext;
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
  if (guidedClothingWindowTimerId) {
    clearInterval(guidedClothingWindowTimerId);
    guidedClothingWindowTimerId = null;
    guidedInClothingWindow = false;
  }

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
    guidedTotalTimeRemaining -= 1; // Decrement total time

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

  // Dong plays at start of next turn's break flow (performGuidedTurn)

  // Switch partner
  guidedCurrentPartner = guidedCurrentPartner === 1 ? 2 : 1;

  // Check if phase time is up and both partners have been receiver at least once
  const bothReceivedThisPhase = guidedReceiverOnceP1 && guidedReceiverOnceP2;
  if (guidedPhaseTimeRemaining <= 0 && bothReceivedThisPhase) {
    if (typeof guidedPhaseCheckInEnabled !== 'undefined' && guidedPhaseCheckInEnabled) {
      startPhaseCheckIn();
    } else {
      advanceGuidedPhase();
    }
    return;
  } else {
    // Go straight to next turn's break flow (dong, "That finishes that turn. Time to switch.", etc.). No separate "You have N seconds to switch" pause.
    performGuidedTurn();
  }
}

function skipToNextTurn() {
  if (!isGuidedMode || guidedPaused || guidedInPause) return;
  
  // Deduct remaining turn time from phase time and total time before completing
  guidedPhaseTimeRemaining -= guidedTurnTimeRemaining;
  guidedTotalTimeRemaining -= guidedTurnTimeRemaining;
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

  // No preview or preroll during pause — instruction and roll happen when the turn starts
  if (whereOutput) whereOutput.textContent = '—';
  if (whatOutput) whatOutput.textContent = '—';
  if (instructionOutput) instructionOutput.textContent = '—';
  if (clothingOutput) clothingOutput.textContent = '';

  const switchSec = typeof guidedPauseSeconds === 'number' ? guidedPauseSeconds : 30;
  const switchAnnounceOptions = (typeof phase !== 'undefined' && phase === 3)
    ? [
        `${giverName} leads, ${receiverName} follows. You have ${switchSec} seconds to switch.`,
        `Next: ${giverName} leads, ${receiverName} follows. ${switchSec} seconds to switch.`,
        `Time to switch. ${giverName} leads, ${receiverName} follows. You have ${switchSec} seconds.`,
      ]
    : [
        `${giverName} is giver, ${receiverName} is receiver. You have ${switchSec} seconds to switch.`,
        `Next: ${giverName} gives, ${receiverName} receives. ${switchSec} seconds to switch.`,
        `Time to switch. ${giverName} is giver, ${receiverName} is receiver. You have ${switchSec} seconds.`,
      ];
  const switchAnnounce = switchAnnounceOptions[Math.floor(Math.random() * switchAnnounceOptions.length)];

  if (typeof speakText === 'function') {
    speakText(switchAnnounce, { force: true });
  }

  guidedTurnTimerId = setInterval(() => {
    if (guidedPaused) return;

    guidedPauseTimeRemaining -= 1;
    guidedPhaseTimeRemaining -= 1; // Pause counts against phase time
    guidedTotalTimeRemaining -= 1; // Decrement total time

    updateGuidedModeUI();
    
    // Save state every 5 seconds
    if (guidedPauseTimeRemaining % 5 === 0) {
      saveState();
    }

    if (guidedPauseTimeRemaining <= 0) {
      clearInterval(guidedTurnTimerId);
      guidedInPause = false;

      // Check if phase time ran out during pause and both partners have been receiver this phase
      const bothReceivedThisPhase = guidedReceiverOnceP1 && guidedReceiverOnceP2;
      if (guidedPhaseTimeRemaining <= 0 && bothReceivedThisPhase) {
        if (typeof guidedPhaseCheckInEnabled !== 'undefined' && guidedPhaseCheckInEnabled) {
          startPhaseCheckIn();
        } else {
          advanceGuidedPhase();
        }
      } else {
        performGuidedTurn();
      }
    }
  }, 1000);
}

function startPhaseCheckIn() {
  guidedInPhaseCheckIn = true;
  guidedCompletedPhase = phase;
  guidedPaused = true;

  const phaseNames = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3' };
  const pickPhrase = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const phaseEndedContinueOptions = [
    `${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap the button to continue to ${phaseNames[phase + 1]}.`,
    `That's the end of ${phaseNames[phase]}. Check in with each other, then tap Continue to ${phaseNames[phase + 1]}.`,
    `${phaseNames[phase]} is complete. Check in, then tap the button to continue to ${phaseNames[phase + 1]}.`,
  ];
  const phaseEndedEndSessionOptions = [
    `${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap the button to end the session.`,
    `That's the end of ${phaseNames[phase]}. Check in with each other, then tap to end the session.`,
    `${phaseNames[phase]} is complete. Check in, then tap the button to end the session.`,
  ];
  const phaseEndedContinueSpokenOptions = [
    `${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap Continue to ${phaseNames[phase + 1]}.`,
    `That's the end of ${phaseNames[phase]}. Check in, then tap Continue to ${phaseNames[phase + 1]}.`,
    `${phaseNames[phase]} is complete. Check in, then tap the button to continue to ${phaseNames[phase + 1]}.`,
  ];
  const phaseEndedEndSessionSpokenOptions = [
    `${phaseNames[phase]} has ended. Check in with each other. When you're both ready, tap the button to end the session.`,
    `That's the end of ${phaseNames[phase]}. Check in, then tap to end the session.`,
    `${phaseNames[phase]} is complete. Check in, then tap the button to end the session.`,
  ];
  const messageText = phase < maxPhase ? pickPhrase(phaseEndedContinueOptions) : pickPhrase(phaseEndedEndSessionOptions);
  const spokenText = phase < maxPhase ? pickPhrase(phaseEndedContinueSpokenOptions) : pickPhrase(phaseEndedEndSessionSpokenOptions);
  if (messageBox) messageBox.textContent = messageText;
  if (typeof speakText === 'function') speakText(spokenText, { force: true });
  updateGuidedModeUI();
  if (typeof saveState === 'function') saveState();
}

function continueAfterPhaseCheckIn() {
  if (!guidedInPhaseCheckIn) return;
  guidedInPhaseCheckIn = false;
  guidedCompletedPhase = 0;
  guidedPaused = false;
  advanceGuidedPhase();
}

function advanceGuidedPhase() {
  if (phase < maxPhase) {
    phase++;
    guidedPhaseTimeRemaining = guidedPhaseSeconds[phase - 1];
    guidedReceiverOnceP1 = false;
    guidedReceiverOnceP2 = false;
    usedWhereThisPhase = new Set();
    usedWhatThisPhase = new Set();
    rollCount = 0;

    notifyPhaseChange(phase);
    updatePhaseUI(phase, rollCount);
    if (typeof updateRollLabels === 'function') updateRollLabels(phase);
    updateGuidedModeUI();
    updateClothingDisplay();
    saveState();

    // Continue with next turn after phase change (brief pause for notification)
    setTimeout(() => {
      performGuidedTurn();
    }, 3000);
  } else {
    // Session complete: offer "Continue in free play" or "End session"
    guidedSessionComplete = true;
    guidedPaused = true;
    if (messageBox) {
      messageBox.textContent = 'Guided session complete! Check in with each other. Continue in free play or end session.';
    }
    const sessionCompletePhraseOptions = [
      'Session complete. Check in with each other.',
      'Guided session complete. Check in with each other.',
      'That\'s the end of the guided session. Check in with each other.',
      'All done. Check in with each other.',
    ];
    const sessionCompletePhrase = sessionCompletePhraseOptions[Math.floor(Math.random() * sessionCompletePhraseOptions.length)];
    speakText(sessionCompletePhrase, { force: true });
    updateGuidedModeUI();
    if (typeof saveState === 'function') saveState();
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
      guidedTotalTimeRemaining -= 1; // Decrement total time
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
  guidedSessionComplete = false;
  guidedPaused = false;
  guidedInPhaseCheckIn = false;
  guidedCompletedPhase = 0;
  guidedReceiverOnceP1 = false;
  guidedReceiverOnceP2 = false;
  guidedInClothingWindow = false;
  guidedClothingWindowRemaining = 0;
  if (guidedClothingWindowTimerId) clearInterval(guidedClothingWindowTimerId);
  guidedClothingWindowTimerId = null;
  if (guidedBreakTimerId) clearInterval(guidedBreakTimerId);
  guidedBreakTimerId = null;
  guidedBreakPhase = 'none';
  guidedBreakCountdown = 0;
  clearInterval(guidedTurnTimerId);
  clearInterval(guidedPhaseTimerId);
  stopSpeaking();
  if (typeof window.releaseWakeLock === 'function') window.releaseWakeLock();
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
  const continuePhaseBtn = document.getElementById('continueAfterPhaseCheckInBtn');

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

    // Update timer displays — use directly tracked total time for accuracy
    if (totalTimeLeftSpan) totalTimeLeftSpan.textContent = formatTime(Math.max(0, guidedTotalTimeRemaining));

    // Est. turns left per partner (cycle = turn + pause; turns per partner ≈ half of total turns in phase)
    const cycleSec = (guidedTurnSeconds || 120) + (guidedPauseSeconds || 0);
    const estTurnsTotal = cycleSec > 0 ? Math.max(0, Math.floor(guidedPhaseTimeRemaining / cycleSec)) : 0;
    const estTurnsPerPartner = Math.floor(estTurnsTotal / 2);
    if (phaseTimeLeftSpan) phaseTimeLeftSpan.textContent = estTurnsTotal > 0 ? `~${estTurnsPerPartner} each` : '0';

    // Current action (name on one line, time on the next). Include switch/settle-in countdown when in break flow.
    let actionName = guidedInPause ? 'Pause' : (guidedInClothingWindow ? 'Removing clothes' : 'Turn/touch');
    let actionTime = guidedInPause ? guidedPauseTimeRemaining : (guidedInClothingWindow ? guidedClothingWindowRemaining : guidedTurnTimeRemaining);
    if (guidedBreakPhase !== 'none') {
      const breakLabels = { next_turn: 'Time to switch', before_clothing: 'Clothing in', settle_in: 'Settle in' };
      actionName = breakLabels[guidedBreakPhase] || actionName;
      actionTime = Math.max(0, guidedBreakCountdown);
    }
    if (turnTimeLeftLabel) turnTimeLeftLabel.textContent = `Current action: ${actionName}`;
    if (turnTimeLeftSpan) {
      turnTimeLeftSpan.textContent = formatTime(actionTime);
      if (guidedBreakPhase !== 'none') turnTimeLeftSpan.style.color = '#a7f3d0';
      else if (guidedInPause) turnTimeLeftSpan.style.color = '#a7f3d0';
      else if (guidedInClothingWindow) turnTimeLeftSpan.style.color = '#fcd34d';
      else turnTimeLeftSpan.style.color = '#e5e7eb';
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

    // Ensure Phase 3 buttons (view position reference, favorites) are visible when in Phase 3
    // Hide view position reference button for Roller's choice positions (64, 127) which don't have images
    if (phase === 3) {
      const viewPositionRefBtn = document.getElementById('viewPositionRefBtn');
      const favoritePositionBtn = document.getElementById('favoritePositionBtn');
      const viewFavoritesBtn = document.getElementById('viewFavoritesBtn');
      // Check if current position is Roller's choice (64 or 127) - these don't have images
      // Access currentPrompt from state.js (it's a global variable)
      const isRollersChoice = typeof currentPrompt !== 'undefined' && currentPrompt && 
        currentPrompt.phase === 3 && (currentPrompt.locationRoll === 64 || currentPrompt.locationRoll === 127);
      if (viewPositionRefBtn) {
        viewPositionRefBtn.style.display = (isRollersChoice) ? 'none' : 'inline-block';
      }
      if (favoritePositionBtn) favoritePositionBtn.style.display = 'inline-block';
      if (viewFavoritesBtn) viewFavoritesBtn.style.display = 'inline-block';
    }

    // Control buttons visibility
    const inPhaseCheckIn = guidedInPhaseCheckIn === true;
    const sessionCompleteButtons = document.getElementById('sessionCompleteButtons');
    const stopGuidedBtn = document.getElementById('stopGuided');
    if (sessionCompleteButtons) sessionCompleteButtons.style.display = guidedSessionComplete ? 'flex' : 'none';
    if (stopGuidedBtn) stopGuidedBtn.style.display = guidedSessionComplete ? 'none' : 'inline-block';

    const phaseNames = { 1: 'Phase 2', 2: 'Phase 3', 3: 'End session' };
    if (continuePhaseBtn) {
      continuePhaseBtn.style.display = (inPhaseCheckIn && !guidedSessionComplete) ? 'inline-block' : 'none';
      if (inPhaseCheckIn && guidedCompletedPhase >= 1 && guidedCompletedPhase <= 3) {
        continuePhaseBtn.textContent = phaseNames[guidedCompletedPhase] || 'Continue';
      }
    }
    if (nextTurnBtn) {
      nextTurnBtn.style.display = (guidedInPause || guidedPaused || inPhaseCheckIn || guidedSessionComplete) ? 'none' : 'inline-block';
    }
    if (rerollPromptBtn) {
      rerollPromptBtn.style.display = (guidedInPause || guidedPaused || inPhaseCheckIn || guidedSessionComplete) ? 'none' : 'inline-block';
    }
    if (pauseBtn && resumeBtn) {
      const showResume = guidedPaused && !inPhaseCheckIn && !guidedSessionComplete;
      pauseBtn.style.display = (guidedPaused || inPhaseCheckIn || guidedSessionComplete) ? 'none' : 'inline-block';
      resumeBtn.style.display = showResume ? 'inline-block' : 'none';
    }
  } else {
    // === GUIDED MODE STOPPED - only show free play UI if user chose free play (don't overwrite guided-setup) ===
    if (continuePhaseBtn) continuePhaseBtn.style.display = 'none';
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
