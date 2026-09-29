#!/usr/bin/env python3
"""格子が揃っていないドット絵風の素材を、指定ドット数に「ブロック中央値」で落として tiles に追加する
   使い方: python3 tools/town-fit.py <sheet.png> name=WxH[@CWxCH] ...
     WxH: 出力ドット数（0 は比率から自動）。@CWxCH: そのサイズの透明キャンバスに下中央で置く（建物の余白用）
   素材はマゼンタ背景で区切られ、上から左の順に並んでいるものとする
"""
import sys, json, os, re
from PIL import Image
import numpy as np
from scipy import ndimage

def pixelize(img, tw, th):
    arr = np.asarray(img.convert('RGBA')).astype(int); h, w = arr.shape[:2]
    bx, by = w / tw, h / th
    r = max(1, int(min(bx, by) * 0.3))
    out = np.zeros((th, tw, 4), dtype=np.uint8)
    for j in range(th):
        cy = int((j + 0.5) * by)
        for i in range(tw):
            cx = int((i + 0.5) * bx)
            win = arr[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 4)
            a_ = win[:, 3]
            if (a_ > 127).mean() < 0.5: continue
            win = win[a_ > 127]
            out[j, i] = (*np.median(win[:, :3], axis=0).astype(int), 255)
    return Image.fromarray(out, 'RGBA')

src = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(src).astype(int)
mag = (a[:, :, 0] > 200) & (a[:, :, 1] < 80) & (a[:, :, 2] > 200)
lab, _ = ndimage.label(~mag)
cells = [(sl[0].start, sl[1].start, sl[1].stop - sl[1].start, sl[0].stop - sl[0].start) for sl in ndimage.find_objects(lab)]
cells = [c for c in cells if c[2] > 30 and c[3] > 30]
band = 200
specs = [s_ for s_ in sys.argv[2:] if not s_.startswith('--band=')]
for s_ in sys.argv[2:]:
    if s_.startswith('--band='): band = int(s_[7:])   # 行のまとまりの高さ（px）
cells.sort(key=lambda c: (c[0] // band, c[1]))
assert len(cells) == len(specs), f'{len(cells)} cells, {len(specs)} specs: {cells}'
new = {}
for spec, (y, x, w, h) in zip(specs, cells):
    m = re.match(r'(\w+)=(\d+)x(\d+)(?:@(\d+)x(\d+))?', spec)
    name, tw, th = m.group(1), int(m.group(2)), int(m.group(3))
    if tw == 0: tw = max(1, round(th * w / h))
    if th == 0: th = max(1, round(tw * h / w))
    crop = src.crop((x, y, x + w, y + h)).convert('RGBA'); arr = np.asarray(crop).copy()
    mm = (arr[:, :, 0] > 200) & (arr[:, :, 1] < 80) & (arr[:, :, 2] > 200); arr[mm, 3] = 0
    t = pixelize(Image.fromarray(arr), tw, th)
    if m.group(4):
        cw, ch = int(m.group(4)), int(m.group(5))
        c = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); c.paste(t, ((cw - tw) // 2, ch - th)); t = c
    new[name] = t; print(name, t.size, 'from', (w, h))
tiles = {}
if os.path.exists('assets/tiles.json'):
    old = Image.open('assets/tiles.png').convert('RGBA'); meta = json.load(open('assets/tiles.json'))
    for k, (x, y, w, h) in meta.items(): tiles[k] = old.crop((x, y, x + w, y + h))
tiles.update(new)
items = sorted(tiles.items(), key=lambda kv: (-kv[1].height, -kv[1].width))
W = 256; x = y = rowh = 0; meta = {}
sheet = Image.new('RGBA', (W, 2048), (0, 0, 0, 0))
for k, t in items:
    if x + t.width > W: x = 0; y += rowh; rowh = 0
    sheet.paste(t, (x, y)); meta[k] = [x, y, t.width, t.height]
    x += t.width; rowh = max(rowh, t.height)
sheet = sheet.crop((0, 0, W, y + rowh))
sheet.save('assets/tiles.png'); json.dump(meta, open('assets/tiles.json', 'w'))
print('tiles:', len(meta), 'sheet', sheet.size)
