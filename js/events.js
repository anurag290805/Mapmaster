/* ============================================================
   MapMaster | events.js
   All event listeners: navigation, setup, game controls,
   SVG load handler, zoom/pan, header actions.
   Depends on: all other JS files.
   ============================================================ */


/* ============================================================
   CHALLENGE SETTINGS — timer + lives selection
   ============================================================ */
const timerButtons = document.querySelectorAll("#timerSection button[data-time]");
const livesButtons = document.querySelectorAll("#livesSection button[data-lives]");

timerButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    gameState.selectedTime = parseInt(btn.dataset.time);
    setSelectedBtn([...timerButtons], btn);
  });
});

livesButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    gameState.selectedLives = parseInt(btn.dataset.lives);
    setSelectedBtn([...livesButtons], btn);
  });
});


/* ============================================================
   SETUP SCREEN — game type + mode
   ============================================================ */
const gameTypeButtons = [buttons.typingMode, buttons.locateMode, buttons.flagMode, buttons.capitalMode];
const gameModeButtons = [buttons.practiceMode, buttons.challengeMode];

function validateHomeStart() {
  if (homeStartBtn) homeStartBtn.disabled = !(gameState.gameType && gameState.gameMode);
}

function updateGameTypeAvailability() {
  const support = MAP_SUPPORT[currentMapKey] || { name: true, locate: true, flag: false, capital: false };
  if (buttons.typingMode)  buttons.typingMode.disabled  = !support.name;
  if (buttons.locateMode)  buttons.locateMode.disabled  = !support.locate;
  if (buttons.flagMode)    buttons.flagMode.disabled    = !support.flag;
  if (buttons.capitalMode) buttons.capitalMode.disabled = !support.capital;

  if (gameState.gameType === "flag"    && !support.flag)    { gameState.gameType = null; buttons.flagMode?.classList.remove("selected"); }
  if (gameState.gameType === "capital" && !support.capital) { gameState.gameType = null; buttons.capitalMode?.classList.remove("selected"); }
  validateHomeStart();
}

function updateLivesSectionVisibility() {
  if (!livesSection) return;
  if (gameState.gameType === "typing" || gameState.gameType === "flag" || gameState.gameType === "capital") {
    livesSection.classList.add("lives-hidden");
    gameState.selectedLives = null;
    document.querySelectorAll("#livesSection button").forEach(b => b.classList.remove("selected"));
  } else {
    livesSection.classList.remove("lives-hidden");
  }
}

buttons.typingMode.addEventListener("click", () => {
  gameState.gameType = "typing";
  setSelectedBtn(gameTypeButtons.filter(b => b), buttons.typingMode);
  updateLivesSectionVisibility();
  validateHomeStart();
});

buttons.locateMode.addEventListener("click", () => {
  gameState.gameType = "locate";
  setSelectedBtn(gameTypeButtons.filter(b => b), buttons.locateMode);
  updateLivesSectionVisibility();
  validateHomeStart();
});

if (buttons.flagMode) {
  buttons.flagMode.addEventListener("click", () => {
    gameState.gameType = "flag";
    setSelectedBtn(gameTypeButtons.filter(b => b), buttons.flagMode);
    updateLivesSectionVisibility();
    validateHomeStart();
  });
}

if (buttons.capitalMode) {
  buttons.capitalMode.addEventListener("click", () => {
    gameState.gameType = "capital";
    setSelectedBtn(gameTypeButtons.filter(b => b), buttons.capitalMode);
    updateLivesSectionVisibility();
    validateHomeStart();
  });
}

buttons.practiceMode.addEventListener("click", () => {
  gameState.gameMode = "practice";
  setSelectedBtn(gameModeButtons, buttons.practiceMode);
  validateHomeStart();
});

buttons.challengeMode.addEventListener("click", () => {
  gameState.gameMode = "challenge";
  setSelectedBtn(gameModeButtons, buttons.challengeMode);
  validateHomeStart();
});

if (homeStartBtn) {
  homeStartBtn.addEventListener("click", () => {
    if (!gameState.gameType || !gameState.gameMode) return;
    if (gameState.gameMode === "challenge") {
      showScreen("challenge");
    } else {
      gameState.selectedTime  = null;
      gameState.selectedLives = null;
      startGame();
    }
  });
}


/* ============================================================
   CHALLENGE SETTINGS — start game
   ============================================================ */
buttons.startGame.addEventListener("click", () => {
  if (!gameState.selectedTime) {
    alert("Please select a timer duration.");
    return;
  }
  if (gameState.gameType === "locate" && !gameState.selectedLives) {
    alert("Please select number of lives.");
    return;
  }
  gameState.timeLeft  = gameState.selectedTime;
  gameState.livesLeft = gameState.selectedLives || 0;
  startGame();
});


/* ============================================================
   SCOPE / NAVIGATION — start screen
   ============================================================ */
const countryScopeBtn   = document.getElementById("countryScopeBtn");
const continentScopeBtn = document.getElementById("continentScopeBtn");
const worldScopeBtn     = document.getElementById("worldScopeBtn");

if (countryScopeBtn)   countryScopeBtn.addEventListener("click",   () => showScreen("countrySelect", "forward"));
if (continentScopeBtn) continentScopeBtn.addEventListener("click", () => showScreen("continentSelect", "forward"));
if (worldScopeBtn) {
  worldScopeBtn.addEventListener("click", () => {
    applyMap("world");
    resetSetupSelections();
    showScreen("setup", "forward");
  });
}


/* ============================================================
   COUNTRY SELECT SCREEN
   ============================================================ */
const countryButtons     = document.querySelectorAll(".country-btn");
const countryContinueBtn = document.getElementById("countryContinueBtn");

countryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    countryButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    applyMap(btn.dataset.country);
    if (countryContinueBtn) countryContinueBtn.disabled = false;
  });
});

if (countryContinueBtn) {
  countryContinueBtn.addEventListener("click", () => {
    if (!currentMapKey) return;
    resetSetupSelections();
    showScreen("setup", "forward");
  });
}


/* ============================================================
   CONTINENT SELECT SCREEN
   ============================================================ */
const continentButtons = document.querySelectorAll(".continent-btn");

continentButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    continentButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    applyMap(btn.dataset.continent);
    resetSetupSelections();
    showScreen("setup", "forward");
  });
});

const continentBackBtn = document.getElementById("continentBackBtn");
if (continentBackBtn) {
  continentBackBtn.addEventListener("click", () => {
    continentButtons.forEach(b => b.classList.remove("selected"));
    showScreen("start", "back");
  });
}


/* ============================================================
   BACK BUTTONS
   ============================================================ */
const countryBackBtn   = document.getElementById("countryBackBtn");
const setupBackBtn     = document.getElementById("setupBackBtn");
const challengeBackBtn = document.getElementById("challengeBackBtn");

if (countryBackBtn) {
  countryBackBtn.addEventListener("click", () => {
    document.querySelectorAll(".country-btn").forEach(b => b.classList.remove("selected"));
    const btn = document.getElementById("countryContinueBtn");
    if (btn) btn.disabled = true;
    showScreen("start", "back");
  });
}

if (setupBackBtn) {
  setupBackBtn.addEventListener("click", () => {
    const dest = previousScreen === "countrySelect"   ? "countrySelect"
               : previousScreen === "continentSelect" ? "continentSelect"
               : "start";
    showScreen(dest, "back");
  });
}

if (challengeBackBtn) {
  challengeBackBtn.addEventListener("click", () => showScreen("setup", "back"));
}


/* ============================================================
   GAME SCREEN — input
   ============================================================ */
buttons.submitAnswer.addEventListener("click", handleTypingSubmit);
stateInput.addEventListener("keydown", e => { if (e.key === "Enter") handleTypingSubmit(); });

const hintBtn = document.getElementById("hintBtn");
if (hintBtn) hintBtn.addEventListener("click", () => useHint());


/* ============================================================
   WIN / LOSE SCREENS
   ============================================================ */
buttons.restart.addEventListener("click", () => showScreen("start"));
buttons.retry.addEventListener("click",   () => showScreen("start"));

const reviewBtn = document.getElementById("reviewBtn");
if (reviewBtn) reviewBtn.addEventListener("click", () => enterReviewMode());


/* ============================================================
   HEADER ACTIONS
   ============================================================ */
if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? "🔊" : "🔇";
  });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    darkMode = !darkMode;
    document.body.classList.toggle("dark-theme", darkMode);
    localStorage.setItem("mapmaster-theme", darkMode ? "dark" : "light");
    themeToggleBtn.textContent = darkMode ? "☀️" : "🌙";
    applyMapThemeColors(); // live-update SVG colors
  });
}

if (headerRestartBtn) {
  headerRestartBtn.addEventListener("click", () => {
    clearTimer();
    showScreen("start");
  });
}


/* ============================================================
   SVG LOAD HANDLER
   ============================================================ */
indiaMap.addEventListener("load", () => {
  svgLoaded = true;
  const svgDoc = getSvgDoc();
  if (!svgDoc) return;

  const svgRoot = svgDoc.documentElement;

  // Auto-fit viewBox to actual path bounding box
  try {
    const allPaths = Array.from(svgDoc.querySelectorAll("path"));
    if (allPaths.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      allPaths.forEach(p => {
        try {
          const bb = p.getBBox();
          if (bb.width > 0 || bb.height > 0) {
            minX = Math.min(minX, bb.x);
            minY = Math.min(minY, bb.y);
            maxX = Math.max(maxX, bb.x + bb.width);
            maxY = Math.max(maxY, bb.y + bb.height);
          }
        } catch(e) {}
      });
      if (isFinite(minX)) {
        const pad = (maxX - minX) * 0.02;
        svgRoot.setAttribute("viewBox",
          `${minX - pad} ${minY - pad} ${(maxX - minX) + pad * 2} ${(maxY - minY) + pad * 2}`
        );
      }
    }
  } catch(e) {}

  svgRoot.setAttribute("width",  "100%");
  svgRoot.setAttribute("height", "100%");
  svgRoot.style.width  = "100%";
  svgRoot.style.height = "100%";
  svgRoot.setAttribute("preserveAspectRatio", "xMidYMid meet");

  applyMapThemeColors();

  // Tooltip element
  const tooltip = document.getElementById("mapTooltip");

  // Delegated mouseover — hover + tooltip
  svgDoc.addEventListener("mouseover", (e) => {
    const label = getRegionName(e.target);
    if (!label) return;
    const fill = darkMode ? "#4a7fa8" : "#f0a898";
    if (!gameState.guessedStates.includes(label)) e.target.style.fill = fill;
    // Tooltip: show in all modes except locate (don't give away the answer)
    if (tooltip && gameState.gameType !== "locate") {
      tooltip.textContent = label;
      tooltip.style.display = "block";
    }
  });

  svgDoc.addEventListener("mousemove", (e) => {
    if (!tooltip) return;
    // e.clientX/Y is relative to the <object> frame, not the page.
    // Add the object element's bounding rect to get true page coordinates.
    const objRect = indiaMap.getBoundingClientRect();
    const pageX = objRect.left + e.clientX;
    const pageY = objRect.top  + e.clientY;
    tooltip.style.left = (pageX + 14) + "px";
    tooltip.style.top  = (pageY - 36) + "px";
  });

  svgDoc.addEventListener("mouseout", (e) => {
    const label = getRegionName(e.target);
    if (label && !gameState.guessedStates.includes(label)) {
      e.target.style.fill = darkMode ? "#2d4a6e" : "#e2d9d0";
    }
    if (tooltip) tooltip.style.display = "none";
  });

  if (gameState.gameType === "locate" && gameState.startTime) {
    setupLocateMode();
  }

  if (gameState.reviewMode) {
    gameState.guessedStates.forEach(r => colorState(r, "#2D9E6B"));
    gameState.missedRegions.forEach(r => colorState(r, "#ef4444"));
  }
});


/* ============================================================
   MAP ZOOM + PAN
   ============================================================ */
(function setupZoomPan() {
  const container = document.getElementById("mapContainer");
  const wrapper   = document.getElementById("mapZoomWrapper");
  if (!container || !wrapper) return;

  let scale = 1, tx = 0, ty = 0;
  let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;

  function clampTranslate() {
    const maxT = (scale - 1) * 50;
    tx = Math.max(-maxT * 5, Math.min(maxT * 5, tx));
    ty = Math.max(-maxT * 5, Math.min(maxT * 5, ty));
  }

  function applyTransform() {
    clampTranslate();
    wrapper.style.transform = `scale(${scale}) translate(${tx}px, ${ty}px)`;
    wrapper.style.cursor = scale > 1 ? (dragging ? "grabbing" : "grab") : "default";
  }

  container.addEventListener("mousedown", e => {
    if (scale <= 1) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startTx = tx; startTy = ty;
    applyTransform();
    e.preventDefault();
  });

  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    tx = startTx + (e.clientX - startX) / scale;
    ty = startTy + (e.clientY - startY) / scale;
    applyTransform();
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    applyTransform();
  });

  let lastPinchDist = null;
  container.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  container.addEventListener("touchmove", e => {
    if (e.touches.length === 2 && lastPinchDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      scale = Math.min(Math.max(1, scale * (dist / lastPinchDist)), 6);
      lastPinchDist = dist;
      if (scale === 1) { tx = 0; ty = 0; }
      applyTransform();
    }
  }, { passive: true });

  container.addEventListener("touchend", () => { lastPinchDist = null; });

  container.addEventListener("dblclick", () => {
    scale = 1; tx = 0; ty = 0;
    applyTransform();
  });
})();


/* ============================================================
   MAP THEME COLORS — dark/light + accent
   ============================================================ */
function applyMapThemeColors() {
  const svgDoc = getSvgDoc();
  if (!svgDoc) return;
  const fill   = darkMode ? "#2d4a6e" : "#e2d9d0";
  const stroke = darkMode ? "#5b8ab0" : "#b8a89e";
  svgDoc.querySelectorAll("path").forEach(path => {
    // Don't override correctly-guessed or missed regions
    const name = getRegionName(path);
    if (name && gameState.guessedStates.includes(name)) return;
    if (name && gameState.missedRegions.includes(name))  return;
    path.style.fill        = fill;
    path.style.stroke      = stroke;
    path.style.strokeWidth = "0.5";
    path.style.transition  = "fill 0.2s ease";
  });
}


/* ============================================================
   ACCENT COLOR — per continent
   ============================================================ */
function applyAccentColor(mapKey) {
  const c = (typeof MAP_COLORS !== "undefined") ? MAP_COLORS[mapKey] : null;
  if (c) {
    document.documentElement.style.setProperty("--accent",      c.accent);
    document.documentElement.style.setProperty("--accent-glow", c.glow);
  } else {
    // Country maps fall back to default coral
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--accent-glow");
  }
}


/* ============================================================
   REGION COUNT BADGES
   ============================================================ */
document.querySelectorAll(".country-btn").forEach(btn => {
  const key = btn.dataset.country;
  if (!key || typeof MAPS === "undefined" || !MAPS[key]) return;
  const count = MAPS[key].regions.length;
  const span  = document.createElement("span");
  span.className   = "c-count";
  span.textContent = count + " regions";
  btn.appendChild(span);
});

document.querySelectorAll(".continent-btn").forEach(btn => {
  const key = btn.dataset.continent;
  if (!key || typeof MAPS === "undefined" || !MAPS[key]) return;
  const count = MAPS[key].regions.length;
  const span  = document.createElement("span");
  span.className   = "c-count";
  span.textContent = count + " countries";
  btn.appendChild(span);
});


/* ============================================================
   HERO MAP BACKGROUND — animated SVG on start screen
   ============================================================ */
(function initHeroMapBg() {
  const bg = document.getElementById("heroMapBg");
  if (!bg) return;

  // Simple world outline as inline SVG paths (stylised continents)
  bg.innerHTML = `<svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg">
    <!-- North America -->
    <path d="M80,60 C100,55 160,50 200,80 C230,100 240,130 220,160 C200,190 170,210 140,230
             C120,245 90,260 70,250 C50,240 40,210 50,180 C60,150 60,100 80,60Z"
          fill="var(--coral)" opacity="0.7"/>
    <!-- South America -->
    <path d="M160,270 C180,265 210,270 220,300 C230,330 225,370 210,400
             C195,430 170,450 150,440 C130,430 120,400 125,370 C130,340 140,300 160,270Z"
          fill="var(--coral)" opacity="0.7"/>
    <!-- Europe -->
    <path d="M430,60 C450,55 480,60 490,80 C500,100 495,125 475,135
             C455,145 430,140 420,120 C410,100 410,70 430,60Z"
          fill="var(--coral)" opacity="0.7"/>
    <!-- Africa -->
    <path d="M440,160 C465,155 495,165 505,195 C515,225 510,270 495,305
             C480,340 455,360 435,350 C415,340 405,305 410,270
             C415,235 415,170 440,160Z"
          fill="var(--coral)" opacity="0.7"/>
    <!-- Asia -->
    <path d="M510,55 C560,45 680,50 740,80 C790,105 810,140 795,175
             C780,210 730,225 680,220 C630,215 570,200 530,175
             C490,150 470,110 510,55Z"
          fill="var(--coral)" opacity="0.7"/>
    <!-- Australia -->
    <path d="M730,290 C765,280 810,285 830,310 C850,335 845,375 820,395
             C795,415 755,415 730,395 C705,375 700,340 715,315 C720,305 725,295 730,290Z"
          fill="var(--coral)" opacity="0.7"/>
    <!-- Graticule lines -->
    <line x1="0"    y1="250" x2="1000" y2="250" stroke="var(--coral)" stroke-width="0.4" opacity="0.4"/>
    <line x1="500"  y1="0"   x2="500"  y2="500" stroke="var(--coral)" stroke-width="0.4" opacity="0.4"/>
    <line x1="0"    y1="125" x2="1000" y2="125" stroke="var(--coral)" stroke-width="0.3" opacity="0.25"/>
    <line x1="0"    y1="375" x2="1000" y2="375" stroke="var(--coral)" stroke-width="0.3" opacity="0.25"/>
    <line x1="250"  y1="0"   x2="250"  y2="500" stroke="var(--coral)" stroke-width="0.3" opacity="0.25"/>
    <line x1="750"  y1="0"   x2="750"  y2="500" stroke="var(--coral)" stroke-width="0.3" opacity="0.25"/>
  </svg>`;

  // Randomly pulse 2–3 paths every 3s
  const paths = bg.querySelectorAll("path");
  setInterval(() => {
    paths.forEach(p => p.classList.remove("region-glow"));
    const picks = Array.from(paths)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    picks.forEach(p => p.classList.add("region-glow"));
  }, 3000);
})();
