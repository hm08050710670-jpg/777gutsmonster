const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = '/home/claude/gb-rpg-skeleton';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, req.url === '/' ? '/index.html' : req.url.split('?')[0]); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
(async () => {
  await new Promise(r => server.listen(8779, r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:8779/'); await page.waitForTimeout(900);
  const c = await page.$('#screen');
  const top = () => page.evaluate(() => { const t = Game.top(); return t.constructor.name + ':' + (t.mode || '') + ' sel=' + t.sel + ' menu=' + t.menu + ' debug=' + t.debug; });
  const key = async (k, hold = 250) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(150); };
  for (const k of ['ArrowUp', 'ArrowDown', 'x', 'ArrowDown', 'ArrowDown']) await key(k);
  await key('z', 300); for (let i = 0; i < 50; i++) { if ((await top()).startsWith('BattleScene')) break; await page.waitForTimeout(100); }
  console.log(await top(), await page.evaluate(() => Game.top().items ? Game.top().items().join('/') : ''));
  const info = () => page.evaluate(() => { const b = Game.top(); return b.enemy ? { mode: b.mode, me: b.me.name + ' ' + b.me.hp + '/' + b.me.maxHp, en: b.enemy.name + ' ' + b.enemy.hp + '/' + b.enemy.maxHp, ch: b.charges, count: b.count, msg: document.getElementById('pz-msg').textContent, arena: Puzzle.arena, boardW: document.getElementById('pz-board').style.width } : 'no battle'; });
  const waitCmd = async () => { for (let i = 0; i < 80; i++) { const m = await page.evaluate(() => Game.top().mode); if (m === 'command') return; if (m === 'stats') await key('z'); await page.waitForTimeout(100); } };
  await waitCmd(); console.log('start', await info());
  await page.screenshot({ path: 'nb_01.png' });
  // 盤面：小3つ＋強5つ＋白4つ＋ピンク3つ を消したことにする
  await page.evaluate(() => { const b = Game.top(); b.onPuzzle({ combo: 4, total: 15, counts: {}, groups: [{ color: b.colors.small, n: 3 }, { color: b.colors.strong, n: 5 }, { color: b.colors.guard, n: 4 }, { color: b.colors.heal, n: 3 }] }); });
  await page.waitForTimeout(600); await page.screenshot({ path: 'nb_02.png' });
  await waitCmd(); console.log('after puzzle', await info());
  await page.screenshot({ path: 'nb_03.png' });
  await page.click('[data-tier="guard"]'); await waitCmd(); console.log('after guard', await info()); await page.screenshot({ path: 'nb_04.png' });
  await page.click('[data-tier="small"]'); await page.waitForTimeout(500); await page.screenshot({ path: 'nb_05.png' }); await waitCmd(); console.log('after small', await info());
  // 2回 盤面を動かして 相手の攻撃を起こす
  for (let i = 0; i < 2; i++) { await page.evaluate(() => { const b = Game.top(); b.onPuzzle({ combo: 1, total: 3, counts: {}, groups: [{ color: b.colors.mid, n: 3 }] }); }); await waitCmd(); }
  console.log('after enemy attack', await info()); await page.screenshot({ path: 'nb_06.png' });
  await page.click('[data-tier="strong"]'); await waitCmd(); console.log('after strong', await info());
  await page.click('[data-act="party"]'); await page.waitForTimeout(300); console.log('party scene', await top());
  await key('ArrowDown'); await key('z', 300); await waitCmd(); console.log('after switch', await info());
  await page.screenshot({ path: 'nb_07.png' });
  // 閲覧モード
  await page.evaluate(() => { Game.top().finish('run'); }); await page.waitForTimeout(500);
  await page.evaluate(() => Game.replace(new TitleScene())); await page.waitForTimeout(300);
  for (const k of ['ArrowUp', 'ArrowDown', 'x', 'ArrowDown', 'ArrowDown', 'ArrowDown']) await key(k);
  await key('z', 300); await page.waitForTimeout(800); console.log('viewer', await top()); await key('ArrowRight'); await key('ArrowDown'); await page.waitForTimeout(200); await page.screenshot({ path: 'nb_08.png' });
  console.log('errors', errors);
  await browser.close(); server.close();
})();
