/* ============================================================
   RetroNova — Store: persistence, profiles, state (localStorage)
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});
  const KEY = 'retroNova.db.v1';

  const defaultSettings = {
    sound: true,
    music: false,
    sfxVolume: 0.6,
    reduceMotion: false,
    showControlsHint: true
  };

  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  RN.todayKey = todayKey;

  const blank = {
    version: 1,
    current: null,
    profiles: {},
    community: { games: [], reports: {} },
    ui: { lastLoginShown: false }
  };

  let db = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(blank));
      const parsed = JSON.parse(raw);
      // migrate / fill gaps
      parsed.version = 1;
      parsed.profiles = parsed.profiles || {};
      parsed.community = parsed.community || { games: [], reports: {} };
      parsed.community.games = parsed.community.games || [];
      parsed.ui = parsed.ui || { lastLoginShown: false };
      return parsed;
    } catch (e) {
      console.warn('[RetroNova] store load failed, resetting', e);
      return JSON.parse(JSON.stringify(blank));
    }
  }

  let saveTimer = null;
  function persist() {
    // debounced write
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch (e) {
        console.warn('[RetroNova] save failed (storage full?)', e);
        RN.ui && RN.ui.toast('Не удалось сохранить данные — хранилище переполнено', 'error');
      }
    }, 120);
  }
  function flush() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
  }
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  /* ---------- Profile factory ---------- */
  function newProfile(nick) {
    return {
      nick: nick,
      createdAt: Date.now(),
      lastLogin: todayKey(),
      lastLoginAt: Date.now(),
      streak: 0,
      coins: 0,
      lifetimeCoins: 0,
      spentCoins: 0,
      xp: 0,
      stats: { gamesPlayed: 0, totalScore: 0, timePlayed: 0, records: 0, wins: 0 },
      best: {},
      plays: {},
      achievements: {},
      inventory: ['theme_default', 'bg_none', 'accent_violet', 'frame_none'],
      equipped: { theme: 'theme_default', bg: 'bg_none', accent: 'accent_violet', frame: 'frame_none', snake: null, effect: null },
      quests: { date: null, list: [] },
      daily: { lastPlayReward: null },
      history: [],
      favorites: [],
      settings: Object.assign({}, defaultSettings),
      projects: [],
      moderation: { hidden: [], likesGiven: [] },
      seenTutorials: []
    };
  }

  /* ---------- Public API ---------- */
  RN.db = {
    raw: () => db,
    save: persist,
    flush,
    today: todayKey,

    currentNick: () => db.current,
    getProfile(nick) { return db.profiles[nick || db.current] || null; },
    profile() { return db.current ? db.profiles[db.current] : null; },

    hasProfile(nick) { return !!db.profiles[String(nick || '').toLowerCase()]; },

    createProfile(nick) {
      const clean = String(nick || '').trim().replace(/\s+/g, ' ').slice(0, 20);
      const key = clean.toLowerCase();
      if (clean.length < 2) return { ok: false, error: 'Ник должен содержать минимум 2 символа' };
      if (!/^[\wА-Яа-яЁё \-\.]+$/u.test(clean)) return { ok: false, error: 'Допустимы буквы, цифры, пробел, дефис и точка' };
      if (db.profiles[key]) return { ok: false, error: 'Этот ник уже занят другим игроком', exists: true };
      db.profiles[key] = newProfile(clean);
      db.current = key;
      persist();
      if (RN.economy) RN.economy.grant(db.profiles[key], 50, 'Бонус новичка', 'welcome');
      return { ok: true, nick: key };
    },

    login(nick) {
      const key = String(nick || '').trim().toLowerCase();
      if (!db.profiles[key]) return { ok: false, error: 'Профиль не найден' };
      db.current = key;
      const p = db.profiles[key];
      const t = todayKey();
      if (p.lastLogin !== t) {
        // daily login reward — once per calendar day, survives refresh
        p.lastLogin = t;
        p.streak = isYesterday(p.lastLoginAt) ? (p.streak || 0) + 1 : 1;
        p.lastLoginAt = Date.now();
        RN.economy && RN.economy.grant(p, 15, 'Ежедневный вход (' + p.streak + ' дн.)', 'daily');
        RN.quests && RN.quests.ensure(p);
      }
      persist();
      return { ok: true, nick: key };
    },

    logout() { db.current = null; persist(); },
    deleteProfile(nick) {
      const key = String(nick || '').toLowerCase();
      delete db.profiles[key];
      if (db.current === key) db.current = null;
      persist();
    },

    switchProfile(nick) { return this.login(nick); },
    allProfiles() { return Object.keys(db.profiles).map(k => ({ key: k, p: db.profiles[k] })); },

    community: () => db.community,
    addCommunityGame(game) {
      db.community.games.unshift(game);
      persist();
    },
    updateCommunityGame(id, patch) {
      const g = db.community.games.find(x => x.id === id);
      if (g) { Object.assign(g, patch); persist(); }
      return g;
    },
    removeCommunityGame(id) {
      db.community.games = db.community.games.filter(x => x.id !== id);
      persist();
    }
  };

  function isYesterday(ts) {
    if (!ts) return false;
    const a = new Date(ts), b = new Date();
    b.setDate(b.getDate() - 1);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  /* ---------- Per-profile mutation helper ---------- */
  RN.mutate = function (fn) {
    const p = RN.db.profile();
    if (!p) return null;
    const r = fn(p);
    persist();
    return r;
  };

  RN.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  };

  RN.fmtNum = function (n) {
    n = Math.round(Number(n) || 0);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString('ru-RU');
  };

  RN.timeAgo = function (ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'только что';
    if (s < 3600) return Math.floor(s / 60) + ' мин назад';
    if (s < 86400) return Math.floor(s / 3600) + ' ч назад';
    if (s < 2592000) return Math.floor(s / 86400) + ' дн назад';
    return new Date(ts).toLocaleDateString('ru-RU');
  };
})();
