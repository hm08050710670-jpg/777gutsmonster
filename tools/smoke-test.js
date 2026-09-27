// スマホ相当(390x844, タッチ)でゲームを実際に操作して検証するスクリプト
//   使い方: npm i playwright && npx playwright install chromium && node tools/smoke-test.js
//   結果: tools/shots/ にスクリーンショット、コンソールに状態と ERRORS が出る
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

// 簡易静的サーバ
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url));
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});

(async () => {
  await new Promise(r => server.listen(8765, r));
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });

  await page.goto('http://localhost:8765/');
  await page.waitForTimeout(800);

  // 仮想パッドを "タップ" する（pointer イベントで判定しているので tap で良い）
  const tap = async (key, hold = 60) => {
    const b = page.locator(`.pbtn[data-key="${key}"]`);
    const box = await b.boundingBox();
    const cdp = await ctx.newCDPSession(page);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(hold);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await page.waitForTimeout(80);
  };
  // ダイアログを最後まで読み進める（文字送り完了を待ってからA）
  const advance = async (max = 12) => {
    for (let i = 0; i < max; i++) {
      const info = await page.evaluate(() => { const t = Game.top(); return t.constructor.name === 'DialogScene' ? { typing: t.chars < t.pageTotal(), choosing: t.choosing } : null; });
      if (!info) return;
      if (info.typing) { await page.waitForTimeout(150); continue; }
      if (info.choosing) return;
      await tap('a', 40); await page.waitForTimeout(120);
    }
  };
  const walk = async dir => { await tap(dir, 35); await page.waitForTimeout(260); };
  const shot = async name => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  const st = async () => page.evaluate(() => Game.state && ({ x: Game.state.x, y: Game.state.y, dir: Game.state.dir, hp: Game.state.party[0].hp, items: Game.state.items, top: Game.top().constructor.name }));

  await shot('01_title');
  console.log('font ready:', await page.evaluate(() => Text.isReady()));
  await tap('start'); await page.waitForTimeout(200); await shot('02_title_menu');
  await tap('a'); await page.waitForTimeout(300);
  console.log('after start:', await st());
  await shot('03_field');

  // 看板(7,4)：開始(6,6) → up (6,5) → right (7,5) → up は看板で止まる → A
  await walk('up'); await walk('right'); await walk('up');
  console.log('facing sign:', await st());
  await tap('a'); await page.waitForTimeout(500); await shot('04_sign_typing');
  await page.waitForTimeout(1200); await shot('05_sign_page1_done');
  await tap('a', 40); await page.waitForTimeout(900); await shot('05b_sign_page2');
  await advance();
  console.log('after sign:', await st());

  // スタートメニュー
  await tap('start'); await page.waitForTimeout(200); await shot('06_start_menu');
  await tap('a'); await page.waitForTimeout(200); await shot('07_party');
  await tap('b'); await page.waitForTimeout(150);
  await tap('down'); await tap('a'); await page.waitForTimeout(200); await shot('08_items');
  await tap('b'); await page.waitForTimeout(150);
  await tap('down'); await tap('a'); await page.waitForTimeout(600); await shot('09_save_ask');
  await tap('a'); await page.waitForTimeout(600); await shot('10_saved');
  await advance(); await tap('b'); await page.waitForTimeout(150);
  console.log('saved?', await page.evaluate(() => !!localStorage.getItem(CONFIG.SAVE_KEY)), await st());

  // 戦闘：(7,5) → left (6,5) → down x5 → (6,10) → left (5,10) は草むら
  await page.evaluate(() => { CONFIG.ENCOUNTER_RATE = 100; });
  await walk('left');
  for (let i = 0; i < 5; i++) await walk('down');
  console.log('before grass:', await st());
  await walk('left'); await page.waitForTimeout(400);
  console.log('encounter:', await st());
  await shot('11_battle_intro');
  await advance();
  await shot('12_battle_command');
  await tap('a'); await page.waitForTimeout(200); await shot('13_battle_moves');
  await tap('down'); await tap('a'); await page.waitForTimeout(500); await shot('14_battle_attack');
  await page.waitForTimeout(1500); await shot('14b_battle_hp');
  for (let i = 0; i < 60; i++) {
    const s = await st();
    if (s.top === 'FieldScene') break;
    if (s.top === 'BattleScene') {
      const mode = await page.evaluate(() => Game.top().mode);
      if (mode === 'command') { await tap('a', 40); await page.waitForTimeout(150); await tap('a', 40); }
      await page.waitForTimeout(200);
    } else await advance(3);
  }
  await shot('15_after_battle');
  console.log('after battle:', await st(), await page.evaluate(() => ({ lv: Game.state.party[0].level, exp: Game.state.party[0].exp })));

  // にげる
  await walk('right'); await walk('left'); await page.waitForTimeout(400);
  await advance();
  await tap('down'); await tap('right'); await page.waitForTimeout(100); await shot('16_run_selected');
  await tap('a'); await page.waitForTimeout(600); await shot('17_run_msg');
  for (let i = 0; i < 80; i++) {
    const s = await st(); if (s.top === 'FieldScene') break;
    if (s.top === 'BattleScene') { const mode = await page.evaluate(() => Game.top().mode); if (mode === 'command') { await page.evaluate(() => { Game.top().cmd = 3; }); await tap('a', 40); } await page.waitForTimeout(200); }
    else await advance(3);
  }
  console.log('after run:', await st());

  // 戦闘中のどうぐ
  await page.evaluate(() => { Game.state.party[0].hp = 5; });
  await walk('right'); await walk('left'); await page.waitForTimeout(400); await advance();
  await tap('down'); await tap('a'); await page.waitForTimeout(200); await shot('17b_battle_items');
  await tap('a'); await page.waitForTimeout(800); await shot('17c_battle_item_used');
  console.log('item used:', await st());
  for (let i = 0; i < 80; i++) {
    const s = await st(); if (s.top === 'FieldScene') break;
    if (s.top === 'BattleScene') { const mode = await page.evaluate(() => Game.top().mode); if (mode === 'command') { await page.evaluate(() => { Game.top().cmd = 3; }); await tap('a', 40); } await page.waitForTimeout(200); }
    else await advance(3);
  }

  // 回復NPC (13,5)
  await page.evaluate(() => { CONFIG.ENCOUNTER_RATE = 0; Game.state.party[0].hp = 3; Game.state.x = 13; Game.state.y = 6; Game.state.dir = 'up'; });
  await tap('a'); await page.waitForTimeout(500); await shot('18_heal_npc');
  await advance();
  console.log('after heal:', await st());

  // つづきから
  await page.reload(); await page.waitForTimeout(600);
  await tap('start'); await page.waitForTimeout(150); await shot('19_continue_menu');
  await tap('a'); await page.waitForTimeout(300);
  console.log('continued:', await st());

  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(400); await shot('20_landscape');

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close(); server.close();
})();
