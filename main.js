// ----- Main initialization and event wiring -----

window.addEventListener('DOMContentLoaded', () => {
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
    newSessionBtn.addEventListener('click', resetSession);
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
  const preset20_20_60Btn = document.getElementById('preset20-20-60');
  const preset25_25_50Btn = document.getElementById('preset25-25-50');
  const preset30_30_40Btn = document.getElementById('preset30-30-40');
  const clothingEnabledBtn = document.getElementById('clothingEnabled');
  const clothingDisabledBtn = document.getElementById('clothingDisabled');
  const clothingSetupInputs = document.getElementById('clothingSetupInputs');
  const clothingMilestoneInput = document.getElementById('clothingMilestone');
  const guidedP1PresetCasualBtn = document.getElementById('guidedP1PresetCasual');
  const guidedP1PresetDressCasualBtn = document.getElementById('guidedP1PresetDressCasual');
  const guidedP1PresetLingerieBtn = document.getElementById('guidedP1PresetLingerie');
  const guidedP1PresetMinimalBtn = document.getElementById('guidedP1PresetMinimal');
  const guidedP1PresetFullOutfitBtn = document.getElementById('guidedP1PresetFullOutfit');
  const guidedP1PresetDateNightBtn = document.getElementById('guidedP1PresetDateNight');
  const guidedP1PresetLoungeWearBtn = document.getElementById('guidedP1PresetLoungeWear');
  const guidedP2PresetCasualBtn = document.getElementById('guidedP2PresetCasual');
  const guidedP2PresetDressCasualBtn = document.getElementById('guidedP2PresetDressCasual');
  const guidedP2PresetLingerieBtn = document.getElementById('guidedP2PresetLingerie');
  const guidedP2PresetMinimalBtn = document.getElementById('guidedP2PresetMinimal');
  const guidedP2PresetFullOutfitBtn = document.getElementById('guidedP2PresetFullOutfit');
  const guidedP2PresetDateNightBtn = document.getElementById('guidedP2PresetDateNight');
  const guidedP2PresetLoungeWearBtn = document.getElementById('guidedP2PresetLoungeWear');
  const startGuidedBtn = document.getElementById('startGuided');
  const pauseGuidedBtn = document.getElementById('pauseGuided');
  const resumeGuidedBtn = document.getElementById('resumeGuided');
  const stopGuidedBtn = document.getElementById('stopGuided');

  // Mode toggle
  if (freePlayModeBtn) {
    freePlayModeBtn.addEventListener('click', () => {
      if (isGuidedMode) {
        stopGuidedMode();
      }

      // Hide guided setup and status
      const guidedSetup = document.getElementById('guidedSetup');
      const guidedStatus = document.getElementById('guidedStatus');
      if (guidedSetup) guidedSetup.style.display = 'none';
      if (guidedStatus) guidedStatus.style.display = 'none';

      // Show free play controls and action timer
      const freePlayControls = document.getElementById('freePlayControls');
      const actionTimerSection = document.getElementById('actionTimerSection');
      if (freePlayControls) freePlayControls.style.display = 'block';
      if (actionTimerSection) actionTimerSection.style.display = 'block';

      freePlayModeBtn.classList.add('primary');
      freePlayModeBtn.classList.remove('secondary');
      guidedModeBtn.classList.add('secondary');
      guidedModeBtn.classList.remove('primary');
    });
  }

  if (guidedModeBtn) {
    guidedModeBtn.addEventListener('click', () => {
      if (!isGuidedMode) {
        // Show guided setup
        const guidedSetup = document.getElementById('guidedSetup');
        if (guidedSetup) guidedSetup.style.display = 'block';

        // Hide free play controls and action timer
        const freePlayControls = document.getElementById('freePlayControls');
        const actionTimerSection = document.getElementById('actionTimerSection');
        if (freePlayControls) freePlayControls.style.display = 'none';
        if (actionTimerSection) actionTimerSection.style.display = 'none';

        guidedModeBtn.classList.add('primary');
        guidedModeBtn.classList.remove('secondary');
        freePlayModeBtn.classList.add('secondary');
        freePlayModeBtn.classList.remove('primary');
      }
    });
  }

  // Time selection buttons
  let selectedTime = 30;
  let selectedTurnTime = 2;
  let phaseDistributionMode = 'equal';

  function updateTimeButtonStyles() {
    const buttons = [time15Btn, time30Btn, time45Btn, time60Btn, time90Btn, time120Btn];
    const times = [15, 30, 45, 60, 90, 120];

    buttons.forEach((btn, idx) => {
      if (btn) {
        if (times[idx] === selectedTime) {
          btn.classList.add('primary');
          btn.classList.remove('secondary');
        } else {
          btn.classList.add('secondary');
          btn.classList.remove('primary');
        }
      }
    });
  }

  function updateTurnButtonStyles() {
    const buttons = [turn1Btn, turn2Btn, turn3Btn, turn5Btn];
    const times = [1, 2, 3, 5];

    buttons.forEach((btn, idx) => {
      if (btn) {
        if (times[idx] === selectedTurnTime) {
          btn.classList.add('primary');
          btn.classList.remove('secondary');
        } else {
          btn.classList.add('secondary');
          btn.classList.remove('primary');
        }
      }
    });
  }

  function updatePhaseDistButtons() {
    const buttons = [phaseDistEqualBtn, phaseDistPhase1Btn, phaseDistPhase2Btn, phaseDistPhase3Btn, phaseDistCustomBtn];
    const modes = ['equal', 'phase1', 'phase2', 'phase3', 'custom'];

    buttons.forEach((btn, idx) => {
      if (btn) {
        if (modes[idx] === phaseDistributionMode) {
          btn.classList.add('primary');
          btn.classList.remove('secondary');
        } else {
          btn.classList.add('secondary');
          btn.classList.remove('primary');
        }
      }
    });
  }

  if (time15Btn) {
    time15Btn.addEventListener('click', () => {
      selectedTime = 15;
      updateTimeButtonStyles();
    });
  }

  if (time30Btn) {
    time30Btn.addEventListener('click', () => {
      selectedTime = 30;
      updateTimeButtonStyles();
    });
  }

  if (time45Btn) {
    time45Btn.addEventListener('click', () => {
      selectedTime = 45;
      updateTimeButtonStyles();
    });
  }

  if (time60Btn) {
    time60Btn.addEventListener('click', () => {
      selectedTime = 60;
      updateTimeButtonStyles();
    });
  }

  if (time90Btn) {
    time90Btn.addEventListener('click', () => {
      selectedTime = 90;
      updateTimeButtonStyles();
    });
  }

  if (time120Btn) {
    time120Btn.addEventListener('click', () => {
      selectedTime = 120;
      updateTimeButtonStyles();
    });
  }

  if (turn1Btn) {
    turn1Btn.addEventListener('click', () => {
      selectedTurnTime = 1;
      updateTurnButtonStyles();
    });
  }

  if (turn2Btn) {
    turn2Btn.addEventListener('click', () => {
      selectedTurnTime = 2;
      updateTurnButtonStyles();
    });
  }

  if (turn3Btn) {
    turn3Btn.addEventListener('click', () => {
      selectedTurnTime = 3;
      updateTurnButtonStyles();
    });
  }

  if (turn5Btn) {
    turn5Btn.addEventListener('click', () => {
      selectedTurnTime = 5;
      updateTurnButtonStyles();
    });
  }

  // Phase distribution mode buttons
  if (phaseDistEqualBtn) {
    phaseDistEqualBtn.addEventListener('click', () => {
      phaseDistributionMode = 'equal';
      updatePhaseDistButtons();
      if (customPhaseInputs) customPhaseInputs.style.display = 'none';
      if (percentError) percentError.style.display = 'none';
    });
  }

  if (phaseDistPhase1Btn) {
    phaseDistPhase1Btn.addEventListener('click', () => {
      phaseDistributionMode = 'phase1';
      updatePhaseDistButtons();
      if (customPhaseInputs) customPhaseInputs.style.display = 'none';
      if (percentError) percentError.style.display = 'none';
    });
  }

  if (phaseDistPhase2Btn) {
    phaseDistPhase2Btn.addEventListener('click', () => {
      phaseDistributionMode = 'phase2';
      updatePhaseDistButtons();
      if (customPhaseInputs) customPhaseInputs.style.display = 'none';
      if (percentError) percentError.style.display = 'none';
    });
  }

  if (phaseDistPhase3Btn) {
    phaseDistPhase3Btn.addEventListener('click', () => {
      phaseDistributionMode = 'phase3';
      updatePhaseDistButtons();
      if (customPhaseInputs) customPhaseInputs.style.display = 'none';
      if (percentError) percentError.style.display = 'none';
    });
  }

  if (phaseDistCustomBtn) {
    phaseDistCustomBtn.addEventListener('click', () => {
      phaseDistributionMode = 'custom';
      updatePhaseDistButtons();
      if (customPhaseInputs) customPhaseInputs.style.display = 'block';
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
      if (clothingSetupInputs) clothingSetupInputs.style.display = 'block';
    });
  }

  if (clothingDisabledBtn) {
    clothingDisabledBtn.addEventListener('click', () => {
      clothingMode = 'disabled';
      updateClothingModeButtons();
      if (clothingSetupInputs) clothingSetupInputs.style.display = 'none';
    });
  }

  // Guided Mode Clothing preset buttons - Partner 1
  if (guidedP1PresetCasualBtn) {
    guidedP1PresetCasualBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(1, clothingPresets.casual);
    });
  }

  if (guidedP1PresetDressCasualBtn) {
    guidedP1PresetDressCasualBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(1, clothingPresets.dressCasual);
    });
  }

  if (guidedP1PresetLingerieBtn) {
    guidedP1PresetLingerieBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(1, clothingPresets.lingerie);
    });
  }

  if (guidedP1PresetMinimalBtn) {
    guidedP1PresetMinimalBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(1, clothingPresets.minimal);
    });
  }

  if (guidedP1PresetFullOutfitBtn) {
    guidedP1PresetFullOutfitBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(1, clothingPresets.fullOutfit);
    });
  }

  if (guidedP1PresetDateNightBtn) {
    guidedP1PresetDateNightBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(1, clothingPresets.dateNight);
    });
  }

  if (guidedP1PresetLoungeWearBtn) {
    guidedP1PresetLoungeWearBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(1, clothingPresets.loungeWear);
    });
  }

  // Guided Mode Clothing preset buttons - Partner 2
  if (guidedP2PresetCasualBtn) {
    guidedP2PresetCasualBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(2, clothingPresets.casual);
    });
  }

  if (guidedP2PresetDressCasualBtn) {
    guidedP2PresetDressCasualBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(2, clothingPresets.dressCasual);
    });
  }

  if (guidedP2PresetLingerieBtn) {
    guidedP2PresetLingerieBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(2, clothingPresets.lingerie);
    });
  }

  if (guidedP2PresetMinimalBtn) {
    guidedP2PresetMinimalBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(2, clothingPresets.minimal);
    });
  }

  if (guidedP2PresetFullOutfitBtn) {
    guidedP2PresetFullOutfitBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(2, clothingPresets.fullOutfit);
    });
  }

  if (guidedP2PresetDateNightBtn) {
    guidedP2PresetDateNightBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(2, clothingPresets.dateNight);
    });
  }

  if (guidedP2PresetLoungeWearBtn) {
    guidedP2PresetLoungeWearBtn.addEventListener('click', () => {
      populateGuidedClothingCheckboxes(2, clothingPresets.loungeWear);
    });
  }

  // Initialize Guided Mode clothing checkboxes
  updateClothingModeButtons();
  populateGuidedClothingCheckboxes(1);
  populateGuidedClothingCheckboxes(2);

  // Preset buttons for custom phase distribution
  if (preset20_20_60Btn) {
    preset20_20_60Btn.addEventListener('click', () => {
      if (phase1PercentInput) phase1PercentInput.value = '20';
      if (phase2PercentInput) phase2PercentInput.value = '20';
      if (phase3PercentInput) phase3PercentInput.value = '60';
      if (percentError) percentError.style.display = 'none';
    });
  }

  if (preset25_25_50Btn) {
    preset25_25_50Btn.addEventListener('click', () => {
      if (phase1PercentInput) phase1PercentInput.value = '25';
      if (phase2PercentInput) phase2PercentInput.value = '25';
      if (phase3PercentInput) phase3PercentInput.value = '50';
      if (percentError) percentError.style.display = 'none';
    });
  }

  if (preset30_30_40Btn) {
    preset30_30_40Btn.addEventListener('click', () => {
      if (phase1PercentInput) phase1PercentInput.value = '30';
      if (phase2PercentInput) phase2PercentInput.value = '30';
      if (phase3PercentInput) phase3PercentInput.value = '40';
      if (percentError) percentError.style.display = 'none';
    });
  }

  // Start guided mode
  if (startGuidedBtn) {
    startGuidedBtn.addEventListener('click', () => {
      let phasePercents;

      if (phaseDistributionMode === 'equal') {
        phasePercents = [33, 33, 34];
      } else if (phaseDistributionMode === 'phase1') {
        phasePercents = [50, 25, 25];
      } else if (phaseDistributionMode === 'phase2') {
        phasePercents = [25, 50, 25];
      } else if (phaseDistributionMode === 'phase3') {
        phasePercents = [20, 20, 60];
      } else {
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

      startGuidedMode(selectedTime, selectedTurnTime, phasePercents, clothingList, milestoneInterval, clothingEnabled, phaseDistributionMode);
    });
  }

  // Pause/resume/stop
  if (pauseGuidedBtn) {
    pauseGuidedBtn.addEventListener('click', () => {
      pauseGuidedMode();
    });
  }

  if (resumeGuidedBtn) {
    resumeGuidedBtn.addEventListener('click', () => {
      resumeGuidedMode();
    });
  }

  if (stopGuidedBtn) {
    stopGuidedBtn.addEventListener('click', () => {
      stopGuidedMode();
    });
  }

  // ----- Free Play clothing event listeners -----

  const freePlayClothingEnabledBtn = document.getElementById('freePlayClothingEnabled');
  const freePlayClothingDisabledBtn = document.getElementById('freePlayClothingDisabled');
  const startReceiverP1Btn = document.getElementById('startReceiverP1');
  const startReceiverP2Btn = document.getElementById('startReceiverP2');

  // Partner 1 preset buttons
  const freePlayP1PresetCasualBtn = document.getElementById('freePlayP1PresetCasual');
  const freePlayP1PresetDressCasualBtn = document.getElementById('freePlayP1PresetDressCasual');
  const freePlayP1PresetLingerieBtn = document.getElementById('freePlayP1PresetLingerie');
  const freePlayP1PresetMinimalBtn = document.getElementById('freePlayP1PresetMinimal');
  const freePlayP1PresetFullOutfitBtn = document.getElementById('freePlayP1PresetFullOutfit');
  const freePlayP1PresetDateNightBtn = document.getElementById('freePlayP1PresetDateNight');
  const freePlayP1PresetLoungeWearBtn = document.getElementById('freePlayP1PresetLoungeWear');

  // Partner 2 preset buttons
  const freePlayP2PresetCasualBtn = document.getElementById('freePlayP2PresetCasual');
  const freePlayP2PresetDressCasualBtn = document.getElementById('freePlayP2PresetDressCasual');
  const freePlayP2PresetLingerieBtn = document.getElementById('freePlayP2PresetLingerie');
  const freePlayP2PresetMinimalBtn = document.getElementById('freePlayP2PresetMinimal');
  const freePlayP2PresetFullOutfitBtn = document.getElementById('freePlayP2PresetFullOutfit');
  const freePlayP2PresetDateNightBtn = document.getElementById('freePlayP2PresetDateNight');
  const freePlayP2PresetLoungeWearBtn = document.getElementById('freePlayP2PresetLoungeWear');

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
  }

  if (freePlayClothingEnabledBtn) {
    freePlayClothingEnabledBtn.addEventListener('click', () => {
      freePlayClothingMode = 'enabled';
      freePlayClothingEnabled = true;
      updateFreePlayClothingModeButtons();
    });
  }

  if (freePlayClothingDisabledBtn) {
    freePlayClothingDisabledBtn.addEventListener('click', () => {
      freePlayClothingMode = 'disabled';
      freePlayClothingEnabled = false;
      updateFreePlayClothingModeButtons();
    });
  }

  // Receiver selector buttons
  if (startReceiverP1Btn) {
    startReceiverP1Btn.addEventListener('click', () => {
      freePlayCurrentReceiver = 1;
      updateReceiverButtons();
    });
  }

  if (startReceiverP2Btn) {
    startReceiverP2Btn.addEventListener('click', () => {
      freePlayCurrentReceiver = 2;
      updateReceiverButtons();
    });
  }

  // Partner 1 preset buttons
  if (freePlayP1PresetCasualBtn) {
    freePlayP1PresetCasualBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(1, clothingPresets.casual);
    });
  }

  if (freePlayP1PresetDressCasualBtn) {
    freePlayP1PresetDressCasualBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(1, clothingPresets.dressCasual);
    });
  }

  if (freePlayP1PresetLingerieBtn) {
    freePlayP1PresetLingerieBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(1, clothingPresets.lingerie);
    });
  }

  if (freePlayP1PresetMinimalBtn) {
    freePlayP1PresetMinimalBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(1, clothingPresets.minimal);
    });
  }

  if (freePlayP1PresetFullOutfitBtn) {
    freePlayP1PresetFullOutfitBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(1, clothingPresets.fullOutfit);
    });
  }

  if (freePlayP1PresetDateNightBtn) {
    freePlayP1PresetDateNightBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(1, clothingPresets.dateNight);
    });
  }

  if (freePlayP1PresetLoungeWearBtn) {
    freePlayP1PresetLoungeWearBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(1, clothingPresets.loungeWear);
    });
  }

  // Partner 2 preset buttons
  if (freePlayP2PresetCasualBtn) {
    freePlayP2PresetCasualBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(2, clothingPresets.casual);
    });
  }

  if (freePlayP2PresetDressCasualBtn) {
    freePlayP2PresetDressCasualBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(2, clothingPresets.dressCasual);
    });
  }

  if (freePlayP2PresetLingerieBtn) {
    freePlayP2PresetLingerieBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(2, clothingPresets.lingerie);
    });
  }

  if (freePlayP2PresetMinimalBtn) {
    freePlayP2PresetMinimalBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(2, clothingPresets.minimal);
    });
  }

  if (freePlayP2PresetFullOutfitBtn) {
    freePlayP2PresetFullOutfitBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(2, clothingPresets.fullOutfit);
    });
  }

  if (freePlayP2PresetDateNightBtn) {
    freePlayP2PresetDateNightBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(2, clothingPresets.dateNight);
    });
  }

  if (freePlayP2PresetLoungeWearBtn) {
    freePlayP2PresetLoungeWearBtn.addEventListener('click', () => {
      populateFreePlayClothingCheckboxes(2, clothingPresets.loungeWear);
    });
  }

  // Initialize Free Play clothing checkboxes and mode
  updateFreePlayClothingModeButtons();
  updateReceiverButtons();
  populateFreePlayClothingCheckboxes(1);
  populateFreePlayClothingCheckboxes(2);

  // Initialize mode buttons - start with Free Play visible, Guided hidden
  const guidedSetup = document.getElementById('guidedSetup');
  const guidedStatus = document.getElementById('guidedStatus');
  const freePlayControls = document.getElementById('freePlayControls');

  if (guidedSetup) guidedSetup.style.display = 'none';
  if (guidedStatus) guidedStatus.style.display = 'none';
  if (freePlayControls) freePlayControls.style.display = 'block';

  if (freePlayModeBtn) {
    freePlayModeBtn.classList.add('primary');
    freePlayModeBtn.classList.remove('secondary');
  }
  if (guidedModeBtn) {
    guidedModeBtn.classList.add('secondary');
    guidedModeBtn.classList.remove('primary');
  }

  // Initialize button styles
  updateTimeButtonStyles();
  updateTurnButtonStyles();
  updatePhaseDistButtons();

  // ----- Initialize UI on load -----

  updatePhaseUI(phase, rollCount);
  updateTimerDisplay();
  notifyPhaseChange(phase);

  if (rollCount > 0 || phase > 1) {
    if (whereOutput) whereOutput.textContent = '—';
    if (whatOutput) whatOutput.textContent = 'Resuming your last session. Enter both rolls when you are ready.';
  } else {
    if (whereOutput) whereOutput.textContent = '—';
    if (whatOutput) whatOutput.textContent = 'Enter both d20 rolls (and optional d6) to get your first prompt.';
  }

  notifyPhaseChange(phase);
  updateRollLabels(phase);
});
