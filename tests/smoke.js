/* RetroNova smoke test — headless Chrome via puppeteer-core */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:8080';

const GAMES = [
  'snake', 'snake2', 'tetris', 'pacman', 'pong', 'invaders', 'flappy', 'minesweeper',
  'g2048', 'breakout', 'arkanoid', 'doodle', 'dino', 'asteroids', 'memory', 'tictactoe',
  'chess', 'checkers', 'solitaire', 'sudoku', 'connect4', 'simon', 'whack', 'bomberman',
  'frogger', 'galaga', 'geometry', 'colorswitch', 'towerdef', 'cookie', 'reaction', 'typing',
  'aim', 'runner', 'racing', 'basketball', 'penalty', 'minigolf', 'bubble', 'match3',
  'missile', 'puzzle15', 'catch', 'battleship'
];

const PAGES = ['home', 'games', 'profile', 'shop', 'inventory', 'leaderboard', 'achievements', 'quests', 'editor', 'projects', 'community', 'settings'];

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const games = only || GAMES;

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // ignore expected 404s for games not yet created
      if (!/Failed to load resource/.test(t)) errors.push('CONSOLE: ' + t);
    }
  });

  const results = [];

  async function goto(hash) {
    await page.evaluate(h => { location.hash = h; }, hash);
    await new Promise(r => setTimeout(r, 350));
  }

  // 1. boot + login
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 700));

  const hasLogin = await page.evaluate(() => !!document.querySelector('.login-scrim'));
  results.push(['login gate visible', hasLogin ? 'PASS' : 'FAIL']);

  if (hasLogin) {
    await page.type('#loginNick', 'TestPilot');
    await page.click('#loginGo');
    await new Promise(r => setTimeout(r, 800));
  }

  const loggedIn = await page.evaluate(() => document.querySelector('#sideNick') && document.querySelector('#sideNick').textContent === 'TestPilot');
  results.push(['login works', loggedIn ? 'PASS' : 'FAIL']);

  // 2. pages
  for (const p of PAGES) {
    errors.length = 0;
    await goto('/' + p);
    await new Promise(r => setTimeout(r, 450));
    const hasContent = await page.evaluate(() => {
      const v = document.getElementById('view');
      return v && v.innerHTML.trim().length > 100;
    });
    results.push(['page ' + p, hasContent && errors.length === 0 ? 'PASS' : 'FAIL ' + (errors[0] || 'empty')]);
  }

  // 3. games
  for (const id of games) {
    errors.length = 0;
    await goto('/game/' + id);
    await new Promise(r => setTimeout(r, 900));
    const info = await page.evaluate(() => {
      const shell = document.querySelector('.game-shell');
      const stage = document.querySelector('.gs-stage');
      const canvas = stage ? stage.querySelector('canvas') : null;
      const dom = stage ? stage.children.length : 0;
      const title = document.querySelector('.gs-title');
      return {
        shell: !!shell,
        stage: !!stage,
        canvas: !!canvas,
        canvasSize: canvas ? canvas.width + 'x' + canvas.height : null,
        dom,
        title: title ? title.textContent.trim() : null,
        overlayError: document.querySelector('.gs-overlay.show .ov-ico') ? document.querySelector('.gs-overlay.show').textContent.slice(0, 80) : null
      };
    });

    // simulate some input
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 500));
    await page.keyboard.press('Escape'); // pause
    await new Promise(r => setTimeout(r, 200));
    const pausedOverlay = await page.evaluate(() => {
      const o = document.querySelector('.gs-overlay.show');
      return o ? o.textContent.includes('Пауза') : false;
    });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    const errText = errors.filter(e => !e.includes('favicon')).slice(0, 2).join(' | ');
    const ok = info.shell && (info.canvas || info.dom > 0) && !info.overlayError && !errText;
    results.push(['game ' + id, (ok ? 'PASS' : 'FAIL') + (info.overlayError ? ' [' + info.overlayError + ']' : '') + (errText ? ' {' + errText + '}' : '') + (info.canvas ? ' canvas ' + info.canvasSize : ' dom ' + info.dom)]);
    if (pausedOverlay === false) results.push(['  pause ' + id, 'WARN: pause overlay not found']);
  }

  // 4. economy sanity
  errors.length = 0;
  await goto('/game/snake');
  await new Promise(r => setTimeout(r, 500));
  const coinsBefore = await page.evaluate(() => RN.db.profile().coins);
  const afterAward = await page.evaluate(() => {
    const p = RN.db.profile();
    const before = p.coins;
    RN.economy.awardRun('snake', 99999, { goodAt: 400, runMs: 20000 });
    return { before, after: RN.db.profile().coins, best: RN.db.profile().best.snake };
  });
  results.push(['coin award', afterAward.after > afterAward.before ? 'PASS +' + (afterAward.after - afterAward.before) : 'FAIL']);
  results.push(['record saved', afterAward.best === 99999 ? 'PASS' : 'FAIL']);

  // 5. shop purchase
  const shop = await page.evaluate(() => {
    const p = RN.db.profile();
    p.coins = 5000;
    const res = RN.shop.buy('theme_neon');
    const eq = RN.shop.equip('theme_neon');
    const prof = RN.db.profile();
    return {
      ok: res.ok,
      inInventory: prof.inventory.includes('theme_neon'),
      equipped: prof.equipped.theme,
      eq: eq.ok,
      cssTheme: document.documentElement.getAttribute('data-theme')
    };
  });
  results.push(['shop buy+equip', shop.ok && shop.inInventory && shop.equipped === 'theme_neon' && shop.eq && shop.cssTheme === 'neon' ? 'PASS' : 'FAIL ' + JSON.stringify(shop)]);

  // 6. editor sandbox
  await goto('/editor');
  await new Promise(r => setTimeout(r, 400));
  const editor = await page.evaluate(() => {
    const proj = RN.projects.create('SmokeTest', 'blank');
    return proj ? { id: proj.id, files: proj.files.length } : null;
  });
  if (editor) {
    await goto('/editor/' + editor.id);
    await new Promise(r => setTimeout(r, 1500));
    const ed = await page.evaluate(() => {
      const f = document.querySelector('#previewFrame');
      const status = document.querySelector('#previewStatus');
      return { frame: !!f, srcdoc: f ? f.srcdoc.length : 0, status: status ? status.textContent : null, code: !!document.querySelector('#codeInput') };
    });
    results.push(['editor mount', ed.frame && ed.srcdoc > 100 && ed.code ? 'PASS' : 'FAIL ' + JSON.stringify(ed)]);
    // wait for iframe sandbox message
    await new Promise(r => setTimeout(r, 800));
    const sandboxOk = await page.evaluate(() => {
      const log = document.querySelector('#consoleLog');
      return log ? log.textContent.length : 0;
    });
    results.push(['editor sandbox boot', sandboxOk > 0 ? 'PASS' : 'WARN (no console output)']);
  } else {
    results.push(['editor create', 'FAIL']);
  }

  // 7. community seed + play
  await goto('/community');
  await new Promise(r => setTimeout(r, 500));
  const community = await page.evaluate(() => {
    const games = RN.db.community().games;
    return { count: games.length, approved: games.filter(g => g.status === 'approved').length };
  });
  results.push(['community seeded', community.count >= 2 ? 'PASS (' + community.count + ')' : 'FAIL']);
  if (community.count) {
    const firstId = await page.evaluate(() => RN.db.community().games[0].id);
    await goto('/play/' + firstId);
    await new Promise(r => setTimeout(r, 1200));
    const play = await page.evaluate(() => {
      const f = document.querySelector('#comFrame');
      return f ? f.srcdoc.length : 0;
    });
    results.push(['community play', play > 100 ? 'PASS' : 'FAIL']);
  }

  // mobile viewport test
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await goto('/home');
  await new Promise(r => setTimeout(r, 500));
  const mobile = await page.evaluate(() => {
    const bn = document.querySelector('.bottom-nav');
    const burger = document.querySelector('#burger');
    return {
      bottomNav: bn ? getComputedStyle(bn).display : null,
      burger: burger ? getComputedStyle(burger).display : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  });
  results.push(['mobile layout', mobile.bottomNav === 'flex' && mobile.burger === 'grid' ? 'PASS' : 'FAIL ' + JSON.stringify(mobile)]);
  results.push(['mobile no h-overflow', mobile.overflowX ? 'FAIL' : 'PASS']);

  // summary
  console.log('\n════════ RETRONOVA SMOKE TEST ════════\n');
  let pass = 0, fail = 0, warn = 0;
  for (const [name, res] of results) {
    if (res.startsWith('PASS')) pass++;
    else if (res.startsWith('WARN')) warn++;
    else fail++;
    console.log((res.startsWith('PASS') ? '✅' : res.startsWith('WARN') ? '⚠️ ' : '❌') + ' ' + name.padEnd(26) + ' ' + res);
  }
  console.log('\n──────────────────────────────────────');
  console.log('PASS: ' + pass + '  FAIL: ' + fail + '  WARN: ' + warn);
  console.log('══════════════════════════════════════\n');

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
