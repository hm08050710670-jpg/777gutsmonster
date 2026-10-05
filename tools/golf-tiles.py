#!/usr/bin/env python3
"""ゴルフ場のタイルを assets/tiles.png / tiles.json に追加する（既存の芝タイルをもとに自前で描く）
   fairway0/1（フェアウェイ：明るい芝、縦じま用に2色）、green0/1（グリーン：さらに明るく平ら）、bunker0/1（バンカー：砂）、
   flag（ピンフラッグ 16×24、グリーンの上に重ねる）、tee（ティーマーカー 16×16、重ねる）"""
import json, random
from PIL import Image, ImageDraw
j = json.load(open('assets/tiles.json')); im = Image.open('assets/tiles.png').convert('RGBA')
ROW = 192
if im.height < ROW + 32:
    big = Image.new('RGBA', (im.width, ROW + 32), (0, 0, 0, 0)); big.paste(im, (0, 0)); im = big
random.seed(7)
def grass_like(base, dot, dots=3):
    t = Image.new('RGBA', (16, 16), base + (255,)); d = ImageDraw.Draw(t)
    for _ in range(dots):
        x, y = random.randint(1, 13), random.randint(1, 13); d.point((x, y), dot + (255,)); d.point((x + 1, y - 1), dot + (255,))
    return t
tiles = {}
tiles['fairway0'] = grass_like((156, 224, 98), (182, 238, 126), 2)
tiles['fairway1'] = grass_like((138, 212, 86), (166, 230, 112), 2)
tiles['green0'] = grass_like((190, 238, 136), (208, 246, 160), 1)
tiles['green1'] = grass_like((184, 234, 130), (204, 244, 156), 1)
def sand():
    t = Image.new('RGBA', (16, 16), (236, 220, 160, 255)); d = ImageDraw.Draw(t)
    for _ in range(5):
        x, y = random.randint(0, 15), random.randint(0, 15); d.point((x, y), (222, 202, 136, 255))
    for _ in range(2):
        x, y = random.randint(0, 14), random.randint(0, 14); d.point((x, y), (250, 240, 200, 255))
    return t
tiles['bunker0'] = sand(); tiles['bunker1'] = sand()
# ピンフラッグ：16×24（足元のマスに重ねる。カップは下端中央）
f = Image.new('RGBA', (16, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
d.ellipse((5, 20, 10, 23), fill=(60, 80, 50, 255))                 # カップの影
d.rectangle((7, 2, 8, 22), fill=(230, 230, 230, 255)); d.rectangle((7, 2, 7, 22), fill=(250, 250, 250, 255))   # ポール
d.polygon([(9, 2), (15, 5), (9, 8)], fill=(220, 50, 50, 255)); d.polygon([(9, 3), (13, 5), (9, 7)], fill=(240, 80, 70, 255))   # 旗
d.point((7, 1), (40, 40, 40, 255)); d.point((8, 1), (40, 40, 40, 255))
tiles['flag'] = f
# ティーマーカー：16×16（フェアウェイに重ねる）。白いボールを2つ、小さな木の札
t = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
for cx in (4, 11):
    d.ellipse((cx - 2, 7, cx + 2, 11), fill=(245, 245, 245, 255)); d.point((cx - 1, 8), (255, 255, 255, 255)); d.point((cx + 1, 10), (200, 200, 200, 255))
    d.rectangle((cx - 2, 12, cx + 2, 12), fill=(60, 80, 50, 120))
tiles['tee'] = t
x = 0
for name, t in tiles.items():
    im.paste(t, (x, ROW)); j[name] = [x, ROW, t.width, t.height]; x += t.width + 2
im.save('assets/tiles.png'); json.dump(j, open('assets/tiles.json', 'w'))
print('added', list(tiles))
