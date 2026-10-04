#!/usr/bin/env python3
"""研究所の一枚絵（ChatGPT製 assets/src/lab_room_src.png、16:10）を 256×160 ドットに落として assets/maps/lab_room.png にする。
   右へ SHIFT ドットずらして、机の台座・出口マットをマス目の中央に合わせる（左端は壁の中身で埋める）"""
from PIL import Image
import numpy as np
SHIFT = 8
im = Image.open('assets/src/lab_room_src.png').convert('RGB'); A = np.asarray(im).astype(int); H, W = A.shape[:2]
tw, th = 256, 160; bx, by = W / tw, H / th; r = max(1, int(min(bx, by) * 0.3))
out = np.zeros((th, tw, 3), dtype=np.uint8)
for j in range(th):
    cy = int((j + 0.5) * by)
    for i in range(tw):
        cx = int((i + 0.5) * bx)
        out[j, i] = np.median(A[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 3), axis=0)
px = Image.fromarray(out)
sh = Image.new('RGB', (tw, th)); sh.paste(px.crop((SHIFT, 0, SHIFT * 2, th)), (0, 0)); sh.paste(px.crop((0, 0, tw - SHIFT, th)), (SHIFT, 0))
sh.save('assets/maps/lab_room.png'); print('ok')
