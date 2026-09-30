// v0.2 通しテスト：iPhone相当・タッチ操作
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = '/home/claude/gb-rpg-skeleton';
const OUT = __dirname + '/shots_ch1'; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
  if (req.url.startsWith('/bgmtest/')) p = path.join(__dirname, 'bgm/wav', req.url.slice(9));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
(async () => {
  await new Promise(r => server.listen(8767, r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:8767/'); await page.waitForTimeout(800);
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
      if (t === 'BattleScene') { const mode = await page.evaluate(() => Game.top().mode); if (mode === 'command') { await page.evaluate(() => { Game.top().onPuzzle({ combo: 1, counts: { green: 3 }, total: 3 }); }); } else if (mode === 'stats') { await tap('a'); } await page.waitForTimeout(400); }
      else await advance(3);
    }
  };


  const goto = async (map, x, y, dir) => { await page.evaluate(([m,x,y,d]) => { const f = Game.top(); Game.state.map = m; Game.state.x = x; Game.state.y = y; Game.state.dir = d; f.moving = 0; f.enter && f.enter(); }, [map,x,y,dir]); await page.waitForTimeout(300); };
  const closeAll = async () => { for (let i = 0; i < 60; i++) { if ((await top()) !== 'DialogScene') return; await advance(2); await page.waitForTimeout(80); } };
  const note = () => page.evaluate(() => document.getElementById('note-text').textContent);
  const waitActor = async () => { for (let i = 0; i < 200; i++) { const t = await page.evaluate(() => Game.top().constructor.name + ':' + !!(Game.top().actor)); if (t === 'FieldScene:false') return; if (t.startsWith('DialogScene')) return; await page.waitForTimeout(100); } };
  // 新規開始 → 研究所で御三家
  await tap('start'); await tap('a'); await page.waitForTimeout(400);
  await page.fill('#name-input', 'テスト'); await page.click('#name-ok'); await page.waitForTimeout(300); await tap('a'); await page.waitForTimeout(200); await tap('a'); await page.waitForTimeout(400);
  await goto('lab', 7, 7, 'up'); await advance(40);
  await page.evaluate(() => { Game.state.x = 6; Game.state.y = 6; Game.state.dir = 'up'; }); await tap('a'); await page.waitForTimeout(600); await advance(); await tap('a'); await page.waitForTimeout(300);
  await advance(3); await shot('01_device'); await closeAll(); console.log('after starter:', await st(), 'note:', await note());
  await page.evaluate(() => { Game.state.x = 7; Game.state.y = 2; Game.state.dir = 'down'; }); await tap('a'); await page.waitForTimeout(300); await shot('02_prof_device'); await closeAll();
  // ノブオ戦
  await goto('town', 13, 3, 'up'); await walk('up'); await walk('up'); await page.waitForTimeout(300);
  for (let i = 0; i < 40; i++) { if ((await top()) === 'BattleScene') break; await advance(); await page.waitForTimeout(150); }
  await finishBattle(); await advance(); await page.waitForTimeout(1500); await waitActor(); console.log('after rival:', await st(), 'note:', await note());
  // 森：逃げるモンスター
  await page.evaluate(() => { CONFIG.ENCOUNTER_RATE = 0; });
  await goto('forest', 8, 15, 'up'); await walk('up'); await walk('up'); await page.waitForTimeout(400); await shot('03_forest_call'); await advance(1); await page.waitForTimeout(900); await shot('04_forest_run1');
  for (let i = 0; i < 60; i++) { const t = await page.evaluate(() => Game.top().constructor.name); if (t === 'DialogScene') { const f = await page.evaluate(() => !!Game.state.flags.forestRun); await advance(1); if (f) break; } await page.waitForTimeout(150); }
  await page.waitForTimeout(300); await closeAll(); console.log('after forestRun:', await st(), 'note:', await note()); await shot('05_forest_after');
  // ガーデンプレース → カエデに観測機
  await goto('town2', 9, 3, 'up'); await walk('up'); await page.waitForTimeout(200); await shot('06_town2_north'); await tap('left'); await page.waitForTimeout(250);
  await page.evaluate(() => { Game.state.dir = 'left'; }); await tap('a'); await page.waitForTimeout(300); await shot('07_kaede'); await closeAll(); console.log('after device:', await st(), 'note:', await note());
  await walk('up'); await walk('up'); await page.waitForTimeout(300); await shot('08_garden_enter'); console.log('garden:', await st());
  // 奥へ（道なりに）
  await goto('garden', 9, 3, 'up'); await walk('up'); await walk('up'); await page.waitForTimeout(300); await shot('09_sound'); await closeAll(); console.log('after sound:', await st(), 'note:', await note()); await shot('10_sound_after');
  // 入口のカエデへ → 公式戦
  await goto('garden', 9, 13, 'right'); await tap('a'); await page.waitForTimeout(300); await shot('11_kaede_challenge');
  for (let i = 0; i < 40; i++) { if ((await top()) === 'BattleScene') break; await advance(); await page.waitForTimeout(150); }
  await advance(); await page.waitForTimeout(300); await shot('12_kaede_battle');
  // 相手を弱らせて回復を確認
  await page.evaluate(() => { const b = Game.top(); b.enemy.hp = Math.floor(b.enemy.maxHp * 0.3); b.count = 1; b.onPuzzle({ combo: 1, counts: { pink: 3 }, total: 3 }); });
  await page.waitForTimeout(2500); console.log('enemy after regen chance:', await page.evaluate(() => { const b = Game.top(); return b.enemy && (b.enemy.hp + '/' + b.enemy.maxHp); }));
  await page.evaluate(() => { Game.top().enemy.hp = 1; }); await finishBattle(); await advance(); await page.waitForTimeout(300); await shot('13_kaede_win'); await closeAll(); console.log('after kaede:', await st(), 'note:', await note()); await shot('14_after');
  await tap('a'); await page.waitForTimeout(300); await advance(5);
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close(); server.close();
})();
