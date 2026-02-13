'use strict';
// ----- Main initialization and event wiring -----

/**
 * Update all UI labels and buttons that show partner 1 / partner 2 to use custom names.
 */
function updatePartnerNameDisplays() {
  const n1 = typeof getPartnerName === 'function' ? getPartnerName(1) : 'Partner 1';
  const n2 = typeof getPartnerName === 'function' ? getPartnerName(2) : 'Partner 2';

  const startP1 = document.getElementById('startReceiverP1');
  const startP2 = document.getElementById('startReceiverP2');
  if (startP1) startP1.textContent = n1;
  if (startP2) startP2.textContent = n2;

  const guidedL1 = document.getElementById('guidedPartner1Label');
  const guidedL2 = document.getElementById('guidedPartner2Label');
  if (guidedL1) guidedL1.textContent = n1 + ' Clothing:';
  if (guidedL2) guidedL2.textContent = n2 + ' Clothing:';

  const freePlayL1 = document.getElementById('freePlayPartner1Label');
  const freePlayL2 = document.getElementById('freePlayPartner2Label');
  if (freePlayL1) freePlayL1.textContent = n1 + ' Clothing:';
  if (freePlayL2) freePlayL2.textContent = n2 + ' Clothing:';

  const listL1 = document.getElementById('freePlayPartner1ListLabel');
  const listL2 = document.getElementById('freePlayPartner2ListLabel');
  if (listL1) listL1.textContent = n1 + ':';
  if (listL2) listL2.textContent = n2 + ':';
}

window.addEventListener('DOMContentLoaded', () => {
  // Landing modal references
  const landingModal = document.getElementById('landingModal');
  const landingFreePlayBtn = document.getElementById('landingFreePlay');
  const landingGuidedBtn = document.getElementById('landingGuided');

  // Initialize DOM references
  const phaseDisplay = document.getElementById('phaseDisplay');
  const rollCountDisplay = document.getElementById('rollCountDisplay');
  whereOutput = document.getElementById('whereOutput');
  whatOutput = document.getElementById('whatOutput');
  clothingOutput = document.getElementById('clothingOutput');
  messageBox = document.getElementById('message');
  const errorBox = document.getElementById('error');

  const locationLabel = document.getElementById('locationLabel');
  const actionLabel = document.getElementById('actionLabel');
  const locationRollInput = document.getElementById('locationRoll');
  const actionRollInput = document.getElementById('actionRoll');
  const clothingRollInput = document.getElementById('clothingRoll');
  const submitRollBtn = document.getElementById('submitRoll');
  const newSessionBtn = document.getElementById('newSession');

  timerSound = document.getElementById('timerSound');
  const timer30Btn = document.getElementById('timer30');
  const timer1Btn = document.getElementById('timer1');
  const timer2Btn = document.getElementById('timer2');
  const timer5Btn = document.getElementById('timer5');
  const timerDisplay = document.getElementById('timerDisplay');

  const testSoundBtn = document.getElementById('testSound');
  const noClothingPromptsBtn = document.getElementById('noClothingPrompts');
  const rerollPromptBtn = document.getElementById("rerollPrompt");
  const goToNextPhaseBtn = document.getElementById("goToNextPhase");

  // ----- Basic UI event handlers -----

  if (testSoundBtn) {
    testSoundBtn.addEventListener('click', () => {
      if (timerSound) {
        timerSound.currentTime = 0;
        timerSound.play();
      }
    });
  }

  if (noClothingPromptsBtn) {
    noClothingPromptsBtn.addEventListener('click', () => {
      clothingPromptsEnabled = false;
      if (clothingOutput) {
        clothingOutput.textContent = 'Clothing prompts are off. Continue with touch as you are.';
      }
    });
  }

  if (goToNextPhaseBtn) {
    goToNextPhaseBtn.addEventListener('click', () => {
      clearMessages();

      if (phase < maxPhase) {
        phase++;
        rollCount = 0;
        usedWhereThisPhase = new Set();
        usedWhatThisPhase = new Set();

        notifyPhaseChange(phase);
        updatePhaseUI(phase, rollCount);
        updateRollLabels(phase);

        // Update Free Play clothing display when entering phase 3
        if (phase === 3) {
          updateFreePlayClothingDisplay();
        }

        saveState();

        if (messageBox) {
          messageBox.textContent = 'Advanced to next phase.';
          flashMessage('flash');
        }
      } else {
        if (messageBox) {
          messageBox.textContent = 'Already at the final phase.';
        }
      }
    });
  }

  // ----- Free Play event handlers -----

  if (submitRollBtn) {
    submitRollBtn.addEventListener('click', handleUserRoll);
  }

  if (rerollPromptBtn) {
    rerollPromptBtn.addEventListener("click", handleRerollPrompt);
  }

  if (locationRollInput) {
    locationRollInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') handleUserRoll();
    });
  }

  if (actionRollInput) {
    actionRollInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') handleUserRoll();
    });
  }

  if (clothingRollInput) {
    clothingRollInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') handleUserRoll();
    });
  }

  if (newSessionBtn) {
    newSessionBtn.addEventListener('click', () => {
      if (isGuidedMode && typeof stopGuidedMode === 'function') stopGuidedMode();
      else resetSession();
      if (landingModal) {
        landingModal.style.display = 'flex';
        landingModal.classList.remove('hidden');
      }
    });
  }

  // Summary overlay toggle
  const toggleSummaryBtn = document.getElementById('toggleSummary');
  const closeSummaryBtn = document.getElementById('closeSummary');
  const summaryOverlay = document.getElementById('summaryOverlay');

  if (toggleSummaryBtn && summaryOverlay) {
    toggleSummaryBtn.addEventListener('click', () => {
      if (summaryOverlay.style.display === 'none' || summaryOverlay.style.display === '') {
        summaryOverlay.style.display = 'block';
      } else {
        summaryOverlay.style.display = 'none';
      }
    });
  }

  if (closeSummaryBtn && summaryOverlay) {
    closeSummaryBtn.addEventListener('click', () => {
      summaryOverlay.style.display = 'none';
    });
  }

  // Close overlay when clicking outside the card
  if (summaryOverlay) {
    summaryOverlay.addEventListener('click', (e) => {
      if (e.target === summaryOverlay) {
        summaryOverlay.style.display = 'none';
      }
    });
  }

  // Phase summary selector
  const phaseSelect = document.getElementById('phaseSelect');
  if (phaseSelect) {
    phaseSelect.addEventListener('change', () => {
      const selectedPhase = Number(phaseSelect.value);
      renderPhaseSummary(selectedPhase);
    });

    renderPhaseSummary(Number(phaseSelect.value));
  }

  // Timer buttons
  if (timer30Btn) {
    timer30Btn.addEventListener('click', () => startTimer(30));
  }
  if (timer1Btn) {
    timer1Btn.addEventListener('click', () => startTimer(60));
  }
  if (timer2Btn) {
    timer2Btn.addEventListener('click', () => startTimer(120));
  }
  if (timer5Btn) {
    timer5Btn.addEventListener('click', () => startTimer(300));
  }

  // ----- Guided mode UI elements -----

  const freePlayModeBtn = document.getElementById('freePlayMode');
  const guidedModeBtn = document.getElementById('guidedMode');

  // Landing modal handlers
  // Track which layout to show when not in active guided session (so updateGuidedModeUI doesn't overwrite)
  window.currentUIMode = 'freeplay'; // 'freeplay' | 'guided-setup' | 'guided-active'

  // Shared function to show a specific mode
  function showMode(mode) {
    window.currentUIMode = mode;
    const guidedSetup = document.getElementById('guidedSetup');
    const guidedStatus = document.getElementById('guidedStatus');
    const freePlayControls = document.getElementById('freePlayControls');
    const actionTimerSection = document.getElementById('actionTimerSection');
    const card = document.querySelector('.card');
    
    // Ensure key elements are direct children of .card
    // (fixes potential HTML nesting issues from cached HTML)
    const rollGrid = document.querySelector('.roll-grid');
    const submitRow = document.getElementById('submitRoll')?.closest('.row');
    const phaseRow = document.getElementById('goToNextPhase')?.closest('.row');
    const statusRow = document.getElementById('newSession')?.closest('.row');
    
    const voiceToggleRow = document.getElementById('voiceToggleRow');
    const outputBox = getOutputDisplayBox();
    const messageDiv = document.getElementById('message');
    const errorDiv = document.getElementById('error');
    
    const elemsToMove = [statusRow, freePlayControls, rollGrid, submitRow, phaseRow, actionTimerSection, voiceToggleRow, outputBox, messageDiv, errorDiv];
    elemsToMove.forEach(el => {
      if (card && el && el.parentElement !== card) {
        card.appendChild(el);
      }
    });
    
    // Remove test div if present
    const testDiv = document.getElementById('freePlayTest');
    if (testDiv) testDiv.remove();
    
    if (mode === 'freeplay') {
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
      
      if (freePlayModeBtn) {
        freePlayModeBtn.classList.add('primary');
        freePlayModeBtn.classList.remove('secondary');
      }
      if (guidedModeBtn) {
        guidedModeBtn.classList.add('secondary');
        guidedModeBtn.classList.remove('primary');
      }
    } else if (mode === 'guided-setup') {
      if (guidedSetup) {
        guidedSetup.style.display = 'block';
        
        // Make sure Start Guided Session button is directly inside guidedSetup, not inside a collapsible section
        const startBtn = document.getElementById('startGuided');
        if (startBtn) {
          let startBtnContainer = startBtn.closest('div[style*="margin-top"]') || startBtn.parentElement;
          if (startBtnContainer && startBtnContainer.parentElement !== guidedSetup) {
            guidedSetup.appendChild(startBtnContainer);
          }
        }
        
        setTimeout(() => {
          const firstHeader = guidedSetup.querySelector('.collapsible-header');
          if (firstHeader && !firstHeader.classList.contains('active')) {
            firstHeader.click();
          }
        }, 100);
      }
      if (guidedStatus) guidedStatus.style.display = 'none';
      if (freePlayControls) freePlayControls.style.display = 'none';
      if (actionTimerSection) actionTimerSection.style.display = 'none';
      // Hide roll inputs, submit/phase buttons, and output in guided setup
      if (rollGrid) rollGrid.style.display = 'none';
      if (submitRow) submitRow.style.display = 'none';
      if (phaseRow) phaseRow.style.display = 'none';
      if (voiceToggleRow) voiceToggleRow.style.display = 'none';
      if (outputBox) outputBox.style.display = 'none';
      
      if (guidedModeBtn) {
        guidedModeBtn.classList.add('primary');
        guidedModeBtn.classList.remove('secondary');
      }
      if (freePlayModeBtn) {
        freePlayModeBtn.classList.add('secondary');
        freePlayModeBtn.classList.remove('primary');
      }
    } else if (mode === 'guided-active') {
      // Guided mode is actively running - show status panel + output displays
      if (guidedSetup) guidedSetup.style.display = 'none';
      if (guidedStatus) guidedStatus.style.display = 'flex';
      if (freePlayControls) freePlayControls.style.display = 'none';
      if (actionTimerSection) actionTimerSection.style.display = 'none';
      // Hide free-play-only elements
      if (rollGrid) rollGrid.style.display = 'none';
      if (submitRow) submitRow.style.display = 'none';
      if (phaseRow) phaseRow.style.display = 'none';
      // Show the output box so guided mode turns display where/what/clothing
      if (voiceToggleRow) voiceToggleRow.style.display = '';
      if (outputBox) outputBox.style.display = 'block';
      if (messageDiv) messageDiv.style.display = 'block';
      if (errorDiv) errorDiv.style.display = 'block';
      
      if (guidedModeBtn) {
        guidedModeBtn.classList.add('primary');
        guidedModeBtn.classList.remove('secondary');
      }
      if (freePlayModeBtn) {
        freePlayModeBtn.classList.add('secondary');
        freePlayModeBtn.classList.remove('primary');
      }
    }
  }
  

  if (landingFreePlayBtn) {
    landingFreePlayBtn.addEventListener('click', () => {
      if (landingModal) landingModal.style.display = 'none';
      showMode('freeplay');
    });
  }

  if (landingGuidedBtn) {
    landingGuidedBtn.addEventListener('click', () => {
      if (landingModal) landingModal.style.display = 'none';
      showMode('guided-setup');
    });
  }
  const time15Btn = document.getElementById('time15');
  const time30Btn = document.getElementById('time30');
  const time45Btn = document.getElementById('time45');
  const time60Btn = document.getElementById('time60');
  const time90Btn = document.getElementById('time90');
  const time120Btn = document.getElementById('time120');
  const turn1Btn = document.getElementById('turn1');
  const turn2Btn = document.getElementById('turn2');
  const turn3Btn = document.getElementById('turn3');
  const turn5Btn = document.getElementById('turn5');
  const pause0Btn = document.getElementById('pause0');
  const pause30Btn = document.getElementById('pause30');
  const pause60Btn = document.getElementById('pause60');
  const pause90Btn = document.getElementById('pause90');
  const pause120Btn = document.getElementById('pause120');
  const clothingTime0Btn = document.getElementById('clothingTime0');
  const clothingTime30Btn = document.getElementById('clothingTime30');
  const clothingTime60Btn = document.getElementById('clothingTime60');
  const clothingTime90Btn = document.getElementById('clothingTime90');
  const phaseDistEqualBtn = document.getElementById('phaseDistEqual');
  const phaseDistPhase1Btn = document.getElementById('phaseDistPhase1');
  const phaseDistPhase2Btn = document.getElementById('phaseDistPhase2');
  const phaseDistPhase3Btn = document.getElementById('phaseDistPhase3');
  const phaseDistCustomBtn = document.getElementById('phaseDistCustom');
  const customPhaseInputs = document.getElementById('customPhaseInputs');
  const phase1PercentInput = document.getElementById('phase1Percent');
  const phase2PercentInput = document.getElementById('phase2Percent');
  const phase3PercentInput = document.getElementById('phase3Percent');
  const percentError = document.getElementById('percentError');
  // Custom preset buttons are wired dynamically below
  const clothingEnabledBtn = document.getElementById('clothingEnabled');
  const clothingDisabledBtn = document.getElementById('clothingDisabled');
  const clothingSetupInputs = document.getElementById('clothingSetupInputs');
  const clothingMilestoneInput = document.getElementById('clothingMilestone');
  // Guided preset buttons are wired dynamically below
  const startGuidedBtn = document.getElementById('startGuided');
  const nextTurnGuidedBtn = document.getElementById('nextTurnGuided');
  const rerollGuidedPromptBtn = document.getElementById('rerollGuidedPrompt');
  const pauseGuidedBtn = document.getElementById('pauseGuided');
  const resumeGuidedBtn = document.getElementById('resumeGuided');
  const stopGuidedBtn = document.getElementById('stopGuided');

  // Collapsible sections handler
  function setupCollapsibleSections() {
    const headers = document.querySelectorAll('.collapsible-header');
    
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const isActive = header.classList.contains('active');
        const content = header.nextElementSibling;
        
        // Close all sections
        headers.forEach(h => {
          h.classList.remove('active');
          const c = h.nextElementSibling;
          if (c) c.classList.remove('open');
        });
        
        // Open clicked section if it wasn't active
        if (!isActive) {
          header.classList.add('active');
          if (content) content.classList.add('open');
          // On mobile, voices often load late — refresh voice dropdowns when Preferences is opened
          if (header.getAttribute('data-section') === 'preferences' && typeof populateVoiceSelect === 'function') {
            document.querySelectorAll('.voice-select').forEach(el => populateVoiceSelect(el));
            if (typeof syncVoiceSelects === 'function') syncVoiceSelects();
          }
        }
      });
    });
  }

  function updateSelectionDisplay(sectionId, text, autoAdvance = false) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.textContent = text;
      // Mark section as completed
      const header = element.closest('.collapsible-header');
      if (header) {
        header.classList.add('completed');
        
        // Auto-advance to next section after short delay
        if (autoAdvance) {
          setTimeout(() => {
            const currentSection = header.closest('.collapsible-section');
            let nextSection = currentSection?.nextElementSibling;
            
            // Skip hidden sections
            while (nextSection && nextSection.classList.contains('collapsible-section')) {
              if (nextSection.style.display === 'none') {
                nextSection = nextSection.nextElementSibling;
              } else {
                break;
              }
            }
            
            if (nextSection && nextSection.classList.contains('collapsible-section')) {
              const nextHeader = nextSection.querySelector('.collapsible-header');
              if (nextHeader) {
                nextHeader.click();
              }
            }
          }, 300);
        }
      }
    }
  }

  // Mode toggle
  if (freePlayModeBtn) {
    freePlayModeBtn.addEventListener('click', () => {
      if (isGuidedMode) {
        stopGuidedMode();
      }
      showMode('freeplay');
    });
  }

  if (guidedModeBtn) {
    guidedModeBtn.addEventListener('click', () => {
      if (!isGuidedMode) {
        showMode('guided-setup');
      }
    });
  }

  // ----- Guided Mode settings state -----
  let selectedTime = 30;
  let selectedTurnTime = 2;
  let selectedPauseTime = 30;
  let selectedClothingRemovalTime = 30;
  let phaseDistributionMode = 'equal';

  // ----- Generic button group helper -----
  // Highlights the active button in a group and dims the rest
  function updateButtonGroup(buttons, values, activeValue) {
    buttons.forEach((btn, idx) => {
      if (!btn) return;
      const isActive = values[idx] === activeValue;
      btn.classList.toggle('primary', isActive);
      btn.classList.toggle('secondary', !isActive);
    });
  }

  // Wire a group of buttons: clicking one sets the value and updates display
  function wireButtonGroup(buttons, values, onSelect) {
    buttons.forEach((btn, idx) => {
      if (btn) btn.addEventListener('click', () => onSelect(values[idx]));
    });
  }

  // ----- Button style updaters (using generic helper) -----
  const timeButtons = [time15Btn, time30Btn, time45Btn, time60Btn, time90Btn, time120Btn];
  const timeValues = [15, 30, 45, 60, 90, 120];
  function updateTimeButtonStyles() { updateButtonGroup(timeButtons, timeValues, selectedTime); }

  const turnButtons = [turn1Btn, turn2Btn, turn3Btn, turn5Btn];
  const turnValues = [1, 2, 3, 5];
  function updateTurnButtonStyles() { updateButtonGroup(turnButtons, turnValues, selectedTurnTime); }

  const phaseDistButtons = [phaseDistEqualBtn, phaseDistPhase1Btn, phaseDistPhase2Btn, phaseDistPhase3Btn, phaseDistCustomBtn];
  const phaseDistValues = ['equal', 'phase1', 'phase2', 'phase3', 'custom'];
  function updatePhaseDistButtons() { updateButtonGroup(phaseDistButtons, phaseDistValues, phaseDistributionMode); }

  // Wire session time buttons
  wireButtonGroup(timeButtons, timeValues, (val) => {
    selectedTime = val;
    updateTimeButtonStyles();
    updateSelectionDisplay('sessionTimeSelection', `${val} minutes`, true);
  });

  // Wire turn time buttons
  wireButtonGroup(turnButtons, turnValues, (val) => {
    selectedTurnTime = val;
    updateTurnButtonStyles();
    updateSelectionDisplay('turnTimeSelection', `${val} minute${val === 1 ? '' : 's'}`, true);
  });

  const pauseButtons = [pause0Btn, pause30Btn, pause60Btn, pause90Btn, pause120Btn];
  const pauseValues = [0, 30, 60, 90, 120];
  const pauseLabels = ['None', '30 seconds', '1 minute', '1.5 minutes', '2 minutes'];
  function updatePauseButtonStyles() { updateButtonGroup(pauseButtons, pauseValues, selectedPauseTime); }

  // Wire pause time buttons
  wireButtonGroup(pauseButtons, pauseValues, (val) => {
    selectedPauseTime = val;
    updatePauseButtonStyles();
    const label = pauseLabels[pauseValues.indexOf(val)];
    updateSelectionDisplay('pauseTimeSelection', label, true);
  });

  const clothingTimeButtons = [clothingTime0Btn, clothingTime30Btn, clothingTime60Btn, clothingTime90Btn];
  const clothingTimeValues = [0, 30, 60, 90];
  const clothingTimeLabels = ['None', '30 seconds', '1 minute', '1.5 minutes'];
  function updateClothingTimeButtonStyles() { updateButtonGroup(clothingTimeButtons, clothingTimeValues, selectedClothingRemovalTime); }

  // Wire clothing removal time buttons
  wireButtonGroup(clothingTimeButtons, clothingTimeValues, (val) => {
    selectedClothingRemovalTime = val;
    updateClothingTimeButtonStyles();
    const label = clothingTimeLabels[clothingTimeValues.indexOf(val)];
    updateSelectionDisplay('clothingExtraTimeSelection', label, true);
  });

  // Clothing milestone input
  if (clothingMilestoneInput) {
    clothingMilestoneInput.addEventListener('input', () => {
      const value = parseInt(clothingMilestoneInput.value) || 3;
      const plural = value === 1 ? 'turn' : 'turns';
      updateSelectionDisplay('clothingIntervalSelection', `Every ${value} ${plural}`, false);
    });
  }

  // Phase distribution mode buttons
  const phaseDistLabels = [
    'Equal (33/33/34%)',
    'Sensate-Focused (50/30/20%)',
    'A Little Spicy (30/40/30%)',
    'Intimacy-Focused (20/30/50%)',
    'Custom percentages'
  ];

  wireButtonGroup(phaseDistButtons, phaseDistValues, (val) => {
    phaseDistributionMode = val;
    updatePhaseDistButtons();
    const label = phaseDistLabels[phaseDistValues.indexOf(val)];
    const isCustom = val === 'custom';
    updateSelectionDisplay('phaseDistSelection', label, !isCustom);
    if (customPhaseInputs) customPhaseInputs.style.display = isCustom ? 'block' : 'none';
    if (!isCustom && percentError) percentError.style.display = 'none';
  });

  // Guided Mode Clothing system buttons
  let clothingMode = 'disabled';

  function updateClothingModeButtons() {
    if (clothingEnabledBtn && clothingDisabledBtn) {
      if (clothingMode === 'enabled') {
        clothingEnabledBtn.classList.add('primary');
        clothingEnabledBtn.classList.remove('secondary');
        clothingDisabledBtn.classList.add('secondary');
        clothingDisabledBtn.classList.remove('primary');
      } else {
        clothingEnabledBtn.classList.add('secondary');
        clothingEnabledBtn.classList.remove('primary');
        clothingDisabledBtn.classList.add('primary');
        clothingDisabledBtn.classList.remove('secondary');
      }
    }
  }

  if (clothingEnabledBtn) {
    clothingEnabledBtn.addEventListener('click', () => {
      clothingMode = 'enabled';
      updateClothingModeButtons();
      updateSelectionDisplay('clothingSelection', 'Enabled - Configure below', false);
      if (clothingSetupInputs) clothingSetupInputs.style.display = 'block';
      
      // Show clothing interval and extra time sections
      const intervalSection = document.querySelector('[data-section="clothingInterval"]')?.closest('.collapsible-section');
      const extraTimeSection = document.querySelector('[data-section="clothingExtraTime"]')?.closest('.collapsible-section');
      if (intervalSection) intervalSection.style.display = 'block';
      if (extraTimeSection) extraTimeSection.style.display = 'block';
    });
  }

  if (clothingDisabledBtn) {
    clothingDisabledBtn.addEventListener('click', () => {
      clothingMode = 'disabled';
      updateClothingModeButtons();
      updateSelectionDisplay('clothingSelection', 'Disabled', false);
      if (clothingSetupInputs) clothingSetupInputs.style.display = 'none';
      
      // Hide clothing interval and extra time sections
      const intervalSection = document.querySelector('[data-section="clothingInterval"]')?.closest('.collapsible-section');
      const extraTimeSection = document.querySelector('[data-section="clothingExtraTime"]')?.closest('.collapsible-section');
      if (intervalSection) intervalSection.style.display = 'none';
      if (extraTimeSection) extraTimeSection.style.display = 'none';
    });
  }

  // Guided Mode Clothing preset buttons - wire both partners via data
  const presetNames = ['Casual', 'DressCasual', 'Lingerie', 'LingerieLace', 'LingerieClassic', 'Minimal', 'FullOutfit', 'DateNight', 'LoungeWear', 'Athletic', 'Cozy', 'Layered'];
  const presetKeys = ['casual', 'dressCasual', 'lingerie', 'lingerieLace', 'lingerieClassic', 'minimal', 'fullOutfit', 'dateNight', 'loungeWear', 'athletic', 'cozy', 'layered'];

  [1, 2].forEach(partner => {
    presetNames.forEach((name, idx) => {
      const btn = document.getElementById(`guidedP${partner}Preset${name}`);
      if (btn) {
        btn.addEventListener('click', () => {
          populateGuidedClothingCheckboxes(partner, clothingPresets[presetKeys[idx]]);
        });
      }
    });
  });

  // Initialize Guided Mode clothing checkboxes
  updateClothingModeButtons();
  populateGuidedClothingCheckboxes(1);
  populateGuidedClothingCheckboxes(2);

  // Clear All buttons for Guided Mode clothing (uses shared helper from clothing.js)
  [1, 2].forEach(partner => {
    const btn = document.getElementById(`guidedP${partner}ClearAll`);
    if (btn) {
      btn.addEventListener('click', () => {
        clearClothingSelections(`guidedClothingCheckboxContainerP${partner}`);
      });
    }
  });

  // Preset buttons for custom phase distribution
  const customPresets = [
    { id: 'preset20-20-60', values: [20, 20, 60] },
    { id: 'preset25-25-50', values: [25, 25, 50] },
    { id: 'preset30-30-40', values: [30, 30, 40] }
  ];
  customPresets.forEach(({ id, values }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        if (phase1PercentInput) phase1PercentInput.value = String(values[0]);
        if (phase2PercentInput) phase2PercentInput.value = String(values[1]);
        if (phase3PercentInput) phase3PercentInput.value = String(values[2]);
        if (percentError) percentError.style.display = 'none';
      });
    }
  });

  // Start guided mode
  const presetPhasePercents = {
    equal: [33, 33, 34],
    phase1: [50, 25, 25],
    phase2: [25, 50, 25],
    phase3: [20, 20, 60]
  };

  if (startGuidedBtn) {
    startGuidedBtn.addEventListener('click', () => {
      let phasePercents = presetPhasePercents[phaseDistributionMode];

      if (!phasePercents) {
        // Custom distribution - validate first
        const p1 = parseInt(phase1PercentInput.value) || 0;
        const p2 = parseInt(phase2PercentInput.value) || 0;
        const p3 = parseInt(phase3PercentInput.value) || 0;
        const total = p1 + p2 + p3;

        if (total !== 100) {
          if (percentError) {
            percentError.style.display = 'block';
            percentError.textContent = `Total is ${total}%. Must equal 100%.`;
          }
          return;
        }

        phasePercents = [p1, p2, p3];
        if (percentError) percentError.style.display = 'none';
      }

      // Get selected clothing items from checkboxes for both partners
      const clothingEnabled = clothingMode === 'enabled';
      let clothingList = [];
      let milestoneInterval = 3;

      if (clothingEnabled) {
        const p1Items = getGuidedSelectedClothingItems(1);
        const p2Items = getGuidedSelectedClothingItems(2);
        clothingList = [...p1Items, ...p2Items];

        if (clothingMilestoneInput) {
          milestoneInterval = parseInt(clothingMilestoneInput.value) || 3;
        }
      }

      // Switch to guided-active mode (shows status + output, hides setup + roll inputs)
      showMode('guided-active');
      startGuidedMode(selectedTime, selectedTurnTime, selectedPauseTime, selectedClothingRemovalTime, phasePercents, clothingList, milestoneInterval, clothingEnabled, phaseDistributionMode);
    });
  }

  // Guided mode control buttons
  if (nextTurnGuidedBtn) nextTurnGuidedBtn.addEventListener('click', skipToNextTurn);
  if (rerollGuidedPromptBtn && typeof rerollGuidedPrompt === 'function') {
    rerollGuidedPromptBtn.addEventListener('click', rerollGuidedPrompt);
  }
  if (pauseGuidedBtn) pauseGuidedBtn.addEventListener('click', pauseGuidedMode);
  if (resumeGuidedBtn) resumeGuidedBtn.addEventListener('click', resumeGuidedMode);
  if (stopGuidedBtn) stopGuidedBtn.addEventListener('click', () => {
    stopGuidedMode();
    // Set layout to guided-setup so when modal is dismissed (Guided or Free Play), correct view shows
    showMode('guided-setup');
    if (landingModal) {
      landingModal.style.display = 'flex';
      landingModal.classList.remove('hidden');
    }
  });

  // ----- Free Play clothing event listeners -----

  const freePlayClothingEnabledBtn = document.getElementById('freePlayClothingEnabled');
  const freePlayClothingDisabledBtn = document.getElementById('freePlayClothingDisabled');
  const startReceiverP1Btn = document.getElementById('startReceiverP1');
  const startReceiverP2Btn = document.getElementById('startReceiverP2');

  // Free Play preset buttons are wired dynamically below

  // Free Play clothing enabled/disabled toggle
  let freePlayClothingMode = 'disabled';

  function updateFreePlayClothingModeButtons() {
    const setupInputs = document.getElementById('freePlayClothingSetupInputs');

    if (freePlayClothingEnabledBtn && freePlayClothingDisabledBtn) {
      if (freePlayClothingMode === 'enabled') {
        freePlayClothingEnabledBtn.classList.add('primary');
        freePlayClothingEnabledBtn.classList.remove('secondary');
        freePlayClothingDisabledBtn.classList.add('secondary');
        freePlayClothingDisabledBtn.classList.remove('primary');
        if (setupInputs) setupInputs.style.display = 'block';
      } else {
        freePlayClothingEnabledBtn.classList.add('secondary');
        freePlayClothingEnabledBtn.classList.remove('primary');
        freePlayClothingDisabledBtn.classList.add('primary');
        freePlayClothingDisabledBtn.classList.remove('secondary');
        if (setupInputs) setupInputs.style.display = 'none';
      }
    }
  }

  function updateReceiverButtons() {
    if (startReceiverP1Btn && startReceiverP2Btn) {
      if (freePlayCurrentReceiver === 1) {
        startReceiverP1Btn.classList.add('primary');
        startReceiverP1Btn.classList.remove('secondary');
        startReceiverP2Btn.classList.add('secondary');
        startReceiverP2Btn.classList.remove('primary');
      } else {
        startReceiverP1Btn.classList.add('secondary');
        startReceiverP1Btn.classList.remove('primary');
        startReceiverP2Btn.classList.add('primary');
        startReceiverP2Btn.classList.remove('secondary');
      }
    }
    updateFreePlayReceiverColors();
  }

  function updateFreePlayReceiverColors() {
    const controls = document.getElementById('freePlayControls');
    const p1Box = document.getElementById('freePlayP1ClothingBox');
    const p2Box = document.getElementById('freePlayP2ClothingBox');
    if (controls) {
      controls.classList.remove('receiver-p1', 'receiver-p2');
      controls.classList.add(freePlayCurrentReceiver === 1 ? 'receiver-p1' : 'receiver-p2');
    }
    if (p1Box) {
      if (freePlayCurrentReceiver === 1) {
        p1Box.style.borderColor = '#60a5fa';
        p1Box.style.background = 'rgba(59, 130, 246, 0.15)';
        p1Box.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.35)';
        p1Box.style.opacity = '1';
      } else {
        p1Box.style.borderColor = '#3b82f6';
        p1Box.style.background = 'rgba(59, 130, 246, 0.08)';
        p1Box.style.boxShadow = 'none';
        p1Box.style.opacity = '0.7';
      }
    }
    if (p2Box) {
      if (freePlayCurrentReceiver === 2) {
        p2Box.style.borderColor = '#f472b6';
        p2Box.style.background = 'rgba(236, 72, 153, 0.15)';
        p2Box.style.boxShadow = '0 0 12px rgba(236, 72, 153, 0.35)';
        p2Box.style.opacity = '1';
      } else {
        p2Box.style.borderColor = '#ec4899';
        p2Box.style.background = 'rgba(236, 72, 153, 0.08)';
        p2Box.style.boxShadow = 'none';
        p2Box.style.opacity = '0.7';
      }
    }
  }

  window.updateReceiverButtons = updateReceiverButtons;

  if (freePlayClothingEnabledBtn) {
    freePlayClothingEnabledBtn.addEventListener('click', () => {
      freePlayClothingMode = 'enabled';
      freePlayClothingEnabled = true;
      updateFreePlayClothingModeButtons();
      saveState();
    });
  }

  if (freePlayClothingDisabledBtn) {
    freePlayClothingDisabledBtn.addEventListener('click', () => {
      freePlayClothingMode = 'disabled';
      freePlayClothingEnabled = false;
      updateFreePlayClothingModeButtons();
      saveState();
    });
  }

  // Receiver selector buttons
  if (startReceiverP1Btn) {
    startReceiverP1Btn.addEventListener('click', () => {
      freePlayCurrentReceiver = 1;
      updateReceiverButtons();
      saveState();
    });
  }

  if (startReceiverP2Btn) {
    startReceiverP2Btn.addEventListener('click', () => {
      freePlayCurrentReceiver = 2;
      updateReceiverButtons();
      saveState();
    });
  }

  // Free Play Clothing preset buttons - wire both partners via data
  [1, 2].forEach(partner => {
    presetNames.forEach((name, idx) => {
      const btn = document.getElementById(`freePlayP${partner}Preset${name}`);
      if (btn) {
        btn.addEventListener('click', () => {
          populateFreePlayClothingCheckboxes(partner, clothingPresets[presetKeys[idx]]);
        });
      }
    });

    // Clear All buttons
    const clearBtn = document.getElementById(`freePlayP${partner}ClearAll`);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearClothingSelections(`freePlayClothingCheckboxContainerP${partner}`);
      });
    }
  });

  // Initialize Free Play clothing checkboxes and mode
  updateFreePlayClothingModeButtons();
  updateReceiverButtons();
  populateFreePlayClothingCheckboxes(1);
  populateFreePlayClothingCheckboxes(2);

  // Initialize mode buttons - everything hidden until landing modal choice
  // (landing modal or saved state will show the right mode)

  // Initialize button styles
  updateTimeButtonStyles();
  updateTurnButtonStyles();
  updatePauseButtonStyles();
  updateClothingTimeButtonStyles();
  updatePhaseDistButtons();
  
  // Initialize collapsible sections
  setupCollapsibleSections();
  
  // Set initial selection displays
  updateSelectionDisplay('sessionTimeSelection', '30 minutes');
  updateSelectionDisplay('turnTimeSelection', '2 minutes');
  updateSelectionDisplay('pauseTimeSelection', '30 seconds');
  updateSelectionDisplay('phaseDistSelection', 'Equal (33/33/34%)');
  updateSelectionDisplay('clothingSelection', 'Disabled');
  updateSelectionDisplay('clothingIntervalSelection', 'Every 3 turns');
  updateSelectionDisplay('clothingExtraTimeSelection', '30 seconds');
  
  // Update clothing mode buttons to reflect disabled default
  updateClothingModeButtons();
  
  // Hide clothing interval and extra time sections initially (until clothing is enabled)
  const intervalSection = document.querySelector('[data-section="clothingInterval"]')?.closest('.collapsible-section');
  const extraTimeSection = document.querySelector('[data-section="clothingExtraTime"]')?.closest('.collapsible-section');
  if (intervalSection) intervalSection.style.display = 'none';
  if (extraTimeSection) extraTimeSection.style.display = 'none';

  // ----- Initialize UI on load -----

  // Try to load saved state
  const stateLoaded = loadState();
  
  if (stateLoaded) {
    // Hide landing modal - we have a real session to restore
    if (landingModal) landingModal.style.display = 'none';
    
    notifyPhaseChange(phase);
    updatePhaseUI(phase, rollCount);
    
    if (isGuidedMode) {
      // Guided mode was running - updateGuidedModeUI handles ALL display
      updateGuidedModeUI();
      updateClothingDisplay();
      
      // Restore last prompt (Where/What) if we have it
      if (currentPrompt && typeof showExercise === 'function' && whereOutput && whatOutput) {
        const giver = guidedCurrentPartner;
        const receiver = guidedCurrentPartner === 1 ? 2 : 1;
        showExercise(currentPrompt.phase, currentPrompt.locationRoll, currentPrompt.actionRoll, giver, receiver);
      }
      
      if (messageBox) {
        messageBox.textContent = '⏸️ Session restored and paused. Click Resume to continue.';
      }
      
      showToast('✓ Guided Mode session restored and auto-paused');
    } else {
      // Free play mode
      showMode('freeplay');
      
      updateReceiverButtons();
      updateFreePlayClothingDisplay();
      
      if (whereOutput) whereOutput.textContent = '—';
      if (whatOutput) whatOutput.textContent = 'Session restored. Enter rolls to continue.';
      
      showToast('✓ Free Play session restored');
    }
  } else {
    // No saved state (or only default state) - show launch modal
    if (landingModal) {
      landingModal.style.display = 'flex';
      landingModal.classList.remove('hidden');
    }
    
    updatePhaseUI(phase, rollCount);
    updateTimerDisplay();
    notifyPhaseChange(phase);
    
    if (whereOutput) whereOutput.textContent = '—';
    if (whatOutput) whatOutput.textContent = 'Enter both d20 rolls (and optional d6) to get your first prompt.';
  }
  
  updateRollLabels(phase);

  // Partner names: restore into inputs and update all labels
  const partnerName1Input = document.getElementById('partnerName1');
  const partnerName2Input = document.getElementById('partnerName2');
  if (partnerName1Input) {
    partnerName1Input.value = partnerName1 || '';
    partnerName1Input.addEventListener('blur', () => {
      partnerName1 = (partnerName1Input.value || '').trim();
      saveState();
      updatePartnerNameDisplays();
      if (typeof updateGuidedModeUI === 'function' && isGuidedMode) updateGuidedModeUI();
    });
  }
  if (partnerName2Input) {
    partnerName2Input.value = partnerName2 || '';
    partnerName2Input.addEventListener('blur', () => {
      partnerName2 = (partnerName2Input.value || '').trim();
      saveState();
      updatePartnerNameDisplays();
      if (typeof updateGuidedModeUI === 'function' && isGuidedMode) updateGuidedModeUI();
    });
  }
  updatePartnerNameDisplays();

  // Wire up voice toggle buttons
  document.querySelectorAll('.voice-toggle-btn').forEach(btn => {
    btn.addEventListener('click', toggleVoice);
  });

  // Voice selector: populate all voice dropdowns and save choice when any changes
  document.querySelectorAll('.voice-select').forEach(sel => {
    if (typeof populateVoiceSelect === 'function') populateVoiceSelect(sel);
    sel.addEventListener('change', () => {
      if (typeof setSelectedVoice === 'function') setSelectedVoice(sel.value || '');
    });
  });

  // Background image: none or one of two; fades into phase colors
  const bgImageSelect = document.getElementById('backgroundImageSelect');
  function applyBackgroundImage(value) {
    document.body.classList.remove('bg-image-1', 'bg-image-2');
    if (value === '1') document.body.classList.add('bg-image-1');
    else if (value === '2') document.body.classList.add('bg-image-2');
  }
  const savedBgImage = localStorage.getItem('backgroundImage') || 'none';
  if (bgImageSelect) {
    bgImageSelect.value = savedBgImage;
    applyBackgroundImage(savedBgImage);
    bgImageSelect.addEventListener('change', () => {
      const v = bgImageSelect.value || 'none';
      localStorage.setItem('backgroundImage', v);
      applyBackgroundImage(v);
    });
  }

  // Background music: track (none or 1–4) and volume; ducked when voice reads (see speech.js)
  window.backgroundMusicElement = null;
  window.backgroundMusicVolume = 0.5;
  const bgMusicSelect = document.getElementById('backgroundMusicSelect');
  const bgMusicVolumeSlider = document.getElementById('backgroundMusicVolume');
  const bgMusicVolumeLabel = document.getElementById('backgroundMusicVolumeLabel');
  const bgMusicTracks = [null, document.getElementById('bgMusic1'), document.getElementById('bgMusic2'), document.getElementById('bgMusic3'), document.getElementById('bgMusic4')];

  function applyBackgroundMusicVolume(vol01) {
    window.backgroundMusicVolume = vol01;
    bgMusicTracks.forEach((el, i) => { if (i > 0 && el) el.volume = vol01; });
  }

  function applyBackgroundMusicTrack(trackId) {
    bgMusicTracks.forEach((el, i) => { if (i > 0 && el) { el.pause(); el.currentTime = 0; } });
    window.backgroundMusicElement = null;
    if (trackId && trackId !== 'none') {
      const n = parseInt(trackId, 10);
      const el = bgMusicTracks[n];
      if (el) {
        el.loop = true;
        el.volume = window.backgroundMusicVolume;
        el.play().catch(() => {});
        window.backgroundMusicElement = el;
      }
    }
  }

  const savedTrack = localStorage.getItem('backgroundMusicTrack') || 'none';
  const savedVol = Math.min(100, Math.max(0, parseInt(localStorage.getItem('backgroundMusicVolume'), 10) || 50));
  if (bgMusicSelect) bgMusicSelect.value = savedTrack;
  if (bgMusicVolumeSlider) bgMusicVolumeSlider.value = String(savedVol);
  if (bgMusicVolumeLabel) bgMusicVolumeLabel.textContent = savedVol + '%';
  applyBackgroundMusicVolume(savedVol / 100);
  applyBackgroundMusicTrack(savedTrack);

  if (bgMusicSelect) {
    bgMusicSelect.addEventListener('change', () => {
      const v = bgMusicSelect.value || 'none';
      localStorage.setItem('backgroundMusicTrack', v);
      applyBackgroundMusicTrack(v);
    });
  }
  if (bgMusicVolumeSlider) {
    bgMusicVolumeSlider.addEventListener('input', () => {
      const pct = parseInt(bgMusicVolumeSlider.value, 10);
      if (bgMusicVolumeLabel) bgMusicVolumeLabel.textContent = pct + '%';
      const vol01 = pct / 100;
      localStorage.setItem('backgroundMusicVolume', String(pct));
      applyBackgroundMusicVolume(vol01);
    });
  }

  // Read aloud: speak current instructions once (works even when Voice is off)
  const readAloudBtn = document.getElementById('readAloudBtn');
  if (readAloudBtn && typeof speakInstructionsOnce === 'function') {
    readAloudBtn.addEventListener('click', () => {
      speakInstructionsOnce(isGuidedMode);
    });
  }

  // Need help understanding?: show extended descriptions for current prompt
  const needHelpBtn = document.getElementById('needHelpBtn');
  const helpModal = document.getElementById('helpModal');
  const helpModalBody = document.getElementById('helpModalBody');
  const closeHelpModal = document.getElementById('closeHelpModal');
  if (needHelpBtn && helpModal && helpModalBody) {
    needHelpBtn.addEventListener('click', () => {
      if (!currentPrompt || typeof getPromptHelp !== 'function') {
        helpModalBody.textContent = 'No prompt is shown yet, or help is not loaded. Show a prompt first (enter rolls or start a guided turn).';
        helpModal.style.display = 'flex';
        return;
      }
      const p = currentPrompt;
      const whereLabel = p.phase === 3 ? 'Position' : 'Where (location)';
      const whatLabel = p.phase === 3 ? 'Modifier (how to do it)' : 'What to do (action)';
      const whereHelp = getPromptHelp(p.phase, 'where', p.locationRoll);
      const whatHelp = getPromptHelp(p.phase, 'what', p.actionRoll);
      const parts = [];
      if (whereHelp) parts.push(whereLabel + ' — extended description:\n\n' + whereHelp);
      if (whatHelp) parts.push(whatLabel + ' — extended description:\n\n' + whatHelp);
      helpModalBody.textContent = parts.length ? parts.join('\n\n') : 'No extended description available for this prompt.';
      helpModal.style.display = 'flex';
    });
  }
  if (closeHelpModal && helpModal) {
    closeHelpModal.addEventListener('click', () => { helpModal.style.display = 'none'; });
  }
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.style.display = 'none';
    });
  }

  // Initialize voice toggle buttons from saved preference
  if (typeof updateVoiceButtons === 'function') updateVoiceButtons();
});
