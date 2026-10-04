// iPhone Pro Max + Claudeアプリ内の再現：ページは 853pt と申告されるが、実際に見えるのは上から 799pt
const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8789,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:430,height:853},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'}); const page=await ctx.newPage();
await page.addInitScript(()=>{Object.defineProperty(screen,'height',{get:()=>932});});
await page.goto('http://localhost:8789/');await page.waitForTimeout(600);
await page.screenshot({path:'pm_title.png'});
await page.evaluate(()=>{const st=Save.newGame('T','m');st.party=[makeMonster('kokegame',10)];Party.full(st);st.map='town';st.x=13;st.y=10;st.flags={labIntro:true,starter:true,rival1:true};Game.state=st;Game.replace(new FieldScene());Game.fit();});
await page.waitForTimeout(300); await page.screenshot({path:'pm_field.png'});
console.log(await page.evaluate(()=>({H:CONFIG.H,app:document.getElementById('app').clientHeight,wrap:Math.round(document.getElementById('screen-wrap').getBoundingClientRect().bottom),dpad:Math.round(document.getElementById('dpad').getBoundingClientRect().bottom),abtn:Math.round(document.getElementById('abtn').getBoundingClientRect().bottom)})));
await b.close();server.close();})();
