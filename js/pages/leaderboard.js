/* ============================================================
   RetroNova — Page: Leaderboard
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  let tab = 'coins';

  RN.pages.leaderboard = function (view) {
    const cur = RN.db.currentNick();
    const rows = RN.db.allProfiles();

    function sorted(keyFn) {
      return rows.slice().sort((a, b) => keyFn(b) - keyFn(a));
    }

    const metrics = {
      coins: { label: 'По Coins', ico: '🪙', val: x => x.p.lifetimeCoins || 0, fmt: v => RN.fmtNum(v) + ' 🪙' },
      level: { label: 'По уровню', ico: '⭐', val: x => x.p.xp || 0, fmt: v => 'Ур. ' + RN.economy.levelOf(v) },
      games: { label: 'По играм', ico: '🎮', val: x => x.p.stats.gamesPlayed || 0, fmt: v => RN.fmtNum(v) + ' игр' },
      records: { label: 'По рекордам', ico: '🏆', val: x => x.p.stats.records || 0, fmt: v => RN.fmtNum(v) + ' рек.' },
      score: { label: 'По очкам', ico: '🎯', val: x => x.p.stats.totalScore || 0, fmt: v => RN.fmtNum(v) + ' очк.' }
    };

    const m = metrics[tab];
    const list = sorted(m.val);

    const top3 = list.slice(0, 3);
    const rest = list.slice(3);

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Таблица лидеров</h1><p class="sub">Соревнуйтесь с игроками на этом устройстве</p></div>' +
      '<div class="page-head-actions"><span class="chip">👥 ' + rows.length + ' игроков</span></div>' +
      '</div>' +

      '<div class="lb-tabs">' +
      Object.keys(metrics).map(k =>
        '<button class="pill ' + (tab === k ? 'active' : '') + '" data-tab="' + k + '">' + metrics[k].ico + ' ' + metrics[k].label + '</button>'
      ).join('') +
      '</div>' +

      (list.length ? (
        '<div class="podium">' +
        [1, 0, 2].map(idx => {
          if (!top3[idx]) return '';
          const x = top3[idx];
          const place = idx + 1;
          const medal = ['🥇', '🥈', '🥉'][idx];
          const cls = ['first', 'second', 'third'][idx];
          return '<div class="p-slot ' + cls + '">' +
            '<div class="p-block">' +
            '<div class="p-medal">' + medal + '</div>' +
            '<div class="avatar ' + (x.key === cur ? 'frame-legendary' : '') + '">' + RN.esc(x.p.nick.charAt(0).toUpperCase()) + '</div>' +
            '<div class="p-nick">' + RN.esc(x.p.nick) + '</div>' +
            '<div class="p-coins">' + m.fmt(m.val(x)) + '</div>' +
            '</div>' +
            '<div class="p-base">' + place + '</div>' +
            '</div>';
        }).join('') +
        '</div>' +

        '<div class="table-wrap"><table class="tbl">' +
        '<thead><tr><th style="width:60px">#</th><th>Игрок</th><th>Уровень</th><th>' + m.label.replace('По ', '') + '</th><th>Игр</th></tr></thead>' +
        '<tbody>' + list.map((x, i) => {
          const lvl = RN.economy.levelOf(x.p.xp);
          return '<tr class="' + (x.key === cur ? 'me' : '') + '">' +
            '<td><span class="rank-num ' + (i < 3 ? 'rank-' + (i + 1) : '') + '">' + (i + 1) + '</span></td>' +
            '<td><div class="row" style="gap:10px"><span class="avatar sm">' + RN.esc(x.p.nick.charAt(0).toUpperCase()) + '</span>' +
            '<b>' + RN.esc(x.p.nick) + '</b>' + (x.key === cur ? ' <span class="chip green" style="padding:1px 8px;font-size:10px">вы</span>' : '') + '</div></td>' +
            '<td><span class="chip purple">⭐ ' + lvl + '</span></td>' +
            '<td><b style="color:#FCD34D">' + m.fmt(m.val(x)) + '</b></td>' +
            '<td class="muted">' + RN.fmtNum(x.p.stats.gamesPlayed || 0) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      ) : '<div class="empty-state"><div class="es-ico">🏆</div><h3>Пока никого нет</h3><p>Создайте профиль и начните играть.</p></div>') +

      '<div class="security-note" style="margin-top:22px"><span class="sn-ico">ℹ️</span>' +
      '<div>Рейтинг локальный: он собирает профили, созданные на этом устройстве. Для глобального рейтинга нужен сервер и база данных.</div></div>' +
      '</div>';

    view.querySelectorAll('[data-tab]').forEach(b => {
      b.addEventListener('click', () => { tab = b.dataset.tab; RN.pages.leaderboard(view); });
    });
  };
})();
