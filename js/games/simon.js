/* ============================================================
   RetroNova — Simon (Повтори за мной)
   Память: растущая цветная последовательность, 4 тона через sfx
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  const COLORS = ['#8B5CF6', '#06B6D4', '#22C55E', '#F59E0B'];
  const TONES = ['select', 'click', 'power', 'coin'];

  const STYLE = [
    '.sn-root{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;',
    '  justify-content:center;gap:12px;padding:12px;box-sizing:border-box;overflow:hidden;',
    '  background:radial-gradient(130% 100% at 50% 0%,#161D38 0%,#0B0E1A 70%);',
    '  font-family:var(--font-body);color:var(--text);user-select:none;-webkit-user-select:none;',
    '  touch-action:manipulation;}',
    '.sn-top{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}',
    '.sn-pill{display:inline-flex;gap:6px;align-items:center;padding:6px 13px;border-radius:30px;',
    '  background:var(--glass);border:1px solid var(--border);font-size:12.5px;font-weight:600;',
    '  color:var(--muted);letter-spacing:.02em;}',
    '.sn-pill b{font-family:var(--font-mono);font-size:13.5px;color:#C4B5FD;}',
    '.sn-status{font-family:var(--font-head);font-weight:700;',
    '  font-size:clamp(15px,4.4vw,19px);letter-spacing:.1em;text-transform:uppercase;',
    '  color:#67E8F9;min-height:24px;text-align:center;transition:color .18s,text-shadow .18s;}',
    '.sn-status.ok{color:#4ADE80;text-shadow:0 0 16px rgba(74,222,128,.55);}',
    '.sn-status.bad{color:#F87171;text-shadow:0 0 16px rgba(248,113,113,.6);}',
    '.sn-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:11px;',
    '  width:300px;height:300px;}',
    '.sn-btn{border:none;border-radius:24px;cursor:pointer;opacity:.5;padding:0;',
    '  transition:transform .11s var(--ease),opacity .11s,box-shadow .11s,filter .11s;',
    '  box-shadow:inset 0 -7px 20px rgba(0,0,0,.42),inset 0 3px 10px rgba(255,255,255,.2);',
    '  -webkit-tap-highlight-color:transparent;touch-action:manipulation;}',
    '.sn-btn:hover{opacity:.74;}',
    '.sn-btn.on{opacity:1;transform:scale(1.05);filter:brightness(1.8) saturate(1.15);',
    '  box-shadow:0 0 40px var(--c),inset 0 0 26px rgba(255,255,255,.4);}',
    '.sn-hint{font-size:12px;color:var(--muted);text-align:center;}',
    '.sn-flash{position:absolute;inset:0;background:rgba(239,68,68,.42);opacity:0;',
    '  pointer-events:none;transition:opacity .3s;z-index:4;}',
    '.sn-flash.on{opacity:1;}',
    '.sn-card{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    '  padding:16px;background:rgba(9,11,20,.84);backdrop-filter:blur(7px);z-index:6;}',
    '.sn-card .box{background:rgba(255,255,255,.06);border:1px solid var(--border-strong);',
    '  border-radius:20px;padding:22px 20px;max-width:340px;text-align:center;box-shadow:var(--shadow);}',
    '.sn-card h3{font-family:var(--font-head);margin:0 0 8px;font-size:21px;}',
    '.sn-card p{margin:0 0 14px;font-size:13.5px;color:var(--muted);line-height:1.55;}',
    '.sn-legend{display:flex;gap:7px;justify-content:center;margin-bottom:16px;}',
    '.sn-dot{width:26px;height:26px;border-radius:9px;box-shadow:inset 0 -3px 8px rgba(0,0,0,.4);}'
  ].join('');

  RN.games.register({
    id: 'simon',
    title: 'Повтори за мной',
    emoji: '🧠',
    genre: 'puzzle',
    year: 1978,
    touch: 'none',
    controls: 'Тапы по 4 кнопкам или клавиши 1–4 · R — заново · Esc — пауза',
    desc: 'Запоминайте растущую последовательность цветов и повторяйте её. Ошибка — конец игры.',
    goodAt: 10
  }, function (api) {
    const style = document.createElement('style');
    style.setAttribute('data-game-style', 'simon');
    style.textContent = STYLE;
    document.head.appendChild(style);

    api.stage.innerHTML =
      '<div class="sn-root">' +
      '  <div class="sn-top">' +
      '    <span class="sn-pill">Раунд <b data-sn="round">0</b></span>' +
      '    <span class="sn-pill">Очки <b data-sn="score">0</b></span>' +
      '    <span class="sn-pill">Рекорд <b data-sn="best">0</b></span>' +
      '  </div>' +
      '  <div class="sn-status" data-sn="status">Готовы?</div>' +
      '  <div class="sn-grid" data-sn="grid">' +
      '    <button class="sn-btn" type="button" data-i="0" aria-label="Фиолетовая"></button>' +
      '    <button class="sn-btn" type="button" data-i="1" aria-label="Циановая"></button>' +
      '    <button class="sn-btn" type="button" data-i="2" aria-label="Зелёная"></button>' +
      '    <button class="sn-btn" type="button" data-i="3" aria-label="Янтарная"></button>' +
      '  </div>' +
      '  <div class="sn-hint">Тап по цвету или клавиши 1–4</div>' +
      '  <div class="sn-flash" data-sn="flash"></div>' +
      '  <div class="sn-card" data-sn="card">' +
      '    <div class="box">' +
      '      <h3>🧠 Повтори за мной</h3>' +
      '      <p>Смотрите подсветку и повторяйте последовательность. С каждым раундом она становится длиннее.</p>' +
      '      <div class="sn-legend">' +
      '        <i class="sn-dot" style="background:#8B5CF6"></i>' +
      '        <i class="sn-dot" style="background:#06B6D4"></i>' +
      '        <i class="sn-dot" style="background:#22C55E"></i>' +
      '        <i class="sn-dot" style="background:#F59E0B"></i>' +
      '      </div>' +
      '      <button class="btn btn-primary btn-lg" type="button" data-sn="start">Старт</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    const root = api.stage.querySelector('.sn-root');
    const grid = api.stage.querySelector('[data-sn="grid"]');
    const statusEl = api.stage.querySelector('[data-sn="status"]');
    const flashEl = api.stage.querySelector('[data-sn="flash"]');
    const card = api.stage.querySelector('[data-sn="card"]');
    const startBtn = api.stage.querySelector('[data-sn="start"]');
    const roundEl = api.stage.querySelector('[data-sn="round"]');
    const scoreEl = api.stage.querySelector('[data-sn="score"]');
    const bestEl = api.stage.querySelector('[data-sn="best"]');
    const btns = Array.prototype.slice.call(grid.querySelectorAll('.sn-btn'));

    btns.forEach((b, i) => {
      b.style.background = COLORS[i];
      b.style.setProperty('--c', COLORS[i]);
    });

    let best = 0;
    const prof = api.profile();
    if (prof && prof.best) best = prof.best.simon || 0;
    bestEl.textContent = String(best);

    /* ---------- state ---------- */
    const ON = 0.42, OFF = 0.16;
    let mode = 'idle';            // idle | show | input | wait | fail
    let seq = [];
    let showIdx = 0, showPhase = 'on', showTimer = 0;
    let inputIdx = 0;
    let waitTimer = 0, failTimer = 0;
    let pressIdx = -1, pressTimer = 0;
    let score = 0;
    let ended = false;
    let ro = null;

    /* ---------- helpers ---------- */
    function setStatus(text, cls) {
      statusEl.textContent = text;
      statusEl.className = 'sn-status' + (cls ? ' ' + cls : '');
    }
    function updateHud() {
      roundEl.textContent = String(seq.length);
      scoreEl.textContent = String(score);
      bestEl.textContent = String(best);
    }
    function light(i, on) {
      const b = btns[i];
      if (b) b.classList.toggle('on', !!on);
    }
    function clearLights() {
      btns.forEach(b => b.classList.remove('on'));
    }
    function tone(i) {
      api.sfx(TONES[i]);
    }
    function rnd() {
      return (Math.random() * 4) | 0;
    }

    /* ---------- flow ---------- */
    function startGame() {
      if (card) { card.remove(); }
      seq = [rnd()];
      score = 0;
      api.setScore(0);
      flashEl.classList.remove('on');
      beginShow();
    }

    function beginShow() {
      mode = 'show';
      showIdx = 0;
      showPhase = 'on';
      showTimer = ON;
      clearLights();
      light(seq[0], true);
      tone(seq[0]);
      setStatus('Смотрите', '');
      updateHud();
    }

    function hit(i) {
      if (pressIdx >= 0 && pressIdx !== i) light(pressIdx, false);
      pressIdx = i;
      pressTimer = 0.22;
      light(i, true);
      tone(i);

      if (seq[inputIdx] !== i) { fail(); return; }
      inputIdx++;
      if (inputIdx >= seq.length) {
        score = seq.length - 1;
        api.setScore(score);
        mode = 'wait';
        waitTimer = 0.8;
        clearLights();
        pressIdx = -1;
        pressTimer = 0;
        setStatus('Верно!', 'ok');
        updateHud();
      }
    }

    function fail() {
      mode = 'fail';
      failTimer = 0.95;
      clearLights();
      pressIdx = -1;
      pressTimer = 0;
      setStatus('Ошибка!', 'bad');
      flashEl.classList.add('on');
      api.sfx('error');
      updateHud();
    }

    function endGame() {
      if (ended) return;
      ended = true;
      api.gameOver(score, {
        icon: '🧠',
        message: 'Пройдено раундов: ' + score + (score >= 10 ? ' · Отличная память!' : '')
      });
    }

    /* ---------- input ---------- */
    function onBtnDown(e, i) {
      e.preventDefault();
      if (mode === 'input') hit(i);
    }
    const btnListeners = btns.map((b, i) => {
      const fn = e => onBtnDown(e, i);
      b.addEventListener('pointerdown', fn);
      return { el: b, fn: fn };
    });

    function onStart() {
      if (mode === 'idle') startGame();
    }
    startBtn.addEventListener('click', onStart);

    /* ---------- layout ---------- */
    function fit() {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (!w || !h) return;
      const top = root.querySelector('.sn-top');
      const hint = root.querySelector('.sn-hint');
      const chrome = top.offsetHeight + statusEl.offsetHeight + hint.offsetHeight +
        12 * 2 + 12 * 4; // padding + gaps
      const size = Math.max(150, Math.min(400, w - 24, h - chrome));
      grid.style.width = size + 'px';
      grid.style.height = size + 'px';
    }
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => fit());
      ro.observe(root);
    }
    fit();

    /* ---------- loop ---------- */
    const loop = api.loop(function (dt) {
      if (pressTimer > 0) {
        pressTimer -= dt;
        if (pressTimer <= 0 && pressIdx >= 0) {
          light(pressIdx, false);
          pressIdx = -1;
        }
      }

      if (mode === 'idle' && (api.input.pressed('Space') || api.input.pressed('Enter'))) {
        startGame();
      }

      if (mode === 'input') {
        for (let i = 0; i < 4; i++) {
          if (api.input.pressed(String(i + 1))) hit(i);
        }
      }

      if (mode === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) {
          if (showPhase === 'on') {
            light(seq[showIdx], false);
            showPhase = 'off';
            showTimer = OFF;
          } else {
            showIdx++;
            if (showIdx >= seq.length) {
              mode = 'input';
              inputIdx = 0;
              setStatus('Повторяйте', 'ok');
            } else {
              light(seq[showIdx], true);
              tone(seq[showIdx]);
              showPhase = 'on';
              showTimer = ON;
            }
          }
        }
      } else if (mode === 'wait') {
        waitTimer -= dt;
        if (waitTimer <= 0) {
          seq.push(rnd());
          beginShow();
        }
      } else if (mode === 'fail') {
        failTimer -= dt;
        if (failTimer <= 0) endGame();
      }
    }, null);

    updateHud();

    return {
      destroy() {
        loop.stop();
        if (ro) { ro.disconnect(); ro = null; }
        btnListeners.forEach(x => x.el.removeEventListener('pointerdown', x.fn));
        startBtn.removeEventListener('click', onStart);
        if (style.parentNode) style.parentNode.removeChild(style);
        api.stage.innerHTML = '';
      }
    };
  });
})();
