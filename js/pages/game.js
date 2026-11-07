/* ============================================================
   RetroNova — Page: Single game
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  const GENRE = { arcade: 'Аркада', puzzle: 'Головоломка', action: 'Экшен', sports: 'Спорт', casual: 'Casual', strategy: 'Стратегия', simulation: 'Симулятор', race: 'Гонки', runner: 'Раннер' };

  RN.pages.game = function (view, params) {
    const meta = RN.games.get(params.id);
    if (!meta) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🕹️</div><h3>Игра не найдена</h3>' +
        '<p>Возможно, она была переименована или удалена.</p><a class="btn btn-primary" href="#/games">Все игры</a></div></div>';
      return;
    }

    const p = RN.db.profile();
    if (p) {
      p.plays[meta.id] = (p.plays[meta.id] || 0) + 1;
      RN.db.save();
    }

    const best = p && p.best[meta.id] ? p.best[meta.id] : 0;
    const plays = p && p.plays[meta.id] ? p.plays[meta.id] : 0;

    const related = RN.games.byGenre(meta.genre).filter(g => g.id !== meta.id).slice(0, 4);
    const controls = parseControls(meta.controls);

    view.innerHTML =
      '<div class="page page-wide" style="padding:20px 24px 60px">' +
      '<div class="game-page">' +
      '<div id="shellMount"></div>' +

      '<div class="game-info">' +
      '<div class="card game-desc-card">' +
      '<div class="game-meta-row">' +
      '<span class="chip purple">' + meta.emoji + ' ' + (GENRE[meta.genre] || meta.genre) + '</span>' +
      (meta.year ? '<span class="chip">' + meta.year + '</span>' : '') +
      '<span class="chip cyan">🖱️ ' + (meta.touch === 'none' ? 'Мышь / клавиатура' : 'Тач + клавиатура') + '</span>' +
      (plays ? '<span class="chip green">▶ ' + plays + ' запусков</span>' : '') +
      '</div>' +
      '<h3>' + RN.esc(meta.title) + '</h3>' +
      '<p>' + RN.esc(meta.desc) + '</p>' +
      '<h4 style="margin:16px 0 0;font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">Управление</h4>' +
      '<ul class="controls-list">' + controls.map(c =>
        '<li>' + (c.key ? '<span class="key">' + RN.esc(c.key) + '</span>' : '') + '<span>' + RN.esc(c.text) + '</span></li>'
      ).join('') + '</ul>' +
      '</div>' +

      '<div class="side-box">' +
      '<div class="record-box">' +
      '<div class="rb-label">Ваш рекорд</div>' +
      '<div class="rb-val">' + RN.fmtNum(best) + '</div>' +
      '<div class="rb-sub">' + (best ? 'Лучший результат' : 'Сыграйте, чтобы установить рекорд') + '</div>' +
      '</div>' +
      '<div class="card no-hover">' +
      '<h3 style="font-size:15px;margin-bottom:12px">🪙 Как заработать</h3>' +
      '<div class="mini-list" style="gap:7px">' +
      '<div class="mini-row" style="cursor:default"><span class="mr-emoji">🎮</span><div class="mr-body"><div class="mr-t" style="font-size:13px">Завершить игру</div></div><span class="mr-v">+5</span></div>' +
      '<div class="mini-row" style="cursor:default"><span class="mr-emoji">⭐</span><div class="mr-body"><div class="mr-t" style="font-size:13px">Хороший результат</div><div class="mr-s">от ' + RN.fmtNum(meta.goodAt || 100) + ' очков</div></div><span class="mr-v">+10</span></div>' +
      '<div class="mini-row" style="cursor:default"><span class="mr-emoji">🏆</span><div class="mr-body"><div class="mr-t" style="font-size:13px">Новый рекорд</div></div><span class="mr-v">+20</span></div>' +
      '</div></div>' +
      '<a class="btn btn-block" href="#/games">← Все игры</a>' +
      '</div></div>' +

      (related.length ?
        '<div>' + RN.components.sectionHead('Похожие игры', '🎯') +
        '<div class="games-grid compact">' + related.map(g => RN.components.gameCard(g)).join('') + '</div></div>' : '') +
      '</div></div>';

    const mount = view.querySelector('#shellMount');
    let cleanup = null;
    try {
      cleanup = RN.gameShell.mount(mount, meta.id);
    } catch (e) {
      console.error(e);
      mount.innerHTML = '<div class="empty-state"><div class="es-ico">⚠️</div><h3>Не удалось запустить игру</h3><p class="muted">' + RN.esc(e.message) + '</p></div>';
    }

    // auto-mark "touched" achievements for playing many games
    if (p && RN.achievements) RN.achievements.checkAll(p);

    return function () {
      if (cleanup) cleanup();
    };
  };

  function parseControls(str) {
    if (!str) return [{ text: 'Стандартное управление' }];
    // split by ' · ' or ';'
    return String(str).split(/\s*[·;]\s*/).filter(Boolean).map(part => {
      const m = part.match(/^([^—]+)—\s*(.+)$/);
      if (m) return { key: m[1].trim(), text: m[2].trim() };
      return { text: part.trim() };
    });
  }
})();
