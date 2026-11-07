/* ============================================================
   RetroNova — Minesweeper (Сапёр)
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  const LEVELS = {
    easy:   { label: 'Новичок · 9×9 · 10 мин',    cols: 9,  rows: 9,  mines: 10, base: 3000,  sec: 10, flag: 5 },
    medium: { label: 'Любитель · 16×16 · 40 мин', cols: 16, rows: 16, mines: 40, base: 7000,  sec: 14, flag: 6 },
    hard:   { label: 'Профи · 16×30 · 99 мин',    cols: 30, rows: 16, mines: 99, base: 12000, sec: 18, flag: 8 }
  };
  let level = 'easy'; // сохраняется между перезапусками

  const STYLE = [
    '.ms-root{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;padding:10px;',
    '  background:#0B0E1A;font-family:var(--font-body);min-height:0;overflow:hidden;}',
    '.ms-bar{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;}',
    '.ms-sel{width:auto;max-width:100%;padding:7px 30px 7px 12px;font-size:13px;border-radius:10px;',
    '  background:rgba(0,0,0,.32);border:1px solid var(--border);color:var(--text);cursor:pointer;}',
    '.ms-pill{display:inline-flex;gap:6px;align-items:center;padding:6px 13px;border-radius:30px;',
    '  background:var(--glass);border:1px solid var(--border);font-size:13px;font-weight:700;',
    '  font-family:var(--font-head);color:var(--text-2);}',
    '.ms-pill b{color:#FCD34D;font-variant-numeric:tabular-nums;min-width:34px;text-align:right;}',
    '.ms-pill.time b{color:#67E8F9;}',
    '.ms-scroll{flex:1;min-height:0;overflow:auto;display:flex;padding:6px;border-radius:14px;',
    '  background:rgba(255,255,255,.03);border:1px solid var(--border);}',
    '.ms-grid{display:grid;gap:3px;grid-template-columns:repeat(var(--cols),var(--cs));',
    '  margin:auto;user-select:none;touch-action:manipulation;}',
    '.ms-cell{width:var(--cs);height:var(--cs);border-radius:6px;display:flex;align-items:center;',
    '  justify-content:center;font-weight:800;font-size:calc(var(--cs)*.5);line-height:1;cursor:pointer;',
    '  color:transparent;background:linear-gradient(160deg,#232A45,#1A2035);',
    '  border:1px solid rgba(255,255,255,.07);box-shadow:inset 0 -2px 0 rgba(0,0,0,.35);',
    '  transition:transform .08s,background .15s,border-color .15s;}',
    '.ms-cell:hover{background:linear-gradient(160deg,#2E3759,#232A45);} ',
    '.ms-cell:active{transform:scale(.9);}',
    '.ms-cell.open{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.05);',
    '  box-shadow:none;cursor:default;color:var(--text-2);}',
    '.ms-cell.rev{animation:msReveal .26s var(--ease) both;}',
    '@keyframes msReveal{from{opacity:.15;transform:scale(.7)}to{opacity:1;transform:none}}',
    '.ms-cell.flag{color:#F59E0B;}',
    '.ms-cell.mine{background:radial-gradient(circle at 50% 42%,#EF4444,#7F1D1D);border-color:#EF4444;color:#fff;}',
    '.ms-cell.dead{background:#B91C1C;box-shadow:0 0 12px rgba(239,68,68,.7);}',
    '.ms-cell.wrong{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.55);}',
    '.ms-n1{color:#60A5FA!important}.ms-n2{color:#22C55E!important}.ms-n3{color:#F87171!important}',
    '.ms-n4{color:#C084FC!important}.ms-n5{color:#FBBF24!important}.ms-n6{color:#22D3EE!important}',
    '.ms-n7{color:#F8FAFC!important}.ms-n8{color:#94A3B8!important}',
    '.ms-hint{text-align:center;font-size:12px;color:var(--muted);}'
  ].join('');

  RN.games.register({
    id: 'minesweeper',
    title: 'Сапёр',
    emoji: '💣',
    genre: 'puzzle',
    year: 1990,
    touch: 'tap',
    controls: 'Клик — открыть · ПКМ или долгое нажатие — флажок · Esc — пауза',
    desc: 'Классический сапёр: раскрывайте клетки, читайте числа и отмечайте мины флажками.',
    goodAt: 2200
  }, function (api) {
    const stage = api.stage;
    const L = LEVELS[level] || LEVELS.easy;
    const total = L.cols * L.rows;

    const style = document.createElement('style');
    style.setAttribute('data-game-style', 'minesweeper');
    style.textContent = STYLE;
    document.head.appendChild(style);

    stage.innerHTML =
      '<div class="ms-root">' +
      '  <div class="ms-bar">' +
      '    <select class="ms-sel" data-ms="level"></select>' +
      '    <span class="ms-pill">💣 <b data-ms="mines">' + L.mines + '</b></span>' +
      '    <span class="ms-pill time">⏱ <b data-ms="time">0:00</b></span>' +
      '  </div>' +
      '  <div class="ms-scroll"><div class="ms-grid" data-ms="grid"></div></div>' +
      '  <div class="ms-hint">Клик — открыть · ПКМ / долгое нажатие — флажок</div>' +
      '</div>';

    const sel = stage.querySelector('[data-ms="level"]');
    Object.keys(LEVELS).forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = LEVELS[k].label;
      if (k === level) o.selected = true;
      sel.appendChild(o);
    });

    const grid = stage.querySelector('[data-ms="grid"]');
    const minesEl = stage.querySelector('[data-ms="mines"]');
    const timeEl = stage.querySelector('[data-ms="time"]');
    const scroll = stage.querySelector('.ms-scroll');

    let cells = [], opened = 0, flags = 0;
    let started = false, placed = false, over = false;
    let t = 0, lastSec = -1;
    let ro = null, pressTimer = null, longFired = 0, suppressCtx = 0;

    /* ---------- helpers ---------- */
    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    }
    function neighborsOf(i) {
      const r = (i / L.cols) | 0, c = i % L.cols, out = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= L.rows || nc >= L.cols) continue;
          out.push(nr * L.cols + nc);
        }
      }
      return out;
    }
    function fmtTime(s) {
      const m = Math.floor(s / 60), ss = Math.floor(s % 60);
      return m + ':' + (ss < 10 ? '0' : '') + ss;
    }
    function updateBar() {
      minesEl.textContent = String(L.mines - flags);
      timeEl.textContent = fmtTime(t);
    }

    /* ---------- layout ---------- */
    function resizeCells() {
      const gap = 3;
      const avail = scroll.clientWidth - 12 - (L.cols - 1) * gap;
      const minCs = L.cols > 16 ? 21 : 24;
      const cs = Math.max(minCs, Math.min(44, Math.floor(avail / L.cols)));
      grid.style.setProperty('--cs', cs + 'px');
    }
    if (window.ResizeObserver) {
      ro = new ResizeObserver(resizeCells);
      ro.observe(stage);
    }
    resizeCells();

    /* ---------- build ---------- */
    function build() {
      cells = [];
      for (let i = 0; i < total; i++) cells.push({ mine: false, open: false, flag: false, n: 0, el: null });
      opened = 0; flags = 0; started = false; placed = false; over = false;
      t = 0; lastSec = -1;
      api.setScore(0);
      const frag = document.createDocumentFragment();
      for (let i = 0; i < total; i++) {
        const d = document.createElement('div');
        d.className = 'ms-cell';
        d.dataset.i = String(i);
        cells[i].el = d;
        frag.appendChild(d);
      }
      grid.innerHTML = '';
      grid.appendChild(frag);
      grid.style.setProperty('--cols', String(L.cols));
      updateBar();
      resizeCells();
    }

    function placeMines(safeIdx) {
      let banned = new Set([safeIdx]);
      neighborsOf(safeIdx).forEach(n => banned.add(n));
      let avail = [];
      for (let i = 0; i < total; i++) if (!banned.has(i)) avail.push(i);
      if (avail.length < L.mines) {
        avail = [];
        for (let i = 0; i < total; i++) if (i !== safeIdx) avail.push(i);
      }
      shuffle(avail);
      for (let k = 0; k < L.mines; k++) cells[avail[k]].mine = true;
      for (let i = 0; i < total; i++) {
        let n = 0;
        neighborsOf(i).forEach(nb => { if (cells[nb].mine) n++; });
        cells[i].n = n;
      }
      placed = true;
    }

    /* ---------- reveal ---------- */
    function reveal(i, delay) {
      const c = cells[i], el = c.el;
      el.classList.add('open', 'rev');
      el.style.animationDelay = delay + 'ms';
      if (c.mine) { el.classList.add('mine'); el.textContent = '💣'; }
      else if (c.n > 0) { el.textContent = String(c.n); el.classList.add('ms-n' + c.n); }
      else el.textContent = '';
    }

    function openCell(i) {
      if (over) return;
      const c = cells[i];
      if (c.open || c.flag) return;
      if (!placed) placeMines(i);
      started = true;
      if (c.mine) return boom(i);

      const stack = [i];
      let delay = 0;
      while (stack.length) {
        const k = stack.pop();
        const cc = cells[k];
        if (cc.open || cc.flag) continue;
        cc.open = true;
        opened++;
        reveal(k, Math.min(delay, 420));
        delay += 14;
        if (cc.n === 0) neighborsOf(k).forEach(nb => { if (!cells[nb].mine) stack.push(nb); });
      }
      api.sfx(cells[i].n > 0 ? 'click' : 'select');
      checkWin();
    }

    function toggleFlag(i) {
      if (over) return;
      const c = cells[i];
      if (c.open) return;
      c.flag = !c.flag;
      flags += c.flag ? 1 : -1;
      c.el.classList.toggle('flag', c.flag);
      c.el.textContent = c.flag ? '🚩' : '';
      api.sfx('select');
      updateBar();
    }

    function checkWin() {
      if (over || opened < total - L.mines) return;
      over = true;
      const sec = Math.floor(t);
      let correct = 0;
      for (let i = 0; i < total; i++) if (cells[i].flag && cells[i].mine) correct++;
      for (let i = 0; i < total; i++) if (!cells[i].open && !cells[i].mine) {
        cells[i].el.classList.add('flag');
        cells[i].el.textContent = '🚩';
      }
      const score = Math.max(0, L.base - sec * L.sec + correct * L.flag);
      api.setScore(score);
      api.gameOver(score, {
        win: true,
        winTitle: 'Поле очищено!',
        message: 'Время: ' + fmtTime(t) + ' · Точных флажков: ' + correct
      });
    }

    function boom(i) {
      over = true;
      cells[i].el.classList.add('dead');
      for (let k = 0; k < total; k++) {
        const c = cells[k];
        if (c.mine && !c.flag) reveal(k, Math.min(k * 4, 300));
        else if (!c.mine && c.flag) { c.el.classList.add('wrong'); c.el.textContent = '❌'; }
      }
      api.sfx('explode');
      api.gameOver(0, {
        loseTitle: 'Подрыв!',
        icon: '💥',
        message: 'Открыто клеток: ' + opened + ' из ' + (total - L.mines) + ' · Время: ' + fmtTime(t)
      });
    }

    /* ---------- input ---------- */
    function cellIdx(e) {
      const el = e.target.closest ? e.target.closest('.ms-cell') : null;
      return el ? parseInt(el.dataset.i, 10) : -1;
    }

    grid.addEventListener('click', function (e) {
      if (over || api.isPaused()) return;
      if (Date.now() - longFired < 650) return;
      const i = cellIdx(e);
      if (i >= 0) openCell(i);
    });

    grid.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (over || api.isPaused()) return;
      if (Date.now() - suppressCtx < 700) return;
      const i = cellIdx(e);
      if (i >= 0) toggleFlag(i);
    });

    /* долгое нажатие (тач) = флажок; снимаем таймер при движении/отпускании */
    let pressIdx = -1, pressSX = 0, pressSY = 0;

    function onDown(e) {
      if (over || api.isPaused()) return;
      if (e.button === 2) return;
      const i = cellIdx(e);
      if (i < 0) return;
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      pressIdx = i;
      pressSX = e.clientX; pressSY = e.clientY;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () {
        pressTimer = null;
        if (over || pressIdx < 0) return;
        longFired = Date.now();
        suppressCtx = Date.now();
        toggleFlag(pressIdx);
        if (navigator.vibrate) { try { navigator.vibrate(18); } catch (err) {} }
      }, 430);
    }
    function cancelPress() {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      pressIdx = -1;
    }
    function onMove(e) {
      if (!pressTimer) return;
      if (Math.abs(e.clientX - pressSX) > 12 || Math.abs(e.clientY - pressSY) > 12) cancelPress();
    }

    grid.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', cancelPress);
    window.addEventListener('pointercancel', cancelPress);

    sel.addEventListener('change', function () {
      level = sel.value;
      api.sfx('click');
      api.restart();
    });

    /* ---------- timer ---------- */
    const loop = api.loop(function (dt) {
      if (!started || over) return;
      t += dt;
      const s = Math.floor(t);
      if (s !== lastSec) {
        lastSec = s;
        timeEl.textContent = fmtTime(t);
        api.setScore(Math.max(0, L.base - s * L.sec));
      }
    }, null);

    build();

    return {
      destroy() {
        loop.stop();
        clearTimeout(pressTimer);
        if (ro) { ro.disconnect(); ro = null; }
        grid.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', cancelPress);
        window.removeEventListener('pointercancel', cancelPress);
        if (style.parentNode) style.parentNode.removeChild(style);
        stage.innerHTML = '';
      }
    };
  });
})();
