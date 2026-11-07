/* ============================================================
   RetroNova — Page: Games catalog
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  const GENRES = [
    { id: 'all', name: 'Все', ico: '🎮' },
    { id: 'arcade', name: 'Аркады', ico: '👾' },
    { id: 'puzzle', name: 'Головоломки', ico: '🧩' },
    { id: 'action', name: 'Экшен', ico: '💥' },
    { id: 'strategy', name: 'Стратегии', ico: '♟️' },
    { id: 'sports', name: 'Спорт', ico: '🏀' },
    { id: 'casual', name: 'Casual', ico: '🍿' },
    { id: 'runner', name: 'Раннеры', ico: '🏃' },
    { id: 'race', name: 'Гонки', ico: '🏎️' }
  ];

  let state = { genre: 'all', q: '', sort: 'default' };

  RN.pages.games = function (view, params) {
    // read query from hash (?q=)
    const hash = location.hash;
    const qi = hash.indexOf('?');
    if (qi >= 0) {
      const params2 = new URLSearchParams(hash.slice(qi + 1));
      state.q = params2.get('q') || '';
    }

    const all = RN.games.all();
    const p = RN.db.profile();

    function counts() {
      const c = {};
      all.forEach(g => { c[g.genre] = (c[g.genre] || 0) + 1; });
      return c;
    }

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Все игры</h1><p class="sub">' + all.length + ' игр: от легендарных аркад до головоломок и спорта</p></div>' +
      '<div class="page-head-actions"><a class="btn" href="#/community">🌐 Игры сообщества</a>' +
      '<a class="btn btn-primary" href="#/editor">🛠️ Создать игру</a></div>' +
      '</div>' +

      '<div class="filter-bar">' +
      '<div class="search-box"><span class="ico">🔍</span><input id="catSearch" placeholder="Поиск игры…" value="' + RN.esc(state.q) + '"></div>' +
      '<select class="select" id="catSort" style="max-width:190px">' +
      '<option value="default">По умолчанию</option>' +
      '<option value="az">По названию А-Я</option>' +
      '<option value="year">По году (новые)</option>' +
      '<option value="best">Сначала с рекордами</option>' +
      '</select>' +
      '<span class="result-count" id="resultCount"></span>' +
      '</div>' +

      '<div class="pills" id="genrePills" style="margin-bottom:22px">' +
      GENRES.map(g => {
        const cnt = g.id === 'all' ? all.length : (counts()[g.id] || 0);
        return '<button class="pill ' + (state.genre === g.id ? 'active' : '') + '" data-genre="' + g.id + '">' +
          g.ico + ' ' + g.name + ' <span class="cnt">' + cnt + '</span></button>';
      }).join('') +
      '</div>' +

      '<div class="games-grid" id="gamesGrid"></div>' +
      '<div id="emptyCatalog"></div>' +
      '</div>';

    const grid = view.querySelector('#gamesGrid');
    const countEl = view.querySelector('#resultCount');
    const emptyEl = view.querySelector('#emptyCatalog');

    function renderGrid() {
      let list = all.slice();
      if (state.genre !== 'all') list = list.filter(g => g.genre === state.genre);
      if (state.q) {
        const q = state.q.toLowerCase();
        list = list.filter(g => (g.title + ' ' + g.desc + ' ' + g.genre).toLowerCase().includes(q));
      }
      if (state.sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      else if (state.sort === 'year') list.sort((a, b) => (b.year || 0) - (a.year || 0));
      else if (state.sort === 'best') list.sort((a, b) => ((p && p.best[b.id]) || 0) - ((p && p.best[a.id]) || 0));

      countEl.textContent = 'Найдено: ' + list.length;
      if (!list.length) {
        grid.innerHTML = '';
        emptyEl.innerHTML = '<div class="empty-state"><div class="es-ico">🔍</div><h3>Ничего не найдено</h3><p>Попробуйте изменить запрос или категорию.</p><button class="btn" id="resetFilters">Сбросить фильтры</button></div>';
        emptyEl.querySelector('#resetFilters').addEventListener('click', () => {
          state = { genre: 'all', q: '', sort: 'default' };
          view.querySelector('#catSearch').value = '';
          view.querySelectorAll('.pill').forEach(x => x.classList.toggle('active', x.dataset.genre === 'all'));
          renderGrid();
        });
        return;
      }
      emptyEl.innerHTML = '';
      grid.innerHTML = list.map(g => RN.components.gameCard(g)).join('');
    }

    view.querySelectorAll('#genrePills .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.genre = pill.dataset.genre;
        view.querySelectorAll('#genrePills .pill').forEach(x => x.classList.toggle('active', x === pill));
        renderGrid();
      });
    });

    const search = view.querySelector('#catSearch');
    let searchTimer;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.q = search.value.trim(); renderGrid(); }, 160);
    });

    view.querySelector('#catSort').addEventListener('change', e => {
      state.sort = e.target.value;
      renderGrid();
    });

    renderGrid();
  };
})();
