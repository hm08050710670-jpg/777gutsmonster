#!/usr/bin/env python3
"""粗いドットのラフ（assets/src/course_sheet_rough2.png、ChatGPT製、マゼンタ背景）を 16ドットで取り込み、
   rough0-3 / rough_fg0-3 / rough_stepL,R / fr_u,d,l,r（透明の縁）を置き換える。course-finish.py の後に実行"""
import json
from PIL import Image
import numpy as np
from scipy import ndimage
j = json.load(open('assets/tiles.json')); atlas = Image.open('assets/tiles.png').convert('RGBA')
A = np.asarray(Image.open('assets/src/course_sheet_rough2.png').convert('RGB')).astype(int)
mag = (A[:, :, 0] > 180) & (A[:, :, 2] > 180) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 80)
lab, n = ndimage.label(~mag); comps = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    if w < 40 or h < 30: continue
    m = (lab[sl] == i + 1)
    if np.median(A[sl][m], axis=0).sum() < 200: continue
    comps.append((sl[0].start, sl[1].start, w, h))
comps.sort(); rows = []
for c in comps:
    if rows and abs(rows[-1][0][0] - c[0]) < 90: rows[-1].append(c)
    else: rows.append([c])
rows = [sorted(r, key=lambda c: c[1]) for r in rows]
print([len(r) for r in rows])
# 1タイル=16ドット、1ドット≈12px（96/8? 元絵は 192px 角）
def cut(y, x, w, h, tw, th, anchor):
    reg = A[y:y + h, x:x + w]; m = ~mag[y:y + h, x:x + w]
    # 元の正方形タイルの大きさは行の最大幅から（192px 前後）
    out = np.zeros((th, tw, 4), dtype=np.uint8)
    bx = by = w / tw if anchor == 'full' else DOT
    for jj in range(th):
        for ii in range(tw):
            # anchor: 'full' 全体, 'bottom' 下揃え, 'top' 上揃え, 'left','right'
            if anchor == 'full': cy = int((jj + 0.5) * by); cx = int((ii + 0.5) * bx)
            elif anchor == 'bottom': cy = int(h - (th - jj - 0.5) * by); cx = int((ii + 0.5) * bx)
            elif anchor == 'top': cy = int((jj + 0.5) * by); cx = int((ii + 0.5) * bx)
            elif anchor == 'left': cy = int((jj + 0.5) * by); cx = int((ii + 0.5) * bx)
            else: cy = int((jj + 0.5) * by); cx = int(w - (tw - ii - 0.5) * bx)
            if cy < 0 or cy >= h or cx < 0 or cx >= w: continue
            r = max(1, int(bx * 0.3))
            win = reg[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 3); mm = m[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1)
            if mm.mean() < 0.5: continue
            out[jj, ii] = (*np.median(win[mm], axis=0).astype(int), 255)
    arr = out.astype(int); pink = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 50) & (arr[:, :, 0] > 120); arr[pink] = 0
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')
DOT = max(c[2] for c in rows[0]) / 16
tiles = {}
for (y, x, w, h), nm in zip(rows[0], ['rough0', 'rough1', 'rough2', 'rough3']): tiles[nm] = cut(y, x, w, h, 16, 16, 'full')
for (y, x, w, h), nm in zip(rows[1], ['rough_fg0', 'rough_fg1', 'rough_fg2', 'rough_fg3']): tiles[nm] = cut(y, x, w, h, 16, 8, 'bottom')
for (y, x, w, h), nm in zip(rows[2], ['rough_stepL', 'rough_stepR']): tiles[nm] = cut(y, x, w, h, 16, 16, 'bottom')
# 縁：上=タイル上側にラフ（下が透明）、下=下側、左、右。それぞれ 16×16 の中にラフ部分だけ
ed = rows[3]
tiles['fr_u'] = cut(*ed[0], 16, 16, 'top'); tiles['fr_d'] = cut(*ed[1], 16, 16, 'bottom'); tiles['fr_l'] = cut(*ed[2], 16, 16, 'left'); tiles['fr_r'] = cut(*ed[3], 16, 16, 'right')
# 外角＝上と左（など）の重ね合わせ
def union(a, b):
    out = tiles[a].copy(); out.alpha_composite(tiles[b]); return out
tiles['fr_ul'] = union('fr_u', 'fr_l'); tiles['fr_ur'] = union('fr_u', 'fr_r'); tiles['fr_dl'] = union('fr_d', 'fr_l'); tiles['fr_dr'] = union('fr_d', 'fr_r')
# アトラスの既存枠（32角）に書く：枠を透明で埋めてから左上に置き、json のサイズを更新
for nm, im in tiles.items():
    x, y, w, h = j[nm]
    atlas.paste(Image.new('RGBA', (w, h), (0, 0, 0, 0)), (x, y)); atlas.paste(im, (x, y)); j[nm] = [x, y, im.width, im.height]
atlas.save('assets/tiles.png'); json.dump(j, open('assets/tiles.json', 'w'))
pv = Image.new('RGBA', (18 * 9, 18 * 2), (255, 0, 255, 255))
for i, nm in enumerate(['rough0', 'rough1', 'rough_fg0', 'rough_stepL', 'fr_u', 'fr_d', 'fr_l', 'fr_r', 'fr_ul']): pv.paste(tiles[nm], ((i % 9) * 18, 0))
pv.resize((pv.width * 6, pv.height * 6), Image.NEAREST).save('/tmp/claude-0/rough2_preview.png'); print('ok')
