// visualViewport が app(100dvh) より低い端末を模擬：viewport 430x932、dvh=835相当は再現できないので visualViewport.height を 766 に偽装
const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8788,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:430,height:835},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const page=await ctx.newPage();
await page.addInitScript(()=>{Object.defineProperty(screen,'height',{get:()=>932}); const vv=window.visualViewport; Object.defineProperty(vv,'height',{get:()=>766});});
await page.goto('http://localhost:8788/');await page.waitForTimeout(600);
await page.evaluate(()=>{const st=Save.newGame('T','m');st.party=[makeMonster('kokegame',10)];Party.full(st);st.map='town';st.x=13;st.y=10;st.flags={labIntro:true,starter:true,rival1:true};Game.state=st;Game.replace(new FieldScene());Game.fit();});
await page.waitForTimeout(300); await page.screenshot({path:'vv_field.png'});
console.log(await page.evaluate(()=>({H:CONFIG.H,app:document.getElementById('app').clientHeight,wrap:Math.round(document.getElementById('screen-wrap').getBoundingClientRect().bottom),dpad:Math.round(document.getElementById('dpad').getBoundingClientRect().bottom),abtn:Math.round(document.getElementById('abtn').getBoundingClientRect().bottom)})));
await b.close();server.close();})();
