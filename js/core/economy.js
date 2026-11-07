/* ============================================================
   RetroNova — Economy: Coins, awards, anti-abuse guards
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const AWARD = {
    PLAY: 5,        // завершение игры
    GOOD: 10,       // хороший результат
    RECORD: 20,     // новый рекорд
    DAILY: 15,      // ежедневный вход
    QUEST: 15,      // задание
    ACHIEVEMENT: 25 // достижение
  };
  RN.AWARD = AWARD;

  /* Anti-abuse: per-game cooldown so rapid restart-farming yields nothing.
     Awards only fire on real gameplay events (game over), never on page load. */
  const cooldowns = {}; // gameId -> ts of last play reward
  const PLAY_COOLDOWN = 8000; // ms between play rewards for same game
  const MIN_RUN_MS = 6000;    // run must last this long to earn play reward

  function grant(profile, amount, reason, type) {
    if (!profile || !amount || amount <= 0) return 0;
    profile.coins += amount;
    profile.lifetimeCoins += amount;
    profile.xp += Math.max(1, Math.round(amount / 2));
    profile.history.unshift({ t: Date.now(), type: type || 'earn', amount: amount, reason: reason });
    if (profile.history.length > 200) profile.history.length = 200;
    RN.db.save();
    document.dispatchEvent(new CustomEvent('rn:coins', { detail: { amount: amount, reason: reason } }));
    return amount;
  }

  function spend(profile, amount, reason) {
    if (!profile || amount > profile.coins) return false;
    profile.coins -= amount;
    profile.spentCoins += amount;
    profile.history.unshift({ t: Date.now(), type: 'spend', amount: -amount, reason: reason });
    if (profile.history.length > 200) profile.history.length = 200;
    RN.db.save();
    document.dispatchEvent(new CustomEvent('rn:coins', { detail: { amount: -amount, reason: reason } }));
    return true;
  }

  function notifyCoins(amount, reason) {
    if (amount > 0) {
      RN.ui.toast(reason, 'success', { coins: amount, duration: 2600 });
    }
  }

  /* Evaluate a finished game run: returns breakdown, grants coins once. */
  function awardRun(gameId, score, opts) {
    opts = opts || {};
    const p = RN.db.profile();
    if (!p) return null;
    const now = Date.now();
    const res = { base: 0, good: 0, record: 0, total: 0, reasons: [], blocked: false };

    const last = cooldowns[gameId] || 0;
    const runMs = opts.runMs || 0;

    // Anti-farm: ignore ultra-short runs right after another reward
    if (now - last < PLAY_COOLDOWN || runMs < MIN_RUN_MS) {
      res.blocked = true;
      res.reasons.push('Награда за игру временно недоступна (частые перезапуски)');
      // still check record — real progress is always rewarded
    } else {
      cooldowns[gameId] = now;
      res.base = AWARD.PLAY;
      res.reasons.push('Игра завершена');
    }

    // New record — naturally can't be farmed repeatedly (needs real score)
    const prevBest = p.best[gameId] || 0;
    const isRecord = score > prevBest;
    if (isRecord && score > 0) {
      if (now - last < 1500 && opts.forceRecordSafe !== false && cooldowns[gameId] === now) {
        // record awarded inside same window as base — allowed, it's a real new best
      }
      p.best[gameId] = score;
      p.stats.records = (p.stats.records || 0) + 1;
      res.record = AWARD.RECORD;
      res.reasons.push('Новый рекорд!');
    }

    // Good result threshold — provided per-game by caller
    const goodAt = opts.goodAt || 0;
    if (!res.blocked && goodAt && score >= goodAt) {
      res.good = AWARD.GOOD;
      res.reasons.push('Отличный результат');
    }

    res.total = res.base + res.good + res.record;
    if (res.total > 0) {
      const label = res.reasons.join(' · ');
      grant(p, res.total, label, 'earn');
      notifyCoins(res.total, label);
      if (res.record) {
        RN.ui.confetti(null, null, { count: 80 });
      }
    }

    // stats
    p.stats.gamesPlayed++;
    p.stats.totalScore += Math.max(0, score || 0);

    // quest progress
    if (RN.quests) RN.quests.onGamePlayed(gameId, score || 0, res.record);
    // achievements
    if (RN.achievements) RN.achievements.checkAll(p);
    // level ups
    checkLevelUp(p);
    RN.db.save();
    return res;
  }

  let lastLevel = null;
  function levelOf(xp) { return 1 + Math.floor(Math.sqrt((xp || 0) / 60)); }
  function xpForLevel(l) { return Math.pow(l - 1, 2) * 60; }
  function checkLevelUp(p) {
    const lvl = levelOf(p.xp);
    if (lastLevel === null) { lastLevel = lvl; return; }
    if (lvl > lastLevel) {
      lastLevel = lvl;
      RN.ui.toast('Новый уровень: ' + lvl + '!', 'success', { duration: 3500 });
      RN.ui.confetti();
      grant(p, 30, 'Уровень ' + lvl, 'level');
      if (RN.achievements) RN.achievements.checkAll(p);
    }
    lastLevel = lvl;
  }

  function syncLevel() {
    const p = RN.db.profile();
    lastLevel = p ? levelOf(p.xp) : null;
  }

  RN.economy = {
    grant, spend, awardRun, levelOf, xpForLevel, syncLevel,
    addPlayCooldown(gameId, ms) { cooldowns[gameId] = Date.now() + (ms || 0); },
    canReward(gameId) { return Date.now() - (cooldowns[gameId] || 0) >= PLAY_COOLDOWN; }
  };
})();
