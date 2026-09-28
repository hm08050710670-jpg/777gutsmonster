// ============================================================
// モンスターの絵（assets/monsters.png + monsters.json）
//   図鑑イラストから切り出した 48x48。論理24pxで描く（2倍描画）。
//   Mon.draw(ctx, id, x, y, scale, flip)  … 左上基準。無ければ false（呼び側で旧描画）
// ============================================================
const Mon = (() => {
  let img = null, meta = {}, ready = false;
  const S = 2; // 素材px → 論理px
  async function load() {
    try {
      meta = CONFIG.MON_META ? CONFIG.MON_META : await (await fetch('assets/monsters.json')).json();
      img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = CONFIG.MON_IMG || 'assets/monsters.png'; });
      ready = true;
    } catch (e) { console.warn('モンスター画像の読込失敗。旧描画で続行', e); ready = false; }
  }
  const has = id => ready && !!meta[id];
  function draw(ctx, id, x, y, scale = 1, flip = false) {
    const r = meta[id]; if (!r || !ready) return false;
    const [sx, sy, sw, sh] = r; const w = sw / S * scale, h = sh / S * scale;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); }
    else ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
    return true;
  }
  return { load, has, draw, isReady: () => ready };
})();
