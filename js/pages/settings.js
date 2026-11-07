/* ============================================================
   RetroNova — Page: Settings
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  RN.pages.settings = function (view) {
    const p = RN.db.profile();
    const profiles = RN.db.allProfiles();

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><div><h1>Настройки</h1><p class="sub">Аккаунт, звук, внешний вид и данные</p></div></div>' +

      '<div class="settings-grid">' +

      // ACCOUNT
      '<div class="card no-hover">' +
      '<h3>👤 Аккаунт</h3>' +
      (p ? (
        '<div class="row" style="margin:16px 0">' +
        '<span class="avatar lg">' + RN.esc(p.nick.charAt(0).toUpperCase()) + '</span>' +
        '<div class="grow"><div style="font-weight:800;font-family:var(--font-head);font-size:18px">' + RN.esc(p.nick) + '</div>' +
        '<div class="muted small">Уровень ' + RN.economy.levelOf(p.xp) + ' · ' + RN.fmtNum(p.coins) + ' Coins · ' + RN.fmtNum(p.lifetimeCoins) + ' заработано</div></div></div>' +
        '<div class="row wrap" style="gap:9px">' +
        '<button class="btn btn-sm" id="btnSwitch">🔄 Сменить профиль</button>' +
        '<button class="btn btn-sm" id="btnNewProfile">+ Новый профиль</button>' +
        '<button class="btn btn-sm btn-danger" id="btnLogout">Выйти</button>' +
        '</div>' +
        '<div class="security-note" style="margin-top:18px"><span class="sn-ico">🔐</span><div><b>Вход только по нику.</b> Это не защищает аккаунт от захвата другим человеком на этом устройстве. Для реальной многопользовательской версии нужна серверная авторизация с паролем или OAuth.</div></div>'
      ) : '<p class="muted">Вы не вошли.</p><button class="btn btn-primary" id="btnLoginNow">Войти по нику</button>') +
      '</div>' +

      // SOUND
      '<div class="card no-hover">' +
      '<h3>🔊 Звук</h3>' +
      (p ? (
        '<div class="setting-row"><div class="sr-body"><div class="sr-t">Звуковые эффекты</div><div class="sr-s">Клики, монеты, победы</div></div>' +
        '<label class="switch"><input type="checkbox" id="setSound" ' + (p.settings.sound ? 'checked' : '') + '><span class="slider"></span></label></div>' +
        '<div class="setting-row"><div class="sr-body"><div class="sr-t">Громкость</div><div class="sr-s">0–100%</div></div>' +
        '<input type="range" id="setVolume" min="0" max="100" value="' + Math.round((p.settings.sfxVolume || 0.6) * 100) + '" style="max-width:150px;accent-color:var(--accent)"></div>'
      ) : '<p class="muted small">Войдите, чтобы настроить звук.</p>') +
      '</div>' +

      // APPEARANCE
      '<div class="card no-hover">' +
      '<h3>🎨 Внешний вид</h3>' +
      (p ? (
        '<div class="setting-row"><div class="sr-body"><div class="sr-t">Меньше анимаций</div><div class="sr-s">Отключить тяжёлые эффекты и анимации</div></div>' +
        '<label class="switch"><input type="checkbox" id="setMotion" ' + (p.settings.reduceMotion ? 'checked' : '') + '><span class="slider"></span></label></div>' +
        '<div class="setting-row"><div class="sr-body"><div class="sr-t">Подсказки управления</div><div class="sr-s">Показывать подсказки в играх</div></div>' +
        '<label class="switch"><input type="checkbox" id="setHints" ' + (p.settings.showControlsHint ? 'checked' : '') + '><span class="slider"></span></label></div>' +
        '<div class="row" style="margin-top:14px;gap:9px;flex-wrap:wrap">' +
        '<a class="btn btn-sm" href="#/shop">🛍️ Магазин скинов</a>' +
        '<a class="btn btn-sm" href="#/inventory">🎒 Инвентарь</a>' +
        '</div>'
      ) : '<p class="muted small">Войдите, чтобы настроить внешний вид.</p>') +
      '</div>' +

      // DATA
      '<div class="card no-hover">' +
      '<h3>💾 Данные</h3>' +
      '<p class="muted small">Все данные хранятся локально в LocalStorage браузера. Экспортируйте резервную копию, чтобы не потерять прогресс.</p>' +
      '<div class="row wrap" style="gap:9px;margin-top:14px">' +
      '<button class="btn btn-sm" id="btnExport">⬇ Экспорт прогресса</button>' +
      '<button class="btn btn-sm" id="btnImport">⬆ Импорт</button>' +
      '<input type="file" id="importFile" accept="application/json" hidden>' +
      '</div>' +
      '</div>' +

      // AI SETTINGS
      '<div class="card no-hover">' +
      '<h3>🤖 AI Генератор игр</h3>' +
      '<p class="muted small">Введите ключ OpenRouter для генерации игр</p>' +
      '<div class="setting-row">' +
      '<div class="sr-body">' +
      '<div class="sr-t">API ключ</div>' +
      '</div>' +
      '<input type="text" id="aiApiKey" class="input" placeholder="sk-or-..." style="width:100%;margin-top:4px;padding:8px;border-radius:4px;border:1px solid var(--border);background:rgba(0,0,0,.3);color:var(--text);" maxlength="100">' +
      '<div class="sr-body" style="margin-top:8px;">' +
      '<div class="sr-t">Важно: Получить ключ можно на <a href="https://openrouter.ai" target="_blank">openrouter.ai</a></div>' +
      '</div>' +
      '</div>' +

      // AI SETTINGS
      '<div class="card no-hover">' +
      '<h3>🤖 AI Генератор игр</h3>' +
      '<p class="muted small">Введите ключ OpenRouter для генерации игр</p>' +
      '<div class="setting-row">' +
      '<div class="sr-body">' +
      '<div class="sr-t">API ключ</div>' +
      '</div>' +
      '<input type="text" id="aiApiKey" class="input" placeholder="sk-or-..." style="width:100%;margin-top:4px;padding:8px;border-radius:4px;border:1px solid var(--border);background:rgba(0,0,0,.3);color:var(--text);" maxlength="100">' +
      '<div class="sr-body" style="margin-top:8px;">' +
      '<div class="sr-t">Важно: Получить ключ можно на <a href="https://openrouter.ai" target="_blank">openrouter.ai</a></div>' +
      '</div>' +
      '</div>' +

      // PROFILES

      // PROFILES
      '<div class="card no-hover">' +
      '<h3>👥 Профили на устройстве</h3>' +
      '<div class="prof-list" style="margin-top:14px">' +
      (profiles.length ? profiles.map(x => {
        const isCur = RN.db.currentNick() === x.key;
        return '<div class="prof-row ' + (isCur ? 'current' : '') + '" data-profile="' + RN.esc(x.p.nick) + '">' +
          '<span class="avatar sm">' + RN.esc(x.p.nick.charAt(0).toUpperCase()) + '</span>' +
          '<div class="pr-meta"><div class="pr-nick">' + RN.esc(x.p.nick) + (isCur ? ' ✓' : '') + '</div>' +
          '<div class="pr-sub">Ур. ' + RN.economy.levelOf(x.p.xp) + ' · ' + RN.fmtNum(x.p.coins) + ' Coins · ' + RN.fmtNum(x.p.stats.gamesPlayed) + ' игр</div></div>' +
          '<button class="btn btn-sm" data-switch="' + RN.esc(x.p.nick) + '">' + (isCur ? 'Текущий' : 'Войти') + '</button>' +
          '</div>';
      }).join('') : '<p class="muted small">Пока нет профилей.</p>') +
      '</div></div>' +

      // DANGER
      '<div class="card no-hover danger-zone">' +
      '<h3>⚠️ Опасная зона</h3>' +
      (p ? '<p class="muted small">Удаление профиля стирает прогресс, Coins, скины и проекты без возможности восстановления.</p>' +
        '<button class="btn btn-sm btn-danger" id="btnDeleteProfile">Удалить профиль «' + RN.esc(p.nick) + '»</button>' : '') +
      '<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(239,68,68,.25)">' +
      '<p class="muted small">Полный сброс удалит <b>все</b> профили, игры сообщества и данные на этом устройстве.</p>' +
      '<button class="btn btn-sm btn-danger" id="btnResetAll">Сбросить всё приложение</button>' +
      '</div></div>' +

      '</div>' +

      '<div class="card no-hover" style="margin-top:22px">' +
      '<h3>ℹ️ О платформе</h3>' +
      '<p class="muted small" style="margin-bottom:6px"><b>RetroNova</b> — игровая платформа: 40+ классических игр, экономика Coins, скины, конструктор HTML/CSS/JS и игры сообщества.</p>' +
      '<p class="muted small" style="margin:0">Данные сохраняются локально. Публикация игр и рейтинг работают в пределах этого браузера. Для полноценного мультиплеера подключите backend.</p>' +
      '</div>' +

      '</div>';

    /* ---- actions ---- */
    const $ = s => view.querySelector(s);

    if (!p) {
      const b = $('#btnLoginNow');
      if (b) b.addEventListener('click', () => RN.showLogin(true));
    } else {
      $('#setSound').addEventListener('change', e => {
        p.settings.sound = e.target.checked;
        RN.sfx.enabled = e.target.checked;
        RN.db.save();
        if (e.target.checked) RN.sfx.play('click');
      });
      $('#setVolume').addEventListener('input', e => {
        p.settings.sfxVolume = Number(e.target.value) / 100;
        RN.sfx.volume = p.settings.sfxVolume;
        RN.db.save();
      });
      $('#setVolume').addEventListener('change', () => RN.sfx.play('coin'));
      $('#setMotion').addEventListener('change', e => {
        p.settings.reduceMotion = e.target.checked;
        RN.db.save();
        RN.skins.apply(p);
      });
      $('#setHints').addEventListener('change', e => {
        p.settings.showControlsHint = e.target.checked;
        RN.db.save();
      });

      $('#btnLogout').addEventListener('click', async () => {
        const ok = await RN.ui.confirm('Выйти из профиля?', 'Прогресс сохранится, вы сможете войти снова.', { okText: 'Выйти' });
        if (!ok) return;
        RN.db.logout();
        RN.skins.apply(null);
        RN.renderUserChrome();
        RN.router.go('home');
        RN.showLogin(true);
      });

      $('#btnSwitch').addEventListener('click', () => switchModal(view));
      $('#btnNewProfile').addEventListener('click', async () => {
        const nick = await RN.ui.prompt('Новый профиль', 'Введите ник нового игрока', '');
        if (!nick) return;
        const res = RN.db.createProfile(nick);
        if (!res.ok) { RN.ui.toast(res.error, 'error'); return; }
        RN.db.login(res.nick);
        RN.economy.syncLevel();
        RN.quests.ensure(RN.db.profile());
        RN.skins.apply(RN.db.profile());
        RN.renderUserChrome();
        RN.ui.toast('Профиль создан: ' + nick, 'success');
        RN.router.go('home');
      });

      $('#btnDeleteProfile').addEventListener('click', async () => {
        const ok = await RN.ui.confirm('Удалить профиль?', 'Профиль <b>' + RN.esc(p.nick) + '</b> и весь прогресс будут стёрты. Это необратимо.', { danger: true, okText: 'Удалить навсегда' });
        if (!ok) return;
        RN.db.deleteProfile(p.nick);
        RN.skins.apply(null);
        RN.renderUserChrome();
        RN.router.go('home');
        RN.showLogin(true);
      });
    }

    $('#btnResetAll').addEventListener('click', async () => {
      const ok = await RN.ui.confirm('Сбросить всё приложение?', 'Будут удалены <b>все профили, прогресс, скины, проекты и игры сообщества</b>. Действие необратимо.', { danger: true, okText: 'Сбросить всё' });
      if (!ok) return;
      localStorage.removeItem('retroNova.db.v1');
      location.hash = '#/home';
      location.reload();
$('#saveAiKey').addEventListener('click', () => {
      const key = $('#aiApiKey').value.trim();
      if (!key) { RN.ui.toast('Введите ключ', 'error'); return; }
      localStorage.setItem('aiApiKey', key);
      $('#aiKeyStatus').textContent = 'Ключ сохранен';
      RN.ui.toast('Ключ сохранен', 'success');
    });
    });

    $('#btnExport').addEventListener('click', () => {
      const data = localStorage.getItem('retroNova.db.v1') || '{}';
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'retronova-backup-' + RN.todayKey() + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      RN.ui.toast('Резервная копия скачана', 'success');
    });

    $('#btnImport').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data.profiles || typeof data.profiles !== 'object') throw new Error('Неверный формат файла');
          const ok = await RN.ui.confirm('Импортировать данные?', 'Текущие данные будут заменены резервной копией из файла.', { danger: true, okText: 'Импортировать' });
          if (!ok) return;
          localStorage.setItem('retroNova.db.v1', JSON.stringify(data));
          RN.ui.toast('Данные импортированы — перезагрузка…', 'success');
          setTimeout(() => location.reload(), 900);
        } catch (err) {
          RN.ui.toast('Ошибка импорта: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });

    view.querySelectorAll('[data-switch]').forEach(b => {
      b.addEventListener('click', () => {
        const nick = b.dataset.switch;
        const res = RN.db.login(nick);
        if (!res.ok) { RN.ui.toast(res.error, 'error'); return; }
        RN.economy.syncLevel();
        RN.quests.ensure(RN.db.profile());
        RN.skins.apply(RN.db.profile());
        RN.renderUserChrome();
        RN.ui.toast('Вы вошли как ' + nick, 'success');
        RN.router.render();
      });
    });
  };

  function switchModal(view) {
    const profiles = RN.db.allProfiles();
    const cur = RN.db.currentNick();
    const m = RN.ui.openModal(
      '<div class="modal-head"><h3>🔄 Сменить профиль</h3><p class="sub">Профили на этом устройстве</p></div>' +
      '<div class="modal-body"><div class="prof-list">' +
      profiles.map(x =>
        '<div class="prof-row ' + (x.key === cur ? 'current' : '') + '"><span class="avatar sm">' + RN.esc(x.p.nick.charAt(0).toUpperCase()) + '</span>' +
        '<div class="pr-meta"><div class="pr-nick">' + RN.esc(x.p.nick) + '</div><div class="pr-sub">Ур. ' + RN.economy.levelOf(x.p.xp) + ' · ' + RN.fmtNum(x.p.coins) + ' Coins</div></div>' +
        '<button class="btn btn-sm ' + (x.key === cur ? '' : 'btn-primary') + '" data-pick="' + RN.esc(x.p.nick) + '" ' + (x.key === cur ? 'disabled' : '') + '>' + (x.key === cur ? 'Активен' : 'Войти') + '</button></div>'
      ).join('') +
      '</div></div>' +
      '<div class="modal-foot"><button class="btn" data-close>Закрыть</button><button class="btn btn-primary" id="newProfBtn">+ Новый профиль</button></div>'
    );
    m.findAll('[data-pick]').forEach(b => {
      b.addEventListener('click', () => {
        const res = RN.db.login(b.dataset.pick);
        if (!res.ok) return;
        RN.economy.syncLevel();
        RN.quests.ensure(RN.db.profile());
        RN.skins.apply(RN.db.profile());
        RN.renderUserChrome();
        m.close();
        RN.ui.toast('Вы вошли как ' + b.dataset.pick, 'success');
        RN.router.render();
      });
    });
    m.find('#newProfBtn').addEventListener('click', async () => {
      m.close();
      const nick = await RN.ui.prompt('Новый профиль', 'Введите ник', '');
      if (!nick) return;
      const res = RN.db.createProfile(nick);
      if (!res.ok) { RN.ui.toast(res.error, 'error'); return; }
      RN.db.login(res.nick);
      RN.economy.syncLevel();
      RN.quests.ensure(RN.db.profile());
      RN.skins.apply(RN.db.profile());
      RN.renderUserChrome();
      RN.router.render();
    });
  }
})();


    <script>
    $('#saveAiKey').addEventListener('click', () => {
      const key = $('#aiApiKey').value.trim();
      if (!key) { RN.ui.toast('Введите ключ', 'error'); return; }
      localStorage.setItem('aiApiKey', key);
      $('#aiKeyStatus').textContent = 'Ключ сохранен';
      RN.ui.toast('Ключ сохранен', 'success');
    });
    </script>