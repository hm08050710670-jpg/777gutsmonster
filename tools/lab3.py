import sys, json, os
os.chdir('/home/claude/gb-rpg-skeleton')
from PIL import Image; import numpy as np
from scipy import ndimage
exec(open('tools/town-fit.py').read().split("src = Image.open")[0])
src=Image.open('assets/src/bld_lab3.png').convert('RGB'); a=np.asarray(src).astype(int)
mag=(a[:,:,0]>200)&(a[:,:,2]>200)&(a[:,:,1]<170)
ys,xs=np.where(~mag); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
t=pixelize(src.crop((x0,y0,x1,y1)).convert('RGBA'),160,112).crop((0,0,160,96))   # 階段の下の庭は切る（ゲームの地面を使う）
p=np.asarray(t).copy(); rgb=p[:,:,:3].astype(int)
lawn=np.array([118,218,75]); green=(np.abs(rgb-lawn).sum(axis=2)<70)
# 枠の薄ピンクの残りも透明に
pink=(rgb[:,:,0]>230)&(rgb[:,:,2]>200)&(rgb[:,:,1]<200); p[pink,3]=0
lab,_=ndimage.label(green); edge=set(lab[0,:])|set(lab[-1,:])|set(lab[:,0])|set(lab[:,-1]); edge.discard(0)
p[np.isin(lab,list(edge)),3]=0
c=Image.new('RGBA',(176,96),(0,0,0,0)); c.paste(Image.fromarray(p,'RGBA'),(8,0))
old=Image.open('assets/tiles.png').convert('RGBA'); meta=json.load(open('assets/tiles.json'))
tiles={}; scales={k:v[4] for k,v in meta.items() if len(v)>4}
for k,v in meta.items(): x,y,w,h=v[:4]; tiles[k]=old.crop((x,y,x+w,y+h))
tiles['lab']=c; scales.pop('lab',None)
items=sorted(tiles.items(),key=lambda kv:(-kv[1].height,-kv[1].width))
W=384;x=y=rowh=0;meta={}
sheet=Image.new('RGBA',(W,2048),(0,0,0,0))
for k,tt in items:
    if x+tt.width>W: x=0;y+=rowh;rowh=0
    sheet.paste(tt,(x,y)); meta[k]=[x,y,tt.width,tt.height]+([scales[k]] if k in scales else []); x+=tt.width; rowh=max(rowh,tt.height)
sheet=sheet.crop((0,0,W,y+rowh)); sheet.save('assets/tiles.png'); json.dump(meta,open('assets/tiles.json','w'))
bg=Image.new('RGBA',c.size,(127,211,90,255)); bg.alpha_composite(c); bg.resize((c.width*5,c.height*5),Image.NEAREST).save('/tmp/claude-0/-home-claude/1369009a-e915-5878-af46-a39f51abb06a/scratchpad/lab3_x5.png')
print(meta['lab'])
