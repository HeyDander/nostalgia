/* ============================================================
   RetroNova — Page: Community games + publish + play
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  const COVERS = [
    { e: '🎮', bg: 'linear-gradient(150deg,#312e81,#0D1020)' },
    { e: '🚀', bg: 'linear-gradient(150deg,#0c4a6e,#0D1020)' },
    { e: '👾', bg: 'linear-gradient(150deg,#4c1d95,#0D1020)' },
    { e: '🐍', bg: 'linear-gradient(150deg,#14532d,#0D1020)' },
    { e: '⚔️', bg: 'linear-gradient(150deg,#7f1d1d,#0D1020)' },
    { e: '🌌', bg: 'linear-gradient(150deg,#1e1b4b,#0D1020)' },
    { e: '🍪', bg: 'linear-gradient(150deg,#78350f,#0D1020)' },
    { e: '🧩', bg: 'linear-gradient(150deg,#164e63,#0D1020)' }
  ];

  let tab = 'all';
  let sort = 'new';
  let search = '';

  /* ============================================================
     Community feed
     ============================================================ */
  RN.pages.community = function (view) {
    const p = RN.db.profile();
    const c = RN.db.community();

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Игры сообщества</h1><p class="sub">Игры, созданные игроками в конструкторе RetroNova</p></div>' +
      '<div class="page-head-actions"><a class="btn btn-primary" href="#/editor">🛠️ Создать игру</a></div>' +
      '</div>' +

      '<div class="filter-bar">' +
      '<div class="search-box"><span class="ico">🔍</span><input id="comSearch" placeholder="Поиск по играм сообщества…" value="' + RN.esc(search) + '"></div>' +
      '<select class="select" id="comSort" style="max-width:180px">' +
      '<option value="new">Сначала новые</option>' +
      '<option value="likes">По лайкам</option>' +
      '<option value="plays">По запускам</option>' +
      '</select>' +
      '<span class="result-count" id="comCount"></span>' +
      '</div>' +

      '<div class="pills" id="comTabs" style="margin-bottom:22px">' +
      '<button class="pill ' + (tab === 'all' ? 'active' : '') + '" data-tab="all">🌐 Все игры</button>' +
      '<button class="pill ' + (tab === 'favorites' ? 'active' : '') + '" data-tab="favorites">⭐ Избранное</button>' +
      '<button class="pill ' + (tab === 'mine' ? 'active' : '') + '" data-tab="mine">👤 Мои публикации</button>' +
      '</div>' +

      '<div class="community-grid" id="comGrid"></div>' +
      '</div>';

    const grid = view.querySelector('#comGrid');
    const countEl = view.querySelector('#comCount');

    function render() {
      if (!p) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-ico">🔐</div><h3>Войдите, чтобы смотреть игры сообщества</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div>';
        const g = grid.querySelector('#gateLogin');
        if (g) g.addEventListener('click', () => RN.showLogin(true));
        countEl.textContent = '';
        return;
      }

      let games = c.games.filter(g => {
        if (tab === 'mine') return g.author === p.nick;
        // Show approved games AND pending games (published but awaiting manual review)
        if (g.status !== 'approved' && g.status !== 'pending') return false;
        if (tab === 'favorites') return p.favorites.includes(g.id);
        return true;
      });

      if (search) {
        const q = search.toLowerCase();
        games = games.filter(g => (g.title + ' ' + g.description + ' ' + g.author).toLowerCase().includes(q));
      }
      if (sort === 'likes') games.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      else if (sort === 'plays') games.sort((a, b) => (b.plays || 0) - (a.plays || 0));
      else games.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

      countEl.textContent = 'Игр: ' + games.length;

      if (!games.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-ico">🌌</div><h3>' +
          (tab === 'favorites' ? 'В избранном пока пусто' : tab === 'mine' ? 'Вы ещё не публиковали игры' : 'Пока нет опубликованных игр') +
          '</h3><p>' + (tab === 'mine' ? 'Создайте игру в конструкторе и нажмите «Опубликовать».' : 'Станьте первым — опубликуйте свою игру!') + '</p>' +
          '<a class="btn btn-primary" href="#/editor">Создать игру</a></div>';
        return;
      }

      grid.innerHTML = games.map(g => communityCard(g, p)).join('');

      grid.querySelectorAll('[data-play]').forEach(el => {
        el.addEventListener('click', e => {
          if (e.target.closest('[data-like]') || e.target.closest('[data-fav]') || e.target.closest('[data-report]')) return;
          RN.router.go('play/' + el.dataset.play);
        });
      });
      grid.querySelectorAll('[data-like]').forEach(b => b.addEventListener('click', () => toggleLike(b.dataset.like, view)));
      grid.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', () => toggleFav(b.dataset.fav, view)));
      grid.querySelectorAll('[data-report]').forEach(b => b.addEventListener('click', () => reportGame(b.dataset.report)));
    }

    view.querySelectorAll('#comTabs .pill').forEach(b => {
      b.addEventListener('click', () => {
        tab = b.dataset.tab;
        view.querySelectorAll('#comTabs .pill').forEach(x => x.classList.toggle('active', x === b));
        render();
      });
    });

    const s = view.querySelector('#comSearch');
    let t;
    s.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { search = s.value.trim(); render(); }, 150); });

    view.querySelector('#comSort').value = sort;
    view.querySelector('#comSort').addEventListener('change', e => { sort = e.target.value; render(); });

    render();
  };

  function communityCard(g, p) {
    const liked = p && (p.moderation.likesGiven || []).includes(g.id);
    const fav = p && p.favorites.includes(g.id);
    return '<div class="cg-card" data-play="' + g.id + '" style="cursor:pointer">' +
      '<div class="cg-cover" style="background:' + (g.coverBg || COVERS[0].bg) + '">' +
      '<span class="cg-status ' + g.status + '">' + statusLabel(g.status) + '</span>' +
      (g.cover || '🎮') + '</div>' +
      '<div class="cg-body">' +
      '<div class="cg-title">' + RN.esc(g.title) + '</div>' +
      '<div class="cg-desc">' + RN.esc(g.description || 'Без описания') + '</div>' +
      '<div class="cg-meta">' +
      '<button data-like="' + g.id + '" class="' + (liked ? 'liked' : '') + '" title="Нравится">❤ ' + (g.likes || 0) + '</button>' +
      '<button data-fav="' + g.id + '" class="' + (fav ? 'liked' : '') + '" title="В избранное">' + (fav ? '★' : '☆') + '</button>' +
      '<button data-report="' + g.id + '" title="Пожаловаться">⚑</button>' +
      '<span class="plays">▶ ' + (g.plays || 0) + '</span>' +
      '</div>' +
      '<div class="cg-meta" style="padding-top:2px;border-top:1px solid rgba(255,255,255,.05);margin-top:2px">' +
      '<span style="font-size:11.5px">👤 ' + RN.esc(g.author) + '</span>' +
      '<span style="font-size:11.5px;margin-left:auto">' + RN.timeAgo(g.publishedAt) + '</span>' +
      '</div></div></div>';
  }

  function statusLabel(s) {
    return s === 'approved' ? 'Опубликовано' : s === 'pending' ? 'На проверке' : s === 'hidden' ? 'Скрыто' : s === 'rejected' ? 'Отклонено' : s;
  }

  function toggleLike(id, view) {
    const p = RN.db.profile();
    if (!p) return;
    const g = RN.db.community().games.find(x => x.id === id);
    if (!g) return;
    p.moderation.likesGiven = p.moderation.likesGiven || [];
    const idx = p.moderation.likesGiven.indexOf(id);
    if (idx >= 0) {
      p.moderation.likesGiven.splice(idx, 1);
      g.likes = Math.max(0, (g.likes || 0) - 1);
    } else {
      p.moderation.likesGiven.push(id);
      g.likes = (g.likes || 0) + 1;
      RN.sfx.play('coin');
    }
    RN.db.save();
    RN.achievements.checkAll(p);
    RN.pages.community(view);
  }

  function toggleFav(id, view) {
    const p = RN.db.profile();
    if (!p) return;
    const idx = p.favorites.indexOf(id);
    if (idx >= 0) p.favorites.splice(idx, 1);
    else p.favorites.push(id);
    RN.db.save();
    RN.pages.community(view);
  }

  function reportGame(id) {
    const p = RN.db.profile();
    if (!p) return;
    const g = RN.db.community().games.find(x => x.id === id);
    if (!g) return;
    const m = RN.ui.openModal(
      '<div class="modal-head"><h3>⚑ Пожаловаться на игру</h3><p class="sub">' + RN.esc(g.title) + ' · автор ' + RN.esc(g.author) + '</p></div>' +
      '<div class="modal-body"><div class="field"><label>Причина жалобы</label>' +
      '<select class="select" id="reportReason">' +
      '<option>Неприемлемый контент</option>' +
      '<option>Не работает / сломана</option>' +
      '<option>Обман или спам</option>' +
      '<option>Нарушение авторских прав</option>' +
      '</select></div>' +
      '<p class="small muted">После 3 жалоб игра автоматически скрывается до ручной проверки.</p></div>' +
      '<div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-danger" data-send>Отправить жалобу</button></div>'
    );
    m.find('[data-send]').addEventListener('click', () => {
      const reason = m.find('#reportReason').value;
      RN.moderation.report(id, reason);
      m.close();
      RN.ui.toast('Жалоба отправлена. Спасибо!', 'success');
    });
  }

  /* ============================================================
     Publish modal (used from editor & projects)
     ============================================================ */
  let selectedCover = 0;

  RN.openPublishModal = function (project) {
    const p = RN.db.profile();
    if (!p) { RN.showLogin(true); return; }
    const allowed = RN.moderation.canPublishToday(p);
    if (!allowed.ok) { RN.ui.toast(allowed.reason, 'warn'); return; }

    const existing = project.publishedId ? RN.db.community().games.find(g => g.id === project.publishedId) : null;
    selectedCover = 0;

    const m = RN.ui.openModal(
      '<div class="modal-head"><h3>🚀 Публикация игры</h3><p class="sub">Игра пройдёт автопроверку модерации</p></div>' +
      '<div class="modal-body">' +
      '<div class="field"><label for="pubTitle">Название</label>' +
      '<input class="input" id="pubTitle" maxlength="50" value="' + RN.esc(project.name) + '"></div>' +
      '<div class="field"><label for="pubDesc">Описание</label>' +
      '<textarea class="textarea" id="pubDesc" maxlength="300" placeholder="Расскажите, что за игра и как в неё играть…"></textarea></div>' +
      '<div class="field"><label>Обложка</label><div class="publish-cover-grid" id="coverGrid">' +
      COVERS.map((cv, i) => '<div class="cover-swatch ' + (i === 0 ? 'sel' : '') + '" data-cover="' + i + '" style="background:' + cv.bg + '">' + cv.e + '</div>').join('') +
      '</div></div>' +
      '<div class="security-note" style="font-size:12.5px"><span class="sn-ico">🛡️</span><div>Код запускается в изолированном <b>sandbox iframe</b>. Автопроверка блокирует запрещённый контент, сетевые запросы и подозрительный код. После 3 жалоб игра скрывается до ручной проверки.</div></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn" data-close>Отмена</button>' +
      '<button class="btn btn-primary" data-pub>' + (existing ? 'Обновить публикацию' : 'Опубликовать') + '</button></div>',
      { size: '' }
    );

    if (existing) {
      m.find('#pubDesc').value = existing.description || '';
      const idx = COVERS.findIndex(c => c.e === existing.cover);
      if (idx >= 0) {
        selectedCover = idx;
        m.findAll('[data-cover]').forEach(x => x.classList.toggle('sel', Number(x.dataset.cover) === idx));
      }
    }

    m.findAll('[data-cover]').forEach(sw => {
      sw.addEventListener('click', () => {
        selectedCover = Number(sw.dataset.cover);
        m.findAll('[data-cover]').forEach(x => x.classList.toggle('sel', x === sw));
      });
    });

    m.find('[data-pub]').addEventListener('click', () => {
      const title = m.find('#pubTitle').value.trim();
      const desc = m.find('#pubDesc').value.trim();
      if (title.length < 3) { RN.ui.toast('Название минимум 3 символа', 'error'); return; }
      if (desc.length < 10) { RN.ui.toast('Добавьте описание (минимум 10 символов)', 'error'); return; }

      const review = RN.moderation.review(project, { title: title, description: desc });
      if (review.status === 'rejected') {
        RN.ui.toast(review.reason, 'error', { duration: 5000 });
        return;
      }

      const c = RN.db.community();
      const now = Date.now();
      const cover = COVERS[selectedCover];

      if (existing) {
        RN.db.updateCommunityGame(existing.id, {
          title: title, description: desc,
          cover: cover.e, coverBg: cover.bg,
          files: JSON.parse(JSON.stringify(project.files)),
          status: review.status,
          moderationNote: review.reason,
          updatedAt: now
        });
        RN.ui.toast('Публикация обновлена', 'success');
      } else {
        const game = {
          id: 'u' + now.toString(36) + Math.random().toString(36).slice(2, 6),
          title: title,
          description: desc,
          cover: cover.e,
          coverBg: cover.bg,
          author: p.nick,
          authorKey: p.nick.toLowerCase(),
          status: review.status,
          moderationNote: review.reason,
          likes: 0, plays: 0, favorites: 0, reports: 0,
          files: JSON.parse(JSON.stringify(project.files)),
          createdAt: now,
          publishedAt: now
        };
        RN.db.addCommunityGame(game);
        project.published = true;
        project.publishedId = game.id;
        p.published = p.published || [];
        p.published.push(game.id);
        RN.projects.update(project.id, { published: true, publishedId: game.id });
        RN.economy.grant(p, 25, 'Публикация игры: ' + title, 'earn');
        RN.achievements.checkAll(p);
        RN.ui.toast(review.status === 'approved' ? 'Игра опубликована! +25 Coins' : 'Игра отправлена на проверку', review.status === 'approved' ? 'success' : 'info', { duration: 4200 });
        RN.ui.confetti();
      }
      m.close();
      updateNavCount();
      if (RN.router.current && RN.router.current.pattern === 'community') RN.router.render();
    });
  };

  function updateNavCount() {
    const el = document.getElementById('navCommunityCount');
    if (!el) return;
    const n = RN.db.community().games.filter(g => g.status === 'approved').length;
    el.hidden = n === 0;
    el.textContent = n;
  }
  RN.updateNavCount = updateNavCount;

  /* ============================================================
     Play community game
     ============================================================ */
  RN.pages.communityPlay = function (view, params) {
    const p = RN.db.profile();
    const g = RN.db.community().games.find(x => x.id === params.id);
    if (!g) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🌐</div><h3>Игра не найдена</h3><a class="btn btn-primary" href="#/community">К сообществу</a></div></div>';
      return;
    }
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🔐</div><h3>Войдите, чтобы играть</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }
    if (g.status === 'pending' && g.author !== p.nick) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🛡️</div><h3>Игра на модерации</h3><p>' + RN.esc(g.moderationNote || 'Автору нужно дождаться проверки.') + '</p><a class="btn" href="#/community">К сообществу</a></div></div>';
      return;
    }
    if (g.status === 'hidden' && g.author !== p.nick) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🚫</div><h3>Игра скрыта модерацией</h3><p>На игру поступило несколько жалоб.</p><a class="btn" href="#/community">К сообществу</a></div></div>';
      return;
    }

    // count the play (only real opens)
    g.plays = (g.plays || 0) + 1;
    RN.db.save();

    const liked = (p.moderation.likesGiven || []).includes(g.id);
    const fav = p.favorites.includes(g.id);
    const isOwn = g.author === p.nick;

    view.innerHTML =
      '<div class="page page-wide" style="padding:20px 24px 60px">' +
      '<div class="game-page">' +
      '<div class="game-shell" id="comShell" style="--gs-accent:#06B6D4">' +
      '<div class="gs-hud">' +
      '<div class="gs-left"><button class="gs-btn" id="comBack" title="Назад">←</button>' +
      '<div class="gs-title"><span class="gs-emoji">' + (g.cover || '🎮') + '</span> ' + RN.esc(g.title) + '</div></div>' +
      '<div class="gs-stats"><div class="gs-stat"><span class="gs-stat-label">Автор</span><b style="font-size:13px">' + RN.esc(g.author) + '</b></div>' +
      '<div class="gs-stat gs-best"><span class="gs-stat-label">Запусков</span><b>' + RN.fmtNum(g.plays) + '</b></div></div>' +
      '<div class="gs-right">' +
      '<button class="gs-btn" id="comLike" title="Нравится" style="' + (liked ? 'color:#F472B6' : '') + '">' + (liked ? '❤' : '♡') + '</button>' +
      '<button class="gs-btn" id="comFav" title="Избранное">' + (fav ? '★' : '☆') + '</button>' +
      '<button class="gs-btn" id="comReport" title="Жалоба">⚑</button>' +
      '<button class="gs-btn" id="comFs" title="Полный экран">⛶</button>' +
      '</div></div>' +
      '<div class="gs-stage" style="background:#fff"><iframe id="comFrame" sandbox="allow-scripts allow-pointer-lock" style="width:100%;height:100%;border:none;display:block" title="' + RN.esc(g.title) + '"></iframe></div>' +
      '<div class="gs-hint show" id="comHint"><span class="gs-hint-ico">🛡️</span> Игра сообщества запущена в изолированном sandbox-iframe</div>' +
      '</div>' +

      '<div class="game-info">' +
      '<div class="card game-desc-card">' +
      '<div class="game-meta-row">' +
      '<span class="chip cyan">🌐 Игра сообщества</span>' +
      '<span class="chip ' + (g.status === 'approved' ? 'green' : 'amber') + '">' + statusLabel(g.status) + '</span>' +
      '<span class="chip">❤ ' + (g.likes || 0) + ' лайков</span>' +
      '<span class="chip">▶ ' + RN.fmtNum(g.plays) + '</span>' +
      '</div>' +
      '<h3>' + RN.esc(g.title) + '</h3>' +
      '<p>' + RN.esc(g.description || 'Без описания') + '</p>' +
      '<div class="row" style="gap:10px;flex-wrap:wrap;margin-top:14px">' +
      '<button class="btn" id="comRemix">🎨 Сделать ремикс</button>' +
      (isOwn ? '<a class="btn" href="#/community">Мои публикации</a>' : '<button class="btn btn-ghost" id="comReport2">⚑ Пожаловаться</button>') +
      '</div>' +
      '</div>' +
      '<div class="side-box">' +
      '<div class="card no-hover">' +
      '<h3 style="font-size:15px;margin-bottom:12px">👤 Об авторе</h3>' +
      '<div class="row"><span class="avatar">' + RN.esc(g.author.charAt(0).toUpperCase()) + '</span>' +
      '<div><div style="font-weight:700;font-family:var(--font-head)">' + RN.esc(g.author) + '</div>' +
      '<div class="muted small">Опубликовано ' + RN.timeAgo(g.publishedAt) + '</div></div></div>' +
      '</div>' +
      '<a class="btn btn-block" href="#/community">← Все игры сообщества</a>' +
      '</div></div></div></div>';

    // mount sandbox
    const frame = view.querySelector('#comFrame');
    frame.srcdoc = RN.projects.buildDoc(g.files || []);

    // error bridge for community games
    let errShown = false;
    function onMsg(e) {
      if (e.source !== frame.contentWindow) return;
      const d = e.data;
      if (d && d.rnSandbox && d.type === 'error' && !errShown) {
        errShown = true;
        RN.ui.toast('В игре сообщества произошла ошибка: ' + String(d.args && d.args[0] || '').slice(0, 80), 'error', { duration: 5000 });
      }
    }
    window.addEventListener('message', onMsg);

    view.querySelector('#comBack').addEventListener('click', () => RN.router.go('community'));
    view.querySelector('#comLike').addEventListener('click', () => {
      const idx = (p.moderation.likesGiven || []).indexOf(g.id);
      p.moderation.likesGiven = p.moderation.likesGiven || [];
      if (idx >= 0) { p.moderation.likesGiven.splice(idx, 1); g.likes = Math.max(0, g.likes - 1); }
      else { p.moderation.likesGiven.push(g.id); g.likes = (g.likes || 0) + 1; RN.sfx.play('coin'); }
      RN.db.save();
      RN.router.render();
    });
    view.querySelector('#comFav').addEventListener('click', () => {
      const idx = p.favorites.indexOf(g.id);
      if (idx >= 0) p.favorites.splice(idx, 1);
      else p.favorites.push(g.id);
      RN.db.save();
      RN.router.render();
    });
    view.querySelector('#comReport').addEventListener('click', () => { reportGame(g.id); });
    const r2 = view.querySelector('#comReport2');
    if (r2) r2.addEventListener('click', () => { reportGame(g.id); });
    view.querySelector('#comFs').addEventListener('click', () => {
      const shell = view.querySelector('#comShell');
      if (document.fullscreenElement) document.exitFullscreen();
      else shell.requestFullscreen && shell.requestFullscreen().catch(() => {});
    });
    view.querySelector('#comRemix').addEventListener('click', async () => {
      const ok = await RN.ui.confirm('Сделать ремикс?', 'Файлы игры <b>' + RN.esc(g.title) + '</b> скопируются в новый проект. Вы сможете изменять код.', { okText: 'Создать ремикс' });
      if (!ok) return;
      const proj = RN.projects.create('Ремикс: ' + g.title, 'blank');
      if (!proj) return;
      proj.files = JSON.parse(JSON.stringify(g.files || []));
      proj.snapshot = JSON.parse(JSON.stringify(proj.files));
      proj.icon = g.cover || '🎮';
      RN.projects.update(proj.id, { files: proj.files, snapshot: proj.snapshot, icon: proj.icon });
      RN.achievements.checkAll(p);
      RN.ui.toast('Ремикс создан — открываем редактор', 'success');
      RN.router.go('editor/' + proj.id);
    });

    setTimeout(() => {
      const hint = view.querySelector('#comHint');
      if (hint) hint.classList.remove('show');
    }, 4500);

    return function cleanup() {
      window.removeEventListener('message', onMsg);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  };

  // update community count badge after boot
  document.addEventListener('DOMContentLoaded', () => {
    try { updateNavCount(); } catch (e) {}
  });
})();
