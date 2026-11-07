/* ============================================================
   RetroNova — Tetris (Тетрис)
   7-bag, wall-kick, soft/hard drop, следующая фигура, уровни.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'tetris',
    title: 'Тетрис',
    emoji: '🧱',
    genre: 'puzzle',
    year: 1984,
    touch: 'both',
    controls: '←/→ — движение · ↑ — поворот · ↓ — мягкий сброс · Пробел — быстрый сброс',
    desc: 'Классические тетромино: собирайте линии, каждые 10 линий уровень растёт и игра ускоряется.',
    goodAt: 2000
  }, function (api) {
    const cv = api.createCanvas({ aspect: 16 / 9 });
    const ctx = cv.ctx;
    const input = api.input;

    const COLS = 10, ROWS = 20;
    const COLORS = {
      I: '#22D3EE', J: '#3B82F6', L: '#F97316', O: '#FACC15',
      S: '#22C55E', T: '#A855F7', Z: '#EF4444'
    };
    const SHAPES = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
      O: [[1, 1], [1, 1]],
      S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
    };
    const LINE_SCORE = [0, 100, 300, 500, 800];
    const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, -2]];

    let grid, bag, queue, cur;
    let score, lines, level, over;
    let gravAcc, lockT, grounded;
    let das, arr, lastDir, softAcc;
    let clearing; // { rows:[], t, count }

    /* ---------- helpers ---------- */
    function emptyGrid() {
      const g = [];
      for (let y = 0; y < ROWS; y++) g.push(new Array(COLS).fill(null));
      return g;
    }

    function newBag() {
      const b = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = b[i]; b[i] = b[j]; b[j] = t;
      }
      return b;
    }

    function nextType() {
      if (!bag.length) bag = newBag();
      return bag.pop();
    }

    function rotateM(m, dir) {
      const n = m.length;
      const o = [];
      for (let y = 0; y < n; y++) o.push(new Array(n).fill(0));
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (dir > 0) o[y][n - 1 - x] = m[x][y];
          else o[n - 1 - y][x] = m[x][y];
        }
      }
      return o;
    }

    function collide(m, px, py) {
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) {
          if (!m[r][c]) continue;
          const x = px + c, y = py + r;
          if (x < 0 || x >= COLS || y >= ROWS) return true;
          if (y >= 0 && grid[y][x]) return true;
        }
      }
      return false;
    }

    function spawn() {
      const type = queue.shift();
      queue.push(nextType());
      const m = SHAPES[type].map(r => r.slice());
      cur = { type: type, m: m, x: Math.floor((COLS - m.length) / 2), y: 0 };
      if (type === 'I') cur.y = -1;
      gravAcc = 0;
      lockT = 0;
      grounded = false;
      if (collide(cur.m, cur.x, cur.y)) {
        over = true;
        api.sfx('over');
        api.gameOver(score, {
          icon: '🧱',
          loseTitle: 'Стакан переполнен',
          message: 'Линий: ' + lines + ' · Уровень: ' + level
        });
      } else {
        api.sfx('type');
      }
    }

    function gravity() {
      return Math.max(0.06, 0.9 - (level - 1) * 0.075);
    }

    function tryMove(dx, dy) {
      if (over || clearing) return false;
      if (collide(cur.m, cur.x + dx, cur.y + dy)) return false;
      cur.x += dx;
      cur.y += dy;
      if (dy > 0) lockT = 0;
      grounded = collide(cur.m, cur.x, cur.y + 1);
      if (!grounded) lockT = 0;
      return true;
    }

    function tryRotate(dir) {
      if (over || clearing) return false;
      const m = rotateM(cur.m, dir);
      for (const k of KICKS) {
        if (!collide(m, cur.x + k[0], cur.y + k[1])) {
          cur.m = m;
          cur.x += k[0];
          cur.y += k[1];
          grounded = collide(cur.m, cur.x, cur.y + 1);
          if (!grounded) lockT = 0;
          api.sfx('click');
          return true;
        }
      }
      return false;
    }

    function hardDrop() {
      if (over || clearing) return;
      let d = 0;
      while (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; d++; }
      if (d) { score += d * 2; api.setScore(score); }
      api.sfx('bounce');
      lockPiece();
    }

    function lockPiece() {
      for (let r = 0; r < cur.m.length; r++) {
        for (let c = 0; c < cur.m.length; c++) {
          if (!cur.m[r][c]) continue;
          const x = cur.x + c, y = cur.y + r;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) grid[y][x] = cur.type;
        }
      }
      const rows = [];
      for (let y = 0; y < ROWS; y++) if (grid[y].every(v => v)) rows.push(y);
      if (rows.length) {
        clearing = { rows: rows, t: 0.16, count: rows.length };
        api.sfx(rows.length >= 4 ? 'achievement' : 'success');
      } else {
        spawn();
      }
    }

    function finishClear() {
      const set = {};
      clearing.rows.forEach(r => { set[r] = true; });
      grid = grid.filter((r, i) => !set[i]);
      while (grid.length < ROWS) grid.unshift(new Array(COLS).fill(null));
      const n = clearing.count;
      score += LINE_SCORE[n] * level;
      lines += n;
      const nl = Math.floor(lines / 10) + 1;
      if (nl > level) { level = nl; api.sfx('power'); }
      api.setScore(score);
      clearing = null;
      spawn();
    }

    /* ---------- input ---------- */
    function handleInput(dt) {
      const left = input.down('ArrowLeft') || input.down('a') || input.touch.left;
      const right = input.down('ArrowRight') || input.down('d') || input.touch.right;
      const dir = left && !right ? -1 : (right && !left ? 1 : 0);

      if (dir !== lastDir) {
        lastDir = dir;
        if (dir !== 0) { tryMove(dir, 0); das = 0.17; arr = 0.05; }
      } else if (dir !== 0) {
        das -= dt;
        if (das <= 0) {
          arr -= dt;
          if (arr <= 0) { tryMove(dir, 0); arr = 0.05; }
        }
      }

      if (input.pressed('ArrowUp') || input.pressed('w') || input.touchPressed('a')) tryRotate(1);
      if (input.pressed('x') || input.pressed('z')) tryRotate(input.pressed('x') ? 1 : -1);
      if (input.pressed('Space') || input.touchPressed('b')) hardDrop();
    }

    /* ---------- update ---------- */
    function update(dt) {
      if (over) return;

      if (clearing) {
        clearing.t -= dt;
        if (clearing.t <= 0) finishClear();
        return;
      }

      handleInput(dt);

      const soft = input.down('ArrowDown') || input.down('s') || input.touch.down;
      if (soft) {
        softAcc += dt;
        let guard = 0;
        while (softAcc >= 0.045 && guard < 5 && !over && !clearing) {
          softAcc -= 0.045;
          guard++;
          if (collide(cur.m, cur.x, cur.y + 1)) { lockPiece(); break; }
          cur.y++;
          score += 1;
          api.setScore(score);
        }
      } else {
        softAcc = 0;
        gravAcc += dt;
        let guard = 0;
        while (gravAcc >= gravity() && guard < 4 && !over && !clearing) {
          gravAcc -= gravity();
          guard++;
          if (collide(cur.m, cur.x, cur.y + 1)) { lockPiece(); break; }
          cur.y++;
          lockT = 0;
        }
      }

      if (over || clearing || !cur) return;
      grounded = collide(cur.m, cur.x, cur.y + 1);
      if (grounded) {
        lockT += dt;
        if (lockT >= 0.4) lockPiece();
      } else {
        lockT = 0;
      }
    }

    /* ---------- draw ---------- */
    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    function drawCell(x, y, color, alpha) {
      const pad = 1;
      ctx.save();
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      roundRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, Math.max(2, cell * 0.16));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      roundRect(ctx, x + pad + 1, y + pad + 1, cell - pad * 2 - 2, Math.max(2, (cell - pad * 2) * 0.3), 2);
      ctx.fill();
      ctx.restore();
    }

    let cell = 18, offX = 0, offY = 0, panelX = 0, panelW = 0;

    function layout() {
      const w = cv.w, h = cv.h;
      const panel = Math.max(96, Math.floor(w * 0.18));
      cell = Math.floor(Math.min((h - 16) / ROWS, (w - panel - 24) / COLS));
      cell = Math.max(8, cell);
      const bw = cell * COLS, bh = cell * ROWS;
      offX = Math.floor((w - bw - panel) / 2);
      offY = Math.floor((h - bh) / 2);
      panelX = offX + bw + Math.floor(panel * 0.18);
      panelW = panel - Math.floor(panel * 0.28);
    }

    function ghostY() {
      let y = cur.y;
      while (!collide(cur.m, cur.x, y + 1)) y++;
      return y;
    }

    function drawMini(type, cx, cy, size) {
      const m = SHAPES[type];
      let minR = 9, maxR = -1, minC = 9, maxC = -1;
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) {
          if (!m[r][c]) continue;
          minR = Math.min(minR, r); maxR = Math.max(maxR, r);
          minC = Math.min(minC, c); maxC = Math.max(maxC, c);
        }
      }
      const ox = cx - (minC + maxC + 1) * size / 2;
      const oy = cy - (minR + maxR + 1) * size / 2;
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) {
          if (!m[r][c]) continue;
          ctx.fillStyle = COLORS[type];
          roundRect(ctx, ox + c * size + 1, oy + r * size + 1, size - 2, size - 2, 2);
          ctx.fill();
        }
      }
    }

    function draw() {
      layout();
      const w = cv.w, h = cv.h;
      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(0, 0, w, h);

      const bw = cell * COLS, bh = cell * ROWS;

      /* поле */
      ctx.fillStyle = '#0F1526';
      ctx.fillRect(offX, offY, bw, bh);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= COLS; x++) { ctx.moveTo(offX + x * cell, offY); ctx.lineTo(offX + x * cell, offY + bh); }
      for (let y = 0; y <= ROWS; y++) { ctx.moveTo(offX, offY + y * cell); ctx.lineTo(offX + bw, offY + y * cell); }
      ctx.stroke();

      /* зафиксированные клетки */
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (grid[y][x]) drawCell(offX + x * cell, offY + y * cell, COLORS[grid[y][x]]);
        }
      }

      /* вспышка очищаемых линий */
      if (clearing) {
        const a = Math.min(1, clearing.t / 0.16);
        ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.85) + ')';
        clearing.rows.forEach(r => ctx.fillRect(offX, offY + r * cell, bw, cell));
      }

      /* текущая фигура + призрак */
      if (cur && !over) {
        const gy = ghostY();
        for (let r = 0; r < cur.m.length; r++) {
          for (let c = 0; c < cur.m.length; c++) {
            if (!cur.m[r][c]) continue;
            if (gy + r >= 0) drawCell(offX + (cur.x + c) * cell, offY + (gy + r) * cell, COLORS[cur.type], 0.22);
          }
        }
        for (let r = 0; r < cur.m.length; r++) {
          for (let c = 0; c < cur.m.length; c++) {
            if (!cur.m[r][c]) continue;
            const yy = cur.y + r;
            if (yy >= 0) drawCell(offX + (cur.x + c) * cell, offY + yy * cell, COLORS[cur.type]);
          }
        }
      }

      /* рамка */
      ctx.strokeStyle = 'rgba(139,92,246,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(offX - 1, offY - 1, bw + 2, bh + 2);

      /* панель */
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('СЛЕДУЮЩАЯ', panelX, offY + 14);
      ctx.fillStyle = 'rgba(15,21,38,0.9)';
      roundRect(ctx, panelX, offY + 22, panelW, panelW, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (queue[0]) drawMini(queue[0], panelX + panelW / 2, offY + 22 + panelW / 2, Math.max(8, panelW * 0.17));

      let py = offY + 22 + panelW + 26;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('УРОВЕНЬ', panelX, py);
      ctx.fillStyle = '#FACC15';
      ctx.font = '800 26px Inter, sans-serif';
      ctx.fillText(String(level), panelX, py + 28);

      py += 62;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('ЛИНИИ', panelX, py);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '800 22px Inter, sans-serif';
      ctx.fillText(String(lines), panelX, py + 26);

      /* подсказка управления для тача */
      if (py + 70 < offY + bh) {
        ctx.fillStyle = 'rgba(148,163,184,0.75)';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillText('A — поворот', panelX, py + 62);
        ctx.fillText('B — сброс', panelX, py + 78);
      }
    }

    /* ---------- boot ---------- */
    function reset() {
      grid = emptyGrid();
      bag = newBag();
      queue = [];
      for (let i = 0; i < 4; i++) queue.push(nextType());
      score = 0; lines = 0; level = 1; over = false;
      gravAcc = 0; lockT = 0; grounded = false;
      das = 0; arr = 0; lastDir = 0; softAcc = 0;
      clearing = null;
      api.setScore(0);
      spawn();
    }

    reset();
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); cv.destroy(); }
    };
  });
})();
