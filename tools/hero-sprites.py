#!/usr/bin/env python3
"""主人公の歩きスプライト取り込み（市松背景のシート → assets/hero.png + hero.json）
   使い方: python3 tools/hero-sprites.py <boy.png> <girl.png>
   シートの並び：行＝下・上・左・右、列＝立ち・歩き1・歩き2（ラベルの札は自動で除外）
"""
import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage
H_OUT = 22          # 出力の高さ（幅は比率から。1マス16pxより少し背が高い）
DIRS = ['down', 'up', 'left', 'right']

def extract(path, prefix):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    h, w = a.shape[:2]
    # 市松（白／薄灰）：明るくて彩度が低い
    mx, mn = a.max(axis=2), a.min(axis=2)
    checker = (mn > 150) & (mx - mn < 30)
    # 外周から繋がっている市松だけ背景（靴の白は輪郭で囲まれているので残る）
    lab, _ = ndimage.label(checker)
    edge = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)
    bg = np.isin(lab, list(edge))
    fg = ~bg
    lab2, n = ndimage.label(fg)
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab2), 1):
        ch = sl[0].stop - sl[0].start; cw = sl[1].stop - sl[1].start
        if ch < 60 or cw < 40: continue
        cx = (sl[1].start + sl[1].stop) / 2; cy = (sl[0].start + sl[0].stop) / 2
        # ラベルの札（緑の四角）を除外：平均色が暗い緑
        m = lab2[sl] == i; col = a[sl][m].mean(axis=0)
        if col[1] > col[0] + 12 and col[1] > col[2] + 12 and col.mean() < 120: continue
        comps.append((cy, cx, sl, i))
    assert len(comps) == 12, f'{path}: {len(comps)} sprites found'
    ys = sorted(c[0] for c in comps); rows = [ys[0], ys[3], ys[6], ys[9]]
    out = {}
    for cy, cx, sl, i in comps:
        r = min(range(4), key=lambda k: abs(rows[k] - cy))
        out.setdefault(r, []).append((cx, sl, i))
    sprites = {}
    for r in range(4):
        for c, (cx, sl, i) in enumerate(sorted(out[r])):
            crop = a[sl]; m = lab2[sl] == i
            rgba = np.dstack([crop, np.where(m, 255, 0)]).astype(np.uint8)
            s = Image.fromarray(rgba, 'RGBA')
            k = H_OUT / s.height; wo = max(8, round(s.width * k))
            sprites[f'{prefix}_{DIRS[r]}{c}'] = s.resize((wo, H_OUT), Image.LANCZOS)
    return sprites

sprites = {}
sprites.update(extract(sys.argv[1], 'hm'))
sprites.update(extract(sys.argv[2], 'hf'))
W = 16 * 12; x = y = 0; meta = {}
sheet = Image.new('RGBA', (W, H_OUT * 2), (0, 0, 0, 0))
for k, s in sprites.items():
    if x + s.width > W: x = 0; y += H_OUT
    sheet.paste(s, (x, y)); meta[k] = [x, y, s.width, s.height]; x += s.width
sheet.save('assets/hero.png'); json.dump(meta, open('assets/hero.json', 'w'))
print('sprites:', len(meta), {k: v[2:] for k, v in list(meta.items())[:3]})
