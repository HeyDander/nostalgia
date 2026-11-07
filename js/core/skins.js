/* ============================================================
   RetroNova — Skins: apply equipped items to the DOM
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  let particleCleanup = null;

  function apply(p) {
    p = p || RN.db.profile();
    const root = document.documentElement;
    const body = document.body;
    if (!p) {
      root.setAttribute('data-theme', 'default');
      body.className = body.className.replace(/\bbg-\w+\b/g, '').trim();
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-2');
      root.style.removeProperty('--accent-rgb');
      root.style.removeProperty('--accent-2-rgb');
      clearEffects();
      return;
    }
    const eq = p.equipped || {};
    const S = RN.shop;

    /* theme */
    const theme = S.byId(eq.theme);
    root.setAttribute('data-theme', theme && theme.val ? theme.val : 'default');

    /* background */
    const bg = S.byId(eq.bg);
    body.classList.remove('bg-stars', 'bg-dots', 'bg-mesh', 'bg-carbon');
    if (bg && bg.val) body.classList.add(bg.val);

    /* accent */
    const acc = S.byId(eq.accent);
    if (acc && acc.kind === 'accent') {
      root.style.setProperty('--accent-rgb', acc.val);
      root.style.setProperty('--accent-2-rgb', acc.val2);
      root.style.setProperty('--accent', 'rgb(' + acc.val + ')');
      root.style.setProperty('--accent-2', 'rgb(' + acc.val2 + ')');
      root.style.setProperty('--grad-text', acc.animate
        ? 'linear-gradient(120deg, rgb(' + acc.val + '), rgb(' + acc.val2 + '), rgb(' + acc.val + '))'
        : 'linear-gradient(120deg, rgb(' + acc.val + '), rgb(' + acc.val2 + '), #22C55E)');
    } else {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-2');
      root.style.removeProperty('--accent-rgb');
      root.style.removeProperty('--accent-2-rgb');
    }

    /* frame on all avatars */
    body.classList.remove('frame-common', 'frame-rare', 'frame-epic', 'frame-legendary', 'animated-frame');
    const frame = S.byId(eq.frame);
    if (frame && frame.val) {
      body.classList.add(frame.val);
      if (frame.animate) body.classList.add('animated-frame');
    }

    /* effects */
    clearEffects();
    const fx = S.byId(eq.effect);
    if (fx && fx.val) {
      body.classList.add(fx.val);
      if (fx.val === 'fx-particles') startParticles();
    }

    /* reduce motion setting */
    if (p.settings && p.settings.reduceMotion) body.classList.add('reduce-motion');
    else body.classList.remove('reduce-motion');

    /* sound preference */
    if (RN.sfx) RN.sfx.enabled = !!(p.settings && p.settings.sound);
    if (RN.sfx) RN.sfx.volume = p.settings && typeof p.settings.sfxVolume === 'number' ? p.settings.sfxVolume : 0.6;
  }

  function clearEffects() {
    document.body.classList.remove('fx-glow', 'fx-shine', 'fx-scanlines', 'fx-rainbow');
    if (particleCleanup) { particleCleanup(); particleCleanup = null; }
  }

  /* Cursor spark particles (equipped effect) */
  function startParticles() {
    const layer = document.createElement('div');
    layer.className = 'fx-particle-layer';
    document.body.appendChild(layer);
    let last = 0;
    function move(e) {
      const now = Date.now();
      if (now - last < 45) return;
      last = now;
      const dot = document.createElement('i');
      dot.style.left = (e.clientX || 0) + 'px';
      dot.style.top = (e.clientY || 0) + 'px';
      layer.appendChild(dot);
      setTimeout(() => dot.remove(), 700);
    }
    window.addEventListener('pointermove', move, { passive: true });
    particleCleanup = () => {
      window.removeEventListener('pointermove', move);
      layer.remove();
    };
  }

  /* What snake colors the current player has equipped (used by games) */
  function snakePalette(p) {
    p = p || RN.db.profile();
    const eq = (p && p.equipped && p.equipped.snake) || 'snake_classic';
    const item = RN.shop.byId(eq) || RN.shop.byId('snake_classic');
    return { head: item.val, body: item.val2, id: item.id, animated: item.val === 'rainbow' };
  }

  RN.skins = { apply, snakePalette };
})();
