const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8801,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await (await b.newContext({viewport:{width:430,height:853},deviceScaleFactor:2})).newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8801/'); await page.waitForTimeout(1500);
const tap=async(k)=>{await page.keyboard.down(k);await page.waitForTimeout(70);await page.keyboard.up(k);await page.waitForTimeout(120);};
console.log('top', await page.evaluate(()=>Game.top().constructor.name)); for (const k of ['ArrowUp','ArrowDown','KeyX','ArrowDown','ArrowDown']) { await tap(k); console.log(k, await page.evaluate(()=>Game.top().code)); }
await page.waitForTimeout(300); await page.screenshot({path:'cheat_menu.png'});
const it=await page.evaluate(()=>({items:Game.top().items(), sel:Game.top().sel}));
for (let i=0;i<8;i++){ const l=await page.evaluate(()=>Game.top().items()[Game.top().sel]); if(l==='コースへ') break; await tap('ArrowDown'); }
await tap('KeyZ'); await page.waitForTimeout(600); await page.screenshot({path:'cheat_course.png'});
console.log(it, await page.evaluate(()=>Game.state && Game.state.map), errors); await b.close(); server.close();})();
