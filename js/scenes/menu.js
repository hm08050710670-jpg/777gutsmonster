// ============================================================
// 汎用メニュー ＋ メニュー／なかま／もちもの／せってい
// ============================================================
class MenuScene {
  constructor(opt) {
    this.overlay = true;
    this.items = opt.items;
    this.x = opt.x ?? CONFIG.W - 84; this.y = opt.y ?? 4;
    this.w = opt.w ?? 80;
    this.h = this.items.length * 16 + 16;
    this.onCancel = opt.onCancel || null;
    this.sel = 0;
  }
  update() {
    if (Input.pressed('up')) this.sel = (this.sel + this.items.length - 1) % this.items.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % this.items.length;
    if (Input.pressed('a')) { const it = this.items[this.sel]; if (!it.disabled) it.action(this); }
    if (Input.pressed('b') || (Input.pressed('start') && this.isStartMenu)) { Game.pop(); this.onCancel && this.onCancel(); }
  }
  draw(ctx) {
    Text.box(ctx, this.x, this.y, this.w, this.h);
    this.items.forEach((it, i) => {
      Text.draw(ctx, it.label, this.x + 18, this.y + 8 + i * 16, it.disabled ? THEME.textDim : THEME.text);
      if (i === this.sel) Text.cursor(ctx, this.x + 9, this.y + 8 + i * 16);
    });
  }
}

function openStartMenu() {
  const st = Game.state;
  const m = new MenuScene({
    items: [
      { label: 'なかま', action: () => Game.push(new PartyScene()), disabled: st.party.length === 0 },
      { label: 'もちもの', action: () => Game.push(new ItemScene({ inBattle: false })) },
      { label: 'せってい', action: () => Game.push(new SettingsScene()) },
      { label: 'セーブ', action: () => {
          Game.pop();
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

// ---- せってい ----
class SettingsScene {
  constructor() { this.overlay = true; this.sel = 0; }
  items() {
    const s = Game.state ? Game.state.settings : { textSpeed: CONFIG.TEXT_SPEED };
    return [
      { label: `もじの はやさ：${s.textSpeed <= 1 ? 'はやい' : 'ふつう'}`, action: () => { s.textSpeed = s.textSpeed <= 1 ? 2 : 1; } },
      { label: `BGM：${s.bgm === false ? 'OFF' : 'ON'}`, action: () => { s.bgm = s.bgm === false; Sound.setEnabled(s.bgm); } },
      { label: 'とじる', action: () => Game.pop() },
    ];
  }
  update() {
    const it = this.items();
    if (Input.pressed('up')) this.sel = (this.sel + it.length - 1) % it.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % it.length;
    if (Input.pressed('a')) it[this.sel].action();
    if (Input.pressed('b')) Game.pop();
  }
  draw(ctx) {
    const it = this.items();
    const w = 150, h = it.length * 16 + 16, x = (CONFIG.W - w) / 2, y = 40;
    Text.box(ctx, x, y, w, h);
    it.forEach((o, i) => {
      Text.draw(ctx, o.label, x + 18, y + 8 + i * 16);
      if (i === this.sel) Text.cursor(ctx, x + 9, y + 8 + i * 16);
    });
  }
}

// ---- なかま一覧 ----
class PartyScene {
  constructor(opt = {}) { this.overlay = false; this.onPick = opt.onPick || null; this.sel = 0; }
  update() {
    const p = Game.state.party;
    if (!p.length) { Game.pop(); return; }
    if (Input.pressed('up')) this.sel = (this.sel + p.length - 1) % p.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % p.length;
    if (Input.pressed('b')) { Game.pop(); return; }
    if (Input.pressed('a')) {
      if (this.onPick) { const i = this.sel; Game.pop(); this.onPick(i); }
      else { const m = p[this.sel]; say(`${m.name}  Lv${m.level}\nHP ${m.hp}/${m.maxHp}  タイプ:${m.type}`); }
    }
  }
  draw(ctx) {
    ctx.fillStyle = THEME.ivory2; ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
    Text.draw(ctx, 'なかま', 12, 8, THEME.green);
    Game.state.party.forEach((m, i) => {
      const y = 22 + i * 40;
      Text.box(ctx, 8, y, CONFIG.W - 16, 36);
      drawMonster(ctx, m, 14, y + 6, 24);
      Text.draw(ctx, m.name, 44, y + 8);
      Text.draw(ctx, `Lv${m.level}`, 124, y + 8);
      drawHpBar(ctx, 52, y + 22, 64, m.hp, m.maxHp);
      Text.draw(ctx, `${String(m.hp).padStart(3)}/${String(m.maxHp).padStart(3)}`, 124, y + 19);
      if (i === this.sel) Text.cursor(ctx, 2, y + 12);
    });
    Text.box(ctx, 0, CONFIG.H - 32, CONFIG.W, 32);
    Text.draw(ctx, this.onPick ? 'だれに つかう？' : 'Aで くわしく  Bで もどる', 10, CONFIG.H - 20);
  }
}

// ---- もちもの ----
class ItemScene {
  constructor(opt = {}) {
    this.overlay = true;
    this.inBattle = !!opt.inBattle;
    this.onUse = opt.onUse || null;
    this.sel = 0;
  }
  list() { return Object.entries(Game.state.items).filter(([, n]) => n > 0); }
  update() {
    const L = this.list();
    const n = L.length + 1;
    if (Input.pressed('up')) this.sel = (this.sel + n - 1) % n;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % n;
    if (Input.pressed('b') || (Input.pressed('a') && this.sel === L.length)) { Game.pop(); return; }
    if (Input.pressed('a')) {
      const [name] = L[this.sel];
      if (this.inBattle) { Game.pop(); this.onUse && this.onUse(name); return; }
      if (!Game.state.party.length) { say('まだ なかまが いない。'); return; }
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
    const h = (L.length + 1) * 16 + 16, w = 116, x = CONFIG.W - w - 4;
    Text.box(ctx, x, 4, w, h);
    L.forEach(([name, n], i) => {
      Text.draw(ctx, name, x + 18, 12 + i * 16);
      Text.draw(ctx, `x${n}`, x + w - 22, 12 + i * 16, THEME.textDim);
    });
    Text.draw(ctx, 'やめる', x + 18, 12 + L.length * 16);
    Text.cursor(ctx, x + 9, 12 + this.sel * 16);
  }
}

// ---- モンスターの絵（図鑑スプライト優先、無ければ文字列アート）----
//   x,y は左上。size は論理px（24=等倍, 48=戦闘）。
function drawMonster(ctx, m, x, y, size = 24, flip = false) {
  const id = m.id || m;
  if (Mon.draw(ctx, id, x, y, size / 24, flip)) return;
  const sp = DATA.MONSTERS[id] && DATA.MONSTERS[id].sprite;
  if (sp) ctx.drawImage(Gfx.get(sp, Math.max(1, Math.round(size / 24)), flip), x, y);
}

// ---- HPバー ----
function drawHpBar(ctx, x, y, w, hp, max) {
  ctx.fillStyle = THEME.greenDark; ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = THEME.ivory2; ctx.fillRect(x + 1, y + 1, w - 2, 3);
  const r = Math.max(0, hp / max);
  const fill = Math.ceil((w - 2) * r);
  ctx.fillStyle = r > 0.5 ? THEME.hpHigh : (r > 0.2 ? THEME.hpMid : THEME.hpLow);
  if (fill > 0) ctx.fillRect(x + 1, y + 1, fill, 3);
}
