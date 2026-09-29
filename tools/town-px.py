#!/usr/bin/env python3
"""街タイル取り込み（等倍ドット版）：マゼンタ背景・1ドット＝N×Nピクセルのシートから、
   素材を上から左の順に切り出して assets/tiles.png / tiles.json に追加・置換する（既存の名前は上書き）
   使い方: python3 tools/town-px.py <sheet.png> name1,name2,...   （名前の数＝素材の数）
"""
import sys, json, os
from PIL import Image
import numpy as np
from scipy import ndimage

def period(a):
    g = np.abs(np.diff(a, axis=1)).sum(axis=2).sum(axis=0).astype(float); g -= g.mean()
    ac = [np.dot(g[:-k], g[k:]) for k in range(2, 24)]
    return int(np.argmax(ac)) + 2

src = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(src).astype(int)
names = sys.argv[2].split(',')
P = period(a)
for _a in sys.argv[3:]:
    if _a.startswith('--p='): P = int(_a[4:])   # 格子の大きさを手で指定（自動判定が外れたとき）
mag = (a[:, :, 0] > 200) & (a[:, :, 1] < 80) & (a[:, :, 2] > 200)
lab, _ = ndimage.label(~mag)
cells = []
for sl in ndimage.find_objects(lab):
    w = sl[1].stop - sl[1].start; h = sl[0].stop - sl[0].start
    if w < P * 2 or h < P * 2: continue
    cells.append((sl[0].start, sl[1].start, w, h))
# 行ごと（上から）、行内は左から
cells.sort(key=lambda c: (round(c[0] / (P * 4)), c[1]))
assert len(cells) == len(names), f'{len(cells)} cells but {len(names)} names (P={P})'
new = {}
for name, (y, x, w, h) in zip(names, cells):
    x0, y0 = x - x % P, y - y % P
    tw, th = -(-(x + w - x0) // P), -(-(y + h - y0) // P)
    px = np.zeros((th, tw, 4), dtype=np.uint8)
    for j in range(th):
        for i in range(tw):
            cx, cy = x0 + i * P + P // 2, y0 + j * P + P // 2
            if cy >= a.shape[0] or cx >= a.shape[1] or mag[cy, cx]: continue
            px[j, i] = (*a[cy, cx], 255)
    new[name] = Image.fromarray(px, 'RGBA'); print(name, tw, 'x', th)
# 既存のシートを読み込んで統合
tiles = {}
if os.path.exists('assets/tiles.json'):
    old = Image.open('assets/tiles.png').convert('RGBA'); meta = json.load(open('assets/tiles.json'))
    for k, (x, y, w, h) in meta.items(): tiles[k] = old.crop((x, y, x + w, y + h))
tiles.update(new)
items = sorted(tiles.items(), key=lambda kv: (-kv[1].height, -kv[1].width))
W = 256; x = y = rowh = 0; meta = {}
sheet = Image.new('RGBA', (W, 1024), (0, 0, 0, 0))
for k, t in items:
    if x + t.width > W: x = 0; y += rowh; rowh = 0
    sheet.paste(t, (x, y)); meta[k] = [x, y, t.width, t.height]
    x += t.width; rowh = max(rowh, t.height)
sheet = sheet.crop((0, 0, W, y + rowh))
sheet.save('assets/tiles.png'); json.dump(meta, open('assets/tiles.json', 'w'))
print('P =', P, 'tiles:', len(meta), 'sheet', sheet.size)
