// 左回り・右回りで一周できるか：カート道をたどる代わりに、各エリアの入口から出口までテレポートせず「歩ける経路があるか」をBFSで検証
const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/gb-rpg-skeleton'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8799,r));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await (await b.newContext({viewport:{width:430,height:853}})).newPage(); await page.goto('http://localhost:8799/'); await page.waitForTimeout(600);
console.log(await page.evaluate(()=>{
  const st=Save.newGame('T','m'); st.flags={labIntro:true,starter:true,device:true,deviceGiven:true}; Game.state=st;
  const reach=(map,from,to)=>{ st.map=map; const f=new FieldScene(); const seen=new Set([from.join(',')]); const q=[from];
    while(q.length){ const [x,y]=q.shift(); if(x===to[0]&&y===to[1]) return true; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy,k=nx+','+ny; if(seen.has(k)) continue; const ev=f.eventAt(nx,ny); if(f.canWalk(nx,ny)||(ev&&ev.kind==='warp'&&f.tileAt(nx,ny)!==' '&&DATA.WALKABLE.has(f.tileAt(nx,ny)))){seen.add(k);q.push([nx,ny]);} } } return false; };
  const legs=[['plaza',[9,10],[0,6]],['course1',[22,7],[19,0]],['course2',[6,17],[16,0]],['course4',[1,13],[17,13]],['course5',[1,3],[11,15]],['course3',[17,1],[9,17]],['plaza',[18,6],[9,11]],['course4',[1,13],[8,1]]];
  return legs.map(([m,a,c])=>`${m} ${a}->${c}: ${reach(m,a,c)?'OK':'NG'}`).join('\n');
}));
await b.close(); server.close();})();
