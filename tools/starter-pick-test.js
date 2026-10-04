const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8793,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:430,height:853},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const page=await ctx.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8793/');await page.waitForTimeout(800);
await page.evaluate(()=>{const st=Save.newGame('ゆら','m');st.map='lab';st.x=7;st.y=6;st.dir='up';st.flags={labIntro:true};Game.state=st;Game.replace(new FieldScene());});
await page.waitForTimeout(500); await page.screenshot({path:'fx0.png'});
const tap=async(k,ms=60)=>{const code={a:'KeyZ',up:'ArrowUp'}[k];await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);};
await tap('a'); await page.waitForTimeout(600); // 質問が出るまで文字送り
for(let i=0;i<6;i++){ await tap('a'); await page.waitForTimeout(150); const t=await page.evaluate(()=>Game.top().choosing); if(t) break; }
await tap('a'); // はい
const shots=[]; for(let i=0;i<5;i++){ await page.waitForTimeout(130); await page.screenshot({path:`fx${i+1}.png`}); }
await page.waitForTimeout(800); await page.screenshot({path:'fx6.png'});
console.log(await page.evaluate(()=>({flags:Game.state.flags, top:Game.top().constructor.name, party:Game.state.party.map(m=>m.id)})), errors);
// 残りのボールを調べる
for(let i=0;i<30;i++){ if((await page.evaluate(()=>Game.top().constructor.name))!=='DialogScene') break; await tap('a'); await page.waitForTimeout(120); }
await page.evaluate(()=>{Game.state.x=8;Game.state.y=6;Game.state.dir='up';}); await tap('a'); await page.waitForTimeout(400); await page.screenshot({path:'fx7.png'});
await b.close();server.close();})();
