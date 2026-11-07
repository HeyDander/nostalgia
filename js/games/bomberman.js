/* ============================================================
   RetroNova — Бомбермен
   Поле 13×11, ящики, бомбы с крестообразным взрывом и цепными
   реакциями, лестница под ящиком, враг-ИИ, уровни сложнее.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'bomberman',
    title: 'Бомбермен',
    emoji: '💣',
    genre: 'action',
    year: 1985,
    touch: 'both',
    controls: 'Стрелки/WASD — движение · Space — бомба · R — заново · Esc — пауза',
    desc: 'Взрывайте ящики бомбами, находите лестницу под ними и уворачивайтесь от собственных взрывов и врагов.',
    goodAt: 2500
  }, function (api) {
    const cv = api.createCanvas({ aspect: 13 / 11 });
    const ctx = cv.ctx;
    const input = api.input;

    const COLS = 13, ROWS = 11;
    const EMPTY = 0, SOLID = 1, CRATE = 2;
    const DIRS = [
      { x: 0, y: -1, n: 0 },
      { x: -1, y: 0, n: 1 },
      { x: 0, y: 1, n: 2 },
      { x: 1, y: 0, n: 3 }
    ];
    const UP = DIRS[0], LEFT = DIRS[1], DOWN = DIRS[2], RIGHT = DIRS[3];
    const R = 0.36;

    let tiles, exitTile, exitRevealed;
    let player, enemies, bombs, flames, particles;
    let score, level, state, stateT;
    let enemyId = 1;

    /* ---------- field ---------- */
    function buildField() {
      tiles = [];
      for (let y = 0; y < ROWS; y++) {
        const row = new Array(COLS).fill(EMPTY);
        for (let x = 0; x < COLS; x++) {
          if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) row[x] = SOLID;
          else if (x % 2 === 0 && y % 2 === 0) row[x] = SOLID;
        }
        tiles.push(row);
      }
      const safe = (x, y) => (x <= 3 && y <= 3) || (x >= COLS - 4 && y >= ROWS - 4);
      const crates = [];
      const p = Math.min(0.8, 0.6 + level * 0.03);
      for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
          if (tiles[y][x] !== EMPTY) continue;
          if (safe(x, y)) continue;
          if (Math.random() < p) { tiles[y][x] = CRATE; crates.push({ x: x, y: y }); }
        }
      }
      exitRevealed = false;
      if (crates.length) {
        const c = crates[(Math.random() * crates.length) | 0];
        exitTile = { x: c.x, y: c.y };
      } else {
        exitTile = { x: (COLS / 2) | 0, y: (ROWS / 2) | 0 };
        exitRevealed = true;
      }
      // чистим зону спавна игрока и врага
      [[1, 1], [2, 1], [1, 2], [3, 1], [1, 3]].forEach(c => { if (tiles[c[1]][c[0]] === CRATE) tiles[c[1]][c[0]] = EMPTY; });
      const es = enemySpawnTiles();
      es.forEach(c => { if (tiles[c.y][c.x] === CRATE) tiles[c.y][c.x] = EMPTY; });
    }

    function enemySpawnTiles() {
      return [
        { x: COLS - 2, y: ROWS - 2 },
        { x: COLS - 3, y: ROWS - 2 },
        { x: COLS - 2, y: ROWS - 3 },
        { x: COLS - 4, y: ROWS - 2 },
        { x: COLS - 2, y: ROWS - 4 }
      ];
    }

    function tileAt(x, y) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return SOLID;
      return tiles[y][x];
    }

    function isSolid(x, y) { return tileAt(x, y) !== EMPTY; }

    function bombAt(x, y) {
      for (let i = 0; i < bombs.length; i++) {
        const b = bombs[i];
        if (!b.exploded && b.x === x && b.y === y) return b;
      }
      return null;
    }

    function blocked(px, py, e, r) {
      const x0 = Math.floor(px - r - 0.5) + 1;
      const x1 = Math.ceil(px + r + 0.5) - 1;
      const y0 = Math.floor(py - r - 0.5) + 1;
      const y1 = Math.ceil(py + r + 0.5) - 1;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return { tx: Math.max(0, Math.min(COLS - 1, x)), ty: Math.max(0, Math.min(ROWS - 1, y)) };
          if (isSolid(x, y)) return { tx: x, ty: y };
          const b = bombAt(x, y);
          if (b && !b.pass.has(e.id)) return { tx: x, ty: y };
        }
      }
      return null;
    }

    function moveAxis(e, axis, delta, r) {
      if (delta === 0) return false;
      const old = e[axis];
      e[axis] = old + delta;
      const b = blocked(e.x, e.y, e, r);
      if (!b) return true;
      const dir = delta > 0 ? 1 : -1;
      if (axis === 'x') e.x = dir > 0 ? b.tx - 0.5 - r : b.tx + 0.5 + r;
      else e.y = dir > 0 ? b.ty - 0.5 - r : b.ty + 0.5 + r;
      if (blocked(e.x, e.y, e, r)) { e[axis] = old; return false; }
      return true;
    }

    /* ---------- entities ---------- */
    function makePlayer() {
      return { id: 0, x: 1, y: 1, dir: DOWN, moving: false, speed: 3.6 };
    }

    function makeEnemy(spawn, idx) {
      return {
        id: enemyId++,
        x: spawn.x, y: spawn.y,
        dir: LEFT,
        speed: 2.1 + Math.min(1.4, (level - 1) * 0.18) + idx * 0.1,
        think: 0,
        dead: false
      };
    }

    function reset(full) {
      buildField();
      bombs = [];
      flames = [];
      particles = [];
      player = makePlayer();
      const count = Math.min(3, level);
      const spawns = enemySpawnTiles();
      enemies = [];
      for (let i = 0; i < count; i++) enemies.push(makeEnemy(spawns[i], i));
      if (full) {
        score = 0;
        level = 1;
        api.setScore(0);
        const again = enemySpawnTiles();
        enemies = [makeEnemy(again[0], 0)];
      }
      state = 'ready';
      stateT = 1.3;
    }

    function addPts(n) { score += n; api.setScore(score); }

    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 0.4 + Math.random() * 0.3,
          max: 0.7,
          color: color
        });
      }
    }

    /* ---------- bombs ---------- */
    function placeBomb() {
      const bx = Math.round(player.x), by = Math.round(player.y);
      if (tileAt(bx, by) !== EMPTY) return;
      if (bombAt(bx, by)) return;
      const active = bombs.filter(b => !b.exploded).length;
      if (active >= maxBombs()) return;
      const pass = new Set();
      [player].concat(enemies).forEach(e => {
        if (Math.abs(e.x - bx) < 0.7 && Math.abs(e.y - by) < 0.7) pass.add(e.id);
      });
      bombs.push({ x: bx, y: by, t: 2.5, pass: pass, exploded: false });
      api.sfx('click');
    }

    function maxBombs() { return Math.min(3, 1 + Math.floor((level - 1) / 2)); }

    function destroyCrate(x, y) {
      if (tiles[y][x] !== CRATE) return;
      tiles[y][x] = EMPTY;
      addPts(20);
      api.sfx('bounce');
      burst(x, y, '#E08B3C', 12);
      if (exitTile.x === x && exitTile.y === y) {
        exitRevealed = true;
        api.sfx('power');
      }
    }

    function explode(bomb) {
      if (bomb.exploded) return;
      bomb.exploded = true;
      const cells = [{ x: bomb.x, y: bomb.y }];
      for (let i = 0; i < 4; i++) {
        const d = DIRS[i];
        for (let s = 1; s <= 3; s++) {
          const x = bomb.x + d.x * s, y = bomb.y + d.y * s;
          const t = tileAt(x, y);
          if (t === SOLID) break;
          cells.push({ x: x, y: y });
          if (t === CRATE) { destroyCrate(x, y); break; }
        }
      }
      flames.push({ cells: cells, life: 0.55, max: 0.55 });
      api.sfx('explode');
      // цепная реакция
      bombs.forEach(b => {
        if (b.exploded) return;
        for (let i = 0; i < cells.length; i++) {
          if (b.x === cells[i].x && b.y === cells[i].y) { explode(b); break; }
        }
      });
    }

    function inFlame(x, y) {
      for (let i = 0; i < flames.length; i++) {
        const f = flames[i];
        if (f.life <= 0.12) continue;
        for (let j = 0; j < f.cells.length; j++) {
          const c = f.cells[j];
          if (Math.abs(x - c.x) < 0.55 && Math.abs(y - c.y) < 0.55) return true;
        }
      }
      return false;
    }

    function tileInDanger(x, y) {
      for (let i = 0; i < bombs.length; i++) {
        const b = bombs[i];
        if (b.exploded) continue;
        if (b.x === x && b.y === y) return true;
        for (let d = 0; d < 4; d++) {
          const dir = DIRS[d];
          for (let s = 1; s <= 3; s++) {
            const tx = b.x + dir.x * s, ty = b.y + dir.y * s;
            const t = tileAt(tx, ty);
            if (t === SOLID) break;
            if (tx === x && ty === y) return true;
            if (t === CRATE) break;
          }
        }
      }
      return false;
    }

    /* ---------- enemy AI ---------- */
    function canStep(e, d) {
      const tx = Math.round(e.x + d.x * 0.9), ty = Math.round(e.y + d.y * 0.9);
      if (isSolid(tx, ty)) return false;
      if (bombAt(tx, ty)) return false;
      return true;
    }

    function decideEnemy(en) {
      const tx = Math.round(en.x), ty = Math.round(en.y);
      const danger = tileInDanger(tx, ty);
      let cands = DIRS.filter(d => canStep(en, d));
      if (!cands.length) { en.dir = UP; return; }

      if (danger) {
        // убегаем: выбираем направление, ведущее из опасной зоны
        const safe = cands.filter(d => !tileInDanger(Math.round(en.x + d.x), Math.round(en.y + d.y)));
        if (safe.length) {
          // дальше всего от ближайшей бомбы
          let best = safe[0], bestD = -1;
          safe.forEach(d => {
            const nx = en.x + d.x, ny = en.y + d.y;
            let dmin = 99;
            bombs.forEach(b => {
              if (b.exploded) return;
              const dd = Math.abs(b.x - nx) + Math.abs(b.y - ny);
              if (dd < dmin) dmin = dd;
            });
            if (dmin > bestD) { bestD = dmin; best = d; }
          });
          en.dir = best;
        } else {
          en.dir = cands[(Math.random() * cands.length) | 0];
        }
        return;
      }

      const dx = player.x - en.x, dy = player.y - en.y;
      if (Math.random() < 0.22) {
        en.dir = cands[(Math.random() * cands.length) | 0];
        return;
      }
      const ordered = [];
      if (Math.abs(dx) > Math.abs(dy)) {
        ordered.push(dx > 0 ? RIGHT : LEFT, dy > 0 ? DOWN : UP, dy > 0 ? UP : DOWN, dx > 0 ? LEFT : RIGHT);
      } else {
        ordered.push(dy > 0 ? DOWN : UP, dx > 0 ? RIGHT : LEFT, dx > 0 ? LEFT : RIGHT, dy > 0 ? UP : DOWN);
      }
      for (let i = 0; i < ordered.length; i++) {
        if (cands.indexOf(ordered[i]) >= 0) { en.dir = ordered[i]; return; }
      }
      en.dir = cands[0];
    }

    /* ---------- level flow ---------- */
    function die(reason) {
      if (state !== 'play') return;
      state = 'dying';
      stateT = 1.0;
      api.sfx('explode');
      burst(player.x, player.y, '#FF6B6B', 26);
    }

    function clearLevel() {
      state = 'levelclear';
      stateT = 1.7;
      addPts(1000);
      api.sfx('win');
      burst(player.x, player.y, '#4ADE80', 24);
    }

    /* ---------- update ---------- */
    function update(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 6 * dt;
      }
      if (state === 'over') return;

      if (state === 'ready') {
        stateT -= dt;
        if (input.pressed('Space') || input.touchPressed('a')) stateT = Math.min(stateT, 0.15);
        if (stateT <= 0) state = 'play';
        return;
      }
      if (state === 'dying') {
        stateT -= dt;
        if (stateT <= 0) {
          state = 'over';
          api.gameOver(score, {
            icon: '💥',
            message: 'Уровень ' + level + ' · врагов осталось: ' + enemies.filter(e => !e.dead).length
          });
        }
        return;
      }
      if (state === 'levelclear') {
        stateT -= dt;
        if (stateT <= 0) {
          level++;
          reset(false);
        }
        return;
      }

      /* --- play --- */
      let dx = 0, dy = 0;
      if (input.down('ArrowLeft') || input.down('a') || input.touch.left) dx = -1;
      else if (input.down('ArrowRight') || input.down('d') || input.touch.right) dx = 1;
      if (input.down('ArrowUp') || input.down('w') || input.touch.up) dy = -1;
      else if (input.down('ArrowDown') || input.down('s') || input.touch.down) dy = 1;
      if (dx && dy) dy = 0; // диагональ не даёт преимущества
      player.moving = !!(dx || dy);
      if (dx) player.dir = dx > 0 ? RIGHT : LEFT;
      else if (dy) player.dir = dy > 0 ? DOWN : UP;
      const ps = player.speed * dt;
      if (dx) moveAxis(player, 'x', dx * ps, R);
      if (dy) moveAxis(player, 'y', dy * ps, R);

      if (input.pressed('Space') || input.touchPressed('a')) placeBomb();

      /* бомбы */
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i];
        if (b.exploded) { bombs.splice(i, 1); continue; }
        b.t -= dt;
        if (b.t <= 0) explode(b);
      }
      for (let i = flames.length - 1; i >= 0; i--) {
        flames[i].life -= dt;
        if (flames[i].life <= 0) flames.splice(i, 1);
      }

      /* враги */
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.dead) continue;
        en.think -= dt;
        const ahead = blocked(
          en.x + en.dir.x * (en.speed * dt + 0.12),
          en.y + en.dir.y * (en.speed * dt + 0.12),
          en, R
        );
        if (en.think <= 0 || ahead) {
          decideEnemy(en);
          en.think = 0.45;
        }
        const es = en.speed * dt;
        const movedX = moveAxis(en, 'x', en.dir.x * es, R);
        const movedY = moveAxis(en, 'y', en.dir.y * es, R);
        if (!movedX && !movedY) en.think = 0;
      }

      /* урон от огня */
      if (inFlame(player.x, player.y)) { die(); return; }
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.dead) continue;
        if (inFlame(en.x, en.y)) {
          en.dead = true;
          addPts(200);
          api.sfx('power');
          burst(en.x, en.y, '#FF4D6A', 18);
          continue;
        }
        const ddx = en.x - player.x, ddy = en.y - player.y;
        if (ddx * ddx + ddy * ddy < 0.42) { die(); return; }
      }

      /* выход */
      if (exitRevealed) {
        const ex = player.x - exitTile.x, ey = player.y - exitTile.y;
        if (ex * ex + ey * ey < 0.2) clearLevel();
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

    function drawPlayer(c, cx, cy, s, dir, t) {
      c.save();
      c.fillStyle = '#4F8FFF';
      c.shadowColor = '#4F8FFF';
      c.shadowBlur = 8;
      c.beginPath();
      c.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
      c.fill();
      c.restore();
      // визор
      c.fillStyle = '#EAF2FF';
      roundRect(c, cx - s * 0.26, cy - s * 0.2, s * 0.52, s * 0.3, s * 0.12);
      c.fill();
      c.fillStyle = '#12203F';
      const ex = dir.x * s * 0.08, ey = dir.y * s * 0.08;
      c.beginPath(); c.arc(cx - s * 0.11 + ex, cy - s * 0.05 + ey, s * 0.05, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + s * 0.11 + ex, cy - s * 0.05 + ey, s * 0.05, 0, Math.PI * 2); c.fill();
      // антенна
      c.strokeStyle = '#9FC1FF';
      c.lineWidth = Math.max(1.2, s * 0.05);
      c.beginPath();
      c.moveTo(cx, cy - s * 0.4);
      c.lineTo(cx, cy - s * 0.55);
      c.stroke();
      c.fillStyle = Math.floor(t * 6) % 2 ? '#FFD84A' : '#FF6B6B';
      c.beginPath(); c.arc(cx, cy - s * 0.6, s * 0.07, 0, Math.PI * 2); c.fill();
    }

    function drawEnemy(c, cx, cy, s, t) {
      c.save();
      c.fillStyle = '#FF4D6A';
      c.shadowColor = '#FF4D6A';
      c.shadowBlur = 8;
      c.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 + t * 1.5;
        const rr = i % 2 === 0 ? s * 0.42 : s * 0.3;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
      c.restore();
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.arc(cx - s * 0.13, cy - s * 0.05, s * 0.1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + s * 0.13, cy - s * 0.05, s * 0.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2A0A12';
      c.beginPath(); c.arc(cx - s * 0.13, cy - s * 0.03, s * 0.05, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + s * 0.13, cy - s * 0.03, s * 0.05, 0, Math.PI * 2); c.fill();
    }

    function draw() {
      const w = cv.w, h = cv.h;
      const hudH = 28;
      const cell = Math.max(10, Math.floor(Math.min((w - 8) / COLS, (h - hudH - 8) / ROWS)));
      const offX = Math.floor((w - cell * COLS) / 2);
      const offY = Math.floor(hudH + (h - hudH - cell * ROWS) / 2);
      const now = performance.now() / 1000;

      ctx.fillStyle = '#0A0D18';
      ctx.fillRect(0, 0, w, h);

      // пол
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#141A2E' : '#171E36';
          ctx.fillRect(offX + x * cell, offY + y * cell, cell, cell);
        }
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const t = tiles[y][x];
          const px = offX + x * cell, py = offY + y * cell;
          if (t === SOLID) {
            ctx.fillStyle = '#2C3454';
            roundRect(ctx, px + 1, py + 1, cell - 2, cell - 2, 4);
            ctx.fill();
            ctx.fillStyle = '#3D4877';
            roundRect(ctx, px + 3, py + 3, cell - 6, cell * 0.36, 3);
            ctx.fill();
          } else if (t === CRATE) {
            ctx.fillStyle = '#A5611F';
            roundRect(ctx, px + 2, py + 2, cell - 4, cell - 4, 3);
            ctx.fill();
            ctx.strokeStyle = '#D8873A';
            ctx.lineWidth = Math.max(1.4, cell * 0.08);
            ctx.beginPath();
            ctx.moveTo(px + 4, py + 4); ctx.lineTo(px + cell - 4, py + cell - 4);
            ctx.moveTo(px + cell - 4, py + 4); ctx.lineTo(px + 4, py + cell - 4);
            ctx.stroke();
          } else if (exitRevealed && exitTile.x === x && exitTile.y === y) {
            ctx.fillStyle = '#0C1120';
            roundRect(ctx, px + 3, py + 3, cell - 6, cell - 6, 4);
            ctx.fill();
            ctx.strokeStyle = '#8B5A2B';
            ctx.lineWidth = Math.max(1.6, cell * 0.09);
            for (let i = 0; i < 3; i++) {
              const yy = py + cell * (0.28 + i * 0.22);
              ctx.beginPath();
              ctx.moveTo(px + cell * 0.28, yy);
              ctx.lineTo(px + cell * 0.72, yy);
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(px + cell * 0.3, py + cell * 0.24);
            ctx.lineTo(px + cell * 0.3, py + cell * 0.76);
            ctx.moveTo(px + cell * 0.7, py + cell * 0.24);
            ctx.lineTo(px + cell * 0.7, py + cell * 0.76);
            ctx.stroke();
          }
        }
      }

      // бомбы
      bombs.forEach(b => {
        if (b.exploded) return;
        const bx = offX + (b.x + 0.5) * cell;
        const by = offY + (b.y + 0.5) * cell;
        const k = Math.max(0, b.t / 2.5);
        const beat = 1 + Math.sin(now * (4 + (1 - k) * 14)) * 0.08 * (1 - k + 0.4);
        ctx.save();
        ctx.fillStyle = '#10131F';
        ctx.strokeStyle = k > 0.4 ? '#FFD84A' : '#FF5B6E';
        ctx.lineWidth = Math.max(1.6, cell * 0.08);
        ctx.shadowColor = k > 0.4 ? '#FFD84A' : '#FF5B6E';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx, by, cell * 0.32 * beat, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        // фитиль
        ctx.strokeStyle = '#C9A227';
        ctx.lineWidth = Math.max(1.4, cell * 0.07);
        ctx.beginPath();
        ctx.moveTo(bx + cell * 0.1, by - cell * 0.26);
        ctx.quadraticCurveTo(bx + cell * 0.3, by - cell * 0.44, bx + cell * 0.4, by - cell * 0.34);
        ctx.stroke();
        ctx.fillStyle = Math.floor(now * 12) % 2 ? '#FFE9A8' : '#FF8A3C';
        ctx.beginPath();
        ctx.arc(bx + cell * 0.4, by - cell * 0.34, cell * 0.08, 0, Math.PI * 2);
        ctx.fill();
      });

      // огонь
      flames.forEach(f => {
        const a = Math.min(1, f.life / 0.25);
        f.cells.forEach(c => {
          const fx = offX + (c.x + 0.5) * cell;
          const fy = offY + (c.y + 0.5) * cell;
          ctx.globalAlpha = a;
          ctx.save();
          ctx.shadowColor = '#FF8A3C';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#FF8A3C';
          roundRect(ctx, fx - cell * 0.44, fy - cell * 0.44, cell * 0.88, cell * 0.88, cell * 0.24);
          ctx.fill();
          ctx.fillStyle = '#FFE24A';
          roundRect(ctx, fx - cell * 0.24, fy - cell * 0.24, cell * 0.48, cell * 0.48, cell * 0.16);
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1;
        });
      });

      // враги
      enemies.forEach(en => {
        if (en.dead) return;
        drawEnemy(ctx, offX + (en.x + 0.5) * cell, offY + (en.y + 0.5) * cell, cell, now);
      });

      // игрок
      if (state !== 'dying' || Math.floor(stateT * 10) % 2 === 0) {
        drawPlayer(ctx, offX + (player.x + 0.5) * cell, offY + (player.y + 0.5) * cell, cell, player.dir, now);
      }

      // частицы
      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        const px = offX + p.x * cell, py = offY + p.y * cell;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = '#9FB3FF';
      ctx.font = '700 13px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('УР. ' + level, 8, 19);
      ctx.textAlign = 'center';
      const left = enemies.filter(e => !e.dead).length;
      ctx.fillText('ВРАГИ ' + left + ' · БОМБЫ ' + maxBombs(), w / 2, 19);
      ctx.textAlign = 'right';
      ctx.fillStyle = exitRevealed ? '#4ADE80' : '#6B7398';
      ctx.fillText(exitRevealed ? 'ВЫХОД ОТКРЫТ!' : 'ИЩИТЕ ЛЕСТНИЦУ', w - 8, 19);

      // состояния
      let big = null;
      if (state === 'ready') big = 'УРОВЕНЬ ' + level;
      else if (state === 'levelclear') big = 'УРОВЕНЬ ПРОЙДЕН! +1000';
      else if (state === 'dying') big = 'БУМ!';
      if (big) {
        ctx.save();
        ctx.font = '800 ' + Math.max(16, Math.round(cell * 0.62)) + 'px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.fillStyle = state === 'dying' ? '#FF6B6B' : '#FFE24A';
        ctx.fillText(big, w / 2, offY + cell * (ROWS / 2));
        ctx.restore();
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
