/* ============================================================
   RetroNova — Shop catalog: themes, colors, effects, frames, BGs
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  /* item: { id, name, desc, cat, rarity, price, kind, css?, preview? } */
  const ITEMS = [
    /* ---- Themes (color schemes) ---- */
    { id: 'theme_default', name: 'Классика', desc: 'Фирменная фиолетово-голубая тема', cat: 'themes', rarity: 'common', price: 0, kind: 'theme', val: 'default' },
    { id: 'theme_neon', name: 'Неоновый шторм', desc: 'Яркий неон: циан и фиолет', cat: 'themes', rarity: 'rare', price: 250, kind: 'theme', val: 'neon' },
    { id: 'theme_emerald', name: 'Изумруд', desc: 'Спокойный зелёный градиент', cat: 'themes', rarity: 'rare', price: 250, kind: 'theme', val: 'emerald' },
    { id: 'theme_sunset', name: 'Закат', desc: 'Оранжево-розовые зарницы', cat: 'themes', rarity: 'epic', price: 500, kind: 'theme', val: 'sunset' },
    { id: 'theme_crimson', name: 'Кровавая луна', desc: 'Алый с золотом', cat: 'themes', rarity: 'epic', price: 500, kind: 'theme', val: 'crimson' },
    { id: 'theme_gold', name: 'Золото чемпиона', desc: 'Роскошное золотое оформление', cat: 'themes', rarity: 'legendary', price: 1200, kind: 'theme', val: 'gold' },
    { id: 'theme_ice', name: 'Арктика', desc: 'Ледяной синий минимализм', cat: 'themes', rarity: 'rare', price: 300, kind: 'theme', val: 'ice' },
    { id: 'theme_mono', name: 'Нуар', desc: 'Строгий монохром', cat: 'themes', rarity: 'epic', price: 450, kind: 'theme', val: 'mono' },

    /* ---- Backgrounds ---- */
    { id: 'bg_none', name: 'Чистый фон', desc: 'Базовый тёмный фон с орбами', cat: 'backgrounds', rarity: 'common', price: 0, kind: 'bg', val: '' },
    { id: 'bg_stars', name: 'Звёздное небо', desc: 'Мерцающие звёзды', cat: 'backgrounds', rarity: 'common', price: 120, kind: 'bg', val: 'bg-stars' },
    { id: 'bg_dots', name: 'Точки', desc: 'Минималистичная точечная сетка', cat: 'backgrounds', rarity: 'common', price: 120, kind: 'bg', val: 'bg-dots' },
    { id: 'bg_mesh', name: 'Меш-градиент', desc: 'Плавные цветовые пятна', cat: 'backgrounds', rarity: 'rare', price: 280, kind: 'bg', val: 'bg-mesh' },
    { id: 'bg_carbon', name: 'Карбон', desc: 'Текстура углеволокна', cat: 'backgrounds', rarity: 'rare', price: 280, kind: 'bg', val: 'bg-carbon' },

    /* ---- Accent colors ---- */
    { id: 'accent_violet', name: 'Фиолет', desc: 'Классический акцент RetroNova', cat: 'accents', rarity: 'common', price: 0, kind: 'accent', val: '139,92,246', val2: '6,182,212', hex: '#8B5CF6' },
    { id: 'accent_cyan', name: 'Циан', desc: 'Электрический голубой', cat: 'accents', rarity: 'common', price: 100, kind: 'accent', val: '6,182,212', val2: '139,92,246', hex: '#06B6D4' },
    { id: 'accent_green', name: 'Токсик', desc: 'Кислотный зелёный', cat: 'accents', rarity: 'common', price: 100, kind: 'accent', val: '34,197,94', val2: '6,182,212', hex: '#22C55E' },
    { id: 'accent_pink', name: 'Розовый неон', desc: 'Яркий розовый', cat: 'accents', rarity: 'rare', price: 220, kind: 'accent', val: '236,72,153', val2: '139,92,246', hex: '#EC4899' },
    { id: 'accent_amber', name: 'Янтарь', desc: 'Тёплое золотое свечение', cat: 'accents', rarity: 'rare', price: 220, kind: 'accent', val: '245,158,11', val2: '239,68,68', hex: '#F59E0B' },
    { id: 'accent_red', name: 'Огненный', desc: 'Алый пламень', cat: 'accents', rarity: 'rare', price: 220, kind: 'accent', val: '239,68,68', val2: '245,158,11', hex: '#EF4444' },
    { id: 'accent_rainbow', name: 'Радуга', desc: 'Изменяющийся акцент', cat: 'accents', rarity: 'epic', price: 700, kind: 'accent', val: '168,85,247', val2: '6,182,212', hex: '#A855F7', animate: true },
    { id: 'accent_royal', name: 'Королевский', desc: 'Пурпур с золотом', cat: 'accents', rarity: 'legendary', price: 1000, kind: 'accent', val: '124,58,237', val2: '251,191,36', hex: '#7C3AED' },

    /* ---- Snake colors (in-game) ---- */
    { id: 'snake_classic', name: 'Классическая зелень', desc: 'Традиционный зелёный цвет змейки', cat: 'snake', rarity: 'common', price: 0, kind: 'snake', val: '#22C55E', val2: '#86EFAC' },
    { id: 'snake_neon', name: 'Неоновая змейка', desc: 'Светящийся циан', cat: 'snake', rarity: 'common', price: 150, kind: 'snake', val: '#22D3EE', val2: '#67E8F9' },
    { id: 'snake_fire', name: 'Огненная', desc: 'Пламенный градиент', cat: 'snake', rarity: 'rare', price: 350, kind: 'snake', val: '#F97316', val2: '#FDE68A' },
    { id: 'snake_toxic', name: 'Токсичная', desc: 'Кислотный яд', cat: 'snake', rarity: 'rare', price: 350, kind: 'snake', val: '#A3E635', val2: '#22D3EE' },
    { id: 'snake_grape', name: 'Виноградная', desc: 'Сочный фиолет', cat: 'snake', rarity: 'rare', price: 350, kind: 'snake', val: '#A855F7', val2: '#EC4899' },
    { id: 'snake_ice', name: 'Ледяная', desc: 'Холодный синий', cat: 'snake', rarity: 'epic', price: 600, kind: 'snake', val: '#38BDF8', val2: '#E0F2FE' },
    { id: 'snake_gold', name: 'Золотая змейка', desc: 'Дорогой змей-олигарх', cat: 'snake', rarity: 'epic', price: 800, kind: 'snake', val: '#FBBF24', val2: '#FEF3C7' },
    { id: 'snake_rainbow', name: 'Радужная', desc: 'Переливается всеми цветами', cat: 'snake', rarity: 'legendary', price: 1500, kind: 'snake', val: 'rainbow', val2: '#fff' },

    /* ---- Profile frames ---- */
    { id: 'frame_none', name: 'Без рамки', desc: 'Обычная рамка аватара', cat: 'frames', rarity: 'common', price: 0, kind: 'frame', val: '' },
    { id: 'frame_silver', name: 'Серебряная рамка', desc: 'Серебряное свечение', cat: 'frames', rarity: 'common', price: 180, kind: 'frame', val: 'frame-common' },
    { id: 'frame_blue', name: 'Синяя рамка', desc: 'Синее свечение', cat: 'frames', rarity: 'rare', price: 400, kind: 'frame', val: 'frame-rare' },
    { id: 'frame_purple', name: 'Эпическая рамка', desc: 'Фиолетовая аура', cat: 'frames', rarity: 'epic', price: 750, kind: 'frame', val: 'frame-epic' },
    { id: 'frame_legend', name: 'Легендарная рамка', desc: 'Пульсирующее золото', cat: 'frames', rarity: 'legendary', price: 1500, kind: 'frame', val: 'frame-legendary' },
    { id: 'frame_hue', name: 'Радужная аура', desc: 'Цвет меняется со временем', cat: 'frames', rarity: 'legendary', price: 2000, kind: 'frame', val: 'frame-legendary', animate: true },

    /* ---- UI effects ---- */
    { id: 'effect_none', name: 'Без эффекта', desc: 'Обычный интерфейс', cat: 'effects', rarity: 'common', price: 0, kind: 'effect', val: '' },
    { id: 'effect_glow', name: 'Неоновое свечение', desc: 'Карточки светятся акцентом', cat: 'effects', rarity: 'rare', price: 400, kind: 'effect', val: 'fx-glow' },
    { id: 'effect_shine', name: 'Блик', desc: 'Бегущий блик по кнопкам', cat: 'effects', rarity: 'rare', price: 400, kind: 'effect', val: 'fx-shine' },
    { id: 'effect_particles', name: 'Искры', desc: 'Искры за курсором', cat: 'effects', rarity: 'epic', price: 900, kind: 'effect', val: 'fx-particles' },
    { id: 'effect_retro', name: 'Ретро-скан', desc: 'CRT-сканлайны поверх всего', cat: 'effects', rarity: 'epic', price: 900, kind: 'effect', val: 'fx-scanlines' },
    { id: 'effect_rainbow', name: 'Радужный бордюр', desc: 'Анимированная рамка окна', cat: 'effects', rarity: 'legendary', price: 1800, kind: 'effect', val: 'fx-rainbow' }
  ];

  const RARITY = {
    common: { label: 'Common', cls: 'rarity-common' },
    rare: { label: 'Rare', cls: 'rarity-rare' },
    epic: { label: 'Epic', cls: 'rarity-epic' },
    legendary: { label: 'Legendary', cls: 'rarity-legendary' }
  };
  const CATS = [
    { id: 'themes', name: 'Темы', ico: '🎨' },
    { id: 'accents', name: 'Цвета', ico: '🌈' },
    { id: 'backgrounds', name: 'Фоны', ico: '🌌' },
    { id: 'snake', name: 'Змейка', ico: '🐍' },
    { id: 'frames', name: 'Рамки', ico: '🖼️' },
    { id: 'effects', name: 'Эффекты', ico: '✨' }
  ];

  function byId(id) { return ITEMS.find(i => i.id === id) || null; }
  function byCat(cat) { return ITEMS.filter(i => i.cat === cat); }

  function buy(itemId) {
    const p = RN.db.profile();
    if (!p) return { ok: false, error: 'Войдите в профиль' };
    const item = byId(itemId);
    if (!item) return { ok: false, error: 'Предмет не найден' };
    if (p.inventory.includes(itemId)) return { ok: false, error: 'Уже куплено' };
    if (p.coins < item.price) return { ok: false, error: 'Не хватает Coins' };
    RN.economy.spend(p, item.price, 'Покупка: ' + item.name);
    p.inventory.push(itemId);
    if (RN.achievements) RN.achievements.checkAll(p);
    RN.db.save();
    return { ok: true, item };
  }

  function equip(itemId) {
    const p = RN.db.profile();
    if (!p) return { ok: false, error: 'Войдите в профиль' };
    const item = byId(itemId);
    if (!item) return { ok: false, error: 'Предмет не найден' };
    if (!p.inventory.includes(itemId)) return { ok: false, error: 'Сначала купите предмет' };
    p.equipped[item.kind] = item.id;
    RN.db.save();
    RN.skins.apply(p);
    return { ok: true, item };
  }

  RN.shop = { items: ITEMS, rarity: RARITY, cats: CATS, byId, byCat, buy, equip };
})();
