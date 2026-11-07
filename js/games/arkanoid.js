/* ============================================================
   RetroNova — Arkanoid (Арканоид)
   12 детерминированных раскладок, бонусы, стальные блоки.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'arkanoid',
    title: 'Арканоид',
    emoji: '🎯',
    genre: 'action',
    year: 1986,
    touch: 'dpad',
    controls: 'Мышь или ←/→ — ракетка · Пробел / клик — запуск · Esc — пауза',
    desc: 'Двенадцать разных раскладок, падающие бонусы и стальные блоки. Жизней три, пройдите все уровни.',
    goodAt: 3000
  }, function (api) {
    const cv = api.createCanvas({ aspect: 16 / 10 });
    const ctx = cv.ctx;
    const input = api.input;

    const MAX_LEVEL = 12;
    const ROW_COLORS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#38BDF8', '#A78BFA', '#F472B6'];

    /* ---------- детерминированный ГПСЧ ---------- */
    function mulberry32(a) {
      return function () {
        a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    /* ---------- 12 раскладок ---------- */
    function pFull(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) { const row = []; for (let x = 0; x < c; x++) row.push(y === 0 ? 2 : 1); g.push(row); }
      return g;
    }
    function pChecker(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) { const row = []; for (let x = 0; x < c; x++) row.push((x + y) % 2 === 0 ? 1 : 0); g.push(row); }
      return g;
    }
    function pPyramid(rng, c, r) {
      const half = Math.floor((c - 1) / 2), g = [];
      for (let y = 0; y < r; y++) {
        const row = [];
        const span = Math.floor(y * half / Math.max(1, r - 1));
        for (let x = 0; x < c; x++) row.push(Math.abs(x - half) <= span ? 1 : 0);
        g.push(row);
      }
      return g;
    }
    function pColumns(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) { const row = []; for (let x = 0; x < c; x++) row.push(x % 3 !== 1 ? 1 : 0); g.push(row); }
      return g;
    }
    function pDiamond(rng, c, r) {
      const mid = Math.floor((c - 1) / 2), midR = Math.floor((r - 1) / 2), g = [];
      for (let y = 0; y < r; y++) {
        const row = [];
        for (let x = 0; x < c; x++) row.push(Math.abs(x - mid) + Math.abs(y - midR) <= mid ? 1 : 0);
        g.push(row);
      }
      return g;
    }
    function pWaves(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) { const row = []; for (let x = 0; x < c; x++) row.push((x + y * 2) % 4 < 2 ? 1 : 0); g.push(row); }
      return g;
    }
    function pFortress(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) {
        const row = [];
        for (let x = 0; x < c; x++) {
          if (y === 0 || y === r - 1 || x === 0 || x === c - 1) row.push(2);
          else row.push(rng() < 0.3 ? 1 : 0);
        }
        g.push(row);
      }
      return g;
    }
    function pRandom(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) {
        const row = [];
        for (let x = 0; x < c; x++) row.push(rng() < 0.7 ? (rng() < 0.3 ? 2 : 1) : 0);
        g.push(row);
      }
      return g;
    }
    function pZigzag(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) { const row = []; for (let x = 0; x < c; x++) row.push((x + y * 3) % 5 < 3 ? 1 : 0); g.push(row); }
      return g;
    }
    function pArches(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) { const row = []; for (let x = 0; x < c; x++) row.push(y % 2 === 0 || x % 2 === 0 ? 1 : 0); g.push(row); }
      return g;
    }
    function pHive(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) {
        const row = [];
        for (let x = 0; x < c; x++) row.push(y === 0 ? 2 : ((y % 2 === 0 ? x % 2 === 0 : x % 2 === 1) ? 1 : 0));
        g.push(row);
      }
      return g;
    }
    function pLanes(rng, c, r) {
      const g = [];
      for (let y = 0; y < r; y++) { const row = []; for (let x = 0; x < c; x++) row.push(y % 2 === 0 ? 1 : (x % 3 === 0 ? 2 : 0)); g.push(row); }
      return g;
    }
    const PATTERNS = [pFull, pChecker, pPyramid, pColumns, pDiamond, pWaves,
      pFortress, pRandom, pZigzag, pArches, pHive, pLanes];

    /* ---------- state ---------- */
    let bricks, balls, bonuses, particles;
    let paddle, wideT, slowT;
    let lives, level, score, over, launchT;
    let ptrX, flash;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function baseW() { return Math.max(70, cv.w * 0.13); }
    function paddleW() { return wideT > 0 ? Math.min(cv.w * 0.3, baseW() * 1.7) : baseW(); }
    function ballR() { return Math.max(6, cv.h * 0.018); }
    function baseSpeed() { return cv.h * 0.7 + (level - 1) * cv.h * 0.03; }
    function maxSpeed() { return cv.h * 1.9; }

    function buildLevel() {
      const cols = 12, rows = 7;
      const rng = mulberry32(0x9E3779B9 ^ (level * 2654435761));
      const pat = PATTERNS[(level - 1) % PATTERNS.length];
      const grid = pat(rng, cols, rows);
      const w = cv.w, h = cv.h;
      const margin = w * 0.05;
      const top = h * 0.08;
      const bw = (w - margin * 2) / cols;
      const bh = Math.min(20, h * 0.05);
      const steelChance = Math.min(0.14, 0.05 + level * 0.006);

      bricks = [];
      let breakable = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let v = grid[y][x];
          if (!v) continue;
          if (v !== 9 && y < rows - 1 && rng() < steelChance) v = 9;
          const steel = v === 9;
          if (!steel) breakable++;
          bricks.push({
            x: margin + x * bw,
            y: top + y * bh,
            w: bw - 4,
            h: bh - 4,
            hp: steel ? 0 : v,
            maxHp: steel ? 0 : v,
            steel: steel,
            color: ROW_COLORS[y % ROW_COLORS.length],
            alive: true
          });
        }
      }
      /* страховка: раскладка обязана содержать разрушаемые блоки */
      if (breakable < 12) {
        bricks.forEach(b => { if (b.steel) { b.steel = false; b.hp = 1; b.maxHp = 1; } });
      }
    }

    function resetBallOnPaddle() {
      const pw = paddleW();
      const r = ballR();
      balls = [{
        x: paddle.x + pw / 2,
        y: paddle.y - r - 3,
        vx: 0, vy: 0,
        r: r,
        sp: baseSpeed()
      }];
      launchT = 0;
      wideT = 0;
      slowT = 0;
      bonuses = [];
    }

    function launch() {
      const ang = -Math.PI / 2 + (Math.random() * 0.7 - 0.35);
      balls.forEach(b => {
        b.vx = Math.cos(ang) * b.sp;
        b.vy = Math.sin(ang) * b.sp;
      });
      api.sfx('select');
    }

    function normalize(b) {
      const cur = Math.hypot(b.vx, b.vy);
      if (cur > 0) { b.vx = b.vx / cur * b.sp; b.vy = b.vy / cur * b.sp; }
    }

    function reset() {
      paddle = { x: cv.w / 2 - baseW() / 2 };
      balls = [];
      bonuses = [];
      particles = [];
      lives = 3;
      level = 1;
      score = 0;
      over = false;
      ptrX = null;
      wideT = 0;
      slowT = 0;
      flash = 0;
      api.setScore(0);
      buildLevel();
      resetBallOnPaddle();
    }

    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          life: 0.45, max: 0.45, color: color
        });
      }
    }

    function spawnBonus(b) {
      const roll = Math.random();
      const type = roll < 0.34 ? 'wide' : (roll < 0.62 ? 'slow' : (roll < 0.85 ? 'multi' : 'life'));
      bonuses.push({
        x: b.x + b.w / 2 - 14,
        y: b.y,
        w: 28, h: 14,
        type: type,
        vy: cv.h * 0.3
      });
    }

    function applyBonus(t) {
      if (t === 'wide') { wideT = 10; api.sfx('power'); }
      else if (t === 'slow') {
        if (slowT <= 0) {
          slowT = 8;
          balls.forEach(b => { b.sp = Math.max(b.sp * 0.6, cv.h * 0.4); normalize(b); });
        }
        api.sfx('power');
      } else if (t === 'multi') {
        if (balls.length < 6 && balls[0].vx !== 0) {
          const src = balls[Math.floor(Math.random() * balls.length)];
          const ang = Math.atan2(src.vy, src.vx);
          [-0.55, 0.55].forEach(da => {
            balls.push({
              x: src.x, y: src.y,
              vx: Math.cos(ang + da) * src.sp,
              vy: Math.sin(ang + da) * src.sp,
              r: src.r, sp: src.sp
            });
          });
        }
        api.sfx('achievement');
      } else if (t === 'life') {
        lives = Math.min(5, lives + 1);
        api.sfx('coin');
      }
    }

    /* ---------- input ---------- */
    function movePaddle(dt) {
      const w = cv.w, pw = paddleW();
      const left = input.down('ArrowLeft') || input.down('a') || input.touch.left;
      const right = input.down('ArrowRight') || input.down('d') || input.touch.right;
      const ps = w * 0.85;
      if (left !== right) {
        ptrX = null;
        paddle.x += (right ? ps : -ps) * dt;
      } else if (ptrX !== null) {
        paddle.x += (ptrX - pw / 2 - paddle.x) * Math.min(1, dt * 20);
      }
      paddle.x = clamp(paddle.x, 6, w - pw - 6);

      const resting = balls.every(b => b.vx === 0 && b.vy === 0);
      if (resting) {
        balls.forEach(b => {
          b.x = paddle.x + pw / 2;
          b.y = paddle.y - b.r - 3;
        });
        launchT += dt;
        if (input.pressed('Space') || input.pressed('Enter') || launchT > 1.5) launch();
      }
    }

    /* ---------- physics ---------- */
    function stepBalls(dt) {
      const w = cv.w, h = cv.h;
      const groundY = h;
      const pw = paddleW();

      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); api.sfx('bounce'); }
        if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx); api.sfx('bounce'); }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); api.sfx('bounce'); }

        /* ракетка */
        if (b.vy > 0 && b.y + b.r >= paddle.y && b.y - b.r <= paddle.y + 12 &&
          b.x + b.r >= paddle.x && b.x - b.r <= paddle.x + pw) {
          const rel = clamp((b.x - (paddle.x + pw / 2)) / (pw / 2), -1, 1);
          const ang = -Math.PI / 2 + rel * 1.05;
          b.vx = Math.cos(ang) * b.sp;
          b.vy = Math.sin(ang) * b.sp;
          b.y = paddle.y - b.r - 1;
          api.sfx('bounce');
        }

        /* блоки */
        for (let j = 0; j < bricks.length; j++) {
          const bk = bricks[j];
          if (!bk.alive) continue;
          if (b.x + b.r > bk.x && b.x - b.r < bk.x + bk.w &&
            b.y + b.r > bk.y && b.y - b.r < bk.y + bk.h) {
            const ox = Math.min(b.x + b.r - bk.x, bk.x + bk.w - (b.x - b.r));
            const oy = Math.min(b.y + b.r - bk.y, bk.y + bk.h - (b.y - b.r));
            if (ox < oy) b.vx = -b.vx;
            else b.vy = -b.vy;

            if (bk.steel) {
              api.sfx('click');
            } else {
              bk.hp--;
              if (bk.hp <= 0) {
                bk.alive = false;
                score += bk.maxHp === 2 ? 30 : 15;
                api.setScore(score);
                api.sfx('coin');
                burst(bk.x + bk.w / 2, bk.y + bk.h / 2, bk.color, 8);
                if (Math.random() < 0.13) spawnBonus(bk);
              } else {
                api.sfx('click');
              }
            }
            flash = 0.1;
            break;
          }
        }

        /* потеря мяча */
        if (b.y - b.r > groundY) balls.splice(i, 1);
      }

      if (!balls.length) {
        lives--;
        api.sfx(lives > 0 ? 'error' : 'over');
        if (lives <= 0) {
          over = true;
          api.gameOver(score, {
            icon: '💔',
            loseTitle: 'Все жизни потеряны',
            message: 'Достигнут уровень ' + level + ' из ' + MAX_LEVEL
          });
          return;
        }
        resetBallOnPaddle();
        return;
      }

      /* уровень пройден */
      if (bricks.every(bk => bk.steel || !bk.alive)) {
        score += 150 + level * 40;
        api.setScore(score);
        if (level >= MAX_LEVEL) {
          over = true;
          api.gameOver(score, {
            win: true,
            winTitle: 'Все ' + MAX_LEVEL + ' уровней пройдены!',
            icon: '🏆',
            message: 'Идеальный рейд по Арканоиду'
          });
          return;
        }
        level++;
        api.sfx('win');
        buildLevel();
        resetBallOnPaddle();
      }
    }

    function update(dt) {
      if (over) return;

      if (wideT > 0) wideT = Math.max(0, wideT - dt);
      if (slowT > 0) {
        slowT = Math.max(0, slowT - dt);
        if (slowT === 0) {
          balls.forEach(b => {
            b.sp = Math.min(b.sp / 0.6, maxSpeed());
            normalize(b);
          });
        }
      }

      movePaddle(dt);

      /* падающие бонусы */
      for (let i = bonuses.length - 1; i >= 0; i--) {
        const bn = bonuses[i];
        bn.y += bn.vy * dt;
        const pw = paddleW();
        if (bn.y + bn.h >= paddle.y && bn.y <= paddle.y + 12 &&
          bn.x + bn.w >= paddle.x && bn.x <= paddle.x + pw) {
          applyBonus(bn.type);
          burst(bn.x + bn.w / 2, bn.y + bn.h / 2, '#FDE047', 6);
          bonuses.splice(i, 1);
          continue;
        }
        if (bn.y > cv.h + 30) bonuses.splice(i, 1);
      }

      /* физика мяча с подшагами */
      const resting = balls.some(b => b.vx === 0 && b.vy === 0);
      if (!resting) {
        const steps = Math.min(5, Math.max(1, Math.ceil(dt / 0.012)));
        const sub = dt / steps;
        for (let s = 0; s < steps && !over; s++) stepBalls(sub);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      }

      if (flash > 0) flash -= dt;
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

    const BONUS_LABEL = { wide: 'W', slow: 'S', multi: '×2', life: '+' };
    const BONUS_COLOR = { wide: '#38BDF8', slow: '#A78BFA', multi: '#FACC15', life: '#4ADE80' };

    function draw() {
      const w = cv.w, h = cv.h;
      const pw = paddleW();

      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(0, 0, w, h);

      /* блоки */
      bricks.forEach(b => {
        if (!b.alive) return;
        ctx.save();
        if (b.steel) {
          ctx.fillStyle = '#94A3B8';
          roundRect(ctx, b.x, b.y, b.w, b.h, 3);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 2);
          ctx.fillStyle = 'rgba(15,23,42,0.55)';
          [[5, 5], [b.w - 7, 5], [5, b.h - 7], [b.w - 7, b.h - 7]].forEach(o => {
            ctx.beginPath(); ctx.arc(b.x + o[0], b.y + o[1], 1.8, 0, Math.PI * 2); ctx.fill();
          });
        } else {
          ctx.fillStyle = b.color;
          ctx.globalAlpha = b.hp === 2 ? 1 : 0.8;
          roundRect(ctx, b.x, b.y, b.w, b.h, 3);
          ctx.fill();
          ctx.globalAlpha = 1;
          if (b.hp === 2) {
            ctx.strokeStyle = 'rgba(15,23,42,0.65)';
            ctx.lineWidth = 2;
            roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 2);
          }
        }
        ctx.restore();
      });

      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.3) + ')';
        ctx.fillRect(0, 0, w, h);
      }

      /* бонусы */
      bonuses.forEach(bn => {
        ctx.save();
        ctx.shadowColor = BONUS_COLOR[bn.type];
        ctx.shadowBlur = 10;
        ctx.fillStyle = BONUS_COLOR[bn.type];
        roundRect(ctx, bn.x, bn.y, bn.w, bn.h, 6);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#0B0E1A';
        ctx.font = '800 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(BONUS_LABEL[bn.type], bn.x + bn.w / 2, bn.y + bn.h - 4);
      });

      /* ракетка */
      ctx.save();
      ctx.shadowColor = wideT > 0 ? '#4ADE80' : '#38BDF8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = wideT > 0 ? '#4ADE80' : '#38BDF8';
      roundRect(ctx, paddle.x, paddle.y, pw, 12, 6);
      ctx.fill();
      ctx.restore();

      /* мячи */
      balls.forEach(b => {
        ctx.save();
        ctx.shadowColor = '#FDE047';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      /* частицы */
      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      /* HUD */
      ctx.textAlign = 'left';
      ctx.font = '700 ' + Math.floor(h * 0.045) + 'px Inter, sans-serif';
      let hearts = '';
      for (let i = 0; i < lives; i++) hearts += '♥ ';
      ctx.fillStyle = '#F87171';
      ctx.fillText(hearts.trim(), 10, h - 12);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '800 ' + Math.floor(h * 0.045) + 'px Inter, sans-serif';
      ctx.fillText('Уровень ' + level + ' / ' + MAX_LEVEL, w / 2, h - 12);

      /* активные бонусы */
      let bx = 10;
      const by = 14;
      ctx.textAlign = 'left';
      ctx.font = '700 10px Inter, sans-serif';
      if (wideT > 0) {
        ctx.fillStyle = '#38BDF8';
        ctx.fillText('ШИРОКАЯ ' + wideT.toFixed(0) + 'с', bx, by);
        bx += 92;
      }
      if (slowT > 0) {
        ctx.fillStyle = '#A78BFA';
        ctx.fillText('ЗАМЕДЛЕНИЕ ' + slowT.toFixed(0) + 'с', bx, by);
      }

      /* подсказка запуска */
      if (balls.some(b => b.vx === 0 && b.vy === 0)) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(241,245,249,0.92)';
        ctx.font = '700 ' + Math.floor(h * 0.05) + 'px Inter, sans-serif';
        ctx.fillText(launchT < 1.5 ? 'Пробел или клик — запуск' : 'Запуск…', w / 2, h * 0.6);
      }
    }

    /* ---------- boot ---------- */
    reset();
    const unbind = cv.bindPointer(
      function (x) {
        ptrX = x;
        if (balls.some(b => b.vx === 0 && b.vy === 0)) launch();
      },
      function (x) { ptrX = x; }
    );
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); unbind(); cv.destroy(); }
    };
  });
})();
