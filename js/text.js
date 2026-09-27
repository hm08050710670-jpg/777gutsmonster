// ============================================================
// テキスト描画・ウィンドウ枠（CLASSIC COLOR）
//   8x8 ドットの美咲ゴシック（自由利用可）を 8px で描画。半角は 4px 幅。
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
  function width(str) { let w = 0; for (const ch of str) w += charW(ch); return w; }

  function draw(ctx, str, x, y, color = THEME.text) {
    ctx.font = `8px "${CONFIG.FONT}", monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of str) {
      if (ch !== ' ' && ch !== '　') ctx.fillText(ch, cx, y);
      cx += charW(ch);
    }
    return cx;
  }

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

  // アイボリー地・深緑の外枠・少し内側に薄い線
  function box(ctx, x, y, w, h) {
    ctx.fillStyle = THEME.shadow; ctx.fillRect(x + 1, y + 2, w, h);     // 影
    ctx.fillStyle = THEME.greenDark; ctx.fillRect(x, y, w, h);          // 外枠
    ctx.fillStyle = THEME.green; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = THEME.ivory; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = THEME.ivory2;                                       // 内側の薄い枠
    ctx.fillRect(x + 4, y + 4, w - 8, 1); ctx.fillRect(x + 4, y + h - 5, w - 8, 1);
    ctx.fillRect(x + 4, y + 4, 1, h - 8); ctx.fillRect(x + w - 5, y + 4, 1, h - 8);
  }

  function cursor(ctx, x, y, color = THEME.green) {
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + 1 + i, 1, 7 - i * 2);
  }
  function moreArrow(ctx, x, y, frame) {
    if (Math.floor(frame / 16) % 2) return;
    ctx.fillStyle = THEME.green;
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 7 - i * 2, 1);
  }

  return { load, draw, width, wrap, box, cursor, moreArrow, isReady: () => ready };
})();
