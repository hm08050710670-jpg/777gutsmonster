#!/usr/bin/env python3
"""技チャージメーター（ChatGPT製、マゼンタ背景、上段＝空／下段＝満タン）を 36×36 ドットに落として
   assets/ui/meter_<attr>.png（横 N 個 × 縦 2 段のシート）にする
   使い方: python3 tools/meter-ui.py g            … assets/src/meter_g.png → assets/ui/meter_g.png
   列の順は 小・中・強（・防御・回復）。防御・回復が無いシートは 3 列でよい
"""
import sys
from PIL import Image
import numpy as np
from scipy import ndimage
attr = sys.argv[1]; D = 36
src = Image.open(f'assets/src/meter_{attr}.png').convert('RGB'); A = np.asarray(src).astype(int)
mag = (A[:, :, 0] > 200) & (A[:, :, 1] < 90) & (A[:, :, 2] > 200)
lab, n = ndimage.label(~mag)
objs = [(sl[1].start, sl[0].start, sl[1].stop - sl[1].start, sl[0].stop - sl[0].start) for sl in ndimage.find_objects(lab)]
objs = [o for o in objs if o[2] > 100 and o[3] > 100]
rowh = max(o[3] for o in objs)
objs.sort(key=lambda o: (o[1] // rowh, o[0]))
cols = len(objs) // 2
assert len(objs) == cols * 2, objs

def pixelize(img, tw, th):
    arr = np.asarray(img).astype(int); h, w = arr.shape[:2]
    bx, by = w / tw, h / th; r = max(1, int(min(bx, by) * 0.3))
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

sheet = Image.new('RGBA', (D * cols, D * 2), (0, 0, 0, 0))
for k, (x, y, w, h) in enumerate(objs):
    # 正方形に揃えて切り出す（マゼンタ→透明）
    s = max(w, h); cx, cy = x + w // 2, y + h // 2
    x0, y0 = cx - s // 2, cy - s // 2
    reg = A[y0:y0 + s, x0:x0 + s]; m = mag[y0:y0 + s, x0:x0 + s]
    img = Image.fromarray(np.dstack([reg, np.where(m, 0, 255)]).astype(np.uint8), 'RGBA')
    px = pixelize(img, D, D)
    sheet.paste(px, ((k % cols) * D, (k // cols) * D))
sheet.save(f'assets/ui/meter_{attr}.png'); print(f'meter_{attr}.png', sheet.size, 'cols', cols)
