"""背景が黒・暗いグラデーション・ぼかしのシートから、パーツを切り出す"""
import sys, json
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

def keyout_dark(path, thr=9, outline_lum=0):
    """暗い背景（黒〜暗いグロー）：外周からつながる暗い領域を背景にし、
       スプライトに隣接する暗い画素は輪郭として復元する"""
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    lum = a.max(2)
    dark = lum < thr
    lab, n = ndimage.label(dark)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))); border.discard(0)
    bg = np.isin(lab, list(border))
    fg = ~bg
    # 輪郭の復元：前景を2px広げた範囲で、暗い画素は輪郭色にする
    grown = ndimage.binary_dilation(fg, iterations=1)
    edge = grown & ~fg & (lum < outline_lum)
    out = a.copy()
    out[edge] = [31, 42, 30]
    alpha = np.where(fg | edge, 255, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([out.astype(np.uint8), alpha]), 'RGBA'), (fg | edge)

def keyout_blur(path, win=7, thr=18, close=4):
    """ぼかし背景：局所分散が大きい（ドット模様がある）領域を前景にする"""
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    g = a.mean(2)
    m = ndimage.uniform_filter(g, win); m2 = ndimage.uniform_filter(g * g, win)
    sd = np.sqrt(np.maximum(m2 - m * m, 0))
    fg = sd > thr
    fg = ndimage.binary_closing(fg, iterations=close)
    fg = ndimage.binary_fill_holes(fg)
    fg = ndimage.binary_opening(fg, iterations=3)
    alpha = np.where(fg, 255, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA'), fg

def components(mask, dilate=3, min_area=200):
    m = ndimage.binary_dilation(mask, iterations=dilate)
    lab, n = ndimage.label(m)
    boxes = []
    for sl in ndimage.find_objects(lab):
        if mask[sl].sum() < min_area: continue
        boxes.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    return boxes

if __name__ == '__main__':
    name, kind = sys.argv[1], sys.argv[2]
    img, mask = keyout_dark(f'sheets/{name}.png') if kind == 'dark' else keyout_blur(f'sheets/{name}.png', close=int(sys.argv[3]) if len(sys.argv) > 3 else 4)
    img.save(f'sheets/{name}_rgba.png')
    boxes = components(mask)
    boxes.sort(key=lambda b: (round(b[1] / 80), b[0]))
    ov = img.convert('RGB').copy(); d = ImageDraw.Draw(ov)
    for i, b in enumerate(boxes): d.rectangle(b, outline=(255, 0, 0), width=2); d.text((b[0] + 2, b[1] + 2), str(i), fill=(255, 0, 0))
    ov.save(f'sheets/{name}_boxes.png'); json.dump(boxes, open(f'sheets/{name}_boxes.json', 'w'))
    print(name, len(boxes))
    for i, b in enumerate(boxes): print(i, b, b[2] - b[0], b[3] - b[1])
