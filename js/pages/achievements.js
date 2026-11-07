/* ============================================================
   RetroNova — Page: Achievements
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  RN.pages.achievements = function (view) {
    const p = RN.db.profile();
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🎖️</div><h3>Войдите, чтобы открывать достижения</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }

    const list = RN.achievements.list;
    const unlocked = RN.achievements.count(p);
    const pct = Math.round(unlocked / list.length * 100);
    const coinsEarned = list.filter(a => p.achievements[a.id]).reduce((s, a) => s + a.r, 0);

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Достижения</h1><p class="sub">Открывайте награды за прогресс и получайте Coins</p></div>' +
      '</div>' +

      '<div class="ach-progress">' +
      '<div class="ap-ring" style="--p:' + pct + '"><b>' + pct + '%</b></div>' +
      '<div class="grow"><h3 style="margin:0 0 4px">' + unlocked + ' из ' + list.length + ' открыто</h3>' +
      '<p class="muted" style="margin:0 0 10px">Заработано с достижений: <b style="color:#FCD34D">' + RN.fmtNum(coinsEarned) + ' 🪙</b></p>' +
      '<div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
      '</div>' +

      '<div class="ach-grid">' + list.map(a => {
        const isUnlocked = !!p.achievements[a.id];
        return '<div class="ach-card ' + (isUnlocked ? 'unlocked' : 'locked') + '">' +
          (isUnlocked ? '<span class="ac-check">✓</span>' : '') +
          '<div class="ac-ico">' + (isUnlocked ? a.i : '🔒') + '</div>' +
          '<div class="grow"><div class="ac-t">' + RN.esc(a.t) + '</div>' +
          '<div class="ac-d">' + RN.esc(a.d) + '</div>' +
          '<div class="ac-r">🪙 +' + a.r + ' Coins' + (isUnlocked ? ' · получено' : '') + '</div></div></div>';
      }).join('') + '</div>' +
      '</div>';
  };
})();
