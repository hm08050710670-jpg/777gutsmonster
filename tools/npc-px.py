#!/usr/bin/env python3
"""NPC歩きスプライト取り込み：assets/src/npc/*.png（マゼンタ背景、4行×3列＝下・上・左・右×立ち・歩き1・歩き2）
   → assets/npc.png + npc.json。高さ18ドットに落とす（ブロック中央値）。ファイル名がスプライト名になる"""
import os, glob, json
os.chdir('/home/claude/gb-rpg-skeleton')
from PIL import Image
import numpy as np
from scipy import ndimage
exec(open('tools/town-fit.py').read().split("src = Image.open")[0])   # pixelize
DIRS=['down','up','left','right']; H=18
EXACT={'hori','kuga','bunta','shinji'}   # 等倍で取り込む（縮小しない）
LEG_TRIM={'hori':2,'kuga':1,'bunta':1}   # 足が長すぎる絵は、シャツより下の「黒だけの行」を上から n 行抜いて背を詰める
sprites={}
for path in sorted(glob.glob('assets/src/npc/*.png')):
    name=os.path.splitext(os.path.basename(path))[0]
    src=Image.open(path).convert('RGB'); a=np.asarray(src).astype(int)
    mag=(a[:,:,0]>200)&(a[:,:,1]<80)&(a[:,:,2]>200)
    lab,_=ndimage.label(~mag)
    cells=[(sl[0].start,sl[1].start,sl[1].stop-sl[1].start,sl[0].stop-sl[0].start) for sl in ndimage.find_objects(lab)]
    cells=[c for c in cells if c[2]>60 and c[3]>60]
    assert len(cells)==12, f'{name}: {len(cells)}'
    ys=sorted(c[0] for c in cells); rows=[ys[0],ys[3],ys[6],ys[9]]
    ref_h=max(c[3] for c in cells)
    # 元絵の格子（1ドット何px）を測り、格子どおりのドット数で落とす（縮小で輪郭が混ざらないように）
    Ps=[]
    for (y0,x0,w0,h0) in cells:
        c0=a[y0:y0+h0,x0:x0+w0]
        g=np.abs(np.diff(c0,axis=1)).sum(axis=2).sum(axis=0).astype(float); g-=g.mean()
        ac=[np.dot(g[:-k],g[k:]) for k in range(8,22)]; Ps.append(int(np.argsort(ac)[::-1][0])+8)
    P=int(np.median(Ps))
    nat_h=round(ref_h/P)
    k=(1/P) if 16<=nat_h<=20 else H/ref_h
    HH=max(H,round(ref_h*k))
    byrow={}
    for (y,x,w,h) in cells:
        r=min(range(4),key=lambda i:abs(rows[i]-y)); byrow.setdefault(r,[]).append((x,y,w,h))
    # 等倍取り込み（EXACT）：元絵の格子の位相を合わせ、各ブロックの中央の色をそのまま1ドットにする（縮小で目や輪郭がぼやけない）
    if name in EXACT:
        HH=max(H,nat_h-LEG_TRIM.get(name,0))
        for r in range(4):
            for c,(x,y,w,h) in enumerate(sorted(byrow[r])):
                c0=a[y:y+h,x:x+w]; m0=mag[y:y+h,x:x+w]
                gx=np.abs(np.diff(c0,axis=1)).sum(axis=2).sum(axis=0); gy=np.abs(np.diff(c0,axis=0)).sum(axis=2).sum(axis=1)
                ox=max(range(P),key=lambda o: gx[[i for i in range(o,len(gx),P)]].sum())   # 色の変わり目が最も集まる位相＝ブロック境界
                oy=max(range(P),key=lambda o: gy[[i for i in range(o,len(gy),P)]].sum())
                x0=(ox+1)%P; y0=(oy+1)%P
                if x0>P//2: x0-=P
                if y0>P//2: y0-=P
                tw=-(-(w-x0)//P); th=-(-(h-y0)//P)
                px=np.zeros((th,tw,4),dtype=np.uint8)
                for j in range(th):
                    for i in range(tw):
                        cy=y0+j*P+P//2; cx=x0+i*P+P//2
                        if cy<0 or cx<0 or cy>=h or cx>=w: continue
                        # ブロック中央 3×3 の中で最も多い色（境界のにじみを避ける）
                        win=c0[max(0,cy-2):cy+3,max(0,cx-2):cx+3].reshape(-1,3); mw=m0[max(0,cy-2):cy+3,max(0,cx-2):cx+3].reshape(-1)
                        purple=(win[:,0]>120)&(win[:,2]>120)&(win[:,1]<np.minimum(win[:,0],win[:,2])-50)   # マゼンタの混ざった縁
                        if (mw|purple).mean()>0.5: continue
                        win=win[~(mw|purple)]; q=(win//8)*8; vals,cnt=np.unique(q,axis=0,return_counts=True); col=win[(q==vals[cnt.argmax()]).all(axis=1)][0]
                        px[j,i]=(*col,255)
                # 透明な行・列を落とす
                keep_r=np.where(px[:,:,3].any(axis=1))[0]; keep_c=np.where(px[:,:,3].any(axis=0))[0]
                px=px[keep_r.min():keep_r.max()+1, keep_c.min():keep_c.max()+1]
                trim=LEG_TRIM.get(name,0)
                if trim:
                    hh=px.shape[0]; cand=[]
                    for rr in range(hh-6,hh):   # 下6行のうち、不透明ドットが全部暗い（靴の白を含まない）行
                        op=px[rr][px[rr,:,3]>0]
                        if len(op) and (op[:,:3].astype(int).sum(axis=1)<120).all(): cand.append(rr)
                    drop=set(cand[:trim]); px=np.array([px[rr] for rr in range(hh) if rr not in drop])
                fr=Image.new('RGBA',(px.shape[1],HH),(0,0,0,0)); fr.paste(Image.fromarray(px,'RGBA'),(0,HH-px.shape[0]))
                sprites[f'{name}_{DIRS[r]}{c}']=fr
        print(name, 'P=%d nat_h=%d -> exact %dpx'%(P,nat_h,HH)); continue
    for r in range(4):
        for c,(x,y,w,h) in enumerate(sorted(byrow[r])):
            crop=src.crop((x,y,x+w,y+h)).convert('RGBA'); arr=np.asarray(crop).copy(); arr[mag[y:y+h,x:x+w],3]=0
            tw=max(8,round(w*k)); th=max(8,round(h*k))
            t=pixelize(Image.fromarray(arr),tw,th)
            p=np.asarray(t).copy(); rgb=p[:,:,:3].astype(int); pk=(rgb[:,:,0]>200)&(rgb[:,:,2]>200)&(rgb[:,:,1]<120); p[pk,3]=0
            fr=Image.new('RGBA',(tw,HH),(0,0,0,0)); fr.paste(Image.fromarray(p,'RGBA'),(0,HH-th))
            sprites[f'{name}_{DIRS[r]}{c}']=fr
    print(name, 'P=%d nat_h=%d -> %dpx'%(P,nat_h,HH))
RH=max(s.height for s in sprites.values())
W=16*20; x=y=0; meta={}
sheet=Image.new('RGBA',(W,RH*40),(0,0,0,0))
for k,s in sprites.items():
    if x+s.width>W: x=0; y+=RH
    sheet.paste(s,(x,y)); meta[k]=[x,y,s.width,s.height]; x+=s.width
sheet=sheet.crop((0,0,W,y+RH)); sheet.save('assets/npc.png'); json.dump(meta,open('assets/npc.json','w'))
print('sprites', len(meta), sheet.size)
