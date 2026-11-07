/* ============================================================
   RetroNova — Page: Shop
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  let activeCat = 'themes';

  RN.pages.shop = function (view) {
    const p = RN.db.profile();
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🛍️</div><h3>Войдите, чтобы открыть магазин</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Магазин</h1><p class="sub">Тратьте Coins на темы, цвета, эффекты и рамки. Покупки остаются навсегда.</p></div>' +
      '<div class="page-head-actions">' +
      '<div class="coin-pill"><span class="coin-ico">C</span><span id="shopBalance">' + RN.fmtNum(p.coins) + '</span></div>' +
      '<a class="btn" href="#/inventory">🎒 Инвентарь</a>' +
      '</div></div>' +

      '<div class="pills" id="shopCats" style="margin-bottom:22px">' +
      RN.shop.cats.map(c => {
        const owned = RN.shop.byCat(c.id).filter(i => p.inventory.includes(i.id)).length;
        const total = RN.shop.byCat(c.id).length;
        return '<button class="pill ' + (activeCat === c.id ? 'active' : '') + '" data-cat="' + c.id + '">' +
          c.ico + ' ' + c.name + ' <span class="cnt">' + owned + '/' + total + '</span></button>';
      }).join('') +
      '</div>' +

      '<div class="shop-grid" id="shopGrid"></div>' +
      '</div>';

    renderGrid(view);

    view.querySelectorAll('#shopCats .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        activeCat = pill.dataset.cat;
        view.querySelectorAll('#shopCats .pill').forEach(x => x.classList.toggle('active', x === pill));
        renderGrid(view);
      });
    });

    function renderGrid(v) {
      const prof = RN.db.profile();
      const grid = v.querySelector('#shopGrid');
      const items = RN.shop.byCat(activeCat);
      grid.innerHTML = items.map(item => shopItemHTML(item, prof)).join('');
      grid.querySelectorAll('[data-buy]').forEach(btn => {
        btn.addEventListener('click', () => buyItem(btn.dataset.buy, v));
      });
      grid.querySelectorAll('[data-equip]').forEach(btn => {
        btn.addEventListener('click', () => equipItem(btn.dataset.equip, v));
      });
    }
  };

  function previewHTML(item) {
    switch (item.kind) {
      case 'theme': {
        const map = {
          default: ['#8B5CF6', '#06B6D4'], neon: ['#22D3EE', '#A855F7'], emerald: ['#34D399', '#22D3EE'],
          sunset: ['#F97316', '#EC4899'], crimson: ['#F43F5E', '#F59E0B'], gold: ['#FBBF24', '#F97316'],
          ice: ['#60A5FA', '#38BDF8'], mono: ['#E2E8F0', '#94A3B8']
        };
        const c = map[item.val] || map.default;
        return '<div class="pv-theme" style="background:linear-gradient(135deg,' + c[0] + ',' + c[1] + ')"></div>';
      }
      case 'accent':
        return '<div class="pv-accent" style="background:radial-gradient(circle at 32% 30%, #fff8, rgb(' + item.val + '));color:rgb(' + item.val + ')"></div>';
      case 'bg': {
        const styles = {
          '': 'background:radial-gradient(circle at 30% 20%, #8B5CF644, transparent 60%),#0b0e1a',
          'bg-stars': 'background:radial-gradient(1px 1px at 30% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 60%,#fff,transparent),#0b0e1a',
          'bg-dots': 'background-image:radial-gradient(rgba(255,255,255,.3) 1px,transparent 1px);background-size:8px 8px;background-color:#0b0e1a',
          'bg-mesh': 'background:radial-gradient(at 20% 20%,#8B5CF666,transparent 60%),radial-gradient(at 80% 70%,#06B6D466,transparent 60%),#0b0e1a',
          'bg-carbon': 'background:repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 2px,transparent 2px 7px),#0b0e1a'
        };
        return '<div class="pv-bg" style="' + (styles[item.val] || styles['']) + '"></div>';
      }
      case 'snake':
        if (item.val === 'rainbow') return '<div class="pv-snake" style="background:linear-gradient(135deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900">🐍</div>';
        return '<div class="pv-snake" style="color:' + item.val + ';text-shadow:0 0 18px ' + item.val + '">🐍</div>';
      case 'frame':
        return '<div class="pv-frame ' + (item.val || '') + '" style="' + (item.animate ? 'animation:hueSpin 4s linear infinite;' : '') + '">N</div>';
      case 'effect':
        return '<div class="pv-effect">' + ({
          '': '◻️', 'fx-glow': '🌟', 'fx-shine': '✨', 'fx-particles': '🎇', 'fx-scanlines': '📺', 'fx-rainbow': '🌈'
        }[item.val] || '✨') + '</div>';
      default:
        return '🎨';
    }
  }

  function shopItemHTML(item, p) {
    const owned = p.inventory.includes(item.id);
    const equipped = p.equipped[item.kind] === item.id;
    const rar = RN.shop.rarity[item.rarity];
    return '<div class="shop-item ' + (owned ? 'owned' : '') + ' ' + (equipped ? 'equipped' : '') + '">' +
      '<div class="si-preview">' +
      '<span class="si-rarity rarity-badge ' + rar.cls + '">' + rar.label + '</span>' +
      (owned ? '<span class="si-owned">Куплено</span>' : '') +
      previewHTML(item) +
      '</div>' +
      '<div class="si-body">' +
      '<div class="si-name">' + RN.esc(item.name) + '</div>' +
      '<div class="si-desc">' + RN.esc(item.desc) + '</div>' +
      '<div class="si-foot">' +
      (item.price === 0
        ? '<span class="si-price" style="color:var(--muted)">Бесплатно</span>'
        : '<span class="si-price"><span class="coin-ico">C</span>' + RN.fmtNum(item.price) + '</span>') +
      (equipped
        ? '<button class="btn btn-sm" disabled>✓ Надето</button>'
        : owned
          ? '<button class="btn btn-sm btn-green" data-equip="' + item.id + '">Применить</button>'
          : '<button class="btn btn-sm btn-primary" data-buy="' + item.id + '">Купить</button>') +
      '</div></div></div>';
  }

  function buyItem(id, view) {
    const item = RN.shop.byId(id);
    const res = RN.shop.buy(id);
    if (!res.ok) {
      RN.ui.toast(res.error, 'error');
      RN.sfx.play('error');
      return;
    }
    RN.sfx.play('buy');
    RN.ui.confetti();
    RN.ui.toast('Куплено: ' + item.name + '. Применяем…', 'success');
    // auto-equip right away
    setTimeout(() => {
      RN.shop.equip(id);
      RN.renderUserChrome();
      refresh(view);
    }, 350);
  }

  function equipItem(id, view) {
    const res = RN.shop.equip(id);
    if (!res.ok) { RN.ui.toast(res.error, 'error'); return; }
    RN.sfx.play('success');
    RN.ui.toast('Применено: ' + res.item.name, 'success');
    RN.renderUserChrome();
    refresh(view);
  }

  function refresh(view) {
    const scrollY = window.scrollY;
    RN.pages.shop(view);
    window.scrollTo(0, scrollY);
  }
})();
