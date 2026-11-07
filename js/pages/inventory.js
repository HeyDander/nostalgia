/* ============================================================
   RetroNova — Page: Inventory
   ============================================================ */
(function () {
  'use strict';
  const RN = window.RN;
  RN.pages = RN.pages || {};

  RN.pages.inventory = function (view) {
    const p = RN.db.profile();
    if (!p) {
      view.innerHTML = '<div class="page"><div class="empty-state"><div class="es-ico">🎒</div><h3>Войдите, чтобы увидеть инвентарь</h3><button class="btn btn-primary" id="gateLogin">Войти</button></div></div>';
      view.querySelector('#gateLogin').addEventListener('click', () => RN.showLogin(true));
      return;
    }

    const items = p.inventory.map(id => RN.shop.byId(id)).filter(Boolean);
    const catNames = {}; RN.shop.cats.forEach(c => catNames[c.id] = c.name);

    // group by category
    const groups = {};
    items.forEach(i => { (groups[i.cat] = groups[i.cat] || []).push(i); });

    view.innerHTML =
      '<div class="page">' +
      '<div class="page-head">' +
      '<div><h1>Инвентарь</h1><p class="sub">' + items.length + ' предметов · применяйте скины одним кликом</p></div>' +
      '<div class="page-head-actions"><a class="btn btn-primary" href="#/shop">🛍️ В магазин</a></div>' +
      '</div>' +

      (items.length ? Object.keys(groups).map(cat =>
        RN.components.sectionHead(catNames[cat] || cat, RN.shop.cats.find(c => c.id === cat) ? RN.shop.cats.find(c => c.id === cat).ico : '🎨') +
        '<div class="inv-grid">' + groups[cat].map(item => {
          const equipped = p.equipped[item.kind] === item.id;
          const rar = RN.shop.rarity[item.rarity];
          return '<div class="inv-item ' + (equipped ? 'equipped' : '') + '">' +
            (equipped ? '<span class="eq-flag">Надето</span>' : '') +
            '<div class="ii-preview">' + previewHTML(item) + '</div>' +
            '<div class="ii-name">' + RN.esc(item.name) + '</div>' +
            '<div class="ii-cat"><span class="rarity-badge ' + rar.cls + '" style="padding:1px 7px;border-radius:5px;font-size:10px;border:1px solid">' + rar.label + '</span></div>' +
            (equipped
              ? '<button class="btn btn-sm btn-block" disabled>Активно</button>'
              : '<button class="btn btn-sm btn-green btn-block" data-equip="' + item.id + '">Применить</button>') +
            '</div>';
        }).join('') + '</div>'
      ).join('') :
        '<div class="empty-state"><div class="es-ico">🎒</div><h3>Инвентарь пуст</h3><p>Купите первый скин в магазине — за игру дают Coins.</p><a class="btn btn-primary" href="#/shop">Открыть магазин</a></div>') +
      '</div>';

    view.querySelectorAll('[data-equip]').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = RN.shop.equip(btn.dataset.equip);
        if (res.ok) {
          RN.sfx.play('success');
          RN.ui.toast('Применено: ' + res.item.name, 'success');
          RN.renderUserChrome();
          RN.pages.inventory(view);
        } else {
          RN.ui.toast(res.error, 'error');
        }
      });
    });
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
          '': 'background:#0b0e1a',
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
})();
