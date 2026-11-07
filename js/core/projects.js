/* ============================================================
   RetroNova — Projects: user game projects (storage + templates)
   ============================================================ */
(function () {
  'use strict';
  const RN = (window.RN = window.RN || {});

  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Templates ---------- */
  const TEMPLATES = {
    blank: {
      name: 'Пустой проект',
      icon: '📄',
      desc: 'Минимальный каркас',
      files: [
        { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title>Моя игра</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Привет, RetroNova!</h1>\n  <canvas id="game" width="480" height="320"></canvas>\n  <script src="main.js"><\/script>\n</body>\n</html>' },
        { name: 'style.css', content: 'body {\n  margin: 0;\n  background: #0b0e1a;\n  color: #fff;\n  font-family: sans-serif;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 16px;\n  padding: 20px;\n}\ncanvas {\n  background: #12162a;\n  border-radius: 12px;\n  max-width: 100%;\n}' },
        { name: 'main.js', content: 'const canvas = document.getElementById("game");\nconst ctx = canvas.getContext("2d");\n\nlet x = 240, y = 160, vx = 3, vy = 2;\n\nfunction loop() {\n  ctx.fillStyle = "#12162a";\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  x += vx; y += vy;\n  if (x < 12 || x > canvas.width - 12) vx *= -1;\n  if (y < 12 || y > canvas.height - 12) vy *= -1;\n  ctx.fillStyle = "#8B5CF6";\n  ctx.beginPath();\n  ctx.arc(x, y, 12, 0, Math.PI * 2);\n  ctx.fill();\n  requestAnimationFrame(loop);\n}\nloop();' }
      ]
    },
    catcher: {
      name: 'Ловец',
      icon: '🧺',
      desc: 'Лови падающие объекты',
      files: [
        { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title>Ловец</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div id="hud">Очки: <b id="score">0</b></div>\n  <canvas id="game" width="420" height="480"></canvas>\n  <p class="hint">Управление: ← → или мышь</p>\n  <script src="main.js"><\/script>\n</body>\n</html>' },
        { name: 'style.css', content: 'body { margin: 0; background: #0b0e1a; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; }\n#hud { font-size: 18px; }\n#score { color: #22C55E; }\ncanvas { background: #12162a; border-radius: 14px; max-width: 100%; touch-action: none; }\n.hint { color: #8a94ad; font-size: 13px; }' },
        { name: 'main.js', content: 'const canvas = document.getElementById("game");\nconst ctx = canvas.getContext("2d");\nconst scoreEl = document.getElementById("score");\n\nlet basketX = 210, score = 0, lives = 3;\nlet items = [];\nlet keys = {};\n\naddEventListener("keydown", e => keys[e.key] = true);\naddEventListener("keyup", e => keys[e.key] = false);\ncanvas.addEventListener("pointermove", e => {\n  const r = canvas.getBoundingClientRect();\n  basketX = (e.clientX - r.left) / r.width * canvas.width;\n});\n\nfunction spawn() {\n  items.push({\n    x: 30 + Math.random() * 360,\n    y: -20,\n    speed: 2 + Math.random() * 2,\n    bad: Math.random() < 0.25\n  });\n}\nsetInterval(spawn, 700);\n\nfunction loop() {\n  ctx.fillStyle = "#12162a";\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n\n  if (keys.ArrowLeft) basketX -= 6;\n  if (keys.ArrowRight) basketX += 6;\n  basketX = Math.max(40, Math.min(canvas.width - 40, basketX));\n\n  ctx.fillStyle = "#06B6D4";\n  ctx.fillRect(basketX - 36, canvas.height - 42, 72, 18);\n\n  for (let i = items.length - 1; i >= 0; i--) {\n    const it = items[i];\n    it.y += it.speed;\n    ctx.fillStyle = it.bad ? "#EF4444" : "#F59E0B";\n    ctx.beginPath();\n    ctx.arc(it.x, it.y, 11, 0, Math.PI * 2);\n    ctx.fill();\n    if (it.y > canvas.height - 52 && it.y < canvas.height - 20 && Math.abs(it.x - basketX) < 48) {\n      items.splice(i, 1);\n      if (it.bad) { lives--; } else { score += 10; scoreEl.textContent = score; }\n      continue;\n    }\n    if (it.y > canvas.height + 20) {\n      items.splice(i, 1);\n      if (!it.bad) lives--;\n    }\n  }\n\n  ctx.fillStyle = "#fff";\n  ctx.font = "16px sans-serif";\n  ctx.fillText("Жизни: " + "❤".repeat(Math.max(0, lives)), 12, 24);\n\n  if (lives <= 0) {\n    ctx.fillStyle = "rgba(0,0,0,.65)";\n    ctx.fillRect(0, 0, canvas.width, canvas.height);\n    ctx.fillStyle = "#fff";\n    ctx.font = "bold 28px sans-serif";\n    ctx.textAlign = "center";\n    ctx.fillText("Игра окончена: " + score, canvas.width / 2, canvas.height / 2);\n    return;\n  }\n  requestAnimationFrame(loop);\n}\nloop();' }
      ]
    },
    clicker: {
      name: 'Кликер',
      icon: '👆',
      desc: 'Нажимай и зарабатывай',
      files: [
        { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title>Кликер</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Кликер</h1>\n  <button id="target">🍪</button>\n  <div class="score">Очки: <b id="score">0</b></div>\n  <button id="upgrade" class="up">Купить апгрейд (+1 за клик) — 20</button>\n  <script src="main.js"><\/script>\n</body>\n</html>' },
        { name: 'style.css', content: 'body { margin: 0; min-height: 100vh; background: #0b0e1a; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }\n#target { font-size: 90px; background: #171b30; border: 2px solid #8b5cf6; border-radius: 26px; padding: 20px 34px; cursor: pointer; transition: transform .08s; }\n#target:active { transform: scale(.93); }\n.score { font-size: 22px; }\n.score b { color: #f59e0b; }\n.up { background: #22c55e; color: #052e16; border: none; border-radius: 10px; padding: 12px 18px; font-weight: 700; cursor: pointer; }\n.up:disabled { opacity: .4; cursor: default; }' },
        { name: 'main.js', content: 'let score = 0;\nlet perClick = 1;\nlet upgradeCost = 20;\nconst scoreEl = document.getElementById("score");\nconst target = document.getElementById("target");\nconst upgradeBtn = document.getElementById("upgrade");\n\nfunction render() {\n  scoreEl.textContent = score;\n  upgradeBtn.disabled = score < upgradeCost;\n  upgradeBtn.textContent = "Купить апгрейд (+1 за клик) — " + upgradeCost;\n}\n\ntarget.addEventListener("click", () => {\n  score += perClick;\n  render();\n});\n\nupgradeBtn.addEventListener("click", () => {\n  if (score >= upgradeCost) {\n    score -= upgradeCost;\n    perClick++;\n    upgradeCost = Math.round(upgradeCost * 1.7);\n    render();\n  }\n});\n\nrender();' }
      ]
    },
    snake: {
      name: 'Змейка',
      icon: '🐍',
      desc: 'Простая змейка на canvas',
      files: [
        { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title>Змейка</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Змейка</h1>\n  <div class="hud">Очки: <b id="score">0</b> · Рекорд: <b id="best">0</b></div>\n  <canvas id="game" width="400" height="400"></canvas>\n  <script src="main.js"><\/script>\n</body>\n</html>' },
        { name: 'style.css', content: 'body { margin: 0; min-height: 100vh; background: #0b0e1a; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 16px; }\n.hud { font-size: 16px; color: #c7d0e0; }\n.hud b { color: #22c55e; }\ncanvas { background: #12162a; border-radius: 12px; max-width: 100%; touch-action: none; }' },
        { name: 'main.js', content: 'const canvas = document.getElementById("game");\nconst ctx = canvas.getContext("2d");\nconst scoreEl = document.getElementById("score");\nconst bestEl = document.getElementById("best");\nconst CELL = 20, COLS = 20, ROWS = 20;\n\nlet snake, dir, food, score, dead, timer;\nlet best = 0;\nbestEl.textContent = best;\n\nfunction reset() {\n  snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];\n  dir = {x:1,y:0};\n  score = 0;\n  dead = false;\n  scoreEl.textContent = 0;\n  placeFood();\n  clearInterval(timer);\n  timer = setInterval(step, 130);\n  draw();\n}\n\nfunction placeFood() {\n  food = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };\n  if (snake.some(s => s.x === food.x && s.y === food.y)) placeFood();\n}\n\nfunction step() {\n  if (dead) return;\n  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };\n  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || snake.some(s => s.x === head.x && s.y === head.y)) {\n    dead = true;\n    clearInterval(timer);\n    if (score > best) { best = score; bestEl.textContent = best; }\n    draw();\n    return;\n  }\n  snake.unshift(head);\n  if (head.x === food.x && head.y === food.y) {\n    score += 10;\n    scoreEl.textContent = score;\n    placeFood();\n  } else {\n    snake.pop();\n  }\n  draw();\n}\n\nfunction draw() {\n  ctx.fillStyle = "#12162a";\n  ctx.fillRect(0,0,canvas.width,canvas.height);\n  ctx.fillStyle = "#f59e0b";\n  ctx.beginPath();\n  ctx.arc(food.x*CELL+CELL/2, food.y*CELL+CELL/2, CELL*0.32, 0, Math.PI*2);\n  ctx.fill();\n  snake.forEach((s,i) => {\n    ctx.fillStyle = i === 0 ? "#22c55e" : "#86efac";\n    ctx.fillRect(s.x*CELL+1, s.y*CELL+1, CELL-2, CELL-2);\n  });\n  if (dead) {\n    ctx.fillStyle = "rgba(0,0,0,.7)";\n    ctx.fillRect(0,0,canvas.width,canvas.height);\n    ctx.fillStyle = "#fff";\n    ctx.textAlign = "center";\n    ctx.font = "bold 26px sans-serif";\n    ctx.fillText("Игра окончена: " + score, canvas.width/2, canvas.height/2 - 10);\n    ctx.font = "16px sans-serif";\n    ctx.fillText("Нажмите, чтобы сыграть снова", canvas.width/2, canvas.height/2 + 22);\n  }\n}\n\naddEventListener("keydown", e => {\n  if (e.key === "ArrowLeft" && dir.x === 0) dir = {x:-1,y:0};\n  if (e.key === "ArrowRight" && dir.x === 0) dir = {x:1,y:0};\n  if (e.key === "ArrowUp" && dir.y === 0) dir = {x:0,y:-1};\n  if (e.key === "ArrowDown" && dir.y === 0) dir = {x:0,y:1};\n});\n\ncanvas.addEventListener("click", () => { if (dead) reset(); });\n\nlet touchStart = null;\ncanvas.addEventListener("touchstart", e => { touchStart = e.touches[0]; }, {passive:true});\ncanvas.addEventListener("touchmove", e => {\n  if (!touchStart) return;\n  const t = e.touches[0];\n  const dx = t.clientX - touchStart.clientX;\n  const dy = t.clientY - touchStart.clientY;\n  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;\n  if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0 && dir.x === 0) dir = {x:1,y:0}; if (dx < 0 && dir.x === 0) dir = {x:-1,y:0}; }\n  else { if (dy > 0 && dir.y === 0) dir = {x:0,y:1}; if (dy < 0 && dir.y === 0) dir = {x:0,y:-1}; }\n  touchStart = t;\n}, {passive:true});\n\nreset();' }
      ]
    }
  };

  /* ---------- Storage ---------- */
  function projects() {
    const p = RN.db.profile();
    return p ? p.projects : [];
  }

  function create(name, tplKey, author) {
    const p = RN.db.profile();
    if (!p) return null;
    const tpl = TEMPLATES[tplKey] || TEMPLATES.blank;
    const proj = {
      id: uid(),
      name: name || tpl.name,
      icon: tpl.icon,
      files: tpl.files.map(f => ({ name: f.name, content: f.content })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      published: false,
      publishedId: null
    };
    p.projects.unshift(proj);
    RN.db.save();
    return proj;
  }

  function get(id) {
    return projects().find(x => x.id === id) || null;
  }

  function update(id, patch) {
    const proj = get(id);
    if (!proj) return null;
    Object.assign(proj, patch, { updatedAt: Date.now() });
    RN.db.save();
    return proj;
  }

  function remove(id) {
    const p = RN.db.profile();
    if (!p) return false;
    p.projects = p.projects.filter(x => x.id !== id);
    RN.db.save();
    return true;
  }

  function duplicate(id) {
    const p = RN.db.profile();
    const proj = get(id);
    if (!p || !proj) return null;
    const copy = JSON.parse(JSON.stringify(proj));
    copy.id = uid();
    copy.name = proj.name + ' (копия)';
    copy.createdAt = copy.updatedAt = Date.now();
    copy.published = false;
    copy.publishedId = null;
    p.projects.unshift(copy);
    RN.db.save();
    return copy;
  }

  /* ---------- Build sandbox document ---------- */
  function buildDoc(files) {
    const get = n => (files.find(f => f.name.toLowerCase() === n) || {}).content || '';
    let html = get('index.html') || '<!DOCTYPE html><html><body><h3 style="font-family:sans-serif;padding:20px">Добавьте файл index.html</h3></body></html>';
    const css = files.filter(f => f.name.endsWith('.css')).map(f => '/* ' + f.name + ' */\n' + f.content).join('\n');
    const js = files.filter(f => f.name.endsWith('.js')).map(f => '/* ' + f.name + ' */\n' + f.content).join('\n;\n');

    // inline local stylesheet/script references so the sandbox works without network
    html = html.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (m, href) => {
      const name = href.split('/').pop();
      const f = files.find(x => x.name.toLowerCase() === name.toLowerCase());
      return f ? '<style>\n' + f.content + '\n</style>' : '';
    });
    html = html.replace(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, (m, src) => {
      const name = src.split('/').pop();
      const f = files.find(x => x.name.toLowerCase() === name.toLowerCase());
      return f ? '<script>\n' + f.content + '\n<\/script>' : '';
    });

    // error-report bridge + console bridge, inserted at the top of <head>
    const bridge = [
      '<script>',
      '(function(){',
      '  function send(type, args){ try { parent.postMessage({ rnSandbox: true, type: type, args: args }, "*"); } catch(e){} }',
      '  ["log","warn","error","info"].forEach(function(k){',
      '    var orig = console[k];',
      '    console[k] = function(){ send(k, Array.prototype.slice.call(arguments).map(function(a){',
      '      try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch(e){ return String(a); }',
      '    })); if (orig) orig.apply(console, arguments); };',
      '  });',
      '  window.onerror = function(msg, src, line, col, err){',
      '    send("error", [msg + (line ? " (строка " + line + ")" : "")]);',
      '    return false;',
      '  };',
      '  window.addEventListener("unhandledrejection", function(e){ send("error", ["Promise: " + (e.reason && e.reason.message ? e.reason.message : e.reason)]); });',
      '})();',
      '<\/script>'
    ].join('\n');

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => m + '\n' + bridge);
    } else {
      html = bridge + html;
    }

    // inject all non-referenced CSS/JS
    const refs = new Set();
    (get('index.html').match(/href=["']([^"']+)["']|src=["']([^"']+)["']/gi) || []).forEach(r => refs.add(r));
    const extraCss = files.filter(f => f.name.endsWith('.css') && !html.includes(f.content)).map(f => '<style>\n' + f.content + '\n</style>').join('\n');
    const extraJs = files.filter(f => f.name.endsWith('.js') && !html.includes(f.content)).map(f => '<script>\n' + f.content + '\n<\/script>').join('\n');
    if (extraCss && /<\/head>/i.test(html)) html = html.replace(/<\/head>/i, extraCss + '\n</head>');
    else html = extraCss + html;
    if (extraJs && /<\/body>/i.test(html)) html = html.replace(/<\/body>/i, extraJs + '\n</body>');
    else html = html + extraJs;

    return html;
  }

  RN.projects = { TEMPLATES, projects, create, get, update, remove, duplicate, buildDoc };
})();
