/* ============================================================
   MapMaster | state.js
   Game state object and shared runtime variables.
   Depends on: data.js
   ============================================================ */

let currentMapKey   = "india";
let previousScreen  = "start";
let CURRENT_REGIONS = MAPS[currentMapKey].regions;
let svgLoaded       = false;

const CONTINENT_KEYS = ["europe", "northAmerica", "southAmerica", "africa", "asia", "oceania"];

/** Returns "Countries" for world/continent maps, "States" for country maps */
function regionLabel() {
  return (currentMapKey === "world" || CONTINENT_KEYS.includes(currentMapKey))
    ? "Countries" : "States";
}

const normalize = (str) => str.toLowerCase().replace(/\s+/g, "");

/* ============================================================
   GAME STATE
   ============================================================ */
const gameState = {
  gameType:       null,   // "typing" | "locate" | "flag" | "capital"
  gameMode:       null,   // "practice" | "challenge"
  selectedTime:   null,
  selectedLives:  null,
  timeLeft:       0,
  livesLeft:      0,
  score:          0,
  bonusPoints:    0,      // UT easter egg bonus (India only)
  totalAttempts:  0,
  guessedStates:  [],
  guessedUTs:     [],
  missedRegions:  [],
  timerInterval:  null,
  startTime:      null,
  currentTarget:  null,
  currentStreak:  0,
  bestStreak:     0,
  reviewMode:     false,
};