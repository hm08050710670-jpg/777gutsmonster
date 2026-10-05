const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8797,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:430,height:853},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const page=await ctx.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://localhost:8797/');await page.waitForTimeout(800);
const spots=[['cc',9,10,'up'],['cc',9,10,'up']];
let i=0; for (const [map,x,y,dir] of spots) {
  await page.evaluate(([map,x,y,dir])=>{const st=Save.newGame('ゆら','m');st.party=[makeMonster('kokegame',12)];Party.full(st);st.map=map;st.x=x;st.y=y;st.dir=dir;st.flags={labIntro:true,starter:true,rival1:true,device:true};Game.state=st;Game.replace(new FieldScene());},[map,x,y,dir]);
  await page.waitForTimeout(400); await page.screenshot({path:`golf_${i++}_${map}.png`});
}
console.log(errors); await b.close();server.close();})();
