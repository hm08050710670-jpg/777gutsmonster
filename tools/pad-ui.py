#!/usr/bin/env python3
"""操作UI（ChatGPT製 assets/src/pad_src.png、マゼンタ背景）から十字キー各ボタン（通常・押下）と A/B ボタン（通常・押下）を
   ドット絵に落として assets/ui/pad/ に出す。十字キーは1ボタン 24ドット、A 56ドット、B 40ドット"""
from PIL import Image
import numpy as np
src = Image.open('assets/src/pad_src.png').convert('RGB'); A = np.asarray(src).astype(int)
mag = (A[:, :, 0] > 150) & (A[:, :, 2] > 150) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 55)
def pixelize(x0, y0, w, h, tw, th):
    reg = A[y0:y0 + h, x0:x0 + w]; m = ~mag[y0:y0 + h, x0:x0 + w]
    bx, by = w / tw, h / th; r = max(1, int(min(bx, by) * 0.3))
    out = np.zeros((th, tw, 4), dtype=np.uint8)
    for j in range(th):
        cy = int((j + 0.5) * by)
        for i in range(tw):
            cx = int((i + 0.5) * bx)
            win = reg[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 3); mm = m[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1)
            if mm.mean() < 0.5: continue
            out[j, i] = (*np.median(win[mm], axis=0).astype(int), 255)
    arr = out.astype(int)
    pink = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 50) & (arr[:, :, 0] > 120)
    arr[pink] = 0
    purple = (arr[:, :, 3] > 0) & ((arr[:, :, 0] + arr[:, :, 2]) / 2 - arr[:, :, 1] > 18) & (arr[:, :, :3].max(2) < 150)
    arr[purple, :3] = [20, 40, 26]
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')
# 十字キー：5つ（通常, 上押下, 下押下, 左押下, 右押下）。腕は太さ 0.41w × 長さ 0.30w、中央は 0.41w 角
CROSS = [(44, 96, 283, 269), (359, 96, 274, 267), (649, 96, 270, 266), (940, 96, 267, 266), (1233, 96, 270, 266)]
def arm(ci, k):
    x, y, w, h = CROSS[ci]
    if k == 'up':     return pixelize(x + int(w * 0.30), y, int(w * 0.41), int(h * 0.30), 28, 20)
    if k == 'down':   return pixelize(x + int(w * 0.30), y + int(h * 0.70), int(w * 0.41), h - int(h * 0.70), 28, 20)
    if k == 'left':   return pixelize(x, y + int(h * 0.285), int(w * 0.30), int(h * 0.43), 20, 28)
    if k == 'right':  return pixelize(x + int(w * 0.70), y + int(h * 0.285), w - int(w * 0.70), int(h * 0.43), 20, 28)
    if k == 'center': return pixelize(x + int(w * 0.30), y + int(h * 0.30), int(w * 0.41), int(h * 0.40), 28, 28)
for k in ['up', 'down', 'left', 'right']: arm(0, k).save(f'assets/ui/pad/d_{k}_n.png')
for i, k in enumerate(['up', 'down', 'left', 'right']): arm(i + 1, k).save(f'assets/ui/pad/d_{k}_p.png')
arm(0, 'center').save('assets/ui/pad/d_center.png')
# A/B
pixelize(810, 495, 221, 224, 56, 56).save('assets/ui/pad/a_n.png'); pixelize(1206, 495, 220, 224, 56, 56).save('assets/ui/pad/a_p.png')
pixelize(132, 533, 153, 152, 40, 40).save('assets/ui/pad/b_n.png'); pixelize(459, 533, 152, 152, 40, 40).save('assets/ui/pad/b_p.png')
print('ok')
