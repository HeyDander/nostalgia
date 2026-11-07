/* ============================================================
   RetroNova — Page: Daily quests
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  RN.pages.quests = function (view) {
    const p = RN.db.profile();
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">📋</div><h3>Войдите, чтобы получать задания</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }

    RN.quests.ensure(p);
    const qp = RN.quests.progress(p);
    const claimable = qp.list.filter(q => q.done && !q.claimed).length;

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Ежедневные задания</h1><p class="sub">Обновляются каждый день · ' + new Date().toLocaleDateString('ru-RU') + '</p></div>' +
      '<div class="page-head-actions">' +
      (claimable ? '<span class="chip amber">🎁 ' + claimable + ' наград готово</span>' : '<span class="chip">Выполнено ' + qp.done + '/' + qp.total + '</span>') +
      '</div></div>' +

      '<div class="daily-banner" style="margin-bottom:22px">' +
      '<span class="db-ico">🔥</span>' +
      '<div class="db-body"><div class="db-t">Серия входов: ' + (p.streak || 1) + ' дн. подряд</div>' +
      '<div class="db-s">Заходите каждый день и получайте +15 Coins. За 3 дня подряд — достижение, за 7 — большое достижение.</div></div>' +
      '</div>' +

      '<div style="display:flex;flex-direction:column;gap:13px">' +
      qp.list.map(q => {
        const pct = Math.min(100, Math.round(q.progress / q.goal * 100));
        return '<div class="quest-card ' + (q.done ? 'done' : '') + '">' +
          '<div class="qc-body">' +
          '<div class="qc-t">' + (q.done ? '✅ ' : '🎯 ') + RN.esc(q.t) + '</div>' +
          '<div class="qc-progress"><div class="progress ' + (q.done ? 'green' : '') + '"><i style="width:' + pct + '%"></i></div>' +
          '<span class="qc-num">' + Math.min(q.progress, q.goal) + ' / ' + q.goal + '</span></div>' +
          '</div>' +
          '<div class="qc-reward"><div class="r-amt">+' + q.r + '</div><div class="r-lbl">Coins</div></div>' +
          (q.claimed
            ? '<button class="btn btn-sm" disabled>✓ Получено</button>'
            : q.done
              ? '<button class="btn btn-sm btn-green" data-claim="' + q.id + '">Забрать</button>'
              : '<button class="btn btn-sm" disabled>В процессе</button>') +
          '</div>';
      }).join('') +
      '</div>' +

      '<div class="section-head" style="margin-top:30px"><h2>💡 Как это работает</h2></div>' +
      '<div class="card no-hover"><p style="margin:0 0 10px">Задания выбираются случайно каждый день и сбрасываются в полночь. Прогресс сохраняется автоматически.</p>' +
      '<p style="margin:0">Дополнительные Coins дают: завершение игры (+5), хороший результат (+10), новый рекорд (+20), ежедневный вход (+15) и достижения (+25 в среднем).</p></div>' +
      '</div>';

    view.querySelectorAll('[data-claim]').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = RN.quests.claim(btn.dataset.claim);
        if (!res.ok) { RN.ui.toast(res.error, 'error'); return; }
        RN.sfx.play('coin');
        RN.ui.confetti();
        RN.ui.toast('Награда получена: +' + res.amount + ' Coins', 'success');
        RN.renderUserChrome();
        RN.pages.quests(view);
      });
    });
  };
})();
