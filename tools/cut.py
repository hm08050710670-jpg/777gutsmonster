"""シートの市松背景を透明化し、パーツを検出して一覧画像を出す（人が対応表を作るための下ごしらえ）"""
import sys, json
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

def keyout(path):
    im = Image.open(path).convert('RGB'); a = np.array(im).astype(int)
    mx = a.max(2); mn = a.min(2)
    checker = (mx - mn < 14) & (mn > 195)          # 明るい低彩度 = 市松の候補
    # 画像の外周から市松だけを辿る（輪郭で囲われた内部の白は残る）
    lab, n = ndimage.label(checker)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    border.discard(0)
    bg = np.isin(lab, list(border))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    rgba = np.dstack([a.astype(np.uint8), alpha])
    return Image.fromarray(rgba, 'RGBA'), ~bg

def components(mask, dilate=3, min_area=60):
    m = ndimage.binary_dilation(mask, iterations=dilate)
    lab, n = ndimage.label(m)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        sub = mask[sl]
        if sub.sum() < min_area: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        boxes.append((x0, y0, x1, y1))
    return boxes

def is_label(img, box):
    """黒地に白文字のラベル（黒率が高い）"""
    x0, y0, x1, y1 = box
    a = np.array(img.crop(box).convert('RGBA'))
    vis = a[..., 3] > 0
    if vis.sum() == 0: return True
    rgb = a[..., :3][vis]
    dark = (rgb.max(1) < 60).mean()
    return dark > 0.45

if __name__ == '__main__':
    name = sys.argv[1]
    img, mask = keyout(f'sheets/{name}.png')
    img.save(f'sheets/{name}_rgba.png')
    boxes = [b for b in components(mask) if not is_label(img, b)]
    boxes.sort(key=lambda b: (round(b[1] / 60), b[0]))
    ov = img.convert('RGB').copy(); d = ImageDraw.Draw(ov)
    for i, b in enumerate(boxes):
        d.rectangle(b, outline=(255, 0, 0), width=2); d.text((b[0] + 2, b[1] + 2), str(i), fill=(255, 0, 0))
    ov.save(f'sheets/{name}_boxes.png')
    json.dump(boxes, open(f'sheets/{name}_boxes.json', 'w'))
    print(name, len(boxes), 'parts')
    for i, b in enumerate(boxes): print(i, b, b[2] - b[0], b[3] - b[1])
