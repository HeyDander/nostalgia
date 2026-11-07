/* ============================================================
   RetroNova — Galaga
   Волны врагов: вход по V-траектории, формация, атаки дайвингом.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'galaga',
    title: 'Galaga',
    emoji: '🛸',
    genre: 'arcade',
    year: 1981,
    touch: 'both',
    controls: '←→ или A/D — движение · Space — огонь · Shift/B — спецзалп (сбивает пули) · Esc — пауза',
    desc: 'Враги влетают по V-траекториями, строят формацию и атакуют дайвингом. Серия точных попаданий даёт бонус к очкам.',
    goodAt: 1200
  }, function (api) {
    const cv = api.createCanvas({ aspect: 4 / 3 });
    const ctx = cv.ctx;
    const input = api.input;

    const VW = 640, VH = 480;
    const PX = 3;
    const PLAYER_Y = 434;
    const PCOL = (api.palette && typeof api.palette.head === 'string' && api.palette.head !== 'rainbow')
      ? api.palette.head : '#22C55E';

    /* ---------- спрайты врагов: 3 типа x 2 кадра ---------- */
    const PATTERNS = [
      [ // тип 0 — пчела (50)
        [
          '..#.....#..',
          '..#######..',
          '.#########.',
          '##.#####.##',
          '###########',
          '#.#######.#',
          '#.#.....#.#',
          '..##...##..'
        ],
        [
          '..#.....#..',
          '..#######..',
          '.#########.',
          '##.#####.##',
          '###########',
          '#.#######.#',
          '..#.....#..',
          '.#.......#.'
        ]
      ],
      [ // тип 1 — бабочка (80)
        [
          '.#..####..#.',
          '..########..',
          '.##########.',
          '############',
          '####.##.####',
          '.#.######.#.',
          '..#.####.#..',
          '...#.##.#...'
        ],
        [
          '#..#..#..#..',
          '..########..',
          '.##########.',
          '############',
          '####.##.####',
          '.#.######.#.',
          '.#..####..#.',
          '..#......#..'
        ]
      ],
      [ // тип 2 — босс (100)
        [
          '..######..',
          '.########.',
          '##########',
          '###.##.###',
          '##########',
          '.#.####.#.',
          '..#.##.#..',
          '...#..#...'
        ],
        [
          '..######..',
          '.########.',
          '##########',
          '###.##.###',
          '##########',
          '#.######.#',
          '.#.####.#.',
          '#..#..#..#'
        ]
      ]
    ];
    const ENEMY_COLORS = ['#FBBF24', '#F472B6', '#60A5FA'];
    const ENEMY_PTS = [50, 80, 100];
    const TYPE_W = [11 * PX, 12 * PX, 10 * PX];
    const TYPE_H = 8 * PX;
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
          g.fillStyle = ENEMY_COLORS[ty];
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

    /* ---------- состояние ---------- */
    let enemies = [], pShots = [], eShots = [], particles = [], floats = [];
    let px = VW / 2, pCool = 0, invuln = 0, dying = false, freezeT = 0;
    let score = 0, lives = 3, wave = 1, ended = false;
    let spawnIdx = 0, spawnT = 0, attackT = 2.5, shotT = 3;
    let streak = 0, spCool = 0;
    let banner = '', bannerT = 0, t = 0;

    const stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({ x: Math.random() * VW, y: Math.random() * VH, s: Math.random() * 1.7 + 0.4, v: 6 + Math.random() * 22, p: Math.random() * 6.28 });
    }

    function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax - aw / 2 < bx + bw / 2 && ax + aw / 2 > bx - bw / 2 &&
        ay - ah / 2 < by + bh / 2 && ay + ah / 2 > by - bh / 2;
    }

    function burst(x, y, color, n, power) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (power || 150) * (0.35 + Math.random() * 0.9);
        particles.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.35 + Math.random() * 0.4, max: 0.75, color: color
        });
      }
    }

    function float(x, y, text, color) {
      floats.push({ x: x, y: y, text: text, color: color, life: 0.9 });
    }

    /* ---------- формация ---------- */
    function slotList(count) {
      const list = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
          const x = 130 + col * 54;
          const y = 64 + row * 34 + (3.5 - Math.abs(col - 3.5)) * 7; // V-форма
          list.push({ x: x, y: y, row: row, type: row === 0 ? 2 : (row === 1 ? 1 : 0) });
        }
      }
      // заполняем снизу вверх, от центра к краям
      list.sort((a, b) => (b.row - a.row) || (Math.abs(a.x - 320) - Math.abs(b.x - 320)));
      return list.slice(0, count);
    }

    function entryPath(e) {
      const side = e.slot.x < VW / 2 ? -1 : 1;
      const sx = side < 0 ? 46 + Math.random() * 60 : VW - 46 - Math.random() * 60;
      return [
        { x: sx, y: -26 },
        { x: sx + side * 66, y: 160 },
        { x: e.slot.x - side * 96, y: 316 },
        { x: e.slot.x, y: e.slot.y + 46 },
        { x: e.slot.x, y: e.slot.y }
      ];
    }

    function divePath(e) {
      const side = e.slot.x < VW / 2 ? 1 : -1;
      return [
        { x: e.slot.x + side * 54, y: e.slot.y + 74 },
        { x: px + side * 70, y: 246 },
        { x: px, y: PLAYER_Y - 34 },
        { x: px - side * 96, y: VH + 44 }
      ];
    }

    function spawnWave() {
      const count = Math.min(6 + (wave - 1) * 3, 24);
      const slots = slotList(count);
      enemies = slots.map(function (s) {
        return {
          slot: { x: s.x, y: s.y }, type: s.type,
          state: 'wait', path: null, seg: 0, x: s.x, y: -40,
          ang: 0, fireT: 1 + Math.random() * 2, bob: Math.random() * 6.28
        };
      });
      spawnIdx = 0; spawnT = 0.4;
      attackT = 3 + Math.random() * 2;
      shotT = 2.6;
      pShots = []; eShots = [];
      banner = 'ВОЛНА ' + wave;
      bannerT = 1.4;
    }

    function startRun() {
      score = 0; lives = 3; wave = 1;
      px = VW / 2; invuln = 1.5; dying = false;
      streak = 0; spCool = 0; pCool = 0;
      particles = []; floats = [];
      api.setScore(0);
      spawnWave();
    }

    /* ---------- ввод / стрельба ---------- */
    function firePlayer() {
      if (pShots.length >= 3 || pCool > 0) return;
      pShots.push({ x: px, y: PLAYER_Y - 20 });
      pCool = 0.26;
      api.sfx('click');
    }

    function fireSpecial() {
      if (spCool > 0) return;
      spCool = 8;
      api.sfx('power');
      if (eShots.length) {
        for (let i = 0; i < eShots.length; i++) burst(eShots[i].x, eShots[i].y, '#7DF9FF', 4, 90);
        score += eShots.length * 5;
        api.setScore(score);
      }
      eShots = [];
      burst(px, PLAYER_Y, '#7DF9FF', 20, 240);
    }

    function fireEnemy(e) {
      const dx = px - e.x, dy = PLAYER_Y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 175 + wave * 12;
      eShots.push({ x: e.x, y: e.y, vx: dx / d * sp, vy: dy / d * sp });
      api.sfx('type');
    }

    function hurt() {
      if (invuln > 0 || dying || ended) return;
      lives--;
      dying = true;
      freezeT = 0.9;
      api.sfx('explode');
      burst(px, PLAYER_Y, '#F87171', 34, 220);
    }

    function endGame() {
      if (ended) return;
      ended = true;
      api.gameOver(score, {
        loseTitle: 'Игра окончена',
        message: 'Волна ' + wave + ' · серия попаданий: ' + streak,
        icon: '🛸'
      });
    }

    /* ---------- обновление ---------- */
    function follow(e, dt) {
      let remain = e.speed * dt;
      let mvx = 0, mvy = 0;
      while (remain > 0 && e.seg < e.path.length) {
        const tg = e.path[e.seg];
        const dx = tg.x - e.x, dy = tg.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.001) { e.seg++; continue; }
        mvx = dx / d; mvy = dy / d;
        if (d <= remain) {
          e.x = tg.x; e.y = tg.y; e.seg++; remain -= d;
        } else {
          e.x += mvx * remain; e.y += mvy * remain; remain = 0;
        }
      }
      if (mvx || mvy) e.ang = Math.atan2(mvy, mvx);
      if (e.seg >= e.path.length) {
        if (e.state === 'dive') {           // ушёл за низ — возвращается сверху
          e.state = 'enter';
          e.path = entryPath(e);
          e.speed = 320;
          e.seg = 0;
        } else {                             // дошёл до слота
          e.state = 'form';
          e.x = e.slot.x; e.y = e.slot.y;
          e.path = null;
        }
      }
    }

    function update(dt) {
      if (ended) return;
      t += dt;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.94; p.vy *= 0.94;
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt; f.y -= 34 * dt;
        if (f.life <= 0) floats.splice(i, 1);
      }
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        st.y += st.v * dt * 0.35;
        if (st.y > VH) { st.y = -2; st.x = Math.random() * VW; }
      }

      if (bannerT > 0) { bannerT -= dt; return; }

      if (freezeT > 0) {
        freezeT -= dt;
        if (freezeT <= 0) {
          if (dying) {
            if (lives <= 0) return endGame();
            dying = false;
            px = VW / 2;
            invuln = 2;
            eShots = [];
            streak = 0;
          }
        }
        return;
      }

      /* --- игрок --- */
      invuln = Math.max(0, invuln - dt);
      pCool = Math.max(0, pCool - dt);
      spCool = Math.max(0, spCool - dt);

      let mv = 0;
      if (input.down('ArrowLeft') || input.down('a') || input.touch.left) mv -= 1;
      if (input.down('ArrowRight') || input.down('d') || input.touch.right) mv += 1;
      px += mv * 260 * dt;
      if (px < 26) px = 26;
      if (px > VW - 26) px = VW - 26;

      if (input.pressed('Space') || input.down('Space') || input.touch.a || input.touchPressed('a')) firePlayer();
      if (input.pressed('Shift') || input.pressed('Enter') || input.touch.b || input.touchPressed('b')) fireSpecial();

      /* --- появление волны --- */
      if (spawnIdx < enemies.length) {
        spawnT -= dt;
        if (spawnT <= 0) {
          const e = enemies[spawnIdx];
          e.state = 'enter';
          e.path = entryPath(e);
          e.speed = 300;
          e.seg = 0;
          spawnIdx++;
          spawnT = 0.34;
        }
      }

      /* --- движение врагов --- */
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.state === 'wait') continue;
        if (e.state === 'enter' || e.state === 'dive') follow(e, dt);
        else if (e.state === 'form') {
          e.x = e.slot.x;
          e.y = e.slot.y + Math.sin(t * 3 + e.bob) * 1.6;
        }

        /* столкновение с игроком */
        if (!dying && invuln <= 0 && rectHit(e.x, e.y, TYPE_W[e.type] - 8, TYPE_H - 8, px, PLAYER_Y, 34, 24)) {
          burst(e.x, e.y, ENEMY_COLORS[e.type], 18, 190);
          enemies.splice(i, 1);
          i--;
          hurt();
          continue;
        }

        /* стрельба */
        if (e.state === 'form' && spawnIdx >= enemies.length) {
          e.fireT -= dt;
          if (e.fireT <= 0) {
            e.fireT = Math.max(0.8, 3.2 - wave * 0.2) + Math.random() * 2;
            if (eShots.length < 5 + wave) fireEnemy(e);
          }
        } else if (e.state === 'dive') {
          e.fireT -= dt;
          if (e.fireT <= 0) {
            e.fireT = 0.55 + Math.random() * 0.5;
            if (eShots.length < 6 + wave) fireEnemy(e);
          }
        }
      }

      /* --- атаки дайвингом --- */
      attackT -= dt;
      if (attackT <= 0 && spawnIdx >= enemies.length) {
        const formers = enemies.filter(e => e.state === 'form');
        if (formers.length) {
          const e = formers[Math.floor(Math.random() * formers.length)];
          e.state = 'dive';
          e.path = divePath(e);
          e.speed = 330;
          e.seg = 0;
          e.fireT = 0.5;
          api.sfx('select');
        }
        attackT = Math.max(1.1, 3.6 - wave * 0.25) * (0.7 + Math.random() * 0.8);
      }

      /* --- снаряды игрока --- */
      for (let i = pShots.length - 1; i >= 0; i--) {
        const s = pShots[i];
        s.y -= 520 * dt;
        if (s.y < 8) { // промах — серия обнуляется
          if (streak > 0) streak = 0;
          pShots.splice(i, 1);
          continue;
        }
        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (e.state === 'wait') continue;
          if (rectHit(s.x, s.y, 4, 12, e.x, e.y, TYPE_W[e.type] - 8, TYPE_H - 8)) {
            burst(e.x, e.y, ENEMY_COLORS[e.type], 16, 180);
            enemies.splice(j, 1);
            streak++;
            const base = ENEMY_PTS[e.type];
            const bonus = streak >= 5 ? Math.min(150, (streak - 4) * 10) : 0;
            score += base + bonus;
            api.setScore(score);
            api.sfx(bonus > 0 ? 'coin' : 'explode');
            if (bonus > 0) float(e.x, e.y, '+' + base + '  СЕРИЯ +' + bonus, '#FDE68A');
            else float(e.x, e.y, '+' + base, ENEMY_COLORS[e.type]);
            hit = true;
            break;
          }
        }
        if (hit) pShots.splice(i, 1);
      }

      /* --- снаряды врагов --- */
      for (let i = eShots.length - 1; i >= 0; i--) {
        const s = eShots[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.y > VH + 10 || s.x < -10 || s.x > VW + 10) { eShots.splice(i, 1); continue; }
        if (!dying && invuln <= 0 && rectHit(s.x, s.y, 6, 10, px, PLAYER_Y, 34, 24)) {
          eShots.splice(i, 1);
          hurt();
        }
      }

      /* --- волна пройдена --- */
      if (enemies.length === 0) {
        wave++;
        api.sfx('win');
        px = VW / 2;
        invuln = 1.4;
        spawnWave();
      }
    }

    /* ---------- отрисовка ---------- */
    function drawShip(x, y) {
      ctx.fillStyle = PCOL;
      ctx.beginPath();
      ctx.moveTo(x, y - 19);
      ctx.lineTo(x + 7, y - 4);
      ctx.lineTo(x - 7, y - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - 18, y - 5, 36, 8);
      ctx.fillRect(x - 12, y + 3, 24, 7);
      ctx.fillRect(x - 18, y + 3, 6, 9);
      ctx.fillRect(x + 12, y + 3, 6, 9);
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(x - 3, y - 9, 6, 8);
    }

    function draw(dt, now) {
      const s = cv.w / VW;
      ctx.save();
      ctx.scale(s, s);

      /* фон */
      ctx.fillStyle = '#060312';
      ctx.fillRect(0, 0, VW, VH);
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        ctx.globalAlpha = 0.3 + 0.55 * Math.abs(Math.sin(now * 1.6 + st.p));
        ctx.fillStyle = i % 5 === 0 ? '#FDE68A' : '#C7D2FE';
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      ctx.globalAlpha = 1;

      /* снаряды врагов */
      for (let i = 0; i < eShots.length; i++) {
        const b = eShots[i];
        ctx.strokeStyle = 'rgba(251,113,133,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.05, b.y - b.vy * 0.05);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = '#FB7185';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }

      /* враги */
      const frame = Math.floor(now * 4) % 2;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.state === 'wait') continue;
        const sp = SPRITES[e.type][frame];
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.state === 'dive' || e.state === 'enter') ctx.rotate(e.ang + Math.PI / 2);
        ctx.drawImage(sp, -sp.width / 2, -sp.height / 2);
        ctx.restore();
      }

      /* снаряды игрока */
      ctx.fillStyle = '#FDE68A';
      for (let i = 0; i < pShots.length; i++) {
        const b = pShots[i];
        ctx.save();
        ctx.shadowColor = '#FDE68A';
        ctx.shadowBlur = 10;
        ctx.fillRect(b.x - 1.5, b.y - 7, 3, 14);
        ctx.restore();
      }

      /* игрок */
      if (!dying && !(invuln > 0 && Math.floor(now * 12) % 2 === 0)) drawShip(px, PLAYER_Y);

      /* частицы */
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      /* всплывающие очки */
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i < floats.length; i++) {
        const f = floats[i];
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;

      /* нижний HUD */
      ctx.fillStyle = '#64748B';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ЖИЗНИ', 16, VH - 14);
      for (let i = 0; i < Math.max(0, lives); i++) {
        const lx = 76 + i * 26, ly = VH - 24;
        ctx.fillStyle = PCOL;
        ctx.beginPath();
        ctx.moveTo(lx, ly - 8);
        ctx.lineTo(lx + 5, ly + 4);
        ctx.lineTo(lx - 5, ly + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748B';
      ctx.fillText('ВОЛНА ' + wave, VW - 16, VH - 14);

      /* полоса спецзалпа */
      const bw = 96, bx = VW - 16 - bw, by = VH - 34;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = spCool > 0 ? '#475569' : '#7DF9FF';
      ctx.fillRect(bx, by, bw * (1 - spCool / 8), 6);
      ctx.fillStyle = spCool > 0 ? '#475569' : '#7DF9FF';
      ctx.textAlign = 'right';
      ctx.fillText(spCool > 0 ? 'СПЕЦ ' + Math.ceil(spCool) + 'с' : 'СПЕЦ ГОТОВ', VW - 16, by - 5);

      /* серия */
      if (streak >= 5) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FDE68A';
        ctx.font = '700 14px "JetBrains Mono", monospace';
        ctx.fillText('СЕРИЯ ×' + streak, 16, 30);
      }

      /* баннер */
      if (bannerT > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, bannerT * 1.6));
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '700 34px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#F472B6';
        ctx.shadowBlur = 20;
        ctx.fillText(banner, VW / 2, VH / 2);
        ctx.restore();
      }

      ctx.restore();
    }

    startRun();
    const loop = api.loop(update, draw);

    return {
      destroy() {
        loop.stop();
        cv.destroy();
      }
    };
  });
})();
