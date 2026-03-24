/* ============================================================
   MapMaster | audio.js
   Sound effects via Web Audio API and data-URI Audio elements.
   ============================================================ */

let soundEnabled = true;

// Short data-URI beeps
const sfxCorrect = new Audio("data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTgAAAA" +
  "AgICAgICAgH+AfYB7gHmAeIB3gHeAeIB6gH2AgICEgIiAjICRgJaAnACi");
const sfxWrong   = new Audio("data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTgAAAA" +
  "AgICAgICAgICAgICAgICAgICAgH+AfYB7gHmAeIB4gHmAe4B/gIOAiICP");
sfxCorrect.volume = 0.18;
sfxWrong.volume   = 0.12;

// Synthesized sounds via AudioContext
function createSfx(type) {
  return {
    play() {
      if (!soundEnabled) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        if (type === "streak") {
          [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
            g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.08 + 0.04);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.08 + 0.12);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.15);
          });
        } else if (type === "tick") {
          const osc = ctx.createOscillator();
          osc.type = "square";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06);
          osc.connect(gain);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.07);
        } else if (type === "win") {
          [523, 659, 784, 1047, 1319].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = "triangle";
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
            g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.1 + 0.05);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.1 + 0.25);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.1);
            osc.stop(ctx.currentTime + i * 0.1 + 0.3);
          });
        } else if (type === "lose") {
          [392, 349, 294, 220].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.15);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.2);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.25);
          });
        }
        setTimeout(() => ctx.close(), 2000);
      } catch(_) {}
    }
  };
}

const sfxStreak = createSfx("streak");
const sfxTick   = createSfx("tick");
const sfxWin    = createSfx("win");
const sfxLose   = createSfx("lose");

let lastTickPlayed = -1;

/** Play a sound effect if sound is enabled */
function playSound(sfx) {
  if (!soundEnabled) return;
  if (typeof sfx.play === "function" && !(sfx instanceof Audio)) {
    sfx.play();
    return;
  }
  try {
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  } catch (_) {}
}
