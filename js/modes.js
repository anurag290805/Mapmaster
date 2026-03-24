/* ============================================================
   MapMaster | modes.js
   All four game mode handlers:
   Typing, Locate, Flag, Capital
   Depends on: data.js, state.js, ui.js, audio.js, game.js
   ============================================================ */


/* ============================================================
   TYPING MODE
   ============================================================ */
let isSubmitting = false;

function handleTypingSubmit() {
  if (isSubmitting) return;
  isSubmitting = true;
  setTimeout(() => { isSubmitting = false; }, 200);

  const raw   = stateInput.value.trim();
  const input = normalize(raw);
  stateInput.value = "";

  if (!input) return;

  if (gameState.gameType === "flag")    { handleFlagSubmit(raw, input);    return; }
  if (gameState.gameType === "capital") { handleCapitalSubmit(raw, input); return; }

  gameState.totalAttempts++;

  const alreadyGuessed = gameState.guessedStates.find(s => normalize(s) === input);
  if (alreadyGuessed) {
    showFeedback(`Already guessed: ${alreadyGuessed}`, "wrong");
    gameState.totalAttempts--;
    return;
  }

  // India UT Easter Egg — exact match only (prevent fuzzy false positives)
  if (currentMapKey === "india") {
    const utMatch = INDIA_UTS.find(ut => normalize(ut) === input);
    if (utMatch) {
      if (gameState.guessedUTs.includes(utMatch)) {
        showFeedback(`Already found: ${utMatch}`, "wrong");
        gameState.totalAttempts--;
        return;
      }
      gameState.guessedUTs.push(utMatch);
      gameState.bonusPoints += 2;
      colorState(utMatch, "#8b5cf6", true);
      showFeedback(`🌟 Union Territory Bonus! +2 — ${utMatch}`, "ut-bonus");
      playSound(sfxCorrect);
      gameState.currentStreak++;
      if (gameState.currentStreak > gameState.bestStreak) gameState.bestStreak = gameState.currentStreak;
      onStreakUpdate();
      updateHUD();
      if (gameState.guessedUTs.length === INDIA_UTS.length) showUTAchievement();
      return;
    }
  }

  // Fuzzy match: exact > contains > is contained by
  const match = CURRENT_REGIONS.find(s => {
    const norm = normalize(s);
    return norm === input || norm.includes(input) || input.includes(norm);
  });
  if (match) {
    gameState.score++;
    gameState.currentStreak++;
    if (gameState.currentStreak > gameState.bestStreak) gameState.bestStreak = gameState.currentStreak;
    gameState.guessedStates.push(match);
    colorState(match, "#2D9E6B", true);
    showFeedback(`✓ ${match}`, "correct");
    playSound(sfxCorrect);
    onStreakUpdate();
    updateHUD();
    checkWin();
  } else {
    gameState.currentStreak = 0;
    showFeedback(regionLabel() === "Countries" ? "✗ Not a valid country name." : "✗ Not a valid state name.", "wrong");
    playSound(sfxWrong);
    updateHUD();
  }
}


/* ============================================================
   LOCATE MODE
   ============================================================ */
function showLocateTarget(name) {
  if (!locatePrompt) return;
  const nameEl = locatePrompt.querySelector(".locate-name");
  if (nameEl) {
    nameEl.textContent = name;
  } else {
    locatePrompt.textContent = "Find: " + name;
  }
  locatePrompt.classList.remove("hidden");
  locatePrompt.style.animation = "none";
  void locatePrompt.offsetWidth;
  locatePrompt.style.animation = "";
}

function setupLocateMode() {
  const svgDoc = getSvgDoc();
  if (!svgDoc) return;

  // Set cursor on all paths
  svgDoc.querySelectorAll("path").forEach(path => {
    path.style.cursor = "pointer";
    path.onclick = null; // clear any stale per-path handlers
  });

  // Use event delegation on the SVG document — far more reliable than
  // per-path onclick inside cross-origin <object> elements (esp. Safari/WebKit)
  svgDoc.removeEventListener("click", handleLocateClick);
  svgDoc.addEventListener("click", handleLocateClick);

  if (!gameState.currentTarget) {
    gameState.currentTarget = pickRandomState();
  }
  if (gameState.currentTarget) showLocateTarget(gameState.currentTarget);
}

function handleLocateClick(e) {
  // Walk up from the event target to find the nearest named path
  let el = e.target;
  while (el && el.tagName) {
    const name = getRegionName(el);
    if (name) { el = Object.assign(el, { _resolvedName: name }); break; }
    el = el.parentElement;
  }
  const clicked = el?._resolvedName || getRegionName(e.target);
  if (!clicked) return;
  if (gameState.guessedStates.includes(clicked)) return;

  gameState.totalAttempts++;

  if (clicked === gameState.currentTarget) {
    gameState.score++;
    gameState.currentStreak++;
    if (gameState.currentStreak > gameState.bestStreak) gameState.bestStreak = gameState.currentStreak;
    gameState.guessedStates.push(clicked);
    colorState(clicked, "#2D9E6B", true);
    playSound(sfxCorrect);
    onStreakUpdate();
    updateHUD();

    const next = pickRandomState();
    if (next) { gameState.currentTarget = next; showLocateTarget(next); }
    checkWin();

  } else {
    gameState.currentStreak = 0;
    trackMiss(gameState.currentTarget);
    flashRed(clicked);
    playSound(sfxWrong);
    updateHUD();

    if (gameState.gameMode === "challenge") {
      gameState.livesLeft--;
      updateHUD();
      if (gameState.livesLeft <= 0) endGame(false, "lives");
    }
  }
}


/* ============================================================
   FLAG MODE
   ============================================================ */
function getFlagRegions() {
  return CURRENT_REGIONS.filter(r => FLAGS[r]);
}

function setupFlagMode() {
  const available = getFlagRegions();
  if (available.length === 0) {
    showFeedback("No flag data available for this map.", "wrong");
    return;
  }
  const target = pickRandomFlagTarget();
  if (target) showFlagTarget(target);
}

function pickRandomFlagTarget() {
  const available = getFlagRegions().filter(r => !gameState.guessedStates.includes(r));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function showFlagTarget(name) {
  gameState.currentTarget = name;
  if (!flagContainer || !flagImage) return;
  const flagVal = FLAGS[name];
  if (!flagVal) return;

  const emojiEl = flagContainer.querySelector(".flag-emoji");
  if (emojiEl) {
    emojiEl.textContent = flagVal;
  } else {
    flagImage.style.display = "none";
    const span = document.createElement("div");
    span.className = "flag-emoji";
    span.textContent = flagVal;
    flagContainer.insertBefore(span, flagImage);
  }
  flagContainer.style.animation = "none";
  void flagContainer.offsetWidth;
  flagContainer.style.animation = "";
}

function handleFlagSubmit(raw, input) {
  if (!gameState.currentTarget) return;
  gameState.totalAttempts++;
  const correct = normalize(gameState.currentTarget);

  if (input === correct) {
    gameState.score++;
    gameState.currentStreak++;
    if (gameState.currentStreak > gameState.bestStreak) gameState.bestStreak = gameState.currentStreak;
    gameState.guessedStates.push(gameState.currentTarget);
    colorState(gameState.currentTarget, "#2D9E6B", true);
    showFeedback(`✓ ${gameState.currentTarget}`, "correct");
    playSound(sfxCorrect);
    onStreakUpdate();
    updateHUD();
    const next = pickRandomFlagTarget();
    if (next) showFlagTarget(next);
    checkWin();
  } else {
    gameState.currentStreak = 0;
    trackMiss(gameState.currentTarget);
    showFeedback(`✗ Not correct. Try again!`, "wrong");
    playSound(sfxWrong);
    updateHUD();
    if (gameState.gameMode === "challenge") {
      gameState.livesLeft--;
      updateHUD();
      if (gameState.livesLeft <= 0) endGame(false, "lives");
    }
  }
}


/* ============================================================
   CAPITAL MODE
   ============================================================ */
function getCapitalData() {
  if (currentMapKey === "world") return CAPITALS.world;
  if (CAPITALS[currentMapKey])   return CAPITALS[currentMapKey];
  return null;
}

function getCapitalRegions() {
  const data = getCapitalData();
  if (!data) return [];
  return CURRENT_REGIONS.filter(r => data[r]);
}

function setupCapitalMode() {
  const available = getCapitalRegions();
  if (available.length === 0) {
    showFeedback("No capital data available for this map.", "wrong");
    return;
  }
  const target = pickRandomCapitalTarget();
  if (target) showCapitalTarget(target);
}

function pickRandomCapitalTarget() {
  const available = getCapitalRegions().filter(r => !gameState.guessedStates.includes(r));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function showCapitalTarget(name) {
  gameState.currentTarget = name;
  if (!capitalPrompt) return;
  const regionEl = capitalPrompt.querySelector(".capital-region");
  if (regionEl) regionEl.textContent = name;
  capitalPrompt.style.animation = "none";
  void capitalPrompt.offsetWidth;
  capitalPrompt.style.animation = "";
}

function handleCapitalSubmit(raw, input) {
  if (!gameState.currentTarget) return;
  const data = getCapitalData();
  if (!data) return;

  gameState.totalAttempts++;
  const correctCapital = data[gameState.currentTarget];
  const correctNorm    = normalize(correctCapital);

  if (input === correctNorm) {
    gameState.score++;
    gameState.currentStreak++;
    if (gameState.currentStreak > gameState.bestStreak) gameState.bestStreak = gameState.currentStreak;
    gameState.guessedStates.push(gameState.currentTarget);
    colorState(gameState.currentTarget, "#2D9E6B", true);
    showFeedback(`✓ ${correctCapital}`, "correct");
    playSound(sfxCorrect);
    onStreakUpdate();
    updateHUD();
    const next = pickRandomCapitalTarget();
    if (next) showCapitalTarget(next);
    checkWin();
  } else {
    gameState.currentStreak = 0;
    trackMiss(gameState.currentTarget);
    showFeedback(`✗ Incorrect. Hint: starts with "${correctCapital[0]}"`, "wrong");
    playSound(sfxWrong);
    updateHUD();
    if (gameState.gameMode === "challenge") {
      gameState.livesLeft--;
      updateHUD();
      if (gameState.livesLeft <= 0) endGame(false, "lives");
    }
  }
}