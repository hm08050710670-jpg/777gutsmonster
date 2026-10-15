#!/usr/bin/env python3
"""index.html の js/css 参照に ?v=<時刻> を付ける（GitHub Pages で古いファイルがキャッシュされ、新旧が混ざるのを防ぐ）。
   使い方: python3 tools/stamp.py   （コミット前に毎回）"""
import re, time
p = 'index.html'; s = open(p, encoding='utf-8').read()
v = time.strftime('%Y%m%d%H%M')
s2 = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+)(?:\?v=\d+)?"', lambda m: f'{m.group(1)}?v={v}"', s)
open(p, 'w', encoding='utf-8').write(s2); print('stamped', v)
