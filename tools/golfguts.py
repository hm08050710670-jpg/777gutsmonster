"""GOLF GUTS の建物（ChatGPT製 assets/src/bld_golfguts.png、マゼンタ背景）を 176×96 のスプライト 'golfguts' として tiles.png に入れる。
   研究所（tools/lab3.py）と同じ手順。11×7 マス、7 段目は地面（ドア位置 [5,6]）"""
import sys, json, os
os.chdir('/home/claude/gb-rpg-skeleton')
from PIL import Image; import numpy as np
exec(open('tools/town-fit.py').read().split("src = Image.open")[0])
src = Image.open('assets/src/bld_golfguts.png').convert('RGB'); a = np.asarray(src).astype(int)
mag = (a[:, :, 0] > 200) & (a[:, :, 2] > 200) & (a[:, :, 1] < 170)
ys, xs = np.where(~mag); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
crop = src.crop((x0, y0, x1, y1)).convert('RGBA')
ca = np.asarray(crop).copy(); m = (ca[:, :, 0] > 200) & (ca[:, :, 2] > 200) & (ca[:, :, 1] < 170); ca[m, 3] = 0   # マゼンタを透明に
crop = Image.fromarray(ca, 'RGBA')
t = pixelize(crop, 176, 96)
p = np.asarray(t).copy()
pink = (p[:, :, 0] > 200) & (p[:, :, 2] > 180) & (p[:, :, 1] < 150) & (p[:, :, 3] > 0); p[pink, 3] = 0   # 縁に残ったマゼンタ混じりも透明に
c = Image.fromarray(p, 'RGBA')
old = Image.open('assets/tiles.png').convert('RGBA'); meta = json.load(open('assets/tiles.json'))
tiles = {}; scales = {k: v[4] for k, v in meta.items() if len(v) > 4}
for k, v in meta.items(): x, y, w, h = v[:4]; tiles[k] = old.crop((x, y, x + w, y + h))
tiles['golfguts'] = c; scales.pop('golfguts', None)
items = sorted(tiles.items(), key=lambda kv: (-kv[1].height, -kv[1].width))
W = 384; x = y = rowh = 0; meta = {}
sheet = Image.new('RGBA', (W, 2048), (0, 0, 0, 0))
for k, tt in items:
    if x + tt.width > W: x = 0; y += rowh; rowh = 0
    sheet.paste(tt, (x, y)); meta[k] = [x, y, tt.width, tt.height] + ([scales[k]] if k in scales else []); x += tt.width; rowh = max(rowh, tt.height)
sheet = sheet.crop((0, 0, W, y + rowh)); sheet.save('assets/tiles.png'); json.dump(meta, open('assets/tiles.json', 'w'))
bg = Image.new('RGBA', c.size, (127, 211, 90, 255)); bg.alpha_composite(c); bg.resize((c.width * 5, c.height * 5), Image.NEAREST).save('/tmp/claude-0/-home-claude/1369009a-e915-5878-af46-a39f51abb06a/scratchpad/golfguts_x5.png')
print(meta['golfguts'])
