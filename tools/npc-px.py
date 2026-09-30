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
    ref_h=max(c[3] for c in cells); k=H/ref_h
    byrow={}
    for (y,x,w,h) in cells:
        r=min(range(4),key=lambda i:abs(rows[i]-y)); byrow.setdefault(r,[]).append((x,y,w,h))
    for r in range(4):
        for c,(x,y,w,h) in enumerate(sorted(byrow[r])):
            crop=src.crop((x,y,x+w,y+h)).convert('RGBA'); arr=np.asarray(crop).copy(); arr[mag[y:y+h,x:x+w],3]=0
            tw=max(8,round(w*k)); th=max(8,round(h*k))
            t=pixelize(Image.fromarray(arr),tw,th)
            p=np.asarray(t).copy(); rgb=p[:,:,:3].astype(int); pk=(rgb[:,:,0]>200)&(rgb[:,:,2]>200)&(rgb[:,:,1]<120); p[pk,3]=0
            fr=Image.new('RGBA',(tw,H),(0,0,0,0)); fr.paste(Image.fromarray(p,'RGBA'),(0,H-th))
            sprites[f'{name}_{DIRS[r]}{c}']=fr
    print(name, 'ok')
W=16*20; x=y=0; meta={}
sheet=Image.new('RGBA',(W,H*40),(0,0,0,0))
for k,s in sprites.items():
    if x+s.width>W: x=0; y+=H
    sheet.paste(s,(x,y)); meta[k]=[x,y,s.width,s.height]; x+=s.width
sheet=sheet.crop((0,0,W,y+H)); sheet.save('assets/npc.png'); json.dump(meta,open('assets/npc.json','w'))
print('sprites', len(meta), sheet.size)
