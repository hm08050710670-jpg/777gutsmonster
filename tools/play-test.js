// v0.2 通しテスト：iPhone相当・タッチ操作
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = '/home/claude/gb-rpg-skeleton';
const OUT = __dirname + '/shots3'; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
  if (req.url.startsWith('/bgmtest/')) p = path.join(__dirname, 'bgm/wav', req.url.slice(9));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
(async () => {
  await new Promise(r => server.listen(8766, r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:8766/'); await page.waitForTimeout(800);
  // ヘッドレスChromiumはmp3をデコードできないため、検証ではWAV原本に差し替える
  if (process.env.BGM_WAV) await page.evaluate(() => { DATA.BGM = { town: '/bgmtest/01_guts_town_v01_112bpm.wav', lab: '/bgmtest/02_okumura_lab_v01_96bpm.wav', wild: '/bgmtest/03_wild_adventure_A_v02_156bpm.wav', rival: '/bgmtest/04_rival_battle_v01_168bpm.wav' }; });
  const snd = () => page.evaluate(() => Sound.status());
  const cdp = await ctx.newCDPSession(page);
  const tap = async (key, hold = 40) => {
    let box = await page.locator(`.pbtn[data-key="${key}"]`).boundingBox();
    if (!box && key === 'a') box = await page.locator('#screen').boundingBox();   // 戦闘中（パッド非表示）は画面タップ＝A
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(hold);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(70);
  };
  const shot = async n => { await page.screenshot({ path: `${OUT}/${n}.png` }); };
  const top = () => page.evaluate(() => Game.top().constructor.name);
  const st = () => page.evaluate(() => Game.state && ({ map: Game.state.map, x: Game.state.x, y: Game.state.y, dir: Game.state.dir, party: Game.state.party.map(m => m.name + m.hp), flags: Game.state.flags, top: Game.top().constructor.name }));
  const advance = async (max = 15) => {
    for (let i = 0; i < max; i++) {
      const info = await page.evaluate(() => { const t = Game.top(); return t.constructor.name === 'DialogScene' ? { typing: t.chars < t.pageTotal(), choosing: t.choosing } : null; });
      if (!info) return; if (info.typing) { await page.waitForTimeout(120); continue; } if (info.choosing) return;
      await tap('a'); await page.waitForTimeout(100);
    }
  };
  const walk = async (dir, n = 1) => { for (let i = 0; i < n; i++) { await tap(dir, 30); await page.waitForTimeout(230); } };
  const finishBattle = async () => {
    for (let i = 0; i < 80; i++) {
      const t = await top(); if (t === 'FieldScene') return;
      if (t === 'BattleScene') { const mode = await page.evaluate(() => Game.top().mode); if (mode === 'command') { await page.evaluate(() => { const b = Game.top(); b.onPuzzle({ combo: 1, counts: {}, total: 3, groups: [{ color: b.colors.small, n: 3 }] }); }); } else if (mode === 'stats') { await tap('a'); } await page.waitForTimeout(400); }
      else await advance(3);
    }
  };

  await shot('01_title'); console.log('font', await page.evaluate(() => Text.isReady()));
  await tap('start'); await page.waitForTimeout(150); await shot('02_title_menu');
  await tap('a'); await page.waitForTimeout(400); await shot('03_name');
  await page.fill('#name-input', 'テスト'); await page.click('#name-ok'); await page.waitForTimeout(300); await shot('04_gender');
  await tap('right'); await tap('a'); await page.waitForTimeout(200); await shot('05_preview');
  await tap('a'); await page.waitForTimeout(400); await shot('06_home');
  console.log('bgm@home:', await snd());
  console.log('home:', await st(), 'note:', await page.evaluate(() => document.getElementById('note-text').textContent));
  // 部屋を調べる → 出口へ
  await walk('up'); await walk('up'); await walk('left', 2); await walk('up'); await tap('a'); await page.waitForTimeout(400); await shot('07_look');
  await advance();
  await page.evaluate(() => { Game.state.x = 5; Game.state.y = 5; Game.state.dir = 'down'; });
  await walk('down'); await page.waitForTimeout(300); await shot('08_town');
  console.log('town:', await st());
  // 町の出口に行くと止められる（テレポートで確認）
  await page.evaluate(() => { Game.state.x = 13; Game.state.y = 3; Game.state.dir = 'up'; });
  await walk('up'); await walk('up'); await tap('a'); await page.waitForTimeout(400); await shot('09_blocked'); await advance();
  // 研究所へ
  await page.evaluate(() => { Game.state.x = 6; Game.state.y = 8; Game.state.dir = 'up'; });
  await walk('up'); await page.waitForTimeout(400); await shot('10_lab'); console.log('lab:', await st()); await page.waitForTimeout(800); console.log('bgm@lab:', await snd()); await advance(40); await shot('10b_lab_after_intro');
  await page.evaluate(() => { Game.state.x = 8; Game.state.y = 2; Game.state.dir = 'down'; }); await tap('a'); await page.waitForTimeout(300); await shot('11_prof'); await advance();
  await page.evaluate(() => { Game.state.x = 7; Game.state.y = 6; Game.state.dir = 'up'; }); await tap('a'); await page.waitForTimeout(600); await advance(); await shot('12_starter_ask');
  await tap('a'); await page.waitForTimeout(1200); for (let i = 0; i < 40 && (await top()) === 'DialogScene'; i++) { await advance(2); await page.waitForTimeout(80); } console.log('after starter:', await st());
  await shot('13_after_starter');
  // 研究所を出る → ノブオ
  await page.evaluate(() => { Game.state.x = 8; Game.state.y = 8; Game.state.dir = 'down'; });
  await walk('down'); await page.waitForTimeout(400);
  await page.evaluate(() => { Game.state.x = 13; Game.state.y = 3; Game.state.dir = 'up'; });
  await walk('up'); await walk('up'); await page.waitForTimeout(300); await shot('14_rival_call');
  await advance(); await page.waitForTimeout(600); await shot('14_rival_walking'); await page.waitForTimeout(800); await shot('14_rival_arrived');
  for (let i = 0; i < 20; i++) { if ((await top()) === 'BattleScene') break; await advance(); await page.waitForTimeout(150); }
  await shot('15_rival_battle'); console.log('bgm@rival:', await snd()); await advance(); await shot('16_battle_cmd');
  await page.screenshot({ path: `${OUT}/17_puzzle.png` });
  await page.evaluate(() => { const b = Game.top(); b.onPuzzle({ combo: 2, counts: {}, total: 6, groups: [{ color: b.colors.small, n: 3 }, { color: b.colors.mid, n: 3 }] }); }); await page.waitForTimeout(1200); await shot('18_attack');
  await finishBattle(); await advance(); await page.waitForTimeout(1200); console.log('after rival:', await st(), 'actor:', await page.evaluate(() => !!Game.top().actor));
  await shot('19_after_rival');
  // メニュー
  await tap('start'); await page.waitForTimeout(150); await shot('20_menu'); await tap('a'); await page.waitForTimeout(150); await shot('21_party'); await tap('b'); await tap('b');
  // ガーデンロードへ
  await page.evaluate(() => { Game.state.x = 13; Game.state.y = 2; Game.state.dir = 'up'; });
  await walk('up'); await walk('up'); await page.waitForTimeout(300); await shot('22_road'); console.log('road:', await st());
  await page.evaluate(() => { CONFIG.ENCOUNTER_RATE = 100; Game.state.grace = 0; Game.state.x = 2; Game.state.y = 3; Game.state.dir = 'down'; });
  await walk('down'); await page.waitForTimeout(500); await shot('23_wild'); console.log('wild:', await st()); console.log('bgm@wild:', await snd());
  await finishBattle(); await advance(); console.log('after wild:', await st()); await page.waitForTimeout(600); console.log('bgm@after wild:', await snd());
  // 回復の家
  await page.evaluate(() => { CONFIG.ENCOUNTER_RATE = 0; Game.state.map = 'heal'; Game.state.x = 4; Game.state.y = 4; Game.state.dir = 'up'; Game.state.party[0].hp = 3; });
  await tap('a'); await page.waitForTimeout(400); await shot('24_heal'); await advance(); console.log('heal:', await st());
  // つづきから
  await page.reload(); await page.waitForTimeout(700); await tap('start'); await page.waitForTimeout(150); await tap('a'); await page.waitForTimeout(400);
  console.log('continue:', await st());
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(400); await shot('25_landscape');
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close(); server.close();
})();
