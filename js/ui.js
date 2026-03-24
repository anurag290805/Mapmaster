/* ============================================================
   MapMaster | ui.js
   DOM references, HUD updates, screen transitions,
   SVG map helpers, confetti, feedback, progress bar.
   Depends on: data.js, state.js
   ============================================================ */

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const screens = {
  start:           document.getElementById("startScreen"),
  countrySelect:   document.getElementById("countrySelectScreen"),
  continentSelect: document.getElementById("continentSelectScreen"),
  setup:           document.getElementById("setupScreen"),
  challenge:       document.getElementById("challengeSettings"),
  game:            document.getElementById("gameScreen"),
  win:             document.getElementById("winScreen"),
  lose:            document.getElementById("loseScreen"),
};

const buttons = {
  typingMode:    document.getElementById("typingModeBtn"),
  locateMode:    document.getElementById("locateModeBtn"),
  flagMode:      document.getElementById("flagModeBtn"),
  capitalMode:   document.getElementById("capitalModeBtn"),
  practiceMode:  document.getElementById("practiceModeBtn"),
  challengeMode: document.getElementById("challengeModeBtn"),
  startGame:     document.getElementById("startGameBtn"),
  submitAnswer:  document.getElementById("submitAnswerBtn"),
  restart:       document.getElementById("restartBtn"),
  retry:         document.getElementById("retryBtn"),
};

const display = {
  score:         document.getElementById("scoreDisplay"),
  timer:         document.getElementById("timerDisplay"),
  lives:         document.getElementById("livesDisplay"),
  feedback:      document.getElementById("feedbackMessage"),
  finalTime:     document.getElementById("finalTime"),
  finalAccuracy: document.getElementById("finalAccuracy"),
  loseReason:    document.getElementById("loseReason"),
};

const stateInput      = document.getElementById("stateInput");
const inputSection    = document.getElementById("inputSection");
const indiaMap        = document.getElementById("indiaMap");
const locatePrompt    = document.getElementById("locatePrompt");
const flagContainer   = document.getElementById("flagContainer");
const flagImage       = document.getElementById("flagImage");
const capitalPrompt   = document.getElementById("capitalPrompt");
const progressBarFill = document.getElementById("progressBarFill");
const progressLabel   = document.getElementById("progressLabel");
const soundToggleBtn  = document.getElementById("soundToggleBtn");
const themeToggleBtn  = document.getElementById("themeToggleBtn");
const headerRestartBtn= document.getElementById("headerRestartBtn");
const locateNameEl    = locatePrompt ? locatePrompt.querySelector(".locate-name") : null;
const homeStartBtn    = document.getElementById("homeStartBtn");
const livesSection    = document.getElementById("livesSection");
const streakDisplay   = document.getElementById("streakDisplay");
const finalStreak     = document.getElementById("finalStreak");
const confettiCanvas  = document.getElementById("confettiCanvas");


/* ============================================================
   BREADCRUMB
   ============================================================ */
const BREADCRUMB_MAP = {
  countrySelect:   ["Home", "Country"],
  continentSelect: ["Home", "Continent"],
  setup:           ["Home", "Setup"],
  challenge:       ["Home", "Setup", "Challenge"],
  game:            ["Home", "Setup", "Game"],
};

function updateBreadcrumb(screenName) {
  // Update all breadcrumb placeholders on the revealed screen
  const ids = ["breadcrumb", "breadcrumbContinent", "breadcrumbSetup"];
  const trail = BREADCRUMB_MAP[screenName];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!trail) { el.innerHTML = ""; return; }
    el.innerHTML = trail
      .map((item, i, arr) =>
        `<span class="${i === arr.length - 1 ? "bc-active" : "bc-item"}">${item}</span>`
      ).join('<span class="bc-sep"> › </span>');
  });
}


/* ============================================================
   SCREEN TRANSITIONS — directional
   ============================================================ */
function showScreen(screenName, direction = "forward") {
  const current    = Object.values(screens).find(s => !s.classList.contains("hidden"));
  const currentKey = Object.keys(screens).find(k => screens[k] === current);
  if (currentKey) previousScreen = currentKey;
  const next = screens[screenName];

  const exitClass  = direction === "back" ? "slide-out-right" : "slide-out-left";
  const enterClass = direction === "back" ? "slide-in-left"   : "slide-in-right";

  updateBreadcrumb(screenName);

  if (current && current !== next) {
    current.classList.add(exitClass);
    setTimeout(() => {
      current.classList.add("hidden");
      current.classList.remove(exitClass);
      next.classList.remove("hidden");
      next.classList.add(enterClass);
      setTimeout(() => next.classList.remove(enterClass), 350);
    }, 220);
  } else {
    Object.values(screens).forEach(s => s.classList.add("hidden"));
    next.classList.remove("hidden");
    next.classList.add(enterClass);
    setTimeout(() => next.classList.remove(enterClass), 350);
  }
}


/* ============================================================
   HUD + PROGRESS
   ============================================================ */
function updateHUD() {
  const newScore = gameState.score + gameState.bonusPoints;
  const oldScore = parseInt(display.score.textContent) || 0;
  if (newScore !== oldScore) {
    animateCounter(display.score, oldScore, newScore);
  }

  display.timer.textContent = gameState.gameMode === "challenge"
    ? formatTime(gameState.timeLeft)
    : "∞";

  if (gameState.gameMode === "challenge" && gameState.gameType === "locate") {
    display.lives.textContent = gameState.livesLeft;
  } else {
    display.lives.textContent = "∞";
  }

  if (streakDisplay) streakDisplay.textContent = gameState.currentStreak;

  updateProgress();
}

function updateProgress() {
  const count = gameState.guessedStates.length;
  let total;
  if (gameState.gameType === "flag") {
    total = getFlagRegions().length || CURRENT_REGIONS.length;
  } else if (gameState.gameType === "capital") {
    total = getCapitalRegions().length || CURRENT_REGIONS.length;
  } else {
    total = CURRENT_REGIONS.length;
  }
  const pct = total > 0 ? (count / total) * 100 : 0;

  // Progress ring
  const ring = document.getElementById("progressRingFill");
  const pctEl = document.getElementById("progressRingPct");
  if (ring) {
    const r = 18;
    const circ = 2 * Math.PI * r;
    ring.style.strokeDasharray  = circ;
    ring.style.strokeDashoffset = circ * (1 - pct / 100);
  }
  if (pctEl) pctEl.textContent = Math.round(pct) + "%";

  // Fallback bar (hidden but keep in sync)
  if (progressBarFill) {
    progressBarFill.style.width = pct + "%";
    progressBarFill.classList.remove("progress-glow");
    void progressBarFill.offsetWidth;
    progressBarFill.classList.add("progress-glow");
    setTimeout(() => progressBarFill.classList.remove("progress-glow"), 350);
  }

  const modeLabel = gameState.gameType === "flag" ? "Flags"
    : gameState.gameType === "capital" ? "Capitals"
    : regionLabel();
  if (progressLabel) progressLabel.textContent = `${count} / ${total} ${modeLabel}`;
}


/* ============================================================
   ANIMATED SCORE COUNTER
   ============================================================ */
let _scoreAnimRaf = null;

function animateCounter(el, oldVal, newVal) {
  if (_scoreAnimRaf) cancelAnimationFrame(_scoreAnimRaf);
  const duration = 300;
  const start = performance.now();
  function step(ts) {
    const t = Math.min((ts - start) / duration, 1);
    const eased = t * (2 - t); // ease-out quad
    el.textContent = Math.round(oldVal + (newVal - oldVal) * eased);
    if (t < 1) _scoreAnimRaf = requestAnimationFrame(step);
    else { el.textContent = newVal; _scoreAnimRaf = null; }
  }
  _scoreAnimRaf = requestAnimationFrame(step);
}


/* ============================================================
   ANIMATED WIN STAT VALUE
   ============================================================ */
function animateValue(el, start, end, duration, formatter) {
  if (!el) return;
  let startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    const t = Math.min((ts - startTime) / duration, 1);
    const eased = t * (2 - t);
    const val = Math.round(start + (end - start) * eased);
    el.textContent = formatter ? formatter(val) : val;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


/* ============================================================
   MAP PINS — placed after correct guess
   ============================================================ */
let mapPins = [];

function placePin(name) {
  const svgDoc = getSvgDoc();
  if (!svgDoc) return;
  const path = getPathByName(name);
  if (!path) return;
  try {
    const bbox = path.getBBox();
    if (!bbox || (bbox.width === 0 && bbox.height === 0)) return;
    const x = bbox.x + bbox.width  / 2;
    const y = bbox.y + bbox.height / 2;
    const pin = svgDoc.createElementNS("http://www.w3.org/2000/svg", "text");
    pin.setAttribute("x", x);
    pin.setAttribute("y", y);
    pin.setAttribute("text-anchor", "middle");
    pin.setAttribute("dominant-baseline", "middle");
    pin.setAttribute("class", "map-pin");
    pin.textContent = "✓";
    svgDoc.documentElement.appendChild(pin);
    mapPins.push(pin);
  } catch(e) {}
}

function clearPins() {
  mapPins.forEach(p => { try { p.remove(); } catch(e) {} });
  mapPins = [];
}


/* ============================================================
   FEEDBACK
   ============================================================ */
function showFeedback(message, type = "") {
  display.feedback.textContent = message;
  display.feedback.className = type;
}


/* ============================================================
   SVG HELPERS
   ============================================================ */
function getSvgDoc() {
  return indiaMap.contentDocument;
}

/* ============================================================
   SVG LABEL ALIASES
   Maps incorrect/legacy SVG labels → canonical display names.
   Add entries here whenever an SVG uses a non-standard name.
   ============================================================ */
const SVG_ALIASES = {
  // India
  "Uttranchal":          "Uttarakhand",
  "Uttaranchal":         "Uttarakhand",
  "Orissa":              "Odisha",
  "Pondicherry":         "Puducherry",
  "Andaman & Nicobar":   "Andaman and Nicobar Islands",
  "Dadra & Nagar Haveli":"Dadra and Nagar Haveli and Daman and Diu",
  "Daman & Diu":         "Dadra and Nagar Haveli and Daman and Diu",
  // China
  "Quinghai":            "Qinghai",
  "Xizang (Tibet) ":     "Xizang (Tibet)",
  // Australia (multi-path fragments → canonical state name)
  "Northern Territory Mainland":    "Northern Territory",
  "Northern Territory Groote Eylandt": "Northern Territory",
  "Northern Territory Melville Island": "Northern Territory",
  "Queensland Mainland":            "Queensland",
  "Queensland Fraser Island":       "Queensland",
  "Queensland Mornington Island":   "Queensland",
  "South Australia Mainland":       "South Australia",
  "South Australia Kangaroo Island":"South Australia",
  "Tasmania Mainland":              "Tasmania",
  "Tasmania Flinders Island":       "Tasmania",
  "Tasmania Cape Barren":           "Tasmania",
  "Tasmania King Currie Island":    "Tasmania",
};

// Reverse map: canonical name → all SVG aliases for it
const SVG_ALIASES_REVERSE = {};
Object.entries(SVG_ALIASES).forEach(([svgLabel, canonical]) => {
  if (!SVG_ALIASES_REVERSE[canonical]) SVG_ALIASES_REVERSE[canonical] = [];
  SVG_ALIASES_REVERSE[canonical].push(svgLabel);
});

function getPathByName(name) {
  const svgDoc = getSvgDoc();
  if (!svgDoc) return null;

  // Try canonical name first
  const direct = svgDoc.querySelector(`[aria-label="${name}"]`)
      || svgDoc.querySelector(`[name="${name}"]`)
      || svgDoc.querySelector(`[id="${name}"]`)
      || svgDoc.querySelector(`[data-name="${name}"]`)
      || svgDoc.querySelector(`[title="${name}"]`)
      || (() => {
           const titles = svgDoc.querySelectorAll("path > title");
           for (const t of titles) {
             if (t.textContent.trim() === name) return t.parentElement;
           }
           return null;
         })();
  if (direct) return direct;

  // Try known SVG aliases for this canonical name
  const aliases = SVG_ALIASES_REVERSE[name] || [];
  for (const alias of aliases) {
    const el = svgDoc.querySelector(`[aria-label="${alias}"]`)
            || svgDoc.querySelector(`[name="${alias}"]`)
            || svgDoc.querySelector(`[id="${alias}"]`);
    if (el) return el;
  }

  // CSS.escape fallback
  try {
    const byId = svgDoc.querySelector(`#${CSS.escape(name)}`);
    if (byId) return byId;
  } catch(e) {}

  return null;
}

function getRegionName(path) {
  const raw = path.getAttribute("aria-label")
      || path.getAttribute("name")
      || path.getAttribute("data-name")
      || path.getAttribute("title")
      || path.getAttribute("id")
      || (path.querySelector("title") ? path.querySelector("title").textContent.trim() : null);
  if (!raw) return null;
  // Translate SVG label → canonical display name if an alias exists
  return SVG_ALIASES[raw.trim()] || raw;
}

function colorState(name, color, animate = false) {
  const path = getPathByName(name);
  if (!path) return;
  path.style.fill = color;
  if (animate) {
    const svgDoc = getSvgDoc();
    if (svgDoc) {
      const svgRoot = svgDoc.documentElement;
      const flashClass = color === "#8b5cf6" ? "ut-correct-flash" : "state-correct-flash";
      svgRoot.classList.remove("state-correct-flash", "ut-correct-flash");
      void svgRoot.offsetWidth;
      svgRoot.classList.add(flashClass);
      setTimeout(() => svgRoot.classList.remove(flashClass), 450);
    }
  }
}

function flashRed(name) {
  const path = getPathByName(name);
  if (!path) return;
  const original = path.style.fill || "";
  path.style.fill = "#ef4444";
  const wrapper = document.getElementById("mapZoomWrapper");
  if (wrapper) {
    wrapper.classList.remove("map-shake");
    void wrapper.offsetWidth;
    wrapper.classList.add("map-shake");
    setTimeout(() => wrapper.classList.remove("map-shake"), 400);
  }
  setTimeout(() => { path.style.fill = original; }, 600);

  // Show floating wrong-region label
  if (name) {
    try {
      const bbox     = path.getBBox();
      const svgEl    = document.getElementById("indiaMap");
      const rect     = svgEl.getBoundingClientRect();
      const svgDoc   = getSvgDoc();
      const svgRoot  = svgDoc?.documentElement;
      const vb       = svgRoot?.viewBox?.baseVal;
      if (vb && vb.width > 0) {
        const scaleX = rect.width  / vb.width;
        const scaleY = rect.height / vb.height;
        const cx = rect.left + (bbox.x + bbox.width  / 2 - vb.x) * scaleX;
        const cy = rect.top  + (bbox.y + bbox.height / 2 - vb.y) * scaleY;
        const label = document.createElement("div");
        label.className = "wrong-region-label";
        label.textContent = name;
        label.style.left = cx + "px";
        label.style.top  = cy + "px";
        document.body.appendChild(label);
        setTimeout(() => label.remove(), 1500);
      }
    } catch(e) {}
  }
}

function resetMapStyles() {
  const svgDoc = getSvgDoc();
  if (!svgDoc) return;
  const fill   = darkMode ? "#2d4a6e" : "#e2d9d0";
  const stroke = darkMode ? "#5b8ab0" : "#b8a89e";
  svgDoc.querySelectorAll("path").forEach(path => {
    path.style.fill   = fill;
    path.style.stroke = stroke;
  });
  clearPins();
}


/* ============================================================
   UTILITY
   ============================================================ */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getElapsedTime() {
  return Math.floor((Date.now() - gameState.startTime) / 1000);
}

function pickRandomState() {
  const remaining = CURRENT_REGIONS.filter(s => !gameState.guessedStates.includes(s));
  if (remaining.length === 0) return null;
  return remaining[Math.floor(Math.random() * remaining.length)];
}

function setSelectedBtn(group, selectedBtn) {
  group.forEach(btn => btn.classList.remove("selected"));
  selectedBtn.classList.add("selected");
  selectedBtn.classList.remove("btn-pop");
  void selectedBtn.offsetWidth;
  selectedBtn.classList.add("btn-pop");
  setTimeout(() => selectedBtn.classList.remove("btn-pop"), 300);
}

function clearTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
}


/* ============================================================
   CONFETTI
   ============================================================ */
function launchConfetti() {
  if (!confettiCanvas) return;
  confettiCanvas.classList.remove("hidden");
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const ctx      = confettiCanvas.getContext("2d");
  const COLORS   = ["#E8604A","#2D9E6B","#F0C040","#FFFFFF","#F0826D","#60A8E8","#C94A34"];
  const COUNT    = 160;
  const DURATION = 5000;
  const startTs  = performance.now();
  let   rafId    = null;

  const particles = Array.from({ length: COUNT }, () => ({
    x:     Math.random() * confettiCanvas.width,
    y:     Math.random() * confettiCanvas.height * -1,
    w:     6  + Math.random() * 9,
    h:     10 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx:    (Math.random() - 0.5) * 3,
    vy:    2  + Math.random() * 4,
    angle: Math.random() * Math.PI * 2,
    spin:  (Math.random() - 0.5) * 0.2,
  }));

  function onResize() {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", onResize);

  function draw(ts) {
    const elapsed = ts - startTs;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    const alpha = elapsed > DURATION - 1000 ? Math.max(0, (DURATION - elapsed) / 1000) : 1;

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.angle += p.spin;
      if (p.y > confettiCanvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * confettiCanvas.width;
        p.vy = 2 + Math.random() * 4;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < DURATION) {
      rafId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiCanvas.classList.add("hidden");
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    }
  }
  rafId = requestAnimationFrame(draw);
}


/* ============================================================
   THEME TOGGLE — initialise on load
   ============================================================ */
let darkMode = false;
const savedTheme = localStorage.getItem("mapmaster-theme");
if (savedTheme === "dark") {
  darkMode = true;
  document.body.classList.add("dark-theme");
  if (themeToggleBtn) themeToggleBtn.textContent = "☀️";
}