const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8798,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await (await b.newContext({viewport:{width:430,height:853}})).newPage(); await page.goto('http://localhost:8798/'); await page.waitForTimeout(600);
console.log(await page.evaluate(()=>{
  const out=[]; const maps=['plaza','course1','course2','course3','course4','course5','clubhouse','cc'];
  for (const m of maps) for (const ev of DATA.MAPS[m].events) if (ev.kind==='warp') {
    const dst=DATA.MAPS[ev.to.map]; const t=dst.rows[ev.to.y] && dst.rows[ev.to.y][ev.to.x];
    const srcT=DATA.MAPS[m].rows[ev.y][ev.x];
    const ok=DATA.WALKABLE.has(t); const back=dst.events.some(e=>e.kind==='warp'&&e.to.map===m);
    out.push(`${m}(${ev.x},${ev.y})[${srcT}] -> ${ev.to.map}(${ev.to.x},${ev.to.y})[${t}] ${ok?'ok':'BLOCKED'} ${back?'':'NO-RETURN'}`);
  }
  return out.join('\n');
}));
await b.close(); server.close();})();
