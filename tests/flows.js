/* RetroNova — end-to-end flows: publish, remix, profile switch, quests */
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:8080';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  const results = [];
  const wait = ms => new Promise(r => setTimeout(r, ms));

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(700);
  await page.type('#loginNick', 'FlowTester');
  await page.click('#loginGo');
  await wait(700);

  // --- create project and publish via real UI ---
  await page.evaluate(() => { location.hash = '#/editor'; });
  await wait(500);
  const projId = await page.evaluate(async () => {
    const proj = RN.projects.create('Publish Flow Game', 'clicker');
    RN.router.go('editor/' + proj.id);
    return proj.id;
  });
  await wait(1200);
  await page.click('#btnPublish');
  await wait(400);
  const modal = await page.evaluate(() => !!document.querySelector('.modal'));
  results.push(['publish modal opens', modal ? 'PASS' : 'FAIL']);

  await page.evaluate(() => {
    const d = document.querySelector('#pubDesc');
    d.value = 'Тестовая игра для проверки публикации и модерации.';
    d.dispatchEvent(new Event('input'));
  });
  await page.click('[data-pub]');
  await wait(700);

  const pub = await page.evaluate(() => {
    const c = RN.db.community();
    const g = c.games.find(x => x.title === 'Publish Flow Game');
    const p = RN.db.profile();
    return { found: !!g, status: g && g.status, coins: p.coins, published: p.published.length, liked: (p.moderation.likesGiven || []).length };
  });
  results.push(['game published', pub.found && (pub.status === 'approved' || pub.status === 'pending') ? 'PASS (' + pub.status + ')' : 'FAIL ' + JSON.stringify(pub)]);
  results.push(['publish reward +25', pub.coins >= 50 + 25 ? 'PASS' : 'FAIL ' + pub.coins]);

  // --- community feed shows it, like + favorite + play ---
  await page.evaluate(() => { location.hash = '#/community'; });
  await wait(500);
  const card = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.cg-card')].find(c => c.textContent.includes('Publish Flow Game'));
    return el ? { ok: true } : { ok: false };
  });
  results.push(['community card visible', card.ok ? 'PASS' : 'FAIL']);

  if (card.ok) {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('.cg-card')].find(c => c.textContent.includes('Publish Flow Game'));
      el.querySelector('[data-like]').click();
    });
    await wait(500);
    const liked = await page.evaluate(() => {
      const g = RN.db.community().games.find(x => x.title === 'Publish Flow Game');
      return g.likes;
    });
    results.push(['like works', liked === 1 ? 'PASS' : 'FAIL ' + liked]);
  }

  // --- play community game ---
  const gid = await page.evaluate(() => RN.db.community().games.find(x => x.title === 'Publish Flow Game').id);
  await page.evaluate(id => { location.hash = '#/play/' + id; }, gid);
  await wait(1200);
  const play = await page.evaluate(() => {
    const f = document.querySelector('#comFrame');
    return f && f.srcdoc.length > 100;
  });
  results.push(['community play loads', play ? 'PASS' : 'FAIL']);

  // --- remix ---
  const before = await page.evaluate(() => RN.db.profile().projects.length);
  await page.click('#comRemix');
  await wait(350);
  await page.click('.modal [data-ok]');
  await wait(700);
  const remixed = await page.evaluate(() => {
    const p = RN.db.profile();
    return { n: p.projects.length, last: p.projects[0].name, files: p.projects[0].files.length };
  });
  results.push(['remix creates project', remixed.n === before + 1 && remixed.last.startsWith('Ремикс') ? 'PASS' : 'FAIL ' + JSON.stringify(remixed)]);

  // --- second profile + switch (never overwrite) ---
  await page.evaluate(() => { location.hash = '#/settings'; });
  await wait(500);
  const second = await page.evaluate(() => {
    const res = RN.db.createProfile('SecondPilot');
    if (!res.ok) return { ok: false, err: res.error };
    RN.db.login('SecondPilot');
    return { ok: true, coins: RN.db.profile().coins };
  });
  results.push(['second profile created', second.ok ? 'PASS' : 'FAIL ' + JSON.stringify(second)]);
  const switchBack = await page.evaluate(() => {
    const res = RN.db.login('FlowTester');
    return { ok: res.ok, nick: RN.db.profile().nick, projects: RN.db.profile().projects.length };
  });
  results.push(['switch back preserves progress', switchBack.ok && switchBack.nick === 'FlowTester' && switchBack.projects >= 1 ? 'PASS' : 'FAIL ' + JSON.stringify(switchBack)]);

  // --- quests claim flow ---
  await page.evaluate(() => {
    const p = RN.db.profile();
    RN.quests.ensure(p);
    p.quests.list[0].done = true;
    p.quests.list[0].progress = p.quests.list[0].goal;
    RN.router.go('quests');
  });
  await wait(500);
  const claimBtn = await page.$('[data-claim]');
  if (claimBtn) {
    const beforeCoins = await page.evaluate(() => RN.db.profile().coins);
    await claimBtn.click();
    await wait(400);
    const afterCoins = await page.evaluate(() => RN.db.profile().coins);
    results.push(['quest claim pays out', afterCoins > beforeCoins ? 'PASS +' + (afterCoins - beforeCoins) : 'FAIL']);
  } else {
    results.push(['quest claim pays out', 'FAIL (no claim button)']);
  }

  // --- settings persistence of sound ---
  await page.evaluate(() => { location.hash = '#/settings'; });
  await wait(400);
  const persisted = await page.evaluate(() => {
    const p = RN.db.profile();
    p.settings.sound = false;
    RN.db.save();
    RN.db.login(p.nick);
    return RN.db.profile().settings.sound;
  });
  results.push(['settings persist', persisted === false ? 'PASS' : 'FAIL']);

  console.log('\n════════ FLOWS TEST ════════\n');
  let pass = 0, fail = 0;
  for (const [name, res] of results) {
    if (res.startsWith('PASS')) pass++; else fail++;
    console.log((res.startsWith('PASS') ? '✅' : '❌') + ' ' + name.padEnd(30) + ' ' + res);
  }
  if (errors.length) {
    console.log('\nJS errors:');
    errors.slice(0, 8).forEach(e => console.log('  • ' + e));
  }
  console.log('\nPASS: ' + pass + '  FAIL: ' + fail + '\n');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
