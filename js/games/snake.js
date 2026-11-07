/* ============================================================
   RetroNova — Snake (Змейка)
   Reference implementation of the game API contract:
   RN.games.register(meta, factory) -> { destroy() }
   factory(api) where api = { input, createCanvas, loop, setScore,
     gameOver, isPaused, sfx, palette, ... }
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'snake',
    title: 'Змейка',
    emoji: '🐍',
    genre: 'arcade',
    year: 1997,
    touch: 'dpad',
    controls: 'Стрелки или WASD — движение · R — заново · Esc — пауза',
    desc: 'Классическая змейка: собирайте еду, растите и не врезайтесь в себя или в стену.',
    goodAt: 400
  }, function (api) {
    const cv = api.createCanvas({ aspect: 16 / 10 });
    const ctx = cv.ctx;
    const input = api.input;

    const COLS = 22, ROWS = 14;
    let cell = 24;
    let snake, dir, nextDir, food, particles;
    let score = 0, grow = 0, speed, acc, dead, deadT, invuln;
    let flash = 0;

    const palette = api.palette || { head: '#22C55E', body: '#86EFAC' };

    function reset() {
      snake = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      particles = [];
      score = 0;
      grow = 0;
      speed = 7;      // cells per second
      acc = 0;
      dead = false;
      deadT = 0;
      invuln = 1.2;
      api.setScore(0);
      placeFood();
    }

    function placeFood() {
      let tries = 0;
      do {
        food = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS)
        };
        tries++;
      } while (tries < 200 && snake.some(s => s.x === food.x && s.y === food.y));
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

    /* ---------- update ---------- */
    function update(dt) {
      if (dead) {
        deadT += dt;
        updateParticles(dt);
        if (deadT > 1.1) {
          api.gameOver(score, {
            icon: '💀',
            message: score > 0 ? 'Длина змейки: ' + snake.length : 'Столкновение на старте'
          });
        }
        return;
      }

      invuln = Math.max(0, invuln - dt);
      flash = Math.max(0, flash - dt);
      readInput();
      updateParticles(dt);

      acc += dt * speed;
      const step = 1; // one cell per step
      while (acc >= step && !dead) {
        acc -= step;
        stepOnce();
      }
    }

    function stepOnce() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // walls = death (classic)
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
        if (invuln > 0) { head.x = (head.x + COLS) % COLS; head.y = (head.y + ROWS) % ROWS; }
        else return die();
      }
      // self collision (skip tail which moves away, unless growing)
      const willGrow = grow > 0;
      const bodyToCheck = willGrow ? snake : snake.slice(0, -1);
      if (bodyToCheck.some(s => s.x === head.x && s.y === head.y)) return die();

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        grow += 2;
        score += 10;
        api.setScore(score);
        api.sfx('coin');
        burst((food.x + 0.5) * cell, (food.y + 0.5) * cell, '#F59E0B', 12);
        flash = 0.25;
        speed = Math.min(16, speed + 0.28);
        placeFood();
      }
      if (grow > 0) grow--;
      else snake.pop();
    }

    function die() {
      if (dead) return;
      dead = true;
      deadT = 0;
      api.sfx('explode');
      const h = snake[0];
      burst((h.x + 0.5) * cell, (h.y + 0.5) * cell, '#EF4444', 26);
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
    function draw() {
      const w = cv.w, h = cv.h;
      cell = Math.floor(Math.min(w / COLS, h / ROWS));
      const offX = (w - cell * COLS) / 2;
      const offY = (h - cell * ROWS) / 2;

      // background
      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= COLS; x++) { ctx.moveTo(offX + x * cell, offY); ctx.lineTo(offX + x * cell, offY + ROWS * cell); }
      for (let y = 0; y <= ROWS; y++) { ctx.moveTo(offX, offY + y * cell); ctx.lineTo(offX + COLS * cell, offY + y * cell); }
      ctx.stroke();

      // border glow
      ctx.strokeStyle = flash > 0 ? 'rgba(34,197,94,' + (0.4 + flash) + ')' : 'rgba(139,92,246,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(offX - 1, offY - 1, cell * COLS + 2, cell * ROWS + 2);

      // food
      const fx = offX + food.x * cell + cell / 2;
      const fy = offY + food.y * cell + cell / 2;
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.12;
      ctx.save();
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.32 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // apple leaf
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(fx + cell * 0.14, fy - cell * 0.3, cell * 0.14, cell * 0.07, -0.6, 0, Math.PI * 2);
      ctx.fill();

      // snake
      const rainbow = palette.head === 'rainbow';
      snake.forEach((s, i) => {
        const t = i / Math.max(1, snake.length - 1);
        let color;
        if (rainbow) {
          const hue = ((performance.now() / 14 + i * 24) % 360);
          color = 'hsl(' + hue + ' 85% 60%)';
        } else {
          color = i === 0 ? palette.head : mix(palette.head, palette.body, Math.min(1, t * 1.4));
        }
        const x = offX + s.x * cell;
        const y = offY + s.y * cell;
        const pad = i === 0 ? 1 : 2;
        const r = Math.max(3, cell * 0.22);

        ctx.save();
        if (i === 0) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
        ctx.fillStyle = color;
        roundRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, r);
        ctx.fill();
        ctx.restore();

        // eyes on head
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

      // particles
      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      // death overlay tint
      if (dead) {
        ctx.fillStyle = 'rgba(239,68,68,' + Math.min(0.35, deadT * 0.5) + ')';
        ctx.fillRect(0, 0, w, h);
      }

      // invuln hint
      if (invuln > 0 && !dead) {
        ctx.fillStyle = 'rgba(248,250,252,' + (invuln * 0.5) + ')';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Бонус защищает от стен 1 сек', w / 2, 18);
      }
    }

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
      const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
      const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
      const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
    function hex(c) {
      if (typeof c !== 'string' || c[0] !== '#') return null;
      const s = c.slice(1);
      if (s.length === 3) return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    }

    reset();
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); cv.destroy(); }
    };
  });
})();
