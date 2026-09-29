#!/usr/bin/env python3
"""主人公スプライト取り込み（等倍ドット版）
   マゼンタ背景・1ドット＝N×Nピクセルの正方形で描かれたシート（4行×3列）→ assets/hero.png + hero.json
   使い方: python3 tools/hero-px.py <boy.png> <girl.png>
   縮小は一切せず、各ブロックの中心の色をそのまま1ドットにする
"""
import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage
DIRS = ['down', 'up', 'left', 'right']

def period(a):
    g = np.abs(np.diff(a, axis=1)).sum(axis=2).sum(axis=0).astype(float); g -= g.mean()
    ac = [np.dot(g[:-k], g[k:]) for k in range(2, 24)]
    return int(np.argmax(ac)) + 2

def extract(path, prefix):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    P = period(a)
    mag = (a[:, :, 0] > 200) & (a[:, :, 1] < 80) & (a[:, :, 2] > 200)
    lab, _ = ndimage.label(~mag)
    cells = []
    for sl in ndimage.find_objects(lab):
        w = sl[1].stop - sl[1].start; h = sl[0].stop - sl[0].start
        if w < P * 4 or h < P * 4: continue
        cells.append((sl[0].start, sl[1].start, w, h))
    assert len(cells) == 12, f'{path}: {len(cells)} sprites (P={P})'
    ys = sorted(c[0] for c in cells); rows = [ys[0], ys[3], ys[6], ys[9]]
    byrow = {}
    for (y, x, w, h) in cells:
        r = min(range(4), key=lambda k: abs(rows[k] - y)); byrow.setdefault(r, []).append((x, y, w, h))
    # 全コマ共通の格子：各コマの左上をブロック境界に丸めて、幅・高さもブロック単位に
    out = {}
    for r in range(4):
        for c, (x, y, w, h) in enumerate(sorted(byrow[r])):
            x0, y0 = x - x % P, y - y % P
            tw, th = -(-(x + w - x0) // P), -(-(y + h - y0) // P)
            px = np.zeros((th, tw, 4), dtype=np.uint8)
            for j in range(th):
                for i in range(tw):
                    cx, cy = x0 + i * P + P // 2, y0 + j * P + P // 2
                    if cy >= a.shape[0] or cx >= a.shape[1] or mag[cy, cx]: continue
                    px[j, i] = (*a[cy, cx], 255)
            out[f'{prefix}_{DIRS[r]}{c}'] = Image.fromarray(px, 'RGBA')
    print(path, 'P =', P, 'size', tw, 'x', th)
    return out

sprites = {}
sprites.update(extract(sys.argv[1], 'hm'))
sprites.update(extract(sys.argv[2], 'hf'))
H = max(s.height for s in sprites.values())
W = 16 * 12; x = y = 0; meta = {}
sheet = Image.new('RGBA', (W, H * 2), (0, 0, 0, 0))
for k, s in sprites.items():
    if x + s.width > W: x = 0; y += H
    sheet.paste(s, (x, y)); meta[k] = [x, y, s.width, s.height]; x += s.width
sheet.save('assets/hero.png'); json.dump(meta, open('assets/hero.json', 'w'))
print('sprites:', len(meta))
