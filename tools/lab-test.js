const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8792,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:430,height:853},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'}); const page=await ctx.newPage();
await page.addInitScript(()=>{Object.defineProperty(screen,'height',{get:()=>932});});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8792/');await page.waitForTimeout(800);
await page.evaluate(()=>{const st=Save.newGame('T','m');st.map='lab';st.x=8;st.y=6;st.dir='up';st.flags={labIntro:true};Game.state=st;Game.replace(new FieldScene());});
await page.waitForTimeout(600); await page.screenshot({path:'lab2_a.png'});
await page.evaluate(()=>{Game.state.x=4;Game.state.y=3;Game.state.dir='right';}); await page.waitForTimeout(300); await page.screenshot({path:'lab2_b.png'});
// 歩行テスト：机の下で上を押すと動かない、左へ歩ける
await page.evaluate(()=>{Game.state.x=8;Game.state.y=6;Game.state.dir='up';});
const before=await page.evaluate(()=>[Game.state.x,Game.state.y]);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp');
const afterUp=await page.evaluate(()=>[Game.state.x,Game.state.y]);
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await page.keyboard.up('ArrowLeft');
const afterLeft=await page.evaluate(()=>[Game.state.x,Game.state.y]);
// A で台座のボールを調べる
await page.evaluate(()=>{Game.state.x=7;Game.state.y=6;Game.state.dir='up';}); await page.waitForTimeout(100);
await page.keyboard.press('KeyZ'); await page.waitForTimeout(500); await page.screenshot({path:'lab2_c.png'});
console.log({before,afterUp,afterLeft,top:await page.evaluate(()=>Game.top().constructor.name),errors});
await b.close();server.close();})();
