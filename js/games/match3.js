/* ============================================================
   RetroNova — Match-3 (Три в ряд)
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  const N = 8;              // поле 8×8
  const TYPES = 6;
  const MAX_MOVES = 30;
  const GOAL = 1000;

  const COLORS = ['#EF4444', '#22C55E', '#3B82F6', '#F59E0B', '#A855F7', '#EC4899'];
  const SYMBOLS = ['★', '●', '▲', '◆', '■', '♥'];

  const STYLE = [
    '.m3-root{position:absolute;inset:0;display:flex;flex-direction:column;gap:9px;padding:10px;',
    '  background:#0B0E1A;font-family:var(--font-body);align-items:center;overflow:hidden;}',
    '.m3-bar{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;}',
    '.m3-pill{display:inline-flex;gap:6px;align-items:center;padding:6px 13px;border-radius:30px;',
    '  background:var(--glass);border:1px solid var(--border);font-size:13px;font-weight:700;',
    '  font-family:var(--font-head);color:var(--text-2);}',
    '.m3-pill b{color:#67E8F9;font-variant-numeric:tabular-nums;}',
    '.m3-pill.goal b{color:#FCD34D;}',
    '.m3-meter{width:min(100%,440px);height:9px;border-radius:9px;background:rgba(255,255,255,.07);',
    '  overflow:hidden;border:1px solid var(--border);}',
    '.m3-meter i{display:block;height:100%;background:linear-gradient(90deg,#8B5CF6,#06B6D4);',
    '  border-radius:9px;transition:width .3s var(--ease);}',
    '.m3-board{position:relative;width:min(100%, min(440px, 56vh));aspect-ratio:1;border-radius:16px;',
    '  background:linear-gradient(160deg,rgba(6,182,212,.1),rgba(139,92,246,.12));',
    '  border:1px solid rgba(6,182,212,.32);box-shadow:0 12px 38px rgba(0,0,0,.5);',
    '  touch-action:none;user-select:none;overflow:hidden;}',
    '.m3-cell{position:absolute;width:12.5%;height:12.5%;padding:1.1%;box-sizing:border-box;',
    '  transition:transform .18s var(--ease),opacity .18s linear;}',
    '.m3-cell i{display:flex;align-items:center;justify-content:center;width:100%;height:100%;',
    '  border-radius:50%;font-style:normal;font-size:clamp(14px,5vw,24px);color:rgba(255,255,255,.95);',
    '  box-shadow:inset 0 -3px 6px rgba(0,0,0,.35),0 3px 8px rgba(0,0,0,.35);cursor:pointer;',
    '  transition:transform .15s var(--ease),box-shadow .15s;}',
    '.m3-cell.sel i{transform:scale(1.14);box-shadow:0 0 0 3px rgba(248,250,252,.85),0 0 18px rgba(139,92,246,.7);}',
    '.m3-cell.dying{opacity:0;transform:scale(.2);pointer-events:none;}',
    '.m3-cell.bad i{animation:m3Bad .25s;}',
    '@keyframes m3Bad{0%,100%{filter:none}50%{filter:brightness(2)}}',
    '.m3-pop{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    '  pointer-events:none;font-family:var(--font-head);font-weight:900;',
    '  font-size:clamp(24px,8vw,42px);color:#FCD34D;text-shadow:0 0 22px rgba(245,158,11,.9);',
    '  animation:m3PopA .8s var(--ease) forwards;z-index:5;}',
    '@keyframes m3PopA{0%{opacity:0;transform:scale(.5)}25%{opacity:1;transform:scale(1.15)}',
    '  70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.05) translateY(-24px)}}',
    '.m3-hint{font-size:12.5px;color:var(--muted);text-align:center;}'
  ].join('');

  RN.games.register({
    id: 'match3',
    title: 'Match-3',
    emoji: '🍬',
    genre: 'puzzle',
    year: 1994,
    touch: 'tap',
    controls: 'Клик по фишке, затем по соседней — обмен · R — заново · Esc — пауза',
    desc: 'Собирайте тройки одинаковых фишек: каскады дают комбо, а цель — 1000 очков за 30 ходов.',
    goodAt: 2000
  }, function (api) {
    const stage = api.stage;

    const style = document.createElement('style');
    style.setAttribute('data-game-style', 'match3');
    style.textContent = STYLE;
    document.head.appendChild(style);

    stage.innerHTML =
      '<div class="m3-root">' +
      '  <div class="m3-bar">' +
      '    <span class="m3-pill">Очки <b data-m3="score">0</b></span>' +
      '    <span class="m3-pill goal">Цель <b data-m3="goal">' + GOAL + '</b></span>' +
      '    <span class="m3-pill">Ходы <b data-m3="moves">' + MAX_MOVES + '</b></span>' +
      '  </div>' +
      '  <div class="m3-meter"><i data-m3="meter" style="width:0%"></i></div>' +
      '  <div class="m3-board" data-m3="board"></div>' +
      '  <div class="m3-hint">Меняйте соседние фишки местами, собирая 3 и более в ряд</div>' +
      '</div>';

    const boardEl = stage.querySelector('[data-m3="board"]');
    const scoreEl = stage.querySelector('[data-m3="score"]');
    const movesEl = stage.querySelector('[data-m3="moves"]');
    const meterEl = stage.querySelector('[data-m3="meter"]');

    let grid, sel, busy, score, movesLeft, over, dead;
    const timers = [];
    function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
    function sleep(ms) { return new Promise(res => later(res, ms)); }

    /* ---------- утилиты ---------- */
    const rnd = n => (Math.random() * n) | 0;

    function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

    function place(el, r, c) {
      el.style.transform = 'translate(' + (c * 100) + '%,' + (r * 100) + '%)';
    }

    function makeTile(r, c, type) {
      const el = document.createElement('div');
      el.className = 'm3-cell';
      el.style.left = '0'; el.style.top = '0';
      el.innerHTML = '<i style="background:radial-gradient(circle at 34% 28%,' +
        'rgba(255,255,255,.55) 0%,' + COLORS[type] + ' 46%,' + shade(COLORS[type]) + ' 100%)">' +
        SYMBOLS[type] + '</i>';
      place(el, r, c);
      boardEl.appendChild(el);
      const tile = { r: r, c: c, type: type, el: el };
      el.addEventListener('click', () => onTileClick(tile));
      return tile;
    }

    function shade(hex) {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.max(0, ((n >> 16) & 255) - 70);
      const g = Math.max(0, ((n >> 8) & 255) - 70);
      const b = Math.max(0, (n & 255) - 70);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    /* ---------- поиск комбинаций ---------- */
    function findMatches() {
      const hit = new Set();
      // горизонтали
      for (let r = 0; r < N; r++) {
        let run = 1;
        for (let c = 1; c <= N; c++) {
          const same = c < N && grid[r][c] && grid[r][c - 1] &&
            grid[r][c].type === grid[r][c - 1].type;
          if (same) { run++; continue; }
          if (run >= 3) for (let k = c - run; k < c; k++) hit.add(r * N + k);
          run = 1;
        }
      }
      // вертикали
      for (let c = 0; c < N; c++) {
        let run = 1;
        for (let r = 1; r <= N; r++) {
          const same = r < N && grid[r][c] && grid[r - 1][c] &&
            grid[r][c].type === grid[r - 1][c].type;
          if (same) { run++; continue; }
          if (run >= 3) for (let k = r - run; k < r; k++) hit.add(k * N + c);
          run = 1;
        }
      }
      return hit;
    }

    function hasMove() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc;
          if (!inb(r2, c2)) continue;
          const a = grid[r][c], b = grid[r2][c2];
          if (!a || !b) continue;
          grid[r][c] = b; grid[r2][c2] = a;
          const ok = findMatches().size > 0;
          grid[r][c] = a; grid[r2][c2] = b;
          if (ok) return true;
        }
      }
      return false;
    }

    /* ---------- сборка поля ---------- */
    function build() {
      boardEl.innerHTML = '';
      grid = [];
      for (let r = 0; r < N; r++) {
        grid.push([]);
        for (let c = 0; c < N; c++) {
          let type;
          do { type = rnd(TYPES); }
          while ((c >= 2 && grid[r][c - 1].type === type && grid[r][c - 2].type === type) ||
                 (r >= 2 && grid[r - 1][c].type === type && grid[r - 2][c].type === type));
          grid[r][c] = makeTile(r, c, type);
        }
      }
      if (!hasMove()) reshuffleTypes();
    }

    function reshuffleTypes() {
      const pool = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) pool.push(grid[r][c].type);
      let guard = 0;
      do {
        for (let i = pool.length - 1; i > 0; i--) {
          const j = rnd(i + 1);
          const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        let i = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          grid[r][c].type = pool[i++];
          grid[r][c].el.querySelector('i').style.background =
            'radial-gradient(circle at 34% 28%,rgba(255,255,255,.55) 0%,' +
            COLORS[grid[r][c].type] + ' 46%,' + shade(COLORS[grid[r][c].type]) + ' 100%)';
          grid[r][c].el.querySelector('i').textContent = SYMBOLS[grid[r][c].type];
        }
        guard++;
      } while ((findMatches().size > 0 || !hasMove()) && guard < 60);
    }

    function updateBar() {
      scoreEl.textContent = String(score);
      movesEl.textContent = String(movesLeft);
      meterEl.style.width = Math.min(100, Math.round(score / GOAL * 100)) + '%';
    }

    /* ---------- ход ---------- */
    function onTileClick(tile) {
      if (busy || over || dead || api.isPaused()) return;
      if (!sel) {
        sel = tile;
        tile.el.classList.add('sel');
        api.sfx('select');
        return;
      }
      if (sel === tile) { clearSel(); return; }
      const dist = Math.abs(sel.r - tile.r) + Math.abs(sel.c - tile.c);
      if (dist !== 1) {
        clearSel();
        sel = tile;
        tile.el.classList.add('sel');
        api.sfx('select');
        return;
      }
      const a = sel;
      clearSel();
      busy = true;
      doSwap(a, tile);
    }

    function clearSel() {
      if (sel) sel.el.classList.remove('sel');
      sel = null;
    }

    async function doSwap(a, b) {
      // меняем местами ссылки в сетке и координаты
      grid[a.r][a.c] = b;
      grid[b.r][b.c] = a;
      const ar = a.r, ac = a.c;
      a.r = b.r; a.c = b.c;
      b.r = ar; b.c = ac;
      place(a.el, a.r, a.c);
      place(b.el, b.r, b.c);
      api.sfx('click');
      await sleep(190);
      if (dead) return;

      let hit = findMatches();
      if (hit.size === 0) {
        // откат
        grid[a.r][a.c] = b;
        grid[b.r][b.c] = a;
        const ar2 = a.r, ac2 = a.c;
        a.r = b.r; a.c = b.c;
        b.r = ar2; b.c = ac2;
        place(a.el, a.r, a.c);
        place(b.el, b.r, b.c);
        a.el.classList.add('bad'); b.el.classList.add('bad');
        api.sfx('error');
        await sleep(240);
        if (dead) return;
        a.el.classList.remove('bad'); b.el.classList.remove('bad');
        busy = false;
        return;
      }

      movesLeft--;
      updateBar();
      await resolve(hit, 1);
      if (dead) return;

      if (score >= GOAL) { win(); return; }
      if (movesLeft <= 0) { lose(); return; }
      if (!hasMove()) {
        reshuffleTypes();
        popText('ПЕРЕМЕШИВАНО');
        api.sfx('power');
      }
      busy = false;
    }

    async function resolve(hit, combo) {
      const tiles = [];
      hit.forEach(k => {
        const t = grid[(k / N) | 0][k % N];
        if (t) tiles.push(t);
      });
      if (!tiles.length) return;

      // комбо: база 30 × множитель, комбо 4+ — бонус
      const gained = tiles.length * 30 * combo + (combo >= 4 ? 150 : 0);
      score += gained;
      updateBar();
      api.setScore(score);
      if (combo > 1) { popText('×' + combo + ' КОМБО!'); api.sfx('power'); }
      else api.sfx('coin');

      tiles.forEach(t => {
        if (grid[t.r][t.c] === t) grid[t.r][t.c] = null;
        t.el.classList.add('dying');
      });
      await sleep(190);
      if (dead) return;
      tiles.forEach(t => { if (t.el.parentNode) t.el.remove(); });

      // гравитация + новые фишки сверху
      const fresh = [];
      for (let c = 0; c < N; c++) {
        const stack = [];
        for (let r = N - 1; r >= 0; r--) if (grid[r][c]) stack.push(grid[r][c]);
        for (let r = 0; r < N; r++) grid[r][c] = null;
        // существующие — вниз, снизу вверх
        for (let k = 0; k < stack.length; k++) {
          const r = N - 1 - k;
          const t = stack[k];
          grid[r][c] = t; t.r = r; t.c = c;
          place(t.el, r, c);
        }
        // новые — сверху, стартуют над полем
        const need = N - stack.length;
        for (let k = 0; k < need; k++) {
          const nt = makeTile(-(need - k), c, rnd(TYPES));
          fresh.push({ tile: nt, r: k, c: c });
        }
      }
      void boardEl.offsetWidth; // фиксируем стартовые позиции
      fresh.forEach(f => {
        const nt = f.tile;
        grid[f.r][f.c] = nt;
        nt.r = f.r; nt.c = f.c;
        place(nt.el, f.r, f.c);
      });
      await sleep(230);
      if (dead) return;

      const next = findMatches();
      if (next.size > 0) await resolve(next, combo + 1);
    }

    function popText(txt) {
      const el = document.createElement('div');
      el.className = 'm3-pop';
      el.textContent = txt;
      boardEl.appendChild(el);
      later(() => { if (el.parentNode) el.remove(); }, 820);
    }

    function win() {
      if (over) return;
      over = true;
      api.gameOver(score, {
        win: true,
        winTitle: 'Цель взята!',
        icon: '🍬',
        message: 'Ходов осталось: ' + movesLeft + ' · Множитель комбо растёт с каскадами'
      });
    }

    function lose() {
      if (over) return;
      over = true;
      api.gameOver(score, {
        loseTitle: 'Ходы закончились',
        icon: '🍬',
        message: 'Цель была ' + GOAL + ' · ваш результат ' + score
      });
    }

    build();
    score = 0; movesLeft = MAX_MOVES; sel = null; busy = false; over = false; dead = false;
    updateBar();

    return {
      destroy() {
        dead = true;
        timers.forEach(id => clearTimeout(id));
        timers.length = 0;
        if (style.parentNode) style.parentNode.removeChild(style);
        stage.innerHTML = '';
      }
    };
  });
})();
