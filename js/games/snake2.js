/* ============================================================
   RetroNova — Snake 2 (Змейка 2)
   Тоннели по краям, ползущие стены, две еда, бессмертие.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'snake2',
    title: 'Змейка 2',
    emoji: '🐍',
    genre: 'arcade',
    year: 2001,
    touch: 'dpad',
    controls: 'Стрелки или WASD — движение · R — заново · Esc — пауза',
    desc: 'Большое поле 26×18 с тоннелями по краям и ползущими стенами. Золотое яблоко даёт 3 секунды бессмертия.',
    goodAt: 300
  }, function (api) {
    const cv = api.createCanvas({ aspect: 26 / 18 });
    const ctx = cv.ctx;
    const input = api.input;

    const COLS = 26, ROWS = 18;
    const palette = api.palette || { head: '#22C55E', body: '#86EFAC' };

    /* стартовые раскладки стен: голова + направление + длина */
    const PRESETS = [
      { x: 10, y: 3, dx: 1, dy: 0, len: 4 },
      { x: 21, y: 14, dx: -1, dy: 0, len: 5 },
      { x: 15, y: 9, dx: 0, dy: 1, len: 4 },
      { x: 5, y: 15, dx: 1, dy: 0, len: 4 },
      { x: 24, y: 5, dx: 0, dy: 1, len: 4 },
      { x: 12, y: 16, dx: 1, dy: 0, len: 3 },
      { x: 3, y: 4, dx: 0, dy: 1, len: 3 }
    ];

    let snake, dir, nextDir, food, golden, walls, particles;
    let score, eaten, grow, speed, acc, wallAcc;
    let dead, deadT, over, invuln, flash, goldenEvery;
    let cell = 20;

    /* ---------- setup ---------- */
    function makeWalls() {
      const picked = PRESETS.slice();
      for (let i = picked.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = picked[i]; picked[i] = picked[j]; picked[j] = t;
      }
      const count = Math.random() < 0.5 ? 2 : 3;
      const out = [];
      for (const p of picked) {
        if (out.length >= count) break;
        const pos = [];
        let ok = true;
        for (let i = 0; i < p.len; i++) {
          const x = p.x - p.dx * i, y = p.y - p.dy * i;
          if (x < 0 || y < 0 || x >= COLS || y >= ROWS) { ok = false; break; }
          if (y === 9 && x < 12) { ok = false; break; }       // стартовая зона змейки
          pos.push({ x: x, y: y });
        }
        if (!ok) continue;
        if (out.some(w => w.pos.some(c => pos.some(p2 => p2.x === c.x && p2.y === c.y)))) continue;
        out.push({ pos: pos, dx: p.dx, dy: p.dy, len: p.len });
      }
      return out;
    }

    function reset() {
      snake = [{ x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      walls = makeWalls();
      particles = [];
      food = null;
      golden = null;
      score = 0;
      eaten = 0;
      grow = 0;
      speed = 7;
      acc = 0;
      wallAcc = 0;
      dead = false;
      deadT = 0;
      over = false;
      invuln = 1.2;
      flash = 0;
      goldenEvery = 4;
      api.setScore(0);
      placeFood();
    }

    function busy(x, y) {
      if (snake.some(s => s.x === x && s.y === y)) return true;
      if (walls.some(w => w.pos.some(p => p.x === x && p.y === y))) return true;
      if (food && food.x === x && food.y === y) return true;
      if (golden && golden.x === x && golden.y === y) return true;
      return false;
    }

    function placeFood() {
      let tries = 0, p;
      do {
        p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        tries++;
      } while (tries < 400 && busy(p.x, p.y));
      food = p;
    }

    function placeGolden() {
      let tries = 0, p;
      do {
        p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        tries++;
      } while (tries < 400 && busy(p.x, p.y));
      golden = { x: p.x, y: p.y, life: 7 };
    }

    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 240,
          vy: (Math.random() - 0.5) * 240,
          life: 0.5 + Math.random() * 0.35,
          max: 0.85,
          color: color
        });
      }
    }

    /* ---------- input ---------- */
    function readInput() {
      let d = null;
      if (input.down('ArrowLeft') || input.down('a') || input.touch.left) d = { x: -1, y: 0 };
      else if (input.down('ArrowRight') || input.down('d') || input.touch.right) d = { x: 1, y: 0 };
      else if (input.down('ArrowUp') || input.down('w') || input.touch.up) d = { x: 0, y: -1 };
      else if (input.down('ArrowDown') || input.down('s') || input.touch.down) d = { x: 0, y: 1 };
      if (d && !(d.x === -dir.x && d.y === -dir.y)) nextDir = d;
    }

    /* ---------- walls ---------- */
    function hitsWall(x, y) {
      for (const w of walls) {
        for (const p of w.pos) if (p.x === x && p.y === y) return true;
      }
      return false;
    }

    function stepWall(w) {
      const head = w.pos[0];
      const nx = head.x + w.dx, ny = head.y + w.dy;
      let ok = nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS;
      if (ok) {
        for (const w2 of walls) {
          if (w2 === w) continue;
          if (w2.pos.some(p => p.x === nx && p.y === ny)) { ok = false; break; }
        }
      }
      if (ok && snake.some(s => s.x === nx && s.y === ny)) ok = false;
      if (ok) {
        w.pos.unshift({ x: nx, y: ny });
        w.pos.pop();
      } else {
        w.dx = -w.dx;
        w.dy = -w.dy;
        w.pos.reverse();
      }
    }

    /* ---------- update ---------- */
    function update(dt) {
      if (over) return;

      if (dead) {
        deadT += dt;
        updateParticles(dt);
        if (deadT > 1.0 && !over) {
          over = true;
          api.gameOver(score, {
            icon: '💥',
            message: 'Длина: ' + snake.length + ' · Съедено: ' + eaten
          });
        }
        return;
      }

      invuln = Math.max(0, invuln - dt);
      flash = Math.max(0, flash - dt);
      if (golden) {
        golden.life -= dt;
        if (golden.life <= 0) golden = null;
      }
      readInput();
      updateParticles(dt);

      wallAcc += dt;
      const wallInt = Math.max(0.3, 0.62 - eaten * 0.006);
      let guard = 0;
      while (wallAcc >= wallInt && guard < 4) { wallAcc -= wallInt; guard++; for (const w of walls) stepWall(w); }

      acc += dt * speed;
      let steps = 0;
      while (acc >= 1 && !dead && steps < 4) { acc -= 1; steps++; stepOnce(); }
      if (acc > 4) acc = 4;
    }

    function stepOnce() {
      dir = nextDir;
      const head = {
        x: (snake[0].x + dir.x + COLS) % COLS,
        y: (snake[0].y + dir.y + ROWS) % ROWS
      };

      if (invuln <= 0) {
        if (hitsWall(head.x, head.y)) return die((head.x + 0.5) * cell, (head.y + 0.5) * cell);
        const willGrow = grow > 0;
        const body = willGrow ? snake : snake.slice(0, -1);
        if (body.some(s => s.x === head.x && s.y === head.y)) return die((head.x + 0.5) * cell, (head.y + 0.5) * cell);
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        grow += 2;
        eaten++;
        score += 10;
        api.setScore(score);
        api.sfx('coin');
        burst((food.x + 0.5) * cell, (food.y + 0.5) * cell, '#F87171', 12);
        flash = 0.25;
        speed = Math.min(15, speed + 0.3);
        placeFood();
        if (eaten % goldenEvery === 0 && !golden) placeGolden();
      }

      if (golden && head.x === golden.x && head.y === golden.y) {
        grow += 1;
        score += 30;
        invuln = 3;
        api.setScore(score);
        api.sfx('power');
        burst((golden.x + 0.5) * cell, (golden.y + 0.5) * cell, '#FDE047', 22);
        flash = 0.4;
        golden = null;
      }

      if (grow > 0) grow--;
      else snake.pop();
    }

    function die(bx, by) {
      if (dead) return;
      dead = true;
      deadT = 0;
      api.sfx('explode');
      burst(bx, by, '#EF4444', 28);
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

    function mix(a, b, t) {
      const pa = hex(a), pb = hex(b);
      if (!pa || !pb) return a;
      return 'rgb(' + Math.round(pa[0] + (pb[0] - pa[0]) * t) + ',' +
        Math.round(pa[1] + (pb[1] - pa[1]) * t) + ',' +
        Math.round(pa[2] + (pb[2] - pa[2]) * t) + ')';
    }
    function hex(c) {
      if (typeof c !== 'string' || c[0] !== '#') return null;
      const s = c.slice(1);
      if (s.length === 3) return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    }

    function draw() {
      const w = cv.w, h = cv.h;
      cell = Math.floor(Math.min(w / COLS, h / ROWS));
      const offX = (w - cell * COLS) / 2;
      const offY = (h - cell * ROWS) / 2;

      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(0, 0, w, h);

      /* сетка + тоннели по краям */
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= COLS; x++) { ctx.moveTo(offX + x * cell, offY); ctx.lineTo(offX + x * cell, offY + ROWS * cell); }
      for (let y = 0; y <= ROWS; y++) { ctx.moveTo(offX, offY + y * cell); ctx.lineTo(offX + COLS * cell, offY + y * cell); }
      ctx.stroke();

      /* тоннели: светящиеся разрывы по бокам */
      ctx.save();
      ctx.strokeStyle = 'rgba(56,189,248,0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      const tMidY = offY + 9 * cell;
      ctx.beginPath();
      ctx.moveTo(offX, tMidY - cell * 1.4); ctx.lineTo(offX, tMidY + cell * 1.4);
      ctx.moveTo(offX + COLS * cell, tMidY - cell * 1.4); ctx.lineTo(offX + COLS * cell, tMidY + cell * 1.4);
      ctx.stroke();
      ctx.restore();

      /* рамка */
      ctx.strokeStyle = flash > 0 ? 'rgba(34,197,94,' + (0.4 + flash) + ')' : 'rgba(139,92,246,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(offX - 1, offY - 1, cell * COLS + 2, cell * ROWS + 2);

      /* ползущие стены */
      for (const wl of walls) {
        for (const p of wl.pos) {
          const x = offX + p.x * cell, y = offY + p.y * cell;
          ctx.fillStyle = '#334155';
          roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 3);
          ctx.fill();
          ctx.fillStyle = 'rgba(148,163,184,0.5)';
          ctx.fillRect(x + 3, y + 3, cell - 6, 3);
          ctx.fillStyle = 'rgba(15,23,42,0.65)';
          ctx.fillRect(x + 3, y + cell - 6, cell - 6, 3);
        }
      }

      /* обычная еда */
      const fx = offX + food.x * cell + cell / 2;
      const fy = offY + food.y * cell + cell / 2;
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.12;
      ctx.save();
      ctx.shadowColor = '#F87171';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(fx + cell * 0.13, fy - cell * 0.28, cell * 0.13, cell * 0.07, -0.6, 0, Math.PI * 2);
      ctx.fill();

      /* золотая еда */
      if (golden) {
        const gx = offX + golden.x * cell + cell / 2;
        const gy = offY + golden.y * cell + cell / 2;
        const gp = 1 + Math.sin(performance.now() / 120) * 0.16;
        ctx.save();
        ctx.shadowColor = '#FDE047';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = -Math.PI / 2 + i * Math.PI * 2 / 5;
          const a2 = a1 + Math.PI / 5;
          const r1 = cell * 0.36 * gp, r2 = cell * 0.16 * gp;
          if (i === 0) ctx.moveTo(gx + Math.cos(a1) * r1, gy + Math.sin(a1) * r1);
          else ctx.lineTo(gx + Math.cos(a1) * r1, gy + Math.sin(a1) * r1);
          ctx.lineTo(gx + Math.cos(a2) * r2, gy + Math.sin(a2) * r2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        /* таймер жизни */
        ctx.strokeStyle = 'rgba(253,224,71,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gx, gy, cell * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (golden.life / 7));
        ctx.stroke();
      }

      /* змейка */
      const rainbow = palette.head === 'rainbow';
      snake.forEach((s, i) => {
        const t = i / Math.max(1, snake.length - 1);
        let color;
        if (rainbow) {
          color = 'hsl(' + ((performance.now() / 14 + i * 24) % 360) + ' 85% 60%)';
        } else {
          color = i === 0 ? palette.head : mix(palette.head, palette.body, Math.min(1, t * 1.4));
        }
        const x = offX + s.x * cell;
        const y = offY + s.y * cell;
        const pad = i === 0 ? 1 : 2;
        const r = Math.max(3, cell * 0.22);

        ctx.save();
        if (i === 0) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
        if (invuln > 0 && Math.floor(performance.now() / 90) % 2 === 0) ctx.globalAlpha = 0.55;
        ctx.fillStyle = color;
        roundRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, r);
        ctx.fill();
        ctx.restore();

        if (i === 0 && !dead) {
          ctx.fillStyle = '#0B0E1A';
          const ex = x + cell / 2 + dir.x * cell * 0.16;
          const ey = y + cell / 2 + dir.y * cell * 0.16;
          const perpX = dir.y !== 0 ? cell * 0.18 : 0;
          const perpY = dir.x !== 0 ? cell * 0.18 : 0;
          const er = Math.max(1.6, cell * 0.1);
          ctx.beginPath(); ctx.arc(ex - perpX, ey - perpY, er, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(ex + perpX, ey + perpY, er, 0, Math.PI * 2); ctx.fill();
        }
      });

      /* частицы */
      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      /* индикатор бессмертия */
      if (invuln > 0 && !dead) {
        const bw = Math.min(220, w * 0.5);
        const bx = w / 2 - bw / 2, by = 10;
        ctx.fillStyle = 'rgba(15,23,42,0.8)';
        roundRect(ctx, bx, by, bw, 16, 8); ctx.fill();
        ctx.fillStyle = '#FDE047';
        roundRect(ctx, bx + 2, by + 2, (bw - 4) * Math.min(1, invuln / 3), 12, 6); ctx.fill();
        ctx.fillStyle = '#0B0E1A';
        ctx.font = '700 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('БЕССМЕРТИЕ ' + invuln.toFixed(1) + 'с', w / 2, by + 12);
      }

      if (dead) {
        ctx.fillStyle = 'rgba(239,68,68,' + Math.min(0.35, deadT * 0.5) + ')';
        ctx.fillRect(0, 0, w, h);
      }
    }

    reset();
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); cv.destroy(); }
    };
  });
})();
