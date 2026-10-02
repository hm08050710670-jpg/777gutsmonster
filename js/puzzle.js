/* =========================================================
   パズゴル パズル部分（単体モジュール）
   使い方:
     const puzzle = PazugoruPuzzle.mount(document.getElementById('board'), {
       images: { red:'img/ball-red.webp', blue:'img/ball-blue.webp', green:'img/ball-green.webp',
                 yellow:'img/ball-yellow.webp', purple:'img/ball-purple.webp', pink:'img/ball-pink.webp' },
       cols: 6, rows: 5,
       onTick()            {},   // ボールを1マス動かすたび（操作音用）
       onMatch(group, n)   {},   // 1グループ消えるたび（group={color,cells}, n=コンボ番号）
       onResolve(result)   {},   // 連鎖がすべて終わったとき（result={combo, counts:{red:3,...}, total}）
     });
     puzzle.lock() / puzzle.unlock()  … 操作の禁止/許可（敵のターン中など）
     puzzle.reset()                    … 盤面を作り直す
     puzzle.grid                       … 現在の配置（grid[row][col].color）
   ========================================================= */
(function(global){
'use strict';
const DEFAULT_COLORS=['red','blue','green','yellow','purple','pink'];
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function mount(boardEl, opts){
  opts=opts||{};
  const COLS=opts.cols||6, ROWS=opts.rows||5;
  let COLORS=opts.colors||DEFAULT_COLORS;
  const IMG=opts.images||{};
  const onTick=opts.onTick||(()=>{}), onMatch=opts.onMatch||(()=>{}), onResolve=opts.onResolve||(()=>{});
  const BALL_RATIO=opts.ballRatio||0.99;   // マスに対するボールの大きさ

  boardEl.classList.add('pz-board');
  let cell=0, ballSize=0, grid=[], busy=false, locked=false, grab=null, moved=false;

  function layout(){
    if(!boardEl.clientWidth) return;
    cell=boardEl.clientWidth/COLS; ballSize=cell*BALL_RATIO; boardEl.style.height=(cell*ROWS)+'px';
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ const b=grid[r]&&grid[r][c]; if(b){ b.el.style.width=b.el.style.height=ballSize+'px'; setPos(b,r,c,false); } }
  }
  function xy(r,c){ const o=(cell-ballSize)/2; return [c*cell+o, r*cell+o]; }
  function setPos(b,r,c,anim){
    const [x,y]=xy(r,c); const t='translate('+x+'px,'+y+'px)';
    if(anim===false){ b.el.classList.add('nofx'); b.el.style.transform=t; void b.el.offsetWidth; b.el.classList.remove('nofx'); }
    else b.el.style.transform=t;
    b.el.style.setProperty('--t',t);
  }
  function makeBall(color){ const el=document.createElement('div'); el.className='pz-ball '+color; if(IMG[color]) el.style.backgroundImage='url("'+IMG[color]+'")'; el.style.width=el.style.height=ballSize+'px'; boardEl.appendChild(el); return {color,el}; }
  function randColor(){ return COLORS[Math.floor(Math.random()*COLORS.length)]; }
  function reset(){
    boardEl.innerHTML=''; grid=[];
    cell=boardEl.clientWidth/COLS; ballSize=cell*BALL_RATIO; boardEl.style.height=(cell*ROWS)+'px';
    for(let r=0;r<ROWS;r++){ grid[r]=[]; for(let c=0;c<COLS;c++){
      let col; do{ col=randColor(); }while((c>=2&&grid[r][c-1].color===col&&grid[r][c-2].color===col)||(r>=2&&grid[r-1][c].color===col&&grid[r-2][c].color===col));
      const b=makeBall(col); grid[r][c]=b; setPos(b,r,c,false);
    }}
  }

  /* ---- ドラッグ（押し出し方式）---- */
  function rel(e){ const rc=boardEl.getBoundingClientRect(); return {x:e.clientX-rc.left, y:e.clientY-rc.top}; }
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  function moveHeld(p){ grab.b.el.style.transform='translate('+(p.x-ballSize/2)+'px,'+(p.y-ballSize/2)+'px) scale(1.18)'; }
  boardEl.addEventListener('pointerdown',e=>{
    if(busy||locked||grab) return;
    const p=rel(e); const c=Math.floor(p.x/cell), r=Math.floor(p.y/cell);
    if(r<0||r>=ROWS||c<0||c>=COLS) return;
    grab={r,c,b:grid[r][c],id:e.pointerId}; moved=false;
    grab.b.el.classList.add('held'); moveHeld(p);
    try{ boardEl.setPointerCapture(e.pointerId); }catch(err){}
    e.preventDefault();
  });
  window.addEventListener('pointermove',e=>{
    if(!grab||e.pointerId!==grab.id) return;
    const raw=rel(e); const W=cell*COLS, H=cell*ROWS;
    const p={x:clamp(raw.x,0,W-0.01), y:clamp(raw.y,0,H-0.01)};   // 盤面の外に出てもドラッグ継続
    moveHeld(p);
    const tr=Math.floor(p.y/cell), tc=Math.floor(p.x/cell); let guard=0;
    while((tr!==grab.r||tc!==grab.c)&&guard++<12){
      const dr=tr-grab.r, dc=tc-grab.c;
      if(Math.abs(dc)>=Math.abs(dr)) swapTo(grab.r,grab.c+Math.sign(dc)); else swapTo(grab.r+Math.sign(dr),grab.c);
    }
  },{passive:true});
  function swapTo(nr,nc){ const other=grid[nr][nc]; grid[nr][nc]=grab.b; grid[grab.r][grab.c]=other; setPos(other,grab.r,grab.c); grab.r=nr; grab.c=nc; moved=true; onTick(); }
  function release(e){ if(!grab||(e&&e.pointerId!==grab.id)) return; const g=grab; grab=null; g.b.el.classList.remove('held'); setPos(g.b,g.r,g.c); if(moved) setTimeout(resolve,110); }
  window.addEventListener('pointerup',release); window.addEventListener('pointercancel',release);

  /* ---- 3つ以上の判定（縦横、L字・T字・多連結もひとまとまり）---- */
  function findGroups(){
    const mark=[]; for(let r=0;r<ROWS;r++){ mark[r]=[]; for(let c=0;c<COLS;c++) mark[r][c]=false; }
    for(let r=0;r<ROWS;r++){ let c=0; while(c<COLS){ let e=c; while(e<COLS&&grid[r][e].color===grid[r][c].color) e++; if(e-c>=3) for(let k=c;k<e;k++) mark[r][k]=true; c=e; } }
    for(let c=0;c<COLS;c++){ let r=0; while(r<ROWS){ let e=r; while(e<ROWS&&grid[e][c].color===grid[r][c].color) e++; if(e-r>=3) for(let k=r;k<e;k++) mark[k][c]=true; r=e; } }
    const groups=[], seen=[]; for(let r=0;r<ROWS;r++) seen[r]=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      if(!mark[r][c]||seen[r][c]) continue;
      const color=grid[r][c].color, cells=[], st=[[r,c]]; seen[r][c]=true;
      while(st.length){ const [a,b]=st.pop(); cells.push([a,b]);
        [[a+1,b],[a-1,b],[a,b+1],[a,b-1]].forEach(([y,x])=>{ if(y>=0&&y<ROWS&&x>=0&&x<COLS&&mark[y][x]&&!seen[y][x]&&grid[y][x].color===color){ seen[y][x]=true; st.push([y,x]); } });
      }
      groups.push({color,cells});
    }
    return groups;
  }

  /* ---- 消去→落下→補充→連鎖 ---- */
  async function resolve(){
    busy=true; let combo=0; const counts={}; let total=0; const groupsOut=[];
    while(true){
      const groups=findGroups(); if(!groups.length) break;
      for(const g of groups){
        combo++; counts[g.color]=(counts[g.color]||0)+g.cells.length; total+=g.cells.length; groupsOut.push({color:g.color,n:g.cells.length});
        onMatch(g,combo);
        g.cells.forEach(([r,c])=>grid[r][c].el.classList.add('pop'));
        await wait(150);
      }
      await wait(180);
      groups.forEach(g=>g.cells.forEach(([r,c])=>{ grid[r][c].el.remove(); grid[r][c]=null; }));
      for(let c=0;c<COLS;c++){
        let w=ROWS-1;
        for(let r=ROWS-1;r>=0;r--){ if(grid[r][c]){ if(w!==r){ grid[w][c]=grid[r][c]; grid[r][c]=null; setPos(grid[w][c],w,c); } w--; } }
        let above=1;
        for(let r=w;r>=0;r--){ const b=makeBall(randColor()); grid[r][c]=b; setPos(b,-above,c,false); above++; requestAnimationFrame(()=>requestAnimationFrame(()=>setPos(b,r,c))); }
      }
      await wait(260);
    }
    busy=false;
    if(combo>0) onResolve({combo,counts,total,groups:groupsOut});
  }

  window.addEventListener('resize',layout);
  reset();
  return { reset, layout, lock:()=>{locked=true;}, unlock:()=>{locked=false;}, setColors:list=>{ COLORS=list.slice(); }, get grid(){return grid;}, get busy(){return busy;} };
}

global.PazugoruPuzzle={mount};
})(window);
