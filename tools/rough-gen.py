#!/usr/bin/env python3
"""ラフを自前で生成（ChatGPT製 rough2 シートの配色・葉の形に合わせた、継ぎ目のない16ドットタイル）
   rough0-3（トーラス状に描いて上下左右シームレス）、rough_fg0-3（下8ドット：足元用）、rough_stepL/R（倒れた葉）、fr_u/d/l/r/角（透明つきの縁）
   course-finish.py / rough-tiles.py の後に実行"""
import json, random
from PIL import Image
import numpy as np
j = json.load(open('assets/tiles.json')); atlas = Image.open('assets/tiles.png').convert('RGBA')
N = 16
C = [(46, 107, 44), (58, 127, 54), (79, 168, 70), (108, 196, 90), (138, 220, 110)]   # 輪郭→根元→葉→葉→明るい葉
def blade(px, x0, y0, h, lean, wrapx=True, wrapy=True, clip=None):
    """根元 (x0,y0) から上へ h ドット。幅3→2→1 で先がとがる。左側に暗い輪郭、右上に明るいハイライト（シートの葉の描き方に合わせる）"""
    for i in range(h):
        y = y0 - i; x = x0 + round(lean * (i / max(1, h - 1)) ** 1.5)
        w = 3 if i < h * 0.35 else (2 if i < h * 0.75 else 1)
        for dx in range(w):
            if dx == 0 and w > 1: col = C[1]                      # 左の暗い縁
            elif dx == w - 1 and i > h * 0.3: col = C[4]           # 右上の明るい縁
            else: col = C[2] if i < h * 0.5 else C[3]
            xx, yy = x + dx, y
            if wrapx: xx %= N
            if wrapy: yy %= N
            if clip and not clip(xx, yy): continue
            if 0 <= xx < N and 0 <= yy < N: px[xx, yy] = col + (255,)
def outline(im):
    a = np.asarray(im).copy(); alpha = a[:, :, 3] > 0
    # 葉の根元側（下）に1ドットの暗い輪郭を入れて立体感
    for y in range(N):
        for x in range(N):
            if alpha[y, x] and tuple(a[y, x, :3]) == C[1]: pass
    return Image.fromarray(a, 'RGBA')
def gen(seed, fill=True, clip=None, wrapy=True, lean_all=0, base_rows=range(N), count=26):
    random.seed(seed); im = Image.new('RGBA', (N, N), C[0] + (255,) if fill else (0, 0, 0, 0)); px = im.load()
    if fill:
        for y in range(N):
            for x in range(N):
                px[x, y] = C[1] + (255,) if (x * 5 + y * 3) % 7 == 0 else C[0] + (255,)
    blades = [(random.randrange(N), random.choice(list(base_rows)), random.randint(7, 11), random.choice([-2, -1, 1, 2]) + lean_all) for _ in range(count)]
    blades.sort(key=lambda b: b[1])   # 上の根元から描き、下の葉が手前に重なる
    for x0, y0, h, lean in blades: blade(px, x0, y0, h, lean, wrapy=wrapy, clip=clip)
    return im
tiles = {}
for i in range(4): tiles[f'rough{i}'] = gen(10 + i, count=18)
# 前景：下8ドットに根元がある葉だけ、透明地。はみ出しは上へ（wrapyなし）
for i in range(4):
    im = gen(10 + i, fill=False, wrapy=False, base_rows=range(9, N), count=14)
    tiles[f'rough_fg{i}'] = im.crop((0, 8, N, N)).copy() if False else im
# 踏んだ瞬間：大きく倒れる
tiles['rough_stepL'] = gen(10, lean_all=-5, count=18); tiles['rough_stepR'] = gen(10, lean_all=5, count=18)
# 縁（透明地）：ラフ側の半分に根元を置き、葉先がフェアウェイ側に出る
tiles['fr_u'] = gen(31, fill=False, wrapy=False, base_rows=range(0, 9), count=16)
tiles['fr_d'] = gen(32, fill=False, wrapy=False, base_rows=range(9, N), count=16)
def side(seed, left):
    random.seed(seed); im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); px = im.load()
    rng = range(0, 7) if left else range(10, N)
    bl = [(random.choice(list(rng)), random.randrange(N), random.randint(6, 10), (1 if left else -1) * random.randint(0, 2)) for _ in range(16)]
    bl.sort(key=lambda b: b[1])
    for x0, y0, h, lean in bl: blade(px, x0, y0, h, lean, wrapx=False, wrapy=True)
    return im
tiles['fr_l'] = side(33, True); tiles['fr_r'] = side(34, False)
def union(a, b): o = tiles[a].copy(); o.alpha_composite(tiles[b]); return o
tiles['fr_ul'] = union('fr_u', 'fr_l'); tiles['fr_ur'] = union('fr_u', 'fr_r'); tiles['fr_dl'] = union('fr_d', 'fr_l'); tiles['fr_dr'] = union('fr_d', 'fr_r')
for nm, im in tiles.items():
    x, y, w, h = j[nm]
    atlas.paste(Image.new('RGBA', (w, h), (0, 0, 0, 0)), (x, y)); atlas.paste(im, (x, y)); j[nm] = [x, y, im.width, im.height]
atlas.save('assets/tiles.png'); json.dump(j, open('assets/tiles.json', 'w'))
# プレビュー：3×3 に並べて継ぎ目確認
pv = Image.new('RGBA', (N * 6, N * 3), (120, 200, 90, 255))
for yy in range(3):
    for xx in range(6):
        pv.alpha_composite(tiles[f'rough{(xx * 7 + yy * 13) % 4}'], (xx * N, yy * N))
pv2 = Image.new('RGBA', (N * 6, N * 2), (150, 222, 104, 255))
for i, nm in enumerate(['fr_u', 'fr_d', 'fr_l', 'fr_r', 'fr_ul', 'rough_fg0']): pv2.alpha_composite(tiles[nm], (i * N, 0))
for i, nm in enumerate(['rough_stepL', 'rough_stepR', 'rough0', 'rough1', 'rough2', 'rough3']): pv2.alpha_composite(tiles[nm], (i * N, N))
out = Image.new('RGBA', (N * 6, N * 5), (255, 0, 255, 255)); out.paste(pv, (0, 0)); out.paste(pv2, (0, N * 3))
out.resize((out.width * 8, out.height * 8), Image.NEAREST).save('/tmp/claude-0/roughgen.png'); print('ok')
