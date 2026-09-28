// ============================================================
// テキスト描画・ウィンドウ枠（CLASSIC COLOR）
//   DotGothic16（SIL OFL）を論理8px（実描画16px）で描画。半角は 4px 幅。
// ============================================================
const Text = (() => {
  let ready = false;

  async function load() {
    try {
      const f = new FontFace(CONFIG.FONT, `url(${CONFIG.FONT_FILE})`);
      await f.load();
      document.fonts.add(f);
      await document.fonts.load(`8px "${CONFIG.FONT}"`);
      ready = true;
      measure();
    } catch (e) {
      console.warn('フォント読込失敗。代替フォントで描画します', e);
      ready = false;
    }
  }

  // 文字の縦位置：ブラウザごとに textBaseline='top' の解釈が違う（Safariは下に寄る）ので、
  // 実際のインクの高さを測って「y+1 に文字の上端」が来るように alphabetic 基準で描く
  let ascent = 7;
  function measure() {
    try {
      const c = document.createElement('canvas').getContext('2d');
      c.font = `80px "${CONFIG.FONT}", monospace`; c.textBaseline = 'alphabetic';
      const m = c.measureText('日');   // 大きく測って精度を上げる
      if (m.actualBoundingBoxAscent) ascent = Math.round(m.actualBoundingBoxAscent / 10 * 2) / 2;
    } catch (e) { /* 測れなければ既定値 */ }
  }

  const isHalf = ch => ch.charCodeAt(0) < 0x100 || (ch >= '｡' && ch <= 'ﾟ');
  const charW = ch => (isHalf(ch) ? 4 : 8);
  function width(str) { let w = 0; for (const ch of str) w += charW(ch); return w; }

  function draw(ctx, str, x, y, color = THEME.text) {
    ctx.font = `8px "${CONFIG.FONT}", monospace`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    const by = y + 1 + ascent;
    let cx = x;
    for (const ch of str) {
      if (ch !== ' ' && ch !== '　') ctx.fillText(ch, cx, by);
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
        if (w + cw > maxW) {
          // できるだけ直前の空白で折り返す（「だろ？」のような分断を避ける）
          const sp = line.lastIndexOf(' ');
          if (sp > 0) { lines.push(line.slice(0, sp)); line = line.slice(sp + 1); }
          else { lines.push(line); line = ''; }
          w = width(line);
        }
        if (ch === ' ' && line === '') continue;
        line += ch; w += cw;
      }
      lines.push(line);
    }
    return lines;
  }

  // 深緑の二重枠（角を欠いたドット枠）・アイボリー地
  //   opt.tab: 左下に斜めの影タブ（戦闘のHP窓用）  opt.fill: 地の色
  function box(ctx, x, y, w, h, opt = {}) {
    // 角を1ドット欠いた矩形
    const notched = (px, py, pw, ph, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py, pw - 2, ph); ctx.fillRect(px, py + 1, pw, ph - 2);
    };
    if (opt.tab) {   // 斜めの影タブ（左下から右へ）
      ctx.fillStyle = THEME.greenDark; ctx.fillRect(x - 6, y + h - 4, w + 6, 6);
      ctx.fillRect(x - 4, y + h - 8, 4, 4); ctx.fillRect(x - 2, y + h - 12, 2, 4);
      ctx.fillStyle = THEME.green; ctx.fillRect(x - 5, y + h - 3, w + 4, 3);
      ctx.fillStyle = '#7fa889'; ctx.fillRect(x + Math.floor(w / 2), y + h, Math.floor(w / 2) - 4, 1);
    } else {
      ctx.fillStyle = THEME.shadow; ctx.fillRect(x + 1, y + 2, w, h);   // 影
    }
    notched(x, y, w, h, THEME.greenDark);                                // 外枠（2px）
    notched(x + 2, y + 2, w - 4, h - 4, opt.fill || THEME.ivory);        // 地
    notched(x + 3, y + 3, w - 6, h - 6, THEME.green);                    // 内側の細線
    ctx.fillStyle = opt.fill || THEME.ivory; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    // 内線の角も欠く
    ctx.fillRect(x + 3, y + 3, 1, 1); ctx.fillRect(x + w - 4, y + 3, 1, 1);
    ctx.fillRect(x + 3, y + h - 4, 1, 1); ctx.fillRect(x + w - 4, y + h - 4, 1, 1);
  }

  // 窓の中の区切り線（説明パネル用）
  function rule(ctx, x, y, w) { ctx.fillStyle = '#b9c9b3'; ctx.fillRect(x, y, w, 1); }

  function cursor(ctx, x, y, color = THEME.green) {
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + 1 + i, 1, 7 - i * 2);
  }
  function moreArrow(ctx, x, y, frame) {
    if (Math.floor(frame / 16) % 2) return;
    ctx.fillStyle = THEME.green;
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 7 - i * 2, 1);
  }

  return { load, draw, width, wrap, box, rule, cursor, moreArrow, isReady: () => ready };
})();
