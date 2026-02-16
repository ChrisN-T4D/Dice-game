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

// Screen wake lock: keep screen on during guided or free play (prevents device from sleeping)
let _wakeLockSentinel = null;
async function requestWakeLock() {
  if (!navigator.wakeLock) return;
  try {
    if (_wakeLockSentinel) return;
    _wakeLockSentinel = await navigator.wakeLock.request('screen');
    _wakeLockSentinel.addEventListener('release', () => { _wakeLockSentinel = null; });
  } catch (_) {}
}
function releaseWakeLock() {
  if (_wakeLockSentinel) {
    try { _wakeLockSentinel.release(); } catch (_) {}
    _wakeLockSentinel = null;
  }
}
window.releaseWakeLock = releaseWakeLock;

window.addEventListener('DOMContentLoaded', () => {
  // Re-acquire wake lock when tab becomes visible (browsers release on background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (isGuidedMode || window.currentUIMode === 'freeplay')) {
      requestWakeLock();
    }
  });

  // Landing modal references
  const landingModal = document.getElementById('landingModal');
  const landingFreePlayBtn = document.getElementById('landingFreePlay');
  const landingGuidedBtn = document.getElementById('landingGuided');

  // Initialize DOM references
  const phaseDisplay = document.getElementById('phaseDisplay');
  const rollCountDisplay = document.getElementById('rollCountDisplay');
  whereOutput = document.getElementById('whereOutput');
  whatOutput = document.getElementById('whatOutput');
  instructionOutput = document.getElementById('instructionOutput');
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
        if (typeof updateOutputLabels === 'function') updateOutputLabels(phase);

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
  const phaseDistQuickieBtn = document.getElementById('phaseDistQuickie');
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
  const continueAfterPhaseCheckInBtn = document.getElementById('continueAfterPhaseCheckInBtn');
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
        releaseWakeLock();
      }
      showMode('freeplay');
      requestWakeLock();
    });
  }

  if (guidedModeBtn) {
    guidedModeBtn.addEventListener('click', () => {
      if (window.currentUIMode === 'freeplay') releaseWakeLock();
      if (!isGuidedMode) {
        showMode('guided-setup');
      }
    });
  }

  // Prompt detail: Beginner = full + slower, Regular = some detail, Expert = short + more variety later
  function updatePromptDetailUI() {
    const mode = typeof promptDetailMode !== 'undefined' ? promptDetailMode : 'regular';
    const labels = { beginner: 'Full descriptions, slower pace', regular: 'Some detail, medium pace', expert: 'Short prompts, more variety later' };
    updateSelectionDisplay('promptDetailSelection', labels[mode] || labels.regular);
    document.querySelectorAll('.prompt-detail-btn').forEach((btn) => {
      const m = btn.getAttribute('data-mode');
      if (m === mode) {
        btn.classList.add('primary');
        btn.classList.remove('secondary');
      } else {
        btn.classList.remove('primary');
        btn.classList.add('secondary');
      }
    });
  }
  document.querySelectorAll('.prompt-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode && (mode === 'beginner' || mode === 'regular' || mode === 'expert')) {
        promptDetailMode = mode;
        updatePromptDetailUI();
        saveState();
      }
    });
  });

  // Penetration preference: Prefer vs Minimal
  function updatePenetrationPrefUI() {
    const pref = typeof penetrationPreference !== 'undefined' ? penetrationPreference : 'prefer';
    updateSelectionDisplay('penetrationPrefSelection', pref === 'minimal' ? 'Minimal (focus external)' : 'Prefer penetration');
    document.querySelectorAll('.penetration-pref-btn').forEach((btn) => {
      const p = btn.getAttribute('data-pref');
      if (p === pref) {
        btn.classList.add('primary');
        btn.classList.remove('secondary');
      } else {
        btn.classList.remove('primary');
        btn.classList.add('secondary');
      }
    });
  }
  document.querySelectorAll('.penetration-pref-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pref = btn.getAttribute('data-pref');
      if (pref && (pref === 'prefer' || pref === 'minimal')) {
        penetrationPreference = pref;
        updatePenetrationPrefUI();
        saveState();
      }
    });
  });

  // Phase check-in between phases (Preferences)
  const guidedPhaseCheckInCheckbox = document.getElementById('guidedPhaseCheckInEnabled');
  function updatePhaseCheckInCheckbox() {
    if (guidedPhaseCheckInCheckbox) {
      guidedPhaseCheckInCheckbox.checked = typeof guidedPhaseCheckInEnabled !== 'undefined' ? guidedPhaseCheckInEnabled : false;
    }
  }
  if (guidedPhaseCheckInCheckbox) {
    guidedPhaseCheckInCheckbox.addEventListener('change', () => {
      guidedPhaseCheckInEnabled = guidedPhaseCheckInCheckbox.checked;
      saveState();
    });
  }

  // Vibrators available (Phase 3 modifiers 17–19 are rerolled if off)
  const vibratorsPresentCheckbox = document.getElementById('vibratorsPresent');
  function updateVibratorsCheckbox() {
    if (vibratorsPresentCheckbox) {
      vibratorsPresentCheckbox.checked = typeof vibratorsPresent !== 'undefined' ? vibratorsPresent : true;
    }
  }
  if (vibratorsPresentCheckbox) {
    vibratorsPresentCheckbox.addEventListener('change', () => {
      vibratorsPresent = vibratorsPresentCheckbox.checked;
      saveState();
    });
  }
  const excludeTouchIds = ['excludeTouchFeet', 'excludeTouchLicking', 'excludeTouchNipples', 'excludeTouchGenitals', 'excludeTouchButtocks', 'excludeTouchPerineum'];
  const excludeTouchedIds = ['excludeTouchedFeet', 'excludeTouchedLicking', 'excludeTouchedNipples', 'excludeTouchedGenitals', 'excludeTouchedButtocks', 'excludeTouchedPerineum'];
  const excludeBodyKeys = typeof EXCLUDE_BODY_KEYS !== 'undefined' ? EXCLUDE_BODY_KEYS : ['feet', 'licking', 'nipples', 'genitals', 'buttocks', 'perineum'];
  function updateExcludeBodyCheckboxes() {
    if (typeof excludeWhenTouching === 'undefined') return;
    excludeBodyKeys.forEach((key, i) => {
      const el = document.getElementById(excludeTouchIds[i]);
      if (el) el.checked = excludeWhenTouching[key] === true;
    });
    if (typeof excludeWhenTouched === 'undefined') return;
    excludeBodyKeys.forEach((key, i) => {
      const el = document.getElementById(excludeTouchedIds[i]);
      if (el) el.checked = excludeWhenTouched[key] === true;
    });
  }
  excludeBodyKeys.forEach((key, i) => {
    const touchEl = document.getElementById(excludeTouchIds[i]);
    const touchedEl = document.getElementById(excludeTouchedIds[i]);
    if (touchEl) {
      touchEl.addEventListener('change', () => {
        excludeWhenTouching[key] = touchEl.checked;
        saveState();
      });
    }
    if (touchedEl) {
      touchedEl.addEventListener('change', () => {
        excludeWhenTouched[key] = touchedEl.checked;
        saveState();
      });
    }
  });

  // Phase 3 position preference (bed only vs more physical)
  const positionIntensityBedOnlyBtn = document.getElementById('positionIntensityBedOnly');
  const positionIntensityMorePhysicalBtn = document.getElementById('positionIntensityMorePhysical');
  const positionIntensityButtons = [positionIntensityBedOnlyBtn, positionIntensityMorePhysicalBtn];
  const positionIntensityValues = ['bed_only', 'more_physical'];
  function updatePositionIntensityButtons() {
    updateButtonGroup(positionIntensityButtons, positionIntensityValues, typeof positionIntensity !== 'undefined' ? positionIntensity : 'more_physical');
  }
  wireButtonGroup(positionIntensityButtons, positionIntensityValues, (val) => {
    positionIntensity = val;
    updatePositionIntensityButtons();
    saveState();
  });
  const analPositionsCheckbox = document.getElementById('analPositionsEnabled');
  function updateAnalPositionsCheckbox() {
    if (analPositionsCheckbox) {
      analPositionsCheckbox.checked = typeof analPositionsEnabled !== 'undefined' ? analPositionsEnabled : true;
    }
  }
  if (analPositionsCheckbox) {
    analPositionsCheckbox.addEventListener('change', () => {
      analPositionsEnabled = analPositionsCheckbox.checked;
      saveState();
    });
  }

  // Phase 3 position groups by effort (multiselect: bed/lying, standing, heavy)
  const phase3GroupCheckboxesContainer = document.getElementById('phase3GroupCheckboxes');
  function getAllPhase3GroupIds() {
    if (typeof getPhase3EffortGroups !== 'function') return [];
    return (getPhase3EffortGroups() || []).map((g) => g.group);
  }
  function buildPhase3GroupCheckboxes() {
    if (!phase3GroupCheckboxesContainer || typeof getPhase3EffortGroups !== 'function') return;
    const groups = getPhase3EffortGroups();
    phase3GroupCheckboxesContainer.innerHTML = '';
    const allIds = getAllPhase3GroupIds();
    const enabledIds = (typeof phase3EnabledGroupIds !== 'undefined' && Array.isArray(phase3EnabledGroupIds)) ? phase3EnabledGroupIds : null;
    const isChecked = (gid) => enabledIds === null || (enabledIds.length > 0 && enabledIds.indexOf(gid) !== -1);
    groups.forEach((g) => {
      const label = document.createElement('label');
      label.className = 'row';
      label.style.cssText = 'align-items: center; gap: 0.35rem; font-size: 0.85rem; color: #9ca3af; cursor: pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'touch-checkbox';
      cb.style.accentColor = '#22c55e';
      cb.dataset.groupId = g.group;
      cb.checked = isChecked(g.group);
      cb.addEventListener('change', () => {
        const all = getAllPhase3GroupIds();
        const current = (typeof phase3EnabledGroupIds !== 'undefined' && Array.isArray(phase3EnabledGroupIds)) ? phase3EnabledGroupIds : null;
        let next;
        if (cb.checked) {
          next = (current && current.length > 0) ? current.slice() : all.slice();
          if (next.indexOf(g.group) === -1) next.push(g.group);
          if (next.length >= all.length) next = null;
        } else {
          next = (current == null) ? all.slice() : current.slice();
          next = next.filter((id) => id !== g.group);
        }
        phase3EnabledGroupIds = next;
        saveState();
      });
      label.appendChild(cb);
      if (g.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.style.fontSize = '1.1em';
        iconSpan.textContent = g.icon + ' ';
        label.appendChild(iconSpan);
      }
      label.appendChild(document.createTextNode(g.groupDisplay || g.group));
      phase3GroupCheckboxesContainer.appendChild(label);
    });
  }
  buildPhase3GroupCheckboxes();

  // Double Phase 3 time (guided mode)
  const phase3DoubleTimeCheckbox = document.getElementById('phase3DoubleTime');
  function updatePhase3DoubleTimeCheckbox() {
    if (phase3DoubleTimeCheckbox) {
      phase3DoubleTimeCheckbox.checked = typeof phase3DoubleTime !== 'undefined' ? phase3DoubleTime : false;
    }
  }
  if (phase3DoubleTimeCheckbox) {
    phase3DoubleTimeCheckbox.addEventListener('change', () => {
      phase3DoubleTime = phase3DoubleTimeCheckbox.checked;
      saveState();
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

  const phaseDistButtons = [phaseDistEqualBtn, phaseDistPhase1Btn, phaseDistPhase2Btn, phaseDistPhase3Btn, phaseDistQuickieBtn, phaseDistCustomBtn];
  const phaseDistValues = ['equal', 'phase1', 'phase2', 'phase3', 'quickie', 'custom'];
  function updatePhaseDistButtons() { updateButtonGroup(phaseDistButtons, phaseDistValues, phaseDistributionMode); }

  // Map total session time to turn duration (shorter total = faster turns)
  const sessionTimeToTurnDuration = {
    15: 1,   // 15 min → 1 min turns
    30: 2,   // 30 min → 2 min turns
    45: 2,   // 45 min → 2 min turns
    60: 2,   // 60 min → 2 min turns
    90: 3,   // 90 min → 3 min turns
    120: 3   // 120 min → 3 min turns
  };

  // Wire session time buttons
  wireButtonGroup(timeButtons, timeValues, (val) => {
    selectedTime = val;
    updateTimeButtonStyles();
    updateSelectionDisplay('sessionTimeSelection', `${val} minutes`, true);
    
    // Auto-adjust turn duration based on total time (unless Quickie preset is active)
    if (phaseDistributionMode !== 'quickie' && sessionTimeToTurnDuration[val] !== undefined) {
      const suggestedTurnTime = sessionTimeToTurnDuration[val];
      if (selectedTurnTime !== suggestedTurnTime) {
        selectedTurnTime = suggestedTurnTime;
        updateTurnButtonStyles();
        updateSelectionDisplay('turnTimeSelection', `${suggestedTurnTime} minute${suggestedTurnTime === 1 ? '' : 's'}`, true);
      }
    }
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

  // Clothing milestone slider
  const clothingMilestoneValueLabel = document.getElementById('clothingMilestoneValue');
  if (clothingMilestoneInput) {
    clothingMilestoneInput.addEventListener('input', () => {
      const value = parseInt(clothingMilestoneInput.value) || 3;
      const plural = value === 1 ? 'turn' : 'turns';
      if (clothingMilestoneValueLabel) clothingMilestoneValueLabel.textContent = `${value} ${plural}`;
      updateSelectionDisplay('clothingIntervalSelection', `Every ${value} ${plural}`, false);
    });
  }

  // Phase distribution mode buttons (labels shown in phaseDistSelection when selected)
  const phaseDistLabels = [
    'Equal (33/33/34%)',
    'Sensate-Focused (50/30/20%)',
    'A Little Spicy (30/40/30%)',
    'Intimacy-Focused (20/30/50%)',
    'Quickie (10/30/60%) · No critical rolls',
    'Custom percentages'
  ];

  // Optional short descriptions for each preset (shown under phase dist selection when set)
  const phaseDistDescriptions = {
    equal: 'Balanced time across all three phases.',
    phase1: 'More time in Phase 1 (sensate focus).',
    phase2: 'More time in Phase 2 (a little spicy).',
    phase3: 'More time in Phase 3 (intimacy-focused).',
    quickie: 'Short session: 15 min, 1 min turns, double clothing removal. No critical rolls (no extended time).',
    custom: ''
  };

  // Map phase distribution presets to clothing interval (spicier = faster removal)
  const phaseDistClothingInterval = {
    equal: 3,    // balanced
    phase1: 4,   // sensate-focused: slow buildup
    phase2: 2,   // a little spicy: quicker
    phase3: 1,   // intimacy-focused: every turn
    quickie: 1   // quickie: every turn
  };

  function setClothingInterval(turns) {
    if (clothingMilestoneInput) {
      clothingMilestoneInput.value = turns;
      const plural = turns === 1 ? 'turn' : 'turns';
      if (clothingMilestoneValueLabel) clothingMilestoneValueLabel.textContent = `${turns} ${plural}`;
      updateSelectionDisplay('clothingIntervalSelection', `Every ${turns} ${plural}`, false);
    }
  }

  const quickieOptions = document.getElementById('quickieOptions');
  const quickieDoubleCheckbox = document.getElementById('quickieDoubleClothing');

  wireButtonGroup(phaseDistButtons, phaseDistValues, (val) => {
    phaseDistributionMode = val;
    updatePhaseDistButtons();
    const label = phaseDistLabels[phaseDistValues.indexOf(val)];
    const isCustom = val === 'custom';
    updateSelectionDisplay('phaseDistSelection', label, !isCustom);
    const descEl = document.getElementById('phaseDistDescription');
    if (descEl) {
      const desc = phaseDistDescriptions[val] || '';
      descEl.textContent = desc;
      descEl.style.display = desc ? 'block' : 'none';
    }
    if (customPhaseInputs) customPhaseInputs.style.display = isCustom ? 'block' : 'none';
    if (!isCustom && percentError) percentError.style.display = 'none';

    // Auto-adjust clothing interval for non-custom presets
    if (!isCustom && phaseDistClothingInterval[val] !== undefined) {
      setClothingInterval(phaseDistClothingInterval[val]);
      // Quickie preset: set total time to 15 minutes, turn duration to 1 minute, and check double clothing
      if (val === 'quickie') {
        selectedTime = 15;
        updateTimeButtonStyles();
        updateSelectionDisplay('sessionTimeSelection', '15 minutes', true);
        selectedTurnTime = 1;
        updateTurnButtonStyles();
        updateSelectionDisplay('turnTimeSelection', '1 minute', true);
        if (quickieDoubleCheckbox) {
          quickieDoubleCheckbox.checked = true;
          quickieDoubleClothing = true;
        }
        saveState();
      }
    }
  });

  if (quickieDoubleCheckbox) {
    // Restore saved state
    quickieDoubleCheckbox.checked = quickieDoubleClothing || false;
    quickieDoubleCheckbox.addEventListener('change', () => {
      quickieDoubleClothing = quickieDoubleCheckbox.checked;
      saveState();
    });
  }

  // Guided Mode Clothing system buttons
  let clothingMode = 'enabled';

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

  // --- Animation helpers for clothing buttons ---
  function animateButton(btn, className) {
    btn.classList.remove(className);
    void btn.offsetWidth; // force reflow to restart animation
    btn.classList.add(className);
    btn.addEventListener('animationend', () => btn.classList.remove(className), { once: true });
  }

  function animateClothingItems(containerId, animClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.clothing-item').forEach((item, i) => {
      item.classList.remove(animClass);
      void item.offsetWidth;
      item.style.animationDelay = `${i * 0.03}s`;
      item.classList.add(animClass);
      item.addEventListener('animationend', () => {
        item.classList.remove(animClass);
        item.style.animationDelay = '';
      }, { once: true });
    });
  }

  // Guided Mode Clothing preset buttons - wire both partners via data
  const presetNames = ['Casual', 'DressCasual', 'Lingerie', 'LingerieLace', 'LingerieClassic', 'Minimal', 'FullOutfit', 'DateNight', 'LoungeWear', 'Athletic', 'Cozy', 'Layered'];
  const presetKeys = ['casual', 'dressCasual', 'lingerie', 'lingerieLace', 'lingerieClassic', 'minimal', 'fullOutfit', 'dateNight', 'loungeWear', 'athletic', 'cozy', 'layered'];

  [1, 2].forEach(partner => {
    const containerId = `guidedClothingCheckboxContainerP${partner}`;
    presetNames.forEach((name, idx) => {
      const btn = document.getElementById(`guidedP${partner}Preset${name}`);
      if (btn) {
        btn.addEventListener('click', () => {
          animateButton(btn, 'anim-preset-pop');
          populateGuidedClothingCheckboxes(partner, clothingPresets[presetKeys[idx]]);
          animateClothingItems(containerId, 'anim-pop-in');
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
    const containerId = `guidedClothingCheckboxContainerP${partner}`;
    const btn = document.getElementById(`guidedP${partner}ClearAll`);
    if (btn) {
      btn.addEventListener('click', () => {
        animateButton(btn, 'anim-clear-shake');
        animateClothingItems(containerId, 'anim-fade-out');
        // Delay the actual clear so the fade-out animation is visible
        setTimeout(() => {
          clearClothingSelections(containerId);
        }, 200);
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
    phase3: [20, 20, 60],
    quickie: [10, 30, 60]
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
        if (p1 === 0 && p2 === 0 && p3 === 0) {
          if (percentError) {
            percentError.style.display = 'block';
            percentError.textContent = 'At least one phase must be more than 0%.';
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
        // Store per-partner items for guided mode to pick up
        window._guidedSetupP1Items = p1Items;
        window._guidedSetupP2Items = p2Items;

        if (clothingMilestoneInput) {
          milestoneInterval = parseInt(clothingMilestoneInput.value) || 3;
        }
      }

      // Switch to guided-active mode (shows status + output, hides setup + roll inputs)
      showMode('guided-active');
      startGuidedMode(selectedTime, selectedTurnTime, selectedPauseTime, selectedClothingRemovalTime, phasePercents, clothingList, milestoneInterval, clothingEnabled, phaseDistributionMode);
      requestWakeLock();
    });
  }

  // Guided mode control buttons
  if (continueAfterPhaseCheckInBtn && typeof continueAfterPhaseCheckIn === 'function') {
    continueAfterPhaseCheckInBtn.addEventListener('click', continueAfterPhaseCheckIn);
  }
  if (nextTurnGuidedBtn) nextTurnGuidedBtn.addEventListener('click', skipToNextTurn);
  if (rerollGuidedPromptBtn && typeof rerollGuidedPrompt === 'function') {
    rerollGuidedPromptBtn.addEventListener('click', rerollGuidedPrompt);
  }
  if (pauseGuidedBtn) pauseGuidedBtn.addEventListener('click', pauseGuidedMode);
  if (resumeGuidedBtn) resumeGuidedBtn.addEventListener('click', resumeGuidedMode);
  if (stopGuidedBtn) stopGuidedBtn.addEventListener('click', () => {
    stopGuidedMode();
    releaseWakeLock();
    // Set layout to guided-setup so when modal is dismissed (Guided or Free Play), correct view shows
    showMode('guided-setup');
    if (landingModal) {
      landingModal.style.display = 'flex';
      landingModal.classList.remove('hidden');
    }
  });
  const continueInFreePlayBtn = document.getElementById('continueInFreePlayBtn');
  const endSessionBtn = document.getElementById('endSessionBtn');
  if (continueInFreePlayBtn) {
    continueInFreePlayBtn.addEventListener('click', () => {
      stopGuidedMode();
      releaseWakeLock();
      showMode('freeplay');
      requestWakeLock();
    });
  }
  if (endSessionBtn) {
    endSessionBtn.addEventListener('click', () => {
      stopGuidedMode();
      releaseWakeLock();
      showMode('guided-setup');
      if (landingModal) {
        landingModal.style.display = 'flex';
        landingModal.classList.remove('hidden');
      }
    });
  }

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
    const containerId = `freePlayClothingCheckboxContainerP${partner}`;
    presetNames.forEach((name, idx) => {
      const btn = document.getElementById(`freePlayP${partner}Preset${name}`);
      if (btn) {
        btn.addEventListener('click', () => {
          animateButton(btn, 'anim-preset-pop');
          populateFreePlayClothingCheckboxes(partner, clothingPresets[presetKeys[idx]]);
          animateClothingItems(containerId, 'anim-pop-in');
        });
      }
    });

    // Clear All buttons
    const clearBtn = document.getElementById(`freePlayP${partner}ClearAll`);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        animateButton(clearBtn, 'anim-clear-shake');
        animateClothingItems(containerId, 'anim-fade-out');
        setTimeout(() => {
          clearClothingSelections(containerId);
        }, 200);
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
  updateSelectionDisplay('clothingSelection', 'Enabled - Configure below');
  updateSelectionDisplay('clothingIntervalSelection', 'Every 3 turns');
  updateSelectionDisplay('clothingExtraTimeSelection', '30 seconds');
  
  // Update clothing mode buttons to reflect enabled default
  updateClothingModeButtons();

  // Prompt detail mode (Beginner / Regular / Expert)
  updatePromptDetailUI();
  updatePenetrationPrefUI();
  updatePhaseCheckInCheckbox();
  updateVibratorsCheckbox();
  updateExcludeBodyCheckboxes();
  updatePositionIntensityButtons();
  if (typeof updateAnalPositionsCheckbox === 'function') updateAnalPositionsCheckbox();

  // Show clothing interval and extra time sections by default (clothing is enabled)
  if (clothingSetupInputs) clothingSetupInputs.style.display = 'block';

  // ----- Initialize UI on load -----

  // Try to load saved state
  const stateLoaded = loadState();
  
  if (stateLoaded) {
    // Hide landing modal - we have a real session to restore
    if (landingModal) landingModal.style.display = 'none';

    // Sync phase dist selection and description to restored mode
    const phaseDistSel = document.getElementById('phaseDistSelection');
    const phaseDistDescEl = document.getElementById('phaseDistDescription');
    if (phaseDistSel && phaseDistributionMode) {
      const idx = phaseDistValues.indexOf(phaseDistributionMode);
      if (idx >= 0) phaseDistSel.textContent = phaseDistLabels[idx];
      if (phaseDistDescEl) {
        const desc = phaseDistDescriptions[phaseDistributionMode] || '';
        phaseDistDescEl.textContent = desc;
        phaseDistDescEl.style.display = desc ? 'block' : 'none';
      }
    }

    updatePromptDetailUI();
    updatePenetrationPrefUI();
    updatePhaseCheckInCheckbox();
    updateVibratorsCheckbox();
    updateExcludeBodyCheckboxes();
    updatePositionIntensityButtons();
    if (typeof updateAnalPositionsCheckbox === 'function') updateAnalPositionsCheckbox();
    if (typeof buildPhase3GroupCheckboxes === 'function') buildPhase3GroupCheckboxes();
    if (typeof updatePhase3DoubleTimeCheckbox === 'function') updatePhase3DoubleTimeCheckbox();

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
        if (currentPrompt.phase === 3 && typeof window.refreshFavoriteButton === 'function') window.refreshFavoriteButton();
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
      if (instructionOutput) instructionOutput.textContent = 'Session restored. Enter rolls to continue.';

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
    if (typeof buildPhase3GroupCheckboxes === 'function') buildPhase3GroupCheckboxes();
    if (typeof updatePhase3DoubleTimeCheckbox === 'function') updatePhase3DoubleTimeCheckbox();
    
    if (whereOutput) whereOutput.textContent = '—';
    if (whatOutput) whatOutput.textContent = 'Enter both rolls (1–20) and optional clothing roll (1–12) to get your first prompt.';
    if (instructionOutput) instructionOutput.textContent = 'Enter both rolls (1–20) and optional clothing roll (1–12) to get your first prompt.';
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
  // Anatomy toggle buttons (two per partner: penis / vulva)
  function updateAnatomyButtonStyles() {
    document.querySelectorAll('.anatomy-btn').forEach((btn) => {
      const p = parseInt(btn.getAttribute('data-partner'), 10);
      const val = btn.getAttribute('data-value');
      const current = p === 1 ? (partnerAnatomy1 || 'penis') : (partnerAnatomy2 || 'vulva');
      const isActive = val === current;
      btn.classList.toggle('primary', isActive);
      btn.classList.toggle('secondary', !isActive);
    });
  }
  document.querySelectorAll('.anatomy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.getAttribute('data-partner'), 10);
      const val = btn.getAttribute('data-value');
      if (p === 1) {
        partnerAnatomy1 = val;
      } else {
        partnerAnatomy2 = val;
      }
      updateAnatomyButtonStyles();
      saveState();
    });
  });
  updateAnatomyButtonStyles();
  updatePartnerNameDisplays();

  // Partner color presets
  function applyPartnerColors() {
    const guidedStatus = document.getElementById('guidedStatus');
    const outputBox = document.getElementById('outputDisplayBox');
    if (!isGuidedMode) return;
    const giverColor = guidedCurrentPartner === 1 ? partnerColor1 : partnerColor2;
    if (guidedStatus) {
      guidedStatus.style.borderColor = giverColor;
      guidedStatus.style.background = hexToRgba(giverColor, 0.1);
    }
    if (outputBox) {
      outputBox.style.borderColor = giverColor;
      outputBox.style.background = hexToRgba(giverColor, 0.1);
    }
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Make applyPartnerColors available globally for updateGuidedModeUI
  window.applyPartnerColors = applyPartnerColors;

  function initColorDots() {
    // Restore saved colors on the dots
    [1, 2].forEach(partner => {
      const container = document.getElementById(`colorPresetsP${partner}`);
      if (!container) return;
      const savedColor = partner === 1 ? partnerColor1 : partnerColor2;
      container.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('selected', dot.dataset.color === savedColor);
      });
    });
  }

  document.querySelectorAll('.color-presets').forEach(container => {
    container.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      const color = dot.dataset.color;
      const partner = parseInt(container.dataset.partner);

      // Update selection UI
      container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');

      // Save color
      if (partner === 1) partnerColor1 = color;
      else partnerColor2 = color;
      saveState();

      // Apply immediately if in guided mode
      applyPartnerColors();
    });
  });

  initColorDots();

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
  const savedBgImage = localStorage.getItem('backgroundImage') || '1';
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
  /** True if user has selected a music track (not "none"). Used so clothing roll 10 "to the rhythm of the music" only applies when music is on. */
  window.isBackgroundMusicSelected = function () {
    const el = document.getElementById('backgroundMusicSelect');
    return el && el.value && el.value !== 'none';
  };
  const bgMusicSelect = document.getElementById('backgroundMusicSelect');
  const bgMusicVolumeSlider = document.getElementById('backgroundMusicVolume');
  const bgMusicVolumeLabel = document.getElementById('backgroundMusicVolumeLabel');
  const bgMusicTracks = [null, 
    document.getElementById('bgMusic1'), 
    document.getElementById('bgMusic2'), 
    document.getElementById('bgMusic3'), 
    document.getElementById('bgMusic4'),
    document.getElementById('bgMusic5'),
    document.getElementById('bgMusic6'),
    document.getElementById('bgMusic7'),
    document.getElementById('bgMusic8'),
    document.getElementById('bgMusic9')
  ];
  const PLAYLIST_JAZZ = [4, 5, 6, 7, 8];  // Jazz: all smooth jazz tracks (4, 5, 6, 7, 8)
  const PLAYLIST_RB = [1, 2, 3, 9];       // R&B: tracks 1–3 (sensual/sexy) + track 9 (slow kiss)
  let playlistTrackIndices = [];
  let playlistCurrentIndex = 0;

  function applyBackgroundMusicVolume(vol01) {
    window.backgroundMusicVolume = vol01;
    bgMusicTracks.forEach((el, i) => { if (i > 0 && el) el.volume = vol01; });
  }

  function playNextInPlaylist() {
    if (!playlistTrackIndices.length) return;
    playlistCurrentIndex = (playlistCurrentIndex + 1) % playlistTrackIndices.length;
    const trackNum = playlistTrackIndices[playlistCurrentIndex];
    const el = bgMusicTracks[trackNum];
    if (el) {
      el.currentTime = 0;
      el.volume = window.backgroundMusicVolume;
      el.play().catch(() => {});
      window.backgroundMusicElement = el;
    }
  }

  function applyBackgroundMusicTrack(trackId) {
    bgMusicTracks.forEach((el, i) => {
      if (i > 0 && el) {
        el.pause();
        el.currentTime = 0;
        el.removeEventListener('ended', window._playlistNextHandler);
      }
    });
    window.backgroundMusicElement = null;
    if (!trackId || trackId === 'none') return;
    if (trackId === 'playlist-jazz') {
      playlistTrackIndices = PLAYLIST_JAZZ.slice();
      playlistCurrentIndex = 0;
      window._playlistNextHandler = () => {
        if (bgMusicSelect && bgMusicSelect.value !== 'playlist-jazz') return;
        playNextInPlaylist();
      };
      playlistTrackIndices.forEach(i => {
        const t = bgMusicTracks[i];
        if (t) {
          t.loop = false;
          t.removeEventListener('ended', window._playlistNextHandler);
          t.addEventListener('ended', window._playlistNextHandler);
        }
      });
      const first = bgMusicTracks[playlistTrackIndices[0]];
      if (first) {
        first.currentTime = 0;
        first.volume = window.backgroundMusicVolume;
        first.play().catch(() => {});
        window.backgroundMusicElement = first;
      }
      return;
    }
    if (trackId === 'playlist-rb') {
      playlistTrackIndices = PLAYLIST_RB.slice();
      playlistCurrentIndex = 0;
      window._playlistNextHandler = () => {
        if (bgMusicSelect && bgMusicSelect.value !== 'playlist-rb') return;
        playNextInPlaylist();
      };
      playlistTrackIndices.forEach(i => {
        const t = bgMusicTracks[i];
        if (t) {
          t.loop = false;
          t.removeEventListener('ended', window._playlistNextHandler);
          t.addEventListener('ended', window._playlistNextHandler);
        }
      });
      const first = bgMusicTracks[playlistTrackIndices[0]];
      if (first) {
        first.currentTime = 0;
        first.volume = window.backgroundMusicVolume;
        first.play().catch(() => {});
        window.backgroundMusicElement = first;
      }
      return;
    }
    const n = parseInt(trackId, 10);
    const el = bgMusicTracks[n];
    if (el) {
      el.loop = true;
      el.volume = window.backgroundMusicVolume;
      el.play().catch(() => {});
      window.backgroundMusicElement = el;
    }
  }

  let savedTrack = localStorage.getItem('backgroundMusicTrack') || 'none';
  if (savedTrack === 'playlist') savedTrack = 'playlist-rb'; // legacy: was "all tracks"
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
      if (whereHelp) parts.push(whereLabel + ', extended description:\n\n' + whereHelp);
      if (whatHelp) parts.push(whatLabel + ', extended description:\n\n' + whatHelp);
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

  // View position reference (Phase 3): show position image modal
  const viewPositionRefBtn = document.getElementById('viewPositionRefBtn');
  const positionRefModal = document.getElementById('positionRefModal');
  const positionRefImage = document.getElementById('positionRefImage');
  const positionRefCaption = document.getElementById('positionRefCaption');
  const closePositionRefModal = document.getElementById('closePositionRefModal');
  if (viewPositionRefBtn && positionRefModal && positionRefImage) {
    viewPositionRefBtn.addEventListener('click', () => {
      if (!currentPrompt || currentPrompt.phase !== 3) {
        if (positionRefModal) positionRefModal.style.display = 'none';
        return;
      }
      const path = typeof getPhase3PositionImagePath === 'function' ? getPhase3PositionImagePath(currentPrompt.locationRoll) : ('positions/' + currentPrompt.locationRoll + '.png');
      positionRefImage.src = path;
      const name = typeof getPhase3PositionName === 'function' ? (getPhase3PositionName(currentPrompt.locationRoll) || 'Position reference') : 'Position reference';
      positionRefImage.alt = name;
      if (positionRefCaption) {
        if (typeof getPhase3PositionGroupInfo === 'function') {
          const info = getPhase3PositionGroupInfo(currentPrompt.locationRoll);
          if (info && info.variationLabel && info.groupDisplay) {
            positionRefCaption.textContent = 'Variation of: ' + info.groupDisplay + ' (' + info.variationLabel + ')';
            positionRefCaption.style.display = 'block';
          } else {
            positionRefCaption.textContent = '';
            positionRefCaption.style.display = 'none';
          }
        } else {
          positionRefCaption.textContent = '';
          positionRefCaption.style.display = 'none';
        }
      }
      positionRefModal.style.display = 'flex';
    });
  }
  if (closePositionRefModal && positionRefModal) {
    closePositionRefModal.addEventListener('click', () => { positionRefModal.style.display = 'none'; });
  }
  if (positionRefModal) {
    positionRefModal.addEventListener('click', (e) => {
      if (e.target === positionRefModal) positionRefModal.style.display = 'none';
    });
  }

  // Favorites (Phase 3 positions): stored in localStorage, no database
  const favoritePositionBtn = document.getElementById('favoritePositionBtn');
  if (favoritePositionBtn && typeof toggleFavorite === 'function' && typeof isFavorite === 'function') {
    window.refreshFavoriteButton = function refreshFavoriteButton() {
      if (!currentPrompt || currentPrompt.phase !== 3) return;
      const pos = currentPrompt.locationRoll;
      const fav = isFavorite(pos);
      favoritePositionBtn.textContent = fav ? '♥ Favorited' : '♡ Add to favorites';
      favoritePositionBtn.title = fav ? 'Remove from favorites' : 'Save this position to Favorites (stored on this device)';
    };
    favoritePositionBtn.addEventListener('click', () => {
      if (!currentPrompt || currentPrompt.phase !== 3) return;
      toggleFavorite(currentPrompt.locationRoll);
      if (typeof window.refreshFavoriteButton === 'function') window.refreshFavoriteButton();
    });
  }

  // View favorites modal: list of saved positions, "View image" per row, privacy note at bottom
  const favoritesModal = document.getElementById('favoritesModal');
  const favoritesList = document.getElementById('favoritesList');
  const favoritesEmptyMsg = document.getElementById('favoritesEmptyMsg');
  const closeFavoritesModal = document.getElementById('closeFavoritesModal');
  const viewFavoritesBtn = document.getElementById('viewFavoritesBtn');
  const viewFavoritesPrefBtn = document.getElementById('viewFavoritesPrefBtn');

  function openFavoritesModal() {
    if (!favoritesModal || !favoritesList || !favoritesEmptyMsg) return;
    const favs = typeof getFavorites === 'function' ? getFavorites() : [];
    favoritesList.innerHTML = '';
    if (favs.length === 0) {
      favoritesEmptyMsg.style.display = 'block';
    } else {
      favoritesEmptyMsg.style.display = 'none';
      favs.forEach((n) => {
        const name = typeof getPhase3PositionName === 'function' ? getPhase3PositionName(n) : ('Position ' + n);
        const li = document.createElement('li');
        li.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid #334155;';
        const label = document.createElement('span');
        label.textContent = n + '. ' + (name || 'Position ' + n);
        const viewImgBtn = document.createElement('button');
        viewImgBtn.type = 'button';
        viewImgBtn.className = 'secondary small';
        viewImgBtn.style.fontSize = '0.8rem';
        viewImgBtn.textContent = 'View image';
        viewImgBtn.addEventListener('click', () => {
          if (typeof getPhase3PositionImagePath === 'function' && positionRefImage) {
            positionRefImage.src = getPhase3PositionImagePath(n);
            positionRefImage.alt = name || 'Position ' + n;
            if (positionRefCaption && typeof getPhase3PositionGroupInfo === 'function') {
              const info = getPhase3PositionGroupInfo(n);
              if (info && info.variationLabel && info.groupDisplay) {
                positionRefCaption.textContent = 'Variation of: ' + info.groupDisplay + ' (' + info.variationLabel + ')';
                positionRefCaption.style.display = 'block';
              } else {
                positionRefCaption.textContent = '';
                positionRefCaption.style.display = 'none';
              }
            }
            if (positionRefModal) positionRefModal.style.display = 'flex';
          }
        });
        li.appendChild(label);
        li.appendChild(viewImgBtn);
        favoritesList.appendChild(li);
      });
    }
    favoritesModal.style.display = 'flex';
  }

  if (viewFavoritesBtn) viewFavoritesBtn.addEventListener('click', openFavoritesModal);
  if (viewFavoritesPrefBtn) viewFavoritesPrefBtn.addEventListener('click', openFavoritesModal);
  if (closeFavoritesModal && favoritesModal) {
    closeFavoritesModal.addEventListener('click', () => { favoritesModal.style.display = 'none'; });
  }
  if (favoritesModal) {
    favoritesModal.addEventListener('click', (e) => {
      if (e.target === favoritesModal) favoritesModal.style.display = 'none';
    });
  }

  // Initialize voice toggle buttons from saved preference
  if (typeof updateVoiceButtons === 'function') updateVoiceButtons();
});
