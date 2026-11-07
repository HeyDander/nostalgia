/* ============================================================
   RetroNova — Breakout (Разбей стену)
   Кирпичи 3–5 рядов, прочность 1–2, 3 жизни, смена раскладок.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'breakout',
    title: 'Breakout',
    emoji: '💥',
    genre: 'action',
    year: 1976,
    touch: 'dpad',
    controls: 'Мышь или ←/→ — ракетка · Пробел / клик — запуск мяча · Esc — пауза',
    desc: 'Разбейте все кирпичи: обычные падают с одного удара, прочные — с двух. Жизней всего три.',
    goodAt: 1200
  }, function (api) {
    const cv = api.createCanvas({ aspect: 16 / 10 });
    const ctx = cv.ctx;
    const input = api.input;

    const LAYOUTS = [
      [
        '11111111111',
        '12121212121',
        '11111111111',
        '21212121212',
        '11111111111'
      ],
      [
        '22222222222',
        '12121212121',
        '.111111111.',
        '..2222222..',
        '...11111...'
      ],
      [
        '21212121212',
        '11111111111',
        '12121212121',
        '21111111112',
        '11111111111'
      ]
    ];
    const ROW_COLORS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#38BDF8'];

    let bricks, paddle, ball, particles;
    let lives, level, score, over, launchT;
    let ptrX, speed, flash;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function paddleW() { return Math.max(64, cv.w * 0.14); }

    function buildLevel() {
      const rows = LAYOUTS[(level - 1) % LAYOUTS.length];
      const cols = rows[0].length;
      const w = cv.w, h = cv.h;
      const margin = w * 0.06;
      const top = h * 0.09;
      const bw = (w - margin * 2) / cols;
      const bh = Math.min(22, h * 0.055);
      bricks = [];
      rows.forEach((row, ri) => {
        for (let ci = 0; ci < cols; ci++) {
          const ch = row.charAt(ci);
          if (ch === '.' || ch === ' ') continue;
          bricks.push({
            x: margin + ci * bw,
            y: top + ri * bh,
            w: bw - 4,
            h: bh - 4,
            hp: ch === '2' ? 2 : 1,
            color: ROW_COLORS[ri % ROW_COLORS.length]
          });
        }
      });
    }

    function resetBallOnPaddle() {
      ball.x = paddle.x + paddleW() / 2;
      ball.y = paddle.y - 12;
      ball.vx = 0;
      ball.vy = 0;
      launchT = 0;
      speed = cv.h * 0.72 + (level - 1) * cv.h * 0.06;
    }

    function launchBall() {
      const ang = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
      ball.vx = Math.cos(ang) * speed;
      ball.vy = Math.sin(ang) * speed;
      api.sfx('select');
    }

    function reset() {
      paddle = { x: cv.w / 2 - paddleW() / 2, y: cv.h - 40 };
      ball = { x: 0, y: 0, vx: 0, vy: 0, r: Math.max(6, cv.h * 0.02) };
      particles = [];
      lives = 3;
      level = 1;
      score = 0;
      over = false;
      ptrX = null;
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
          life: 0.45,
          max: 0.45,
          color: color
        });
      }
    }

    /* ---------- input ---------- */
    function movePaddle(dt) {
      const w = cv.w, h = cv.h;
      const pw = paddleW();
      paddle.y = h - 40;
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
      if (ball.vy === 0) {
        ball.x = paddle.x + pw / 2;
        ball.y = paddle.y - 12;
      }
    }

    function tryLaunch() {
      if (ball.vy === 0 && ball.vx === 0) {
        if (input.pressed('Space') || input.pressed('Enter') || input.touchPressed('a') ||
          launchT > 1.4) {
          launchBall();
        }
      }
    }

    /* ---------- update ---------- */
    function update(dt) {
      if (over) return;
      const w = cv.w, h = cv.h;
      const r = ball.r;

      if (flash > 0) flash -= dt;
      movePaddle(dt);

      if (ball.vy === 0) {
        launchT += dt;
        tryLaunch();
      } else {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x - r < 0) { ball.x = r; ball.vx = Math.abs(ball.vx); api.sfx('bounce'); }
        if (ball.x + r > w) { ball.x = w - r; ball.vx = -Math.abs(ball.vx); api.sfx('bounce'); }
        if (ball.y - r < 0) { ball.y = r; ball.vy = Math.abs(ball.vy); api.sfx('bounce'); }

        /* ракетка */
        const pw = paddleW();
        if (ball.vy > 0 && ball.y + r >= paddle.y && ball.y - r <= paddle.y + 12 &&
          ball.x >= paddle.x - r && ball.x <= paddle.x + pw + r) {
          const rel = clamp((ball.x - (paddle.x + pw / 2)) / (pw / 2), -1, 1);
          const ang = -Math.PI / 2 + rel * 1.05;
          ball.vx = Math.cos(ang) * speed;
          ball.vy = Math.sin(ang) * speed;
          ball.y = paddle.y - r - 1;
          api.sfx('bounce');
        }

        /* кирпичи */
        for (let i = 0; i < bricks.length; i++) {
          const b = bricks[i];
          if (b.hp <= 0) continue;
          if (ball.x + r > b.x && ball.x - r < b.x + b.w &&
            ball.y + r > b.y && ball.y - r < b.y + b.h) {
            const ox = Math.min(ball.x + r - b.x, b.x + b.w - (ball.x - r));
            const oy = Math.min(ball.y + r - b.y, b.y + b.h - (ball.y - r));
            if (ox < oy) ball.vx = -ball.vx;
            else ball.vy = -ball.vy;
            b.hp--;
            if (b.hp <= 0) {
              score += 10 + (level - 1) * 5;
              api.setScore(score);
              api.sfx('coin');
              burst(b.x + b.w / 2, b.y + b.h / 2, b.color, 8);
              const old = speed;
              speed = Math.min(cv.h * 1.6, speed * 1.02);
              const f = speed / old;
              ball.vx *= f;
              ball.vy *= f;
            } else {
              api.sfx('click');
            }
            flash = 0.12;
            break;
          }
        }

        /* потеря мяча */
        if (ball.y - r > h) {
          lives--;
          api.sfx(lives > 0 ? 'error' : 'over');
          if (lives <= 0) {
            over = true;
            api.gameOver(score, {
              icon: '💔',
              loseTitle: 'Жизни закончились',
              message: 'Уровень ' + level + ' · Кирпичей разбито'
            });
            return;
          }
          resetBallOnPaddle();
        }

        /* уровень пройден */
        if (bricks.every(b => b.hp <= 0)) {
          score += 150;
          level++;
          api.setScore(score);
          api.sfx('win');
          buildLevel();
          resetBallOnPaddle();
        }
      }

      /* частицы */
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

    function draw() {
      const w = cv.w, h = cv.h;
      const pw = paddleW();
      const r = ball.r;

      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(0, 0, w, h);

      /* кирпичи */
      bricks.forEach(b => {
        if (b.hp <= 0) return;
        ctx.save();
        ctx.fillStyle = b.hp === 2 ? b.color : b.color;
        ctx.globalAlpha = b.hp === 2 ? 1 : 0.85;
        roundRect(ctx, b.x, b.y, b.w, b.h, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (b.hp === 2) {
          ctx.strokeStyle = 'rgba(15,23,42,0.7)';
          ctx.lineWidth = 2;
          roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 2);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 2);
        }
        ctx.restore();
      });

      /* подсветка удара */
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.35) + ')';
        ctx.fillRect(0, 0, w, h);
      }

      /* ракетка */
      ctx.save();
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#38BDF8';
      roundRect(ctx, paddle.x, paddle.y, pw, 12, 6);
      ctx.fill();
      ctx.restore();

      /* мяч */
      ctx.save();
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      /* частицы */
      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      /* жизни и уровень */
      ctx.textAlign = 'left';
      ctx.font = '700 ' + Math.floor(h * 0.045) + 'px Inter, sans-serif';
      let hearts = '';
      for (let i = 0; i < lives; i++) hearts += '♥ ';
      ctx.fillStyle = '#F87171';
      ctx.fillText(hearts.trim(), 10, h - 12);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Уровень ' + level, w - 10, h - 12);

      /* подсказка запуска */
      if (ball.vy === 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(241,245,249,0.92)';
        ctx.font = '700 ' + Math.floor(h * 0.05) + 'px Inter, sans-serif';
        ctx.fillText(launchT < 1.4 ? 'Пробел или тап — запуск' : 'Запуск…', w / 2, h * 0.55);
      }
    }

    /* ---------- boot ---------- */
    reset();
    const unbind = cv.bindPointer(
      function (x) {
        ptrX = x;
        if (ball.vy === 0) launchBall();
      },
      function (x) { ptrX = x; }
    );
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); unbind(); cv.destroy(); }
    };
  });
})();
