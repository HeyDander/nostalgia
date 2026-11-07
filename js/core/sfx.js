/* ============================================================
   RetroNova — SFX: tiny WebAudio synthesizer (no assets)
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});
  let ctx = null;
  let enabled = true;
  let volume = 0.6;

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!enabled) return;
    const c = ac();
    if (!c) return;
    try {
      const t0 = c.currentTime + (when || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
      const v = (vol == null ? 0.16 : vol) * volume;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    } catch (e) { /* audio blocked */ }
  }

  const recipes = {
    click: () => tone(660, 0.07, 'square', 0.1),
    hover: () => tone(880, 0.04, 'sine', 0.05),
    coin: () => { tone(988, 0.09, 'square', 0.14); tone(1319, 0.16, 'square', 0.14, 0.07); },
    buy: () => { tone(523, 0.1, 'triangle', 0.16); tone(784, 0.12, 'triangle', 0.16, 0.08); tone(1047, 0.2, 'triangle', 0.16, 0.16); },
    success: () => { tone(659, 0.1, 'sine', 0.15); tone(880, 0.16, 'sine', 0.15, 0.09); },
    error: () => tone(220, 0.24, 'sawtooth', 0.14, 0, 110),
    over: () => { tone(392, 0.16, 'square', 0.14); tone(311, 0.2, 'square', 0.14, 0.13); tone(196, 0.42, 'square', 0.16, 0.27); },
    win: () => { tone(523, 0.12, 'square', 0.14); tone(659, 0.12, 'square', 0.14, 0.1); tone(784, 0.12, 'square', 0.14, 0.2); tone(1047, 0.3, 'square', 0.16, 0.3); },
    record: () => { tone(659, 0.1, 'square', 0.15); tone(880, 0.1, 'square', 0.15, 0.09); tone(1175, 0.1, 'square', 0.15, 0.18); tone(1568, 0.34, 'square', 0.17, 0.27); },
    bounce: () => tone(440, 0.06, 'square', 0.12, 0, 300),
    explode: () => tone(140, 0.32, 'sawtooth', 0.2, 0, 40),
    jump: () => tone(340, 0.13, 'square', 0.1, 0, 620),
    power: () => { tone(440, 0.08, 'sine', 0.14); tone(660, 0.08, 'sine', 0.14, 0.06); tone(880, 0.12, 'sine', 0.14, 0.12); },
    select: () => tone(740, 0.05, 'sine', 0.1),
    type: () => tone(1100 + Math.random() * 400, 0.03, 'square', 0.05),
    achievement: () => { tone(784, 0.12, 'triangle', 0.16); tone(988, 0.12, 'triangle', 0.16, 0.1); tone(1319, 0.26, 'triangle', 0.16, 0.2); }
  };

  RN.sfx = {
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
    get volume() { return volume; },
    set volume(v) { volume = Math.max(0, Math.min(1, v)); },
    play(name) {
      try {
        const fn = recipes[name];
        if (fn) fn();
      } catch (e) { /* ignore */ }
    },
    unlock() { ac(); }
  };

  // unlock audio on first user gesture
  ['pointerdown', 'keydown'].forEach(ev =>
    window.addEventListener(ev, function once() { ac(); window.removeEventListener(ev, once); }, { once: true, passive: true })
  );
})();
