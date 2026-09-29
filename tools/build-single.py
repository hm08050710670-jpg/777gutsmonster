#!/usr/bin/env python3
"""
単一HTML（dist/index.html）を生成する。
  - CSS / JS をインライン化
  - DotGothic16を必要文字（ASCII・かな・全角記号・第1水準相当は含めず）にサブセット化して data: URI で埋め込む
用途: Claude の Artifact や、1ファイルで配布したいとき。GitHub Pages では不要。
実行: python3 tools/build-single.py
"""
import base64, io, os, re, subprocess, sys, json
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# ---- フォントサブセット：ASCII, 半角カナ, ひらがな, カタカナ, 全角英数記号, 一部記号 ----
ranges = [(0x20, 0x7E), (0x3000, 0x30FF), (0xFF00, 0xFFEF), (0x2190, 0x2193), (0x25B6, 0x25BC), (0x3400, 0x3400)]
# JS/データ内で使っている漢字も拾う（ファイルを走査）
kanji = set()
for dp, _, fs in os.walk('js'):
    for f in fs:
        for ch in open(os.path.join(dp, f), encoding='utf-8').read():
            if 0x4E00 <= ord(ch) <= 0x9FFF: kanji.add(ch)
unicodes = set()
for a, b in ranges: unicodes.update(range(a, b + 1))
unicodes.update(ord(c) for c in kanji)

opts = subset.Options(); opts.notdef_outline = True; opts.name_IDs = ['*']; opts.hinting = False
font = TTFont('assets/fonts/DotGothic16-Regular.ttf')
sub = subset.Subsetter(opts); sub.populate(unicodes=unicodes); sub.subset(font)
buf = io.BytesIO(); font.save(buf); font_b64 = base64.b64encode(buf.getvalue()).decode()
print(f'font subset: {len(unicodes)} codepoints -> {len(buf.getvalue())//1024} KB')

# BGM を data: URI に
bgm_b64 = {}
for name in ['guts_town', 'okumura_lab', 'wild_adventure', 'rival_battle']:
    path = f'assets/bgm/{name}.mp3'
    if os.path.exists(path):
        bgm_b64[path] = 'data:audio/mpeg;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
print('bgm embedded:', len(bgm_b64), 'tracks')

# アトラスを埋め込み
atlas_png = atlas_json = None
if os.path.exists('assets/atlas.png'):
    atlas_png = 'data:image/png;base64,' + base64.b64encode(open('assets/atlas.png', 'rb').read()).decode()
    atlas_json = open('assets/atlas.json', encoding='utf-8').read()

# 一枚絵マップを埋め込み
map_imgs = {}
mapdir = 'assets/maps'
if os.path.isdir(mapdir):
    for f in sorted(os.listdir(mapdir)):
        mime = 'image/webp' if f.endswith('.webp') else 'image/png'
        map_imgs[f'{mapdir}/{f}'] = f'data:{mime};base64,' + base64.b64encode(open(f'{mapdir}/{f}', 'rb').read()).decode()
print('map images embedded:', len(map_imgs))

mon_png = mon_json = None
if os.path.exists('assets/monsters.png'):
    mon_png = 'data:image/png;base64,' + base64.b64encode(open('assets/monsters.png', 'rb').read()).decode()
    mon_json = open('assets/monsters.json', encoding='utf-8').read()
px_png = px_json = None
if os.path.exists('assets/monsters_px.png'):
    px_png = 'data:image/png;base64,' + base64.b64encode(open('assets/monsters_px.png', 'rb').read()).decode()
    px_json = open('assets/monsters_px.json', encoding='utf-8').read()
back_png = back_json = None
if os.path.exists('assets/monsters_back.png'):
    back_png = 'data:image/png;base64,' + base64.b64encode(open('assets/monsters_back.png', 'rb').read()).decode()
    back_json = open('assets/monsters_back.json', encoding='utf-8').read()

bg_imgs = {}
if os.path.isdir('assets/bg'):
    for f in sorted(os.listdir('assets/bg')):
        if f.endswith('.png'):
            bg_imgs[f[:-4]] = 'data:image/png;base64,' + base64.b64encode(open(f'assets/bg/{f}', 'rb').read()).decode()
print('battle backgrounds embedded:', len(bg_imgs))

tiles_png = tiles_json = None
if os.path.exists('assets/tiles.png') and os.path.exists('assets/tiles.json'):
    tiles_png = 'data:image/png;base64,' + base64.b64encode(open('assets/tiles.png', 'rb').read()).decode()
    tiles_json = open('assets/tiles.json', encoding='utf-8').read()
    print('town tiles embedded')
hero_png = hero_json = None
if os.path.exists('assets/hero.png') and os.path.exists('assets/hero.json'):
    hero_png = 'data:image/png;base64,' + base64.b64encode(open('assets/hero.png', 'rb').read()).decode()
    hero_json = open('assets/hero.json', encoding='utf-8').read()
    print('hero sprites embedded')

html = open('index.html', encoding='utf-8').read()
css = open('css/style.css', encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="css/style.css">', f'<style>\n{css}\n</style>')
if os.path.exists('css/puzzle.css'):
    html = html.replace('<link rel="stylesheet" href="css/puzzle.css">', '<style>\n' + open('css/puzzle.css', encoding='utf-8').read() + '\n</style>')

# JS を読み込み順にインライン化（フォントURLは data: に差し替え）
def inline_js(m):
    src = m.group(1)
    code = open(src, encoding='utf-8').read()
    code = code.replace("FONT_FILE: 'assets/fonts/DotGothic16-Regular.ttf'", f"FONT_FILE: 'data:font/ttf;base64,{font_b64}'")
    for path, uri in bgm_b64.items(): code = code.replace(f"'{path}'", f"'{uri}'")
    if src == 'js/config.js' and mon_png:
        code = code.replace("  TITLE: 'GUTS MONSTERS',", f"  MON_IMG: '{mon_png}',\n  MON_META: {mon_json},\n  TITLE: 'GUTS MONSTERS',")
    if src == 'js/config.js' and px_png:
        code = code.replace("  TITLE: 'GUTS MONSTERS',", f"  MON_PX_IMG: '{px_png}',\n  MON_PX_META: {px_json},\n  TITLE: 'GUTS MONSTERS',")
    if src == 'js/config.js' and back_png:
        code = code.replace("  TITLE: 'GUTS MONSTERS',", f"  MON_BACK_IMG: '{back_png}',\n  MON_BACK_META: {back_json},\n  TITLE: 'GUTS MONSTERS',")
    if src == 'js/config.js' and bg_imgs:
        code = code.replace("  TITLE: 'GUTS MONSTERS',", f"  BG_IMAGES: {json.dumps(bg_imgs)},\n  TITLE: 'GUTS MONSTERS',")
    if tiles_png:
        code = code.replace("  TITLE: 'GUTS MONSTERS',", f"  TILES_IMG: '{tiles_png}',\n  TILES_META_INLINE: {tiles_json},\n  TITLE: 'GUTS MONSTERS',")
    if hero_png:
        code = code.replace("  TITLE: 'GUTS MONSTERS',", f"  HERO_IMG: '{hero_png}',\n  HERO_META_INLINE: {hero_json},\n  TITLE: 'GUTS MONSTERS',")
    if src == 'js/config.js' and atlas_png:
        code = code.replace("  TITLE: 'GUTS MONSTERS',", f"  ATLAS_IMG: '{atlas_png}',\n  ATLAS_META: {atlas_json},\n  MAP_IMAGES: {json.dumps(map_imgs)},\n  TITLE: 'GUTS MONSTERS',")
    return f'<script>\n{code}\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

os.makedirs('dist', exist_ok=True)
open('dist/index.html', 'w', encoding='utf-8').write(html)
print('wrote dist/index.html', os.path.getsize('dist/index.html') // 1024, 'KB')
