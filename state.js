'use strict';
// ----- State & persistence -----

let phase = 1;
let rollCount = 0;
const maxPhase = 3;

let usedWhereThisPhase = new Set(); // location/position rolls seen this phase
let usedWhatThisPhase  = new Set(); // action/modifier rolls seen this phase
let awaitingPartnerTurn = false;   // two turns = one round
let clothingPromptsEnabled = true; // can be turned off

// ----- Guided mode state -----
let isGuidedMode = false;
let guidedTotalSeconds = 0;
let guidedPhaseSeconds = [0, 0, 0]; // time allocated per phase (array for custom distribution)
let guidedPhaseTimeRemaining = 0;
let guidedTurnSeconds = 120; // default 2 min per turn
let guidedTurnTimeRemaining = 0;
let guidedPauseSeconds = 30; // default 30 sec pause between turns
let guidedPauseTimeRemaining = 0;
let guidedClothingRemovalSeconds = 30; // default 30 sec extra for clothing removal
let guidedInPause = false; // true when in pause between turns
let guidedCurrentPartner = 1; // 1 or 2
let guidedPhaseTimerId = null;
let guidedTurnTimerId = null;
let guidedPaused = false;
let guidedDistributionMode = 'equal'; // 'equal', 'phase1', 'phase2', 'phase3', or 'custom'

// ----- Clothing system state -----
let clothingItems = []; // Array of clothing items currently worn (Guided Mode)
let clothingMilestoneInterval = 3; // Remove clothing every N turns
let turnsSinceLastRemoval = 0;
let clothingSystemEnabled = true;
let totalTurnsInSession = 0;

// Free Play specific clothing state
let freePlayClothingEnabled = false;
let freePlayClothingItemsP1 = [];
let freePlayClothingItemsP2 = [];
let freePlayCurrentReceiver = 1; // 1 or 2 - who is receiving touch

// Partner display names (optional; fallback to "Partner 1" / "Partner 2")
let partnerName1 = '';
let partnerName2 = '';

// Current prompt (for "Need help understanding?" – set when a prompt is shown)
let currentPrompt = null; // { phase, locationRoll, actionRoll }

function setCurrentPrompt(phaseNum, locationRoll, actionRoll) {
  currentPrompt = (phaseNum != null && locationRoll != null && actionRoll != null)
    ? { phase: phaseNum, locationRoll, actionRoll }
    : null;
}

/**
 * Display name for partner 1 or 2 (for UI and TTS).
 * @param {1|2} partnerNum - Partner number
 * @returns {string} - Custom name or "Partner 1" / "Partner 2"
 */
function getPartnerName(partnerNum) {
  if (partnerNum === 1) {
    const name = (partnerName1 || '').trim();
    return name || 'Partner 1';
  }
  if (partnerNum === 2) {
    const name = (partnerName2 || '').trim();
    return name || 'Partner 2';
  }
  return partnerNum === 1 ? 'Partner 1' : 'Partner 2';
}

function saveState() {
  const state = {
    phase,
    rollCount,
    isGuidedMode,
    guidedTotalSeconds,
    guidedPhaseSeconds,
    guidedPhaseTimeRemaining,
    guidedTurnSeconds,
    guidedTurnTimeRemaining,
    guidedPauseSeconds,
    guidedPauseTimeRemaining,
    guidedClothingRemovalSeconds,
    guidedInPause,
    guidedCurrentPartner,
    guidedPaused,
    guidedDistributionMode,
    clothingItems,
    clothingMilestoneInterval,
    turnsSinceLastRemoval,
    clothingSystemEnabled,
    totalTurnsInSession,
    freePlayClothingEnabled,
    freePlayClothingItemsP1,
    freePlayClothingItemsP2,
    freePlayCurrentReceiver,
    partnerName1,
    partnerName2,
    clothingPromptsEnabled,
    awaitingPartnerTurn,
    currentPrompt,
    lastSaveTime: Date.now()
  };
  
  localStorage.setItem('intimacyGameState', JSON.stringify(state));
}

function loadState() {
  try {
    const saved = localStorage.getItem('intimacyGameState');
    if (!saved) return false;
    
    const state = JSON.parse(saved);
    
    // Validate basic structure
    if (typeof state !== 'object' || state === null) return false;
    
    // Validate and clamp phase
    const rawPhase = Number(state.phase);
    phase = (Number.isInteger(rawPhase) && rawPhase >= 1 && rawPhase <= maxPhase) ? rawPhase : 1;
    rollCount = Math.max(0, Number(state.rollCount) || 0);
    
    // Restore guided mode state
    isGuidedMode = state.isGuidedMode || false;
    guidedTotalSeconds = state.guidedTotalSeconds || 0;
    guidedPhaseSeconds = state.guidedPhaseSeconds || [0, 0, 0];
    guidedPhaseTimeRemaining = state.guidedPhaseTimeRemaining || 0;
    guidedTurnSeconds = state.guidedTurnSeconds || 120;
    guidedTurnTimeRemaining = state.guidedTurnTimeRemaining || 0;
    guidedPauseSeconds = state.guidedPauseSeconds || 30;
    guidedPauseTimeRemaining = state.guidedPauseTimeRemaining || 0;
    guidedClothingRemovalSeconds = state.guidedClothingRemovalSeconds || 30;
    guidedInPause = state.guidedInPause || false;
    guidedCurrentPartner = state.guidedCurrentPartner || 1;
    guidedPaused = true; // Always pause on load
    guidedDistributionMode = state.guidedDistributionMode || 'equal';
    
    // Restore clothing state
    clothingItems = state.clothingItems || [];
    clothingMilestoneInterval = state.clothingMilestoneInterval || 3;
    turnsSinceLastRemoval = state.turnsSinceLastRemoval || 0;
    clothingSystemEnabled = state.clothingSystemEnabled !== undefined ? state.clothingSystemEnabled : true;
    totalTurnsInSession = state.totalTurnsInSession || 0;
    
    // Restore free play state
    freePlayClothingEnabled = state.freePlayClothingEnabled || false;
    freePlayClothingItemsP1 = state.freePlayClothingItemsP1 || [];
    freePlayClothingItemsP2 = state.freePlayClothingItemsP2 || [];
    freePlayCurrentReceiver = state.freePlayCurrentReceiver || 1;
    partnerName1 = state.partnerName1 || '';
    partnerName2 = state.partnerName2 || '';

    // Restore other state
    clothingPromptsEnabled = state.clothingPromptsEnabled !== undefined ? state.clothingPromptsEnabled : true;
    awaitingPartnerTurn = state.awaitingPartnerTurn || false;
    currentPrompt = state.currentPrompt && typeof state.currentPrompt.phase === 'number' && typeof state.currentPrompt.locationRoll === 'number' && typeof state.currentPrompt.actionRoll === 'number'
      ? { phase: state.currentPrompt.phase, locationRoll: state.currentPrompt.locationRoll, actionRoll: state.currentPrompt.actionRoll }
      : null;
    
    // Only consider state worth restoring if there's actual progress
    // (not just a default fresh state that got auto-saved)
    const hasProgress = isGuidedMode
      || rollCount > 0
      || phase > 1
      || freePlayClothingItemsP1.length > 0
      || freePlayClothingItemsP2.length > 0;
    
    if (!hasProgress) {
      // Reset to defaults and treat as fresh start
      clearSavedState();
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Error loading state:', e);
    return false;
  }
}

function clearSavedState() {
  localStorage.removeItem('intimacyGameState');
}
