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
    this.overlay = false;   // 全画面（一覧＋説明＋問いかけ）
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
    const L = this.list(), W = CONFIG.W, H = CONFIG.H;
    ctx.fillStyle = THEME.greenDark; ctx.fillRect(0, 0, W, H);
    // 左：一覧（名前 × 個数）
    const lx = 4, ly = 6, lw = 118, lh = 140;
    Text.box(ctx, lx, ly, lw, lh);
    const rowY = i => ly + 10 + i * 14;
    L.forEach(([name, n], i) => {
      Text.draw(ctx, name, lx + 16, rowY(i));
      const c = `× ${String(n).padStart(2)}`;
      Text.draw(ctx, c, lx + lw - 8 - Text.width(c), rowY(i));
    });
    Text.draw(ctx, 'やめる', lx + 16, rowY(L.length));
    Text.cursor(ctx, lx + 7, rowY(this.sel));
    // 右：説明
    const dx = 126, dw = 62;
    Text.box(ctx, dx, ly, dw, lh);
    if (this.sel < L.length) {
      const [name, n] = L[this.sel], it = DATA.ITEMS[name] || {};
      let y = ly + 8;
      Text.wrap(name, dw - 12).forEach(l => { Text.draw(ctx, l, dx + 6, y); y += 10; });
      Text.rule(ctx, dx + 5, y + 2, dw - 10); y += 8;
      Text.wrap(it.desc || '', dw - 12).forEach(l => { Text.draw(ctx, l, dx + 6, y); y += 10; });
      Text.rule(ctx, dx + 5, y + 2, dw - 10); y += 8;
      Text.draw(ctx, 'もっている', dx + 6, y);
      Text.draw(ctx, 'かず', dx + 6, y + 10);
      Text.draw(ctx, String(n), dx + dw - 6 - Text.width(String(n)), y + 10);
    } else {
      Text.draw(ctx, 'もちものを', dx + 6, ly + 8, THEME.textDim);
      Text.draw(ctx, 'とじる', dx + 6, ly + 18, THEME.textDim);
    }
    // 下：問いかけ
    Text.box(ctx, 0, H - 56, W, 56);
    Text.draw(ctx, this.inBattle ? 'どの どうぐを つかいますか？' : 'どの どうぐを つかう？', 8, H - 42);
  }
}

// ---- モンスターの絵（図鑑スプライト優先、無ければ文字列アート）----
//   x,y は左上。size は論理px（24=等倍, 48=戦闘）。
//   back=true で後ろ姿（戦闘の自分側）。後ろ姿の素材が無ければ正面を反転して使う
function drawMonster(ctx, m, x, y, size = 24, flip = false, back = false) {
  const id = m.id || m;
  if (Mon.draw(ctx, id, x, y, size / 24, flip, back)) return;
  const sp = DATA.MONSTERS[id] && DATA.MONSTERS[id].sprite;
  if (sp) ctx.drawImage(Gfx.get(sp, Math.max(1, Math.round(size / 24)), flip), x, y);
}

// ---- HPバー ----
function drawHpBar(ctx, x, y, w, hp, max, big = false) {
  const h = big ? 7 : 5;
  ctx.fillStyle = THEME.greenDark; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = THEME.ivory; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  const r = Math.max(0, hp / max);
  const fill = Math.ceil((w - 2) * r);
  ctx.fillStyle = r > 0.5 ? THEME.hpHigh : (r > 0.2 ? THEME.hpMid : THEME.hpLow);
  if (fill > 0) {
    ctx.fillRect(x + 1, y + 1, fill, h - 2);
    if (big) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1, y + 1, fill, 1); }  // ハイライト
  }
}
