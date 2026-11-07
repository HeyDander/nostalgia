/* ============================================================
   RetroNova — UI helpers: toast, modal, confirm, confetti
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  let toastRoot, modalRoot, confettiRoot;

  function ensureRoots() {
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.className = 'toast-root';
      document.body.appendChild(toastRoot);
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
      confettiRoot = document.createElement('div');
      confettiRoot.className = 'confetti-root';
      document.body.appendChild(confettiRoot);
    }
  }

  const ICONS = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠', coin: '🪙' };

  function toast(msg, type, opts) {
    ensureRoots();
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    if (opts.coins) el.classList.add('toast-coins');
    el.innerHTML =
      '<span class="t-ico">' + (opts.coins ? '🪙' : (ICONS[type] || ICONS.info)) + '</span>' +
      '<span class="t-msg">' + RN.esc(msg) + '</span>' +
      (opts.coins ? '<span class="t-amount">+' + opts.coins + '</span>' : '');
    toastRoot.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, opts.duration || 3000);
    return el;
  }

  /* ---------- Modal ---------- */
  let modalStack = [];

  function openModal(html, opts) {
    ensureRoots();
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'modal-scrim' + (opts.light ? ' light' : '');
    wrap.innerHTML = '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    modalRoot.appendChild(wrap);
    modalStack.push(wrap);

    const scrim = wrap;
    const box = wrap.querySelector('.modal');
    requestAnimationFrame(() => scrim.classList.add('show'));

    function close(result) {
      scrim.classList.remove('show');
      setTimeout(() => {
        wrap.remove();
        modalStack = modalStack.filter(m => m !== wrap);
      }, 260);
      if (opts.onClose) opts.onClose(result);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === wrap) {
        e.stopPropagation();
        if (opts.dismissible !== false) close(null);
      }
    }
    document.addEventListener('keydown', onKey);

    scrim.addEventListener('mousedown', e => {
      if (e.target === scrim && opts.dismissible !== false) close(null);
    });

    const api = {
      el: wrap,
      box,
      close,
      find: sel => box.querySelector(sel),
      findAll: sel => Array.from(box.querySelectorAll(sel))
    };

    box.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(null)));
    if (opts.onMount) opts.onMount(api);
    return api;
  }

  function confirmBox(title, text, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const m = openModal(
        '<div class="modal-head"><h3>' + RN.esc(title) + '</h3></div>' +
        '<div class="modal-body"><p>' + (text || '') + '</p></div>' +
        '<div class="modal-foot">' +
        '<button class="btn" data-close>' + RN.esc(opts.cancelText || 'Отмена') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + RN.esc(opts.okText || 'Подтвердить') + '</button>' +
        '</div>',
        {
          onClose: r => resolve(r === true)
        }
      );
      m.find('[data-ok]').addEventListener('click', () => m.close(true));
      if (opts.danger) m.find('[data-ok]').focus();
    });
  }

  function promptBox(title, placeholder, value) {
    return new Promise(resolve => {
      let result = null;
      const m = openModal(
        '<div class="modal-head"><h3>' + RN.esc(title) + '</h3></div>' +
        '<div class="modal-body"><input class="input" id="prompt-input" placeholder="' + RN.esc(placeholder || '') + '" value="' + RN.esc(value || '') + '"></div>' +
        '<div class="modal-foot"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" data-ok>OK</button></div>',
        {
          onClose: r => resolve(r === true ? result : null),
          onMount: api => {
            const inp = api.find('#prompt-input');
            setTimeout(() => { inp.focus(); inp.select(); }, 60);
            const submit = () => { result = inp.value; api.close(true); };
            api.find('[data-ok]').addEventListener('click', submit);
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
          }
        }
      );
    });
  }

  /* ---------- Confetti ---------- */
  function confetti(x, y, opts) {
    ensureRoots();
    opts = opts || {};
    const colors = opts.colors || ['#8B5CF6', '#06B6D4', '#22C55E', '#F59E0B', '#EC4899'];
    const n = opts.count || 60;
    const cx = x == null ? window.innerWidth / 2 : x;
    const cy = y == null ? window.innerHeight / 2.4 : y;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'confetti-piece';
      const size = 6 + Math.random() * 8;
      p.style.width = size + 'px';
      p.style.height = (size * (0.4 + Math.random() * 0.9)) + 'px';
      p.style.background = colors[i % colors.length];
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      const ang = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 260;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 120;
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--dur', (0.9 + Math.random() * 1.1) + 's');
      confettiRoot.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  }

  /* ---------- Floating coin fly (visual feedback) ---------- */
  function coinFly(fromEl, toEl) {
    ensureRoots();
    if (!fromEl || !toEl) return;
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const coin = document.createElement('div');
    coin.className = 'coin-fly';
    coin.style.left = (a.left + a.width / 2) + 'px';
    coin.style.top = (a.top + a.height / 2) + 'px';
    coin.style.setProperty('--tx', (b.left + b.width / 2 - a.left - a.width / 2) + 'px');
    coin.style.setProperty('--ty', (b.top + b.height / 2 - a.top - a.height / 2) + 'px');
    confettiRoot.appendChild(coin);
    setTimeout(() => {
      coin.remove();
      toEl.classList.add('bump');
      setTimeout(() => toEl.classList.remove('bump'), 500);
    }, 750);
  }

  RN.ui = { toast, openModal, confirm: confirmBox, prompt: promptBox, confetti, coinFly };
})();
