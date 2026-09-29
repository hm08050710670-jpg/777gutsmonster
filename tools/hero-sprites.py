#!/usr/bin/env python3
"""主人公の歩きスプライト取り込み（市松背景のシート → assets/hero.png + hero.json）
   使い方: python3 tools/hero-sprites.py <boy.png> <girl.png>
   シートの並び：行＝下・上・左・右、列＝立ち・歩き1・歩き2（ラベルの札は自動で除外）
"""
import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage
H_OUT = 18          # 出力の高さ（--h=N で変更。幅は比率から）
for _a in sys.argv[3:]:
    if _a.startswith('--h='): H_OUT = int(_a[4:])
DIRS = ['down', 'up', 'left', 'right']

# ドット化（town-tiles.py と同じ考え方）：1ドットにつき元のブロック中心付近の中央値を拾う
def pixelize(img, tw, th):
    arr = np.asarray(img.convert('RGBA')).astype(int); h, w = arr.shape[:2]
    bx, by = w / tw, h / th
    r = max(1, int(min(bx, by) * 0.25))
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
    # 全コマ共通の倍率（立ちコマの高さ基準）。コマごとに倍率が変わると帽子のロゴ等がズレて見える
    ref_h = max(sl[0].stop - sl[0].start for r in range(4) for (_, sl, _) in out[r])
    k = H_OUT / ref_h
    sprites = {}
    for r in range(4):
        for c, (cx, sl, i) in enumerate(sorted(out[r])):
            crop = a[sl]; m = lab2[sl] == i
            rgba = np.dstack([crop, np.where(m, 255, 0)]).astype(np.uint8)
            s = Image.fromarray(rgba, 'RGBA')
            wo = max(8, round(s.width * k)); ho = max(8, round(s.height * k))
            px = pixelize(s, wo, ho)
            # 高さ H_OUT の枠に上端（帽子）を揃えて入れる。足が長いコマは下を切る
            fr = Image.new('RGBA', (wo, H_OUT), (0, 0, 0, 0)); fr.paste(px, (0, 0))
            sprites[f'{prefix}_{DIRS[r]}{c}'] = fr
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
