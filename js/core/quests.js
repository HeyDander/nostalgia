/* ============================================================
   RetroNova — Daily quests
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const POOL = [
    { id: 'q_play3', t: 'Сыграйте в 3 любые игры', goal: 3, track: 'plays', r: 20 },
    { id: 'q_play5', t: 'Сыграйте в 5 любых игр', goal: 5, track: 'plays', r: 30 },
    { id: 'q_score500', t: 'Наберите 500 очков суммарно', goal: 500, track: 'score', r: 35 },
    { id: 'q_score2000', t: 'Наберите 2 000 очков суммарно', goal: 2000, track: 'score', r: 60 },
    { id: 'q_record1', t: 'Поставьте 1 рекорд', goal: 1, track: 'records', r: 40 },
    { id: 'q_games_var2', t: 'Сыграйте в 2 разные игры', goal: 2, track: 'varGames', r: 25 },
    { id: 'q_score_any1000', t: 'Наберите 1 000 очков в одной игре', goal: 1000, track: 'maxScore', r: 45 },
    { id: 'q_play5_same', t: 'Завершите 5 игр подряд (любых)', goal: 5, track: 'plays', r: 30 }
  ];

  function rand(n) { return Math.floor(Math.random() * n); }

  function ensure(p) {
    const t = RN.todayKey();
    if (p.quests.date === t && p.quests.list && p.quests.list.length) return p.quests;
    const picked = [];
    const pool = POOL.slice();
    while (picked.length < 3 && pool.length) {
      picked.push(pool.splice(rand(pool.length), 1)[0]);
    }
    p.quests = {
      date: t,
      list: picked.map(q => ({
        id: q.id, t: q.t, goal: q.goal, track: q.track, r: q.r,
        progress: 0, done: false, claimed: false, _title: q.t
      }))
    };
    // keep unfinished quests from previous day? No — daily reset by design.
    RN.db.save();
    return p.quests;
  }

  function onGamePlayed(gameId, score, wasRecord) {
    const p = RN.db.profile();
    if (!p) return;
    ensure(p);
    const quests = p.quests.list;
    let changed = false;

    quests.forEach(q => {
      if (q.done) return;
      if (q.track === 'plays') {
        q.progress += 1;
      } else if (q.track === 'score') {
        q.progress += Math.max(0, score || 0);
      } else if (q.track === 'records' && wasRecord) {
        q.progress += 1;
      } else if (q.track === 'maxScore') {
        q.progress = Math.max(q.progress, score || 0);
      } else if (q.track === 'varGames') {
        q._seen = q._seen || {};
        q._seen[gameId] = true;
        q.progress = Object.keys(q._seen).length;
      }
      if (q.progress >= q.goal) q.done = true;
      changed = true;
    });

    if (changed) {
      RN.db.save();
      document.dispatchEvent(new CustomEvent('rn:quests'));
      quests.filter(q => q.done && !q.claimed).forEach(q => {
        RN.ui.toast('Задание выполнено: ' + q.t + ' — заберите награду', 'info', { duration: 3800 });
      });
    }
  }

  function claim(qid) {
    const p = RN.db.profile();
    if (!p) return { ok: false, error: 'Нет профиля' };
    ensure(p);
    const q = p.quests.list.find(x => x.id === qid);
    if (!q) return { ok: false, error: 'Задание не найдено' };
    if (!q.done) return { ok: false, error: 'Задание ещё не выполнено' };
    if (q.claimed) return { ok: false, error: 'Награда уже получена' };
    q.claimed = true;
    p.questsDone = (p.questsDone || 0) + 1;
    RN.economy.grant(p, q.r, 'Задание: ' + q.t, 'quest');
    RN.economy.checkAll ? null : null;
    if (RN.achievements) RN.achievements.checkAll(p);
    RN.db.save();
    document.dispatchEvent(new CustomEvent('rn:quests'));
    return { ok: true, amount: q.r };
  }

  function progress(p) {
    p = p || RN.db.profile();
    if (!p) return { done: 0, total: 3, claimed: 0 };
    ensure(p);
    return {
      done: p.quests.list.filter(q => q.done).length,
      claimed: p.quests.list.filter(q => q.claimed).length,
      total: p.quests.list.length,
      list: p.quests.list
    };
  }

  RN.quests = { ensure, onGamePlayed, claim, progress, pool: POOL };
})();
