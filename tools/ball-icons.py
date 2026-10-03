#!/usr/bin/env python3
"""技メーター（assets/ui/meter_<attr>.png、36×36、上段＝空）の中央のアイコンを切り出して、
   パズルのボール用アイコン assets/ui/icon_<attr><tier>.png（1〜3）、icon_white.png（盾）、icon_pink.png（ハート）を作る
   リングの内側（暗い円）を透明にし、アイコンだけ残す
"""
import os
from PIL import Image
import numpy as np
D = 36
def icon(sheet, col):
    im = Image.open(sheet).convert('RGBA').crop((col * D, 0, col * D + D, D))
    a = np.asarray(im).astype(int)
    # 中心から半径 11 の円の中だけ残し、暗い画素（リング内側の地）は透明に
    yy, xx = np.mgrid[0:D, 0:D]; inside = (xx - D / 2 + 0.5) ** 2 + (yy - D / 2 + 0.5) ** 2 <= 10.8 ** 2
    bright = a[:, :, :3].max(2) > 70
    keep = inside & bright & (a[:, :, 3] > 0)
    # 小さなゴミ（リングのかけら）を消す：面積6px未満の成分
    from scipy import ndimage
    lab, n = ndimage.label(keep)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        keep &= ~np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz < 6])
    out = np.where(keep[:, :, None], a, 0).astype(np.uint8)
    o = Image.fromarray(out, 'RGBA'); bb = o.getbbox(); o = o.crop(bb)
    # 24×24 の箱の中央に置く
    c = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); c.paste(o, ((24 - o.width) // 2, (24 - o.height) // 2)); return c
for attr in ['g', 'f', 'w', 't', 'e']:
    sheet = f'assets/ui/meter_{attr}.png'
    if not os.path.exists(sheet): continue
    for i in range(3): icon(sheet, i).save(f'assets/ui/icon_{attr}{i + 1}.png')
icon('assets/ui/meter_g.png', 3).save('assets/ui/icon_white.png')
icon('assets/ui/meter_g.png', 4).save('assets/ui/icon_pink.png')
print('ok')
