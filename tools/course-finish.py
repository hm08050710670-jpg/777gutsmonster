#!/usr/bin/env python3
"""コースタイルの仕上げ（course-tiles.py のあとに実行）
   ・ラフ：色数を落としてドット感を出す（5色）
   ・フェアウェイ：45度の刈り跡を 1タイルで継ぎ目なく描き直す（周期16ドット）。ラフとの境目は ラフを波形マスクで重ねて合成
   ・バンカー／池：13枚を自前で描く（中央の質感は ChatGPT製、縁は丸い角＋1ドットの縁取り、外側は透明＝下のフェアウェイが見える）"""
import json, math, random
from PIL import Image, ImageDraw
import numpy as np
j = json.load(open('assets/tiles.json')); atlas = Image.open('assets/tiles.png').convert('RGBA')
N = 32
def get(name): x, y, w, h = j[name]; return atlas.crop((x, y, x + w, y + h))
def put(name, im):
    x, y, w, h = j[name]
    if (w, h) != im.size: im = im.resize((w, h), Image.NEAREST)
    atlas.paste(im, (x, y))
random.seed(5)

# ---- ラフ：5色に減色（ドット感） ----
def posterize(im, n):
    rgb = im.convert('RGB').quantize(n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    a = np.asarray(im)[:, :, 3]; out = np.asarray(rgb).copy(); out[:, :, 3] = a; return Image.fromarray(out, 'RGBA')
for k in ['rough0', 'rough1', 'rough2', 'rough3', 'rough_fg0', 'rough_fg1', 'rough_fg2', 'rough_fg3', 'rough_stepL', 'rough_stepR']:
    put(k, posterize(get(k), 5))

# ---- フェアウェイ：きれいな斜めじま ----
LIGHT, DARK = (150, 222, 104), (134, 208, 92)
def fairway():
    im = Image.new('RGBA', (N, N)); px = im.load()
    for y in range(N):
        for x in range(N):
            c = LIGHT if ((x + y) // 8) % 2 == 0 else DARK
            px[x, y] = c + (255,)
    # ごく薄い芝の点
    d = ImageDraw.Draw(im)
    for _ in range(10):
        x, y = random.randint(0, N - 2), random.randint(0, N - 2); base = px[x, y][:3]
        d.point((x, y), tuple(min(255, c + 12) for c in base) + (255,))
    return im
fw = fairway()
for k in ['fairway0', 'fairway1', 'fairway2', 'fairway3']: put(k, fw)

# ---- フェアウェイ↔ラフの境目：ラフを波形マスクで重ねる ----
def wave_mask(side, depth=11):
    m = Image.new('L', (N, N), 0); px = m.load()
    for i in range(N):
        d = depth + int(3 * math.sin(i * 0.9) + 2 * math.sin(i * 0.37 + 1))
        for t in range(N):
            if side == 'u' and t < d: px[i, t] = 255
            if side == 'd' and t >= N - d: px[i, t] = 255
            if side == 'l' and t < d: px[t, i] = 255
            if side == 'r' and t >= N - d: px[t, i] = 255
    return m
def corner_mask(a, b):
    ma, mb = wave_mask(a), wave_mask(b); out = Image.new('L', (N, N), 0)
    pa, pb, po = ma.load(), mb.load(), out.load()
    for y in range(N):
        for x in range(N):
            if pa[x, y] or pb[x, y]: po[x, y] = 255
    return out
rough = get('rough0').resize((N, N), Image.NEAREST)
for name, m in [('fr_u', wave_mask('u')), ('fr_d', wave_mask('d')), ('fr_l', wave_mask('l')), ('fr_r', wave_mask('r')),
                ('fr_ul', corner_mask('u', 'l')), ('fr_ur', corner_mask('u', 'r')), ('fr_dl', corner_mask('d', 'l')), ('fr_dr', corner_mask('d', 'r'))]:
    base = fw.copy(); base.paste(rough, (0, 0), m); put(name, base)

# ---- バンカー／池：13枚ブロブ ----
def blob_set(prefix, center_names, outline, rim):
    tex = [get(c) for c in center_names]
    R = 12   # 角の丸み
    def shape_mask(kind):
        """砂（水）の領域：kind = c / u d l r / ul ur dl dr（外角）/ iul iur idl idr（内角）"""
        m = Image.new('L', (N, N), 0); d = ImageDraw.Draw(m)
        if kind == 'c': d.rectangle([0, 0, N, N], fill=255)
        elif kind in ('u', 'd', 'l', 'r'):
            box = {'u': [0, 2, N, N], 'd': [0, 0, N, N - 3], 'l': [2, 0, N, N], 'r': [0, 0, N - 3, N]}[kind]; d.rectangle(box, fill=255)
        elif kind in ('ul', 'ur', 'dl', 'dr'):
            x0 = 2 if 'l' in kind else -N; y0 = 2 if 'u' in kind else -N
            d.rounded_rectangle([x0, y0, x0 + 2 * N - 3, y0 + 2 * N - 3], radius=R, fill=255)
        else:   # 内角：全面＋対角の外側だけ丸く欠ける
            d.rectangle([0, 0, N, N], fill=255); c = kind[1:]
            cx = -R + 1 if 'l' in c else N + R - 2; cy = -R + 1 if 'u' in c else N + R - 2
            d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=0)
        return m
    for kind in ['c', 'u', 'd', 'l', 'r', 'ul', 'ur', 'dl', 'dr', 'iul', 'iur', 'idl', 'idr']:
        m = shape_mask(kind); arr = np.asarray(m) > 0
        # 縁取り：領域の内側1ドット
        inner = arr.copy(); inner[1:, :] &= arr[:-1, :]; inner[:-1, :] &= arr[1:, :]; inner[:, 1:] &= arr[:, :-1]; inner[:, :-1] &= arr[:, 1:]
        edge = arr & ~inner
        inner2 = inner.copy(); inner2[1:, :] &= inner[:-1, :]; inner2[:-1, :] &= inner[1:, :]; inner2[:, 1:] &= inner[:, :-1]; inner2[:, :-1] &= inner[:, 1:]
        rimm = inner & ~inner2
        names = [f'{prefix}_c0', f'{prefix}_c1'] + ([f'{prefix}_c2'] if f'{prefix}_c2' in j else []) if kind == 'c' else [f'{prefix}_{kind}']
        for i, nm in enumerate(names):
            t = np.asarray(tex[i % len(tex)]).copy(); t[~arr] = 0
            t[edge] = outline + (255,); t[rimm & (arr)] = rim + (255,)
            if kind == 'c': t = np.asarray(tex[i % len(tex)]).copy()
            put(nm, Image.fromarray(t, 'RGBA'))
blob_set('bk', ['bk_c0', 'bk_c1'], (186, 160, 96), (248, 236, 196))
blob_set('pd', ['pd_c0', 'pd_c1', 'pd_c2'], (40, 90, 150), (150, 205, 240))
atlas.save('assets/tiles.png'); json.dump(j, open('assets/tiles.json', 'w'))
# プレビュー
names = ['rough0', 'rough1', 'fairway0', 'fr_u', 'fr_l', 'fr_ul', 'fr_dr', 'bk_c0', 'bk_u', 'bk_l', 'bk_ul', 'bk_iul', 'pd_c0', 'pd_u', 'pd_ul', 'pd_iul']
pv = Image.new('RGBA', (34 * 8, 34 * 2), (255, 0, 255, 255))
for i, n in enumerate(names): pv.paste(get(n), ((i % 8) * 34, (i // 8) * 34))
pv.resize((pv.width * 3, pv.height * 3), Image.NEAREST).save('/tmp/claude-0/finish_preview.png'); print('ok')
