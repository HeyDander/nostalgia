/* ============================================================
   RetroNova — Page: Home
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  /* Shared components */
  RN.components = RN.components || {};

  RN.components.gameCard = function (meta, opts) {
    opts = opts || {};
    const p = RN.db.profile();
    const best = p && p.best[meta.id] ? p.best[meta.id] : 0;
    const plays = p && p.plays[meta.id] ? p.plays[meta.id] : 0;
    const genreNames = { arcade: 'Аркада', puzzle: 'Головоломка', action: 'Экшен', sports: 'Спорт', casual: 'Casual', strategy: 'Стратегия', simulation: 'Симулятор', race: 'Гонки' };
    return '<a class="game-card" href="#/game/' + meta.id + '" data-game="' + meta.id + '">' +
      '<div class="gc-cover">' +
      (opts.badge ? '<span class="gc-badge ' + (opts.badgeClass || '') + '">' + opts.badge + '</span>' : '') +
      '<span class="gc-emoji">' + meta.emoji + '</span>' +
      '<span class="gc-play">▶</span>' +
      '</div>' +
      '<div class="gc-body">' +
      '<div class="gc-title">' + RN.esc(meta.title) + '</div>' +
      '<div class="gc-desc">' + RN.esc(meta.desc) + '</div>' +
      '<div class="gc-meta">' +
      '<span class="chip">' + (genreNames[meta.genre] || meta.genre) + '</span>' +
      (best ? '<span class="gc-best">🏆 ' + RN.fmtNum(best) + '</span>' : '') +
      (plays && !best ? '<span class="gc-best muted">' + plays + ' игр</span>' : '') +
      '</div></div></a>';
  };

  RN.components.statCard = function (ico, val, label) {
    return '<div class="stat-card"><span class="sc-ico">' + ico + '</span>' +
      '<span class="sc-val">' + val + '</span><span class="sc-label">' + label + '</span></div>';
  };

  RN.components.sectionHead = function (title, ico, linkText, linkHash) {
    return '<div class="section-head"><h2>' + (ico ? '<span class="ico">' + ico + '</span>' : '') + title + '</h2>' +
      (linkText ? '<a class="link" href="' + linkHash + '">' + linkText + ' →</a>' : '') + '</div>';
  };

  /* ---------- Home page ---------- */
  RN.pages.home = function (view) {
    const p = RN.db.profile();
    const all = RN.games.all();
    const profiles = RN.db.allProfiles();

    const plays = p ? p.plays : {};
    const recent = Object.keys(plays)
      .filter(id => RN.games.get(id))
      .sort((a, b) => (plays[b] || 0) - (plays[a] || 0))
      .slice(0, 4)
      .map(id => RN.games.get(id));

    const popular = all.slice().sort((a, b) => {
      const pa = (p && p.plays[a.id]) || 0;
      const pb = (p && p.plays[b.id]) || 0;
      return pb - pa || a.title.localeCompare(b.title);
    }).slice(0, 6);

    const fresh = all.slice(-6).reverse();
    const random = all.slice().sort(() => Math.random() - 0.5).slice(0, 4);

    const totalGamesPlayed = profiles.reduce((s, x) => s + (x.p.stats.gamesPlayed || 0), 0);
    const totalCoins = profiles.reduce((s, x) => s + (x.p.coins || 0), 0);

    const qp = p ? RN.quests.progress(p) : { done: 0, total: 3 };
    const achCount = p ? RN.achievements.count(p) : 0;

    view.innerHTML =
      '<div class="page">' +
      // HERO
      '<section class="hero">' +
      '<span class="hero-float f1">👾</span><span class="hero-float f2">🕹️</span><span class="hero-float f3">⭐</span>' +
      '<div class="hero-inner">' +
      '<span class="chip purple" style="margin-bottom:14px">✨ ' + all.length + ' классических игр · скины · конструктор</span>' +
      '<h1>Ностальгия.<br><span class="grad-text">Новый уровень.</span></h1>' +
      '<p>Играй в легендарные аркады, зарабатывай Coins, собирай скины и создавай собственные игры прямо в браузере.</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary btn-lg" href="#/games">🎮 Играть сейчас</a>' +
      '<a class="btn btn-lg" href="#/editor">🛠️ Создать игру</a>' +
      '</div>' +
      '<div class="hero-badges">' +
      '<span class="hero-badge">🕹️ <b>' + all.length + '</b> игр</span>' +
      '<span class="hero-badge">🪙 <b>' + RN.fmtNum(totalCoins) + '</b> в экономике</span>' +
      '<span class="hero-badge">🎯 <b>' + RN.fmtNum(totalGamesPlayed) + '</b> сыграно</span>' +
      '<span class="hero-badge">👤 <b>' + profiles.length + '</b> игроков</span>' +
      '</div></div></section>' +

      // DAILY
      (p ? '<div class="daily-banner" style="margin-bottom:26px">' +
        '<span class="db-ico">📋</span>' +
        '<div class="db-body"><div class="db-t">Ежедневные задания — ' + qp.done + '/' + qp.total + ' выполнено</div>' +
        '<div class="db-s">Заберите награды и получайте Coins каждый день. Достижения: ' + achCount + '/' + RN.achievements.total + '.</div></div>' +
        '<a class="btn btn-primary" href="#/quests">К заданиям</a></div>' : '') +

      // STATS
      '<div class="stat-grid" style="margin-bottom:8px">' +
      RN.components.statCard('🎮', p ? RN.fmtNum(p.stats.gamesPlayed) : '0', 'Сыграно игр') +
      RN.components.statCard('🪙', p ? RN.fmtNum(p.coins) : '0', 'Баланс Coins') +
      RN.components.statCard('🏆', p ? RN.fmtNum(p.stats.records) : '0', 'Рекордов') +
      RN.components.statCard('⭐', p ? RN.economy.levelOf(p.xp) : '1', 'Уровень') +
      '</div>' +

      // CONTINUE
      (recent.length ? RN.components.sectionHead('Продолжить', '⏱️', 'Все игры', '#/games') +
        '<div class="games-grid">' + recent.map(m => RN.components.gameCard(m)).join('') + '</div>' : '') +

      // POPULAR
      RN.components.sectionHead('Популярное у вас', '🔥', 'Все игры', '#/games') +
      '<div class="games-grid">' + popular.map(m => RN.components.gameCard(m, { badge: 'ХИТ', badgeClass: 'hot' })).join('') + '</div>' +

      // QUICK ACTIONS
      RN.components.sectionHead('Быстрый старт', '⚡') +
      '<div class="quick-grid">' +
      '<a class="quick-card" href="#/quests"><span class="q-ico">📋</span><div class="q-t">Задания дня</div><div class="q-s">+Coins за активность</div></a>' +
      '<a class="quick-card" href="#/shop"><span class="q-ico">🛍️</span><div class="q-t">Магазин</div><div class="q-s">Темы, эффекты, рамки</div></a>' +
      '<a class="quick-card" href="#/achievements"><span class="q-ico">🎖️</span><div class="q-t">Достижения</div><div class="q-s">' + achCount + ' из ' + RN.achievements.total + ' открыто</div></a>' +
      '<a class="quick-card" href="#/community"><span class="q-ico">🌐</span><div class="q-t">Игры сообщества</div><div class="q-s">Играй и публикуй</div></a>' +
      '</div>' +

      // FRESH
      RN.components.sectionHead('Новинки библиотеки', '🆕') +
      '<div class="games-grid">' + fresh.map(m => RN.components.gameCard(m, { badge: 'NEW', badgeClass: 'new' })).join('') + '</div>' +

      // RECOMMENDED
      RN.components.sectionHead('Рекомендуем сегодня', '✨') +
      '<div class="games-grid compact">' + random.map(m => RN.components.gameCard(m)).join('') + '</div>' +

      // LEADERBOARD TEASER
      RN.components.sectionHead('Лучшие игроки', '🏆', 'Таблица лидеров', '#/leaderboard') +
      '<div class="card no-hover">' + miniLeaderboard() + '</div>' +

      '</div>';
  };

  function miniLeaderboard() {
    const rows = RN.db.allProfiles()
      .sort((a, b) => (b.p.lifetimeCoins || 0) - (a.p.lifetimeCoins || 0))
      .slice(0, 5);
    if (!rows.length) return '<div class="empty-state" style="padding:24px"><p class="muted">Пока нет игроков — станьте первым!</p></div>';
    const cur = RN.db.currentNick();
    return '<div class="mini-list">' + rows.map((x, i) => {
      const lvl = RN.economy.levelOf(x.p.xp);
      return '<a class="mini-row" href="#/profile">' +
        '<span class="rank-num ' + (i < 3 ? 'rank-' + (i + 1) : '') + '">' + (i + 1) + '</span>' +
        '<span class="avatar sm">' + RN.esc(x.p.nick.charAt(0).toUpperCase()) + '</span>' +
        '<div class="mr-body"><div class="mr-t">' + RN.esc(x.p.nick) + (x.key === cur ? ' <span class="chip green" style="padding:1px 7px;font-size:10px">вы</span>' : '') + '</div>' +
        '<div class="mr-s">Уровень ' + lvl + ' · ' + RN.fmtNum(x.p.stats.gamesPlayed) + ' игр</div></div>' +
        '<span class="mr-v">🪙 ' + RN.fmtNum(x.p.lifetimeCoins) + '</span></a>';
    }).join('') + '</div>';
  }
})();
