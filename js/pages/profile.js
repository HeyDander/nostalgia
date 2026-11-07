/* ============================================================
   RetroNova — Page: Profile
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  RN.pages.profile = function (view) {
    const p = RN.db.profile();
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">👤</div><h3>Вы не вошли</h3><p>Войдите по нику, чтобы сохранять прогресс.</p><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }

    const lvl = RN.economy.levelOf(p.xp);
    const curBase = RN.economy.xpForLevel(lvl);
    const nextBase = RN.economy.xpForLevel(lvl + 1);
    const pct = Math.max(0, Math.min(100, Math.round((p.xp - curBase) / Math.max(1, nextBase - curBase) * 100)));
    const frame = RN.shop.byId(p.equipped.frame);
    const achCount = RN.achievements.count(p);
    const playTime = p.stats.timePlayed || 0;
    const hours = Math.floor(playTime / 3600);
    const mins = Math.floor((playTime % 3600) / 60);

    // top records
    const records = Object.keys(p.best).filter(id => RN.games.get(id)).map(id => ({
      game: RN.games.get(id), score: p.best[id]
    })).sort((a, b) => b.score - a.score).slice(0, 6);

    // recent history
    const hist = (p.history || []).slice(0, 12);

    // weekly activity (last 7 days by game count from history? we don't log per-day games; derive from history entries)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = RN.todayKey(d);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = start.getTime() + 86400000;
      const cnt = (p.history || []).filter(h => h.t >= start.getTime() && h.t < end && h.type === 'earn').length;
      days.push({ label: d.toLocaleDateString('ru-RU', { weekday: 'short' }), cnt });
    }
    const maxCnt = Math.max(1, ...days.map(d => d.cnt));

    view.innerHTML =
      '<div class="page">' +
      '<div class="profile-cover">' +
      '<div class="avatar xl ' + (frame ? frame.val : '') + (frame && frame.animate ? ' animated-frame' : '') + '">' + RN.esc(p.nick.charAt(0).toUpperCase()) + '</div>' +
      '<div class="pc-meta">' +
      '<h1 class="pc-name">' + RN.esc(p.nick) + '<span class="lvl-badge">⭐ Уровень ' + lvl + '</span></h1>' +
      '<div class="pc-sub"><span>📅 С нами с ' + new Date(p.createdAt).toLocaleDateString('ru-RU') + '</span>' +
      '<span>🔥 Серия: ' + (p.streak || 1) + ' дн.</span>' +
      '<span>🪙 ' + RN.fmtNum(p.coins) + ' Coins</span></div>' +
      '<div class="pc-xp"><div class="row-between"><span>До уровня ' + (lvl + 1) + '</span><span>' + RN.fmtNum(p.xp - curBase) + ' / ' + RN.fmtNum(nextBase - curBase) + ' XP</span></div>' +
      '<div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
      '</div>' +
      '<div class="row" style="gap:9px;flex-wrap:wrap">' +
      '<a class="btn btn-primary" href="#/shop">🛍️ Магазин</a>' +
      '<a class="btn" href="#/settings">⚙️ Настройки</a>' +
      '</div></div>' +

      '<div class="stat-tiles">' +
      '<div class="stat-tile"><div class="st-v">' + RN.fmtNum(p.stats.gamesPlayed) + '</div><div class="st-l">Игр сыграно</div></div>' +
      '<div class="stat-tile"><div class="st-v">' + RN.fmtNum(p.stats.totalScore) + '</div><div class="st-l">Всего очков</div></div>' +
      '<div class="stat-tile"><div class="st-v">' + RN.fmtNum(p.stats.records) + '</div><div class="st-l">Рекордов</div></div>' +
      '<div class="stat-tile"><div class="st-v">' + RN.fmtNum(p.lifetimeCoins) + '</div><div class="st-l">Заработано Coins</div></div>' +
      '<div class="stat-tile"><div class="st-v">' + achCount + '/' + RN.achievements.total + '</div><div class="st-l">Достижения</div></div>' +
      '<div class="stat-tile"><div class="st-v">' + (hours ? hours + 'ч ' : '') + mins + 'м</div><div class="st-l">Время в играх</div></div>' +
      '</div>' +

      '<div class="two-col">' +
      '<div>' +
      RN.components.sectionHead('Активность за неделю', '📊') +
      '<div class="card no-hover">' +
      '<div class="charts-bars">' +
      days.map(d => '<div class="bar" style="height:' + Math.max(6, Math.round(d.cnt / maxCnt * 100)) + '%" data-v="' + d.cnt + ' награб."></div>').join('') +
      '</div>' +
      '<div class="charts-labels">' + days.map(d => '<span>' + d.label + '</span>').join('') + '</div>' +
      '</div>' +
      RN.components.sectionHead('Лучшие рекорды', '🏆', 'Все игры', '#/games') +
      '<div class="card no-hover">' +
      (records.length ? '<div class="mini-list">' + records.map(r =>
        '<a class="mini-row" href="#/game/' + r.game.id + '">' +
        '<span class="mr-emoji">' + r.game.emoji + '</span>' +
        '<div class="mr-body"><div class="mr-t">' + RN.esc(r.game.title) + '</div>' +
        '<div class="mr-s">' + RN.fmtNum(p.plays[r.game.id] || 0) + ' запусков</div></div>' +
        '<span class="mr-v">🏆 ' + RN.fmtNum(r.score) + '</span></a>'
      ).join('') + '</div>' : '<p class="muted" style="margin:0">Пока нет рекордов — начните играть!</p>') +
      '</div>' +
      '</div>' +

      '<div>' +
      RN.components.sectionHead('История Coins', '🪙', 'Магазин', '#/shop') +
      '<div class="card no-hover">' +
      (hist.length ? '<div class="history-list">' + hist.map(h =>
        '<div class="history-item ' + (h.type === 'spend' ? 'spend' : '') + '">' +
        '<div class="hi-ico">' + (h.type === 'spend' ? '🛒' : '💰') + '</div>' +
        '<div class="hi-body"><div class="hi-reason">' + RN.esc(h.reason) + '</div>' +
        '<div class="hi-time">' + RN.timeAgo(h.t) + '</div></div>' +
        '<div class="hi-amt">' + (h.amount > 0 ? '+' : '') + h.amount + '</div></div>'
      ).join('') + '</div>' : '<p class="muted" style="margin:0">История пуста. Сыграйте в игру или зайдите завтра за ежедневной наградой.</p>') +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div class="security-note" style="margin-top:22px">' +
      '<span class="sn-ico">🔐</span>' +
      '<div><b>Безопасность аккаунта:</b> вход по нику не защищает профиль от захвата другим человеком. Данные хранятся локально на этом устройстве (LocalStorage). Для настоящей многопользовательской версии нужен сервер и безопасная авторизация.</div>' +
      '</div>' +
      '</div>';
  };
})();
