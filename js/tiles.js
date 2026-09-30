// ============================================================
// 屋外タイル画像（assets/tiles.png + tiles.json、16px単位）
//   無ければ従来の文字アート（Gfx）にフォールバックする。
//   道・水は周囲に合わせて縁を自動生成（オートタイル）。
// ============================================================
const Tiles = (() => {
  let img = null, meta = {};
  const cache = new Map();
  // アトラス（画像＋位置表）を読む。inline は単一ファイル版で埋め込んだ位置表
  async function loadAtlas(imgSrc, metaSrc, inline) {
    let m = inline;
    if (!m) { try { m = await (await fetch(metaSrc)).json(); } catch (e) { return; } }
    const im = new Image();
    try { await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = imgSrc; }); } catch (e) { return; }
    for (const k of Object.keys(m)) meta[k] = { img: im, r: m[k] };
    img = img || im;
  }
  async function load() {
    await Promise.all([
      loadAtlas(CONFIG.TILES_IMG || 'assets/tiles.png', 'assets/tiles.json', CONFIG.TILES_META_INLINE),
      loadAtlas(CONFIG.HERO_IMG || 'assets/hero.png', 'assets/hero.json', CONFIG.HERO_META_INLINE),
      loadAtlas(CONFIG.NPC_IMG || 'assets/npc.png', 'assets/npc.json', CONFIG.NPC_META_INLINE),
    ]);
  }
  const has = name => !!meta[name];
  function get(name) {
    if (!has(name)) return null;
    const key = 't:' + name;
    if (!cache.has(key)) {
      const { img: im, r: [x, y, w, h] } = meta[name];   // r の5つ目は描画倍率（0.5＝2倍の細かさの絵）
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(im, x, y, w, h, 0, 0, w, h);
      cache.set(key, c);
    }
    return cache.get(key);
  }
  // 位置で草・花の柄をばらす
  function variant(base, n, x, y) { return get(`${base}${((x * 7 + y * 13) % n + n) % n}`); }

  // オートタイル：mask は N=1 E=2 S=4 W=8（同じ地形が隣にあるビット）
  //   道：芝の上に、開いた側を丸く縁取りした砂地。水：芝の上に、濃い縁の水面
  function auto(kind, mask, x, y) {
    const v = ((x * 7 + y * 13) % 3 + 3) % 3, key = `a:${kind}:${mask}:${v}`;
    if (!cache.has(key)) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 16;
      const g = c.getContext('2d');
      g.drawImage(variant('grass', 3, x, y), 0, 0);
      // ドット単位で内外を決める（曲線のアンチエイリアスでぼやけないように）
      const inset = kind === 'water' ? 2 : 3, r = kind === 'water' ? 3 : 5;
      const N = mask & 1, E = mask & 2, S = mask & 4, W = mask & 8;
      const x0 = W ? -8 : inset, y0 = N ? -8 : inset, x1 = E ? 24 : 16 - inset, y1 = S ? 24 : 16 - inset;   // [x0,x1) の範囲
      const inside = (px, py) => {
        if (px < x0 || px >= x1 || py < y0 || py >= y1) return false;
        // 両側が閉じた角だけ丸める：角の中心からの距離で判定
        const corner = (cx, cy) => (px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2 <= r * r;
        if (!N && !W && px < x0 + r && py < y0 + r) return corner(x0 + r, y0 + r);
        if (!N && !E && px >= x1 - r && py < y0 + r) return corner(x1 - r, y0 + r);
        if (!S && !W && px < x0 + r && py >= y1 - r) return corner(x0 + r, y1 - r);
        if (!S && !E && px >= x1 - r && py >= y1 - r) return corner(x1 - r, y1 - r);
        return true;
      };
      const tex = get(kind).getContext('2d').getImageData(0, 0, 16, 16).data;
      const out = g.getImageData(0, 0, 16, 16), d = out.data;
      const edge = kind === 'water' ? [24, 70, 130] : [150, 110, 40], ea = kind === 'water' ? 0.8 : 0.45;
      for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) {
        if (!inside(px, py)) continue;
        const i = (py * 16 + px) * 4;
        const rim = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
        for (let k = 0; k < 3; k++) d[i + k] = rim ? Math.round(tex[i + k] * (1 - ea) + edge[k] * ea) : tex[i + k];
        d[i + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      cache.set(key, c);
    }
    return cache.get(key);
  }
  const scale = name => (meta[name] && meta[name].r[4]) || 1;
  return { load, has, get, scale, variant, auto, get ready() { return has('grass0'); } };
})();
