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
# ---- ドット絵の格子を復元して等倍で保存（assets/monsters_px.png）：拡大してもにじまない ----
def grid_period(arr, axis):
    """格子の周期：境界エネルギーの自己相関で最も強いピーク（7〜45px）を採り、±1pxを0.1刻みで詰める"""
    d = np.abs(np.diff(arr[:, :, :3], axis=axis)).sum(2).sum(1 - axis).astype(float); d -= d.mean()
    ac = np.correlate(d, d, 'full')[len(d) - 1:]
    peaks = [i for i in range(5, 45) if ac[i] > ac[i - 1] and ac[i] >= ac[i + 1]]
    base = max(peaks, key=lambda i: ac[i])
    dd = np.abs(np.diff(arr[:, :, :3], axis=axis)).sum(2).sum(1 - axis)
    def score(p):
        best = 0
        for off in np.arange(0, p, 0.5):
            idx = np.arange(off, len(dd), p).astype(int); idx = idx[idx < len(dd)]
            best = max(best, dd[idx].sum() / len(idx))
        return best
    return max(np.arange(base - 1.0, base + 1.01, 0.1), key=score)
def grid_offset(arr, axis, p):
    d = np.abs(np.diff(arr[:, :, :3], axis=axis)).sum(2).sum(1 - axis)
    best = None
    for off in np.arange(0, p, 0.5):
        idx = np.arange(off, len(d), p).astype(int); idx = idx[idx < len(d)]
        sc = d[idx].sum() / len(idx)
        if best is None or sc > best[0]: best = (sc, off)
    return best[1]
_whole = np.array(im).astype(float)
PX, PY = grid_period(_whole, 1), grid_period(_whole, 0)
print('grid', PX, PY)
def to_native(img):
    arr = np.array(img).astype(float); H, W = arr.shape[:2]
    px, py = PX, PY; ox = grid_offset(arr, 1, px); oy = grid_offset(arr, 0, py)
    cols = int((W - ox) // px); rows = int((H - oy) // py)
    out = np.zeros((rows, cols, 4), np.uint8)
    for j in range(rows):
        for i in range(cols):
            cx = int(ox + i * px + px / 2); cy = int(oy + j * py + py / 2)
            blk = arr[max(0, cy - 2):cy + 3, max(0, cx - 2):cx + 3].reshape(-1, 4)
            out[j, i] = np.median(blk, axis=0)
    out[out[:, :, 3] < 128] = 0; out[out[:, :, 3] >= 128, 3] = 255
    o = Image.fromarray(out, 'RGBA'); return o.crop(o.getbbox())
nf = to_native(im.crop((0, 0, split, H))); nb = to_native(im.crop((split, 0, W, H)))
CELL = 80
pmeta = {}; patlas = Image.new('RGBA', (CELL * 8, CELL), (0, 0, 0, 0))
if os.path.exists('assets/monsters_px.json'):
    pmeta = json.load(open('assets/monsters_px.json')); patlas = Image.open('assets/monsters_px.png').convert('RGBA')
if mid not in pmeta:
    n = len(pmeta)
    while (n + 1) * CELL * 2 > patlas.width * (patlas.height // CELL):
        nb2 = Image.new('RGBA', (patlas.width, patlas.height + CELL), (0, 0, 0, 0)); nb2.paste(patlas, (0, 0)); patlas = nb2
    per_row = patlas.width // CELL
    slot = lambda k: ((k % per_row) * CELL, (k // per_row) * CELL)
    fx, fy = slot(n * 2); bx2, by2 = slot(n * 2 + 1)
    pmeta[mid] = {'f': [fx, fy, 0, 0], 'b': [bx2, by2, 0, 0]}
for key, spr in (('f', nf), ('b', nb)):
    if max(spr.size) > CELL:
        s2 = CELL / max(spr.size); spr = spr.resize((max(1, round(spr.width * s2)), max(1, round(spr.height * s2))), Image.NEAREST)
    x0, y0 = pmeta[mid][key][:2]
    patlas.paste(Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)), (x0, y0)); patlas.paste(spr, (x0, y0), spr)
    pmeta[mid][key] = [x0, y0, spr.width, spr.height]
patlas.save('assets/monsters_px.png'); json.dump(pmeta, open('assets/monsters_px.json', 'w'))
print('native', mid, nf.size, nb.size)

pv = Image.new('RGBA', (192, 96), (120, 180, 120, 255))
for i, s in enumerate([front, back]):
    r = s.resize((96, 96), Image.NEAREST); pv.paste(r, (i * 96, 0), r)
pv.save(f'/tmp/claude-0/-home-claude/1369009a-e915-5878-af46-a39f51abb06a/scratchpad/{mid}_preview.png')
print(mid, 'ok', bmeta[mid])
