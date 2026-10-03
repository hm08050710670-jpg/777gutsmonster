#!/usr/bin/env python3
"""ガッツボールの演出用コマ（ChatGPT製シート assets/src/gutsball_sheet.png、マゼンタ背景）を
   ドット絵（ボール直径≈16ドット）に落として assets/ui/gutsball.png + gutsball.json にする
   コマ：closed / open1 / open2 / beam1 / beam2 / burst / closing  （下端中央で揃えて使う）
"""
import json
from PIL import Image
import numpy as np
src = Image.open('assets/src/gutsball_sheet.png').convert('RGB'); A = np.asarray(src).astype(int)
mag = (A[:, :, 0] > 150) & (A[:, :, 2] > 150) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 60)   # マゼンタ（縁のにじみも含めて広めに）
DOT = 4.1   # 元絵の1ドット（ボール直径 ≈ 65px ≈ 16ドット）
FRAMES = {  # name: (x, y, w, h) 元絵のpx
    'closed': (56, 346, 73, 68), 'open1': (209, 345, 74, 69), 'open2': (365, 322, 75, 91),
    'beam1': (519, 293, 80, 125), 'beam2': (677, 277, 80, 141), 'beam3': (1708, 283, 73, 137), 'burst': (2056, 544, 74, 101), 'closing': (160, 548, 73, 94),
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
    return Image.fromarray(out, 'RGBA')
cells = {}
for name, (x, y, w, h) in FRAMES.items():
    reg = A[y:y + h, x:x + w]; m = ~mag[y:y + h, x:x + w]
    px = pixelize(reg, m, max(1, round(w / DOT)), max(1, round(h / DOT)))
    # マゼンタのにじみ（ピンクがかった縁）を消す
    arr = np.asarray(px).copy().astype(int)
    pinkish = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 55) & (arr[:, :, 0] > 120) & (arr[:, :, 2] > 120)
    arr[pinkish] = 0
    # 輪郭の暗い紫がかり（黒線とマゼンタの混ざり）は黒線の色に寄せる
    purplish = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 18) & (arr[:, :, :3].max(2) < 150)
    arr[purplish, :3] = [26, 26, 32]
    px = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    bb = px.getbbox(); cells[name] = px.crop(bb)
W = sum(c.width + 2 for c in cells.values()); H = max(c.height for c in cells.values())
sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0)); meta = {}; x = 0
for name, c in cells.items():
    sheet.paste(c, (x, H - c.height)); meta[name] = [x, H - c.height, c.width, c.height]; x += c.width + 2
sheet.save('assets/ui/gutsball.png'); json.dump(meta, open('assets/ui/gutsball.json', 'w'))
print(meta)
