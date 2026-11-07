/* ============================================================
   RetroNova — Page: Game Constructor (HTML/CSS/JS editor)
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  const FILE_ICONS = { html: '🌐', css: '🎨', js: '⚙️', json: '📦', txt: '📄' };

  /* ---------- Syntax highlighting ---------- */
  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  function hlJS(code) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|this|true|false|null|undefined|typeof|instanceof|try|catch|finally|throw|async|await|of|in|delete|void|yield|import|export|from|default|static)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="tk-com">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tk-str">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tk-kw">' + esc(m[3]) + '</span>';
      else if (m[4]) out += '<span class="tk-num">' + esc(m[4]) + '</span>';
      else if (m[5]) out += '<span class="tk-fn">' + esc(m[5]) + '</span>';
      last = re.lastIndex;
    }
    out += esc(code.slice(last));
    return out;
  }

  function hlCSS(code) {
    const re = /(\/\*[\s\S]*?\*\/)|([.#]?[A-Za-z][\w\-.#: >,()\[\]="'*]*)(?=\s*\{)|([A-Za-z-]+)(?=\s*:)|(:\s*[^;{}\n]+)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="tk-com">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tk-tag">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tk-prop">' + esc(m[3]) + '</span>';
      else if (m[4]) out += '<span class="tk-str">' + esc(m[4]) + '</span>';
      else if (m[5]) out += '<span class="tk-str">' + esc(m[5]) + '</span>';
      last = re.lastIndex;
    }
    out += esc(code.slice(last));
    return out;
  }

  function hlHTML(code) {
    // split by comments and tags
    const re = /(<!--[\s\S]*?-->)|(<\/?)([\w-]+)([^>]*?)(\/?>)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) {
        out += '<span class="tk-com">' + esc(m[1]) + '</span>';
      } else {
        out += '<span class="tk-punc">' + esc(m[2]) + '</span><span class="tk-tag">' + esc(m[3]) + '</span>';
        out += highlightAttrs(m[4]);
        out += '<span class="tk-punc">' + esc(m[5]) + '</span>';
      }
      last = re.lastIndex;
    }
    out += esc(code.slice(last));
    return out;
  }

  function highlightAttrs(attrs) {
    const re = /([\w-]+)(=)("[^"]*"|'[^']*')?/g;
    let out = '', last = 0, m;
    while ((m = re.exec(attrs))) {
      out += esc(attrs.slice(last, m.index));
      out += '<span class="tk-attr">' + esc(m[1]) + '</span><span class="tk-punc">' + esc(m[2]) + '</span>';
      if (m[3]) out += '<span class="tk-str">' + esc(m[3]) + '</span>';
      last = re.lastIndex;
    }
    out += esc(attrs.slice(last));
    return out;
  }

  function highlight(code, filename) {
    if (/\.html?$/i.test(filename)) return hlHTML(code);
    if (/\.css$/i.test(filename)) return hlCSS(code);
    if (/\.js$/i.test(filename)) return hlJS(code);
    return esc(code);
  }

  /* ---------- Page ---------- */
  RN.pages.editor = function (view, params) {
    const p = RN.db.profile();
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🛠️</div><h3>Войдите, чтобы создавать игры</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }

    // No project selected → project picker
    if (!params.projectId) {
      renderPicker(view);
      return;
    }

    const project = RN.projects.get(params.projectId);
    if (!project) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">📁</div><h3>Проект не найден</h3><a class="btn btn-primary" href="#/projects">Мои проекты</a></div></div>';
      return;
    }

    if (!project.snapshot) project.snapshot = JSON.parse(JSON.stringify(project.files));
    let activeFile = project.files.find(f => f.name === project.activeFile) || project.files[0];
    if (!activeFile) {
      project.files.push({ name: 'index.html', content: '<!DOCTYPE html><html><body><h1>Моя игра</h1></body></html>' });
      activeFile = project.files[0];
    }

    let autoTimer = null;
    let iframe = null;
    let msgHandler = null;
    let dirty = false;
    let lastRun = 0;

    view.innerHTML =
      '<div class="editor-page">' +
      '<div class="editor-topbar">' +
      '<div class="et-title"><span>🛠️</span><input id="projName" value="' + RN.esc(project.name) + '" maxlength="40" title="Название проекта"></div>' +
      '<span class="save-state" id="saveState">Сохранено</span>' +
      '<button class="btn btn-sm" id="btnTemplates">📚 Примеры</button>' +
      '<button class="btn btn-sm" id="btnPublish">🚀 Опубликовать</button>' +
      '<button class="btn btn-sm" id="btnReset" title="Вернуть код к последнему сохранению">↺ Сбросить</button>' +
      '<button class="btn btn-sm" id="btnSave">💾 Сохранить</button>' +
      '<button class="btn btn-sm btn-primary" id="btnRun">▶ Запустить</button>' +
      '</div>' +
      '<div class="editor-layout">' +

      '<div class="ed-files">' +
      '<div class="ed-files-head"><span>Файлы</span><button class="icon-btn" id="btnAddFile" style="width:26px;height:26px;font-size:15px;border-radius:8px" title="Добавить файл">+</button></div>' +
      '<div id="fileList"></div>' +
      '<div class="ed-files-note">index.html — точка входа.<br>style.css и main.js подключаются автоматически.</div>' +
      '</div>' +

      '<div class="ed-code">' +
      '<div class="ed-code-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="cur-file" id="curFileName">' + RN.esc(activeFile.name) + '</span>' +
      '<span style="margin-left:auto" id="lineInfo"></span></div>' +
      '<div class="code-wrap">' +
      '<div class="code-gutter" id="gutter"></div>' +
      '<div class="code-area-wrap">' +
      '<pre class="code-highlight" id="highlight" aria-hidden="true"></pre>' +
      '<textarea class="code-input" id="codeInput" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off"></textarea>' +
      '</div></div></div>' +

      '<div class="ed-preview">' +
      '<div class="ed-preview-head">▶ Предпросмотр <span class="status" id="previewStatus">готов</span>' +
      '<button class="icon-btn" id="btnFs" style="width:28px;height:28px;font-size:13px;border-radius:8px;margin-left:8px" title="Полный экран">⛶</button></div>' +
      '<div class="ed-code">' +
      '<div class="ed-console">' +
      '<div class="ed-console-head"><span>▣ Консоль</span><button class="clr" id="btnClearConsole">Очистить</button></div>' +
      '<div class="ed-console-log" id="consoleLog"></div>' +
      '</div>' +
      '</div>' +

      '</div></div>';

    const $ = s => view.querySelector(s);
    const codeInput = $('#codeInput');
    const highlightEl = $('#highlight');
    const gutter = $('#gutter');
    const consoleLog = $('#consoleLog');

    /* ---------- file list ---------- */
    function renderFiles() {
      const list = $('#fileList');
      list.innerHTML = project.files.map(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        return '<div class="ed-file ' + (f.name === activeFile.name ? 'active' : '') + '" data-file="' + RN.esc(f.name) + '">' +
          '<span class="fi">' + (FILE_ICONS[ext] || '📄') + '</span>' +
          '<span class="fname">' + RN.esc(f.name) + '</span>' +
          (project.files.length > 1 ? '<button class="fdel" data-del="' + RN.esc(f.name) + '" title="Удалить файл">✕</button>' : '') +
          '</div>';
      }).join('');

      list.querySelectorAll('.ed-file').forEach(el => {
        el.addEventListener('click', e => {
          if (e.target.closest('[data-del]')) return;
          switchFile(el.dataset.file);
        });
      });
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          const name = btn.dataset.del;
          if (name === 'index.html') { RN.ui.toast('index.html удалить нельзя — это точка входа', 'warn'); return; }
          const ok = await RN.ui.confirm('Удалить файл?', 'Файл <b>' + RN.esc(name) + '</b> будет удалён безвозвратно.', { danger: true, okText: 'Удалить' });
          if (!ok) return;
          project.files = project.files.filter(f => f.name !== name);
          if (activeFile.name === name) switchFile(project.files[0].name);
          saveDraft();
          renderFiles();
          run();
        });
      });
    }

    /* ---------- code editor ---------- */
    function switchFile(name) {
      const f = project.files.find(x => x.name === name);
      if (!f) return;
      activeFile = f;
      project.activeFile = name;
      codeInput.value = f.content;
      $('#curFileName').textContent = name;
      updateHighlight();
      renderFiles();
    }

    function updateHighlight() {
      const code = codeInput.value;
      highlightEl.innerHTML = highlight(code, activeFile.name) + '\n';
      // line numbers
      const lines = code.split('\n').length;
      let g = '';
      for (let i = 1; i <= lines; i++) g += i + '\n';
      gutter.textContent = g;
      $('#lineInfo').textContent = code.length + ' симв. · ' + lines + ' стр.';
      syncScroll();
    }

    function syncScroll() {
      highlightEl.scrollTop = codeInput.scrollTop;
      highlightEl.scrollLeft = codeInput.scrollLeft;
      gutter.scrollTop = codeInput.scrollTop;
    }

    codeInput.addEventListener('scroll', syncScroll);
    codeInput.addEventListener('input', () => {
      activeFile.content = codeInput.value;
      updateHighlight();
      markDirty();
      scheduleAutosave();
    });

    codeInput.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;
        const val = codeInput.value;
        if (start !== end) {
          // indent selection
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          const chunk = val.slice(lineStart, end);
          const indented = chunk.split('\n').map(l => '  ' + l).join('\n');
          codeInput.value = val.slice(0, lineStart) + indented + val.slice(end);
          codeInput.selectionStart = start + 2;
          codeInput.selectionEnd = end + (indented.length - chunk.length);
        } else {
          codeInput.value = val.slice(0, start) + '  ' + val.slice(end);
          codeInput.selectionStart = codeInput.selectionEnd = start + 2;
        }
        activeFile.content = codeInput.value;
        updateHighlight();
        markDirty();
        scheduleAutosave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveSnapshot(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    });

    /* ---------- autosave ---------- */
    function markDirty() {
      dirty = true;
      const st = $('#saveState');
      st.textContent = 'Не сохранено…';
      st.classList.remove('saved');
    }
    function scheduleAutosave() {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => {
        saveDraft();
        const st = $('#saveState');
        st.textContent = 'Автосохранено';
        st.classList.add('saved');
      }, 900);
    }
    function saveDraft() {
      RN.projects.update(project.id, {
        files: project.files,
        name: $('#projName').value.trim() || project.name,
        activeFile: activeFile.name
      });
      dirty = false;
    }
    function saveSnapshot(manual) {
      clearTimeout(autoTimer);
      const name = $('#projName').value.trim() || project.name;
      project.snapshot = JSON.parse(JSON.stringify(project.files));
      RN.projects.update(project.id, {
        files: project.files,
        name: name,
        activeFile: activeFile.name,
        snapshot: project.snapshot
      });
      dirty = false;
      const st = $('#saveState');
      st.textContent = 'Сохранено';
      st.classList.add('saved');
      if (manual) {
        RN.sfx.play('success');
        RN.ui.toast('Проект сохранён', 'success');
      }
    }

    $('#projName').addEventListener('input', () => {
      RN.projects.update(project.id, { name: $('#projName').value.trim() || 'Без названия' });
      markDirty();
      scheduleAutosave();
    });

    /* ---------- console ---------- */
    function logLine(type, text) {
      const t = new Date();
      const ts = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
      const el = document.createElement('div');
      el.className = 'line ' + (type === 'error' ? 'error' : type === 'warn' ? 'warn' : type === 'info' ? 'info' : 'log');
      el.innerHTML = '<span class="ts">' + ts + '</span>' + RN.esc(text);
      consoleLog.appendChild(el);
      consoleLog.scrollTop = consoleLog.scrollHeight;
      if (consoleLog.children.length > 120) consoleLog.removeChild(consoleLog.firstChild);
    }

    $('#btnClearConsole').addEventListener('click', () => { consoleLog.innerHTML = ''; });

    msgHandler = function (e) {
      if (!iframe || e.source !== iframe.contentWindow) return;
      const d = e.data;
      if (!d || !d.rnSandbox) return;
      const text = (d.args || []).join(' ');
      logLine(d.type, text);
      if (d.type === 'error') {
        const st = $('#previewStatus');
        st.textContent = 'ошибка';
        st.classList.add('err');
      }
    };
    window.addEventListener('message', msgHandler);

    /* ---------- run ---------- */
    function run() {
      const doc = RN.projects.buildDoc(project.files);
      const st = $('#previewStatus');
      st.textContent = 'запуск…';
      st.classList.remove('err');
      consoleLog.innerHTML = '';
      logLine('info', 'Запуск предпросмотра');

      // set game content directly into preview area (no iframe)
      // The preview area is the .ed-code element inside .ed-preview
      const previewCode = $('.ed-preview').find('.ed-code').first();
      if (previewCode.length) {
        previewCode[0].innerHTML = doc;
      }
      lastRun = Date.now();
      setTimeout(() => {
        if ($('#previewStatus').classList.contains('err')) return;
        const st2 = $('#previewStatus');
        st2.textContent = 'работает';
        st2.classList.remove('err');
      }, 700);
    }

    $('#btnRun').addEventListener('click', () => { RN.sfx.play('click'); run(); });
    $('#btnSave').addEventListener('click', () => saveSnapshot(true));

    $('#btnReset').addEventListener('click', async () => {
      const ok = await RN.ui.confirm('Сбросить изменения?', 'Код вернётся к последнему сохранению (кнопка «Сохранить»).', { danger: true, okText: 'Сбросить' });
      if (!ok) return;
      if (project.snapshot) {
        project.files = JSON.parse(JSON.stringify(project.snapshot));
        activeFile = project.files.find(f => f.name === project.activeFile) || project.files[0];
      } else {
        const tpl = RN.projects.TEMPLATES.blank;
        project.files = tpl.files.map(f => ({ name: f.name, content: f.content }));
        activeFile = project.files[0];
      }
      saveDraft();
      switchFile(activeFile.name);
      renderFiles();
      run();
      RN.ui.toast('Код сброшен к сохранённой версии', 'info');
    });

    $('#btnFs').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    });

    /* ---------- add file ---------- */
    $('#btnAddFile').addEventListener('click', async () => {
      const name = await RN.ui.prompt('Новый файл', 'например: game.js, style.css, index.html', '');
      if (!name) return;
      const clean = name.trim().replace(/[^\w.\-]/g, '').slice(0, 40);
      if (!clean || !/\.(html?|css|js|json|txt)$/i.test(clean)) {
        RN.ui.toast('Укажите имя с расширением: .html, .css или .js', 'error');
        return;
      }
      if (project.files.some(f => f.name.toLowerCase() === clean.toLowerCase())) {
        RN.ui.toast('Файл с таким именем уже существует', 'error');
        return;
      }
      const ext = clean.split('.').pop().toLowerCase();
      const starter = ext === 'html'
        ? '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title>Новая страница</title>\n</head>\n<body>\n  <h1>Привет!</h1>\n</body>\n</html>'
        : ext === 'css' ? '/* стили */\nbody {\n  margin: 0;\n}'
        : '// код\nconsole.log("Привет из игры!");\n';
      project.files.push({ name: clean, content: starter });
      saveDraft();
      switchFile(clean);
      renderFiles();
      RN.ui.toast('Файл создан: ' + clean, 'success');
    });

    /* ---------- templates ---------- */
    $('#btnTemplates').addEventListener('click', () => {
      const tpls = RN.projects.TEMPLATES;
      const m = RN.ui.openModal(
        '<div class="modal-head"><h3>📚 Примеры игр</h3><p class="sub">Загрузите готовый пример — код заменит текущие файлы</p></div>' +
        '<div class="tpl-grid">' +
        Object.keys(tpls).map(k =>
          '<div class="tpl-card" data-tpl="' + k + '"><div class="tc-ico">' + tpls[k].icon + '</div>' +
          '<div class="tc-t">' + RN.esc(tpls[k].name) + '</div><div class="tc-s">' + RN.esc(tpls[k].desc) + '</div></div>'
        ).join('') +
        '</div>' +
        '<div class="modal-foot"><button class="btn" data-close>Отмена</button></div>',
        { size: 'wide' }
      );
      m.findAll('[data-tpl]').forEach(card => {
        card.addEventListener('click', async () => {
          const key = card.dataset.tpl;
          const ok = await RN.ui.confirm('Загрузить пример?', 'Текущий код будет заменён примером «' + RN.esc(tpls[key].name) + '».', { danger: true, okText: 'Загрузить' });
          if (!ok) return;
          m.close();
          project.files = tpls[key].files.map(f => ({ name: f.name, content: f.content }));
          activeFile = project.files[0];
          project.snapshot = JSON.parse(JSON.stringify(project.files));
          saveDraft();
          switchFile(activeFile.name);
          renderFiles();
          run();
          RN.ui.toast('Пример загружен', 'success');
        });
      });
    });

    /* ---------- publish ---------- */
    $('#btnPublish').addEventListener('click', () => {
      saveSnapshot(false);
      if (RN.openPublishModal) RN.openPublishModal(project);
      else RN.ui.toast('Публикация недоступна', 'error');
    });

    /* ---------- init ---------- */
    codeInput.value = activeFile.content;
    updateHighlight();
    renderFiles();
    run();

    /* keyboard: block shell hotkeys leaking is handled by gameShell only */

    return function cleanup() {
      clearTimeout(autoTimer);
      if (dirty) saveDraft();
      if (msgHandler) window.removeEventListener('message', msgHandler);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  };

  /* ---------- Project picker (no id) ---------- */
  function renderPicker(view) {
    const p = RN.db.profile();
    const projects = p.projects;

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Конструктор игр</h1><p class="sub">Создавайте собственные игры на HTML, CSS и JavaScript — прямо в браузере</p></div>' +
      '<div class="page-head-actions"><a class="btn" href="#/projects">📁 Мои проекты</a></div>' +
      '</div>' +

      '<div class="two-col" style="margin-bottom:26px">' +
      '<div class="card pad-lg" style="background:linear-gradient(150deg,rgba(var(--accent-rgb),.18),var(--glass) 60%)">' +
      '<h3 style="font-size:20px">🚀 Начать новый проект</h3>' +
      '<p class="muted" style="font-size:13.5px">Выберите шаблон — или начните с чистого листа. Код запускается в изолированном sandbox iframe.</p>' +
      '<div class="tpl-grid" style="margin-top:14px">' +
      Object.keys(RN.projects.TEMPLATES).map(k => {
        const t = RN.projects.TEMPLATES[k];
        return '<div class="tpl-card" data-new="' + k + '"><div class="tc-ico">' + t.icon + '</div>' +
          '<div class="tc-t">' + RN.esc(t.name) + '</div><div class="tc-s">' + RN.esc(t.desc) + '</div></div>';
      }).join('') +
      '</div></div>' +

      '<div class="card pad-lg">' +
      '<h3 style="font-size:20px">🧭 Что можно создать</h3>' +
      '<ul class="controls-list" style="margin-top:14px">' +
      '<li><span class="key">HTML</span><span>Разметка, canvas, кнопки, текст</span></li>' +
      '<li><span class="key">CSS</span><span>Анимации, градиенты, адаптивная вёрстка</span></li>' +
      '<li><span class="key">JS</span><span>Игровая логика, физика, звуки WebAudio</span></li>' +
      '<li><span class="key">⛶</span><span>Полноэкранный предпросмотр и консоль ошибок</span></li>' +
      '<li><span class="key">🚀</span><span>Публикация в «Игры сообщества» с модерацией</span></li>' +
      '</ul></div>' +
      '</div>' +

      (projects.length ? RN.components.sectionHead('Недавние проекты', '📁', 'Все проекты', '#/projects') +
        '<div class="mini-list">' + projects.slice(0, 5).map(proj =>
          '<a class="mini-row" href="#/editor/' + proj.id + '">' +
          '<span class="mr-emoji">' + (proj.icon || '🎮') + '</span>' +
          '<div class="mr-body"><div class="mr-t">' + RN.esc(proj.name) + '</div>' +
          '<div class="mr-s">Изменён ' + RN.timeAgo(proj.updatedAt) + (proj.published ? ' · опубликован' : '') + '</div></div>' +
          '<span class="mr-v">→</span></a>'
        ).join('') + '</div>' : '') +
      '</div>';

    view.querySelectorAll('[data-new]').forEach(card => {
      card.addEventListener('click', async () => {
        const key = card.dataset.new;
        const name = await RN.ui.prompt('Название проекта', 'Например, «Космический шутер»', RN.projects.TEMPLATES[key].name);
        if (name === null) return;
        const proj = RN.projects.create(name || RN.projects.TEMPLATES[key].name, key);
        if (proj) {
          RN.sfx.play('success');
          RN.router.go('editor/' + proj.id);
        }
      });
    });
  }
})();
