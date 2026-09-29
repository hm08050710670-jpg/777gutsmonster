#!/usr/bin/env python3
"""街タイルセットの取り込み：マゼンタ区切りのシート → assets/tiles.png + assets/tiles.json（16px単位）
   使い方: python3 tools/town-tiles.py <src.png>
"""
import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage

src = Image.open(sys.argv[1]).convert('RGB')
a = np.asarray(src).astype(int)
mag = (a[:, :, 0] > 180) & (a[:, :, 1] < 110) & (a[:, :, 2] > 180)
lab, n = ndimage.label(~mag)
cells = []
for sl in ndimage.find_objects(lab):
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    if w < 40 or h < 40: continue
    cells.append((sl[0].start, sl[1].start, w, h))
cells.sort()
CW, CH = 95, 100   # 元画像の1マスの目安
# 置き物：四隅から地の緑を塗りつぶして透明にする（草の上に重ねて描くため）
def key_bg(crop):
    arr = np.asarray(crop.convert('RGBA')).copy()
    rgb = arr[:, :, :3].astype(int); h, w = rgb.shape[:2]
    seed = np.median(np.concatenate([rgb[:3, :].reshape(-1, 3), rgb[-3:, :].reshape(-1, 3), rgb[:, :3].reshape(-1, 3), rgb[:, -3:].reshape(-1, 3)]), axis=0)
    near = (np.abs(rgb - seed).sum(axis=2) < 70)
    lab_, _ = ndimage.label(near)
    edge = set(lab_[0, :]) | set(lab_[-1, :]) | set(lab_[:, 0]) | set(lab_[:, -1]); edge.discard(0)
    bg = np.isin(lab_, list(edge))
    arr[bg, 3] = 0
    return Image.fromarray(arr)
OBJ = {'tree', 'hedge', 'hedge_v', 'flower0', 'flower1', 'sign', 'mailbox', 'fence'}
def cut(i, tw=None, th=None, inner=0.0, obj=False):
    y, x, w, h = cells[i]
    tw = tw or max(1, round(w / CW)); th = th or max(1, round(h / CH))
    ix, iy = int(w * inner), int(h * inner)
    crop = src.crop((x + 2 + ix, y + 2 + iy, x + w - 2 - ix, y + h - 2 - iy))
    if obj: crop = key_bg(crop)
    t = crop.resize((tw * 16, th * 16), Image.LANCZOS).convert('RGBA')
    arr = np.asarray(t).copy()
    m = (arr[:, :, 0] > 150) & (arr[:, :, 1] < 130) & (arr[:, :, 2] > 150) & (arr[:, :, 0] - arr[:, :, 1] > 60)
    arr[m, 3] = 0
    return Image.fromarray(arr)
# 茶色（岸）の少ない水マスを中央用に選ぶ
def brown(i):
    y, x, w, h = cells[i]; c = a[y:y + h, x:x + w]
    return ((c[:, :, 0] > 90) & (c[:, :, 0] < 170) & (c[:, :, 1] < 110) & (c[:, :, 2] < 80)).mean()
water_i = min(range(13, 26), key=brown)
# 名前 → セル番号（見た目で確認済みの並び）。cells は上から左から
NAMED = {
    'grass0': 0, 'grass1': 1, 'grass2': 2,
    'tree': 26, 'hedge': 27, 'hedge_v': 28, 'flower0': 33, 'flower1': 34, 'tall': 35,
    'stone0': 36, 'stone1': 37, 'stone2': 38, 'stone3': 39, 'stone4': 40,
    'sign': 41, 'mailbox': 42, 'fence': 43, 'house': 44, 'shop': 45, 'lab': 46,
}
tiles = {k: cut(i, obj=k in OBJ) for k, i in NAMED.items()}
tiles['path'] = cut(4, 1, 1, inner=0.28)        # 道の中央（縁なし）
# 水の中央：茶色（岸）が最も少ない 40%×40% の窓を探して切り出す
def water_center():
    y, x, w, h = cells[water_i]; c = a[y:y + h, x:x + w]
    br = ((c[:, :, 0] > 90) & (c[:, :, 0] < 170) & (c[:, :, 1] < 110) & (c[:, :, 2] < 80)).astype(float)
    ww, wh = int(w * 0.4), int(h * 0.4); best = None
    for yy in range(0, h - wh, 4):
        for xx in range(0, w - ww, 4):
            v = br[yy:yy + wh, xx:xx + ww].mean()
            if best is None or v < best[0]: best = (v, xx, yy)
    _, xx, yy = best
    t = src.crop((x + xx, y + yy, x + xx + ww, y + yy + wh)).resize((20, 20), Image.LANCZOS).convert('RGBA')
    return t.crop((2, 2, 18, 18))   # 端の明るい縁を落として継ぎ目を目立たなくする
tiles['water'] = water_center()
# シートに並べる
items = sorted(tiles.items(), key=lambda kv: (-kv[1].height, -kv[1].width))
W = 256; x = y = rowh = 0; meta = {}
sheet = Image.new('RGBA', (W, 256), (0, 0, 0, 0))
for k, t in items:
    if x + t.width > W: x = 0; y += rowh; rowh = 0
    sheet.paste(t, (x, y)); meta[k] = [x, y, t.width, t.height]
    x += t.width; rowh = max(rowh, t.height)
sheet = sheet.crop((0, 0, W, y + rowh))
sheet.save('assets/tiles.png'); json.dump(meta, open('assets/tiles.json', 'w'))
print('tiles:', len(meta), 'sheet', sheet.size, 'water cell', water_i)
