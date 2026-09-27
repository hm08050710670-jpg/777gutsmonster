// ============================================================
// タイトル画面
// ============================================================
class TitleScene {
  constructor() { this.overlay = false; this.sel = 0; this.menu = false; }
  update(frame) {
    if (!this.menu) {
      if (Input.pressed('a') || Input.pressed('start')) {
        this.menu = true;
        this.items = Save.exists() ? ['つづきから', 'はじめから'] : ['はじめから'];
      }
      return;
    }
    if (Input.pressed('up')) this.sel = (this.sel + this.items.length - 1) % this.items.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % this.items.length;
    if (Input.pressed('b')) { this.menu = false; return; }
    if (Input.pressed('a')) {
      const label = this.items[this.sel];
      if (label === 'つづきから') {
        Game.state = Save.load() || Save.newGame();
        Game.replace(new FieldScene());
      } else if (Save.exists()) {
        ask('セーブデータを けして\nはじめから はじめますか？', ['はい', 'いいえ'], i => {
          if (i === 0) { Game.state = Save.newGame(); Game.replace(new FieldScene()); }
        });
      } else {
        Game.state = Save.newGame();
        Game.replace(new FieldScene());
      }
    }
  }
  draw(ctx, frame) {
    ctx.fillStyle = PAL[0]; ctx.fillRect(0, 0, 160, 144);
    // ロゴ（仮）：太い二重線の枠にタイトル
    Text.box(ctx, 16, 24, 128, 40);
    Text.draw(ctx, 'GB RPG', 56, 34);
    Text.draw(ctx, 'SKELETON', 48, 46);
    // 3匹をならべる
    ['m_kokedama', 'm_hinokoro', 'm_shizukun'].forEach((s, i) => {
      const bob = Math.floor(frame / 20 + i) % 2;
      ctx.drawImage(Gfx.get(s, 2), 16 + i * 48, 72 + bob);
    });
    if (!this.menu) {
      if (Math.floor(frame / 30) % 2 === 0) Text.draw(ctx, 'PUSH START', 60, 124);
    } else {
      const h = this.items.length * 16 + 16;
      Text.box(ctx, 40, 136 - h - 8, 80, h);
      this.items.forEach((it, i) => {
        Text.draw(ctx, it, 56, 136 - h + i * 16);
        if (i === this.sel) Text.cursor(ctx, 48, 136 - h + i * 16);
      });
    }
    Text.draw(ctx, 'v0.1', 136, 136, 2);
  }
}
