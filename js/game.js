/* ============================================================
   MapMaster | game.js
   Core game lifecycle: reset, start, end, win check,
   timer, streaks, UT easter egg, review mode.
   Depends on: data.js, state.js, ui.js, audio.js, modes.js
   ============================================================ */

/* ============================================================
   TIMER
   ============================================================ */
function startTimer() {
  clearTimer();
  lastTickPlayed = -1;
  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft--;
    updateHUD();
    if (gameState.timeLeft <= 10 && gameState.timeLeft !== lastTickPlayed && gameState.timeLeft > 0) {
      lastTickPlayed = gameState.timeLeft;
      playSound(sfxTick);
    }
    if (gameState.timeLeft <= 0) {
      clearTimer();
      endGame(false, "time");
    }
  }, 1000);
}


/* ============================================================
   RESET
   ============================================================ */
function resetGame() {
  clearTimer();
  resetMapStyles();
  gameState.score          = 0;
  gameState.bonusPoints    = 0;
  gameState.totalAttempts  = 0;
  gameState.guessedStates  = [];
  gameState.guessedUTs     = [];
  gameState.missedRegions  = [];
  gameState.timerInterval  = null;
  gameState.startTime      = null;
  gameState.currentTarget  = null;
  gameState.timeLeft       = gameState.selectedTime || 0;
  gameState.currentStreak  = 0;
  gameState.reviewMode     = false;

  if (gameState.gameMode === "challenge" && gameState.gameType === "locate") {
    gameState.livesLeft = gameState.selectedLives;
  } else {
    gameState.livesLeft = 0;
  }

  stateInput.value = "";
  showFeedback("");

  if (progressBarFill) progressBarFill.style.width = "0%";
  if (progressLabel)   progressLabel.textContent   = `0 / ${CURRENT_REGIONS.length} ${regionLabel()}`;

  if (locatePrompt) {
    if (locateNameEl) locateNameEl.textContent = "";
    locatePrompt.classList.add("hidden");
  }
}


/* ============================================================
   START GAME
   ============================================================ */
function startGame() {
  resetGame();
  gameState.startTime = Date.now();
  updateHUD();
  showScreen("game");

  // Hide all mode UI first
  inputSection.classList.add("hidden");
  if (locatePrompt)  locatePrompt.classList.add("hidden");
  if (flagContainer) flagContainer.classList.add("hidden");
  if (capitalPrompt) capitalPrompt.classList.add("hidden");

  if (gameState.gameType === "typing") {
    inputSection.classList.remove("hidden");
    stateInput.placeholder = regionLabel() === "Countries" ? "Type a country name..." : "Type a state name...";
  } else if (gameState.gameType === "locate") {
    locatePrompt.classList.remove("hidden");
    const svgDoc = getSvgDoc();
    if (svgLoaded && svgDoc && svgDoc.querySelector("path")) {
      setupLocateMode();
    }
  } else if (gameState.gameType === "flag") {
    inputSection.classList.remove("hidden");
    flagContainer.classList.remove("hidden");
    stateInput.placeholder = "Type the country name...";
    setupFlagMode();
  } else if (gameState.gameType === "capital") {
    inputSection.classList.remove("hidden");
    capitalPrompt.classList.remove("hidden");
    stateInput.placeholder = "Type the capital city...";
    setupCapitalMode();
  }

  const hintBtnEl = document.getElementById("hintBtn");
  if (hintBtnEl) hintBtnEl.classList.toggle("hidden", gameState.gameType === "locate");

  if (gameState.gameMode === "challenge") startTimer();
}


/* ============================================================
   END GAME
   ============================================================ */
function endGame(isWin, reason = "") {
  clearTimer();

  if (isWin) {
    playSound(sfxWin);
    launchConfetti();
    CURRENT_REGIONS.forEach(s => colorState(s, "#2D9E6B"));

    if (gameState.gameMode === "challenge") {
      const elapsed  = getElapsedTime();
      const accuracy = gameState.totalAttempts > 0
        ? Math.round((gameState.score / gameState.totalAttempts) * 100)
        : 100;
      // Animate stats counting up after screen transition settles
      setTimeout(() => {
        animateValue(display.finalTime,     0, elapsed,   800, v => formatTime(v));
        animateValue(display.finalAccuracy, 0, accuracy,  800, v => v);
        if (finalStreak) animateValue(finalStreak, 0, gameState.bestStreak, 600, v => v);
      }, 300);
      display.finalTime.textContent     = formatTime(elapsed);
      display.finalAccuracy.textContent = accuracy;
    } else {
      display.finalTime.textContent     = "--";
      display.finalAccuracy.textContent = "--";
      if (finalStreak) animateValue(finalStreak, 0, gameState.bestStreak, 600, v => v);
    }
    if (finalStreak && gameState.gameMode !== "challenge") finalStreak.textContent = gameState.bestStreak;

    // UT Easter egg stat
    const utBonusStat  = document.getElementById("utBonusStat");
    const finalUTBonus = document.getElementById("finalUTBonus");
    if (utBonusStat && finalUTBonus) {
      if (currentMapKey === "india" && gameState.guessedUTs.length > 0) {
        finalUTBonus.textContent = `+${gameState.bonusPoints} (${gameState.guessedUTs.length}/${INDIA_UTS.length} UTs)`;
        utBonusStat.classList.remove("hidden");
      } else {
        utBonusStat.classList.add("hidden");
      }
    }

    const reviewBtn = document.getElementById("reviewBtn");
    if (reviewBtn) reviewBtn.classList.add("hidden");
    showScreen("win");

  } else {
    playSound(sfxLose);

    if (gameState.gameType === "typing" || gameState.gameType === "capital") {
      const allRegions = gameState.gameType === "capital"
        ? getCapitalRegions()
        : CURRENT_REGIONS;
      gameState.missedRegions = allRegions.filter(r => !gameState.guessedStates.includes(r));
    } else if (gameState.gameType === "locate") {
      gameState.missedRegions = CURRENT_REGIONS.filter(r => !gameState.guessedStates.includes(r));
    } else {
      gameState.missedRegions = [];
    }

    const missedListEl = document.getElementById("missedList");
    const reviewBtn    = document.getElementById("reviewBtn");
    if (missedListEl) {
      if (gameState.missedRegions.length > 0) {
        missedListEl.innerHTML = gameState.missedRegions
          .slice(0, 8)
          .map(r => `<span class="missed-tag">${r}</span>`)
          .join("");
        if (gameState.missedRegions.length > 8) {
          missedListEl.innerHTML += `<span class="missed-tag missed-more">+${gameState.missedRegions.length - 8} more</span>`;
        }
      } else {
        missedListEl.innerHTML = "<em>None — great run!</em>";
      }
    }
    if (reviewBtn) reviewBtn.classList.toggle("hidden", gameState.missedRegions.length === 0);

    display.loseReason.textContent = reason === "time"
      ? "⏰ Time's up! Better luck next time."
      : "💔 You ran out of lives!";
    showScreen("lose");
  }
}


/* ============================================================
   WIN CHECK
   ============================================================ */
function checkWin() {
  let total;
  if (gameState.gameType === "flag")    total = getFlagRegions().length;
  else if (gameState.gameType === "capital") total = getCapitalRegions().length;
  else total = CURRENT_REGIONS.length;
  if (gameState.guessedStates.length >= total) endGame(true);
}


/* ============================================================
   STREAK
   ============================================================ */
function onStreakUpdate() {
  if (gameState.currentStreak > 0 && gameState.currentStreak % 5 === 0) {
    playSound(sfxStreak);
  }
}

function trackMiss(region) {
  if (region && !gameState.missedRegions.includes(region)) {
    gameState.missedRegions.push(region);
  }
}


/* ============================================================
   UT ACHIEVEMENT TOAST
   ============================================================ */
function showUTAchievement() {
  const existing = document.getElementById("utAchievement");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "utAchievement";
  toast.innerHTML = `
    <span class="ut-achievement-icon">🇮🇳</span>
    <div class="ut-achievement-text">
      <strong>India Expert!</strong>
      <span>You discovered all Union Territories</span>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("ut-achievement-show"));
  setTimeout(() => {
    toast.classList.remove("ut-achievement-show");
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}


/* ============================================================
   MAP SELECTION
   ============================================================ */
function applyMap(mapKey) {
  currentMapKey   = mapKey;
  CURRENT_REGIONS = MAPS[mapKey].regions;
  svgLoaded       = false;
  indiaMap.data   = MAPS[mapKey].svg;

  applyAccentColor(mapKey);

  const headerSubEl = document.getElementById("headerSub");
  if (headerSubEl) headerSubEl.textContent = MAPS[mapKey].name + " Edition";

  const setupSub = document.getElementById("setupSubtitle");
  if (setupSub) {
    let descriptor;
    if (mapKey === "world") {
      descriptor = "countries of the World";
    } else if (CONTINENT_KEYS.includes(mapKey)) {
      descriptor = "countries of " + MAPS[mapKey].name;
    } else {
      descriptor = "states of " + MAPS[mapKey].name;
    }
    setupSub.textContent = "How well do you know the " + descriptor + "?";
  }

  clearTimer();
  gameState.score         = 0;
  gameState.totalAttempts = 0;
  gameState.guessedStates = [];
  gameState.currentStreak = 0;
  gameState.currentTarget = null;

  if (progressBarFill) progressBarFill.style.width = "0%";
  if (progressLabel)   progressLabel.textContent   = "0 / " + CURRENT_REGIONS.length + " " + regionLabel();

  updateGameTypeAvailability();
}

function resetSetupSelections() {
  gameState.gameType = null;
  gameState.gameMode = null;
  [buttons.typingMode, buttons.locateMode, buttons.flagMode, buttons.capitalMode,
   buttons.practiceMode, buttons.challengeMode]
    .forEach(b => b && b.classList.remove("selected"));
  if (homeStartBtn) homeStartBtn.disabled = true;
  updateGameTypeAvailability();
}


/* ============================================================
   REVIEW MODE
   ============================================================ */
function enterReviewMode() {
  gameState.reviewMode = true;
  showScreen("game");

  inputSection.classList.add("hidden");
  if (locatePrompt)  locatePrompt.classList.add("hidden");
  if (flagContainer) flagContainer.classList.add("hidden");
  if (capitalPrompt) capitalPrompt.classList.add("hidden");

  const svgDoc = getSvgDoc();
  if (svgDoc) svgDoc.querySelectorAll("path").forEach(p => { p.style.fill = "#e2d9d0"; });

  gameState.guessedStates.forEach(r => colorState(r, "#2D9E6B"));
  gameState.missedRegions.forEach(r => colorState(r, "#ef4444"));

  const existing = document.getElementById("reviewBanner");
  if (existing) existing.remove();
  const banner = document.createElement("div");
  banner.id = "reviewBanner";
  banner.innerHTML = `
    <span class="review-title">📖 Review Mode</span>
    <span class="review-sub">🟢 Guessed &nbsp; 🔴 Missed (${gameState.missedRegions.length})</span>
    <button id="reviewExitBtn">← Back to Menu</button>
  `;
  const mapCont = document.getElementById("mapContainer");
  if (mapCont) mapCont.prepend(banner);

  document.getElementById("reviewExitBtn")?.addEventListener("click", () => {
    banner.remove();
    showScreen("start");
  });
}


/* ============================================================
   HINT SYSTEM
   ============================================================ */
function generateHint() {
  const type = gameState.gameType;

  if (type === "typing") {
    const unguessed = CURRENT_REGIONS.filter(r => !gameState.guessedStates.includes(r));
    if (unguessed.length === 0) return null;
    const pick = unguessed[Math.floor(Math.random() * unguessed.length)];
    return `Try: ${pick[0]}${"_".repeat(pick.length - 1)}  (${pick.length} letters)`;
  }

  const target = gameState.currentTarget;
  if (!target) return null;

  if (type === "flag") {
    return `Country starts with "${target[0]}"`;
  } else if (type === "capital") {
    const data    = getCapitalData();
    const capital = data ? data[target] : null;
    return capital ? `Capital starts with "${capital[0]}"` : `Region: ${target[0]}...`;
  } else if (type === "locate") {
    const path = getPathByName(target);
    if (path) {
      const orig = path.style.fill;
      path.style.fill = "#F0C040";
      setTimeout(() => { path.style.fill = orig; }, 1200);
    }
    return `Highlighted on map for 1 second`;
  }
  return null;
}

function useHint() {
  if (gameState.reviewMode) return;
  const hint = generateHint();
  if (!hint) return;

  if (gameState.gameMode === "challenge") {
    if (gameState.gameType === "locate") {
      gameState.livesLeft = Math.max(0, gameState.livesLeft - 1);
    } else {
      gameState.timeLeft = Math.max(0, gameState.timeLeft - 10);
    }
    updateHUD();
  }
  showFeedback(`💡 ${hint}`, "hint");
}