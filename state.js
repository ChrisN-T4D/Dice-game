// ----- State & persistence -----

let phase = Number(localStorage.getItem('sensatePhase')) || 1;
let rollCount = Number(localStorage.getItem('sensateRollCount')) || 0;
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
let guidedCurrentPartner = 1; // 1 or 2
let guidedPhaseTimerId = null;
let guidedTurnTimerId = null;
let guidedPaused = false;

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

function saveState() {
  localStorage.setItem('sensatePhase', String(phase));
  localStorage.setItem('sensateRollCount', String(rollCount));
}
