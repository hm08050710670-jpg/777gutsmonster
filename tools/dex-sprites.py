"""図鑑からモンスターを切り出して、ゲーム用スプライトシート（PNG+JSON）を作る
   BOXES: id -> (x0,y0,x1,y1) 図鑑画像のpx。手作業で確認した値。
"""
import json, os, sys
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage

import os as _os; SRC = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), 'assets/dex/dex.png')
OUT_DIR = os.environ.get('OUT_DIR', '/home/claude/gb-rpg-skeleton/assets')
SIZE = 48      # 戦闘用の1辺（論理24pxの2倍描画）

BOXES = {
  # ---- 御三家と進化 ----
  'kokegame':   (20, 130, 122, 200),   'morigame':   (150, 118, 262, 200),   'nushigame':  (298, 104, 410, 202),
  'hinoshishi': (470, 120, 560, 202),  'shishiburn': (600, 116, 700, 202),   'shishivolke':(735, 116, 845, 202),
  'amepiyo':    (906, 130, 1000, 205), 'amegamo':    (1042, 118, 1140, 205), 'doshagamo':  (1180, 110, 1290, 205),
  # ---- 図鑑の残り ----
  'kokemogu': (45, 304, 102, 355),
  'rafumoggu': (144, 301, 206, 355),
  'mogujuou': (242, 301, 321, 355),
  'shibatta': (33, 376, 87, 414),
  'rafubatta': (139, 376, 211, 414),
  'shigebatta': (237, 376, 309, 414),
  'yotsubausa': (100, 430, 144, 484),
  'clovernny': (206, 430, 255, 484),
  'happachi': (41, 491, 98, 550),
  'hachibana': (144, 491, 203, 550),
  'hanabachion': (244, 491, 321, 550),
  'matsurisu': (44, 563, 93, 622),
  'matsuborisu': (129, 563, 201, 622),
  'matsuboking': (244, 561, 324, 622),
  'donglisu': (31, 635, 77, 689),
  'donglion': (103, 635, 149, 689),
  'kameri': (195, 635, 244, 689),
  'camellia': (270, 635, 342, 689),
  'nidomu': (13, 702, 57, 761),
  'nasu': (69, 702, 108, 761),
  'ibaraki': (116, 702, 154, 761),
  'sayama': (159, 702, 201, 761),
  'hannou': (206, 702, 247, 761),
  'miyoshi': (262, 702, 303, 761),
  'asakura': (309, 702, 350, 761),
  'atsuzemi': (386, 311, 448, 368),
  'netsuzemi': (484, 314, 551, 368),
  'magmazemi': (576, 304, 659, 368),
  'hikabuto': (376, 399, 455, 461),
  'honokabu': (479, 404, 551, 461),
  'magukabuto': (576, 394, 664, 461),
  'kaledo': (378, 507, 452, 582),
  'kaledoni': (476, 512, 551, 582),
  'kaledonian': (569, 504, 669, 582),
  'sanhiru': (370, 636, 425, 682),
  'sanhiruzu': (437, 631, 507, 682),
  'hirono': (520, 631, 587, 682),
  'akagi': (602, 631, 672, 682),
  'f_donguris': (370, 721, 412, 762),
  'f_donguris2': (419, 718, 463, 762),
  'f_kanzasho': (476, 713, 522, 762),
  'f_gimura': (533, 716, 576, 762),
  'f_touma': (584, 716, 628, 762),
  'f_akagi2': (633, 713, 674, 762),
  'mizugamo': (711, 309, 770, 355),
  'ikegamo': (806, 309, 865, 355),
  'numagamon': (899, 306, 968, 355),
  'ikekoi': (701, 383, 768, 425),
  'mizukoi': (798, 383, 865, 425),
  'nushikoi': (894, 381, 971, 425),
  'amekero': (706, 461, 765, 525),
  'doshakero': (796, 458, 865, 525),
  'doshakeroro': (894, 456, 976, 525),
  'domari': (701, 551, 768, 607),
  'tsudomari': (798, 551, 860, 607),
  'natsudomari': (894, 551, 973, 607),
  'shizu': (701, 636, 755, 703),
  'shizuhiru': (793, 636, 865, 703),
  'shizuhiruzu': (896, 636, 973, 703),
  'kasumi': (1029, 309, 1078, 355),
  'kasumiga': (1111, 309, 1175, 355),
  'kasumigaseki': (1204, 309, 1281, 355),
  'arai': (1075, 376, 1124, 412),
  'ooarai': (1160, 373, 1229, 412),
  'tone': (1029, 425, 1103, 476),
  'ootone': (1155, 419, 1271, 476),
  'kawana': (1031, 494, 1078, 543),
  'abiko': (1121, 492, 1170, 543),
  'yokohama': (1214, 492, 1263, 543),
  'biwako': (1023, 574, 1080, 615),
  'seta': (1114, 566, 1175, 615),
  'hamano': (1206, 571, 1278, 615),
  'hirakawa': (1003, 656, 1090, 700),
  'mishima': (1114, 643, 1180, 700),
  'otaru': (1217, 646, 1289, 700),
  'birisu': (43, 819, 96, 865),
  'biririsu': (137, 819, 201, 865),
  'kaminarisu': (231, 814, 302, 865),
  'birineko': (41, 881, 98, 926),
  'biririneko': (135, 881, 203, 926),
  'rainyan': (226, 876, 297, 926),
  'ryuga': (55, 949, 110, 986),
  'ryugasaki': (151, 949, 251, 986),
  'kogane': (55, 1011, 121, 1047),
  'koganei': (167, 1006, 263, 1047),
  'nidosaki': (21, 1066, 73, 1123),
  'edosaki': (96, 1063, 160, 1123),
  'resamu': (160, 1061, 219, 1123),
  'soubu': (242, 1050, 311, 1123),
  'ryuki': (351, 822, 399, 867),
  'ryukyu': (429, 820, 492, 867),
  'gaura': (334, 890, 395, 943),
  'sodegaura': (421, 888, 492, 943),
  'basa': (336, 968, 397, 1019),
  'basaju': (421, 968, 492, 1019),
  'takanodai': (326, 1046, 376, 1107),
  'narita': (385, 1055, 437, 1107),
  'bouso': (454, 1050, 505, 1107),
  'tsuchidango': (582, 821, 616, 849),
  'sunadango': (656, 816, 694, 849),
  'gandongo': (728, 814, 781, 849),
  'anamogu': (551, 873, 601, 904),
  'horimogu': (639, 873, 692, 904),
  'daichimogu': (721, 866, 809, 904),
  'bankani': (534, 928, 582, 971),
  'oobankani': (599, 924, 663, 971),
  'hakone': (699, 926, 745, 971),
  'daihakone': (761, 926, 824, 971),
  'rokku': (534, 993, 584, 1043),
  'rokkuhiru': (599, 988, 671, 1043),
  'yamazu': (683, 993, 726, 1043),
  'katayamazu': (754, 986, 807, 1043),
  'dangoru': (529, 1079, 568, 1115),
  'ranzan': (577, 1067, 627, 1115),
  'kyameru': (635, 1067, 673, 1115),
  'musashi': (687, 1067, 726, 1115),
  'rokkou': (733, 1070, 778, 1115),
  'katsuragi': (785, 1067, 833, 1115),
  'nuveru': (850, 827, 901, 885),
  'deista': (921, 824, 971, 885),
  'hourai': (985, 820, 1042, 885),
  'sousei': (850, 911, 901, 969),
  'nikkou': (921, 911, 971, 969),
  'sankou': (985, 908, 1042, 969),
  'yorukara': (1073, 820, 1120, 851),
  'kurogara': (1150, 817, 1204, 851),
  'yamigarasu': (1231, 814, 1295, 851),
  'gasaki': (1069, 874, 1120, 915),
  'anegasaki': (1150, 874, 1207, 915),
  'maguregar': (1231, 864, 1292, 915),
  'berseruba': (1100, 928, 1177, 969),
  'yomiuri': (1221, 928, 1268, 969),
  'hatakon': (857, 1023, 897, 1063),
  'binkon': (921, 1023, 955, 1063),
  'tanugoru': (975, 1023, 1022, 1063),
  'tanuking': (1042, 1023, 1100, 1063),
  'sagami': (853, 1080, 897, 1127),
  'totsuka': (911, 1080, 955, 1127),
  'fuchu': (971, 1077, 1012, 1127),
  'wagou': (1022, 1080, 1063, 1127),
  'koga': (1066, 1097, 1103, 1127),
  'bubu': (1120, 1036, 1207, 1124),
  'mantou': (1218, 1036, 1302, 1124),
}

def strip_banner(img):
    a = np.array(img.convert('RGB')).astype(int)
    for y in range(min(8, a.shape[0])):
        row = a[y]; sat = row.max(1) - row.min(1)
        if (sat > 25).mean() > 0.85:   # ほぼ全幅が色つき = 帯
            continue
        return img.crop((0, y, img.width, img.height))
    return img

# 体が白っぽいモンスター：背景判定を「ほぼ純白/純薄青」に限定し、輪郭線でふさいだ内側は残す
PALE = {'kasumi','kasumiga','kasumigaseki','ryuki','ryukyu','gaura','sodegaura','basa','basaju','takanodai','narita','bouso',
        'nuveru','deista','hourai','sousei','nikkou','sankou','bubu','mantou','hatakon','sagami','natsudomari','tone','shizu',
        'yokohama','kawana','abiko','hamano','hirakawa','arai','ooarai','yotsubausa','clovernny','kogane','koganei','edosaki'}

def keyout_pale(img):
    """白い体のモンスター：非白ピクセルの「閉包」を体とみなす（凸包＋穴埋め）。外側の白だけ消える。"""
    from scipy.spatial import ConvexHull
    from PIL import ImageDraw as _ID
    a = np.array(img.convert('RGB')).astype(int)
    mx = a.max(2); mn = a.min(2); sat = mx - mn
    ink = ((sat > 30) | (mx < 200)) & ~((mn > 225) & (sat < 25))
    ink = ndimage.binary_opening(ink, iterations=1)
    # 最大成分の近傍だけ（隣の個体の混入防止）
    l, n = ndimage.label(ndimage.binary_dilation(ink, iterations=6))
    if n > 1:
        sizes = ndimage.sum(ink, l, range(1, n + 1)); keep = int(np.argmax(sizes)) + 1
        ink = ink & (l == keep)
    ys, xs = np.where(ink)
    mask = np.zeros(ink.shape, bool)
    if len(xs) >= 3:
        pts = np.stack([xs, ys], 1)
        try:
            hull = ConvexHull(pts); poly = [tuple(pts[i]) for i in hull.vertices]
            m = Image.new('L', (ink.shape[1], ink.shape[0]), 0); _ID.Draw(m).polygon(poly, fill=255)
            mask = np.array(m) > 0
        except Exception: mask = ndimage.binary_fill_holes(ndimage.binary_dilation(ink, iterations=4))
    # 凸包の中でも「純白で、かつ外周につながる」部分は背景として削る（角の余白）
    white = (mn > 226) & (sat < 22)
    # 体の内側の白は守る：インクを膨らませた領域は白でも残す
    body_core = ndimage.binary_fill_holes(ndimage.binary_closing(ink, iterations=3))
    lab, n2 = ndimage.label(white & mask & ~body_core)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))); edge.discard(0)
    mask &= ~np.isin(lab, list(edge))
    mask = ndimage.binary_closing(mask, iterations=2)
    # 凸包のうち「インクから離れた部分」（角の背景）は削る：インクの近傍6pxだけ残す
    mask &= ndimage.binary_dilation(ink, iterations=6)
    mask = ndimage.binary_fill_holes(ndimage.binary_closing(mask, iterations=3))
    alpha = (mask * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')

def keyout(img):
    """白〜薄い背景と、水タイプの薄青い「もや」を透明にする。輪郭は残す。"""
    a = np.array(img.convert('RGB')).astype(int)
    mx = a.max(2); mn = a.min(2); sat = mx - mn
    # 背景候補：明るくて彩度が低い、または薄い水色（R>200,G>220,B>230 付近）
    pale = (mn > 215) & (sat < 40)
    lightblue = (a[..., 2] > 225) & (a[..., 1] > 215) & (a[..., 0] > 190) & (a[..., 2] - a[..., 0] < 60) & (sat < 60)
    # パネルの薄い色（薄緑・薄赤・薄青・薄黄）も背景扱い：明るくて彩度が低め
    tint = (mn > 185) & (sat < 70) & (mx > 215)
    bg = pale | lightblue | tint
    # 外周からつながる背景だけを消す（体の内側の白は残す）
    lab, n = ndimage.label(bg)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))); border.discard(0)
    bgmask = np.isin(lab, list(border))
    # 端のにじみを少し削る
    fg = ~bgmask
    fg = ndimage.binary_erosion(fg, iterations=1)
    fg = ndimage.binary_opening(fg, iterations=1)
    # 小さなゴミを除く（最大成分＋一定サイズ以上）
    l2, n2 = ndimage.label(fg)
    if n2 > 1:
        sizes = ndimage.sum(fg, l2, range(1, n2 + 1)); big = sizes.max()
        keep = [i + 1 for i, s in enumerate(sizes) if s > big * 0.04]
        fg = np.isin(l2, keep)
    alpha = (fg * 255).astype(np.uint8)
    rgba = np.dstack([a.astype(np.uint8), alpha])
    return Image.fromarray(rgba, 'RGBA')

def fit(img, size):
    bbox = img.getbbox()
    if not bbox: return Image.new('RGBA', (size, size), (0, 0, 0, 0))
    img = img.crop(bbox)
    s = (size - 2) / max(img.width, img.height)
    nw, nh = max(1, round(img.width * s)), max(1, round(img.height * s))
    r = img.resize((nw, nh), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(r, ((size - nw) // 2, size - nh - 1))   # 足元を下に揃える
    # 半透明の縁を二値化して、ドット絵らしくする
    a = np.array(out); a[..., 3] = np.where(a[..., 3] >= 100, 255, 0)
    return Image.fromarray(a, 'RGBA')

def main():
    src = Image.open(SRC).convert('RGB')
    sprites = {}
    for name, box in BOXES.items():
        c = strip_banner(src.crop(box))
        k = keyout_pale(c) if name in PALE else keyout(c)
        sprites[name] = fit(k, SIZE)
    # アトラス
    names = list(sprites); cols = 12
    rows = (len(names) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * SIZE, rows * SIZE), (0, 0, 0, 0)); meta = {}
    for i, n in enumerate(names):
        x, y = (i % cols) * SIZE, (i // cols) * SIZE
        atlas.paste(sprites[n], (x, y)); meta[n] = [x, y, SIZE, SIZE]
    os.makedirs(OUT_DIR, exist_ok=True)
    atlas.save(f'{OUT_DIR}/monsters.png', optimize=True)
    json.dump(meta, open(f'{OUT_DIR}/monsters.json', 'w'), separators=(',', ':'))
    # 確認用
    cs = Image.new('RGB', (cols * (SIZE * 3 + 8), rows * (SIZE * 3 + 8)), (110, 190, 110))
    for i, n in enumerate(names):
        big = sprites[n].resize((SIZE * 3, SIZE * 3), Image.NEAREST)
        cs.paste(big, ((i % cols) * (SIZE * 3 + 8) + 4, (i // cols) * (SIZE * 3 + 8) + 4), big)
    cs.save(os.path.join(OUT_DIR, 'dex/contact.png'))
    print(len(names), 'sprites ->', f'{OUT_DIR}/monsters.png', atlas.size)

if __name__ == '__main__': main()
