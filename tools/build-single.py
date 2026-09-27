#!/usr/bin/env python3
"""
単一HTML（dist/index.html）を生成する。
  - CSS / JS をインライン化
  - DotGothic16を必要文字（ASCII・かな・全角記号・第1水準相当は含めず）にサブセット化して data: URI で埋め込む
用途: Claude の Artifact や、1ファイルで配布したいとき。GitHub Pages では不要。
実行: python3 tools/build-single.py
"""
import base64, io, os, re, subprocess, sys
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

html = open('index.html', encoding='utf-8').read()
css = open('css/style.css', encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="css/style.css">', f'<style>\n{css}\n</style>')

# JS を読み込み順にインライン化（フォントURLは data: に差し替え）
def inline_js(m):
    src = m.group(1)
    code = open(src, encoding='utf-8').read()
    code = code.replace("FONT_FILE: 'assets/fonts/DotGothic16-Regular.ttf'", f"FONT_FILE: 'data:font/ttf;base64,{font_b64}'")
    return f'<script>\n{code}\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

os.makedirs('dist', exist_ok=True)
open('dist/index.html', 'w', encoding='utf-8').write(html)
print('wrote dist/index.html', os.path.getsize('dist/index.html') // 1024, 'KB')
