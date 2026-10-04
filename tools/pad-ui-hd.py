#!/usr/bin/env python3
"""高解像度の操作UI（ChatGPT製 assets/src/pad_hd_*.png、マゼンタ背景、約1254px角）から
   十字キー各腕（通常・押下）、中央（通常・各方向押下）、A/B（通常・押下）を assets/ui/pad/ に出す。
   ドット化はせず、CSS表示サイズの4倍で保存（Retina 3x でもくっきり）。
   押下は「上を押した絵」1枚から回転で4方向を作り、通常の絵と差分のある部分だけを貼り込む（中央にかかる腕の根元も暗くなる）"""
from PIL import Image
import numpy as np
SRC = 'assets/src/'; OUT = 'assets/ui/pad/'
OUTLINE = np.array([22, 56, 30])

def load(name):
    A = np.asarray(Image.open(SRC + name).convert('RGB')).astype(int)
    return A

def key(A):
    """マゼンタを透明に。輪郭に残るピンクのにじみは輪郭色に寄せる"""
    mag = (A[:, :, 0] > 150) & (A[:, :, 2] > 150) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 55)
    out = np.zeros(A.shape[:2] + (4,), dtype=np.uint8)
    out[:, :, :3] = np.clip(A, 0, 255); out[:, :, 3] = np.where(mag, 0, 255)
    pink = (~mag) & ((A[:, :, 0] + A[:, :, 2]) / 2 - A[:, :, 1] > 25) & (A[:, :, 0] > 90)
    out[pink, :3] = OUTLINE
    return out

def crop(rgba, x0, x1, y0, y1, size):
    im = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    return im.resize(size, Image.LANCZOS)

# ---- 十字キー ----
N = load('pad_hd_dpad_n.png'); P = load('pad_hd_dpad_up.png')
ARM_LEN = 332          # 上腕：y 66..398、幅 x 407..847
X0, X1, Y0, Y1 = 407, 847, 398, 848   # 中央のマス（左右腕の帯 × 上下腕の幅）
CX0, CX1 = 402, 852    # 中央は正方形で切る（450角）
ROT = {'up': 0, 'right': 270, 'down': 180, 'left': 90}   # PIL の rotate は反時計回り
ARM = (252, 190); CEN = (258, 258)

def rot(A, d): return np.asarray(Image.fromarray(A.astype(np.uint8)).rotate(ROT[d], resample=Image.NEAREST, fillcolor=(255, 0, 255))).astype(int)
def pressed_sheet(d):
    """上押下の絵を回転して方向 d の押下にする。腕そのものは回転した押下の絵をそのまま使い（矢印の形ずれを避ける）、
       中央用には、通常の絵との差分（押された腕の根元）だけを通常の絵に貼ったものを返す"""
    Nr, Pr = rot(N, d), rot(P, d)
    diff = np.abs(Pr - Nr).sum(2) > 60
    cen = N.copy(); cen[diff] = Pr[diff]
    return Pr, cen

def arm(rgba, d):
    if d == 'up':    return crop(rgba, X0, X1, Y0 - ARM_LEN, Y0, ARM)
    if d == 'down':  return crop(rgba, X0, X1, Y1, Y1 + ARM_LEN, ARM)
    if d == 'left':  return crop(rgba, X0 - ARM_LEN, X0, Y0, Y1, (ARM[1], ARM[0]))
    if d == 'right': return crop(rgba, X1, X1 + ARM_LEN, Y0, Y1, (ARM[1], ARM[0]))
def center(rgba): return crop(rgba, CX0, CX1, Y0, Y1, CEN)

Nk = key(N)
for d in ['up', 'down', 'left', 'right']:
    arm(Nk, d).save(f'{OUT}d_{d}_n.png')
    Pr, cen = pressed_sheet(d)
    arm(key(Pr), d).save(f'{OUT}d_{d}_p.png'); center(key(cen)).save(f'{OUT}d_center_{d}.png')
center(Nk).save(f'{OUT}d_center.png')

# ---- A/B：左が通常、右が押下。各ボールを正方形に切って縮小 ----
def balls(name, size):
    A = key(load(name)); A = np.pad(A, ((64, 64), (64, 64), (0, 0))); m = A[:, :, 3] > 0   # 端にかかっても切れないよう余白
    res = []
    for x0, x1 in [(0, 690), (692, 1382)]:
        sub = m[:, x0:x1]; ys, xs = np.where(sub)
        bx0, bx1, by0, by1 = xs.min() + x0, xs.max() + x0 + 1, ys.min(), ys.max() + 1
        s = max(bx1 - bx0, by1 - by0) + 8; cx, cy = (bx0 + bx1) // 2, (by0 + by1) // 2
        canvas = np.zeros((s, s, 4), dtype=np.uint8)
        sx0, sy0 = cx - s // 2, cy - s // 2
        canvas[:, :] = A[sy0:sy0 + s, sx0:sx0 + s]
        res.append(Image.fromarray(canvas, 'RGBA').resize((size, size), Image.LANCZOS))
    return res
a_n, a_p = balls('pad_hd_a.png', 416); a_n.save(OUT + 'a_n.png'); a_p.save(OUT + 'a_p.png')
b_n, b_p = balls('pad_hd_b.png', 288); b_n.save(OUT + 'b_n.png'); b_p.save(OUT + 'b_p.png')
print('ok')
