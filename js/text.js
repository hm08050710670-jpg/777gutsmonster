// ============================================================
// テキスト描画・ウィンドウ枠
//   8x8 ドットの美咲ゴシック（フリーライセンス）を 8px で描画すると
//   1文字がちょうど 8x8 のドットに収まる。半角文字は 4px 幅。
// ============================================================
const Text = (() => {
  let ready = false;

  async function load() {
    try {
      const f = new FontFace(CONFIG.FONT, 'url(assets/fonts/misaki_gothic.ttf)');
      await f.load();
      document.fonts.add(f);
      await document.fonts.load(`8px "${CONFIG.FONT}"`);
      ready = true;
    } catch (e) {
      console.warn('フォント読込失敗。代替フォントで描画します', e);
      ready = false;
    }
  }

  const isHalf = ch => ch.charCodeAt(0) < 0x100 || (ch >= '｡' && ch <= 'ﾟ');
  const charW = ch => (isHalf(ch) ? 4 : 8);

  function width(str) {
    let w = 0;
    for (const ch of str) w += charW(ch);
    return w;
  }

  // 1文字ずつ描く（等幅グリッドを保つため）
  function draw(ctx, str, x, y, color = 3) {
    ctx.font = `8px "${CONFIG.FONT}", monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = PAL[color];
    let cx = x;
    for (const ch of str) {
      if (ch !== ' ' && ch !== '　') ctx.fillText(ch, cx, y);
      cx += charW(ch);
    }
    return cx;
  }

  // 幅(px)で折り返し。'\n' で強制改行
  function wrap(str, maxW) {
    const lines = [];
    for (const para of str.split('\n')) {
      let line = '', w = 0;
      for (const ch of para) {
        const cw = charW(ch);
        if (w + cw > maxW) { lines.push(line); line = ''; w = 0; }
        line += ch; w += cw;
      }
      lines.push(line);
    }
    return lines;
  }

  // 初代風の枠（外側1px + 内側1px の二重線、角は欠け）
  function box(ctx, x, y, w, h) {
    ctx.fillStyle = PAL[0];
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PAL[3];
    // 外枠
    ctx.fillRect(x + 2, y, w - 4, 1);
    ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4);
    ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    // 内枠
    ctx.fillRect(x + 3, y + 2, w - 6, 1);
    ctx.fillRect(x + 3, y + h - 3, w - 6, 1);
    ctx.fillRect(x + 2, y + 3, 1, h - 6);
    ctx.fillRect(x + w - 3, y + 3, 1, h - 6);
    // 角のドット
    [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]
      .forEach(([px, py]) => ctx.fillRect(px, py, 1, 1));
  }

  // カーソル ▶
  function cursor(ctx, x, y) {
    ctx.fillStyle = PAL[3];
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + 1 + i, 1, 7 - i * 2);
  }

  // 続きあり ▼（点滅）
  function moreArrow(ctx, x, y, frame) {
    if (Math.floor(frame / 16) % 2) return;
    ctx.fillStyle = PAL[3];
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 7 - i * 2, 1);
  }

  return { load, draw, width, wrap, box, cursor, moreArrow, isReady: () => ready };
})();
