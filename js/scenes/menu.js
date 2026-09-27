// ============================================================
// 汎用メニュー（縦並び・カーソル）＋ スタートメニュー／なかま／もちもの
// ============================================================
class MenuScene {
  // opt: { items:[{label, action, disabled}], x,y,w, onCancel, wrapCancel, keep }
  constructor(opt) {
    this.overlay = true;
    this.items = opt.items;
    this.x = opt.x ?? 80; this.y = opt.y ?? 0;
    this.w = opt.w ?? 80;
    this.h = this.items.length * 16 + 16;
    this.onCancel = opt.onCancel || null;
    this.sel = 0;
    this.title = opt.title || null;
  }
  update() {
    if (Input.pressed('up')) this.sel = (this.sel + this.items.length - 1) % this.items.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % this.items.length;
    if (Input.pressed('a')) {
      const it = this.items[this.sel];
      if (!it.disabled) it.action(this);
    }
    if (Input.pressed('b') || (Input.pressed('start') && this.isStartMenu)) {
      Game.pop(); this.onCancel && this.onCancel();
    }
  }
  draw(ctx) {
    Text.box(ctx, this.x, this.y, this.w, this.h);
    this.items.forEach((it, i) => {
      Text.draw(ctx, it.label, this.x + 16, this.y + 8 + i * 16, it.disabled ? 2 : 3);
      if (i === this.sel) Text.cursor(ctx, this.x + 8, this.y + 8 + i * 16);
    });
  }
}

// ---- スタートメニュー（初代風：右上）----
function openStartMenu() {
  const st = Game.state;
  const m = new MenuScene({
    x: 80, y: 0, w: 80,
    items: [
      { label: 'なかま', action: () => Game.push(new PartyScene()) },
      { label: 'もちもの', action: () => Game.push(new ItemScene({ inBattle: false })) },
      { label: 'セーブ', action: () => {
          Game.pop(); // 初代同様、メニューを閉じてから確認
          ask('セーブ しますか？', ['はい', 'いいえ'], i => {
            if (i === 0) say(Save.store(st) ? 'セーブ しました。' : 'セーブに しっぱい しました。');
          });
      } },
      { label: 'とじる', action: () => Game.pop() },
    ],
  });
  m.isStartMenu = true;
  Game.push(m);
}

// ---- なかま一覧（全画面）----
class PartyScene {
  // opt: { onPick(index) } を渡すと選択モード（アイテム対象など）
  constructor(opt = {}) {
    this.overlay = false;
    this.onPick = opt.onPick || null;
    this.sel = 0;
  }
  update() {
    const p = Game.state.party;
    if (Input.pressed('up')) this.sel = (this.sel + p.length - 1) % p.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % p.length;
    if (Input.pressed('b')) { Game.pop(); return; }
    if (Input.pressed('a')) {
      if (this.onPick) { const i = this.sel; Game.pop(); this.onPick(i); }
      else {
        const m = p[this.sel];
        say(`${m.name}  Lv${m.level}\nHP ${m.hp}/${m.maxHp}  タイプ:${m.type}`);
      }
    }
  }
  draw(ctx) {
    ctx.fillStyle = PAL[0]; ctx.fillRect(0, 0, 160, 144);
    Game.state.party.forEach((m, i) => {
      const y = 8 + i * 24;
      ctx.drawImage(Gfx.get(m.id ? DATA.MONSTERS[m.id].sprite : 'm_back'), 16, y);
      Text.draw(ctx, m.name, 40, y);
      Text.draw(ctx, `Lv${m.level}`, 120, y);
      drawHpBar(ctx, 48, y + 12, 56, m.hp, m.maxHp);
      Text.draw(ctx, `${String(m.hp).padStart(3)}/${String(m.maxHp).padStart(3)}`, 112, y + 10);
      if (i === this.sel) Text.cursor(ctx, 4, y + 4);
    });
    Text.box(ctx, 0, 112, 160, 32);
    Text.draw(ctx, this.onPick ? 'だれに つかう？' : 'なかまを えらんでください', 8, 124);
  }
}

// ---- もちもの ----
class ItemScene {
  constructor(opt = {}) {
    this.overlay = true;
    this.inBattle = !!opt.inBattle;
    this.onUse = opt.onUse || null;  // 戦闘中：(itemName) => void
    this.sel = 0;
  }
  list() { return Object.entries(Game.state.items).filter(([, n]) => n > 0); }
  update() {
    const L = this.list();
    const n = L.length + 1; // 「やめる」
    if (Input.pressed('up')) this.sel = (this.sel + n - 1) % n;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % n;
    if (Input.pressed('b') || (Input.pressed('a') && this.sel === L.length)) { Game.pop(); return; }
    if (Input.pressed('a')) {
      const [name] = L[this.sel];
      if (this.inBattle) { Game.pop(); this.onUse && this.onUse(name); return; }
      Game.push(new PartyScene({ onPick: i => {
        const m = Game.state.party[i];
        if (m.hp >= m.maxHp) { say(`${m.name}の HPは まんたんだ。`); return; }
        m.hp = Math.min(m.maxHp, m.hp + DATA.ITEMS[name].heal);
        Game.state.items[name]--;
        say(`${m.name}の HPが かいふくした！`);
      } }));
    }
  }
  draw(ctx) {
    const L = this.list();
    const h = (L.length + 1) * 16 + 16;
    Text.box(ctx, 48, 0, 112, h);
    L.forEach(([name, n], i) => {
      Text.draw(ctx, name, 64, 8 + i * 16);
      Text.draw(ctx, `x${n}`, 136, 8 + i * 16);
    });
    Text.draw(ctx, 'やめる', 64, 8 + L.length * 16);
    Text.cursor(ctx, 56, 8 + this.sel * 16);
  }
}

// ---- HPバー（初代風：黒枠に太いバー）----
function drawHpBar(ctx, x, y, w, hp, max) {
  ctx.fillStyle = PAL[3];
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = PAL[0];
  ctx.fillRect(x + 1, y + 1, w - 2, 2);
  const r = Math.max(0, hp / max);
  const fill = Math.ceil((w - 2) * r);
  ctx.fillStyle = PAL[r > 0.5 ? 3 : (r > 0.2 ? 2 : 1)];
  if (fill > 0) ctx.fillRect(x + 1, y + 1, fill, 2);
}
