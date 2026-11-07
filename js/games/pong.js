/* ============================================================
   RetroNova — Pong (Понг)
   Игрок против ИИ, мяч ускоряется, счёт до 7.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'pong',
    title: 'Понг',
    emoji: '🏓',
    genre: 'sports',
    year: 1972,
    touch: 'dpad',
    controls: '↑/↓ или W/S — ракетка · Пробел — подача · Esc — пауза',
    desc: 'Классический теннис против компьютера. Мяч ускоряется с каждым отражением, побеждает тот, кто первым наберёт 7.',
    goodAt: 500
  }, function (api) {
    const cv = api.createCanvas({ aspect: 16 / 9 });
    const ctx = cv.ctx;
    const input = api.input;

    const TARGET = 7;
    const PW = 10, PH = 64, PR = 7;

    let player, ai, ball;
    let pScore, aScore, over;
    let servePending, serveDir, serveT;
    let speed, hits;
    let aiTarget, aiReact;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function resetBall(dir) {
      ball.x = cv.w / 2;
      ball.y = cv.h / 2;
      ball.vx = 0;
      ball.vy = 0;
      servePending = true;
      serveDir = dir;
      serveT = 0;
    }

    function launch() {
      const h = cv.h;
      speed = h * 0.78;
      const ang = (Math.random() * 0.5 - 0.25);
      ball.vx = Math.cos(ang) * speed * serveDir;
      ball.vy = Math.sin(ang) * speed;
      servePending = false;
      api.sfx('select');
    }

    function reset() {
      player = { y: cv.h / 2 - PH / 2 };
      ai = { y: cv.h / 2 - PH / 2 };
      ball = { x: cv.w / 2, y: cv.h / 2, vx: 0, vy: 0 };
      pScore = 0;
      aScore = 0;
      over = false;
      hits = 0;
      speed = 0;
      aiTarget = cv.h / 2;
      aiReact = 0;
      api.setScore(0);
      resetBall(Math.random() < 0.5 ? 1 : -1);
    }

    /* ---------- paddles ---------- */
    function movePlayer(dt) {
      const h = cv.h;
      const up = input.down('ArrowUp') || input.down('w') || input.touch.up;
      const down = input.down('ArrowDown') || input.down('s') || input.touch.down;
      const ps = h * 1.05;
      if (up !== down) player.y += (down ? ps : -ps) * dt;
      player.y = clamp(player.y, 0, h - PH);
    }

    function moveAI(dt) {
      const h = cv.h;
      aiReact -= dt;
      if (aiReact <= 0) {
        aiReact = 0.13;
        if (servePending || ball.vx <= 0) aiTarget = h / 2;
        else aiTarget = ball.y + (Math.random() - 0.5) * h * 0.26;
      }
      const center = ai.y + PH / 2;
      const diff = aiTarget - center;
      const maxSpeed = h * 0.6;            // ИИ ограничен — его можно обыграть
      if (Math.abs(diff) > 5) {
        ai.y += Math.sign(diff) * Math.min(maxSpeed * dt, Math.abs(diff));
      }
      ai.y = clamp(ai.y, 0, h - PH);
    }

    function reflect(paddle, dirX, h) {
      const rel = clamp((ball.y - (paddle.y + PH / 2)) / (PH / 2), -1, 1);
      const ang = rel * 1.05;
      speed = Math.min(h * 2.1, speed * 1.06);
      ball.vx = dirX * Math.cos(ang) * speed;
      ball.vy = Math.sin(ang) * speed;
      hits++;
      api.sfx('bounce');
    }

    function point(scored) {
      if (scored > 0) pScore++;
      else aScore++;
      api.setScore(pScore * 50);
      api.sfx(scored > 0 ? 'coin' : 'error');

      if (pScore >= TARGET || aScore >= TARGET) {
        over = true;
        if (pScore >= TARGET) {
          api.gameOver(500 + pScore * 50, {
            win: true,
            winTitle: 'Победа!',
            icon: '🏆',
            message: 'Счёт ' + pScore + ' : ' + aScore
          });
        } else {
          api.gameOver(pScore * 50, {
            loseTitle: 'Компьютер сильнее',
            icon: '🤖',
            message: 'Счёт ' + pScore + ' : ' + aScore
          });
        }
        return;
      }
      /* подача проигравшему очко */
      resetBall(scored > 0 ? 1 : -1);
    }

    /* ---------- update ---------- */
    function update(dt) {
      if (over) return;
      const w = cv.w, h = cv.h;

      movePlayer(dt);
      moveAI(dt);

      if (servePending) {
        ball.x = w / 2;
        ball.y = h / 2;
        serveT += dt;
        const pressed = input.pressed('Space') || input.pressed('Enter') ||
          input.touchPressed('up') || input.touchPressed('down') ||
          input.pressed('ArrowUp') || input.pressed('ArrowDown');
        if (pressed || serveT > 2.2) launch();
        return;
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.y - PR < 0) { ball.y = PR; ball.vy = Math.abs(ball.vy); api.sfx('bounce'); }
      if (ball.y + PR > h) { ball.y = h - PR; ball.vy = -Math.abs(ball.vy); api.sfx('bounce'); }

      const px = 20, ax = w - 20 - PW;

      if (ball.vx < 0 && ball.x - PR <= px + PW && ball.x + PR >= px &&
        ball.y > player.y - PR && ball.y < player.y + PH + PR) {
        ball.x = px + PW + PR;
        reflect(player, 1, h);
      } else if (ball.vx > 0 && ball.x + PR >= ax && ball.x - PR <= ax + PW &&
        ball.y > ai.y - PR && ball.y < ai.y + PH + PR) {
        ball.x = ax - PR;
        reflect(ai, -1, h);
      }

      if (ball.x < -30) point(-1);
      else if (ball.x > w + 30) point(1);
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
      const px = 20, ax = w - 20 - PW;

      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(0, 0, w, h);

      /* центральная линия */
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 8);
      ctx.lineTo(w / 2, h - 8);
      ctx.stroke();
      ctx.setLineDash([]);

      /* счёт */
      ctx.font = '800 ' + Math.floor(h * 0.2) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(56,189,248,0.75)';
      ctx.fillText(String(pScore), w * 0.3, h * 0.22);
      ctx.fillStyle = 'rgba(248,113,113,0.75)';
      ctx.fillText(String(aScore), w * 0.7, h * 0.22);

      /* рамка */
      ctx.strokeStyle = 'rgba(139,92,246,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, w - 8, h - 8);

      /* ракетки */
      ctx.save();
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#38BDF8';
      roundRect(ctx, px, player.y, PW, PH, 5);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = '#F87171';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#F87171';
      roundRect(ctx, ax, ai.y, PW, PH, 5);
      ctx.fill();
      ctx.restore();

      /* мяч */
      ctx.save();
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      /* подача */
      if (servePending && !over) {
        ctx.fillStyle = 'rgba(11,14,26,0.72)';
        ctx.fillRect(0, h * 0.4, w, h * 0.2);
        ctx.fillStyle = '#F1F5F9';
        ctx.font = '800 ' + Math.floor(h * 0.07) + 'px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ПРОБЕЛ — подача', w / 2, h * 0.48);
        ctx.fillStyle = 'rgba(148,163,184,0.95)';
        ctx.font = '600 ' + Math.floor(h * 0.045) + 'px Inter, sans-serif';
        ctx.fillText('через ' + Math.max(0, 2.2 - serveT).toFixed(1) + ' с — автоматически', w / 2, h * 0.56);
      }

      /* подсказка победы до 7 */
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.font = '600 ' + Math.floor(h * 0.038) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('до ' + TARGET + ' очков', w / 2, h - 12);
    }

    reset();
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); cv.destroy(); }
    };
  });
})();
