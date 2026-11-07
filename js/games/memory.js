/* ============================================================
   RetroNova — Memory Cards (Пары карт)
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;

  const LEVELS = {
    easy:   { label: 'Лёгкий · 4×3',  cols: 4, rows: 3, pairs: 6 },
    normal: { label: 'Средний · 4×4', cols: 4, rows: 4, pairs: 8 },
    hard:   { label: 'Сложный · 6×4', cols: 6, rows: 4, pairs: 12 }
  };
  let level = 'normal';

  const EMOJI = ['🍕','🚀','🐼','🎸','🌈','🔥','⚽','🍩','🐙','🌵','🎧','🎲','🧊','🦊','🍒','⚡'];

  const STYLE = [
    '.mem-root{position:absolute;inset:0;display:flex;flex-direction:column;gap:9px;padding:10px;',
    '  background:#0B0E1A;font-family:var(--font-body);align-items:center;overflow:hidden;}',
    '.mem-bar{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;}',
    '.mem-sel{width:auto;max-width:100%;padding:7px 30px 7px 12px;font-size:13px;border-radius:10px;',
    '  background:rgba(0,0,0,.32);border:1px solid var(--border);color:var(--text);cursor:pointer;}',
    '.mem-pill{display:inline-flex;gap:6px;align-items:center;padding:6px 13px;border-radius:30px;',
    '  background:var(--glass);border:1px solid var(--border);font-size:13px;font-weight:700;',
    '  font-family:var(--font-head);color:var(--text-2);}',
    '.mem-pill b{color:#67E8F9;font-variant-numeric:tabular-nums;min-width:30px;text-align:right;}',
    '.mem-grid{display:grid;gap:clamp(5px,1.4vw,10px);width:min(100%, 520px);flex:0 1 auto;',
    '  grid-template-columns:repeat(var(--cols),1fr);user-select:none;}',
    '.mem-card{position:relative;aspect-ratio:.82;perspective:700px;cursor:pointer;} ',
    '.mem-inner{position:absolute;inset:0;transform-style:preserve-3d;',
    '  transition:transform .4s var(--ease);border-radius:12px;}',
    '.mem-card.flip .mem-inner{transform:rotateY(180deg);}',
    '.mem-face{position:absolute;inset:0;backface-visibility:hidden;display:flex;align-items:center;',
    '  justify-content:center;border-radius:12px;font-size:clamp(20px,7vw,34px);}',
    '.mem-back{background:linear-gradient(150deg,#1E2440,#151A2E);border:1px solid rgba(139,92,246,.4);',
    '  box-shadow:inset 0 0 18px rgba(139,92,246,.14);color:rgba(139,92,246,.6);font-weight:800;}',
    '.mem-back:after{content:"?";font-family:var(--font-head);font-size:clamp(16px,5vw,26px);}',
    '.mem-front{background:linear-gradient(150deg,rgba(6,182,212,.2),rgba(11,14,26,.9));',
    '  border:1px solid rgba(6,182,212,.45);transform:rotateY(180deg);}',
    '.mem-card.ok .mem-front{border-color:#22C55E;box-shadow:0 0 14px rgba(34,197,94,.45);',
    '  animation:memOK .35s var(--ease);}',
    '.mem-card.no .mem-front{border-color:#EF4444;animation:memShake .3s;}',
    '@keyframes memOK{0%{transform:rotateY(180deg) scale(1)}50%{transform:rotateY(180deg) scale(1.1)}100%{transform:rotateY(180deg) scale(1)}}',
    '@keyframes memShake{0%,100%{transform:rotateY(180deg) translateX(0)}25%{transform:rotateY(180deg) translateX(-5px)}75%{transform:rotateY(180deg) translateX(5px)}}',
    '.mem-hint{font-size:12.5px;color:var(--muted);text-align:center;}',
    '.mem-progress{font-size:13px;font-weight:700;color:#86EFAC;font-family:var(--font-head);}'
  ].join('');

  RN.games.register({
    id: 'memory',
    title: 'Memory Cards',
    emoji: '🃏',
    genre: 'puzzle',
    year: 1966,
    touch: 'tap',
    controls: 'Клик по карте — переворот · R — заново · Esc — пауза',
    desc: 'Запоминайте расположение эмодзи и открывайте все пары карт как можно быстрее.',
    goodAt: 3800
  }, function (api) {
    const stage = api.stage;
    const L = LEVELS[level] || LEVELS.normal;

    const style = document.createElement('style');
    style.setAttribute('data-game-style', 'memory');
    style.textContent = STYLE;
    document.head.appendChild(style);

    stage.innerHTML =
      '<div class="mem-root">' +
      '  <div class="mem-bar">' +
      '    <select class="mem-sel" data-mem="level"></select>' +
      '    <span class="mem-pill">Ходы <b data-mem="moves">0</b></span>' +
      '    <span class="mem-pill">⏱ <b data-mem="time">0:00</b></span>' +
      '  </div>' +
      '  <div class="mem-progress" data-mem="prog">Пар: 0 / ' + L.pairs + '</div>' +
      '  <div class="mem-grid" data-mem="grid"></div>' +
      '  <div class="mem-hint">Находите одинаковые пары — открытые карты остаются</div>' +
      '</div>';

    const sel = stage.querySelector('[data-mem="level"]');
    Object.keys(LEVELS).forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = LEVELS[k].label;
      if (k === level) o.selected = true;
      sel.appendChild(o);
    });

    const grid = stage.querySelector('[data-mem="grid"]');
    const movesEl = stage.querySelector('[data-mem="moves"]');
    const timeEl = stage.querySelector('[data-mem="time"]');
    const progEl = stage.querySelector('[data-mem="prog"]');

    let cards, first, second, lock, moves, found, t, started, over, lastSec;
    const timers = [];
    function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }

    function fmtTime(s) {
      const m = Math.floor(s / 60), ss = Math.floor(s % 60);
      return m + ':' + (ss < 10 ? '0' : '') + ss;
    }

    function build() {
      grid.innerHTML = '';
      grid.style.setProperty('--cols', String(L.cols));
      const idx = [];
      for (let i = 0; i < L.pairs; i++) idx.push(i, i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
      }
      cards = idx.map((p, i) => ({
        pair: p, el: null, open: false, matched: false
      }));
      const frag = document.createDocumentFragment();
      cards.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'mem-card';
        d.dataset.i = String(i);
        d.innerHTML = '<div class="mem-inner">' +
          '<div class="mem-face mem-back"></div>' +
          '<div class="mem-face mem-front">' + EMOJI[c.pair % EMOJI.length] + '</div>' +
          '</div>';
        c.el = d;
        frag.appendChild(d);
      });
      grid.appendChild(frag);

      first = null; second = null; lock = false; moves = 0; found = 0;
      t = 0; started = false; over = false; lastSec = -1;
      movesEl.textContent = '0';
      timeEl.textContent = '0:00';
      progEl.textContent = 'Пар: 0 / ' + L.pairs;
      api.setScore(0);
    }

    function liveScore() {
      return Math.max(0, 5000 - moves * 50 - Math.floor(t) * 10);
    }

    function onCardClick(e) {
      if (over || lock || api.isPaused()) return;
      const el = e.target.closest('.mem-card');
      if (!el) return;
      const c = cards[parseInt(el.dataset.i, 10)];
      if (!c || c.open || c.matched) return;
      if (!started) { started = true; }
      c.open = true;
      el.classList.add('flip');
      api.sfx('select');

      if (!first) { first = { c: c, el: el }; return; }

      second = { c: c, el: el };
      moves++;
      movesEl.textContent = String(moves);
      lock = true;

      if (first.c.pair === second.c.pair) {
        const a = first, b = second;
        a.c.matched = b.c.matched = true;
        a.el.classList.add('ok'); b.el.classList.add('ok');
        found++;
        progEl.textContent = 'Пар: ' + found + ' / ' + L.pairs;
        api.sfx('coin');
        api.setScore(liveScore());
        first = null; second = null;
        later(function () { lock = false; }, 340);
        if (found >= L.pairs) finish();
      } else {
        const a = first, b = second;
        a.el.classList.add('no'); b.el.classList.add('no');
        api.sfx('error');
        later(function () {
          a.el.classList.remove('flip', 'no');
          b.el.classList.remove('flip', 'no');
          a.c.open = false; b.c.open = false;
          first = null; second = null;
          lock = false;
        }, 780);
      }
    }

    function finish() {
      if (over) return;
      over = true;
      const score = liveScore();
      api.setScore(score);
      later(function () {
        api.gameOver(score, {
          win: true,
          winTitle: 'Все пары найдены!',
          icon: '🃏',
          message: 'Ходов: ' + moves + ' · Время: ' + fmtTime(t)
        });
      }, 520);
    }

    grid.addEventListener('click', onCardClick);
    sel.addEventListener('change', function () {
      level = sel.value;
      api.sfx('click');
      api.restart();
    });

    const loop = api.loop(function (dt) {
      if (!started || over) return;
      t += dt;
      const s = Math.floor(t);
      if (s !== lastSec) {
        lastSec = s;
        timeEl.textContent = fmtTime(t);
        api.setScore(liveScore());
      }
    }, null);

    build();

    return {
      destroy() {
        loop.stop();
        timers.forEach(id => clearTimeout(id));
        timers.length = 0;
        if (style.parentNode) style.parentNode.removeChild(style);
        stage.innerHTML = '';
      }
    };
  });
})();
