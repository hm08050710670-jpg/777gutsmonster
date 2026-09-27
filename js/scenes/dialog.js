// ============================================================
// メッセージウィンドウ（文字送り・ページ送り・はい/いいえ）
//   new DialogScene({ text, onDone, choices, onChoice, box })
//   box: {x,y,w,h} 省略時は画面下 20x6 マス
// ============================================================
class DialogScene {
  constructor(opt) {
    this.overlay = true;
    this.text = opt.text || '';
    this.onDone = opt.onDone || null;
    this.choices = opt.choices || null;   // 例: ['はい','いいえ']
    this.onChoice = opt.onChoice || null;
    this.box = opt.box || { x: 0, y: 96, w: 160, h: 48 };
    this.lineY = [this.box.y + 12, this.box.y + 28];
    this.textX = this.box.x + 8;
    this.instant = !!opt.instant;

    const maxW = this.box.w - 16;
    this.lines = Text.wrap(this.text, maxW);
    this.page = 0;           // 表示中ページ（2行単位）
    this.chars = 0;          // 現在ページで表示済みの文字数
    this.tick = 0;
    this.choosing = false;
    this.sel = 0;
  }
  pageLines() { return this.lines.slice(this.page * 2, this.page * 2 + 2); }
  pageTotal() { return this.pageLines().reduce((n, l) => n + [...l].length, 0); }
  isLastPage() { return (this.page + 1) * 2 >= this.lines.length; }

  update(frame) {
    if (this.choosing) {
      if (Input.pressed('up')) this.sel = Math.max(0, this.sel - 1);
      if (Input.pressed('down')) this.sel = Math.min(this.choices.length - 1, this.sel + 1);
      if (Input.pressed('a')) { const i = this.sel; Game.pop(); this.onChoice && this.onChoice(i); }
      if (Input.pressed('b')) { const i = this.choices.length - 1; Game.pop(); this.onChoice && this.onChoice(i); }
      return;
    }
    const total = this.pageTotal();
    if (this.chars < total) {
      // Bかを押していると高速送り
      const speed = (Input.down('a') || Input.down('b') || this.instant) ? 0 : CONFIG.TEXT_SPEED;
      if (++this.tick >= speed) { this.tick = 0; this.chars++; }
      return;
    }
    // 最終ページで選択肢がある場合は、文字送り完了と同時に選択肢を出す
    if (this.choices && this.isLastPage()) { this.choosing = true; return; }
    if (Input.pressed('a') || Input.pressed('b')) {
      if (!this.isLastPage()) { this.page++; this.chars = 0; return; }
      Game.pop();
      this.onDone && this.onDone();
    }
  }

  draw(ctx, frame) {
    const b = this.box;
    Text.box(ctx, b.x, b.y, b.w, b.h);
    let remain = this.chars;
    const pl = this.pageLines();
    pl.forEach((line, i) => {
      const cs = [...line];
      const show = cs.slice(0, Math.max(0, remain)).join('');
      remain -= cs.length;
      Text.draw(ctx, show, this.textX, this.lineY[i]);
    });
    if (this.chars >= this.pageTotal() && !this.isLastPage()) {
      Text.moreArrow(ctx, b.x + b.w - 16, b.y + b.h - 10, frame);
    }
    if (this.choosing) {
      const cw = 56, ch = this.choices.length * 16 + 16;
      const cx = 160 - cw, cy = b.y - ch;
      Text.box(ctx, cx, cy, cw, ch);
      this.choices.forEach((c, i) => {
        Text.draw(ctx, c, cx + 16, cy + 8 + i * 16);
        if (i === this.sel) Text.cursor(ctx, cx + 8, cy + 8 + i * 16);
      });
    }
  }
}

// 短縮ヘルパ
function say(text, onDone) { Game.push(new DialogScene({ text, onDone })); }
function ask(text, choices, onChoice) { Game.push(new DialogScene({ text, choices, onChoice })); }
