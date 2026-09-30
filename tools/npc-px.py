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
