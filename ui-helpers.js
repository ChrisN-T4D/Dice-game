// ----- UI helper functions -----

// Global DOM references
let messageBox, whereOutput, whatOutput, clothingOutput, timerSound;

function clearMessages() {
  if (messageBox) messageBox.textContent = '';
  const errorBox = document.getElementById('error');
  if (errorBox) errorBox.textContent = '';
}

function flashMessage(className = 'flash') {
  if (!messageBox) return;
  messageBox.classList.remove('flash', 'repeat-flash');
  void messageBox.offsetWidth;
  messageBox.classList.add(className);
  setTimeout(() => {
    messageBox.classList.remove(className);
  }, 650);
}

function updatePhaseUI(currentPhase, currentRollCount) {
  const phaseDisplay = document.getElementById('phaseDisplay');
  const rollCountDisplay = document.getElementById('rollCountDisplay');
  if (phaseDisplay) phaseDisplay.textContent = String(currentPhase);
  if (rollCountDisplay) rollCountDisplay.textContent = String(currentRollCount);
}

function updateRollLabels(currentPhase) {
  const locationLabel = document.getElementById('locationLabel');
  const actionLabel = document.getElementById('actionLabel');

  if (!locationLabel || !actionLabel) return;

  if (currentPhase === 3) {
    locationLabel.textContent = 'Position roll d20';
    actionLabel.textContent = 'Modifier roll d20';
  } else {
    locationLabel.textContent = 'Location roll d20';
    actionLabel.textContent = 'Action roll d20';
  }
}

// ----- Phase change messaging & theming -----

function notifyPhaseChange(newPhase) {
  document.body.classList.remove('phase-1', 'phase-2', 'phase-3');
  document.body.classList.add(`phase-${newPhase}`);

  const phaseFlash = document.getElementById("phaseFlash");
  if (phaseFlash) {
    phaseFlash.classList.remove("run");
    void phaseFlash.offsetWidth;
    phaseFlash.classList.add("run");
  }

  if (!messageBox) return;

  if (newPhase === 1) {
    messageBox.textContent = 'Now in Phase 1: gentle, non‑genital warm‑up.';
  } else if (newPhase === 2) {
    messageBox.textContent =
      'You've unlocked Phase 2: more erogenous exploration. Check in with each other before continuing.';
  } else if (newPhase === 3) {
    messageBox.textContent =
      'You've unlocked Phase 3: explicitly sexual goals. Proceed only if both partners actively consent.';
  } else {
    messageBox.textContent = `Now in Phase ${newPhase}.`;
  }

  // Pulse the phase number display
  const phaseDisplay = document.getElementById('phaseDisplay');
  if (phaseDisplay) {
    phaseDisplay.classList.remove("pulse");
    void phaseDisplay.offsetWidth;
    phaseDisplay.classList.add("pulse");
  }
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
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(timerRemainingSeconds);
  }
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

      if (messageBox) {
        messageBox.textContent =
          'Timer finished. Check in with each other about how that action felt.';
      }
    } else {
      updateTimerDisplay();
    }
  }, 1000);
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
