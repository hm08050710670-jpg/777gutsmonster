const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
const VP=(process.env.VP||'390x845').split('x').map(Number); const SCREEN=+process.env.SCREEN||0; const TAG=process.env.TAG||'big';
(async()=>{await new Promise(r=>server.listen(8785,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:VP[0],height:VP[1]},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const page=await ctx.newPage();
if(SCREEN) await page.addInitScript(s=>{Object.defineProperty(screen,'height',{get:()=>s});},SCREEN);
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8785/');await page.waitForTimeout(800);
await page.screenshot({path:`${TAG}_title.png`});
await page.evaluate(()=>{const st=Save.newGame('T','m');st.party=[makeMonster('kokegame',10)];Party.full(st);st.map='town';st.x=13;st.y=10;st.flags={labIntro:true,starter:true,rival1:true};st.items={'きずぐすり':3,'ガッツボール':10};Game.state=st;Game.replace(new FieldScene());});
await page.waitForTimeout(400); await page.screenshot({path:`${TAG}_field.png`});
const info=await page.evaluate(()=>({H:CONFIG.H,scale:Game.scale,viewH:Game.viewH,wrap:document.getElementById('screen-wrap').getBoundingClientRect().toJSON(),pad:document.getElementById('pad').getBoundingClientRect().toJSON(),dpad:document.getElementById('dpad').getBoundingClientRect().toJSON(),abtn:document.getElementById('abtn').getBoundingClientRect().toJSON(),app:document.getElementById('app').getBoundingClientRect().height,inner:innerHeight}));
console.log(JSON.stringify(info));
// menu
await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.screenshot({path:`${TAG}_menu.png`}); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// dialog: talk to npc? use DialogScene directly
await page.evaluate(()=>Game.push(new DialogScene({text:'テストの せりふ です。2ぎょうめ です。',name:'ハカセ'}))); await page.waitForTimeout(300); await page.screenshot({path:`${TAG}_dialog.png`}); await page.evaluate(()=>{dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ'}));setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'KeyZ'})),60);}); await page.waitForTimeout(200); await page.evaluate(()=>{dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ'}));setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'KeyZ'})),60);}); await page.waitForTimeout(300);
console.log('errors',errors);
await b.close();server.close();})();
