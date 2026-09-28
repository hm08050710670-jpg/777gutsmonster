"""正面＋後ろ姿が横並びの画像（チェッカー背景でも可）から 48x48 を作り、
assets/monsters.png（正面）と assets/monsters_back.png（後ろ姿）に書き込む。
  python3 tools/pair-sprite.py <id> <image.png>
"""
import sys, json, os
import numpy as np
from PIL import Image
from collections import deque

mid, path = sys.argv[1], sys.argv[2]
im = Image.open(path).convert('RGBA'); a = np.array(im); H, W = a.shape[:2]
if a[:, :, 3].min() == 255:
    # チェッカー背景：明るくて彩度の低い画素を、外側からの塗りつぶしで背景にする
    rgb = a[:, :, :3].astype(int)
    light = (rgb.min(axis=2) > 185) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 22)
    bg = np.zeros((H, W), bool); dq = deque()
    for y in range(H):
        for x in (0, W - 1):
            if light[y, x] and not bg[y, x]: bg[y, x] = True; dq.append((y, x))
    for x in range(W):
        for y in (0, H - 1):
            if light[y, x] and not bg[y, x]: bg[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= ny < H and 0 <= nx < W and light[ny, nx] and not bg[ny, nx]: bg[ny, nx] = True; dq.append((ny, nx))
    a[bg, 3] = 0
a[a[:, :, 3] < 128] = 0
# 左右に分ける（最も広い空白列で）
cols = (a[:, :, 3] > 0).sum(0); xs = [x for x in range(W) if cols[x] > 0]
best = (0, None); prev = None
for x in xs:
    if prev is not None and x - prev > best[0]: best = (x - prev, (prev + x) // 2)
    prev = x
split = best[1]
im = Image.fromarray(a)
def fit(part):
    part = part.crop(part.getbbox()); s = 48 / max(part.size)
    nw, nh = max(1, round(part.width * s)), max(1, round(part.height * s))
    r = part.resize((nw, nh), Image.LANCZOS)
    out = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); out.paste(r, ((48 - nw) // 2, 48 - nh)); return out
front = fit(im.crop((0, 0, split, H))); back = fit(im.crop((split, 0, W, H)))
meta = json.load(open('assets/monsters.json')); atlas = Image.open('assets/monsters.png').convert('RGBA')
x, y, w, h = meta[mid]; atlas.paste(Image.new('RGBA', (w, h), (0, 0, 0, 0)), (x, y)); atlas.paste(front, (x, y), front); atlas.save('assets/monsters.png')
bmeta = {}; batlas = Image.new('RGBA', (48 * 8, 48), (0, 0, 0, 0))
if os.path.exists('assets/monsters_back.json'):
    bmeta = json.load(open('assets/monsters_back.json')); batlas = Image.open('assets/monsters_back.png').convert('RGBA')
if mid not in bmeta:
    n = len(bmeta)
    if (n + 1) * 48 > batlas.width:
        nb = Image.new('RGBA', (batlas.width + 48 * 8, 48), (0, 0, 0, 0)); nb.paste(batlas, (0, 0)); batlas = nb
    bmeta[mid] = [n * 48, 0, 48, 48]
bx = bmeta[mid][0]; batlas.paste(Image.new('RGBA', (48, 48), (0, 0, 0, 0)), (bx, 0)); batlas.paste(back, (bx, 0), back)
batlas.save('assets/monsters_back.png'); json.dump(bmeta, open('assets/monsters_back.json', 'w'))
pv = Image.new('RGBA', (192, 96), (120, 180, 120, 255))
for i, s in enumerate([front, back]):
    r = s.resize((96, 96), Image.NEAREST); pv.paste(r, (i * 96, 0), r)
pv.save(f'/tmp/claude-0/-home-claude/1369009a-e915-5878-af46-a39f51abb06a/scratchpad/{mid}_preview.png')
print(mid, 'ok', bmeta[mid])
