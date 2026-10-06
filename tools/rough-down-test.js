const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8802,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await (await b.newContext({viewport:{width:430,height:853},deviceScaleFactor:2})).newPage();
await page.goto('http://localhost:8802/');await page.waitForTimeout(800);
await page.evaluate(()=>{CONFIG.ENCOUNTER_RATE=0;const st=Save.newGame('T','m');st.party=[makeMonster('kokegame',10)];Party.full(st);st.map='course1';st.x=14;st.y=8;st.dir='down';st.flags={labIntro:true,starter:true};Game.state=st;Game.replace(new FieldScene());});
await page.waitForTimeout(300);
const shots=[]; await page.keyboard.down('ArrowDown');
for(let i=0;i<6;i++){ await page.waitForTimeout(90); await page.screenshot({path:`rd${i}.png`}); }
await page.keyboard.up('ArrowDown'); await page.waitForTimeout(300); await page.screenshot({path:'rd6.png'});
console.log(await page.evaluate(()=>[Game.state.x,Game.state.y])); await b.close();server.close();})();
