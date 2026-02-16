'use strict';
// ----- UI helper functions -----

// Global DOM references
let messageBox, whereOutput, whatOutput, instructionOutput, clothingOutput, timerSound;

// Reliable way to find the output display box (works with both old and new HTML)
function getOutputDisplayBox() {
  // Try the new ID first, then fall back to finding it via the whereOutput span
  let box = document.getElementById('outputDisplayBox');
  if (box) return box;
  const span = document.getElementById('whereOutput');
  // whereOutput is inside <div class="output"> inside the container div
  if (span && span.parentElement && span.parentElement.parentElement) {
    return span.parentElement.parentElement;
  }
  return null;
}

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
  const positionRoll2Col = document.getElementById('positionRoll2Col');

  if (!locationLabel || !actionLabel) return;

  const viewPositionRefBtn = document.getElementById('viewPositionRefBtn');
  const favoritePositionBtn = document.getElementById('favoritePositionBtn');
  const viewFavoritesBtn = document.getElementById('viewFavoritesBtn');
  if (currentPhase === 3) {
    locationLabel.textContent = 'Position die 1 (1–20)';
    actionLabel.textContent = 'Modifier (1–20)';
    if (positionRoll2Col) positionRoll2Col.style.display = '';
    // Check if current position is Roller's choice (64 or 127) - these don't have images
    // Access currentPrompt from state.js (it's a global variable)
    const isRollersChoice = typeof currentPrompt !== 'undefined' && currentPrompt && 
      currentPrompt.phase === 3 && (currentPrompt.locationRoll === 64 || currentPrompt.locationRoll === 127);
    if (viewPositionRefBtn) {
      viewPositionRefBtn.style.display = (isRollersChoice) ? 'none' : 'inline-block';
    }
    if (favoritePositionBtn) favoritePositionBtn.style.display = 'inline-block';
    if (viewFavoritesBtn) viewFavoritesBtn.style.display = 'inline-block';
  } else {
    locationLabel.textContent = 'Location roll (1–20)';
    actionLabel.textContent = 'Action roll (1–20)';
    if (positionRoll2Col) positionRoll2Col.style.display = 'none';
    if (viewPositionRefBtn) viewPositionRefBtn.style.display = 'none';
    if (favoritePositionBtn) favoritePositionBtn.style.display = 'none';
    if (viewFavoritesBtn) viewFavoritesBtn.style.display = 'none';
  }
}

function updateOutputLabels(currentPhase) {
  const whereLabel = document.getElementById('whereLabel');
  const whatLabel = document.getElementById('whatLabel');

  if (!whereLabel || !whatLabel) return;

  if (currentPhase === 3) {
    whereLabel.textContent = 'Position:';
    whatLabel.textContent = 'How:';
  } else {
    whereLabel.textContent = 'Where:';
    whatLabel.textContent = 'What to do:';
  }
}

/**
 * Prompt detail: Beginner = full text (need the info), Regular = some removed, Expert = short (more variety later).
 * Shorten prompt text for Regular (medium) and Expert (short) modes.
 * @param {string} fullText - Full prompt text
 * @param {'where'|'what'} kind - Type of prompt
 * @returns {string} - Full, medium, or short text depending on promptDetailMode
 */
function shortenForDetailMode(fullText, kind) {
  if (typeof fullText !== 'string' || !fullText.trim()) return fullText || '';
  const mode = typeof promptDetailMode !== 'undefined' ? promptDetailMode : 'regular';
  // Beginner = same as regular (same info level)

  if (kind === 'where') {
    const colonIdx = fullText.indexOf(': ');
    const titlePart = colonIdx > 0 && colonIdx < 80 ? fullText.slice(0, colonIdx).trim() : null;
    if (mode === 'expert') {
      return titlePart || fullText.slice(0, 55).trim() + (fullText.length > 55 ? '…' : '');
    }
    // Regular: first sentence or first 120 chars
    if (titlePart && titlePart.length <= 120) return titlePart;
    const firstSentence = fullText.match(/^[^.!?]+[.!?]?/);
    if (firstSentence && firstSentence[0].length <= 120) return firstSentence[0].trim();
    if (fullText.length <= 120) return fullText;
    return fullText.slice(0, 120).trim() + '…';
  }

  if (kind === 'what') {
    if (mode === 'expert') {
      const firstSentence = fullText.match(/^[^.!?]+[.!?]?/);
      if (firstSentence && firstSentence[0].length <= 65) return firstSentence[0].trim();
      return fullText.length <= 65 ? fullText : fullText.slice(0, 65).trim() + '…';
    }
    // Regular: full text (no truncation) so the instruction line is not cut off
    return fullText;
  }

  return fullText;
}

/**
 * Delay in ms before speaking the next prompt (guided mode). Beginner = same as regular; Expert = shorter.
 */
function getPromptAnnounceDelayMs() {
  const mode = typeof promptDetailMode !== 'undefined' ? promptDetailMode : 'regular';
  if (mode === 'expert') return 2000;
  return 4000; // beginner and regular same
}

/**
 * Apply penetration preference to prompt text. When minimal and text mentions penetration, append a focus-on-external line to what.
 * @param {string} where - Where/position text
 * @param {string} what - What/action/modifier text
 * @param {number} currentPhase - 1, 2, or 3
 * @returns {{ where: string, what: string }}
 */
function applyPenetrationPreference(where, what, currentPhase) {
  const pref = typeof penetrationPreference !== 'undefined' ? penetrationPreference : 'prefer';
  if (pref !== 'minimal') return { where: where || '', what: what || '' };
  const combined = ((where || '') + ' ' + (what || '')).toLowerCase();
  if (!combined.includes('penetration')) return { where: where || '', what: what || '' };
  const line = 'Focus on external play; penetration only if you both want.';
  const newWhat = (what || '').trim() + (what ? '. ' : '') + line;
  return { where: where || '', what: newWhat };
}

/**
 * Apply exclude-body-part preferences to action/what text (feet and licking only affect text).
 * Uses isBodyPartExcluded(key) so either "when touching" or "when touched" counts.
 * @param {string} what - What/action text
 * @returns {string}
 */
function applyExcludeBodyPreferences(what) {
  if (!what || typeof what !== 'string') return what || '';
  let out = what;
  if (typeof isBodyPartExcluded === 'function' && isBodyPartExcluded('feet')) {
    out = out.replace(/\s*,\s*feet\s*/gi, ', ');
    out = out.replace(/\s*feet\s*,\s*/gi, ', ');
    out = out.replace(/\s+or\s+feet\s+/gi, ' ');
    out = out.replace(/\s+feet\s+or\s+/gi, ' ');
    out = out.replace(/\bhands,\s*mouth,\s*feet,\s*or\s*genitals\b/gi, 'hands, mouth, or genitals');
    out = out.replace(/\s+/g, ' ').trim();
  }
  if (typeof isBodyPartExcluded === 'function' && isBodyPartExcluded('licking')) {
    out = out.replace(/\blicking\b/gi, 'kissing');
    out = out.replace(/\blick\b/gi, 'kiss');
    out = out.replace(/\s+/g, ' ').trim();
  }
  return out;
}

/**
 * Remove parenthetical asides from text so instructions read more cleanly.
 * @param {string} text
 * @returns {string}
 */
function stripParentheticals(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Turn Where and What into one flowing instruction that reads as a cohesive sentence or short paragraph.
 * Strips redundant "GiverName: " from what, strips parentheticals, and joins with where using a comma (phase 1/2) or period (phase 3).
 * @param {string} where - Where/position text (e.g. "Alex touches Sam's Nipples / Areolas")
 * @param {string} what - What/action text (e.g. "Alex: Feather-light fingertips: Use only...")
 * @param {number} phase - 1, 2, or 3
 * @returns {string} - Single flowing instruction
 */
function toFlowingInstruction(where, what, phase) {
  let w = (where || '').trim();
  let wt = (what || '').trim();
  w = stripParentheticals(w);
  wt = stripParentheticals(wt);
  if (!w && !wt) return '';
  if (!wt) return w;
  if (!w) return wt;

  // Strip leading "GiverName: " from what so we don't repeat the name
  let rest = wt;
  const touchesMatch = w.match(/^([^:]+?)\s+touches\s+/i);
  const leadsMatch = w.match(/^([^:]+?)\s+leads\s*[:\s]/i);
  const giver = (touchesMatch && touchesMatch[1]) || (leadsMatch && leadsMatch[1]);
  if (giver && typeof giver === 'string') {
    const prefix = giver.trim() + ': ';
    if (rest.toLowerCase().startsWith(prefix.toLowerCase())) {
      rest = rest.slice(prefix.length).trim();
      if (rest.length > 0) rest = rest.charAt(0).toLowerCase() + rest.slice(1);
    }
  }

  // Join where and how/what intelligently - check if "what" already has a connector word
  const wTrimmed = w.replace(/\.\s*$/, '').trim();
  if (rest.length === 0) return wTrimmed;
  
  // Lowercase the start of rest for smooth joining
  rest = rest.charAt(0).toLowerCase() + rest.slice(1);
  
  // Check if rest already contains connector words that make "with" redundant
  const restLower = rest.toLowerCase();
  const hasUsing = /^\s*using\s+/i.test(rest);
  const hasWith = /\bwith\b/i.test(rest);
  const hasBy = /^\s*by\s+/i.test(rest);
  const hasThrough = /^\s*through\s+/i.test(rest);
  const hasVia = /^\s*via\s+/i.test(rest);
  
  let connector = '';
  if (hasUsing || hasWith) {
    // Already has "using" or "with" - just join with a comma or period
    connector = (phase === 3) ? '. ' : ', ';
  } else if (hasBy) {
    // "by" suggests a method - join with comma
    connector = ', ';
  } else if (hasThrough || hasVia) {
    // "through" or "via" suggests a method - join with comma
    connector = ', ';
  } else {
    // Default: use "with" to create a natural phrase
    connector = ' with ';
  }
  
  const out = wTrimmed + connector + rest;
  let result = out.replace(/\.\s*\./g, '.');
  // Ensure colons have space on both sides
  result = result.replace(/(\S):/g, '$1 :').replace(/:(\S)/g, ': $1');
  return result.trim();
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

  // Update output labels for Phase 3
  if (typeof updateOutputLabels === 'function') {
    updateOutputLabels(newPhase);
  }

  if (!messageBox) return;

  const pickPhase = (arr) => arr[Math.floor(Math.random() * arr.length)];
  if (newPhase === 1) {
    const options = [
      'Now in Phase 1: getting in touch with the body.',
      'Phase 1: getting in touch with the body.',
      'Moving into Phase 1: gentle, body-focused connection.',
    ];
    messageBox.textContent = pickPhase(options);
  } else if (newPhase === 2) {
    const options = [
      'We are now moving into Phase 2: more erogenous exploration. Check in with each other before continuing.',
      'Phase 2: more erogenous exploration. Check in with each other before continuing.',
      'Moving into Phase 2: deeper touch and exploration. Check in before continuing.',
    ];
    messageBox.textContent = pickPhase(options);
  } else if (newPhase === 3) {
    const options = [
      'We are now moving into Phase 3: deep intimacy. Positions, rhythm, and shared pleasure. Penetration and orgasm are options only if you both want.',
      'Phase 3: deep intimacy. Positions, rhythm, and shared pleasure. Penetration and orgasm are options only if you both want.',
      'Moving into Phase 3: deep intimacy, positions, and shared pleasure. Penetration and orgasm only if you both want.',
    ];
    messageBox.textContent = pickPhase(options);
  } else {
    const options = [`Now in Phase ${newPhase}.`, `Phase ${newPhase}.`, `Moving into Phase ${newPhase}.`];
    messageBox.textContent = pickPhase(options);
  }

  // Pulse the phase number display
  const phaseDisplay = document.getElementById('phaseDisplay');
  if (phaseDisplay) {
    phaseDisplay.classList.remove("pulse");
    void phaseDisplay.offsetWidth;
    phaseDisplay.classList.add("pulse");
  }

  // Announce phase change via TTS (skip if landing modal visible or session start to avoid overriding intro/break flow)
  if (typeof speakText === 'function' && messageBox) {
    const landingModal = document.getElementById('landingModal');
    const isSessionStart = typeof totalTurnsInSession !== 'undefined' && totalTurnsInSession === 0;
    if (!landingModal || landingModal.style.display !== 'flex') {
      if (!isSessionStart) speakText(messageBox.textContent);
    }
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

function renderList(elementId, dataObj) {
  const ul = document.getElementById(elementId);
  if (!ul) return;
  while (ul.firstChild) ul.removeChild(ul.firstChild);

  Object.keys(dataObj).forEach((key) => {
    const li = document.createElement('li');
    li.textContent = `${key}. ${dataObj[key]}`;
    ul.appendChild(li);
  });
}

function renderCurrentLocations(locationsObj) {
  renderList('currentLocationsList', locationsObj);
}

function renderCurrentActions(actionsObj) {
  renderList('currentActionsList', actionsObj);
}

function renderPhaseSummary(phaseNumber) {
  const table = tables[phaseNumber];
  if (!table) return;

  // Update section headers based on phase
  const locationsHeader = document.getElementById('locationsHeader');
  const actionsHeader = document.getElementById('actionsHeader');

  if (phaseNumber === 3) {
    if (locationsHeader) locationsHeader.textContent = 'Positions';
    if (actionsHeader) actionsHeader.textContent = 'Modifiers';
    const positions = table.positions || {};
    const positionsDisplay = {};
    Object.keys(positions).forEach(function (k) {
      const v = positions[k];
      positionsDisplay[k] = typeof v === 'string' ? v : (v && (v.penisVulva || v.vulvaVulva || v.vulvaPenis || v.penisPenis)) || '';
    });
    renderCurrentLocations(positionsDisplay);
    renderCurrentActions(table.modifiers || {});
  } else {
    if (locationsHeader) locationsHeader.textContent = 'Locations';
    if (actionsHeader) actionsHeader.textContent = 'Actions';
    renderCurrentLocations(table.locations || {});
    renderCurrentActions(table.actions || {});
  }
}

function showToast(message, duration = 4000) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fadeOut');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
}

function showFirstTurnPopup(text) {
  const popup = document.getElementById('firstTurnPopup');
  const body = document.getElementById('firstTurnPopupBody');
  if (popup && body) {
    body.textContent = text;
    popup.style.display = 'flex';
  }
}

function hideFirstTurnPopup() {
  const popup = document.getElementById('firstTurnPopup');
  if (popup) popup.style.display = 'none';
}
