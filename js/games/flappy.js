/* ============================================================
   RetroNova — Flappy Bird (Флаппи)
   Тап/пробел — взмах, трубы с проёмом, параллакс-фон.
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'flappy',
    title: 'Flappy Bird',
    emoji: '🐦',
    genre: 'arcade',
    year: 2013,
    touch: 'tap',
    controls: 'Пробел или тап — взмах · R — заново · Esc — пауза',
    desc: 'Проведите птицу сквозь проёмы труб: один взмах — один подъём, столкновение — конец.',
    goodAt: 15
  }, function (api) {
    const cv = api.createCanvas({ aspect: 16 / 9 });
    const ctx = cv.ctx;
    const input = api.input;

    let mode, bird, pipes, score, best, over;
    let groundOff, bgOff, spawnT, deadT, t;
    let stars, hillsFar, hillsNear;

    function S() { return Math.max(0.6, cv.h / 360); }
    function groundH() { return cv.h * 0.14; }
    function groundY() { return cv.h - groundH(); }
    function birdX() { return cv.w * 0.3; }
    function birdR() { return 13 * S(); }
    function pipeW() { return Math.max(48, cv.w * 0.09); }
    function gap() { return 158 * S(); }

    /* ---------- scenery ---------- */
    function makeScenery() {
      const w = cv.w, h = cv.h;
      stars = [];
      for (let i = 0; i < 42; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * groundY() * 0.75,
          r: 0.6 + Math.random() * 1.5,
          a: 0.25 + Math.random() * 0.6
        });
      }
      hillsFar = [];
      for (let i = 0; i < Math.ceil(w / 90) + 3; i++) {
        hillsFar.push({ x: i * 90, w: 90, h: 40 + Math.random() * 55 });
      }
      hillsNear = [];
      for (let i = 0; i < Math.ceil(w / 70) + 3; i++) {
        hillsNear.push({ x: i * 70, w: 70, h: 26 + Math.random() * 42 });
      }
    }

    /* ---------- flow ---------- */
    function reset() {
      mode = 'ready';
      bird = { y: groundY() * 0.45, vy: 0, rot: 0, wing: 0 };
      pipes = [];
      score = 0;
      over = false;
      groundOff = 0;
      bgOff = 0;
      spawnT = 0;
      deadT = 0;
      t = 0;
      makeScenery();
      api.setScore(0);
    }

    function flap() {
      if (over) return;
      if (mode === 'ready') mode = 'play';
      if (mode !== 'play') return;
      bird.vy = -430 * S();
      bird.wing = 0.22;
      api.sfx('jump');
    }

    function spawnPipe() {
      const h = cv.h;
      const topMin = h * 0.14;
      const topMax = groundY() - gap() - h * 0.12;
      const topH = topMin + Math.random() * Math.max(20, topMax - topMin);
      pipes.push({ x: cv.w + 10, topH: topH, scored: false });
    }

    function die() {
      if (mode !== 'play') return;
      mode = 'dead';
      bird.vy = Math.min(bird.vy, 0);
      api.sfx('explode');
    }

    /* ---------- update ---------- */
    function update(dt) {
      if (over) return;
      t += dt;
      const s = S();

      if (mode === 'ready') {
        bird.y = groundY() * 0.45 + Math.sin(t * 3) * 7;
        bird.rot = 0;
        groundOff = (groundOff + 130 * s * dt) % 40;
        bgOff += 12 * s * dt;
        if (input.pressed('Space') || input.pressed('Enter') || input.pressed('ArrowUp') || input.pressed('w')) flap();
        return;
      }

      if (mode === 'play') {
        if (input.pressed('Space') || input.pressed('Enter') || input.pressed('ArrowUp') || input.pressed('w')) flap();

        bird.vy += 1500 * s * dt;
        bird.y += bird.vy * dt;
        if (bird.wing > 0) bird.wing = Math.max(0, bird.wing - dt);
        bird.rot = Math.max(-0.5, Math.min(1.35, bird.vy / (520 * s)));

        const speed = 168 * s;
        groundOff = (groundOff + speed * dt) % 40;
        bgOff += speed * dt;

        spawnT += dt;
        if (spawnT >= 1.6) { spawnT -= 1.6; spawnPipe(); }

        const bx = birdX(), br = birdR(), pw = pipeW(), gp = gap();
        for (let i = pipes.length - 1; i >= 0; i--) {
          const p = pipes[i];
          p.x -= speed * dt;
          if (p.x + pw < -20) { pipes.splice(i, 1); continue; }

          if (!p.scored && p.x + pw < bx - br) {
            p.scored = true;
            score++;
            api.setScore(score);
            api.sfx('coin');
          }

          if (bx + br > p.x && bx - br < p.x + pw) {
            if (bird.y - br < p.topH || bird.y + br > p.topH + gp) die();
          }
        }

        if (bird.y - br < 0) { bird.y = br; bird.vy = Math.max(0, bird.vy); }
        if (bird.y + br >= groundY()) {
          bird.y = groundY() - br;
          die();
        }
        return;
      }

      /* mode === 'dead': птица падает, мир замирает */
      bird.vy += 1500 * s * dt;
      bird.y += bird.vy * dt;
      bird.rot = Math.min(1.5, bird.rot + dt * 3);
      const gy = groundY();
      if (bird.y + birdR() >= gy) {
        bird.y = gy - birdR();
        bird.vy = 0;
      }
      deadT += dt;
      if (deadT > 0.8 && !over) {
        over = true;
        api.gameOver(score, {
          icon: '🐦',
          loseTitle: 'Столкновение',
          message: 'Пройдено труб: ' + score
        });
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

    function drawHills(list, scroll, color, baseY) {
      const w = cv.w;
      const total = list.length * list[0].w;
      ctx.fillStyle = color;
      list.forEach(hl => {
        let x = ((hl.x - scroll) % total + total) % total - list[0].w;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.quadraticCurveTo(x + hl.w / 2, baseY - hl.h, x + hl.w, baseY);
        ctx.closePath();
        ctx.fill();
      });
    }

    function drawBird() {
      const r = birdR();
      const x = birdX(), y = bird.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(bird.rot);

      /* тело */
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.15, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* хвост */
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, -r * 0.25);
      ctx.lineTo(-r * 1.75, -r * 0.6);
      ctx.lineTo(-r * 1.7, r * 0.35);
      ctx.closePath();
      ctx.fill();

      /* крыло */
      const wingAng = bird.wing > 0 ? -0.7 : (mode === 'play' ? Math.sin(t * 14) * 0.35 : 0.1);
      ctx.save();
      ctx.translate(-r * 0.15, r * 0.1);
      ctx.rotate(wingAng);
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.7, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      /* клюв */
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(r * 0.85, -r * 0.12);
      ctx.lineTo(r * 1.75, r * 0.12);
      ctx.lineTo(r * 0.85, r * 0.42);
      ctx.closePath();
      ctx.fill();

      /* глаз */
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(r * 0.42, -r * 0.34, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(r * 0.52, -r * 0.34, r * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function draw() {
      const w = cv.w, h = cv.h;
      const s = S();
      const gy = groundY();
      const pw = pipeW();
      const gp = gap();

      /* небо */
      const grad = ctx.createLinearGradient(0, 0, 0, gy);
      grad.addColorStop(0, '#0B1026');
      grad.addColorStop(0.6, '#1B2452');
      grad.addColorStop(1, '#3B2C63');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, gy);

      /* звёзды */
      stars.forEach(st => {
        const tw = 0.65 + Math.sin(t * 2 + st.x) * 0.35;
        ctx.globalAlpha = st.a * tw;
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      /* параллакс-холмы */
      drawHills(hillsFar, bgOff * 0.18, 'rgba(56,74,133,0.85)', gy);
      drawHills(hillsNear, bgOff * 0.4, 'rgba(38,52,99,0.95)', gy);

      /* трубы */
      pipes.forEach(p => {
        const topH = p.topH;
        ctx.save();
        ctx.shadowColor = 'rgba(34,197,94,0.5)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(p.x, 0, pw, topH);
        ctx.fillRect(p.x, topH + gp, pw, gy - (topH + gp));
        ctx.restore();

        /* ободки */
        ctx.fillStyle = '#16A34A';
        ctx.fillRect(p.x - 4, topH - 16, pw + 8, 16);
        ctx.fillRect(p.x - 4, topH + gp, pw + 8, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(p.x + 5, 0, 5, Math.max(0, topH - 16));
        ctx.fillRect(p.x + 5, topH + gp + 16, 5, Math.max(0, gy - topH - gp - 16));
      });

      /* земля */
      ctx.fillStyle = '#7C5E3C';
      ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = '#4ADE80';
      ctx.fillRect(0, gy, w, 10 * s);
      ctx.fillStyle = 'rgba(15,23,42,0.35)';
      for (let x = -40; x < w + 40; x += 40) {
        const px = x - (groundOff % 40);
        ctx.fillRect(px, gy + 12 * s, 20 * s, 6 * s);
      }

      drawBird();

      /* счёт */
      ctx.textAlign = 'center';
      ctx.font = '800 ' + Math.floor(h * 0.16) + 'px Inter, sans-serif';
      ctx.fillStyle = 'rgba(15,23,42,0.45)';
      ctx.fillText(String(score), w / 2 + 3, h * 0.24 + 3);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(String(score), w / 2, h * 0.24);

      /* подсказки */
      if (mode === 'ready') {
        ctx.fillStyle = 'rgba(11,16,38,0.72)';
        roundRect(ctx, w / 2 - Math.min(180, w * 0.42), h * 0.4, Math.min(360, w * 0.84), 66, 14);
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 ' + Math.floor(h * 0.06) + 'px Inter, sans-serif';
        ctx.fillText('Тапни, чтобы взлететь', w / 2, h * 0.49);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 ' + Math.floor(h * 0.04) + 'px Inter, sans-serif';
        ctx.fillText('или нажми Пробел', w / 2, h * 0.55);
      } else if (mode === 'dead') {
        ctx.fillStyle = 'rgba(239,68,68,' + Math.min(0.3, deadT * 0.4) + ')';
        ctx.fillRect(0, 0, w, h);
      }
    }

    /* ---------- boot ---------- */
    reset();
    const unbind = cv.bindPointer(function () { flap(); });
    const loop = api.loop(update, draw);

    return {
      destroy() { loop.stop(); unbind(); cv.destroy(); }
    };
  });
})();
