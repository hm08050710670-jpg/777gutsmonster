#!/usr/bin/env python3
"""コースのマップを「基本はラフ、カート道・グリーンの近く（マンハッタン距離 3 以内）だけフェアウェイ」に書き換える（案C）。
   G/g/F → 近ければ g（F はそのまま）、遠ければ T。P K n Y y ~ B W はそのまま。アイテムはラフの中でも拾える"""
import re
s = open('js/data.js').read()
D = 3
for name in ['plaza', 'course1', 'course2', 'course3', 'course4', 'course5']:
    a = s.index(f"    {name}: {{"); seg = s[a:a + 8000]
    m = re.search(r"rows: \[\n(.*?)\n      \],", seg, re.S)
    g = [list(l.strip().strip("',")) for l in m.group(1).split('\n')]; H = len(g); W = len(g[0])
    out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c not in 'GgF': continue
            near = False
            for dy in range(-D, D + 1):
                for dx in range(-D, D + 1):
                    if abs(dx) + abs(dy) > D: continue
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and g[yy][xx] in 'PnYy': near = True
            out[y][x] = (c if c == 'F' else 'g') if near else 'T'
    new = '\n'.join("        '" + ''.join(r) + "'," for r in out)
    seg = seg.replace(m.group(1), new); s = s[:a] + seg + s[a + 8000:]
open('js/data.js', 'w').write(s); print('ok')
