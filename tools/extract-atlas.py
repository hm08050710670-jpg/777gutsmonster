"""素材シート → ゲーム用アトラス（assets/atlas.png + atlas.json）
   nominal: (w, h) はタイル単位（1タイル=32px）。アスペクトを保って箱に収め、下中央に寄せる。
"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
import numpy as np
from cut import keyout

U = int(os.environ.get('TILE_PX', '32'))   # 1タイルのpx（画面は2倍描画なので論理px = U/2）
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
SHEETS = os.path.join(OUT, 'sheets')
sheets = {n: keyout(f'{SHEETS}/{n}.png')[0] for n in ['terrain', 'props', 'objects', 'chars']}

def tight(img, box):
    """箱内の不透明ピクセルの外接矩形（黒ラベルは除外）"""
    c = img.crop(box); a = np.array(c)
    vis = a[..., 3] > 0
    rgb = a[..., :3].astype(int)
    label = (rgb.max(2) < 40) & vis
    # ラベルは大きな黒塊：黒が連続する行を落とす簡易処理
    rows = vis.any(1); cols = vis.any(0)
    ys = np.where(rows)[0]; xs = np.where(cols)[0]
    if len(ys) == 0: return c
    return c.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))

def fit(img, tw, th, align='bottom', mode='fit'):
    """tw×th の箱へ。mode='fill' は箱いっぱいに引き伸ばし（地形用）"""
    if mode == 'fill':
        out = img.resize((tw, th), Image.LANCZOS)
    else:
        s = min(tw / img.width, th / img.height)
        nw, nh = max(1, round(img.width * s)), max(1, round(img.height * s))
        r = img.resize((nw, nh), Image.LANCZOS)
        out = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
        ox = (tw - nw) // 2
        oy = (th - nh) if align == 'bottom' else (th - nh) // 2
        out.paste(r, (ox, oy))
    a = np.array(out); a[..., 3] = np.where(a[..., 3] >= 110, 255, 0)  # 縁をくっきり
    return Image.fromarray(a, 'RGBA')

items = {}  # name -> PIL image (nominal size)
def add(name, sheet, box, tw, th, mode='fit', align='bottom'):
    if mode == 'fit': img = tight(sheets[sheet], box)
    else:
        # 地形：素材の外枠線（濃い縁）を落とすため内側 5% を使う
        x0, y0, x1, y1 = box; mx = int((x1 - x0) * 0.05); my = int((y1 - y0) * 0.05)
        img = sheets[sheet].crop((x0 + mx, y0 + my, x1 - mx, y1 - my))
    items[name] = fit(img, int(tw * U), int(th * U), align, mode)

# ---------------- 地形（箱いっぱい） ----------------
T = 'terrain'
add('grass', T, (24, 76, 188, 243), 1, 1, 'fill')
add('grass2', T, (211, 76, 386, 244), 1, 1, 'fill')
add('flower_w', T, (400, 77, 571, 244), 1, 1, 'fill')
add('flower_y', T, (590, 77, 758, 245), 1, 1, 'fill')
add('tall', T, (790, 76, 960, 244), 1, 1, 'fill')
add('path', T, (975, 77, 1144, 245), 1, 1, 'fill')
for i, (x0, x1) in enumerate([(20, 176), (184, 320), (328, 472), (480, 632)]):
    add(f'water{i}', T, (x0 + 4, 300, x1 - 4, 440), 1, 1, 'fill')
shore = ['shore_n', 'shore_s', 'shore_w', 'shore_e', 'shore_nw', 'shore_ne', 'shore_sw', 'shore_se']
sx = [(22, 214), (238, 430), (467, 665), (678, 887), (904, 1100), (1115, 1312), (1336, 1534), (1552, 1750)]
for n, (x0, x1) in zip(shore, sx): add(n, T, (x0 + 3, 496, x1 - 3, 652), 1, 1, 'fill')
add('bridge', T, (34, 713, 198, 863), 1, 1, 'fill')

# ---------------- 小物（props） ----------------
P = 'props'
add('tree', P, (27, 91, 217, 331), 1, 1.5)
add('tree2', P, (222, 102, 394, 331), 1, 1.5)
add('tree3', P, (401, 102, 576, 333), 1, 1.5)
add('pine', P, (634, 84, 795, 335), 1, 1.5)
add('pine2', P, (825, 84, 982, 334), 1, 1.5)
add('pine3', P, (1013, 85, 1170, 333), 1, 1.5)
add('hedge', P, (1225, 198, 1379, 320), 1, 1)
add('hedge_w', P, (1410, 198, 1564, 322), 1, 1)
add('hedge_y', P, (1596, 198, 1750, 321), 1, 1)
add('fence', P, (36, 449, 247, 576), 1, 1)
add('fence_l', P, (288, 443, 419, 577), 1, 1)
add('fence_r', P, (448, 432, 545, 577), 1, 1)
add('fence_v', P, (622, 419, 679, 596), 1, 1)
add('lamp', P, (855, 419, 938, 671), 1, 1.5)
add('sign', P, (1088, 455, 1270, 633), 1, 1)
add('stone_sign', P, (1368, 463, 1730, 625), 2, 1)
add('planter_w', P, (34, 727, 195, 857), 1, 1)
add('planter_y', P, (227, 727, 386, 858), 1, 1)
add('planter_p', P, (420, 727, 582, 858), 1, 1)

# ---------------- 建物・オブジェクト（objects） ----------------
O = 'objects'
add('lab', O, (27, 65, 474, 359), 5, 3)
add('house', O, (480, 66, 800, 353), 3, 2)
add('heal', O, (800, 66, 1061, 353), 3, 2)
add('shop', O, (1062, 106, 1305, 355), 3, 2)
add('house2', O, (1315, 106, 1514, 355), 3, 2)
add('tree_pink', O, (579, 374, 712, 531), 2, 2)
add('tree_orange', O, (712, 374, 844, 531), 2, 2)
add('tree_small', O, (280, 400, 385, 534), 1, 1.5)
add('bush', O, (849, 422, 955, 524), 1, 1)
add('bush_flower', O, (967, 420, 1076, 531), 1, 1)
add('flowers_w', O, (1094, 400, 1153, 457), 1, 1)
add('flowers_y', O, (1160, 399, 1224, 458), 1, 1)
add('flowers_p', O, (1234, 400, 1295, 457), 1, 1)
add('tuft', O, (1318, 400, 1378, 458), 1, 1)
add('tuft2', O, (1102, 473, 1162, 532), 1, 1)
add('rock', O, (1264, 475, 1329, 531), 1, 1)
add('rock_big', O, (1390, 376, 1450, 458), 1, 1)
add('stump', O, (1343, 465, 1425, 530), 1, 1)
add('log', O, (1436, 469, 1508, 524), 1, 1)
add('board_monster', O, (25, 534, 153, 661), 2, 2)
add('signpost', O, (160, 536, 263, 660), 1, 2)
add('bench', O, (266, 566, 414, 658), 2, 1)
add('stone_wall', O, (1092, 555, 1245, 660), 2, 1)
add('bulletin', O, (1258, 539, 1398, 661), 2, 2)
add('vending', O, (1424, 562, 1508, 660), 1, 2)
add('pond', O, (25, 685, 186, 823), 3, 3)
add('bunker', O, (197, 693, 401, 826), 3, 2)
add('green', O, (411, 679, 615, 825), 3, 2)
add('bridge_v', O, (624, 685, 772, 825), 2, 2)
add('bridge_h', O, (784, 685, 927, 818), 2, 2)
add('waterfall', O, (946, 685, 1159, 826), 3, 2)
add('mapboard', O, (1188, 673, 1315, 826), 2, 2)
add('gate', O, (1318, 688, 1517, 816), 2, 2)
add('cart', O, (25, 840, 212, 990), 3, 2)
add('golfbag', O, (237, 841, 314, 988), 1, 2)
add('barrel', O, (331, 886, 420, 988), 1, 1)
add('crate', O, (433, 898, 522, 987), 1, 1)
add('golfball', O, (547, 895, 593, 970), 1, 1)
add('basket', O, (689, 890, 780, 987), 1, 1)
add('tee_r', O, (805, 909, 850, 976), 1, 1)
add('tee_b', O, (864, 909, 910, 986), 1, 1)
add('flag', O, (932, 835, 1011, 996), 1, 2)
add('planter_round', O, (1018, 874, 1127, 990), 1, 1)
add('planter_long', O, (1153, 889, 1302, 995), 2, 1)
add('statue', O, (1374, 829, 1499, 995), 2, 2)

# ---------------- キャラクター（chars） ----------------
C = 'chars'
blocks = { 'hm': (75, 116), 'hf': (455, 116), 'prof': (833, 116), 'rival': (1220, 116),
           'woman': (75, 631), 'man': (455, 631), 'nurse': (833, 631) }
COLP = 77; ROWP = 129
DIRS = ['down', 'up', 'left', 'right']
for name, (bx, by) in blocks.items():
    for di, d in enumerate(DIRS):
        for f in range(3):
            x0 = bx + di * COLP - 6; y0 = by + f * ROWP - 2
            add(f'{name}_{d}{f}', C, (x0, y0, x0 + 80, y0 + 126), 1, 1.5)

# ---------------- アトラス化 ----------------
names = sorted(items, key=lambda n: (-items[n].height, -items[n].width, n))
W = 1024
x = y = rowh = 0; meta = {}
for n in names:
    im = items[n]
    if x + im.width > W: x = 0; y += rowh; rowh = 0
    meta[n] = [x, y, im.width, im.height]
    x += im.width; rowh = max(rowh, im.height)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for n, (ax, ay, aw, ah) in meta.items(): atlas.paste(items[n], (ax, ay))
atlas.save(f'{OUT}/atlas.png', optimize=True)
json.dump(meta, open(f'{OUT}/atlas.json', 'w'), separators=(',', ':'))
print('atlas', atlas.size, len(meta), 'items')

# 確認用コンタクトシート（4倍）
cs = atlas.copy(); cs = cs.resize((cs.width * 2, cs.height * 2), Image.NEAREST)
bg = Image.new('RGB', cs.size, (90, 150, 90)); bg.paste(cs, (0, 0), cs); bg.save(os.path.join(SHEETS, 'contact.png'))
