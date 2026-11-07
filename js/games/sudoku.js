/* ============================================================
   RetroNova — Sudoku (Судоку)
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  const LEVELS = {
    easy:   { label: 'Лёгкое · 40 подсказок', givens: 40 },
    medium: { label: 'Среднее · 32 подсказки', givens: 32 },
    hard:   { label: 'Сложное · 26 подсказок', givens: 26 }
  };
  let level = 'medium';

  const STYLE = [
    '.sd-root{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;padding:10px;',
    '  background:#0B0E1A;font-family:var(--font-body);align-items:center;overflow:hidden;}',
    '.sd-bar{display:flex;gap:7px;align-items:center;justify-content:center;flex-wrap:wrap;}',
    '.sd-sel{width:auto;max-width:100%;padding:7px 30px 7px 12px;font-size:13px;border-radius:10px;',
    '  background:rgba(0,0,0,.32);border:1px solid var(--border);color:var(--text);cursor:pointer;}',
    '.sd-pill{display:inline-flex;gap:6px;align-items:center;padding:6px 12px;border-radius:30px;',
    '  background:var(--glass);border:1px solid var(--border);font-size:13px;font-weight:700;',
    '  font-family:var(--font-head);color:var(--text-2);}',
    '.sd-pill b{color:#67E8F9;font-variant-numeric:tabular-nums;}',
    '.sd-pill.err b{color:#FCA5A5;}',
    '.sd-board{position:relative;display:grid;grid-template-columns:repeat(9,1fr);gap:1px;',
    '  width:min(100%, min(400px, 54vh));aspect-ratio:1;background:rgba(255,255,255,.12);',
    '  border:2px solid rgba(139,92,246,.55);border-radius:12px;overflow:hidden;',
    '  box-shadow:0 12px 36px rgba(0,0,0,.5);user-select:none;}',
    '.sd-c{position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;',
    '  background:#12162A;font-family:var(--font-head);font-weight:700;',
    '  font-size:clamp(14px,4.6vw,22px);color:#C7D0E0;transition:background .12s,color .12s;',
    '  border-right:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);}',
    '.sd-c.box-r{border-right:2px solid rgba(139,92,246,.75);}',
    '.sd-c.box-b{border-bottom:2px solid rgba(139,92,246,.75);}',
    '.sd-c.given{background:#0E1226;color:#8A94AD;font-weight:800;}',
    '.sd-c.hintc{color:#86EFAC;}',
    '.sd-c.peer{background:#1A2140;}',
    '.sd-c.same{background:#232B52;color:#A5F3FC;}',
    '.sd-c.sel{background:linear-gradient(150deg,rgba(139,92,246,.5),rgba(6,182,212,.3));',
    '  color:#fff;box-shadow:inset 0 0 0 2px rgba(248,250,252,.75);}',
    '.sd-c.errc{color:#FCA5A5!important;background:rgba(239,68,68,.24);}',
    '.sd-c.pulse{animation:sdPulse .35s var(--ease);}',
    '@keyframes sdPulse{0%{transform:scale(.7)}60%{transform:scale(1.08)}100%{transform:scale(1)}}',
    '.sd-c small{position:absolute;bottom:1px;right:3px;font-size:9px;color:#F87171;font-weight:700;}',
    '.sd-pad{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;}',
    '.sd-num{width:clamp(30px,8.5vw,42px);height:clamp(30px,8.5vw,42px);border-radius:10px;',
    '  border:1px solid var(--border);background:var(--glass);color:var(--text);cursor:pointer;',
    '  font-family:var(--font-head);font-weight:800;font-size:clamp(15px,4vw,19px);',
    '  display:flex;align-items:center;justify-content:center;position:relative;',
    '  transition:transform .12s,background .15s,border-color .15s;}',
    '.sd-num:hover{background:var(--glass-strong);border-color:rgba(139,92,246,.6);transform:translateY(-2px);}',
    '.sd-num:active{transform:scale(.94);}',
    '.sd-num.done{opacity:.35;}',
    '.sd-num em{position:absolute;top:1px;right:4px;font-style:normal;font-size:9px;color:var(--muted);}',
    '.sd-acts{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;}',
    '.sd-hint{font-size:12.5px;color:var(--muted);text-align:center;}'
  ].join('');

  RN.games.register({
    id: 'sudoku',
    title: 'Судоку',
    emoji: '🔢',
    genre: 'puzzle',
    year: 1979,
    touch: 'tap',
    controls: 'Клик по клетке + цифра 1–9 · R — заново · Esc — пауза',
    desc: 'Классическое судоку: заполните сетку 9×9 так, чтобы каждая цифра встречалась один раз в строке, столбце и квадрате.',
    goodAt: 3500
  }, function (api) {
    const stage = api.stage;
    const L = LEVELS[level] || LEVELS.medium;

    const style = document.createElement('style');
    style.setAttribute('data-game-style', 'sudoku');
    style.textContent = STYLE;
    document.head.appendChild(style);

    stage.innerHTML =
      '<div class="sd-root">' +
      '  <div class="sd-bar">' +
      '    <select class="sd-sel" data-sd="level"></select>' +
      '    <span class="sd-pill">⏱ <b data-sd="time">0:00</b></span>' +
      '    <span class="sd-pill err">Ошибки <b data-sd="errors">0</b></span>' +
      '  </div>' +
      '  <div class="sd-board" data-sd="board"></div>' +
      '  <div class="sd-pad" data-sd="pad"></div>' +
      '  <div class="sd-acts">' +
      '    <button class="btn btn-sm" data-sd="check">Проверить</button>' +
      '    <button class="btn btn-sm" data-sd="hint">Подсказка (−50)</button>' +
      '    <button class="btn btn-sm" data-sd="errs">Ошибки: вкл</button>' +
      '    <button class="btn btn-sm btn-ghost" data-sd="new">Новая</button>' +
      '  </div>' +
      '  <div class="sd-hint" data-sd="msg">Выберите клетку и поставьте цифру</div>' +
      '</div>';

    const sel = stage.querySelector('[data-sd="level"]');
    Object.keys(LEVELS).forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = LEVELS[k].label;
      if (k === level) o.selected = true;
      sel.appendChild(o);
    });

    const boardEl = stage.querySelector('[data-sd="board"]');
    const padEl = stage.querySelector('[data-sd="pad"]');
    const timeEl = stage.querySelector('[data-sd="time"]');
    const errorsEl = stage.querySelector('[data-sd="errors"]');
    const msgEl = stage.querySelector('[data-sd="msg"]');
    const hintBtn = stage.querySelector('[data-sd="hint"]');
    const errsBtn = stage.querySelector('[data-sd="errs"]');

    /* ---------- генерация ---------- */
    function shuffled(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function genSolution() {
      const nums = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const bands = shuffled([0, 1, 2]);
      const rows = [];
      bands.forEach(b => {
        const inner = b * 3;
        shuffled([0, 1, 2]).forEach(r => rows.push(inner + r));
      });
      const stacks = shuffled([0, 1, 2]);
      const cols = [];
      stacks.forEach(s => {
        const inner = s * 3;
        shuffled([0, 1, 2]).forEach(c => cols.push(inner + c));
      });
      const sol = new Array(81);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const v = nums[(r * 3 + Math.floor(r / 3) + c * 3 + Math.floor(c / 3)) % 9];
          sol[rows[r] * 9 + cols[c]] = v;
        }
      }
      return sol;
    }

    const popcnt = m => {
      let c = 0;
      while (m) { m &= m - 1; c++; }
      return c;
    };
    const bxOf = (r, c) => (Math.floor(r / 3) * 3 + Math.floor(c / 3));

    /* считает решения (лимт 2) — для проверки уникальности при удалении клеток */
    function countSolutions(b, limit) {
      const rows = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const cols = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const boxes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const pos = [];
      for (let i = 0; i < 81; i++) {
        const v = b[i];
        if (v) {
          const m = 1 << (v - 1);
          rows[(i / 9) | 0] |= m;
          cols[i % 9] |= m;
          boxes[bxOf((i / 9) | 0, i % 9)] |= m;
        } else pos.push(i);
      }
      let count = 0;
      function bt() {
        if (count >= limit) return;
        if (!pos.length) { count++; return; }
        let bi = -1, bc = 10, bm = 0;
        for (let k = 0; k < pos.length; k++) {
          const i = pos[k], r = (i / 9) | 0, c = i % 9;
          const free = ~(rows[r] | cols[c] | boxes[bxOf(r, c)]) & 0x1FF;
          const n = popcnt(free);
          if (n === 0) return;
          if (n < bc) { bc = n; bi = k; bm = free; if (n === 1) break; }
        }
        const i = pos[bi], r = (i / 9) | 0, c = i % 9, bx = bxOf(r, c);
        pos.splice(bi, 1);
        for (let v = 1; v <= 9; v++) {
          const m = 1 << (v - 1);
          if (!(bm & m)) continue;
          b[i] = v; rows[r] |= m; cols[c] |= m; boxes[bx] |= m;
          bt();
          b[i] = 0; rows[r] &= ~m; cols[c] &= ~m; boxes[bx] &= ~m;
          if (count >= limit) break;
        }
        pos.splice(bi, 0, i);
      }
      bt();
      return count;
    }

    function makePuzzle(target) {
      const sol = genSolution();
      const puzzle = sol.slice();
      const pairs = [];
      for (let i = 0; i <= 40; i++) {
        if (i === 80 - i) pairs.push([i, -1]);
        else pairs.push([i, 80 - i]);
      }
      const order = shuffled(pairs);
      let givens = 81;
      for (let p = 0; p < order.length && givens > target; p++) {
        const a = order[p][0], c = order[p][1];
        const size = c < 0 ? 1 : 2;
        if (givens - size < target) continue;
        puzzle[a] = 0;
        if (c >= 0) puzzle[c] = 0;
        if (countSolutions(puzzle, 2) === 1) givens -= size;
        else { puzzle[a] = sol[a]; if (c >= 0) puzzle[c] = sol[c]; }
      }
      return { sol: sol, puzzle: puzzle };
    }

    /* ---------- состояние ---------- */
    let solution, grid, given, hintCells, selIdx, errors, showErrs, hintUsed;
    let t, started, over, lastSec;
    const cellEls = [], numEls = [];

    function fmtTime(s) {
      const m = Math.floor(s / 60), ss = Math.floor(s % 60);
      return m + ':' + (ss < 10 ? '0' : '') + ss;
    }
    function scoreNow() {
      return Math.max(0, 5000 - Math.floor(t) * 5 - errors * 100 - (hintUsed ? 50 : 0));
    }

    function build() {
      const data = makePuzzle(L.givens);
      solution = data.sol;
      grid = data.puzzle.slice();
      given = data.puzzle.map(v => v !== 0);
      hintCells = new Set();
      selIdx = -1; errors = 0; hintUsed = false; showErrs = true;
      t = 0; started = false; over = false; lastSec = -1;

      boardEl.innerHTML = '';
      cellEls.length = 0;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 81; i++) {
        const r = (i / 9) | 0, c = i % 9;
        const d = document.createElement('div');
        d.className = 'sd-c' + (given[i] ? ' given' : '') +
          (c % 3 === 2 && c !== 8 ? ' box-r' : '') +
          (r % 3 === 2 && r !== 8 ? ' box-b' : '');
        d.dataset.i = String(i);
        if (grid[i]) d.textContent = String(grid[i]);
        d.addEventListener('click', () => onCell(i));
        cellEls.push(d);
        frag.appendChild(d);
      }
      boardEl.appendChild(frag);

      padEl.innerHTML = '';
      numEls.length = 0;
      for (let v = 1; v <= 9; v++) {
        const b = document.createElement('button');
        b.className = 'sd-num';
        b.innerHTML = v + '<em data-n="' + v + '"></em>';
        b.addEventListener('click', () => putNumber(v));
        numEls.push(b);
        padEl.appendChild(b);
      }

      timeEl.textContent = '0:00';
      errorsEl.textContent = '0';
      msgEl.textContent = 'Выберите клетку и поставьте цифру';
      hintBtn.disabled = false;
      hintBtn.classList.remove('disabled');
      errsBtn.textContent = 'Ошибки: вкл';
      api.setScore(0);
      refresh();
    }

    function conflictsAt(idx, v) {
      const r = (idx / 9) | 0, c = idx % 9;
      for (let k = 0; k < 9; k++) {
        const ri = r * 9 + k, ci = k * 9 + c;
        if (ri !== idx && grid[ri] === v) return true;
        if (ci !== idx && grid[ci] === v) return true;
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const i2 = (br + dr) * 9 + bc + dc;
          if (i2 !== idx && grid[i2] === v) return true;
        }
      }
      return false;
    }

    function isWrong(idx) {
      if (!grid[idx]) return false;
      if (grid[idx] !== solution[idx]) return true;
      return conflictsAt(idx, grid[idx]);
    }

    function filledCount() {
      let n = 0;
      for (let i = 0; i < 81; i++) if (grid[i]) n++;
      return n;
    }

    function refresh() {
      const selVal = selIdx >= 0 ? grid[selIdx] : 0;
      const selRow = selIdx >= 0 ? (selIdx / 9) | 0 : -1;
      const selCol = selIdx >= 0 ? selIdx % 9 : -1;
      for (let i = 0; i < 81; i++) {
        const el = cellEls[i];
        const v = grid[i];
        el.textContent = v ? String(v) : '';
        el.className = 'sd-c' + (given[i] ? ' given' : '') +
          (hintCells.has(i) ? ' hintc' : '') +
          ((i % 9) % 3 === 2 && i % 9 !== 8 ? ' box-r' : '') +
          (((i / 9) | 0) % 3 === 2 && ((i / 9) | 0) !== 8 ? ' box-b' : '');
        if (selIdx >= 0) {
          const r = (i / 9) | 0, c = i % 9;
          if (i === selIdx) el.classList.add('sel');
          else if (r === selRow || c === selCol ||
                   (Math.floor(r / 3) === Math.floor(selRow / 3) &&
                    Math.floor(c / 3) === Math.floor(selCol / 3))) el.classList.add('peer');
          if (selVal && v === selVal) el.classList.add('same');
        }
        if (showErrs && isWrong(i)) el.classList.add('errc');
      }
      // остатки цифр на пэде
      const left = {};
      for (let v = 1; v <= 9; v++) left[v] = v;
      const used = {};
      for (let i = 0; i < 81; i++) if (grid[i]) used[grid[i]] = (used[grid[i]] || 0) + 1;
      numEls.forEach((b, k) => {
        const v = k + 1;
        const rest = 9 - (used[v] || 0);
        const em = b.querySelector('em');
        if (em) em.textContent = rest > 0 ? String(rest) : '';
        b.classList.toggle('done', rest <= 0);
      });
      errorsEl.textContent = String(errors);
      void left;
    }

    function onCell(i) {
      if (over || api.isPaused()) return;
      selIdx = i;
      if (!started) started = true;
      api.sfx('select');
      refresh();
    }

    function putNumber(v) {
      if (over || api.isPaused()) return;
      if (selIdx < 0) { msgEl.textContent = 'Сначала выберите клетку на поле'; api.sfx('error'); return; }
      if (given[selIdx]) { msgEl.textContent = 'Эта клетка дана условием'; api.sfx('error'); return; }
      const i = selIdx;
      const wasWrong = isWrong(i);
      grid[i] = v;
      if (!started) started = true;
      const wrong = isWrong(i);
      if (wrong && !wasWrong) {
        errors++;
        api.sfx('error');
        msgEl.textContent = 'Цифра ' + v + ' конфликтует — проверьте строку/столбец';
        if (showErrs) cellEls[i].classList.add('pulse');
      } else if (!wrong) {
        api.sfx('click');
        cellEls[i].classList.add('pulse');
        msgEl.textContent = hintUsed || !wrong ? 'Хороший ход' : 'Хороший ход';
      }
      api.setScore(scoreNow());
      refresh();
      if (filledCount() === 81 && noErrors()) win();
    }

    function noErrors() {
      for (let i = 0; i < 81; i++) if (isWrong(i)) return false;
      return true;
    }

    function win() {
      if (over) return;
      over = true;
      const score = scoreNow();
      api.setScore(score);
      api.sfx('achievement');
      api.gameOver(score, {
        win: true,
        winTitle: 'Судоку решено!',
        icon: '🧠',
        message: 'Время: ' + fmtTime(t) + ' · Ошибок: ' + errors + (hintUsed ? ' · подсказка использована' : '')
      });
    }

    /* ---------- кнопки ---------- */
    stage.querySelector('[data-sd="check"]').addEventListener('click', function () {
      if (over || api.isPaused()) return;
      api.sfx('click');
      const filled = filledCount();
      const wrongN = 81 - filled;
      let bad = 0;
      for (let i = 0; i < 81; i++) if (grid[i] && isWrong(i)) bad++;
      if (filled === 81 && bad === 0) { win(); return; }
      if (bad > 0) msgEl.textContent = 'Ошибок: ' + bad + ' · пустых клеток: ' + wrongN;
      else msgEl.textContent = 'Ошибок нет · заполнено ' + filled + ' из 81';
    });

    hintBtn.addEventListener('click', function () {
      if (over || api.isPaused()) return;
      if (hintUsed) { msgEl.textContent = 'Подсказка уже использована'; api.sfx('error'); return; }
      RN.ui.confirm('Подсказка', '<p>Открыть одну случайную клетку? Это −50 очков.</p>',
        { okText: 'Да, подсказка', cancelText: 'Отмена' }).then(ok => {
        if (!ok || over || destroyed) return;
        const empt = [];
        for (let i = 0; i < 81; i++) if (!grid[i]) empt.push(i);
        if (!empt.length) return;
        const i = empt[(Math.random() * empt.length) | 0];
        grid[i] = solution[i];
        hintCells.add(i);
        hintUsed = true;
        selIdx = i;
        hintBtn.disabled = true;
        hintBtn.classList.add('disabled');
        msgEl.textContent = 'Открыта клетка ' + (((i / 9) | 0) + 1) + '×' + ((i % 9) + 1);
        api.sfx('power');
        api.setScore(scoreNow());
        refresh();
        if (filledCount() === 81 && noErrors()) win();
      });
    });

    errsBtn.addEventListener('click', function () {
      if (over) return;
      showErrs = !showErrs;
      errsBtn.textContent = 'Ошибки: ' + (showErrs ? 'вкл' : 'выкл');
      api.sfx('click');
      refresh();
    });

    stage.querySelector('[data-sd="new"]').addEventListener('click', function () {
      if (api.isPaused()) return;
      api.sfx('click');
      api.restart();
    });

    sel.addEventListener('change', function () {
      level = sel.value;
      api.sfx('click');
      api.restart();
    });

    /* ---------- клавиатура ---------- */
    let destroyed = false;
    function onKey(e) {
      if (destroyed || over || api.isPaused()) return;
      const t2 = e.target;
      if (t2 && (t2.tagName === 'INPUT' || t2.tagName === 'TEXTAREA' || t2.tagName === 'SELECT' || t2.isContentEditable)) return;
      if (e.key >= '1' && e.key <= '9') { putNumber(parseInt(e.key, 10)); e.preventDefault(); return; }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        if (selIdx >= 0 && !given[selIdx]) {
          grid[selIdx] = 0;
          api.sfx('select');
          api.setScore(scoreNow());
          refresh();
        }
        e.preventDefault();
        return;
      }
      const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key];
      if (mv !== undefined) {
        e.preventDefault();
        let next = (selIdx < 0 ? 0 : selIdx + mv);
        if (e.key === 'ArrowLeft' && selIdx % 9 === 0) next = selIdx;
        if (e.key === 'ArrowRight' && selIdx % 9 === 8) next = selIdx;
        next = Math.max(0, Math.min(80, next));
        selIdx = next;
        api.sfx('select');
        refresh();
      }
    }
    window.addEventListener('keydown', onKey);

    const loop = api.loop(function (dt) {
      if (!started || over) return;
      t += dt;
      const s = Math.floor(t);
      if (s !== lastSec) {
        lastSec = s;
        timeEl.textContent = fmtTime(t);
        api.setScore(scoreNow());
      }
    }, null);

    build();

    return {
      destroy() {
        destroyed = true;
        loop.stop();
        window.removeEventListener('keydown', onKey);
        if (style.parentNode) style.parentNode.removeChild(style);
        stage.innerHTML = '';
      }
    };
  });
})();
