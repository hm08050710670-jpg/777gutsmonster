// ============================================================
// モンスターの絵（assets/monsters.png + monsters.json）
//   図鑑イラストから切り出した 48x48。論理24pxで描く（2倍描画）。
//   Mon.draw(ctx, id, x, y, scale, flip)  … 左上基準。無ければ false（呼び側で旧描画）
// ============================================================
const Mon = (() => {
  let img = null, meta = {}, ready = false;
  let bimg = null, bmeta = {};   // 後ろ姿（自分側・あるものだけ）
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
  }
  const hasBack = id => !!(bimg && bmeta[id]);
  const has = id => ready && !!meta[id];
  // back=true：後ろ姿があればそれを（反転なし）、無ければ正面を左右反転
  function draw(ctx, id, x, y, scale = 1, flip = false, back = false) {
    if (back && hasBack(id)) return drawFrom(ctx, bimg, bmeta[id], x, y, scale, false);
    const r = meta[id]; if (!r || !ready) return false;
    return drawFrom(ctx, img, r, x, y, scale, flip);
  }
  function drawFrom(ctx, image, r, x, y, scale, flip) {
    const [sx, sy, sw, sh] = r; const w = sw / S * scale, h = sh / S * scale;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h); }
    else ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
    return true;
  }
  return { load, has, hasBack, draw, isReady: () => ready };
})();
