#!/usr/bin/env python3
"""高解像度の操作UI（ChatGPT製、マゼンタ背景）から十字キーと A/B の絵を assets/ui/pad/ に出す。ドット化はせず、CSS表示サイズの4倍で保存。
   assets/src/pad_hd_dpad_sheet.png：2×2 ＝ 左上：通常 / 右上：上押下 / 左下：左押下 / 右下：右押下（下押下は上押下を180度回転）
   assets/src/pad_hd_ab_sheet.png  ：2×2 ＝ 上段：A 通常・押下 / 下段：B 通常・押下
   十字キーは各絵の「左右腕の帯 × 上下腕の幅」を中央の正方形とみなし、その外側を腕として切る。
   押した方向の中央絵は、通常の中央にその方向の帯（腕の根元）だけを押下の絵から貼って作る"""
from PIL import Image
import numpy as np
SRC = 'assets/src/'; OUT = 'assets/ui/pad/'
OUTLINE = np.array([22, 56, 30])
ARM_LEN = 144      # 腕の長さ（元絵px、帯の縁から外へ）。通常の腕 ≈ 139px
CEN = 225          # 中央の正方形（元絵px）に揃える
S_ARM = (252, 165) # 出力：腕 63×41.2 CSS px の4倍
S_CEN = 258        # 出力：中央 64.4 CSS px の4倍

def mag(A): return (A[:, :, 0] > 150) & (A[:, :, 2] > 150) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 55)
def key(A):
    m = mag(A); out = np.zeros(A.shape[:2] + (4,), dtype=np.uint8)
    out[:, :, :3] = np.clip(A, 0, 255); out[:, :, 3] = np.where(m, 0, 255)
    pink = (~m) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 25) & (A[:, :, 0] > 90)
    out[pink, :3] = OUTLINE
    return out

def quadrant(A, q):
    H, W = A.shape[:2]; ys = slice(0, H // 2) if q[0] == 'T' else slice(H // 2, H); xs = slice(0, W // 2) if q[1] == 'L' else slice(W // 2, W)
    sub = A[ys, xs]; m = ~mag(sub); yy, xx = np.where(m)
    return pad_magenta(sub[yy.min():yy.max() + 1, xx.min():xx.max() + 1])

def pad_magenta(C):
    out = np.zeros((C.shape[0] + 2 * ARM_LEN, C.shape[1] + 2 * ARM_LEN, 3), dtype=int); out[:, :] = [255, 0, 255]
    out[ARM_LEN:ARM_LEN + C.shape[0], ARM_LEN:ARM_LEN + C.shape[1]] = C
    return out

def bands(C):
    m = ~mag(C); h, w = m.shape
    rows = np.where(m.sum(1) > 0.6 * w)[0]; cols = np.where(m.sum(0) > 0.6 * h)[0]
    return rows.min(), rows.max() + 1, cols.min(), cols.max() + 1   # y0, y1 (左右腕の帯), x0, x1 (上下腕の幅)

def rgba_resize(arr, size): return Image.fromarray(arr, 'RGBA').resize(size, Image.LANCZOS)

def cut_arm(C, d):
    y0, y1, x0, x1 = bands(C); K = key(C)
    if d == 'up':    r = K[y0 - ARM_LEN:y0, x0:x1]
    if d == 'down':  r = K[y1:y1 + ARM_LEN, x0:x1]
    if d == 'left':  r = K[y0:y1, x0 - ARM_LEN:x0]
    if d == 'right': r = K[y0:y1, x1:x1 + ARM_LEN]
    size = S_ARM if d in ('up', 'down') else (S_ARM[1], S_ARM[0])
    return rgba_resize(np.ascontiguousarray(r), size)

def cut_center(C):
    """帯の正方形を CEN 角に揃えて返す（RGB int）"""
    y0, y1, x0, x1 = bands(C)
    im = Image.fromarray(C[y0:y1, x0:x1].astype(np.uint8)).resize((CEN, CEN), Image.LANCZOS)
    return np.asarray(im).astype(int)

sheet = np.asarray(Image.open(SRC + 'pad_hd_dpad_sheet.png').convert('RGB')).astype(int)
N = quadrant(sheet, 'TL'); P = {'up': quadrant(sheet, 'TR'), 'left': quadrant(sheet, 'BL'), 'right': quadrant(sheet, 'BR')}
P['down'] = np.asarray(Image.fromarray(P['up'].astype(np.uint8)).rotate(180)).astype(int)

for d in ['up', 'down', 'left', 'right']:
    cut_arm(N, d).save(f'{OUT}d_{d}_n.png')
    cut_arm(P[d], d).save(f'{OUT}d_{d}_p.png')
cn = cut_center(N)
rgba_resize(key(cn), (S_CEN, S_CEN)).save(f'{OUT}d_center.png')
STRIP = int(CEN * 0.28)   # 腕の根元が中央の正方形に食い込む深さ（+余裕）
for d in ['up', 'down', 'left', 'right']:
    cp = cut_center(P[d]); c = cn.copy()
    if d == 'up':    c[:STRIP, :] = cp[:STRIP, :]
    if d == 'down':  c[-STRIP:, :] = cp[-STRIP:, :]
    if d == 'left':  c[:, :STRIP] = cp[:, :STRIP]
    if d == 'right': c[:, -STRIP:] = cp[:, -STRIP:]
    rgba_resize(key(c), (S_CEN, S_CEN)).save(f'{OUT}d_center_{d}.png')

# ---- A/B ----
ab = np.asarray(Image.open(SRC + 'pad_hd_ab_sheet.png').convert('RGB')).astype(int)
def ball(q, size):
    C = quadrant(ab, q); K = key(C); m = K[:, :, 3] > 0; yy, xx = np.where(m)
    bx0, bx1, by0, by1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    s = max(bx1 - bx0, by1 - by0) + 8; cx, cy = (bx0 + bx1) // 2, (by0 + by1) // 2
    canvas = K[cy - s // 2:cy - s // 2 + s, cx - s // 2:cx - s // 2 + s]
    return rgba_resize(np.ascontiguousarray(canvas), (size, size))
ball('TL', 416).save(OUT + 'a_n.png'); ball('TR', 416).save(OUT + 'a_p.png')
ball('BL', 288).save(OUT + 'b_n.png'); ball('BR', 288).save(OUT + 'b_p.png')
print('ok')
