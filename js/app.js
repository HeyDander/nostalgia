/* ============================================================
   RetroNova — App bootstrap: layout, auth gate, navigation
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const $ = sel => document.querySelector(sel);

  /* ---------- Avatar helpers ---------- */
  function avatarHTML(nick, size, equippedFrame) {
    const letter = (nick || '?').trim().charAt(0).toUpperCase();
    const p = RN.db.profile();
    const frame = equippedFrame || (p && RN.shop.byId(p.equipped.frame) && RN.shop.byId(p.equipped.frame).val) || '';
    return '<div class="avatar ' + (size || '') + ' ' + (frame || '') + '">' + RN.esc(letter) + '</div>';
  }

  function renderUserChrome() {
    const p = RN.db.profile();
    const sideAvatar = $('#sideAvatar');
    const sideNick = $('#sideNick');
    const sideLvl = $('#sideLvl');
    const sideXp = $('#sideXp');
    const coinValue = $('#coinValue');
    const btnLogin = $('#btnLogin');

    if (!p) {
      if (sideAvatar) sideAvatar.textContent = '?';
      if (sideNick) sideNick.textContent = 'Гость';
      if (sideLvl) sideLvl.textContent = 'Войдите по нику';
      if (sideXp) sideXp.style.width = '0%';
      if (coinValue) coinValue.textContent = '0';
      if (btnLogin) btnLogin.textContent = '👤';
      return;
    }
    const lvl = RN.economy.levelOf(p.xp);
    const curBase = RN.economy.xpForLevel(lvl);
    const nextBase = RN.economy.xpForLevel(lvl + 1);
    const pct = Math.max(0, Math.min(100, Math.round((p.xp - curBase) / Math.max(1, nextBase - curBase) * 100)));

    if (sideAvatar) {
      sideAvatar.textContent = p.nick.charAt(0).toUpperCase();
      sideAvatar.className = 'avatar ' + (RN.shop.byId(p.equipped.frame) ? RN.shop.byId(p.equipped.frame).val : '');
      if (RN.shop.byId(p.equipped.frame) && RN.shop.byId(p.equipped.frame).animate) sideAvatar.classList.add('animated-frame');
    }
    if (sideNick) sideNick.textContent = p.nick;
    if (sideLvl) sideLvl.textContent = 'Уровень ' + lvl + ' · ' + RN.fmtNum(p.coins) + ' Coins';
    if (sideXp) sideXp.style.width = pct + '%';
    if (coinValue) coinValue.textContent = RN.fmtNum(p.coins);
    if (btnLogin) btnLogin.textContent = '👤';

    // quest badge
    const qb = $('#navQuestBadge');
    const dot = $('#questDot');
    try {
      const qp = RN.quests.progress(p);
      const claimable = qp.list ? qp.list.filter(q => q.done && !q.claimed).length : 0;
      if (qb) { qb.hidden = claimable === 0; qb.textContent = claimable; }
      if (dot) dot.hidden = claimable === 0;
    } catch (e) { /* noop */ }
  }
  RN.renderUserChrome = renderUserChrome;

  /* ---------- Login gate ---------- */
  let loginOpen = false;

  function showLogin(force) {
    if (loginOpen) return;
    loginOpen = true;
    const profiles = RN.db.allProfiles();
    const existing = profiles.slice(0, 6);

    const scrim = document.createElement('div');
    scrim.className = 'login-scrim';
    scrim.innerHTML =
      '<div class="login-card">' +
      '<div class="lc-logo">🎮</div>' +
      '<h2>Добро пожаловать в <span class="grad-text">RetroNova</span></h2>' +
      '<p class="lc-sub">Введите ник — и весь прогресс сохранится на этом устройстве</p>' +
      '<div class="field">' +
      '<label for="loginNick">Ваш никнейм</label>' +
      '<input class="input" id="loginNick" maxlength="20" placeholder="Например, NovaPlayer" autocomplete="off">' +
      '<div class="err" id="loginErr"></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-lg btn-block" id="loginGo">Войти</button>' +
      (existing.length
        ? '<div class="existing-nicks">' + existing.map(x =>
            '<button class="nick-chip" data-nick="' + RN.esc(x.p.nick) + '"><span class="avatar sm">' + RN.esc(x.p.nick.charAt(0).toUpperCase()) + '</span>' + RN.esc(x.p.nick) + '</button>'
          ).join('') + '</div>'
        : '') +
      '<div class="login-note">🔐 <b>Важно:</b> вход по нику — удобно, но не защищает аккаунт от захвата другим человеком на этом устройстве. Для настоящей защиты нужны пароль/серверная авторизация. Не используйте важные пароли в нике.</div>' +
      '</div>';

    document.body.appendChild(scrim);
    const input = scrim.querySelector('#loginNick');
    const err = scrim.querySelector('#loginErr');
    const field = scrim.querySelector('.field');
    setTimeout(() => input.focus(), 80);

    function fail(msg) {
      field.classList.add('invalid');
      err.textContent = msg;
    }

    async function submit(nick) {
      const val = String(nick || input.value || '').trim();
      if (!val) return fail('Введите ник');
      field.classList.remove('invalid');

      if (RN.db.hasProfile(val)) {
        // existing profile: login (never overwrite)
        const res = RN.db.login(val);
        if (!res.ok) return fail(res.error);
        close(true);
        return;
      }

      // new profile
      const res = RN.db.createProfile(val);
      if (!res.ok) return fail(res.error);
      close(true);
    }

    function close(changed) {
      scrim.style.opacity = '0';
      setTimeout(() => scrim.remove(), 300);
      loginOpen = false;
      if (changed) {
        afterLogin();
      } else if (force && !RN.db.profile()) {
        // force close not allowed without profile — reopen
        showLogin(true);
      }
    }

    scrim.querySelector('#loginGo').addEventListener('click', () => submit());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    scrim.querySelectorAll('[data-nick]').forEach(b => {
      b.addEventListener('click', () => submit(b.getAttribute('data-nick')));
    });

    // disallow closing the gate if there is no profile yet
    if (!force) {
      // no close button — user must log in
    }
  }
  RN.showLogin = showLogin;

  function afterLogin() {
    RN.economy.syncLevel();
    const p = RN.db.profile();
    if (p) {
      RN.quests.ensure(p);
      RN.achievements.checkAll(p);
      RN.skins.apply(p);
    }
    renderUserChrome();
    RN.router.render();
  }

  /* ---------- Sidebar / mobile ---------- */
  function setupChrome() {
    const sidebar = $('#sidebar');
    const scrim = $('#scrim');
    const burger = $('#burger');

    function toggleSidebar(open) {
      sidebar.classList.toggle('open', open);
      scrim.classList.toggle('show', open);
    }
    burger.addEventListener('click', () => toggleSidebar(!sidebar.classList.contains('open')));
    scrim.addEventListener('click', () => toggleSidebar(false));
    document.addEventListener('rn:navigate', () => toggleSidebar(false));

    // clicking nav links plays sound
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => RN.sfx.play('click'));
    });

    $('#sideUser').addEventListener('click', () => {
      if (RN.db.profile()) RN.router.go('profile');
      else showLogin(true);
    });

    $('#btnLogin').addEventListener('click', () => {
      if (RN.db.profile()) RN.router.go('profile');
      else showLogin(true);
    });

    $('#coinPill').addEventListener('click', () => RN.router.go('shop'));
    $('#btnQuests').addEventListener('click', () => RN.router.go('quests'));

    // global search
    const search = $('#globalSearch');
    search.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = search.value.trim();
        RN.router.go('games' + (q ? '?q=' + encodeURIComponent(q) : ''));
        search.blur();
      }
    });

    // coin events → update chrome
    document.addEventListener('rn:coins', () => renderUserChrome());
    document.addEventListener('rn:quests', () => renderUserChrome());
    document.addEventListener('rn:achievement', () => {
      RN.sfx.play('achievement');
      renderUserChrome();
    });
    document.addEventListener('rn:gameover', () => renderUserChrome());

    // play nav sounds
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn, .pill, .tab, .icon-btn');
      if (btn && !btn.classList.contains('btn-ghost')) RN.sfx.play('click');
    });
  }

  /* ---------- Routes ---------- */
  function setupRoutes() {
    RN.router.register('home', RN.pages.home);
    RN.router.register('games', RN.pages.games);
    RN.router.register('game/:id', RN.pages.game);
    RN.router.register('profile', RN.pages.profile);
    RN.router.register('shop', RN.pages.shop);
    RN.router.register('inventory', RN.pages.inventory);
    RN.router.register('leaderboard', RN.pages.leaderboard);
    RN.router.register('achievements', RN.pages.achievements);
    RN.router.register('quests', RN.pages.quests);
    RN.router.register('editor', RN.pages.editor);
    RN.router.register('editor/:projectId', RN.pages.editor);
    RN.router.register('projects', RN.pages.projects);
    RN.router.register('community', RN.pages.community);
    RN.router.register('play/:id', RN.pages.communityPlay);
    RN.router.register('settings', RN.pages.settings);
  }

  /* ---------- Boot ---------- */
  function boot() {
    // seed a few demo community games on first launch (real playable examples)
    seedCommunity();

    setupChrome();
    setupRoutes();

    const p = RN.db.profile();
    RN.economy.syncLevel();
    if (p) {
      // daily login reward when returning on a new day
      if (p.lastLogin !== RN.todayKey()) {
        RN.db.login(RN.db.currentNick());
      }
      RN.skins.apply(p);
      // ensure quests exist for today
      RN.quests.ensure(p);
      renderUserChrome();
      RN.achievements.checkAll(p);
      RN.db.save();
    } else {
      RN.skins.apply(null);
      renderUserChrome();
    }

    RN.router.render();

    if (!p) {
      showLogin(true);
    } else {
      // welcome back toast with streak info (once per session)
      if (!window.__rnWelcomed) {
        window.__rnWelcomed = true;
        setTimeout(() => {
          const prof = RN.db.profile();
          if (prof) RN.ui.toast('С возвращением, ' + prof.nick + '!', 'success', { duration: 2600 });
        }, 600);
      }
    }
  }

  /* ---------- Seed community with example games (first run) ---------- */
  function seedCommunity() {
    const c = RN.db.community();
    if (c.seeded) return;
    c.seeded = true;
    const now = Date.now();

    const examples = [
      {
        id: 'seed_neon_snake',
        title: 'Neon Snake',
        description: 'Мини-змейка от команды RetroNova — пример того, что можно собрать в конструкторе за 5 минут.',
        cover: '🐍', coverBg: 'linear-gradient(150deg,#052e16,#0b0e1a)',
        author: 'RetroNova Team',
        status: 'approved',
        likes: 12, plays: 34, favorites: 0,
        createdAt: now - 86400000 * 3, publishedAt: now - 86400000 * 3,
        reports: 0,
        files: [
          { name: 'index.html', content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Neon Snake</title><style>body{margin:0;background:#05080f;color:#67e8f9;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:12px}canvas{background:#0a1220;border:1px solid #164e63;border-radius:12px;box-shadow:0 0 30px rgba(6,182,212,.25);max-width:92vw;height:auto}b{color:#22d3ee}</style></head><body><div>Счёт: <b id="s">0</b></div><canvas id="c" width="360" height="360"></canvas><div style="font-size:11px;color:#475569">стрелки / свайп</div><script>const c=document.getElementById("c"),x=c.getContext("2d"),s=document.getElementById("s");const G=18,N=20;let sn,dir,food,sc,dead,t;function rs(){sn=[{x:9,y:10},{x:8,y:10}];dir={x:1,y:0};sc=0;s.textContent=0;dead=false;fd();clearInterval(t);t=setInterval(st,140)}function fd(){food={x:Math.floor(Math.random()*N),y:Math.floor(Math.random()*N)}}function st(){if(dead)return;const h={x:sn[0].x+dir.x,y:sn[0].y+dir.y};if(h.x<0||h.y<0||h.x>=N||h.y>=N||sn.some(q=>q.x===h.x&&q.y===h.y)){dead=true;dr();return}sn.unshift(h);if(h.x===food.x&&h.y===food.y){sc+=10;s.textContent=sc;fd()}else sn.pop();dr()}function dr(){x.fillStyle="#0a1220";x.fillRect(0,0,c.width,c.height);x.fillStyle="#f59e0b";x.beginPath();x.arc(food.x*G+9,food.y*G+9,5,0,7);x.fill();sn.forEach((q,i)=>{x.fillStyle=i?"#0e7490":"#22d3ee";x.fillRect(q.x*G+1,q.y*G+1,G-2,G-2)});if(dead){x.fillStyle="rgba(0,0,0,.7)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#67e8f9";x.textAlign="center";x.font="bold 20px monospace";x.fillText("Игра окончена: "+sc,c.width/2,c.height/2)}}addEventListener("keydown",e=>{if(e.key==="ArrowLeft"&&dir.x===0)dir={x:-1,y:0};if(e.key==="ArrowRight"&&dir.x===0)dir={x:1,y:0};if(e.key==="ArrowUp"&&dir.y===0)dir={x:0,y:-1};if(e.key==="ArrowDown"&&dir.y===0)dir={x:0,y:1}});c.addEventListener("click",()=>{if(dead)rs()});rs();<\/script></body></html>' }
        ]
      },
      {
        id: 'seed_bounce',
        title: 'Bounce Lab',
        description: 'Прыгающий мяч с изменяемой гравитацией — маленький эксперимент с физикой.',
        cover: '🟣', coverBg: 'linear-gradient(150deg,#2e1065,#0b0e1a)',
        author: 'NovaLab',
        status: 'approved',
        likes: 8, plays: 21, favorites: 0,
        createdAt: now - 86400000 * 2, publishedAt: now - 86400000 * 2,
        reports: 0,
        files: [
          { name: 'index.html', content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bounce Lab</title><style>body{margin:0;height:100vh;background:radial-gradient(circle at 50% 20%,#1e1b4b,#05060d);display:flex;align-items:center;justify-content:center;overflow:hidden}canvas{width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>const c=document.getElementById("c"),x=c.getContext("2d");function rs(){c.width=innerWidth;c.height=innerHeight}rs();addEventListener("resize",rs);let b={x:innerWidth/2,y:100,vx:2.4,vy:0,r:18};let g=0.22;addEventListener("pointerdown",e=>{g=0.1+Math.random()*0.35;b.vx=(Math.random()-0.5)*6});function f(){x.fillStyle="rgba(5,6,13,.28)";x.fillRect(0,0,c.width,c.height);b.vy+=g;b.x+=b.vx;b.y+=b.vy;if(b.x<b.r||b.x>c.width-b.r){b.vx*=-0.98;b.x=Math.max(b.r,Math.min(c.width-b.r,b.x))}if(b.y>c.height-b.r){b.y=c.height-b.r;b.vy*=-0.86}if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy)}x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fillStyle="#a78bfa";x.shadowColor="#8b5cf6";x.shadowBlur=28;x.fill();x.shadowBlur=0;x.font="13px monospace";x.fillStyle="rgba(199,208,224,.6)";x.fillText("гравитация: "+g.toFixed(2)+" · клик, чтобы изменить",16,26);requestAnimationFrame(f)}f();<\/script></body></html>' }
        ]
      }
    ];

    examples.forEach(g => {
      if (!c.games.find(x => x.id === g.id)) c.games.push(g);
    });
    RN.db.save();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
