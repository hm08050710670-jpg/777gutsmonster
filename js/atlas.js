// ============================================================
// アトラス（assets/atlas.png + atlas.json）
//   1タイル = 32px の素材。画面は 2倍描画なので、論理座標では 1/2 のサイズで描く。
//   Atlas.draw(ctx, name, x, y)  … 左上基準（論理px）
//   Atlas.has(name)
// ============================================================
const Atlas = (() => {
  let img = null, meta = {}, ready = false;
  const S = 2; // 素材px → 論理px の縮小率

  async function load() {
    try {
      const m = CONFIG.ATLAS_META ? CONFIG.ATLAS_META : await (await fetch(CONFIG.ATLAS_JSON || 'assets/atlas.json')).json();
      meta = m;
      img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = CONFIG.ATLAS_IMG || 'assets/atlas.png'; });
      ready = true;
    } catch (e) { console.warn('アトラス読込失敗。旧描画で続行', e); ready = false; }
  }
  const has = n => ready && !!meta[n];
  function draw(ctx, name, x, y, flip = false) {
    const r = meta[name]; if (!r || !ready) return false;
    const [sx, sy, sw, sh] = r;
    if (flip) { ctx.save(); ctx.translate(x + sw / S, y); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw / S, sh / S); ctx.restore(); }
    else ctx.drawImage(img, sx, sy, sw, sh, x, y, sw / S, sh / S);
    return true;
  }
  const size = n => { const r = meta[n]; return r ? { w: r[2] / S, h: r[3] / S } : null; };
  return { load, has, draw, size, isReady: () => ready };
})();
