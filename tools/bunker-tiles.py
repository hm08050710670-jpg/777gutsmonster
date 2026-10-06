#!/usr/bin/env python3
"""バンカー13枚セット（ChatGPT製、マゼンタ背景、透明地）を16ドットで取り込み bk_* を置き換える。
   使い方: python3 tools/bunker-tiles.py assets/src/bunker_sheet_B.png   （course-finish.py の後に）
   並び：中央A 中央B 上 下 左 / 右 左上 右上 左下 右下 / 内角 左上 右上 左下 右下（行は y でまとめ、ラベル箱は除外）"""
import json, sys
from PIL import Image
import numpy as np
from scipy import ndimage
src = sys.argv[1]
j = json.load(open('assets/tiles.json')); atlas = Image.open('assets/tiles.png').convert('RGBA')
A = np.asarray(Image.open(src).convert('RGB')).astype(int)
mag = (A[:, :, 0] > 180) & (A[:, :, 2] > 180) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 80)
lab, n = ndimage.label(~mag); comps = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    if w < 60 or h < 60: continue
    m = (lab[sl] == i + 1)
    if np.median(A[sl][m], axis=0).sum() < 250: continue   # ラベル
    comps.append((sl[0].start, sl[1].start, w, h))
comps.sort(); rows = []
for c in comps:
    if rows and abs(rows[-1][0][0] - c[0]) < 120: rows[-1].append(c)
    else: rows.append([c])
rows = [sorted(r, key=lambda c: c[1]) for r in rows]; print([len(r) for r in rows])
flat = [c for r in rows for c in r]
names = ['bk_c0', 'bk_c1', 'bk_u', 'bk_d', 'bk_l', 'bk_r', 'bk_ul', 'bk_ur', 'bk_dl', 'bk_dr', 'bk_iul', 'bk_iur', 'bk_idl', 'bk_idr']
TILE = max(c[2] for c in flat); DOT = TILE / 16   # 正方形タイルの一辺から1ドットのpx
# 各部品の「タイル内での位置」：中央・内角は全体、辺/角は欠けている側に寄せる
ANCH = {'bk_u': ('c', 't'), 'bk_d': ('c', 'b'), 'bk_l': ('l', 'c'), 'bk_r': ('r', 'c'), 'bk_ul': ('l', 't'), 'bk_ur': ('r', 't'), 'bk_dl': ('l', 'b'), 'bk_dr': ('r', 'b')}
def cut(y, x, w, h, nm):
    ax, ay = ANCH.get(nm, ('c', 'c'))
    # 部品の bbox を 16 ドット枠に当てはめる：欠けた側に寄せる（例：上の縁は上寄せ）
    tw, th = 16, 16   # 部品の大きさに関係なく 16 ドットに引き伸ばす（隙間を作らない）
    reg = A[y:y + h, x:x + w]; m = ~mag[y:y + h, x:x + w]
    out = np.zeros((16, 16, 4), dtype=np.uint8); bx, by = w / tw, h / th; r = max(1, int(min(bx, by) * 0.3))
    ox = 0 if ax == 'l' else (16 - tw if ax == 'r' else (16 - tw) // 2); oy = 0 if ay == 't' else (16 - th if ay == 'b' else (16 - th) // 2)
    for jj in range(th):
        cy = int((jj + 0.5) * by)
        for ii in range(tw):
            cx = int((ii + 0.5) * bx)
            win = reg[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 3); mm = m[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1)
            if mm.mean() < 0.5: continue
            out[oy + jj, ox + ii] = (*np.median(win[mm], axis=0).astype(int), 255)
    arr = out.astype(int); pink = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 50) & (arr[:, :, 0] > 120); arr[pink] = 0
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')
tiles = {}
for c, nm in zip(flat, names):
    y, x, w, h = c
    if nm in ('bk_c0', 'bk_c1'): ins = int(w * 0.04); c = (y + ins, x + ins, w - 2 * ins, h - 2 * ins)
    tiles[nm] = cut(*c, nm)
# 隙間埋め：縁・角は「砂が占める箱」の内側、内角は角の透明部分以外、中央は全部を砂で埋める
BOX = {'bk_u': ('t',), 'bk_d': ('b',), 'bk_l': ('l',), 'bk_r': ('r',), 'bk_ul': ('t', 'l'), 'bk_ur': ('t', 'r'), 'bk_dl': ('b', 'l'), 'bk_dr': ('b', 'r')}
INNER = {'bk_iul': (0, 0), 'bk_iur': (0, 15), 'bk_idl': (15, 0), 'bk_idr': (15, 15)}
sand = np.asarray(tiles['bk_c0']).copy()
for nm, im in tiles.items():
    a = np.asarray(im).copy()
    green = (a[:, :, 3] > 0) & (a[:, :, 1].astype(int) > a[:, :, 0].astype(int) + 20)
    isSand = (a[:, :, 3] > 0) & ~green
    hole = (a[:, :, 3] == 0) | green
    if nm in BOX:
        ys, xs = np.where(isSand); y0, y1, x0, x1 = 0, 16, 0, 16
        for side in BOX[nm]:
            if side == 't': y0 = ys.min()
            if side == 'b': y1 = ys.max() + 1
            if side == 'l': x0 = xs.min()
            if side == 'r': x1 = xs.max() + 1
        box = np.zeros((16, 16), bool); box[y0:y1, x0:x1] = True
        # 箱の中でも、砂の外周（丸い角の外側）は透明のまま：閉じた側の境界に連結している穴は外側
        lab2, _ = ndimage.label(hole); outside = np.zeros_like(hole)
        for side in BOX[nm]:
            seeds = {'t': lab2[0, :], 'b': lab2[15, :], 'l': lab2[:, 0], 'r': lab2[:, 15]}[side]
            for k in set(seeds.tolist()):
                if k: outside |= (lab2 == k)
        fill = hole & box & ~(outside & ~box)   # 箱の外は透明、箱の中の穴は砂（閉じた側に連結していても箱の中なら砂＝丸い角の外側は箱の外にある）
        # 丸い角の外側は閉じた2辺に接する角領域：箱の外にあるので自動的に透明
    elif nm in INNER:
        lab2, _ = ndimage.label(hole); k = lab2[INNER[nm]]; fill = hole & ~(lab2 == k) if k else hole
    else:
        fill = hole
    a[fill] = sand[fill]; tiles[nm] = Image.fromarray(a, 'RGBA')
for nm, im in tiles.items():
    x, y, w, h = j[nm]; atlas.paste(Image.new('RGBA', (w, h), (0, 0, 0, 0)), (x, y)); atlas.paste(im, (x, y)); j[nm] = [x, y, 16, 16]
atlas.save('assets/tiles.png'); json.dump(j, open('assets/tiles.json', 'w'))
pv = Image.new('RGBA', (18 * 7, 18 * 2), (150, 222, 104, 255))
for i, nm in enumerate(names): pv.alpha_composite(tiles[nm], ((i % 7) * 18, (i // 7) * 18))
pv.resize((pv.width * 6, pv.height * 6), Image.NEAREST).save('/tmp/claude-0/bunker_preview.png'); print('ok')
