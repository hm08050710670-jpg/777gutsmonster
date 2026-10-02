#!/usr/bin/env python3
"""技ゲージの絵（ChatGPT製 assets/src/skill_ui_src.png）から、アイコン・ピップ・メニューボタンをドット絵に落として assets/ui/ に出す
   アイボリー（カードの地）と マゼンタは透明にする。pixelize はブロック中央値（tools/town-fit.py と同じ考え方）
"""
import sys; sys.path.insert(0, 'tools')
from PIL import Image
import numpy as np
src = Image.open('assets/src/skill_ui_src.png').convert('RGB'); A = np.asarray(src).astype(int)

def keyed(x0, y0, x1, y1, key_ivory=True, key_dark=False):
    reg = A[y0:y1, x0:x1]
    mag = (reg[:, :, 0] > 200) & (reg[:, :, 1] < 90) & (reg[:, :, 2] > 200)
    alpha = ~mag
    if key_ivory: alpha &= ~(reg.min(2) > 185)
    out = np.dstack([reg, np.where(alpha, 255, 0)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

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

def trim(img):
    bb = img.getbbox(); return img.crop(bb) if bb else img

def save(name, img, th, tw=None):
    img = trim(img); w, h = img.size
    tw = tw or max(1, round(w * th / h))
    px = pixelize(img, tw, th); px.save(f'assets/ui/{name}.png'); print(name, px.size)

# アイコン（カード内側の左側）
save('leaf1', keyed(38, 292, 165, 445), 20)
save('leaf2', keyed(398, 292, 525, 445), 20)
save('leaf3', keyed(808, 292, 920, 445), 20)
save('shield', keyed(1230, 292, 1355, 430), 20)
save('heart', keyed(1590, 292, 1725, 425), 20)
# ピップ（灰色の四角）
save('pip', keyed(200, 364, 258, 410), 7)
# メニューボタン（マゼンタだけ抜く）
# メニューボタン（マゼンタだけ抜く）。文字は CSS で描くので、下半分の文字部分は地の色で塗りつぶす
m = keyed(1923, 255, 2150, 484, key_ivory=False); m = trim(m); px = pixelize(m, 36, 36)
arr = np.asarray(px).copy(); base = arr[12, 6].copy()
arr[20:31, 5:31] = base
Image.fromarray(arr, 'RGBA').save('assets/ui/menu.png'); print('menu', (36, 36))
