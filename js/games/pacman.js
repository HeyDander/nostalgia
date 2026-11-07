/* ============================================================
   RetroNova — Pac-Man
   Классический лабиринт 19×21, 4 призрака с разным ИИ,
   энерджайзеры, фрукты, туннели, 3 жизни, level-up.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'pacman',
    title: 'Pac-Man',
    emoji: '👻',
    genre: 'arcade',
    year: 1980,
    touch: 'dpad',
    controls: 'Стрелки или WASD — движение · R — заново · Esc — пауза',
    desc: 'Классический лабиринт: собирайте точки, хватайте энерджайзеры и фрукты и уворачивайтесь от четырёх призраков.',
    goodAt: 2500
  }, function (api) {
    const cv = api.createCanvas({ aspect: 0.8 });
    const ctx = cv.ctx;
    const input = api.input;

    const COLS = 19, ROWS = 21, TUNNEL_ROW = 10;
    const WALL = 1, DOOR_TILE = 2;
    const SPAWN = { x: 9, y: 13 };
    const DOOR = { x: 9, y: 6 };
    const EXIT = { x: 9, y: 5 };
    const HOUSE_IN = { x: 9, y: 7 };
    const FRUIT_POS = { x: 9, y: 11 };
    const ENERGIZERS = ['1,1', '17,1', '1,19', '17,19'];

    const DIRS = [
      { x: 0, y: -1, n: 0 },
      { x: -1, y: 0, n: 1 },
      { x: 0, y: 1, n: 2 },
      { x: 1, y: 0, n: 3 }
    ];
    const UP = DIRS[0], LEFT = DIRS[1], DOWN = DIRS[2], RIGHT = DIRS[3];
    const ZERO = { x: 0, y: 0 };

    const GHOST_DEFS = [
      { type: 'blinky', color: '#FF3B3B', spawn: { x: 9, y: 5 }, wait: 0 },
      { type: 'pinky', color: '#FF9EE0', spawn: { x: 9, y: 7 }, wait: 1.2 },
      { type: 'inky', color: '#5BE7FF', spawn: { x: 8, y: 8 }, wait: 3.0 },
      { type: 'clyde', color: '#FFB454', spawn: { x: 10, y: 8 }, wait: 4.6 }
    ];
    const CORNERS = [
      { x: 17, y: 1 }, { x: 1, y: 1 }, { x: 17, y: 19 }, { x: 1, y: 19 }
    ];

    /* ---------- state ---------- */
    let grid, dots, dotCount, dotsEaten;
    let pm, ghosts, wantDir;
    let score, level, lives, state, stateT;
    let frightT, combo, fruit, fruitDone, particles, floats;
    let mouthPhase = 0, flash = 0;

    /* ---------- maze ---------- */
    function buildGrid() {
      const g = [];
      for (let y = 0; y < ROWS; y++) g.push(new Array(COLS).fill(WALL));
      const open = (x, y) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) g[y][x] = 0; };
      [1, 5, 11, 15, 19].forEach(y => { for (let x = 1; x <= 17; x++) open(x, y); });
      for (let x = 0; x < COLS; x++) open(x, TUNNEL_ROW);
      [1, 5, 13, 17].forEach(x => { for (let y = 1; y <= 19; y++) open(x, y); });
      for (let y = 1; y <= 5; y++) open(9, y);
      for (let y = 10; y <= 19; y++) open(9, y);
      for (let y = 7; y <= 8; y++) for (let x = 8; x <= 10; x++) open(x, y);
      g[DOOR.y][DOOR.x] = DOOR_TILE;
      return g;
    }

    function inRect(x, y, r) { return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1; }
    function insideHouse(x, y) { return x >= 7 && x <= 11 && y >= 6 && y <= 9; }
    function insideInterior(x, y) { return x >= 8 && x <= 10 && y >= 7 && y <= 8; }

    function buildDots() {
      dots = [];
      dotCount = 0;
      dotsEaten = 0;
      for (let y = 0; y < ROWS; y++) {
        const row = new Array(COLS).fill(0);
        for (let x = 0; x < COLS; x++) {
          if (grid[y][x] !== 0) continue;
          if (y === TUNNEL_ROW || insideHouse(x, y)) continue;
          row[x] = ENERGIZERS.indexOf(x + ',' + y) >= 0 ? 2 : 1;
          dotCount++;
        }
        dots.push(row);
      }
    }

    function tileAt(x, y) {
      if (y < 0 || y >= ROWS) return WALL;
      if (x < 0 || x >= COLS) return y === TUNNEL_ROW ? 0 : WALL;
      return grid[y][x];
    }

    function canMove(e, d, isGhost, gState) {
      const nx = e.tx + d.x, ny = e.ty + d.y;
      const t = tileAt(nx, ny);
      if (t === WALL) return false;
      if (t === DOOR_TILE) {
        if (!isGhost) return false;
        if (gState !== 'leaving' && gState !== 'eyes') return false;
      }
      return true;
    }

    function opposite(d) {
      if (d === UP) return DOWN;
      if (d === DOWN) return UP;
      if (d === LEFT) return RIGHT;
      if (d === RIGHT) return LEFT;
      return ZERO;
    }

    function posOf(e) { return { x: e.tx + e.dir.x * e.prog, y: e.ty + e.dir.y * e.prog }; }

    /* ---------- pathfinding (BFS) ---------- */
    const bfsCache = { key: null, dist: null };
    function bfs(target, allowDoor) {
      const key = target.x + ',' + target.y + ',' + (allowDoor ? 1 : 0);
      if (bfsCache.key === key) return bfsCache.dist;
      const dist = new Int16Array(COLS * ROWS).fill(-1);
      const ti = target.y * COLS + target.x;
      dist[ti] = 0;
      const queue = [ti];
      let head = 0;
      while (head < queue.length) {
        const cur = queue[head++];
        const cx = cur % COLS, cy = (cur / COLS) | 0;
        const d0 = dist[cur];
        for (let i = 0; i < 4; i++) {
          const dd = DIRS[i];
          let nx = cx + dd.x, ny = cy + dd.y;
          if (ny === TUNNEL_ROW) nx = ((nx % COLS) + COLS) % COLS;
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
          const ni = ny * COLS + nx;
          if (dist[ni] !== -1) continue;
          const t = grid[ny][nx];
          if (t === WALL) continue;
          if (t === DOOR_TILE && !allowDoor) continue;
          dist[ni] = d0 + 1;
          queue.push(ni);
        }
      }
      bfsCache.key = key;
      bfsCache.dist = dist;
      return dist;
    }

    function nearestOpen(x, y) {
      x = Math.max(0, Math.min(COLS - 1, x));
      y = Math.max(0, Math.min(ROWS - 1, y));
      const ok = (px, py) => px >= 0 && px < COLS && py >= 0 && py < ROWS &&
        grid[py][px] === 0 && !insideHouse(px, py);
      if (ok(x, y)) return { x: x, y: y };
      for (let r = 1; r < 7; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            if (ok(x + dx, y + dy)) return { x: x + dx, y: y + dy };
          }
        }
      }
      return { x: EXIT.x, y: EXIT.y };
    }

    /* ---------- entities ---------- */
    function makeEntity(x, y, dir) {
      return { tx: x, ty: y, dir: dir, prog: 0 };
    }

    function advance(e, dt, speed, arrive) {
      let dist = speed * dt;
      let guard = 0;
      while (dist > 0 && guard++ < 64) {
        if (e.dir.x === 0 && e.dir.y === 0) break;
        const remain = 1 - e.prog;
        if (dist < remain) { e.prog += dist; dist = 0; }
        else {
          dist -= remain;
          let nx = e.tx + e.dir.x, ny = e.ty + e.dir.y;
          if (ny === TUNNEL_ROW) nx = ((nx % COLS) + COLS) % COLS;
          e.tx = nx; e.ty = ny; e.prog = 0;
          arrive(e);
        }
      }
    }

    function levelMul() { return Math.min(1.5, 1 + (level - 1) * 0.05); }
    function pmSpeed() { return 6.5 * levelMul(); }
    function ghostSpeed(g) {
      if (g.state === 'eyes') return 12;
      if (g.state === 'leaving') return 5.5;
      if (g.state === 'wait') return 0;
      if (g.frightened) return 3.8;
      return 6.0 * levelMul();
    }
    function frightDuration() { return Math.max(2.5, 7 - (level - 1) * 0.6); }

    /* ---------- ghost AI ---------- */
    function ghostTarget(g, idx) {
      if (g.state === 'leaving') return EXIT;
      if (g.state === 'eyes') return HOUSE_IN;
      const pt = { x: pm.tx, y: pm.ty };
      if (g.type === 'blinky') return pt;
      if (g.type === 'pinky') {
        return nearestOpen(pm.tx + pm.dir.x * 4, pm.ty + pm.dir.y * 4);
      }
      if (g.type === 'inky') {
        g.randT -= 1;
        if (!g.rand || g.randT <= 0) {
          g.rand = nearestOpen(1 + ((Math.random() * (COLS - 2)) | 0), 1 + ((Math.random() * (ROWS - 2)) | 0));
          g.randT = 90;
        }
        return g.rand;
      }
      // clyde: далеко — преследует, близко — убегает в угол
      const dx = g.tx - pm.tx, dy = g.ty - pm.ty;
      if (dx * dx + dy * dy > 64) return pt;
      return CORNERS[idx];
    }

    function chooseGhostDir(g, idx) {
      const opts = [];
      for (let i = 0; i < 4; i++) if (canMove(g, DIRS[i], true, g.state)) opts.push(DIRS[i]);
      let list = opts.filter(d => !(d.x === -g.dir.x && d.y === -g.dir.y));
      if (!list.length) list = opts;
      if (!list.length) { g.dir = ZERO; return; }

      if (g.state === 'eyes' || g.state === 'leaving') {
        const target = g.state === 'leaving' ? EXIT : HOUSE_IN;
        g.dir = pickByDist(list, g, target, true);
        return;
      }
      if (g.frightened) {
        g.dir = list[(Math.random() * list.length) | 0];
        return;
      }
      g.dir = pickByDist(list, g, ghostTarget(g, idx), false);
    }

    function pickByDist(list, g, rawTarget, allowDoor) {
      const target = nearestOpen(rawTarget.x, rawTarget.y);
      const dist = bfs(target, allowDoor);
      const cands = [];
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        let nx = g.tx + d.x, ny = g.ty + d.y;
        if (ny === TUNNEL_ROW) nx = ((nx % COLS) + COLS) % COLS;
        let v = -1;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) v = dist[ny * COLS + nx];
        cands.push({
          d: d,
          v: v < 0 ? 1e6 : v,
          straight: (d.x === g.dir.x && d.y === g.dir.y) ? 0 : 1,
          ord: d.n
        });
      }
      cands.sort((a, b) => (a.v - b.v) || (a.straight - b.straight) || (a.ord - b.ord));
      return cands[0].d;
    }

    function pmArrive(e) {
      if (wantDir && canMove(e, wantDir, false, null)) { e.dir = wantDir; return; }
      if (!canMove(e, e.dir, false, null)) {
        const rev = opposite(e.dir);
        e.dir = canMove(e, rev, false, null) ? rev : ZERO;
      }
    }

    function ghostArrive(g, idx) {
      if (g.state === 'eyes' && insideInterior(g.tx, g.ty)) {
        g.state = 'wait';
        g.wait = 0.7;
        g.frightened = false;
        g.dir = UP;
        return;
      }
      if (g.state === 'leaving' && g.tx === EXIT.x && g.ty === EXIT.y) {
        g.state = 'active';
      }
      chooseGhostDir(g, idx);
    }

    /* ---------- setup ---------- */
    function resetPositions() {
      pm = makeEntity(SPAWN.x, SPAWN.y, LEFT);
      wantDir = LEFT;
      ghosts = GHOST_DEFS.map((def, i) => {
        const g = makeEntity(def.spawn.x, def.spawn.y, i % 2 ? RIGHT : LEFT);
        g.type = def.type;
        g.color = def.color;
        g.spawn = def.spawn;
        g.wait = def.wait;
        g.state = def.wait > 0 ? 'wait' : 'active';
        g.frightened = false;
        g.rand = null;
        g.randT = 0;
        g.corner = CORNERS[i];
        return g;
      });
      frightT = 0;
      combo = 0;
      bfsCache.key = null;
    }

    function reset(full) {
      grid = buildGrid();
      buildDots();
      if (full) {
        score = 0;
        level = 1;
        lives = 3;
        fruitDone = [false, false];
        api.setScore(0);
      }
      fruit = null;
      particles = [];
      floats = [];
      flash = 0;
      resetPositions();
      state = 'ready';
      stateT = 1.6;
    }

    /* ---------- fx ---------- */
    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.5) * 260,
          life: 0.45 + Math.random() * 0.35,
          max: 0.8,
          color: color
        });
      }
    }

    function addPts(n) {
      score += n;
      api.setScore(score);
    }

    function addFloat(tx, ty, text) {
      floats.push({ x: tx, y: ty, text: text, life: 1.1 });
    }

    /* ---------- gameplay ---------- */
    function eatTile(x, y) {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return;
      const v = dots[y][x];
      if (!v) return;
      dots[y][x] = 0;
      dotCount--;
      dotsEaten++;
      if (v === 1) {
        addPts(10);
        api.sfx('coin');
      } else {
        addPts(50);
        api.sfx('power');
        flash = 0.35;
        frightT = frightDuration();
        combo = 0;
        ghosts.forEach(g => { if (g.state !== 'eyes') g.frightened = true; });
        const p = posOf(pm);
        burst((p.x + 0.5) * 1, (p.y + 0.5) * 1, '#5BE7FF', 14);
        addFloat(pm.tx, pm.ty, '50');
      }
    }

    function spawnFruit() {
      fruit = { x: FRUIT_POS.x, y: FRUIT_POS.y, t: 9 };
    }

    function die() {
      if (state !== 'play') return;
      state = 'dying';
      stateT = 1.4;
      lives--;
      api.sfx('explode');
      const p = posOf(pm);
      burst(p.x + 0.5, p.y + 0.5, '#FFE9A8', 24);
    }

    function startLevelClear() {
      state = 'levelclear';
      stateT = 2.2;
      api.sfx('win');
    }

    function checkCollisions() {
      const pp = posOf(pm);
      for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i];
        if (g.state === 'eyes' || g.state === 'wait') continue;
        if (insideInterior(g.tx, g.ty)) continue;
        const gp = posOf(g);
        const dx = gp.x - pp.x, dy = gp.y - pp.y;
        if (dx * dx + dy * dy >= 0.36) continue;
        if (g.frightened) {
          combo++;
          const pts = Math.min(1600, 200 * Math.pow(2, combo - 1));
          addPts(pts);
          addFloat(g.tx, g.ty, String(pts));
          api.sfx('achievement');
          burst(gp.x + 0.5, gp.y + 0.5, '#5BE7FF', 16);
          g.state = 'eyes';
          g.frightened = false;
          g.dir = opposite(g.dir);
          bfsCache.key = null;
        } else {
          die();
          return;
        }
      }
    }

    function readInput() {
      let d = null;
      if (input.down('ArrowLeft') || input.down('a') || input.touch.left) d = LEFT;
      else if (input.down('ArrowRight') || input.down('d') || input.touch.right) d = RIGHT;
      else if (input.down('ArrowUp') || input.down('w') || input.touch.up) d = UP;
      else if (input.down('ArrowDown') || input.down('s') || input.touch.down) d = DOWN;
      if (!d) return;
      if (pm && d === opposite(pm.dir) && (pm.dir.x !== 0 || pm.dir.y !== 0) && pm.prog > 0) {
        // разворот на середине тайла
        let nx = pm.tx + pm.dir.x, ny = pm.ty + pm.dir.y;
        if (ny === TUNNEL_ROW) nx = ((nx % COLS) + COLS) % COLS;
        pm.tx = nx; pm.ty = ny;
        pm.dir = d;
        pm.prog = 1 - pm.prog;
        wantDir = d;
      } else {
        wantDir = d;
      }
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt;
        f.y -= dt * 1.4;
        if (f.life <= 0) floats.splice(i, 1);
      }
    }

    function update(dt) {
      updateParticles(dt);
      flash = Math.max(0, flash - dt);
      if (state === 'over') return;

      if (state === 'ready') {
        readInput();
        stateT -= dt;
        if (stateT <= 0) state = 'play';
        return;
      }
      if (state === 'dying') {
        stateT -= dt;
        if (stateT <= 0) {
          if (lives <= 0) {
            state = 'over';
            api.gameOver(score, {
              icon: '👻',
              message: 'Пройден уровень ' + level + ', осталось точек: ' + dotCount
            });
          } else {
            resetPositions();
            state = 'ready';
            stateT = 1.4;
          }
        }
        return;
      }
      if (state === 'levelclear') {
        stateT -= dt;
        if (stateT <= 0) {
          level++;
          buildDots();
          fruitDone = [false, false];
          fruit = null;
          resetPositions();
          state = 'ready';
          stateT = 1.5;
        }
        return;
      }

      /* --- play --- */
      readInput();

      if (pm.dir.x === 0 && pm.dir.y === 0 && wantDir && canMove(pm, wantDir, false, null)) {
        pm.dir = wantDir;
      }
      if (pm.dir.x !== 0 || pm.dir.y !== 0) mouthPhase += dt * 11;
      advance(pm, dt, pmSpeed(), pmArrive);
      if (pm.prog < 0.25) eatTile(pm.tx, pm.ty);

      if (frightT > 0) {
        frightT -= dt;
        if (frightT <= 0) {
          frightT = 0;
          combo = 0;
          ghosts.forEach(g => { g.frightened = false; });
        }
      }

      for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i];
        if (g.state === 'wait') {
          g.wait -= dt;
          if (g.wait <= 0) {
            if (insideInterior(g.tx, g.ty)) g.state = 'leaving';
            else g.state = 'active';
          }
          continue;
        }
        advance(g, dt, ghostSpeed(g), e => ghostArrive(e, i));
      }

      /* фрукт */
      if (!fruitDone[0] && dotsEaten >= 60) { fruitDone[0] = true; spawnFruit(); }
      else if (!fruitDone[1] && dotsEaten >= 130) { fruitDone[1] = true; spawnFruit(); }
      if (fruit) {
        fruit.t -= dt;
        const pp = posOf(pm);
        const dx = pp.x + 0.5 - (fruit.x + 0.5), dy = pp.y + 0.5 - (fruit.y + 0.5);
        if (dx * dx + dy * dy < 0.3) {
          addPts(100);
          addFloat(fruit.x, fruit.y, '100');
          api.sfx('coin');
          burst(fruit.x + 0.5, fruit.y + 0.5, '#FF5B6E', 14);
          fruit = null;
        } else if (fruit.t <= 0) fruit = null;
      }

      checkCollisions();
      if (dotCount <= 0 && state === 'play') startLevelClear();
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

    function drawGhostShape(c, cx, cy, r, bodyColor, dir, frightened, flashing, eyesOnly) {
      if (eyesOnly) {
        drawEyes(c, cx, cy, r, dir, '#FFFFFF', '#3355FF');
        return;
      }
      c.save();
      c.fillStyle = flashing ? '#FFFFFF' : (frightened ? '#2233DD' : bodyColor);
      c.beginPath();
      c.arc(cx, cy - r * 0.08, r, Math.PI, 0);
      c.lineTo(cx + r, cy + r * 0.72);
      const waves = 3;
      const w = (r * 2) / waves;
      for (let i = 0; i < waves; i++) {
        const x0 = cx + r - i * w;
        c.quadraticCurveTo(x0 - w / 2, cy + r * (i % 2 ? 0.4 : 1.0), x0 - w, cy + r * 0.72);
      }
      c.closePath();
      c.fill();
      c.restore();

      if (frightened && !flashing) {
        c.fillStyle = '#FFD1D1';
        c.fillRect(cx - r * 0.45, cy - r * 0.2, r * 0.24, r * 0.24);
        c.fillRect(cx + r * 0.21, cy - r * 0.2, r * 0.24, r * 0.24);
        c.strokeStyle = '#FFD1D1';
        c.lineWidth = Math.max(1, r * 0.14);
        c.beginPath();
        c.moveTo(cx - r * 0.5, cy + r * 0.35);
        const seg = (r * 1.0) / 4;
        for (let i = 0; i < 4; i++) {
          c.lineTo(cx - r * 0.5 + seg * i + seg / 2, cy + (i % 2 ? r * 0.55 : r * 0.2));
          c.lineTo(cx - r * 0.5 + seg * (i + 1), cy + r * 0.35);
        }
        c.stroke();
      } else {
        drawEyes(c, cx, cy, r, dir, '#FFFFFF', '#2244CC');
      }
    }

    function drawEyes(c, cx, cy, r, dir, white, pupil) {
      const ex = r * 0.36, ey = -r * 0.12, er = r * 0.32;
      [-1, 1].forEach(s => {
        c.fillStyle = white;
        c.beginPath();
        c.arc(cx + s * ex, cy + ey, er, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = pupil;
        c.beginPath();
        c.arc(cx + s * ex + dir.x * er * 0.45, cy + ey + dir.y * er * 0.45, er * 0.5, 0, Math.PI * 2);
        c.fill();
      });
    }

    function drawPacman(c, cx, cy, r, dir, t) {
      let angle = Math.atan2(dir.y, dir.x);
      let open, rr = r;
      if (state === 'dying') {
        const ph = Math.min(1, 1 - stateT / 1.4);
        open = ph * Math.PI * 0.98;
        angle = -Math.PI / 2;
        if (ph > 0.7) rr = r * (1 - (ph - 0.7) / 0.3);
      } else {
        open = 0.14 + 0.26 * Math.abs(Math.sin(t));
      }
      if (rr <= 0.5) return;
      c.save();
      c.fillStyle = '#FFE24A';
      c.shadowColor = '#FFE24A';
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, rr, angle + open, angle + Math.PI * 2 - open);
      c.closePath();
      c.fill();
      c.restore();
    }

    function draw() {
      const w = cv.w, h = cv.h;
      const hudH = 30;
      const cell = Math.max(8, Math.floor(Math.min((w - 10) / COLS, (h - hudH - 10) / ROWS)));
      const offX = Math.floor((w - cell * COLS) / 2);
      const offY = Math.floor(hudH + (h - hudH - cell * ROWS) / 2);
      const now = performance.now() / 1000;

      ctx.fillStyle = '#05060E';
      ctx.fillRect(0, 0, w, h);

      /* стены */
      ctx.fillStyle = '#0A1030';
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (grid[y][x] === WALL) ctx.fillRect(offX + x * cell, offY + y * cell, cell, cell);
        }
      }
      const lw = Math.max(1.6, cell * 0.09);
      const inw = lw / 2;
      ctx.save();
      ctx.strokeStyle = '#3B63FF';
      ctx.lineWidth = lw;
      ctx.shadowColor = '#3B63FF';
      ctx.shadowBlur = 7;
      ctx.beginPath();
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (grid[y][x] !== WALL) continue;
          const px = offX + x * cell, py = offY + y * cell;
          if (tileAt(x, y - 1) !== WALL) { ctx.moveTo(px, py + inw); ctx.lineTo(px + cell, py + inw); }
          if (tileAt(x, y + 1) !== WALL) { ctx.moveTo(px, py + cell - inw); ctx.lineTo(px + cell, py + cell - inw); }
          if (tileAt(x - 1, y) !== WALL) { ctx.moveTo(px + inw, py); ctx.lineTo(px + inw, py + cell); }
          if (tileAt(x + 1, y) !== WALL) { ctx.moveTo(px + cell - inw, py); ctx.lineTo(px + cell - inw, py + cell); }
        }
      }
      ctx.stroke();
      ctx.restore();

      /* дверь дома призраков */
      ctx.fillStyle = '#FFB6C8';
      ctx.fillRect(offX + DOOR.x * cell + cell * 0.1, offY + DOOR.y * cell + cell * 0.4, cell * 0.8, Math.max(2, cell * 0.2));

      /* точки */
      const dotR = Math.max(1.4, cell * 0.085);
      ctx.fillStyle = '#FFE7A3';
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (dots[y][x] !== 1) continue;
          ctx.beginPath();
          ctx.arc(offX + (x + 0.5) * cell, offY + (y + 0.5) * cell, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* энерджайзеры */
      const pulse = 0.75 + 0.25 * Math.sin(now * 6);
      ctx.save();
      ctx.shadowColor = '#5BE7FF';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#5BE7FF';
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (dots[y][x] !== 2) continue;
          ctx.beginPath();
          ctx.arc(offX + (x + 0.5) * cell, offY + (y + 0.5) * cell, cell * 0.22 * pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      /* фрукт */
      if (fruit) {
        const fx = offX + (fruit.x + 0.5) * cell;
        const fy = offY + (fruit.y + 0.5) * cell;
        const blink = fruit.t < 2.5 && Math.floor(fruit.t * 6) % 2 === 0;
        if (!blink) {
          ctx.save();
          ctx.shadowColor = '#FF5B6E';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#FF4060';
          ctx.beginPath(); ctx.arc(fx - cell * 0.16, fy + cell * 0.12, cell * 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(fx + cell * 0.18, fy + cell * 0.16, cell * 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = Math.max(1.4, cell * 0.1);
          ctx.beginPath();
          ctx.moveTo(fx - cell * 0.16, fy - cell * 0.05);
          ctx.quadraticCurveTo(fx, fy - cell * 0.4, fx + cell * 0.3, fy - cell * 0.34);
          ctx.stroke();
        }
      }

      /* призраки */
      for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i];
        const p = posOf(g);
        let cx = offX + (p.x + 0.5) * cell;
        let cy = offY + (p.y + 0.5) * cell;
        if (g.state === 'wait') cy += Math.sin(now * 6 + i) * cell * 0.14;
        const r = cell * 0.44;
        const flashing = g.frightened && frightT < 2 && Math.floor(frightT * 6) % 2 === 0;
        drawGhostShape(ctx, cx, cy, r, g.color, g.dir, g.frightened, flashing, g.state === 'eyes');
      }

      /* Pac-Man */
      if (state !== 'over') {
        const p = posOf(pm);
        drawPacman(ctx, offX + (p.x + 0.5) * cell, offY + (p.y + 0.5) * cell, cell * 0.45, pm.dir, mouthPhase);
      }

      /* частицы и всплывающие очки */
      particles.forEach(pt => {
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        const px = offX + pt.x * cell, py = offY + pt.y * cell;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      });
      ctx.globalAlpha = 1;
      floats.forEach(f => {
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.fillStyle = '#5BE7FF';
        ctx.font = '700 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, offX + (f.x + 0.5) * cell, offY + (f.y + 0.5) * cell);
      });
      ctx.globalAlpha = 1;

      /* HUD */
      ctx.fillStyle = '#9FB3FF';
      ctx.font = '700 13px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('УР. ' + level, 8, 20);
      ctx.textAlign = 'center';
      ctx.fillText('ТОЧЕК ' + dotCount, w / 2, 20);
      for (let i = 0; i < lives; i++) {
        const lx = w - 14 - i * 18, ly = 15;
        ctx.fillStyle = '#FFE24A';
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.arc(lx, ly, 6, 0.5, Math.PI * 2 - 0.5);
        ctx.closePath();
        ctx.fill();
      }

      /* состояния */
      let big = null;
      if (state === 'ready') big = 'ГОТОВ!';
      else if (state === 'levelclear') big = 'УРОВЕНЬ ' + (level + 1) + '!';
      if (big) {
        ctx.save();
        ctx.font = '800 ' + Math.max(18, Math.round(cell * 0.9)) + 'px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFE24A';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#FFE24A';
        ctx.fillText(big, w / 2, offY + cell * 13);
        ctx.restore();
      }
      if (flash > 0) {
        ctx.fillStyle = 'rgba(91,231,255,' + (flash * 0.35) + ')';
        ctx.fillRect(0, 0, w, h);
      }
    }

    /* ---------- boot ---------- */
    reset(true);
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); cv.destroy(); }
    };
  });
})();
