/* ============================================================
   RetroNova — Games: registry, input kit, game shell
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const registry = {};
  const order = [];

  function register(meta, factory) {
    if (!meta || !meta.id) throw new Error('game meta.id required');
    if (typeof factory !== 'function') throw new Error('game factory required for ' + meta.id);
    registry[meta.id] = Object.assign({
      genre: 'arcade',
      emoji: '🎮',
      orientation: 'any',      // 'portrait' | 'landscape' | 'any'
      touch: 'auto',           // 'dpad' | 'buttons' | 'swipe' | 'tap' | 'none'
      controls: '',
      desc: '',
      goodAt: 0,               // score threshold for "good result" coin bonus
      minPlayers: 1
    }, meta, { factory });
    if (order.indexOf(meta.id) === -1) order.push(meta.id);
  }

  function get(id) { return registry[id] || null; }
  function all() { return order.map(id => registry[id]); }
  function byGenre(g) { return all().filter(x => x.genre === g); }

  /* ==========================================================
     INPUT KIT — shared keyboard/touch/pointer state for games
     ========================================================== */
  function createInput(shell) {
    const down = Object.create(null);
    const pressed = Object.create(null);
    const released = Object.create(null);
    const touch = { up: false, down: false, left: false, right: false, a: false, b: false };
    const touchPressed = { up: false, down: false, left: false, right: false, a: false, b: false };
    const pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false };
    let enabled = true;

    function isTyping(e) {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    }

    function onKeyDown(e) {
      if (!enabled || isTyping(e)) return;
      const k = normKey(e.key, e.code);
      if (!down[k]) pressed[k] = true;
      down[k] = true;
      // prevent page scroll for game keys
      if (GAME_KEYS.has(k)) { e.preventDefault(); }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
        // shell handles pause separately; don't block
      }
    }
    function onKeyUp(e) {
      const k = normKey(e.key, e.code);
      down[k] = false;
      released[k] = true;
    }
    function onBlur() {
      for (const k in down) down[k] = false;
      for (const k in touch) { touch[k] = false; }
    }

    const GAME_KEYS = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter',
      'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'Shift', 'Tab'
    ]);

    function normKey(key, code) {
      if (key === ' ') return 'Space';
      if (key && key.length === 1) {
        const lower = key.toLowerCase();
        // WASD transliteration-independent: use raw letter
        return lower;
      }
      return key;
    }

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const input = {
      touch, pointer,
      down: k => !!down[normKey(k, k)],
      pressed: k => !!pressed[normKey(k, k)],
      released: k => !!released[normKey(k, k)],
      touchPressed: k => !!touchPressed[k],
      setTouch(k, v) {
        if (!(k in touch)) return;
        if (v && !touch[k]) touchPressed[k] = true;
        touch[k] = v;
      },
      anyDirection() { return touch.left || touch.right || touch.up || touch.down || down['ArrowLeft'] || down['ArrowRight'] || down['ArrowUp'] || down['ArrowDown'] || down['a'] || down['d'] || down['w'] || down['s']; },
      /* clear per-frame edges — call at end of each frame */
      endFrame() {
        for (const k in pressed) pressed[k] = false;
        for (const k in released) released[k] = false;
        for (const k in touchPressed) touchPressed[k] = false;
        pointer.justDown = false;
        pointer.justUp = false;
      },
      setEnabled(v) { enabled = v; },
      destroy() {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
      }
    };
    return input;
  }

  /* ==========================================================
     CANVAS HELPER — DPR-aware, auto-resize
     ========================================================== */
  function createCanvas(container, opts) {
    opts = opts || {};
    const canvas = document.createElement('canvas');
    canvas.className = 'game-canvas' + (opts.className ? ' ' + opts.className : '');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const state = { w: 640, h: 360, dpr: 1 };

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = Math.max(80, Math.floor(rect.width));
      let h = Math.max(80, Math.floor(rect.height));
      if (opts.aspect) {
        // fit aspect inside container and center it
        const target = opts.aspect;
        if (w / h > target) w = Math.floor(h * target);
        else h = Math.floor(w / target);
      }
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (opts.aspect) {
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      } else {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
      state.w = w; state.h = h; state.dpr = dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    resize();

    return {
      canvas, ctx, get w() { return state.w; }, get h() { return state.h; },
      resize,
      destroy() { ro.disconnect(); canvas.remove(); },
      /* pointer in canvas logical coords */
      bindPointer(onDown, onMove, onUp) {
        function pos(e) {
          const r = canvas.getBoundingClientRect();
          return { x: (e.clientX - r.left) / r.width * state.w, y: (e.clientY - r.top) / r.height * state.h };
        }
        const d = e => { const p = pos(e); onDown && onDown(p.x, p.y, e); };
        const m = e => { const p = pos(e); onMove && onMove(p.x, p.y, e); };
        const u = e => { const p = pos(e); onUp && onUp(p.x, p.y, e); };
        canvas.addEventListener('pointerdown', d);
        canvas.addEventListener('pointermove', m);
        window.addEventListener('pointerup', u);
        canvas.addEventListener('pointercancel', u);
        return () => {
          canvas.removeEventListener('pointerdown', d);
          canvas.removeEventListener('pointermove', m);
          window.removeEventListener('pointerup', u);
          canvas.removeEventListener('pointercancel', u);
        };
      },
      /* swipe detection on element */
      bindSwipe(el, cb) {
        let sx = 0, sy = 0, active = false;
        const s = e => { active = true; sx = e.clientX; sy = e.clientY; };
        const mv = e => {
          if (!active) return;
          const dx = e.clientX - sx, dy = e.clientY - sy;
          if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            cb(dir, e);
            sx = e.clientX; sy = e.clientY;
          }
        };
        const en = () => { active = false; };
        el.addEventListener('touchstart', s, { passive: true });
        el.addEventListener('touchmove', mv, { passive: true });
        el.addEventListener('touchend', en);
        return () => {
          el.removeEventListener('touchstart', s);
          el.removeEventListener('touchmove', mv);
          el.removeEventListener('touchend', en);
        };
      }
    };
  }

  /* ==========================================================
     LOOP — rAF with pause + dt clamp + auto cleanup
     ========================================================== */
  function createLoop(shell, update, draw) {
    let raf = 0, last = 0, running = true, t = 0;
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!last) last = now;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05; // clamp after tab switch
      const paused = shell.isPaused();
      if (!paused) t += dt;
      try {
        if (update && !paused) update(dt, t);
        if (draw) draw(paused ? 0 : dt, t, paused);
      } catch (e) {
        running = false;
        console.error('[game loop error]', e);
        shell.reportError(e);
        return;
      }
      shell.input.endFrame();
    }
    raf = requestAnimationFrame(frame);
    return {
      stop() { running = false; cancelAnimationFrame(raf); },
      get time() { return t; }
    };
  }

  RN.games = { register, get, all, byGenre, registry: () => registry, createInput, createCanvas, createLoop };

  /* ==========================================================
     GAME SHELL — page chrome: HUD, pause, restart, overlays
     ========================================================== */
  RN.gameShell = {
    mount(container, gameId, opts) {
      opts = opts || {};
      const meta = get(gameId);
      if (!meta) throw new Error('Игра не найдена: ' + gameId);

      const p = RN.db.profile();
      const palette = RN.skins.snakePalette(p);

      container.classList.add('game-shell');
      container.innerHTML = [
        '<div class="gs-hud">',
        '  <div class="gs-left">',
        '    <button class="gs-btn" data-act="back" title="К списку игр">←</button>',
        '    <div class="gs-title"><span class="gs-emoji">' + meta.emoji + '</span> ' + RN.esc(meta.title) + '</div>',
        '  </div>',
        '  <div class="gs-stats">',
        '    <div class="gs-stat"><span class="gs-stat-label">Очки</span><b data-score>0</b></div>',
        '    <div class="gs-stat gs-best"><span class="gs-stat-label">Рекорд</span><b data-best>' + RN.fmtNum((p && p.best[gameId]) || 0) + '</b></div>',
        '    <div class="gs-stat gs-coins"><span class="gs-stat-label">Coins</span><b data-coins>' + RN.fmtNum(p ? p.coins : 0) + '</b></div>',
        '  </div>',
        '  <div class="gs-right">',
        '    <button class="gs-btn" data-act="sound" title="Звук">🔊</button>',
        '    <button class="gs-btn" data-act="pause" title="Пауза (Esc)">⏸</button>',
        '    <button class="gs-btn" data-act="restart" title="Заново (R)">↻</button>',
        '    <button class="gs-btn" data-act="fs" title="Полный экран">⛶</button>',
        '  </div>',
        '</div>',
        '<div class="gs-stage" data-stage></div>',
        '<div class="gs-overlay" data-overlay></div>',
        '<div class="gs-touch" data-touch></div>',
        '<div class="gs-hint" data-hint></div>'
      ].join('');

      const stage = container.querySelector('[data-stage]');
      const overlay = container.querySelector('[data-overlay]');
      const touchWrap = container.querySelector('[data-touch]');
      const hintEl = container.querySelector('[data-hint]');
      const scoreEl = container.querySelector('[data-score]');
      const bestEl = container.querySelector('[data-best]');
      const coinsEl = container.querySelector('[data-coins]');

      const input = createInput();
      let paused = false, destroyed = false, ended = false;
      let score = 0;
      let instance = null;
      let runStart = Date.now();
      let loopHandle = null;
      let errorShown = false;

      /* ---- touch controls ---- */
      function buildTouch() {
        touchWrap.innerHTML = '';
        const mode = meta.touch === 'auto' ? (RN.isTouchDevice() ? 'dpad' : 'none') : meta.touch;
        if (mode === 'none') return;
        if (mode === 'swipe' || mode === 'tap') {
          touchWrap.classList.add('touch-zone');
          touchWrap.innerHTML = '<div class="touch-hint-msg">' + (mode === 'tap' ? 'Нажимайте по экрану' : 'Свайпайте для управления') + '</div>';
          return;
        }
        if (mode === 'dpad') {
          touchWrap.innerHTML =
            '<div class="dpad">' +
            '<button class="dpad-btn up" data-t="up">▲</button>' +
            '<button class="dpad-btn left" data-t="left">◀</button>' +
            '<button class="dpad-btn right" data-t="right">▶</button>' +
            '<button class="dpad-btn down" data-t="down">▼</button>' +
            '</div>';
        } else if (mode === 'buttons') {
          touchWrap.innerHTML =
            '<div class="tbtns">' +
            '<button class="tbtn b-b" data-t="b">B</button>' +
            '<button class="tbtn b-a" data-t="a">A</button>' +
            '</div>';
        } else if (mode === 'both') {
          touchWrap.innerHTML =
            '<div class="dpad">' +
            '<button class="dpad-btn up" data-t="up">▲</button>' +
            '<button class="dpad-btn left" data-t="left">◀</button>' +
            '<button class="dpad-btn right" data-t="right">▶</button>' +
            '<button class="dpad-btn down" data-t="down">▼</button>' +
            '</div>' +
            '<div class="tbtns">' +
            '<button class="tbtn b-b" data-t="b">B</button>' +
            '<button class="tbtn b-a" data-t="a">A</button>' +
            '</div>';
        }
        touchWrap.querySelectorAll('[data-t]').forEach(btn => {
          const k = btn.getAttribute('data-t');
          const on = e => { e.preventDefault(); btn.classList.add('active'); input.setTouch(k, true); };
          const off = e => { e.preventDefault(); btn.classList.remove('active'); input.setTouch(k, false); };
          btn.addEventListener('touchstart', on, { passive: false });
          btn.addEventListener('touchend', off);
          btn.addEventListener('touchcancel', off);
          btn.addEventListener('mousedown', on);
          btn.addEventListener('mouseup', off);
          btn.addEventListener('mouseleave', off);
        });
      }

      /* ---- score / best ---- */
      function setScore(v) {
        score = v;
        scoreEl.textContent = typeof v === 'number' ? RN.fmtNum(v) : String(v);
      }
      function setBest(v) { bestEl.textContent = RN.fmtNum(v); }
      function addScore(d) { setScore(score + d); }

      /* ---- pause ---- */
      function setPaused(v) {
        if (destroyed || ended) return;
        paused = v;
        const btn = container.querySelector('[data-act="pause"]');
        btn.textContent = paused ? '▶' : '⏸';
        btn.classList.toggle('is-on', paused);
        if (paused) {
          showOverlay(
            '<div class="ov-card"><div class="ov-ico">⏸</div><h3>Пауза</h3>' +
            '<p class="muted">' + RN.esc(meta.controls || '') + '</p>' +
            '<div class="ov-actions">' +
            '<button class="btn btn-primary btn-lg" data-ov="resume">Продолжить</button>' +
            '<button class="btn" data-ov="restart">Заново</button>' +
            '<button class="btn btn-ghost" data-ov="exit">Выйти</button>' +
            '</div></div>'
          );
          RN.sfx.play('click');
        } else {
          hideOverlay();
          runStart = runStart || Date.now();
          RN.sfx.play('click');
        }
      }

      /* ---- overlay ---- */
      function showOverlay(html) {
        overlay.innerHTML = html;
        overlay.classList.add('show');
      }
      function hideOverlay() {
        overlay.classList.remove('show');
        overlay.innerHTML = '';
      }
      overlay.addEventListener('click', e => {
        const b = e.target.closest('[data-ov]');
        if (!b) return;
        const act = b.getAttribute('data-ov');
        if (act === 'resume') setPaused(false);
        else if (act === 'restart') { hideOverlay(); setPaused(false); restart(); }
        else if (act === 'exit') RN.router.go('games');
        else if (act === 'again') { hideOverlay(); setPaused(false); restart(); }
      });

      /* ---- game over ---- */
      function gameOver(finalScore, o) {
        if (destroyed || ended) return;
        ended = true;
        o = o || {};
        const val = typeof finalScore === 'number' ? Math.max(0, Math.round(finalScore)) : score;
        setScore(val);

        const runMs = Date.now() - runStart;
        const res = RN.economy.awardRun(gameId, val, { goodAt: meta.goodAt, runMs: runMs });
        const best = RN.db.profile() ? (RN.db.profile().best[gameId] || 0) : 0;
        setBest(best);
        if (coinsEl) coinsEl.textContent = RN.fmtNum(RN.db.profile() ? RN.db.profile().coins : 0);

        const isRecord = res && res.record > 0;
        if (isRecord) RN.sfx.play('record');
        else if (o.win) RN.sfx.play('win');
        else RN.sfx.play('over');

        const title = o.win ? (o.winTitle || 'Победа!') : (o.loseTitle || 'Игра окончена');
        const coinsLine = res && res.total > 0
          ? '<div class="ov-coins"><span class="coin-ico">C</span> +' + res.total + ' Coins' +
            (res.blocked ? '<div class="ov-blocked small muted">Частые перезапуски: базовая награда приостановлена</div>' : '') +
            '</div>'
          : (res && res.blocked ? '<div class="ov-coins muted small">Награда за игру временно недоступна — рекорд всё равно учтён</div>' : '');

        showOverlay(
          '<div class="ov-card ' + (isRecord ? 'ov-record' : '') + '">' +
          (isRecord ? '<div class="ov-newrec">НОВЫЙ РЕКОРД!</div>' : '') +
          '<div class="ov-ico">' + (o.win ? '🏆' : (o.icon || '🎮')) + '</div>' +
          '<h3>' + RN.esc(title) + '</h3>' +
          '<div class="ov-score">' + RN.fmtNum(val) + '</div>' +
          '<div class="ov-sub muted">' + (o.message ? RN.esc(o.message) : 'Ваш результат') +
          (best > 0 ? ' · Рекорд: ' + RN.fmtNum(best) : '') + '</div>' +
          coinsLine +
          '<div class="ov-actions">' +
          '<button class="btn btn-primary btn-lg" data-ov="again">Ещё раз</button>' +
          '<button class="btn" data-ov="exit">К играм</button>' +
          '</div></div>'
        );
        document.dispatchEvent(new CustomEvent('rn:gameover', { detail: { gameId, score: val, res } }));
      }

      /* ---- restart ---- */
      function restart() {
        destroyInstance();
        score = 0;
        setScore(0);
        ended = false;
        paused = false;
        runStart = Date.now();
        hideOverlay();
        container.querySelector('[data-act="pause"]').textContent = '⏸';
        mountGame();
      }

      /* ---- mount game instance ---- */
      function api() {
        return {
          id: gameId,
          meta,
          input,
          palette,
          setScore, addScore, getScore: () => score,
          setBest,
          gameOver,
          isPaused: () => paused,
          pause: () => setPaused(true),
          resume: () => setPaused(false),
          restart,
          loop: (u, d) => { const h = createLoop(api(), u, d); loopHandle = h; return h; },
          createCanvas: (o) => createCanvas(stage, o),
          stage,
          sfx: name => RN.sfx.play(name),
          sfxEnabled: () => RN.sfx.enabled,
          showOverlay, hideOverlay,
          setColor: c => { if (c) container.style.setProperty('--gs-accent', c); },
          reportError: e => reportError(e),
          profile: () => RN.db.profile()
        };
      }

      function reportError(e) {
        if (errorShown) return;
        errorShown = true;
        console.error('[RetroNova] game error:', gameId, e);
        showOverlay(
          '<div class="ov-card"><div class="ov-ico">⚠️</div><h3>Ошибка в игре</h3>' +
          '<p class="muted small mono">' + RN.esc((e && e.message) || e) + '</p>' +
          '<div class="ov-actions"><button class="btn btn-primary" data-ov="restart">Перезапустить</button>' +
          '<button class="btn" data-ov="exit">К играм</button></div></div>'
        );
      }

      function mountGame() {
        errorShown = false;
        try {
          instance = meta.factory(api());
          if (instance && typeof instance.destroy === 'function') {
            // ok
          } else if (instance && typeof instance === 'object') {
            // allow {destroy}
          } else {
            instance = null;
          }
        } catch (e) {
          reportError(e);
          instance = null;
        }
      }

      function destroyInstance() {
        if (loopHandle) { try { loopHandle.stop(); } catch (e) {} loopHandle = null; }
        if (instance && typeof instance.destroy === 'function') {
          try { instance.destroy(); } catch (e) { console.error('destroy error', e); }
        }
        instance = null;
        stage.innerHTML = '';
      }

      /* ---- hint ---- */
      if (meta.controls) {
        hintEl.innerHTML = '<span class="gs-hint-ico">⌨️</span> ' + RN.esc(meta.controls);
        hintEl.classList.add('show');
        setTimeout(() => hintEl.classList.remove('show'), 5200);
      }

      /* ---- buttons ---- */
      container.querySelector('[data-act="back"]').addEventListener('click', () => RN.router.go('games'));
      container.querySelector('[data-act="pause"]').addEventListener('click', () => setPaused(!paused));
      container.querySelector('[data-act="restart"]').addEventListener('click', () => { RN.sfx.play('click'); restart(); });
      container.querySelector('[data-act="sound"]').addEventListener('click', function () {
        const prof = RN.db.profile();
        if (prof) { prof.settings.sound = !prof.settings.sound; RN.db.save(); }
        RN.sfx.enabled = prof ? prof.settings.sound : !RN.sfx.enabled;
        this.textContent = RN.sfx.enabled ? '🔊' : '🔇';
        this.classList.toggle('is-on', !RN.sfx.enabled);
      });
      container.querySelector('[data-act="fs"]').addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else container.requestFullscreen && container.requestFullscreen().catch(() => {});
      });
      const soundBtn = container.querySelector('[data-act="sound"]');
      soundBtn.textContent = RN.sfx.enabled ? '🔊' : '🔇';

      /* ---- global hotkeys (scoped while shell mounted) ---- */
      function onKey(e) {
        if (destroyed) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (e.key === 'Escape') { e.preventDefault(); setPaused(!paused); }
        else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
          if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); restart(); }
        }
      }
      window.addEventListener('keydown', onKey);

      /* ---- track playtime ---- */
      const playTimer = setInterval(() => {
        if (destroyed) return;
        const prof = RN.db.profile();
        if (prof && !paused && !document.hidden) {
          prof.stats.timePlayed = (prof.stats.timePlayed || 0) + 5;
        }
      }, 5000);

      /* ---- boot ---- */
      buildTouch();
      mountGame();
      document.dispatchEvent(new CustomEvent('rn:gamefocus', { detail: { gameId } }));

      return function cleanup() {
        destroyed = true;
        clearInterval(playTimer);
        window.removeEventListener('keydown', onKey);
        destroyInstance();
        input.destroy();
        container.classList.remove('game-shell');
        container.innerHTML = '';
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      };
    }
  };

  RN.isTouchDevice = function () {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  };
})();
