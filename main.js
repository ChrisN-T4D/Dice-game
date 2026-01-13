// ----- State & persistence -----

let phase = Number(localStorage.getItem('sensatePhase')) || 1;
let rollCount = Number(localStorage.getItem('sensateRollCount')) || 0;
const maxPhase = 3;

let lastActionId = null;           // for repeat detection
let awaitingPartnerTurn = false;   // two turns = one round
let clothingPromptsEnabled = true; // can be turned off

// Phase 3: map d20 roll → location index (1–8)
const phase3LocationMap = {
  1: 1, 2: 1,
  3: 2, 4: 2,
  5: 3, 6: 3,
  7: 4, 8: 4,
  9: 5, 10: 5,
  11: 6, 12: 6,
  13: 7, 14: 7,
  15: 8, 16: 8,
  17: 1, 18: 2,
  19: 3, 20: 4
};

// Clothing d6 table (applies in any phase while clothingPromptsEnabled)
const clothingTable = {
  1: 'Roller makes no changes to the receiver’s clothing; all touch stays over whatever the receiver is currently wearing for this round.',
  2: 'Roller removes or loosens one small item of the receiver’s clothing (for example, a sock, jewelry, watch, scarf, or hair tie), keeping everything else the same.',
  3: 'Roller uncovers one specific body area of the receiver by adjusting clothing (such as sliding up a sleeve to reveal a forearm or moving a pant leg to reveal part of a calf), leaving all other clothing as it is.',
  4: 'Roller removes one article of clothing from the receiver (any agreed item), while keeping all remaining clothing as it is for this round.',
  5: 'Roller removes one additional article of clothing from the receiver later in this same round, so that a total of two items may come off or be loosened, with all remaining clothing unchanged.',
  6: 'Critical change: roller may remove or loosen up to two articles of the receiver’s clothing and also re‑position any remaining clothing to reveal new non‑genital areas, stopping or scaling back immediately if the receiver signals they have reached their limit.'
};

function getPhase3Location(roll) {
  const idx = phase3LocationMap[roll]; // 1–8
  if (!idx) return null;
  return tables[3].locations[idx];
}

function saveState() {
  localStorage.setItem('sensatePhase', String(phase));
  localStorage.setItem('sensateRollCount', String(rollCount));
}

// ----- DOM helpers -----

const phaseDisplay = document.getElementById('phaseDisplay');
const rollCountDisplay = document.getElementById('rollCountDisplay');
const exerciseOutput = document.getElementById('exerciseOutput');
const clothingOutput = document.getElementById('clothingOutput');
const messageBox = document.getElementById('message');
const errorBox = document.getElementById('error');

const locationRollInput = document.getElementById('locationRoll');
const actionRollInput = document.getElementById('actionRoll');
const clothingRollInput = document.getElementById('clothingRoll');
const submitRollBtn = document.getElementById('submitRoll');
const newSessionBtn = document.getElementById('newSession');

const timerSound = document.getElementById('timerSound');
const timer30Btn = document.getElementById('timer30');
const timer1Btn = document.getElementById('timer1');
const timer2Btn = document.getElementById('timer2');
const timer5Btn = document.getElementById('timer5');
const timerDisplay = document.getElementById('timerDisplay');

const testSoundBtn = document.getElementById('testSound');
const noClothingPromptsBtn = document.getElementById('noClothingPrompts');

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
      clothingOutput.textContent =
        'Clothing prompts are off. Continue with touch as you are.';
    }
  });
}

function clearMessages() {
  messageBox.textContent = '';
  errorBox.textContent = '';
}

function flashMessage(className = 'flash') {
  messageBox.classList.remove('flash', 'repeat-flash');
  void messageBox.offsetWidth;
  messageBox.classList.add(className);
  setTimeout(() => {
    messageBox.classList.remove(className);
  }, 650);
}

function updatePhaseUI(currentPhase, currentRollCount, internalRoll) {
  phaseDisplay.textContent = String(currentPhase);
  rollCountDisplay.textContent = String(currentRollCount);
}

// ----- Summary card rendering -----

function renderCurrentLocations(locationsObj) {
  const ul = document.getElementById('currentLocationsList');
  if (!ul) return;
  ul.innerHTML = '';

  Object.keys(locationsObj).forEach((key) => {
    const li = document.createElement('li');
    li.textContent = `${key}. ${locationsObj[key]}`;
    ul.appendChild(li);
  });
}

function renderCurrentActions(actionsObj) {
  const ul = document.getElementById('currentActionsList');
  if (!ul) return;
  ul.innerHTML = '';

  Object.keys(actionsObj).forEach((key) => {
    const li = document.createElement('li');
    li.textContent = `${key}. ${actionsObj[key]}`;
    ul.appendChild(li);
  });
}

function renderPhaseSummary(phaseNumber) {
  const table = tables[phaseNumber];
  if (!table) return;
  renderCurrentLocations(table.locations || {});
  renderCurrentActions(table.actions || {});
}

// ----- Timer logic -----

let timerId = null;
let timerRemainingSeconds = 0;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timerRemainingSeconds);
}

function clearTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer(seconds) {
  clearTimer();
  timerRemainingSeconds = seconds;
  updateTimerDisplay();

  timerId = setInterval(() => {
    timerRemainingSeconds -= 1;
    if (timerRemainingSeconds <= 0) {
      timerRemainingSeconds = 0;
      updateTimerDisplay();
      clearTimer();

      if (timerSound) {
        timerSound.currentTime = 0;
        timerSound.play().catch(() => {});
      }

      messageBox.textContent =
        'Timer finished. Check in with each other about how that action felt.';
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

// ----- Prompt lookup for two rolls -----

function getPrompt(currentPhase, locationRoll, actionRoll) {
  const phaseTable = tables[currentPhase];
  if (!phaseTable) {
    return 'Unknown phase.';
  }

  let location;

  if (currentPhase === 3) {
    location = getPhase3Location(locationRoll);
  } else {
    location = phaseTable.locations[locationRoll];
  }

  const action = phaseTable.actions[actionRoll];

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
  exerciseOutput.textContent = getPrompt(currentPhase, locationRoll, actionRoll);
}

// ----- Phase change messaging & theming -----

function notifyPhaseChange(newPhase) {
  document.body.classList.remove('phase-1', 'phase-2', 'phase-3');
  document.body.classList.add(`phase-${newPhase}`);

  if (newPhase === 1) {
    messageBox.textContent = 'Now in Phase 1: gentle, non‑genital warm‑up.';
  } else if (newPhase === 2) {
    messageBox.textContent =
      'You’ve unlocked Phase 2: more erogenous exploration. Check in with each other before continuing.';
  } else if (newPhase === 3) {
    messageBox.textContent =
      'You’ve unlocked Phase 3: explicitly sexual goals. Proceed only if both partners actively consent.';
  } else {
    messageBox.textContent = `Now in Phase ${newPhase}.`;
  }
}

// ----- Core logic (two rolls + crit on action 20) -----

function resetSession() {
  phase = 1;
  rollCount = 0;
  lastActionId = null;
  awaitingPartnerTurn = false;
  clothingPromptsEnabled = true;
  saveState();
  clearMessages();
  notifyPhaseChange(phase);
  updatePhaseUI(phase, rollCount);
  exerciseOutput.textContent =
    'New session started. Roll two d20s (and optional d6) to begin Phase 1.';
  if (clothingOutput) clothingOutput.textContent = '';
}

function handleUserRoll() {
  clearMessages();

  const locRaw = locationRollInput.value;
  const actRaw = actionRollInput.value;

  const loc = Number(locRaw);
  let act = Number(actRaw);

  const validLoc = Number.isInteger(loc) && loc >= 1 && loc <= 20;
  const validAct = Number.isInteger(act) && act >= 1 && act <= 20;

  if (!validLoc || !validAct) {
    errorBox.textContent =
      'Please enter whole numbers between 1 and 20 for both d20 rolls.';
    return;
  }

  // optional clothing roll
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
    messageBox.textContent = '⭐ Critical roll! This action gets extended time.';
    flashMessage('flash');
  }

  // repeat detection (only when not a crit)
  let isRepeat = false;
  if (!extendedTime) {
    if (lastActionId !== null && lastActionId === act) {
      isRepeat = true;
    }
  }
  lastActionId = act;

  showExercise(phase, loc, act);

  if (extendedTime) {
    exerciseOutput.textContent +=
      ' Spend about twice as long on this location.';
  } else if (isRepeat) {
    messageBox.textContent =
      '🔁 Repeat action rolled. Explore how it feels this time.';
    flashMessage('repeat-flash');
  }

  // Clothing prompt output
  if (clothingOutput) {
    if (!clothingPromptsEnabled || clothingRoll === null) {
      clothingOutput.textContent = '';
    } else {
      const clothingText = clothingTable[clothingRoll];
      clothingOutput.textContent = clothingText || '';
    }
  }

  // Round tracking: two uses of handleUserRoll = one round
  if (!awaitingPartnerTurn) {
    awaitingPartnerTurn = true;
  } else {
    awaitingPartnerTurn = false;

    rollCount++;

    const internalRoll = 1 + Math.floor(Math.random() * 20); // 1–20

    if (internalRoll < rollCount && phase < maxPhase) {
      phase++;
      rollCount = 0;
      notifyPhaseChange(phase);
      flashMessage('flash');
    }
  }

  saveState();
  updatePhaseUI(phase, rollCount);

  locationRollInput.value = '';
  actionRollInput.value = '';
  if (clothingRollInput) clothingRollInput.value = '';
}

// ----- Wire up events -----

submitRollBtn.addEventListener('click', handleUserRoll);

locationRollInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') handleUserRoll();
});
actionRollInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') handleUserRoll();
});
if (clothingRollInput) {
  clothingRollInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') handleUserRoll();
  });
}

newSessionBtn.addEventListener('click', resetSession);

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
timer30Btn.addEventListener('click', () => startTimer(30));  // 30 sec
timer1Btn.addEventListener('click', () => startTimer(60));   // 1 min
timer2Btn.addEventListener('click', () => startTimer(120));  // 2 min
timer5Btn.addEventListener('click', () => startTimer(300));  // 5 min

// ----- Initialize UI on load -----

updatePhaseUI(phase, rollCount);
updateTimerDisplay();
notifyPhaseChange(phase);

if (rollCount > 0 || phase > 1) {
  exerciseOutput.textContent =
    'Resuming your last session. Enter both rolls when you are ready.';
} else {
  exerciseOutput.textContent =
    'Enter both d20 rolls (and optional d6) to get your first prompt.';
}
