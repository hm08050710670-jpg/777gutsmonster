#!/usr/bin/env python3
"""ガッツボール（基準仕様版）の演出コマを ChatGPT製シート assets/src/gutsball_sheet2.png（マゼンタ背景、1536×1024）から
   ドット絵（閉じたボール直径 ≈ 11ドット）に落として assets/ui/gutsball.png + gutsball.json にする。
   meta は [x, y, w, h, ax, ay]（ax, ay：コマ内でのボールの接地位置＝ボール下端中央。省略時は下端中央）
   コマ：closed / open1 / open2 / beam1 / beam2 / beam3 / closing / burst / hit / success"""
import json, os
from PIL import Image
import numpy as np
src = Image.open('assets/src/gutsball_sheet2.png').convert('RGB'); A = np.asarray(src).astype(int)
mag = (A[:, :, 0] > 150) & (A[:, :, 2] > 150) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 60)
DOT = float(os.environ.get('DOT', '5.9'))   # 元絵の1ドット。ボール直径 ≈ 65px → 11ドット
R = 65 / 2
# name: (x, y, w, h, [ball center x, y  in src]) — 中心を指定したコマは、その真下をボールの接地位置にする
FRAMES = {
    'closed':  (548, 524, 67, 64),
    'open1':   (918, 296, 67, 78),
    'open2':   (1069, 277, 69, 102),
    'beam1':   (1219, 256, 72, 126),
    'beam2':   (1374, 286, 69, 93),
    'beam3':   (169, 507, 66, 98),
    'closing': (294, 515, 67, 73),
    'burst':   (1428, 724, 69, 96),
    'hit':     (186, 294, 114, 88, 186 + 57, 294 + 44),
    'success': (853, 733, 138, 113, 891 + 32, 759 + 32),
}
def pixelize(reg, m, tw, th):
    h, w = reg.shape[:2]; bx, by = w / tw, h / th; r = max(1, int(min(bx, by) * 0.3))
    out = np.zeros((th, tw, 4), dtype=np.uint8)
    for j in range(th):
        cy = int((j + 0.5) * by)
        for i in range(tw):
            cx = int((i + 0.5) * bx)
            win = reg[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 3); mm = m[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1)
            if mm.mean() < 0.5: continue
            out[j, i] = (*np.median(win[mm], axis=0).astype(int), 255)
    return out
cells = {}
for name, f in FRAMES.items():
    x, y, w, h = f[:4]
    reg = A[y:y + h, x:x + w]; m = ~mag[y:y + h, x:x + w]
    tw, th = max(1, round(w / DOT)), max(1, round(h / DOT))
    arr = pixelize(reg, m, tw, th).astype(int)
    pinkish = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 55) & (arr[:, :, 0] > 120) & (arr[:, :, 2] > 120)
    arr[pinkish] = 0
    purplish = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 18) & (arr[:, :, :3].max(2) < 150)
    arr[purplish, :3] = [26, 26, 32]
    px = Image.fromarray(arr.astype(np.uint8), 'RGBA'); bb = px.getbbox(); px = px.crop(bb)
    if len(f) == 6:   # 接地位置 = 指定した中心の真下 R
        ax = (f[4] - x) / DOT - bb[0]; ay = (f[5] - y + R) / DOT - bb[1]
    else:
        ax, ay = px.width / 2, px.height
    cells[name] = (px, round(ax, 1), round(ay, 1))
W = sum(c[0].width + 2 for c in cells.values()); H = max(c[0].height for c in cells.values())
sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0)); meta = {}; x = 0
for name, (c, ax, ay) in cells.items():
    sheet.paste(c, (x, H - c.height)); meta[name] = [x, H - c.height, c.width, c.height, ax, ay]; x += c.width + 2
sheet.save('assets/ui/gutsball.png'); json.dump(meta, open('assets/ui/gutsball.json', 'w'))
print(meta)
