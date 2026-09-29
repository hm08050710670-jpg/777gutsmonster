// ============================================================
// モンスターの絵（assets/monsters.png + monsters.json）
//   図鑑イラストから切り出した 48x48。論理24pxで描く（2倍描画）。
//   Mon.draw(ctx, id, x, y, scale, flip)  … 左上基準。無ければ false（呼び側で旧描画）
// ============================================================
const Mon = (() => {
  let img = null, meta = {}, ready = false;
  let bimg = null, bmeta = {};   // 後ろ姿（自分側・あるものだけ）
  let pimg = null, pmeta = {};   // 等倍ドット絵（正面f／後ろ姿b、あるものだけ）：拡大してもにじまない
  const S = 2; // 素材px → 論理px
  async function load() {
    try {
      meta = CONFIG.MON_META ? CONFIG.MON_META : await (await fetch('assets/monsters.json')).json();
      img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = CONFIG.MON_IMG || 'assets/monsters.png'; });
      ready = true;
    } catch (e) { console.warn('モンスター画像の読込失敗。旧描画で続行', e); ready = false; }
    try {
      bmeta = CONFIG.MON_BACK_META ? CONFIG.MON_BACK_META : await (await fetch('assets/monsters_back.json')).json();
      bimg = new Image();
      await new Promise((res, rej) => { bimg.onload = res; bimg.onerror = rej; bimg.src = CONFIG.MON_BACK_IMG || 'assets/monsters_back.png'; });
    } catch (e) { bimg = null; bmeta = {}; }
    await loadPx();
  }
  const hasBack = id => !!(bimg && bmeta[id]);
  // 等倍ドット絵の読み込み（無ければ無視）
  async function loadPx() {
    try {
      pmeta = CONFIG.MON_PX_META ? CONFIG.MON_PX_META : await (await fetch('assets/monsters_px.json')).json();
      pimg = new Image();
      await new Promise((res, rej) => { pimg.onload = res; pimg.onerror = rej; pimg.src = CONFIG.MON_PX_IMG || 'assets/monsters_px.png'; });
    } catch (e) { pimg = null; pmeta = {}; }
  }
  const hasPx = id => !!(pimg && pmeta[id]);
  // 表示倍率：進化段階／個別指定（DEX_SIZE）で決まる。味方側（後ろ姿）はそれをさらに PARTY_BACK_SIZE 倍
  function sizeOf(id, back) {
    const d = DATA.MONSTERS[id];
    const base = (typeof DEX_SIZE !== 'undefined' && DEX_SIZE[id]) || (d && typeof STAGE_SIZE !== 'undefined' && STAGE_SIZE[d.stage]) || 1;
    // 味方側（後ろ姿）は相手側と同じ比率のまま、全体を PARTY_BACK_SIZE 倍（最大サイズが 0.6）
    return back ? base * (CONFIG.PARTY_BACK_SIZE || 1) : base;
  }
  // 実際に描かれる大きさと箱内のオフセット（配置計算用）
  function drawnBox(id, scale, back) {
    const e = pmeta[id]; if (!e) return { w: 24 * scale, h: 24 * scale, dx: 0, dy: 0 };
    const r = back && e.b ? e.b : e.f;
    const size = sizeOf(id, back);
    const [sx, sy, sw, sh] = r, box = 24 * scale, k = box * size / Math.max(sw, sh);
    const w = Math.round(sw * k), h = Math.round(sh * k);
    return { w, h, dx: Math.floor((box - w) / 2), dy: box - h };
  }
  // 等倍ドット絵：24*scale の箱に収まるよう最近傍で拡大（足元を下に揃える）
  function drawPx(ctx, id, x, y, scale, flip, back) {
    const e = pmeta[id]; const r = back && e.b ? e.b : e.f; if (!r) return false;
    const size = sizeOf(id, back);
    const [sx, sy, sw, sh] = r, box = 24 * scale, k = box * size / Math.max(sw, sh);
    const w = Math.round(sw * k), h = Math.round(sh * k), dx = x + Math.floor((box - w) / 2), dy = y + box - h;
    const doFlip = flip && !(back && e.b);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (doFlip) { ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(pimg, sx, sy, sw, sh, 0, 0, w, h); }
    else ctx.drawImage(pimg, sx, sy, sw, sh, dx, dy, w, h);
    ctx.restore();
    return true;
  }
  const has = id => ready && !!meta[id];
  // back=true：後ろ姿があればそれを（反転なし）、無ければ正面を左右反転
  function draw(ctx, id, x, y, scale = 1, flip = false, back = false) {
    if (hasPx(id)) return drawPx(ctx, id, x, y, scale, flip, back);
    if (back && hasBack(id)) return drawFrom(ctx, bimg, bmeta[id], x, y, scale, false);
    const r = meta[id]; if (!r || !ready) return false;
    return drawFrom(ctx, img, r, x, y, scale, flip);
  }
  // ---- 高解像度端末向け：Scale2x（EPX）を2回かけた4倍画像をキャッシュして描く ----
  //   48px素材を6倍などに単純拡大すると階段状に荒れるため、斜め線をなめらかにした192pxを用意し、
  //   そこから滑らか補間で縮小・拡大する。
  const hqCache = new Map();
  function scale2x(src, w, h) {
    const dst = new Uint32Array(w * h * 4), W2 = w * 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P = src[y * w + x];
      const A = y > 0 ? src[(y - 1) * w + x] : P, D = y < h - 1 ? src[(y + 1) * w + x] : P;
      const C = x > 0 ? src[y * w + x - 1] : P, B = x < w - 1 ? src[y * w + x + 1] : P;
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      const o = (y * 2) * W2 + x * 2;
      dst[o] = p1; dst[o + 1] = p2; dst[o + W2] = p3; dst[o + W2 + 1] = p4;
    }
    return dst;
  }
  function hqImage(image, r, key) {
    if (hqCache.has(key)) return hqCache.get(key);
    const [sx, sy, sw, sh] = r;
    const c0 = document.createElement('canvas'); c0.width = sw; c0.height = sh;
    const g0 = c0.getContext('2d'); g0.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    let px = new Uint32Array(g0.getImageData(0, 0, sw, sh).data.buffer), w = sw, h = sh;
    for (let i = 0; i < 2; i++) { px = scale2x(px, w, h); w *= 2; h *= 2; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const id = c.getContext('2d').createImageData(w, h); new Uint8ClampedArray(px.buffer).forEach((v, i) => { id.data[i] = v; });
    c.getContext('2d').putImageData(id, 0, 0);
    hqCache.set(key, c);
    return c;
  }
  function drawFrom(ctx, image, r, x, y, scale, flip) {
    const [sx, sy, sw, sh] = r; const w = sw / S * scale, h = sh / S * scale;
    ctx.save();
    // 実描画が素材の2倍を超えるときだけ高解像度版を使う
    const dpr = ctx.getTransform ? ctx.getTransform().a : 1;
    const useHq = dpr * scale > 2;
    let img = image, ssx = sx, ssy = sy, ssw = sw, ssh = sh;
    if (useHq) { img = hqImage(image, r, `${image === bimg ? 'b' : 'f'}:${sx},${sy}`); ssx = 0; ssy = 0; ssw = sw * 4; ssh = sh * 4; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
    else ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, ssx, ssy, ssw, ssh, 0, 0, w, h); }
    else ctx.drawImage(img, ssx, ssy, ssw, ssh, x, y, w, h);
    ctx.restore();
    return true;
  }
  return { load, has, hasBack, draw, drawnBox, isReady: () => ready };
})();
