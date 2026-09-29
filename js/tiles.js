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
    ]);
  }
  const has = name => !!meta[name];
  function get(name) {
    if (!has(name)) return null;
    const key = 't:' + name;
    if (!cache.has(key)) {
      const { img: im, r: [x, y, w, h] } = meta[name];
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
      const inset = kind === 'water' ? 2 : 3, r = kind === 'water' ? 3 : 5;
      const N = mask & 1, E = mask & 2, S = mask & 4, W = mask & 8;
      const x0 = W ? -8 : inset, y0 = N ? -8 : inset, x1 = E ? 24 : 16 - inset, y1 = S ? 24 : 16 - inset;
      const rr = (open1, open2) => (open1 || open2) ? 0 : r;   // 両側が閉じている角だけ丸める
      const path = () => {
        g.beginPath();
        const tl = rr(N, W), tr = rr(N, E), br = rr(S, E), bl = rr(S, W);
        g.moveTo(x0 + tl, y0); g.lineTo(x1 - tr, y0); g.quadraticCurveTo(x1, y0, x1, y0 + tr);
        g.lineTo(x1, y1 - br); g.quadraticCurveTo(x1, y1, x1 - br, y1);
        g.lineTo(x0 + bl, y1); g.quadraticCurveTo(x0, y1, x0, y1 - bl);
        g.lineTo(x0, y0 + tl); g.quadraticCurveTo(x0, y0, x0 + tl, y0);
        g.closePath();
      };
      g.save(); path(); g.clip();
      g.drawImage(get(kind), 0, 0);
      g.restore();
      // 縁取り（内側に1px）
      g.save(); path(); g.clip();
      path(); g.lineWidth = 2; g.strokeStyle = kind === 'water' ? 'rgba(20,60,120,0.75)' : 'rgba(150,110,40,0.45)'; g.stroke();
      g.restore();
      cache.set(key, c);
    }
    return cache.get(key);
  }
  return { load, has, get, variant, auto, get ready() { return has('grass0'); } };
})();
