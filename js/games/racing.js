/* ============================================================
   RetroNova — Racing (Гонки) — pseudo-3D road racer
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  RN.games.register({
    id: 'racing',
    title: 'Гонки',
    emoji: '🏎️',
    genre: 'racing',
    year: 1996,
    touch: 'dpad',
    controls: '←/→ или A/D — смена полосы · R — заново · Esc — пауза',
    desc: 'Псевдо-3D-трасса с изгибами: уходите от встречных машин, собирайте монеты (+50) и держите скорость.',
    goodAt: 600
  }, function (api) {
    const cv = api.createCanvas({ aspect: 16 / 9 });
    const ctx = cv.ctx;
    const input = api.input;

    /* ---------- world constants ---------- */
    const SEG = 200;                 // world units per road segment
    const ROAD_W = 2000;             // half road width
    const CAM_H = 1150;              // camera height
    const CAM_DEPTH = 1.1;
    const PLAYER_Z = CAM_H * CAM_DEPTH;
    const DRAW = 170;                // segments drawn ahead
    const LANES = [-0.65, 0, 0.65];  // lane centers (road-relative)
    const CAR_W = 760;               // oncoming car width (world)
    const PLAYER_W = 560;            // player car width (world)
    const HIT_Z = 340;               // longitudinal hit window
    const HIT_X = (CAR_W / 2 + PLAYER_W / 2) / ROAD_W;
    const PICK_X = 0.30;             // coin pickup lateral window
    const START_SPEED = 3400;
    const MAX_SPEED = 7600;
    const ACCEL = 16;
    const CAR_COLORS = ['#06B6D4', '#22C55E', '#F472B6', '#F59E0B', '#60A5FA', '#A78BFA'];

    /* ---------- state ---------- */
    let pos = 0;              // camera distance
    let speed = START_SPEED;
    let lane = 1;
    let playerX = 0;
    let elapsed = 0;
    let coinScore = 0;
    let score = 0;
    let cars = [];
    let coins = [];
    let particles = [];
    let floats = [];
    let stars = [];
    let crashed = false, crashT = 0, shake = 0, ended = false;
    let flash = 0;

    /* ---------- helpers ---------- */
    function segCurve(i) {
      return 2.6 * Math.sin(i * 0.014) +
             1.5 * Math.sin(i * 0.041 + 1.7) +
             0.9 * Math.sin(i * 0.09 + 0.6);
    }

    function laneOf(x) {
      let best = 0;
      for (let i = 1; i < LANES.length; i++) {
        if (Math.abs(LANES[i] - x) < Math.abs(LANES[best] - x)) best = i;
      }
      return best;
    }

    function mod(a, n) { return ((a % n) + n) % n; }

    /* ---------- spawning ---------- */
    function laneFree(z, laneIdx, gap) {
      for (let i = 0; i < cars.length; i++) {
        if (cars[i].lane === laneIdx && Math.abs(cars[i].z - z) < gap) return false;
      }
      return true;
    }

    function windowFree(z, ignoreCar) {
      // guarantee at least one lane stays open within ±1800 units
      const busy = {};
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        if (c === ignoreCar) continue;
        if (Math.abs(c.z - z) < 1800) busy[c.lane] = true;
      }
      return Object.keys(busy).length < 2;
    }

    function placeCar(c, initial) {
      const span = DRAW * SEG;
      for (let t = 0; t < 24; t++) {
        const z = initial
          ? pos + 4000 + Math.random() * (span - 5000)
          : pos + span * (0.55 + Math.random() * 0.45);
        const l = Math.floor(Math.random() * LANES.length);
        if (!laneFree(z, l, 2600)) continue;
        if (!windowFree(z, c)) continue;
        c.z = z;
        c.lane = l;
        c.x = LANES[l];
        c.speed = 2100 + Math.random() * 1300;
        c.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
        c.seed = Math.random() * 10;
        return;
      }
      // fallback: put it far ahead anyway
      c.z = pos + span * 0.95;
      c.lane = 0;
      c.x = LANES[0];
      c.speed = 2400;
      c.color = CAR_COLORS[0];
      c.seed = 1;
    }

    function placeCoin(co) {
      const span = DRAW * SEG;
      for (let t = 0; t < 24; t++) {
        const z = pos + span * (0.45 + Math.random() * 0.55);
        const l = Math.floor(Math.random() * LANES.length);
        let blocked = false;
        for (let i = 0; i < cars.length; i++) {
          if (cars[i].lane === l && Math.abs(cars[i].z - z) < 900) { blocked = true; break; }
        }
        if (blocked) continue;
        co.z = z;
        co.x = LANES[l];
        co.lane = l;
        co.seed = Math.random() * 10;
        return;
      }
      co.z = pos + span * 0.9;
      co.x = 0;
      co.lane = 1;
      co.seed = 0;
    }

    function reset() {
      pos = 0;
      speed = START_SPEED;
      lane = 1;
      playerX = 0;
      elapsed = 0;
      coinScore = 0;
      score = 0;
      crashed = false;
      crashT = 0;
      shake = 0;
      ended = false;
      flash = 0;
      particles = [];
      floats = [];
      cars = [];
      coins = [];
      stars = [];
      for (let i = 0; i < 60; i++) {
        stars.push({ x: Math.random(), y: Math.random() * 0.46, s: 0.6 + Math.random() * 1.6 });
      }
      for (let i = 0; i < 6; i++) {
        const c = { z: 0, x: 0, lane: 1, speed: 0, color: '#06B6D4', seed: 0 };
        placeCar(c, true);
        cars.push(c);
      }
      for (let i = 0; i < 10; i++) {
        const co = { z: 0, x: 0, lane: 1, seed: 0 };
        placeCoin(co);
        coins.push(co);
      }
      api.setScore(0);
    }

    /* ---------- fx ---------- */
    function burst(x, y, color, n, spread) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.35 + Math.random()) * spread;
        particles.push({
          x: x, y: y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.5 + Math.random() * 0.4,
          max: 0.9,
          color: color
        });
      }
    }

    function floatText(x, y, text, color) {
      floats.push({ x: x, y: y, text: text, color: color, life: 1, max: 1 });
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 520 * dt;
        p.vx *= 0.97;
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt;
        if (f.life <= 0) { floats.splice(i, 1); continue; }
        f.y -= 46 * dt;
      }
    }

    /* ---------- flow ---------- */
    function changeLane(dir) {
      const next = lane + dir;
      if (next < 0 || next >= LANES.length) return;
      lane = next;
      api.sfx('click');
    }

    function crash() {
      if (crashed) return;
      crashed = true;
      crashT = 0;
      shake = 1;
      flash = 1;
      api.sfx('explode');
      const w = cv.w, h = cv.h;
      burst(w / 2, h * 0.88, '#F59E0B', 30, 340);
      burst(w / 2, h * 0.88, '#EF4444', 20, 260);
      floatText(w / 2, h * 0.6, 'СТОЛКНОВЕНИЕ!', '#EF4444');
    }

    function finish() {
      if (ended) return;
      ended = true;
      api.gameOver(score, {
        icon: '💥',
        message: 'Дистанция: ' + Math.floor(pos / 100) + ' м · Монеты: ' + (coinScore / 50) + ' (+' + coinScore + ')'
      });
    }

    /* ---------- update ---------- */
    function update(dt) {
      updateParticles(dt);
      shake = Math.max(0, shake - dt * 2.4);
      flash = Math.max(0, flash - dt * 2);

      if (ended) return;

      if (crashed) {
        crashT += dt;
        if (crashT > 1.15) finish();
        return;
      }

      elapsed += dt;
      speed = Math.min(MAX_SPEED, START_SPEED + elapsed * ACCEL);

      if (input.pressed('ArrowLeft') || input.pressed('a') || input.touchPressed('left')) changeLane(-1);
      if (input.pressed('ArrowRight') || input.pressed('d') || input.touchPressed('right')) changeLane(1);

      const prevPos = pos;
      pos += speed * dt;
      const target = LANES[lane];
      playerX += (target - playerX) * Math.min(1, dt * 7);

      const pzBefore = prevPos + PLAYER_Z;
      const pzAfter = pos + PLAYER_Z;

      /* cars */
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const zB = c.z;
        c.z -= c.speed * dt;
        const zA = c.z;
        const relB = zB - pzBefore;
        const relA = zA - pzAfter;
        const cross = (relB <= 0 && relA >= 0) || (relB >= 0 && relA <= 0);
        const near = Math.min(Math.abs(relB), Math.abs(relA));
        if ((cross || near < HIT_Z) && Math.abs(c.x - playerX) < HIT_X) {
          crash();
          return;
        }
        if (c.z < pos - 900) placeCar(c, false);
      }

      /* coins */
      for (let i = 0; i < coins.length; i++) {
        const co = coins[i];
        const relB = co.z - pzBefore;
        const relA = co.z - pzAfter;
        const cross = (relB <= 0 && relA >= 0) || (relB >= 0 && relA <= 0);
        const near = Math.min(Math.abs(relB), Math.abs(relA));
        if ((cross || near < 300) && Math.abs(co.x - playerX) < PICK_X) {
          coinScore += 50;
          api.sfx('coin');
          const w = cv.w, h = cv.h;
          burst(w / 2 + (co.x - playerX) * w * 0.3, h * 0.78, '#F59E0B', 12, 190);
          floatText(w / 2, h * 0.7, '+50', '#F59E0B');
          placeCoin(co);
        } else if (co.z < pos - 600) {
          placeCoin(co);
        }
      }

      score = Math.floor(pos / 1000) + coinScore;
      api.setScore(score);
    }

    /* ---------- drawing ---------- */
    const projCache = Object.create(null);

    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    function drawSky(w, h, horizon, shift) {
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, '#0B0E1A');
      g.addColorStop(0.6, '#141033');
      g.addColorStop(1, '#2A1450');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, horizon + 2);

      // stars
      ctx.fillStyle = '#E2E8F0';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const sx = mod(s.x * w + shift * 0.25, w);
        const tw = 0.5 + 0.5 * Math.sin(performance.now() / 420 + i);
        ctx.globalAlpha = 0.25 + 0.6 * tw * s.s * 0.6;
        ctx.fillRect(sx, s.y * horizon, s.s, s.s);
      }
      ctx.globalAlpha = 1;

      // neon sun on horizon
      const cx = w * 0.5 + shift * 0.12;
      const r = Math.min(w, h) * 0.16;
      const cy = horizon + r * 0.15;
      const sg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      sg.addColorStop(0, '#F59E0B');
      sg.addColorStop(0.55, '#8B5CF6');
      sg.addColorStop(1, '#06B6D4');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.clip();
      ctx.fillStyle = sg;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = '#0B0E1A';
      for (let i = 0; i < 4; i++) {
        const bh = 2 + i * 2.2;
        ctx.fillRect(cx - r, cy - r * 0.12 - i * (r * 0.16), r * 2, bh);
      }
      ctx.restore();

      // horizon glow
      ctx.fillStyle = 'rgba(6,182,212,0.35)';
      ctx.fillRect(0, horizon - 1, w, 2);
    }

    function drawRoad(w, h, time) {
      const base = Math.floor(pos / SEG);
      const pct = (pos - base * SEG) / SEG;
      let x = 0;
      let dx = -(segCurve(base) * pct);
      const horizon = h * 0.5;
      let farX = 0;

      for (let n = 0; n < DRAW; n++) {
        const idx = base + n;
        const z1 = idx * SEG;
        const dz1 = z1 - pos;
        const dz2 = z1 + SEG - pos;
        if (dz1 < 12) { x += dx; dx += segCurve(idx); continue; }
        const s1 = CAM_DEPTH / dz1;
        const s2 = CAM_DEPTH / dz2;
        const camX = playerX * ROAD_W - x;
        const cx1 = w / 2 - s1 * camX * w / 2;
        const cx2 = w / 2 - s2 * camX * w / 2;
        const w1 = s1 * ROAD_W * w / 2;
        const w2 = s2 * ROAD_W * w / 2;
        const y1 = horizon + s1 * CAM_H * h / 2;
        const y2 = horizon + s2 * CAM_H * h / 2;

        projCache[idx] = { cx1: cx1, y1: y1, w1: w1, cx2: cx2, y2: y2, w2: w2 };

        // ground band
        ctx.fillStyle = (idx % 2) ? '#0E1226' : '#0C1020';
        ctx.fillRect(0, y2, w, y1 - y2 + 1);

        // road surface
        ctx.fillStyle = (idx % 2) ? '#1A1F35' : '#171B2E';
        ctx.beginPath();
        ctx.moveTo(cx1 - w1, y1);
        ctx.lineTo(cx1 + w1, y1);
        ctx.lineTo(cx2 + w2, y2);
        ctx.lineTo(cx2 - w2, y2);
        ctx.closePath();
        ctx.fill();

        // rumble strips
        const rumble = (idx % 2) ? '#8B5CF6' : '#06B6D4';
        ctx.fillStyle = rumble;
        const rw1 = Math.max(1.5, w1 * 0.075);
        const rw2 = Math.max(1, w2 * 0.075);
        ctx.beginPath();
        ctx.moveTo(cx1 - w1 - rw1, y1);
        ctx.lineTo(cx1 - w1, y1);
        ctx.lineTo(cx2 - w2, y2);
        ctx.lineTo(cx2 - w2 - rw2, y2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx1 + w1, y1);
        ctx.lineTo(cx1 + w1 + rw1, y1);
        ctx.lineTo(cx2 + w2 + rw2, y2);
        ctx.lineTo(cx2 + w2, y2);
        ctx.closePath();
        ctx.fill();

        // lane dashes
        if (idx % 4 < 2) {
          ctx.fillStyle = 'rgba(226,232,240,0.55)';
          for (const off of [-1 / 3, 1 / 3]) {
            const lx1 = cx1 + off * w1;
            const lx2 = cx2 + off * w2;
            const lw1 = Math.max(1, w1 * 0.012);
            const lw2 = Math.max(0.6, w2 * 0.012);
            ctx.beginPath();
            ctx.moveTo(lx1 - lw1, y1);
            ctx.lineTo(lx1 + lw1, y1);
            ctx.lineTo(lx2 + lw2, y2);
            ctx.lineTo(lx2 - lw2, y2);
            ctx.closePath();
            ctx.fill();
          }
        }

        x += dx;
        dx += segCurve(idx);
        farX = x;
      }
      return farX;
    }

    function objPos(z, xr) {
      const idx = Math.floor(z / SEG);
      const seg = projCache[idx];
      if (!seg) return null;
      const pct = (z - idx * SEG) / SEG;
      const y = seg.y1 + (seg.y2 - seg.y1) * pct;
      if (y < 0 || y > cv.h + 40) return null;
      const cx = seg.cx1 + (seg.cx2 - seg.cx1) * pct;
      const ww = seg.w1 + (seg.w2 - seg.w1) * pct;
      return { x: cx + xr * ww, y: y, w: ww };
    }

    function drawCar(x, y, wpx, color, time, seed, oncoming) {
      const hpx = wpx * 0.72;
      const bob = Math.sin(time * 9 + seed) * wpx * 0.02;
      ctx.save();
      ctx.translate(x, y + bob);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 2, wpx * 0.55, hpx * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.shadowColor = color;
      ctx.shadowBlur = wpx * 0.25;
      ctx.fillStyle = color;
      roundRect(ctx, -wpx / 2, -hpx, wpx, hpx * 0.78, Math.max(2, wpx * 0.14));
      ctx.fill();
      ctx.shadowBlur = 0;
      // cabin
      ctx.fillStyle = 'rgba(11,14,26,0.85)';
      roundRect(ctx, -wpx * 0.3, -hpx * 0.95, wpx * 0.6, hpx * 0.42, Math.max(2, wpx * 0.1));
      ctx.fill();
      if (oncoming) {
        // headlights
        ctx.fillStyle = '#FEF3C7';
        ctx.shadowColor = '#FDE68A';
        ctx.shadowBlur = wpx * 0.4;
        ctx.beginPath();
        ctx.arc(-wpx * 0.3, -hpx * 0.16, wpx * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(wpx * 0.3, -hpx * 0.16, wpx * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // tail lights
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = wpx * 0.3;
        ctx.fillRect(-wpx * 0.42, -hpx * 0.2, wpx * 0.2, hpx * 0.12);
        ctx.fillRect(wpx * 0.22, -hpx * 0.2, wpx * 0.2, hpx * 0.12);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    function drawCoin(x, y, wpx, time, seed) {
      const r = Math.max(3, wpx);
      const spin = Math.abs(Math.cos(time * 4 + seed));
      ctx.save();
      ctx.translate(x, y - r * 1.4);
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = r * 1.6;
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1.5, r * spin), r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, r * spin * 0.5), r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawPlayer(w, h, time) {
      const s = CAM_DEPTH / PLAYER_Z;
      const pw = s * PLAYER_W * w / 2;
      const ph = pw * 0.6;
      const cx = w / 2;
      const baseY = h * 0.975;
      const tilt = (LANES[lane] - playerX) * 0.45;
      ctx.save();
      ctx.translate(cx, baseY);
      ctx.rotate(tilt);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, pw * 0.55, ph * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      // exhaust flames
      if (!crashed) {
        const f = 0.6 + Math.random() * 0.5;
        ctx.fillStyle = 'rgba(6,182,212,' + (0.5 * f) + ')';
        ctx.beginPath();
        ctx.moveTo(-pw * 0.22, -ph * 0.1);
        ctx.lineTo(-pw * 0.22 - pw * 0.22 * f, -ph * 0.05);
        ctx.lineTo(-pw * 0.22, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pw * 0.22, -ph * 0.1);
        ctx.lineTo(pw * 0.22 + pw * 0.22 * f, -ph * 0.05);
        ctx.lineTo(pw * 0.22, 0);
        ctx.closePath();
        ctx.fill();
      }
      // body
      ctx.shadowColor = '#8B5CF6';
      ctx.shadowBlur = 26;
      ctx.fillStyle = '#8B5CF6';
      roundRect(ctx, -pw / 2, -ph, pw, ph * 0.8, Math.max(3, pw * 0.13));
      ctx.fill();
      ctx.shadowBlur = 0;
      // cabin
      ctx.fillStyle = '#0B0E1A';
      roundRect(ctx, -pw * 0.28, -ph * 0.95, pw * 0.56, ph * 0.4, Math.max(2, pw * 0.09));
      ctx.fill();
      // windshield glow
      ctx.fillStyle = 'rgba(6,182,212,0.85)';
      roundRect(ctx, -pw * 0.24, -ph * 0.9, pw * 0.48, ph * 0.2, Math.max(2, pw * 0.07));
      ctx.fill();
      // spoiler
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(-pw * 0.5, -ph * 0.98, pw, Math.max(2, ph * 0.1));
      // tail lights
      if (!crashed) {
        ctx.fillStyle = '#F87171';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 12;
        ctx.fillRect(-pw * 0.44, -ph * 0.2, pw * 0.18, ph * 0.12);
        ctx.fillRect(pw * 0.26, -ph * 0.2, pw * 0.18, ph * 0.12);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    function drawChip(x, y, text, color, align) {
      ctx.font = '700 13px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(text).width;
      const padX = 10, padY = 6;
      const cw = tw + padX * 2;
      const ch = 24;
      let rx = x;
      if (align === 'right') rx = x - cw;
      else if (align === 'center') rx = x - cw / 2;
      ctx.fillStyle = 'rgba(11,14,26,0.72)';
      roundRect(ctx, rx, y, cw, ch, 8);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, rx + padX, y + ch / 2 + 1);
    }

    function draw(dt, time) {
      const w = cv.w, h = cv.h;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(0, 0, w, h);

      const horizon = h * 0.5;
      const base = Math.floor(pos / SEG);
      const shift = -segCurve(base) * 60 - playerX * 90;

      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake * 14, (Math.random() - 0.5) * shake * 10);
      }

      drawSky(w, h, horizon, shift);
      const farX = drawRoad(w, h, time);
      void farX;

      /* objects: far to near */
      const visible = [];
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        if (c.z > pos + 40 && c.z < pos + DRAW * SEG) {
          const p = objPos(c.z, c.x);
          if (p) visible.push({ z: c.z, kind: 'car', p: p, o: c });
        }
      }
      for (let i = 0; i < coins.length; i++) {
        const co = coins[i];
        if (co.z > pos + 40 && co.z < pos + DRAW * SEG) {
          const p = objPos(co.z, co.x);
          if (p) visible.push({ z: co.z, kind: 'coin', p: p, o: co });
        }
      }
      visible.sort((a, b) => b.z - a.z);
      for (let i = 0; i < visible.length; i++) {
        const v = visible[i];
        if (v.kind === 'car') {
          const wpx = v.p.w * CAR_W / ROAD_W;
          if (wpx > 3) drawCar(v.p.x, v.p.y, wpx, v.o.color, time, v.o.seed, true);
        } else {
          const wpx = v.p.w * 300 / ROAD_W;
          if (wpx > 2) drawCoin(v.p.x, v.p.y, wpx, time, v.o.seed);
        }
      }

      drawPlayer(w, h, time);

      /* particles & floats */
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
      }
      ctx.globalAlpha = 1;
      ctx.font = '800 20px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < floats.length; i++) {
        const f = floats[i];
        ctx.globalAlpha = Math.max(0, f.life / f.max);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      /* HUD */
      const kmh = Math.round(speed * 0.036);
      drawChip(12, 12, kmh + ' км/ч', '#06B6D4', 'left');
      drawChip(w / 2, 12, Math.floor(pos / 100) + ' м', '#22C55E', 'center');
      drawChip(w - 12, 12, 'МОНЕТЫ +' + coinScore, '#F59E0B', 'right');

      if (flash > 0) {
        ctx.fillStyle = 'rgba(239,68,68,' + Math.min(0.4, flash * 0.4) + ')';
        ctx.fillRect(0, 0, w, h);
      }
    }

    /* ---------- boot ---------- */
    reset();
    const loop = api.loop(update, draw);

    return {
      destroy() {
        loop.stop();
        cv.destroy();
      }
    };
  });
})();
