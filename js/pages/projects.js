/* ============================================================
   RetroNova — Page: My projects
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  RN.pages.projects = function (view) {
    const p = RN.db.profile();
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">📁</div><h3>Войдите, чтобы хранить проекты</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }

    const projects = p.projects;
    const community = RN.db.community().games;

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Мои проекты</h1><p class="sub">' + projects.length + ' проектов · автосохранение включено</p></div>' +
      '<div class="page-head-actions"><a class="btn btn-primary" href="#/editor">+ Новый проект</a></div>' +
      '</div>' +

      (projects.length ? '<div class="community-grid">' + projects.map(proj => {
        const pub = proj.publishedId ? community.find(g => g.id === proj.publishedId) : null;
        return '<div class="cg-card">' +
          '<div class="cg-cover" style="background:linear-gradient(150deg,rgba(var(--accent-rgb),.35),#0D1020)">' +
          (pub ? '<span class="cg-status ' + (pub.status === 'approved' ? 'approved' : pub.status === 'pending' ? 'pending' : 'rejected') + '">' +
            (pub.status === 'approved' ? 'Опубликовано' : pub.status === 'pending' ? 'На проверке' : pub.status === 'hidden' ? 'Скрыто' : 'Отклонено') + '</span>' : '') +
          (proj.icon || '🎮') + '</div>' +
          '<div class="cg-body">' +
          '<div class="cg-title">' + RN.esc(proj.name) + '</div>' +
          '<div class="cg-desc">' + proj.files.length + ' файлов · изменён ' + RN.timeAgo(proj.updatedAt) + '</div>' +
          '<div class="cg-meta" style="gap:6px;flex-wrap:wrap">' +
          '<a class="btn btn-sm btn-primary" href="#/editor/' + proj.id + '">Открыть</a>' +
          '<button class="btn btn-sm" data-dup="' + proj.id + '">Копия</button>' +
          (proj.publishedId ? '' : '<button class="btn btn-sm btn-green" data-pub="' + proj.id + '">Опубликовать</button>') +
          '<button class="btn btn-sm btn-danger" data-del="' + proj.id + '">Удалить</button>' +
          '</div></div></div>';
      }).join('') + '</div>' :
        '<div class="empty-state"><div class="es-ico">🛠️</div><h3>Пока нет проектов</h3><p>Создайте первую игру в конструкторе — это займёт пару минут.</p><a class="btn btn-primary" href="#/editor">Создать игру</a></div>') +
      '</div>';

    view.querySelectorAll('[data-dup]').forEach(b => {
      b.addEventListener('click', () => {
        const copy = RN.projects.duplicate(b.dataset.dup);
        if (copy) { RN.ui.toast('Создана копия проекта', 'success'); RN.pages.projects(view); }
      });
    });

    view.querySelectorAll('[data-pub]').forEach(b => {
      b.addEventListener('click', () => {
        const proj = RN.projects.get(b.dataset.pub);
        if (proj && RN.openPublishModal) RN.openPublishModal(proj);
      });
    });

    view.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', async () => {
        const proj = RN.projects.get(b.dataset.del);
        if (!proj) return;
        const ok = await RN.ui.confirm('Удалить проект?', 'Проект <b>' + RN.esc(proj.name) + '</b> будет удалён безвозвратно.', { danger: true, okText: 'Удалить' });
        if (!ok) return;
        RN.projects.remove(proj.id);
        RN.ui.toast('Проект удалён', 'info');
        RN.pages.projects(view);
      });
    });
  };
})();
