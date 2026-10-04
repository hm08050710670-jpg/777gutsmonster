const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8794,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:430,height:853},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const page=await ctx.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8794/');await page.waitForTimeout(800);
const tap=async(k,ms=60)=>{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);};
const shots=[];
for (const [x,id] of [[7,'kokegame'],[8,'hinoshishi'],[9,'amepiyo']]) {
  await page.evaluate((x)=>{const st=Save.newGame('ゆら','m');st.map='lab';st.x=x;st.y=6;st.dir='up';st.flags={labIntro:true};Game.state=st;Game.replace(new FieldScene());},x);
  await page.waitForTimeout(300); await tap('KeyZ'); await page.waitForTimeout(900); await page.screenshot({path:`pt_${id}_1.png`});
  await tap('KeyZ'); await page.waitForTimeout(900); await page.screenshot({path:`pt_${id}_2.png`});
  await tap('KeyZ'); await page.waitForTimeout(900); await page.screenshot({path:`pt_${id}_3.png`});
  await tap('ArrowDown'); await tap('KeyZ'); await page.waitForTimeout(300); // いいえ
  console.log(id, 'after no:', await page.evaluate(()=>Game.top().constructor.name+' '+JSON.stringify(Game.state.flags)));
}
console.log(errors); await b.close();server.close();})();
