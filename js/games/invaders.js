/* ============================================================
   RetroNova — Space Invaders (Пришельцы)
   Классика 1978: 11x5 пришельцев, щиты, НЛО, уровни.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'invaders',
    title: 'Space Invaders',
    emoji: '👾',
    genre: 'arcade',
    year: 1978,
    touch: 'dpad',
    controls: '←→ или A/D — движение · Space — огонь · на тач-экране стрельба авто · Esc — пауза',
    desc: 'Пять рядов пришельцев спускаются к Земле. Уничтожьте всех: четыре разрушаемых щита, бонусный НЛО и всё растущая скорость.',
    goodAt: 1500
  }, function (api) {
    const cv = api.createCanvas({ aspect: 4 / 3 });
    const ctx = cv.ctx;
    const input = api.input;

    const VW = 640, VH = 480;
    const COLS = 11, ROWS = 5, TOTAL = COLS * ROWS;
    const CELL_W = 44, CELL_H = 34;
    const GRID_X = (VW - (COLS - 1) * CELL_W) / 2;
    const GRID_Y = 78;
    const PX = 3;                     // масштаб пикселя спрайта
    const PLAYER_Y = 430;
    const SHIELD_Y = 346, SHIELD_W = 64, SHIELD_H = 44, SCELL = 4;
    const SCOLS = SHIELD_W / SCELL, SROWS = SHIELD_H / SCELL;

    const PCOL = (api.palette && typeof api.palette.head === 'string' && api.palette.head !== 'rainbow')
      ? api.palette.head : '#22C55E';

    /* ---------- спрайты пришельцев: 3 типа x 2 кадра ---------- */
    const PATTERNS = [
      [ // тип 0 — кальмар (верхний ряд, 30 очков)
        [
          '..####..',
          '.######.',
          '########',
          '##.##.##',
          '########',
          '#.####.#',
          '#.#..#.#',
          '##....##'
        ],
        [
          '..####..',
          '.######.',
          '########',
          '##.##.##',
          '########',
          '#.####.#',
          '.#.##.#.',
          '..#..#..'
        ]
      ],
      [ // тип 1 — краб (средние ряды, 20 очков)
        [
          '..#.....#..',
          '...#...#...',
          '..#######..',
          '.##.###.##.',
          '###########',
          '#.#######.#',
          '#.#.....#.#',
          '...##.##...'
        ],
        [
          '..#.....#..',
          '#..#...#..#',
          '..#######..',
          '.##.###.##.',
          '###########',
          '#.#######.#',
          '.#.#####.#.',
          '..##...##..'
        ]
      ],
      [ // тип 2 — осьминог (нижние ряды, 10 очков)
        [
          '....####....',
          '..########..',
          '.##########.',
          '###..##..###',
          '############',
          '.##########.',
          '##.##..##.##',
          '..##....##..'
        ],
        [
          '....####....',
          '..########..',
          '.##########.',
          '###..##..###',
          '############',
          '.##########.',
          '.##.####.##.',
          '..#.####.#..'
        ]
      ]
    ];
    const ALIEN_COLORS = ['#7DF9FF', '#A78BFA', '#34D399'];
    const SPRITES = [];

    function buildSprites() {
      for (let ty = 0; ty < PATTERNS.length; ty++) {
        SPRITES[ty] = [];
        for (let f = 0; f < 2; f++) {
          const pat = PATTERNS[ty][f];
          let pw = 0;
          for (let i = 0; i < pat.length; i++) pw = Math.max(pw, pat[i].length);
          const c = document.createElement('canvas');
          c.width = pw * PX;
          c.height = pat.length * PX;
          const g = c.getContext('2d');
          g.fillStyle = ALIEN_COLORS[ty];
          for (let r = 0; r < pat.length; r++) {
            const row = pat[r];
            for (let i = 0; i < row.length; i++) {
              if (row[i] === '#') g.fillRect(i * PX, r * PX, PX, PX);
            }
          }
          SPRITES[ty][f] = c;
        }
      }
    }
    buildSprites();

    const TYPE_W = [8 * PX, 11 * PX, 12 * PX];  // ширина спрайта по типу
    const TYPE_H = 8 * PX;

    /* ---------- состояние ---------- */
    let aliens, swarmX = 0, swarmY = 0, dirX = 1;
    let bombs = [], shots = [], particles = [], shields = [];
    let ufo = null, ufoTimer = 11;
    let score = 0, lives = 3, level = 1, aliveCount = TOTAL;
    let px = VW / 2, pCool = 0, bombCool = 1.4, invuln = 0;
    let banner = '', bannerT = 0, freezeT = 0, dying = false;
    let ended = false, touchMode = false;
    let t = 0;

    const stars = [];
    for (let i = 0; i < 76; i++) {
      stars.push({ x: Math.random() * VW, y: Math.random() * (VH - 60), s: Math.random() * 1.6 + 0.5, p: Math.random() * 6.28 });
    }

    function makeAliens() {
      const list = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          list.push({
            c: c, r: r, alive: true,
            type: r === 0 ? 0 : (r <= 2 ? 1 : 2),
            pts: r === 0 ? 30 : (r <= 2 ? 20 : 10)
          });
        }
      }
      return list;
    }

    function makeShields() {
      shields = [];
      for (let i = 0; i < 4; i++) {
        const sx = i * (VW / 4) + (VW / 4 - SHIELD_W) / 2;
        const grid = [];
        for (let r = 0; r < SROWS; r++) {
          grid[r] = [];
          for (let c = 0; c < SCOLS; c++) {
            let on = 1;
            if (r < 3 && (c < 3 - r || c >= SCOLS - 3 + r)) on = 0;   // срезанные углы
            const rr = SROWS - 1 - r;                                   // арка снизу
            if (rr < 4 && Math.abs(c - (SCOLS - 1) / 2) <= 3.5 - rr) on = 0;
            grid[r][c] = on;
          }
        }
        shields.push({ x: sx, y: SHIELD_Y, grid: grid });
      }
    }

    function burst(x, y, color, n, power) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (power || 130) * (0.35 + Math.random() * 0.9);
        particles.push({
          x: x, y: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.4, max: 0.8, color: color
        });
      }
    }

    function reset(full) {
      aliens = makeAliens();
      aliveCount = TOTAL;
      swarmX = 0; swarmY = 0; dirX = 1;
      bombs = []; shots = []; particles = [];
      ufo = null; ufoTimer = 10 + Math.random() * 6;
      bombCool = 1.5; pCool = 0;
      px = VW / 2;
      dying = false; invuln = 1.4;
      makeShields();
      if (full) {
        score = 0; lives = 3; level = 1;
        api.setScore(0);
      }
      banner = 'УРОВЕНЬ ' + level;
      bannerT = 1.3;
    }

    /* ---------- вспомогательное ---------- */
    function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax - aw / 2 < bx + bw / 2 && ax + aw / 2 > bx - bw / 2 &&
        ay - ah / 2 < by + bh / 2 && ay + ah / 2 > by - bh / 2;
    }

    function ax(a) { return GRID_X + a.c * CELL_W + swarmX; }
    function ay(a) { return GRID_Y + a.r * CELL_H + swarmY; }

    function hitShield(x, y, big) {
      for (let i = 0; i < shields.length; i++) {
        const sh = shields[i];
        if (x < sh.x || x >= sh.x + SHIELD_W || y < sh.y || y >= sh.y + SHIELD_H) continue;
        const c = Math.floor((x - sh.x) / SCELL);
        const r = Math.floor((y - sh.y) / SCELL);
        if (sh.grid[r] && sh.grid[r][c]) {
          sh.grid[r][c] = 0;
          if (big) { // бомба выгрызает кусок
            for (let k = 0; k < 2; k++) {
              const nc = c + (Math.random() < 0.5 ? -1 : 1);
              const nr = r + (Math.random() < 0.5 ? -1 : 1);
              if (sh.grid[nr] && nc >= 0 && nc < SCOLS) sh.grid[nr][nc] = 0;
            }
          }
          burst(x, y, '#34D399', big ? 5 : 3, 70);
          return true;
        }
      }
      return false;
    }

    function erodeBox(x, y, w, h) {
      for (let i = 0; i < shields.length; i++) {
        const sh = shields[i];
        if (x + w < sh.x || x > sh.x + SHIELD_W) continue;
        if (y + h < sh.y || y > sh.y + SHIELD_H) continue;
        const c0 = Math.max(0, Math.floor((x - sh.x) / SCELL));
        const c1 = Math.min(SCOLS - 1, Math.floor((x + w - sh.x) / SCELL));
        const r0 = Math.max(0, Math.floor((y - sh.y) / SCELL));
        const r1 = Math.min(SROWS - 1, Math.floor((y + h - sh.y) / SCELL));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            if (sh.grid[r][c]) sh.grid[r][c] = 0;
          }
        }
      }
    }

    function hurt() {
      if (invuln > 0 || dying || ended) return;
      lives--;
      dying = true;
      freezeT = 1.0;
      api.sfx('explode');
      burst(px, PLAYER_Y, '#F87171', 34, 200);
    }

    function endGame(reason) {
      if (ended) return;
      ended = true;
      api.gameOver(score, {
        loseTitle: reason || 'Игра окончена',
        message: 'Дошли до уровня ' + level + ' · жизней: ' + Math.max(0, lives),
        icon: '👾'
      });
    }

    function fireBomb() {
      const cols = Object.create(null);
      let best = -1;
      for (let i = 0; i < aliens.length; i++) {
        const a = aliens[i];
        if (!a.alive) continue;
        if (!cols[a.c] || a.r > cols[a.c].r) cols[a.c] = a;
      }
      const list = [];
      for (const k in cols) list.push(cols[k]);
      if (!list.length) return;
      best = list[Math.floor(Math.random() * list.length)];
      bombs.push({
        x: ax(best), y: ay(best) + TYPE_H / 2,
        v: 120 + level * 12 + Math.random() * 40,
        w: Math.random() * 6.28
      });
    }

    /* ---------- обновление ---------- */
    function update(dt) {
      if (ended) return;
      t += dt;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.93; p.vy *= 0.93;
      }

      if (bannerT > 0) { bannerT -= dt; return; }

      if (freezeT > 0) {
        freezeT -= dt;
        if (freezeT <= 0) {
          if (dying) {
            if (lives <= 0) return endGame();
            dying = false;
            px = VW / 2;
            invuln = 1.8;
            bombs = []; shots = [];
          }
        }
        return;
      }

      if (input.touch.left || input.touch.right || input.touch.up || input.touch.down || input.touch.a) {
        touchMode = true;
      }

      /* --- игрок --- */
      invuln = Math.max(0, invuln - dt);
      let mv = 0;
      if (input.down('ArrowLeft') || input.down('a') || input.touch.left) mv -= 1;
      if (input.down('ArrowRight') || input.down('d') || input.touch.right) mv += 1;
      px += mv * 270 * dt;
      if (px < 24) px = 24;
      if (px > VW - 24) px = VW - 24;

      pCool -= dt;
      const wantFire = input.pressed('Space') || input.down('Space') ||
        input.touch.a || input.touchPressed('a') || touchMode;
      if (wantFire && pCool <= 0 && shots.length < 2) {
        shots.push({ x: px, y: PLAYER_Y - 18 });
        pCool = 0.3;
        api.sfx('click');
      }

      /* --- движение флота --- */
      let cmin = 99, cmax = -1, rmax = -1;
      for (let i = 0; i < aliens.length; i++) {
        const a = aliens[i];
        if (!a.alive) continue;
        if (a.c < cmin) cmin = a.c;
        if (a.c > cmax) cmax = a.c;
        if (a.r > rmax) rmax = a.r;
      }
      const speed = (30 + (level - 1) * 7) * (1 + 2.0 * (1 - aliveCount / TOTAL));
      swarmX += dirX * speed * dt;

      const left = GRID_X + cmin * CELL_W + swarmX - TYPE_W[1] / 2;
      const right = GRID_X + cmax * CELL_W + swarmX + TYPE_W[1] / 2;
      if (left < 8 && dirX < 0) { dirX = 1; swarmY += 18; api.sfx('bounce'); }
      else if (right > VW - 8 && dirX > 0) { dirX = -1; swarmY += 18; api.sfx('bounce'); }

      /* пришельцы грызут щиты и доходят до низа */
      for (let i = 0; i < aliens.length; i++) {
        const a = aliens[i];
        if (!a.alive) continue;
        const x = ax(a), y = ay(a);
        const w = TYPE_W[a.type], h = TYPE_H;
        if (y + h / 2 > SHIELD_Y && y - h / 2 < SHIELD_Y + SHIELD_H) {
          erodeBox(x - w / 2, y - h / 2, w, h);
        }
        if (y + h / 2 >= PLAYER_Y - 16) return endGame('Захват Земли');
        if (rectHit(x, y, w, h, px, PLAYER_Y, 34, 18)) return endGame('Захват Земли');
      }

      /* --- бомбы врагов --- */
      bombCool -= dt;
      const maxBombs = Math.min(5, 2 + Math.floor(level / 2));
      if (bombCool <= 0 && aliveCount > 0 && bombs.length < maxBombs) {
        fireBomb();
        bombCool = Math.max(0.35, 1.15 - level * 0.06 - (TOTAL - aliveCount) * 0.013) * (0.7 + Math.random() * 0.9);
      }
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i];
        b.y += b.v * dt;
        b.x += Math.sin(t * 7 + b.w) * 14 * dt;
        if (hitShield(b.x, b.y, true)) { bombs.splice(i, 1); continue; }
        if (invuln <= 0 && rectHit(b.x, b.y, 5, 14, px, PLAYER_Y, 34, 18)) {
          bombs.splice(i, 1);
          hurt();
          continue;
        }
        if (b.y > VH - 8) bombs.splice(i, 1);
      }

      /* --- снаряды игрока --- */
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.y -= 470 * dt;
        if (s.y < 12) { shots.splice(i, 1); continue; }
        if (hitShield(s.x, s.y, false)) { shots.splice(i, 1); continue; }
        let done = false;
        for (let j = 0; j < aliens.length; j++) {
          const a = aliens[j];
          if (!a.alive) continue;
          const x = ax(a), y = ay(a);
          if (rectHit(s.x, s.y, 4, 12, x, y, TYPE_W[a.type] - 6, TYPE_H - 6)) {
            a.alive = false;
            aliveCount--;
            score += a.pts;
            api.setScore(score);
            api.sfx('explode');
            burst(x, y, ALIEN_COLORS[a.type], 14, 150);
            done = true;
            break;
          }
        }
        if (done) { shots.splice(i, 1); continue; }
        if (ufo && rectHit(s.x, s.y, 4, 12, ufo.x, ufo.y, 34, 14)) {
          score += ufo.pts;
          api.setScore(score);
          api.sfx('coin');
          burst(ufo.x, ufo.y, '#F472B6', 22, 190);
          ufo = null;
          ufoTimer = 12 + Math.random() * 8;
          shots.splice(i, 1);
          continue;
        }
      }

      /* --- НЛО --- */
      if (!ufo && aliveCount > 0) {
        ufoTimer -= dt;
        if (ufoTimer <= 0) {
          const fromLeft = Math.random() < 0.5;
          ufo = { x: fromLeft ? -30 : VW + 30, y: 38, vx: fromLeft ? 100 : -100, pts: [50, 100, 150][Math.floor(Math.random() * 3)] };
        }
      }
      if (ufo) {
        ufo.x += ufo.vx * dt;
        if (ufo.x < -40 || ufo.x > VW + 40) {
          ufo = null;
          ufoTimer = 11 + Math.random() * 8;
        }
      }

      /* --- уровень пройден --- */
      if (aliveCount <= 0) {
        level++;
        api.sfx('success');
        aliens = makeAliens();
        aliveCount = TOTAL;
        swarmX = 0; swarmY = 0; dirX = 1;
        bombs = []; shots = [];
        ufo = null; ufoTimer = 9 + Math.random() * 5;
        bombCool = 1.6;
        invuln = 1.0;
        makeShields();
        banner = 'УРОВЕНЬ ' + level;
        bannerT = 1.5;
      }
    }

    /* ---------- отрисовка ---------- */
    function draw(dt, now) {
      const s = cv.w / VW;
      ctx.save();
      ctx.scale(s, s);

      /* фон + звёзды */
      ctx.fillStyle = '#05070F';
      ctx.fillRect(0, 0, VW, VH);
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(now * 1.3 + st.p));
        ctx.fillStyle = '#9BD6FF';
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      ctx.globalAlpha = 1;

      /* линия земли */
      ctx.fillStyle = '#111A2E';
      ctx.fillRect(0, PLAYER_Y + 14, VW, 2);
      ctx.fillStyle = '#0E1526';
      ctx.fillRect(0, PLAYER_Y + 16, VW, VH - PLAYER_Y - 16);

      /* щиты */
      ctx.fillStyle = '#34D399';
      for (let i = 0; i < shields.length; i++) {
        const sh = shields[i];
        for (let r = 0; r < SROWS; r++) {
          for (let c = 0; c < SCOLS; c++) {
            if (sh.grid[r][c]) ctx.fillRect(sh.x + c * SCELL, sh.y + r * SCELL, SCELL, SCELL);
          }
        }
      }

      /* НЛО */
      if (ufo) {
        ctx.save();
        ctx.shadowColor = '#F472B6';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#F472B6';
        ctx.beginPath();
        ctx.ellipse(ufo.x, ufo.y + 2, 17, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ufo.x, ufo.y, 8, Math.PI, 0);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#FCE7F3';
        ctx.fillRect(ufo.x - 8, ufo.y + 1, 4, 3);
        ctx.fillRect(ufo.x + 4, ufo.y + 1, 4, 3);
      }

      /* пришельцы */
      const frame = Math.floor(now * 2.4) % 2;
      for (let i = 0; i < aliens.length; i++) {
        const a = aliens[i];
        if (!a.alive) continue;
        const sp = SPRITES[a.type][frame];
        ctx.drawImage(sp, ax(a) - sp.width / 2, ay(a) - sp.height / 2);
      }

      /* бомбы */
      ctx.strokeStyle = '#FCA5A5';
      ctx.lineWidth = 2;
      for (let i = 0; i < bombs.length; i++) {
        const b = bombs[i];
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - 7);
        ctx.lineTo(b.x + 2.5, b.y - 2.5);
        ctx.lineTo(b.x - 2.5, b.y + 2);
        ctx.lineTo(b.x, b.y + 7);
        ctx.stroke();
      }

      /* снаряды игрока */
      ctx.fillStyle = '#FDE68A';
      for (let i = 0; i < shots.length; i++) {
        const s2 = shots[i];
        ctx.save();
        ctx.shadowColor = '#FDE68A';
        ctx.shadowBlur = 10;
        ctx.fillRect(s2.x - 1.5, s2.y - 7, 3, 14);
        ctx.restore();
      }

      /* корабль игрока */
      if (!dying && !(invuln > 0 && Math.floor(now * 14) % 2 === 0)) {
        ctx.fillStyle = PCOL;
        ctx.fillRect(px - 3, PLAYER_Y - 22, 6, 16);   // ствол
        ctx.fillRect(px - 17, PLAYER_Y - 8, 34, 12);  // корпус
        ctx.fillRect(px - 12, PLAYER_Y - 13, 24, 6);
        ctx.fillStyle = '#0B1220';
        ctx.fillRect(px - 13, PLAYER_Y - 4, 5, 5);
        ctx.fillRect(px + 8, PLAYER_Y - 4, 5, 5);
        ctx.fillStyle = PCOL;
        ctx.fillRect(px - 21, PLAYER_Y + 2, 42, 5);
      }

      /* частицы */
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      /* нижний HUD */
      ctx.fillStyle = '#64748B';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ЖИЗНИ', 16, VH - 14);
      for (let i = 0; i < Math.max(0, lives); i++) {
        const lx = 74 + i * 26, ly = VH - 22;
        ctx.fillStyle = PCOL;
        ctx.fillRect(lx - 2, ly - 7, 4, 7);
        ctx.fillRect(lx - 8, ly - 2, 16, 5);
      }
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'right';
      ctx.fillText('УРОВЕНЬ ' + level, VW - 16, VH - 14);
      if (touchMode) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#334155';
        ctx.fillText('авто-огонь', VW / 2, VH - 14);
      }

      /* баннер уровня */
      if (bannerT > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, bannerT * 1.6));
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '700 34px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#7DF9FF';
        ctx.shadowBlur = 20;
        ctx.fillText(banner, VW / 2, VH / 2);
        ctx.restore();
      }

      ctx.restore();
    }

    reset(true);
    const loop = api.loop(update, draw);

    return {
      destroy() {
        loop.stop();
        cv.destroy();
      }
    };
  });
})();
