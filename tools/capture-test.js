const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8782,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const page=await b.newPage({viewport:{width:390,height:845},deviceScaleFactor:2});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://localhost:8782/');await page.waitForTimeout(800);
const run = async (rnd, tag) => {
  await page.evaluate((rnd)=>{const st=Save.newGame('T','m');st.party=[makeMonster('kokegame',10)];Party.full(st);st.items={'ガッツボール':10};st.map='road';Game.state=st;Game.replace(new FieldScene());const bs=new BattleScene({enemy:makeMonster('kinomushi',5),onEnd:r=>{window.__res=r;}});Game.push(bs);window.__rnd=rnd;}, rnd);
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{const bs=Game.top(); bs.mode='command'; bs.enemy.hp=2; bs.shownHp.e=2; const orig=Math.random; Math.random=()=>window.__rnd; bs.throwBall('ガッツボール'); Math.random=orig;});
  const phases=[]; const shots={throw:1,hit:1,absorb:1,tremble:1,shake:1,success:1,breakout:1,done:1};
  for(let i=0;i<400;i++){ const ph=await page.evaluate(()=>{const b=Game.top(); return b.constructor.name==='BattleScene' ? (b.cap?b.cap.phase+':'+b.cap.t:b.mode) : b.constructor.name;}); if(!phases.length||phases[phases.length-1].split(':')[0]!==ph.split(':')[0]) phases.push(ph); const p0=ph.split(':')[0]; if(shots[p0]&&ph.endsWith(':'+(p0==='absorb'?'20':p0==='throw'?'12':p0==='done'?'0':p0==='success'?'3':'8'))){ await page.locator('#screen').screenshot({path:`cap_${tag}_${p0}.png`}); } if(ph==='FieldScene'||ph==='command') break; await page.waitForTimeout(16); }
  console.log(tag, phases.join(' > '), 'result', await page.evaluate(()=>window.__res), 'party', await page.evaluate(()=>Game.state.party.map(m=>m.name).join(',')), 'balls', await page.evaluate(()=>Game.state.items['ガッツボール']));
};
await run(0.0,'ok'); await run(0.99,'ng');
console.log('errors',errors); await b.close(); server.close();})();
