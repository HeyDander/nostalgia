/* ============================================================
   RetroNova — Achievements system
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const LIST = [
    // id, title, desc, icon, reward, check(profile)->bool
    { id: 'first_game', t: 'Первый запуск', d: 'Завершите свою первую игру', i: '🎮', r: 20, c: p => p.stats.gamesPlayed >= 1 },
    { id: 'games_10', t: 'Разогрев', d: 'Завершите 10 игр', i: '🔥', r: 30, c: p => p.stats.gamesPlayed >= 10 },
    { id: 'games_50', t: 'Постоялец', d: 'Завершите 50 игр', i: '🕹️', r: 60, c: p => p.stats.gamesPlayed >= 50 },
    { id: 'games_200', t: 'Настоящий игрок', d: 'Завершите 200 игр', i: '👑', r: 150, c: p => p.stats.gamesPlayed >= 200 },
    { id: 'record_1', t: 'Рекордсмен', d: 'Поставьте первый рекорд', i: '🏆', r: 25, c: p => p.stats.records >= 1 },
    { id: 'record_10', t: 'Дерзкий', d: 'Поставьте 10 рекордов', i: '🥇', r: 80, c: p => p.stats.records >= 10 },
    { id: 'coins_500', t: 'Копилка', d: 'Заработайте 500 Coins за всё время', i: '🪙', r: 30, c: p => p.lifetimeCoins >= 500 },
    { id: 'coins_5000', t: 'Богач', d: 'Заработайте 5 000 Coins за всё время', i: '💰', r: 100, c: p => p.lifetimeCoins >= 5000 },
    { id: 'coins_25000', t: 'Олигарх', d: 'Заработайте 25 000 Coins за всё время', i: '💎', r: 250, c: p => p.lifetimeCoins >= 25000 },
    { id: 'shop_1', t: 'Первая покупка', d: 'Купите предмет в магазине', i: '🛒', r: 25, c: p => p.inventory.length > 4 },
    { id: 'shop_5', t: 'Коллекционер', d: 'Соберите 10 предметов', i: '🎒', r: 60, c: p => p.inventory.length >= 10 },
    { id: 'level_5', t: 'Опытный', d: 'Достигните 5 уровня', i: '⭐', r: 40, c: p => RN.economy.levelOf(p.xp) >= 5 },
    { id: 'level_10', t: 'Ветеран', d: 'Достигните 10 уровня', i: '🌟', r: 100, c: p => RN.economy.levelOf(p.xp) >= 10 },
    { id: 'streak_3', t: 'Режим', d: 'Заходите 3 дня подряд', i: '📅', r: 50, c: p => (p.streak || 0) >= 3 },
    { id: 'streak_7', t: 'Неделя игры', d: 'Заходите 7 дней подряд', i: '🗓️', r: 150, c: p => (p.streak || 0) >= 7 },
    { id: 'score_1000', t: 'Тысячник', d: 'Наберите 1 000 очков в одной игре', i: '🎯', r: 40, c: p => bestScore(p) >= 1000 },
    { id: 'score_10000', t: 'Легенда очков', d: 'Наберите 10 000 очков в одной игре', i: '🌈', r: 120, c: p => bestScore(p) >= 10000 },
    { id: 'quest_5', t: 'Исполнитель', d: 'Выполните 5 заданий', i: '📋', r: 50, c: p => (p.questsDone || 0) >= 5 },
    { id: 'creator_1', t: 'Разработчик', d: 'Создайте свою игру', i: '🛠️', r: 50, c: p => p.projects.length >= 1 },
    { id: 'publisher_1', t: 'В эфире', d: 'Опубликуйте игру в сообществе', i: '📡', r: 70, c: p => (p.published || []).length >= 1 },
    { id: 'liked_10', t: 'Любимчик', d: 'Получите 10 лайков на свои игры', i: '❤️', r: 100, c: p => totalLikes(p) >= 10 },
    { id: 'play_5games', t: 'Исследователь', d: 'Сыграйте в 5 разных игр', i: '🧭', r: 45, c: p => Object.keys(p.plays).length >= 5 },
    { id: 'play_15games', t: 'Знаток аркад', d: 'Сыграйте в 15 разных игр', i: '🎲', r: 90, c: p => Object.keys(p.plays).length >= 15 },
    { id: 'time_60', t: 'Час за делом', d: 'Проведите 60 минут в играх', i: '⏰', r: 55, c: p => (p.stats.timePlayed || 0) >= 3600 },
    { id: 'win_10', t: 'Победитель', d: 'Победите в 10 играх на очки', i: '⚔️', r: 70, c: p => (p.stats.wins || 0) >= 10 }
  ];

  function bestScore(p) {
    let m = 0;
    for (const k in p.best) m = Math.max(m, p.best[k] || 0);
    return m;
  }
  function totalLikes(p) {
    let n = 0;
    (p.published || []).forEach(id => {
      const g = RN.db.community().games.find(x => x.id === id);
      if (g) n += g.likes || 0;
    });
    return n;
  }

  let checking = false;
  function checkAll(p) {
    if (checking) return;
    checking = true;
    try {
      LIST.forEach(a => {
        if (p.achievements[a.id]) return;
        let ok = false;
        try { ok = a.c(p); } catch (e) { ok = false; }
        if (ok) {
          p.achievements[a.id] = Date.now();
          RN.economy.grant(p, a.r, 'Достижение: ' + a.t, 'achievement');
          setTimeout(() => {
            RN.ui.toast('Достижение: ' + a.t + ' (+' + a.r + ' 🪙)', 'success', { duration: 4200 });
            RN.ui.confetti();
          }, 400);
          document.dispatchEvent(new CustomEvent('rn:achievement', { detail: a }));
        }
      });
    } finally {
      checking = false;
    }
  }

  RN.achievements = {
    list: LIST,
    checkAll,
    count(p) { p = p || RN.db.profile(); return p ? Object.keys(p.achievements).length : 0; },
    total: LIST.length
  };
})();
