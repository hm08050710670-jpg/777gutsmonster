#!/usr/bin/env python3
"""下敷き（薄いピンクの枠）に描かれた建物を取り込む。枠の大きさ＝指定ドット数として、ブロック中央値で落とす
   使い方: python3 tools/town-frame.py <img.png> name=WxH[@CWxCH] [--keybg]
     --keybg: 枠の四隅から地の色（芝など）を塗りつぶして透明にする
"""
import sys, json, os, re
from PIL import Image
import numpy as np
from scipy import ndimage
exec(open(os.path.join(os.path.dirname(__file__), 'town-fit.py')).read().split("src = Image.open")[0])   # pixelize

src = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(src).astype(int)
m = re.match(r'(\w+)=(\d+)x(\d+)(?:@(\d+)x(\d+))?', sys.argv[2]); name, tw, th = m.group(1), int(m.group(2)), int(m.group(3))
keybg = '--keybg' in sys.argv
x2 = '--x2' in sys.argv   # 2倍の細かさで取り込み、ゲームでは半分の大きさで描く（細い線や文字が残る）
# 枠：薄いピンク（マゼンタより緑が高い）。マゼンタ系は全部「背景」
mag = (a[:, :, 0] > 200) & (a[:, :, 2] > 200) & (a[:, :, 1] < 170)
frame = mag & (a[:, :, 1] > 60)
ys, xs = np.where(frame)
# 枠の外接矩形（枠の中に絵があるので、枠色の最外周で決める）
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
if len(xs) == 0 or abs((x1 - x0) / max(1, y1 - y0) - tw / th) > 0.15 * tw / th:
    # 枠が見つからない（絵で隠れている等）→ 絵そのものの外接矩形を枠とみなす
    ys, xs = np.where(~mag); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    print('frame not found; using content bbox')
print('frame px', (x0, y0, x1 - x0, y1 - y0), 'px/dot', round((x1 - x0) / tw, 2), round((y1 - y0) / th, 2))
crop = src.crop((x0, y0, x1, y1)).convert('RGBA'); arr = np.asarray(crop).copy()
mm = mag[y0:y1, x0:x1]; arr[mm, 3] = 0
if keybg:
    rgb = arr[:, :, :3].astype(int); h, w = rgb.shape[:2]
    # 四隅付近の不透明色を地の色とみなす
    cand = [rgb[h - 3, 2], rgb[h - 3, w - 3], rgb[2, 2], rgb[2, w - 3]]
    for seed in cand:
        near = (np.abs(rgb - seed).sum(axis=2) < 60) & (arr[:, :, 3] > 0)
        lab_, _ = ndimage.label(near)
        edge = set(lab_[0, :]) | set(lab_[-1, :]) | set(lab_[:, 0]) | set(lab_[:, -1]); edge.discard(0)
        # 枠に接している（透明に隣接する）成分だけ消す
        touch = set(np.unique(lab_[np.roll(arr[:, :, 3] == 0, 1, 0) | np.roll(arr[:, :, 3] == 0, -1, 0) | np.roll(arr[:, :, 3] == 0, 1, 1) | np.roll(arr[:, :, 3] == 0, -1, 1)])); touch.discard(0)
        kill = np.isin(lab_, list(edge | touch)); arr[kill, 3] = 0
k = 2 if x2 else 1
t = pixelize(Image.fromarray(arr), tw * k, th * k)
if m.group(4):
    cw, ch = int(m.group(4)) * k, int(m.group(5)) * k; c = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); c.paste(t, ((cw - tw * k) // 2, ch - th * k)); t = c
tiles = {}
old = Image.open('assets/tiles.png').convert('RGBA'); meta = json.load(open('assets/tiles.json'))
scales = {k: v[4] for k, v in meta.items() if len(v) > 4}
for k, v in meta.items(): x, y, w, h = v[:4]; tiles[k] = old.crop((x, y, x + w, y + h))
tiles[name] = t
if x2: scales[name] = 0.5
else: scales.pop(name, None)
items = sorted(tiles.items(), key=lambda kv: (-kv[1].height, -kv[1].width))
W = 384; x = y = rowh = 0; meta = {}
sheet = Image.new('RGBA', (W, 2048), (0, 0, 0, 0))
for k, tt in items:
    if x + tt.width > W: x = 0; y += rowh; rowh = 0
    sheet.paste(tt, (x, y)); meta[k] = [x, y, tt.width, tt.height] + ([scales[k]] if k in scales else []); x += tt.width; rowh = max(rowh, tt.height)
sheet = sheet.crop((0, 0, W, y + rowh)); sheet.save('assets/tiles.png'); json.dump(meta, open('assets/tiles.json', 'w'))
print(name, t.size, 'tiles:', len(meta))
