#!/usr/bin/env python3
"""ChatGPT製のコースタイル2枚（1タイルを 32×32 ドットで取り込み、描画時に 16px へ縮めて使う＝高解像度タイル）（assets/src/course_sheet_grass.png / course_sheet_water.png、マゼンタ背景）を
   16ドットに落として assets/tiles.png / tiles.json に追加する（行は y、列は x の順で自動検出。ラベル箱は暗いので除外）"""
import json
from PIL import Image
import numpy as np
from scipy import ndimage
j = json.load(open('assets/tiles.json')); atlas = Image.open('assets/tiles.png').convert('RGBA')

def comps(path):
    A = np.asarray(Image.open(path).convert('RGB')).astype(int)
    mag = (A[:, :, 0] > 180) & (A[:, :, 2] > 180) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 80)
    lab, n = ndimage.label(~mag); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if w < 40 or h < 30: continue
        m = (lab[sl] == i + 1); med = np.median(A[sl][m], axis=0)
        if med.sum() < 200: continue   # ラベル箱
        out.append((sl[0].start, sl[1].start, w, h))
    # 行にまとめる（y が近いもの）
    out.sort(); rows = []
    for c in out:
        if rows and abs(rows[-1][0][0] - c[0]) < 60: rows[-1].append(c)
        else: rows.append([c])
    return A, mag, [sorted(r, key=lambda c: c[1]) for r in rows]

def pixelize(A, mag, y, x, w, h, tw, th):
    reg = A[y:y + h, x:x + w]; m = ~mag[y:y + h, x:x + w]
    bx, by = w / tw, h / th; r = max(1, int(min(bx, by) * 0.3))
    out = np.zeros((th, tw, 4), dtype=np.uint8)
    for jj in range(th):
        cy = int((jj + 0.5) * by)
        for ii in range(tw):
            cx = int((ii + 0.5) * bx)
            win = reg[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 3); mm = m[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1)
            if mm.mean() < 0.5: continue
            out[jj, ii] = (*np.median(win[mm], axis=0).astype(int), 255)
    arr = out.astype(int)
    pink = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 50) & (arr[:, :, 0] > 120)
    arr[pink] = 0
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')

tiles = {}
# ---- 芝シート ----
A, mag, rows = comps('assets/src/course_sheet_grass.png')
names = [['rough0', 'rough1', 'rough2', 'rough3'], ['rough_fg0', 'rough_fg1', 'rough_fg2', 'rough_fg3'], ['rough_stepL', 'rough_stepR'],
         ['fairway0', 'fairway1', 'fairway2', 'fairway3'], ['green0', 'green1'], ['fr_u', 'fr_d', 'fr_l', 'fr_r', 'fr_ul', 'fr_ur', 'fr_dl', 'fr_dr']]
for row, nm in zip(rows, names):
    for (y, x, w, h), name in zip(row, nm):
        dot = w / 32; th = max(1, round(h / dot))
        if name.startswith('rough_fg'): th = 16
        if name.startswith('rough_step'): th = 32
        tiles[name] = pixelize(A, mag, y, x, w, h, 32, th)
# ---- 砂・水シート ----
A, mag, rows = comps('assets/src/course_sheet_water.png')
names = [['bk_c0', 'bk_c1', 'bk_u', 'bk_d', 'bk_l', 'bk_r'], ['bk_ul', 'bk_ur', 'bk_dl', 'bk_dr', 'bk_iul', 'bk_iur', 'bk_idl', 'bk_idr'],
         ['pd_c0', 'pd_c1', 'pd_c2', 'pd_u', 'pd_d', 'pd_l', 'pd_r'], ['pd_ul', 'pd_ur', 'pd_dl', 'pd_dr', 'pd_iul', 'pd_iur', 'pd_idl', 'pd_idr'],
         ['bridge_v', 'bridge_h', 'post1', 'post2', 'post_rope', 'post_pair', 'post_pair2', 'bush', 'lawn']]
for row, nm in zip(rows, names):
    for (y, x, w, h), name in zip(row, nm):
        tiles[name] = pixelize(A, mag, y, x, w, h, 32, 32)
# 内角（iul など）はシートの絵が外角と同じだったので、中央タイルに外角タイルの角 7×7 を貼って合成する
for kind, center in (('bk', 'bk_c0'), ('pd', 'pd_c0')):
    for corner in ('ul', 'ur', 'dl', 'dr'):
        base = tiles[center].copy(); src = tiles[f'{kind}_{corner}']
        x0 = 0 if corner[1] == 'l' else 9; y0 = 0 if corner[0] == 'u' else 9
        base.paste(src.crop((x0 * 2, y0 * 2, x0 * 2 + 14, y0 * 2 + 14)), (x0 * 2, y0 * 2)); tiles[f'{kind}_i{corner}'] = base
# ---- アトラスに追加（新しい行 y=224 から、横に詰める。2行使う） ----
ROW = 224; need = 34
if atlas.height < ROW + need * 6 or atlas.width < 512:
    big = Image.new('RGBA', (max(atlas.width, 512), ROW + need * 6), (0, 0, 0, 0)); big.paste(atlas, (0, 0)); atlas = big
x = 0; y = ROW; rowh = 0
for name, t in tiles.items():
    if x + t.width > atlas.width: x = 0; y += rowh + 2; rowh = 0
    atlas.paste(t, (x, y)); j[name] = [x, y, t.width, t.height]; x += t.width + 2; rowh = max(rowh, t.height)
atlas.save('assets/tiles.png'); json.dump(j, open('assets/tiles.json', 'w'))
print('added', len(tiles), 'tiles; atlas', atlas.size)
# プレビュー
pv = Image.new('RGBA', (34 * 12, 34 * 6), (255, 0, 255, 255)); i = 0
for name, t in tiles.items():
    pv.paste(t, ((i % 12) * 34, (i // 12) * 34)); i += 1
pv.resize((pv.width * 3, pv.height * 3), Image.NEAREST).save('/tmp/claude-0/course_tiles_preview.png')
