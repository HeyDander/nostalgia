/* ============================================================
   RetroNova — Community moderation: auto-review + reports
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const BANNED = [
    'порн', 'секс', 'xxx', 'нарко', 'казино', 'ставк', 'ставки', 'крипт',
    'убий реальн', 'суицид', 'терроризм', 'насилие', 'взлом', 'ddos'
  ];

  /* Patterns that are suspicious in published sandbox games */
  const SUSPICIOUS = [
    { re: /fetch\s*\(|XMLHttpRequest|WebSocket\s*\(/i, why: 'сетевые запросы' },
    { re: /document\.cookie/i, why: 'доступ к cookie' },
    { re: /window\.top|parent\.document|opener\./i, why: 'доступ к родительскому окну' },
    { re: /localStorage|indexedDB/i, why: 'доступ к хранилищу (в песочнице может не работать)' },
    { re: /eval\s*\(\s*atob|new\s+Function\s*\(/i, why: 'динамическое исполнение кода' },
    { re: /crypto\s*\.\s*subtle|coinhive|miner/i, why: 'крипто-майнинг' },
    { re: /<iframe/i, why: 'вложенные iframe' }
  ];

  const MAX_SIZE = 400 * 1024; // 400KB total

  function checkText(text) {
    const low = String(text || '').toLowerCase();
    for (const w of BANNED) {
      if (low.includes(w)) return { ok: false, reason: 'Запрещённое слово в тексте: «' + w + '»' };
    }
    return { ok: true };
  }

  /* Returns { status: 'approved'|'pending'|'rejected', reason } */
  function review(project, meta) {
    const all = (project.files || []).map(f => f.content).join('\n');
    const total = all.length + (meta.description || '').length + (meta.title || '').length;

    if (total > MAX_SIZE) {
      return { status: 'rejected', reason: 'Проект слишком большой (максимум 400 КБ кода).' };
    }
    const t = checkText(meta.title + ' ' + meta.description);
    if (!t.ok) return { status: 'rejected', reason: t.reason };
    const tc = checkText(all);
    if (!tc.ok) return { status: 'rejected', reason: tc.reason };

    // scan for suspicious patterns
    for (const s of SUSPICIOUS) {
      if (s.re.test(all)) {
        return {
          status: 'pending',
          reason: 'Проект отправлен на ручную проверку: обнаружены ' + s.why + '. Игра скрыта из общей ленты до одобрения.'
        };
      }
    }
    // must have index.html
    if (!(project.files || []).some(f => f.name.toLowerCase() === 'index.html')) {
      return { status: 'rejected', reason: 'В проекте нет файла index.html — нечего запускать.' };
    }
    return { status: 'approved', reason: 'Автопроверка пройдена.' };
  }

  function report(gameId, reason) {
    const p = RN.db.profile();
    if (!p) return false;
    const c = RN.db.community();
    c.reports = c.reports || {};
    c.reports[gameId] = c.reports[gameId] || [];
    c.reports[gameId].push({ by: p.nick, reason: reason || 'Без причины', t: Date.now() });
    const game = c.games.find(g => g.id === gameId);
    if (game) {
      game.reports = (game.reports || 0) + 1;
      // auto-hide after 3 reports
      if (game.reports >= 3 && game.status === 'approved') {
        game.status = 'hidden';
        game.hiddenReason = 'Скрыто автоматически после 3 жалоб — ожидает проверки.';
      }
    }
    RN.db.save();
    return true;
  }

  function canPublishToday(p) {
    // basic anti-spam: max 5 publications per day per profile
    p = p || RN.db.profile();
    if (!p) return { ok: false, reason: 'Нет профиля' };
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const todayCount = (p.published || []).filter(id => {
      const g = RN.db.community().games.find(x => x.id === id);
      return g && g.publishedAt >= dayStart.getTime();
    }).length;
    if (todayCount >= 5) return { ok: false, reason: 'Лимит публикаций на сегодня: 5. Попробуйте завтра.' };
    return { ok: true };
  }

  RN.moderation = { review, report, checkText, canPublishToday, BANNED };
})();
