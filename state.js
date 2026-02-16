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
let clothingItems = []; // DEPRECATED – kept for backward compat; use guidedClothingItemsP1/P2
let guidedClothingItemsP1 = []; // Partner 1's remaining clothing (Guided Mode)
let guidedClothingItemsP2 = []; // Partner 2's remaining clothing (Guided Mode)
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

// Partner colors
let partnerColor1 = '#3b82f6'; // blue
let partnerColor2 = '#ec4899'; // pink

// Partner anatomical parts ('penis' or 'vulva')
let partnerAnatomy1 = 'penis';
let partnerAnatomy2 = 'vulva';

// Quickie double clothing removal
let quickieDoubleClothing = false;

// Prompt detail: 'beginner' = full descriptions, longer pause, slower speech; 'regular' = some detail removed, medium pace; 'expert' = short prompts, faster, more variety/variation options later
let promptDetailMode = 'regular';

// Penetration preference: 'prefer' = penetration is an option (default); 'minimal' = focus on external play, penetration only if both want
let penetrationPreference = 'prefer';

// Guided mode: pause at end of each phase for check-in before continuing (option in Preferences; default off for smoother flow)
let guidedPhaseCheckInEnabled = false;

// Vibrators available: when false, Phase 3 vibrator modifiers (17, 18, 19) are rerolled and vibrator/toy text is hidden
let vibratorsPresent = true;

// Exclude body parts: two modes — when I'm touching (giving) vs when I'm being touched (receiving). Each has checkboxes per body part.
const EXCLUDE_BODY_KEYS = ['feet', 'licking', 'nipples', 'genitals', 'buttocks', 'perineum'];
function defaultExcludeBody() {
  return { feet: false, licking: false, nipples: false, genitals: false, buttocks: false, perineum: false };
}
let excludeWhenTouching = defaultExcludeBody();
let excludeWhenTouched = defaultExcludeBody();

/** True if either "when touching" or "when touched" excludes this body part (used for reroll and text stripping). */
function isBodyPartExcluded(key) {
  return (excludeWhenTouching[key] === true) || (excludeWhenTouched[key] === true);
}

/** Location rolls that fall into each body-part category (phase -> category -> roll numbers). Reroll if that category is excluded. */
const LOCATION_CATEGORIES = {
  1: {
    feet: [17, 18],           // Behind the Knees, Feet / Arches
    licking: [],               // (mouth/licking is action in P1)
    nipples: [6, 7],           // Nipples/Areolas, Chest/Breasts
    genitals: [19],            // Primary Genitals
    buttocks: [14],            // Buttocks
    perineum: [15]             // Perineum
  },
  2: {
    feet: [],
    licking: [1],              // Mouth: inner lips and tongue
    nipples: [6, 7, 8],        // Nipples, Nipple–areola, Full breast/pec
    genitals: [16, 17, 18],    // Outer vulva, Penis/scrotum, Genital edges
    buttocks: [13],            // Buttocks and crease
    perineum: [15]             // Perineum
  },
  3: {}  // Phase 3 uses positions, not location rolls; no per-location exclude
};

/** Action rolls (Phase 1 only) that fall into feet or licking. Phase 2 feet is text-only. */
const ACTION_CATEGORIES_P1 = {
  feet: [17, 18, 19],          // Foot strokes, Foot tracing, Toe taps
  licking: [13]                // Soft tongue
};

function shouldRerollLocation(phase, locationRoll) {
  const cats = LOCATION_CATEGORIES[phase];
  if (!cats) return false;
  for (const key of EXCLUDE_BODY_KEYS) {
    if (!isBodyPartExcluded(key)) continue;
    const rolls = cats[key];
    if (rolls && rolls.indexOf(locationRoll) !== -1) return true;
  }
  return false;
}

function shouldRerollActionPhase1(actionRoll) {
  for (const key of EXCLUDE_BODY_KEYS) {
    if (!isBodyPartExcluded(key)) continue;
    const rolls = ACTION_CATEGORIES_P1[key];
    if (rolls && rolls.indexOf(actionRoll) !== -1) return true;
  }
  return false;
}

/** Phase 3 modifier rolls that require a vibrator/toy (17 = Vibrator ladder, 18 = Pulse vs steady, 19 = Hand + toy duet). */
function isPhase3VibratorModifier(roll) {
  return roll === 17 || roll === 18 || roll === 19;
}

// Phase 3 position preference for visuals: 'bed_only' = exclude standing/carrying/balance; 'more_physical' = allow all (including standing, carrying, weight/balance)
let positionIntensity = 'more_physical';

// Phase 3: include anal positions. When false, anal-oriented positions (parallel angle, e.g. reverse missionary, on-back) are rerolled; perpendicular (e.g. doggy) can still appear.
let analPositionsEnabled = true;

/** Phase 3 effort groups to include (null = all). When set, only positions whose effort (bed, standing, heavy) is in this array are allowed; others rerolled. */
let phase3EnabledGroupIds = null;

/** Phase 3: when true, each turn in Phase 3 gets double the usual turn length (guided mode). */
let phase3DoubleTime = false;

/** Phase 3 position numbers (1–100) that need standing, carrying, or heavy weight/balance; from phase3-positions-data.js when available. */
const PHASE3_MORE_PHYSICAL_POSITIONS = (typeof PHASE3_MORE_PHYSICAL_POSITION_NUMBERS !== 'undefined' ? PHASE3_MORE_PHYSICAL_POSITION_NUMBERS : [8, 10, 15, 18, 19]);

/** Phase 3 position numbers (1–156) that are anal-oriented (parallel angle); from phase3-positions-data.js when available. */
const PHASE3_ANAL_POSITIONS = (typeof PHASE3_ANAL_POSITION_NUMBERS !== 'undefined' ? PHASE3_ANAL_POSITION_NUMBERS : []);

function shouldRerollPhase3Position(positionRoll) {
  if (positionIntensity === 'bed_only' && PHASE3_MORE_PHYSICAL_POSITIONS.indexOf(positionRoll) !== -1) return true;
  if (!analPositionsEnabled && PHASE3_ANAL_POSITIONS.indexOf(positionRoll) !== -1) return true;
  if (phase3EnabledGroupIds != null && Array.isArray(phase3EnabledGroupIds) && phase3EnabledGroupIds.length > 0 && typeof getPhase3PositionEffortGroup === 'function') {
    const effortGroup = getPhase3PositionEffortGroup(positionRoll);
    if (effortGroup && phase3EnabledGroupIds.indexOf(effortGroup) === -1) return true;
  }
  return false;
}

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
    guidedClothingItemsP1,
    guidedClothingItemsP2,
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
    partnerColor1,
    partnerColor2,
    partnerAnatomy1,
    partnerAnatomy2,
    quickieDoubleClothing,
    promptDetailMode,
    penetrationPreference,
    guidedPhaseCheckInEnabled,
    vibratorsPresent,
    excludeWhenTouching,
    excludeWhenTouched,
    positionIntensity,
    analPositionsEnabled,
    phase3EnabledGroupIds,
    phase3DoubleTime,
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
    guidedClothingItemsP1 = state.guidedClothingItemsP1 || [];
    guidedClothingItemsP2 = state.guidedClothingItemsP2 || [];
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
    partnerColor1 = state.partnerColor1 || '#3b82f6';
    partnerColor2 = state.partnerColor2 || '#ec4899';
    partnerAnatomy1 = state.partnerAnatomy1 || 'penis';
    partnerAnatomy2 = state.partnerAnatomy2 || 'vulva';
    quickieDoubleClothing = state.quickieDoubleClothing || false;
    promptDetailMode = (state.promptDetailMode === 'beginner' || state.promptDetailMode === 'expert') ? state.promptDetailMode : 'regular';
    penetrationPreference = (state.penetrationPreference === 'minimal') ? 'minimal' : 'prefer';
    guidedPhaseCheckInEnabled = state.guidedPhaseCheckInEnabled === true;
    vibratorsPresent = state.vibratorsPresent !== false;
    if (state.excludeWhenTouching && typeof state.excludeWhenTouching === 'object') {
      excludeWhenTouching = { ...defaultExcludeBody(), ...state.excludeWhenTouching };
    }
    if (state.excludeWhenTouched && typeof state.excludeWhenTouched === 'object') {
      excludeWhenTouched = { ...defaultExcludeBody(), ...state.excludeWhenTouched };
    }
    if (state.excludeFeet === true || state.excludeLicking === true) {
      if (state.excludeFeet === true) {
        excludeWhenTouching.feet = true;
        excludeWhenTouched.feet = true;
      }
      if (state.excludeLicking === true) {
        excludeWhenTouching.licking = true;
        excludeWhenTouched.licking = true;
      }
    }
    positionIntensity = (state.positionIntensity === 'bed_only') ? 'bed_only' : 'more_physical';
    analPositionsEnabled = state.analPositionsEnabled !== undefined ? state.analPositionsEnabled : true;
    phase3EnabledGroupIds = (state.phase3EnabledGroupIds && Array.isArray(state.phase3EnabledGroupIds)) ? state.phase3EnabledGroupIds : null;
    phase3DoubleTime = state.phase3DoubleTime === true;

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

// ----- Favorites (Phase 3 positions only); stored locally, no database -----
const FAVORITES_STORAGE_KEY = 'intimacyGameFavorites';

function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(n => Number.isInteger(n) && n >= 1 && n <= 156) : [];
  } catch (e) {
    return [];
  }
}

function saveFavoritesToStorage(favorites) {
  const arr = Array.isArray(favorites) ? favorites : getFavorites();
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(arr));
}

function isFavorite(positionNumber) {
  const n = parseInt(positionNumber, 10);
  if (n < 1 || n > 156) return false;
  return getFavorites().indexOf(n) !== -1;
}

function addFavorite(positionNumber) {
  const n = parseInt(positionNumber, 10);
  if (n < 1 || n > 156) return getFavorites();
  const fav = getFavorites();
  if (fav.indexOf(n) !== -1) return fav;
  const next = [...fav, n].sort((a, b) => a - b);
  saveFavoritesToStorage(next);
  return next;
}

function removeFavorite(positionNumber) {
  const n = parseInt(positionNumber, 10);
  const fav = getFavorites().filter(x => x !== n);
  saveFavoritesToStorage(fav);
  return fav;
}

function toggleFavorite(positionNumber) {
  if (isFavorite(positionNumber)) {
    return removeFavorite(positionNumber);
  }
  return addFavorite(positionNumber);
}
