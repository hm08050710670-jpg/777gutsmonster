// ============================================================
// メッセージウィンドウ（文字送り・ページ送り・はい/いいえ・話者名）
//   new DialogScene({ text, name, onDone, choices, onChoice, box })
// ============================================================
class DialogScene {
  constructor(opt) {
    this.overlay = true;
    this.text = opt.text || '';
    this.name = opt.name || null;
    this.onDone = opt.onDone || null;
    this.choices = opt.choices || null;
    this.onChoice = opt.onChoice || null;
    this.box = opt.box || { x: 0, y: CONFIG.H - 56, w: CONFIG.W, h: 56 };
    this.lineY = this.box.h < 48 ? [this.box.y + 6, this.box.y + 17] : [this.box.y + 14, this.box.y + 30];
    this.textX = this.box.x + 10;
    this.instant = !!opt.instant;
    this.lines = Text.wrap(this.text, this.box.w - 20);
    this.page = 0; this.chars = 0; this.tick = 0;
    this.choosing = false; this.sel = 0;
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
      const base = (Game.state && Game.state.settings) ? Game.state.settings.textSpeed : CONFIG.TEXT_SPEED;
      const speed = (Input.down('a') || Input.down('b') || this.instant) ? 0 : base;
      if (++this.tick >= speed) { this.tick = 0; this.chars++; }
      return;
    }
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
    if (this.name) {
      const w = Text.width(this.name) + 12;
      Text.box(ctx, b.x + 6, b.y - 12, w, 18);
      Text.draw(ctx, this.name, b.x + 12, b.y - 7, THEME.green);
    }
    let remain = this.chars;
    this.pageLines().forEach((line, i) => {
      const cs = [...line];
      const show = cs.slice(0, Math.max(0, remain)).join('');
      remain -= cs.length;
      Text.draw(ctx, show, this.textX, this.lineY[i]);
    });
    if (this.chars >= this.pageTotal() && !this.isLastPage()) {
      Text.moreArrow(ctx, b.x + b.w - 16, b.y + b.h - 11, frame);
    }
    if (this.choosing) {
      const cw = 60, ch = this.choices.length * 16 + 16;
      const cx = b.x + b.w - cw - 4, cy = b.y - ch - 2;
      Text.box(ctx, cx, cy, cw, ch);
      this.choices.forEach((c, i) => {
        Text.draw(ctx, c, cx + 18, cy + 8 + i * 16);
        if (i === this.sel) Text.cursor(ctx, cx + 9, cy + 8 + i * 16);
      });
    }
  }
}

function say(text, onDone, name) { Game.push(new DialogScene({ text, onDone, name })); }
function ask(text, choices, onChoice, name) { Game.push(new DialogScene({ text, choices, onChoice, name })); }
