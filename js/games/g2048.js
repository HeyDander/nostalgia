/* ============================================================
   RetroNova — 2048
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  const STYLE = [
    '.g2-root{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;',
    '  justify-content:center;gap:12px;padding:12px;background:#0B0E1A;font-family:var(--font-body);overflow:hidden;}',
    '.g2-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;}',
    '.g2-pill{display:inline-flex;gap:6px;align-items:center;padding:6px 13px;border-radius:30px;',
    '  background:var(--glass);border:1px solid var(--border);font-size:13px;font-weight:700;',
    '  font-family:var(--font-head);color:var(--text-2);}',
    '.g2-pill b{color:#67E8F9;font-variant-numeric:tabular-nums;}',
    '.g2-board{position:relative;width:min(100%, min(430px, 62vh));aspect-ratio:1;border-radius:18px;',
    '  background:linear-gradient(160deg,rgba(139,92,246,.14),rgba(6,182,212,.08));',
    '  border:1px solid rgba(139,92,246,.35);box-shadow:0 12px 40px rgba(0,0,0,.5),0 0 26px rgba(139,92,246,.18);}',
    '.g2-cell{position:absolute;width:25%;height:25%;padding:calc(25% * 0.055);box-sizing:border-box;}',
    '.g2-cell span{display:flex;align-items:center;justify-content:center;width:100%;height:100%;',
    '  border-radius:10px;background:rgba(255,255,255,.05);}',
    '.g2-tile{position:absolute;width:25%;height:25%;padding:calc(25% * 0.055);box-sizing:border-box;',
    '  transform:translate(var(--x),var(--y));transition:transform .13s var(--ease);z-index:2;}',
    '.g2-tile.no-anim{transition:none;}',
    '.g2-tile i{display:flex;align-items:center;justify-content:center;width:100%;height:100%;',
    '  border-radius:10px;font-style:normal;font-family:var(--font-head);font-weight:800;',
    '  background:rgba(255,255,255,.09);color:#E2E8F0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);',
    '  font-size:clamp(16px,7vw,30px);transition:transform .14s var(--ease);}',
    '.g2-tile.pop i{animation:g2Pop .18s var(--ease);}',
    '@keyframes g2Pop{0%{transform:scale(.6)}70%{transform:scale(1.12)}100%{transform:scale(1)}}',
    '.g2-tile.gone{transition:transform .13s var(--ease),opacity .13s linear;opacity:0;z-index:1;}',
    '.g2-v2 i{background:rgba(255,255,255,.10);}',
    '.g2-v4 i{background:rgba(6,182,212,.22);color:#A5F3FC;}',
    '.g2-v8 i{background:rgba(34,197,94,.26);color:#BBF7D0;}',
    '.g2-v16 i{background:rgba(139,92,246,.34);color:#DDD6FE;}',
    '.g2-v32 i{background:rgba(236,72,153,.34);color:#FBCFE8;}',
    '.g2-v64 i{background:rgba(245,158,11,.4);color:#FDE68A;}',
    '.g2-v128 i{background:linear-gradient(140deg,#06B6D4,#8B5CF6);color:#fff;box-shadow:0 0 16px rgba(6,182,212,.5);font-size:clamp(15px,6vw,26px);}',
    '.g2-v256 i{background:linear-gradient(140deg,#22C55E,#06B6D4);color:#fff;box-shadow:0 0 18px rgba(34,197,94,.55);font-size:clamp(15px,6vw,26px);}',
    '.g2-v512 i{background:linear-gradient(140deg,#F59E0B,#EC4899);color:#fff;box-shadow:0 0 20px rgba(245,158,11,.55);font-size:clamp(15px,6vw,26px);}',
    '.g2-v1024 i{background:linear-gradient(140deg,#8B5CF6,#EC4899);color:#fff;box-shadow:0 0 22px rgba(139,92,246,.65);font-size:clamp(13px,5vw,22px);}',
    '.g2-v2048 i{background:linear-gradient(140deg,#FBBF24,#F59E0B);color:#1A1200;box-shadow:0 0 28px rgba(251,191,36,.75);font-size:clamp(13px,5vw,22px);}',
    '.g2-vbig i{background:linear-gradient(140deg,#F8FAFC,#FBBF24);color:#1A1200;box-shadow:0 0 30px rgba(248,250,252,.7);font-size:clamp(12px,4.6vw,20px);}',
    '.g2-hint{font-size:12.5px;color:var(--muted);text-align:center;max-width:430px;}',
    '.g2-win{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;',
    '  background:rgba(11,14,26,.86);border-radius:18px;animation:fadeIn .2s var(--ease);backdrop-filter:blur(4px);}',
    '.g2-win .inner{text-align:center;padding:16px;}',
    '.g2-win h3{font-family:var(--font-head);font-size:clamp(20px,6vw,28px);margin:6px 0;',
    '  background:var(--grad-text);-webkit-background-clip:text;background-clip:text;color:transparent;}',
    '.g2-win .ico{font-size:clamp(34px,10vw,54px);}',
    '.g2-win .sub{color:var(--muted);font-size:14px;margin-bottom:14px;}',
    '.g2-win .acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}'
  ].join('');

  RN.games.register({
    id: 'g2048',
    title: '2048',
    emoji: '🔢',
    genre: 'puzzle',
    year: 2014,
    touch: 'swipe',
    controls: 'Стрелки или свайп — сдвиг плиток · R — заново · Esc — пауза',
    desc: 'Сдвигайте плитки, складывайте одинаковые числа и соберите плитку 2048.',
    goodAt: 6000
  }, function (api) {
    const stage = api.stage;

    const style = document.createElement('style');
    style.setAttribute('data-game-style', 'g2048');
    style.textContent = STYLE;
    document.head.appendChild(style);

    stage.innerHTML =
      '<div class="g2-root">' +
      '  <div class="g2-top">' +
      '    <span class="g2-pill">Очки <b data-g2="score">0</b></span>' +
      '    <span class="g2-pill">Ходы <b data-g2="moves">0</b></span>' +
      '    <button class="btn btn-sm" data-g2="new">Новая</button>' +
      '  </div>' +
      '  <div class="g2-board" data-g2="board"></div>' +
      '  <div class="g2-hint">Стрелки / WASD или свайп по полю. Цель — плитка 2048.</div>' +
      '</div>';

    const boardEl = stage.querySelector('[data-g2="board"]');
    const scoreEl = stage.querySelector('[data-g2="score"]');
    const movesEl = stage.querySelector('[data-g2="moves"]');
    const newBtn = stage.querySelector('[data-g2="new"]');

    let grid, score, moves, nextId, busy, over, wonShown;
    const timers = [];

    function later(fn, ms) {
      const id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    /* ---------- model ---------- */
    function reset() {
      boardEl.querySelectorAll('.g2-tile, .g2-win').forEach(el => el.remove());
      grid = [];
      for (let r = 0; r < 4; r++) { grid.push([null, null, null, null]); }
      score = 0; moves = 0; nextId = 1; busy = false; over = false; wonShown = false;
      api.setScore(0);
      scoreEl.textContent = '0';
      movesEl.textContent = '0';
      // фоновые клетки рисуем один раз
      if (!boardEl.querySelector('.g2-cell')) {
        const frag = document.createDocumentFragment();
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const d = document.createElement('div');
            d.className = 'g2-cell';
            d.style.setProperty('--x', (c * 100) + '%');
            d.style.setProperty('--y', (r * 100) + '%');
            d.style.left = '0'; d.style.top = '0';
            d.style.transform = 'translate(' + (c * 100) + '%,' + (r * 100) + '%)';
            d.innerHTML = '<span></span>';
            frag.appendChild(d);
          }
        }
        boardEl.appendChild(frag);
      }
      spawn(); spawn();
    }

    function emptyCells() {
      const out = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) out.push({ r: r, c: c });
      return out;
    }

    function makeTile(r, c, v, animate) {
      const el = document.createElement('div');
      el.className = 'g2-tile no-anim g2-v' + cls(v);
      el.style.left = '0'; el.style.top = '0';
      el.innerHTML = '<i>' + v + '</i>';
      el.style.setProperty('--x', (c * 100) + '%');
      el.style.setProperty('--y', (r * 100) + '%');
      boardEl.appendChild(el);
      // принудительный reflow, чтобы стартовая позиция применилась без анимации
      void el.offsetWidth;
      el.classList.remove('no-anim');
      if (animate) el.classList.add('pop');
      const tile = { id: nextId++, v: v, r: r, c: c, el: el };
      grid[r][c] = tile;
      return tile;
    }

    function cls(v) { return v <= 2048 ? String(v) : 'big'; }

    function spawn() {
      const list = emptyCells();
      if (!list.length) return null;
      const cell = list[(Math.random() * list.length) | 0];
      return makeTile(cell.r, cell.c, Math.random() < 0.9 ? 2 : 4, true);
    }

    function canMove() {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const t = grid[r][c];
        if (!t) return true;
        if (c < 3 && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
        if (r < 3 && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
      }
      return false;
    }

    /* ---------- движение ---------- */
    function move(dir) {
      if (busy || over) return;
      const horizontal = dir === 'left' || dir === 'right';
      const forward = dir === 'left' || dir === 'up'; // обрабатываем «от края»
      let changed = false;
      let mergedValue = 0;
      const actions = []; // {keep, gone, r, c}

      for (let line = 0; line < 4; line++) {
        const list = [];
        for (let k = 0; k < 4; k++) {
          const idx = forward ? k : 3 - k;
          const r = horizontal ? line : idx;
          const c = horizontal ? idx : line;
          const t = grid[r][c];
          if (t) list.push(t);
        }
        // схлопывание
        const res = [];
        let i = 0;
        while (i < list.length) {
          const a = list[i];
          if (i + 1 < list.length && list[i + 1].v === a.v) {
            res.push({ keep: a, gone: list[i + 1], v: a.v * 2 });
            i += 2;
          } else { res.push({ keep: a, gone: null, v: a.v }); i += 1; }
        }
        for (let k = 0; k < res.length; k++) {
          const idx = forward ? k : 3 - k;
          const r = horizontal ? line : idx;
          const c = horizontal ? idx : line;
          const item = res[k];
          if (item.keep.r !== r || item.keep.c !== c) changed = true;
          if (item.gone) { changed = true; mergedValue += item.v; }
          actions.push({ keep: item.keep, gone: item.gone, r: r, c: c, v: item.v });
        }
      }

      if (!changed) { api.sfx('click'); return; }

      busy = true;
      // очищаем сетку и расставляем заново по новым позициям
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) grid[r][c] = null;

      const mergeTiles = [];
      actions.forEach(a => {
        a.keep.r = a.r; a.keep.c = a.c;
        grid[a.r][a.c] = a.keep;
        a.keep.el.style.setProperty('--x', (a.c * 100) + '%');
        a.keep.el.style.setProperty('--y', (a.r * 100) + '%');
        if (a.gone) {
          a.gone.el.style.setProperty('--x', (a.c * 100) + '%');
          a.gone.el.style.setProperty('--y', (a.r * 100) + '%');
          a.gone.el.classList.add('gone');
          mergeTiles.push(a);
        }
      });

      moves++;
      movesEl.textContent = String(moves);
      score += mergedValue;
      scoreEl.textContent = String(score);
      api.setScore(score);
      if (mergedValue > 0) api.sfx(mergedValue >= 128 ? 'power' : 'coin');

      later(function () {
        mergeTiles.forEach(a => {
          if (a.gone.el.parentNode) a.gone.el.remove();
          if (grid[a.r][a.c] === a.keep) {
            a.keep.v = a.v;
            a.keep.el.className = 'g2-tile g2-v' + cls(a.v) + ' pop';
            a.keep.el.querySelector('i').textContent = String(a.v);
          }
        });
        spawn();
        busy = false;
        if (!wonShown && reached2048()) { wonShown = true; showWin(); }
        else if (!canMove()) endGame();
      }, 140);
    }

    function reached2048() {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r][c] && grid[r][c].v >= 2048) return true;
      return false;
    }

    function endGame() {
      if (over) return;
      over = true;
      api.gameOver(score, {
        win: reached2048(),
        winTitle: '2048 собрано!',
        loseTitle: 'Ходов больше нет',
        icon: '🔢',
        message: 'Лучшая плитка: ' + bestTile() + ' · Ходов: ' + moves
      });
    }

    function bestTile() {
      let b = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r][c] && grid[r][c].v > b) b = grid[r][c].v;
      return b;
    }

    /* ---------- окно победы (своё, внутри stage) ---------- */
    let winEl = null;
    function showWin() {
      api.sfx('win');
      winEl = document.createElement('div');
      winEl.className = 'g2-win';
      winEl.innerHTML =
        '<div class="inner">' +
        '<div class="ico">🏆</div>' +
        '<h3>2048 собрано!</h3>' +
        '<div class="sub">Очки: ' + score + ' · Продолжайте ради рекорда</div>' +
        '<div class="acts">' +
        '<button class="btn btn-primary" data-g2w="go">Продолжить</button>' +
        '<button class="btn" data-g2w="stop">Забрать победу</button>' +
        '</div></div>';
      boardEl.appendChild(winEl);
      winEl.addEventListener('click', onWinClick);
    }
    function onWinClick(e) {
      const b = e.target.closest('[data-g2w]');
      if (!b || !winEl) return;
      const act = b.getAttribute('data-g2w');
      winEl.removeEventListener('click', onWinClick);
      winEl.remove();
      winEl = null;
      if (act === 'stop') {
        over = true;
        api.gameOver(score, { win: true, winTitle: '2048 собрано!', icon: '🏆', message: 'Ходов: ' + moves });
      } else {
        api.sfx('click');
        if (!canMove()) endGame();
      }
    }

    /* ---------- ввод ---------- */
    const KEYMAP = {
      arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      ф: 'left', в: 'right', ц: 'up', ы: 'down'
    };
    function onKey(e) {
      if (over || api.isPaused()) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const dir = KEYMAP[String(e.key).toLowerCase()];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    }
    window.addEventListener('keydown', onKey);

    // свайп + мышное перетаскивание по полю
    let px = 0, py = 0, pdown = false;
    function onDown(e) {
      if (over || api.isPaused()) return;
      pdown = true; px = e.clientX; py = e.clientY;
    }
    function onUp(e) {
      if (!pdown) return;
      pdown = false;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return;
      if (api.isPaused()) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    }
    function onMove(e) {
      if (!pdown) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      pdown = false;
      if (api.isPaused()) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    }
    boardEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', function () { pdown = false; });
    window.addEventListener('pointermove', onMove, { passive: true });

    newBtn.addEventListener('click', function () { api.sfx('click'); reset(); });

    reset();

    return {
      destroy() {
        timers.forEach(id => clearTimeout(id));
        timers.length = 0;
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointermove', onMove);
        boardEl.removeEventListener('pointerdown', onDown);
        if (winEl) { winEl.removeEventListener('click', onWinClick); winEl = null; }
        if (style.parentNode) style.parentNode.removeChild(style);
        stage.innerHTML = '';
      }
    };
  });
})();
