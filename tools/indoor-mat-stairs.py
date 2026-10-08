#!/usr/bin/env python3
"""屋内の出入口タイルを描き直す：in_mat（赤いドアマット）と in_stairs（下り階段）を assets/tiles.png に入れる"""
import json
from PIL import Image, ImageDraw
import os; os.chdir('/home/claude/gb-rpg-skeleton')
# ---- 赤いドアマット（FRLG 風：濃い輪郭・明るい縁・赤い面）----
mat = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(mat)
d.rectangle((0, 1, 15, 14), fill=(122, 34, 34, 255))          # 輪郭（上下は1ドット内側）
d.rectangle((1, 2, 14, 13), fill=(250, 168, 150, 255))        # 明るい縁
d.rectangle((2, 3, 13, 12), fill=(226, 72, 60, 255))          # 赤い面
d.rectangle((3, 4, 12, 11), outline=(200, 52, 46, 255))       # 面の内側の線
for x in range(4, 12, 2): d.point((x, 7), (236, 96, 84, 255)); d.point((x + 1, 8), (236, 96, 84, 255))   # 織り目
# ---- 下り階段（添付の見本：左が明るく、右へ行くほど暗い段。右上は影）----
st = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(st)
d.rectangle((0, 0, 15, 15), fill=(16, 16, 16, 255))
cols = [(1, 3, 1, 190), (5, 7, 3, 158), (9, 11, 5, 124), (13, 14, 7, 112)]   # x0, x1, 段の上端 y, 明るさ
d.rectangle((1, 1, 14, 14), fill=(64, 64, 64, 255))                            # 奥の影
for x0, x1, y, g in cols: d.rectangle((x0, y, x1, 14), fill=(g, g, g, 255))
for x0, x1, y, g in cols[1:]: d.rectangle((x0, y - 1, x1, y - 1), fill=(16, 16, 16, 255))   # 段の黒い縁
tiles = {'in_mat': mat, 'in_stairs': st}
old = Image.open('assets/tiles.png').convert('RGBA'); meta = json.load(open('assets/tiles.json'))
all_t = {}; scales = {k: v[4] for k, v in meta.items() if len(v) > 4}
for k, v in meta.items(): x, y, w, h = v[:4]; all_t[k] = old.crop((x, y, x + w, y + h))
all_t.update(tiles)
items = sorted(all_t.items(), key=lambda kv: (-kv[1].height, -kv[1].width))
W = 384; x = y = rowh = 0; meta = {}
sheet = Image.new('RGBA', (W, 2048), (0, 0, 0, 0))
for k, tt in items:
    if x + tt.width > W: x = 0; y += rowh; rowh = 0
    sheet.paste(tt, (x, y)); meta[k] = [x, y, tt.width, tt.height] + ([scales[k]] if k in scales else []); x += tt.width; rowh = max(rowh, tt.height)
sheet = sheet.crop((0, 0, W, y + rowh)); sheet.save('assets/tiles.png'); json.dump(meta, open('assets/tiles.json', 'w'))
pv = Image.new('RGBA', (16 * 2 + 4, 16), (127, 211, 90, 255)); pv.alpha_composite(mat, (0, 0)); pv.alpha_composite(st, (20, 0))
pv.resize((pv.width * 8, pv.height * 8), Image.NEAREST).save('/tmp/claude-0/-home-claude/1369009a-e915-5878-af46-a39f51abb06a/scratchpad/mat_stairs.png'); print('ok')
