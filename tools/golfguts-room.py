#!/usr/bin/env python3
"""GOLF GUTS の内装一枚絵（ChatGPT製 assets/src/golfguts_room_src.png 1536×1024）を 480×320 ドット（30×20 マス）に落として assets/maps/golfguts_room.png にする"""
from PIL import Image
import numpy as np
im = Image.open('assets/src/golfguts_room_src.png').convert('RGB'); A = np.asarray(im).astype(int); H, W = A.shape[:2]
tw, th = 480, 320; bx, by = W / tw, H / th; r = max(1, int(min(bx, by) * 0.3))
out = np.zeros((th, tw, 3), dtype=np.uint8)
for j in range(th):
    cy = int((j + 0.5) * by)
    for i in range(tw):
        cx = int((i + 0.5) * bx)
        out[j, i] = np.median(A[max(0, cy - r):cy + r + 1, max(0, cx - r):cx + r + 1].reshape(-1, 3), axis=0)
Image.fromarray(out).save('assets/maps/golfguts_room.png'); print('ok', out.shape)
