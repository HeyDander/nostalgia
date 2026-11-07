/* ============================================================
   RetroNova — Router: hash-based SPA router
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const routes = [];
  let current = null;   // { name, params }
  let currentCleanup = null;

  function register(pattern, handler) {
    // pattern: 'game/:id', 'home', 'profile'
    const parts = pattern.split('/').filter(Boolean);
    routes.push({ parts, handler, pattern });
  }

  function parse(hash) {
    const clean = (hash || '').replace(/^#\/?/, '').split('?')[0].split('#')[0];
    const segs = clean.split('/').filter(Boolean);
    for (const r of routes) {
      if (r.parts.length !== segs.length) continue;
      const params = {};
      let match = true;
      for (let i = 0; i < r.parts.length; i++) {
        const p = r.parts[i];
        if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segs[i]);
        else if (p !== segs[i]) { match = false; break; }
      }
      if (match) return { route: r, params };
    }
    return null;
  }

  function go(path, replace) {
    const target = '#/' + String(path || '').replace(/^#?\/?/, '');
    if (location.hash === target) { render(); return; }
    if (replace) history.replaceState(null, '', target);
    else location.hash = target;
    if (replace) render();
  }

  function render() {
    const found = parse(location.hash);
    const view = document.getElementById('view');
    if (!view) return;

    // teardown previous page
    if (typeof currentCleanup === 'function') {
      try { currentCleanup(); } catch (e) { console.error('cleanup error', e); }
    }
    currentCleanup = null;

    if (!found) {
      // fallback: home
      const home = routes.find(r => r.pattern === 'home') || routes[0];
      if (home) { activate(home, {}); return; }
      view.innerHTML = '<div class="page"><h2>404</h2></div>';
      return;
    }
    activate(found.route, found.params);
  }

  function activate(route, params) {
    const view = document.getElementById('view');
    current = { pattern: route.pattern, params };
    document.dispatchEvent(new CustomEvent('rn:navigate', { detail: current }));
    try {
      const res = route.handler(view, params);
      if (typeof res === 'function') currentCleanup = res;
    } catch (e) {
      console.error('route error', e);
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">⚠️</div>' +
        '<h3>Ошибка загрузки страницы</h3><p class="muted">' + RN.esc(e.message) + '</p></div></div>';
    }
    // scroll top
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    updateActiveNav(route.pattern, params);
  }

  const NAV_MAP = [
    { test: p => p === 'home', sel: '[data-nav="home"]' },
    { test: p => p === 'games', sel: '[data-nav="games"]' },
    { test: p => p === 'game', sel: '[data-nav="games"]' },
    { test: p => p === 'profile', sel: '[data-nav="profile"]' },
    { test: p => p === 'leaderboard', sel: '[data-nav="leaderboard"]' },
    { test: p => p === 'shop', sel: '[data-nav="shop"]' },
    { test: p => p === 'quests', sel: '[data-nav="quests"]' },
    { test: p => p === 'editor', sel: '[data-nav="editor"]' },
    { test: p => p === 'community', sel: '[data-nav="community"]' },
    { test: p => p === 'projects', sel: '[data-nav="editor"]' },
    { test: p => p === 'achievements', sel: '[data-nav="achievements"]' },
    { test: p => p === 'settings', sel: '[data-nav="settings"]' },
    { test: p => p === 'inventory', sel: '[data-nav="shop"]' }
  ];

  function updateActiveNav(pattern, params) {
    document.querySelectorAll('.nav-item, .bottom-nav a').forEach(el => el.classList.remove('active'));
    NAV_MAP.forEach(m => {
      if (m.test(pattern)) {
        document.querySelectorAll(m.sel).forEach(el => el.classList.add('active'));
      }
    });
    const titles = {
      home: 'Главная', games: 'Все игры', game: 'Игра', profile: 'Профиль',
      shop: 'Магазин', inventory: 'Инвентарь', leaderboard: 'Лидеры',
      achievements: 'Достижения', quests: 'Задания', editor: 'Конструктор',
      projects: 'Мои проекты', community: 'Игры сообщества', settings: 'Настройки'
    };
    const t = document.getElementById('pageTitle');
    if (t) t.textContent = titles[pattern] || 'RetroNova';
  }

  window.addEventListener('hashchange', render);

  RN.router = { register, go, render, get current() { return current; } };
})();
