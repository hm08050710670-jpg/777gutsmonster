// ============================================================
// タイトル画面 → 主人公設定（なまえ → せいべつ → プレビュー）
// ============================================================
class TitleScene {
  constructor() { this.overlay = false; this.sel = 0; this.menu = false; this.code = 0; this.debug = false; }
  enter() { Sound.stop(); }
  items() {
    const it = Save.exists() ? ['はじめから', 'つづきから', 'せってい'] : ['はじめから', 'せってい'];
    if (this.debug) it.push('バトルテスト', 'モンスターみる');
    return it;
  }
  // 裏技：タイトルで ↑↓B↓↓ → 「バトルテスト」が出る（いきなり野生戦。セーブは変えない）
  checkCode() {
    const seq = ['up', 'down', 'b', 'down', 'down'];
    const k = ['up', 'down', 'left', 'right', 'a', 'b', 'start'].find(x => Input.pressed(x));
    if (!k) return false;
    this.code = k === seq[this.code] ? this.code + 1 : (k === seq[0] ? 1 : 0);
    if (this.code >= seq.length) { this.code = 0; this.debug = true; this.menu = true; this.sel = this.items().length - 1; return true; }
    return false;
  }
  battleTest() {
    let st = Save.load();
    if (!st || !st.party.length) {
      st = Save.newGame('テスト', 'm');
      st.party = DATA.STARTERS.map(id => makeMonster(id, 7)); Party.full(st);
      st.items = { 'きずぐすり': 5 };
      st.flags = { labIntro: true, starter: true };
    }
    st.map = 'road'; st.x = 7; st.y = 5;
    Game.state = st;
    const ids = Object.keys(DATA.MONSTERS).filter(id => Mon.has(id));
    const enemy = makeMonster(ids[Game.rand(0, ids.length - 1)], Game.rand(5, 12));
    Game.replace(new FieldScene());
    Game.push(new BattleScene({ enemy, bg: Bg.pick('road', { random: true }), onEnd: () => Game.replace(new TitleScene()) }));
  }
  // 裏技：戦闘画面のレイアウトでモンスターの絵を見る（←→で切替）
  monsterView() {
    const st = Save.newGame('テスト', 'm');
    const id = Object.keys(DATA.MONSTERS)[0];
    st.party = [makeMonster(id, 10)]; Party.full(st); st.map = 'road';
    Game.state = st;
    Game.replace(new FieldScene());
    Game.push(new BattleScene({ enemy: makeMonster(id, 10), bg: 'fairway', viewer: true, onEnd: () => Game.replace(new TitleScene()) }));
  }
  update(frame) {
    if (this.checkCode()) return;
    if (!this.menu) {
      if (Input.pressed('a') || Input.pressed('start')) this.menu = true;
      return;
    }
    const it = this.items();
    if (Input.pressed('up')) this.sel = (this.sel + it.length - 1) % it.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % it.length;
    if (Input.pressed('b')) { this.menu = false; return; }
    if (Input.pressed('a')) {
      const label = it[this.sel];
      if (label === 'モンスターみる') {
        this.monsterView();
      } else if (label === 'バトルテスト') {
        this.battleTest();
      } else if (label === 'つづきから') {
        Game.state = Save.load() || Save.newGame();
        Game.replace(new FieldScene());
      } else if (label === 'せってい') {
        Game.push(new SettingsScene());
      } else if (Save.exists()) {
        ask('セーブデータを けして\nはじめから はじめますか？', ['はい', 'いいえ'], i => { if (i === 0) Game.push(new SetupScene()); });
      } else {
        Game.push(new SetupScene());
      }
    }
  }

  // 背景：カラーのゴルフコース（生成）
  drawBackground(ctx, frame) {
    const W = CONFIG.W, H = CONFIG.H;
    const sky = ctx.createLinearGradient(0, 0, 0, 90);
    sky.addColorStop(0, '#7cc4f2'); sky.addColorStop(1, '#dbeffb');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 90);
    // 遠くの丘
    ctx.fillStyle = '#7fc26a';
    ctx.beginPath(); ctx.ellipse(40, 96, 90, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(170, 100, 80, 26, 0, 0, Math.PI * 2); ctx.fill();
    // フェアウェイ
    ctx.fillStyle = '#5fae4b'; ctx.fillRect(0, 100, W, H - 100);
    ctx.fillStyle = '#6ebd59';
    for (let y = 100; y < H; y += 16) ctx.fillRect(0, y, W, 8);
    // 池
    ctx.fillStyle = '#4b93d8';
    ctx.beginPath(); ctx.ellipse(140, 150, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9fd0f2'; ctx.fillRect(126, 146, 10, 2); ctx.fillRect(150, 153, 8, 2);
    // 木
    [[8, 88], [28, 84], [160, 82], [178, 88], [4, 130], [60, 176]].forEach(([x, y]) => ctx.drawImage(Gfx.get('tree'), x, y));
    // 旗
    ctx.fillStyle = '#f4f1e8'; ctx.fillRect(96, 122, 1, 22);
    ctx.fillStyle = '#e04a3a'; ctx.fillRect(97, 122, 8, 6);
    ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.ellipse(92, 146, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  }

  draw(ctx, frame) {
    this.drawBackground(ctx, frame);
    // ロゴ
    const W = CONFIG.W;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(14, 22, W - 28, 44);
    Text.box(ctx, 12, 18, W - 24, 44);
    ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = THEME.greenDark; ctx.fillText(CONFIG.TITLE, W / 2 + 1, 27);
    ctx.fillStyle = '#e04a3a'; ctx.fillText(CONFIG.TITLE, W / 2, 26);
    ctx.textAlign = 'left';
    Text.draw(ctx, CONFIG.TAGLINE, W / 2 - Text.width(CONFIG.TAGLINE) / 2, 48, THEME.green);
    // 御三家
    DATA.STARTERS.forEach((id, i) => {
      const bob = Math.floor(frame / 20 + i) % 2;
      drawMonster(ctx, id, 26 + i * 52, 106 + bob, 24);
    });
    if (!this.menu) {
      if (Math.floor(frame / 30) % 2 === 0) {
        const t = 'PUSH START'; Text.box(ctx, W / 2 - 34, 168, 68, 20); Text.draw(ctx, t, W / 2 - Text.width(t) / 2, 174);
      }
    } else {
      const it = this.items(); const h = it.length * 16 + 16, w = 88;
      Text.box(ctx, W / 2 - w / 2, 200 - h - 8, w, h);
      it.forEach((label, i) => {
        Text.draw(ctx, label, W / 2 - w / 2 + 20, 200 - h + i * 16);
        if (i === this.sel) Text.cursor(ctx, W / 2 - w / 2 + 10, 200 - h + i * 16);
      });
    }
    Text.draw(ctx, 'v0.2', W - 22, CONFIG.H - 10, '#ffffff');
  }
}

// ---- 主人公設定 ----
class SetupScene {
  constructor() { this.overlay = false; this.step = 'name'; this.name = ''; this.gender = 'm'; this.sel = 0; this.asked = false; }
  enter() {
    UI.promptName(name => { this.name = name; this.step = 'gender'; });
  }
  update(frame) {
    if (this.step === 'name') return; // HTML入力待ち
    if (this.step === 'gender') {
      if (Input.pressed('left') || Input.pressed('right') || Input.pressed('up') || Input.pressed('down')) this.sel ^= 1;
      if (Input.pressed('a')) { this.gender = this.sel === 0 ? 'm' : 'f'; this.step = 'preview'; }
      return;
    }
    if (this.step === 'preview') {
      if (Input.pressed('b')) { this.step = 'gender'; return; }
      if (Input.pressed('a')) {
        const st = Save.newGame(this.name, this.gender);
        Game.state = st;
        Save.auto(st);
        Game.replace(new FieldScene());
      }
    }
  }
  draw(ctx, frame) {
    const W = CONFIG.W, H = CONFIG.H;
    ctx.fillStyle = THEME.ivory2; ctx.fillRect(0, 0, W, H);
    if (this.step === 'name') { Text.draw(ctx, '01. なまえを きめよう', 24, 24, THEME.green); return; }
    if (this.step === 'gender') {
      Text.draw(ctx, '02. せいべつを えらぼう', 24, 24, THEME.green);
      ['hm', 'hf'].forEach((g, i) => {
        const x = 40 + i * 80, y = 70;
        Text.box(ctx, x - 12, y - 12, 56, 64);
        ctx.drawImage(Gfx.get(`${g}_down0`, 2), x, y);
        const label = i === 0 ? 'だんせい' : 'じょせい';
        Text.draw(ctx, label, x + 16 - Text.width(label) / 2, y + 40);
        if (this.sel === i) Text.cursor(ctx, x - 6, y + 40);
      });
      Text.box(ctx, 0, H - 40, W, 40);
      Text.draw(ctx, `${this.name}、どちらで 冒険する？`, 10, H - 26);
      return;
    }
    // preview
    Text.draw(ctx, '03. この主人公で いく？', 24, 24, THEME.green);
    Text.box(ctx, W / 2 - 40, 48, 80, 96);
    ctx.drawImage(Gfx.get(`${this.gender === 'f' ? 'hf' : 'hm'}_down0`, 4), W / 2 - 32, 60);
    Text.draw(ctx, this.name, W / 2 - Text.width(this.name) / 2, 128);
    Text.box(ctx, 0, H - 40, W, 40);
    Text.draw(ctx, 'A: この主人公で 冒険をはじめる', 10, H - 30);
    Text.draw(ctx, 'B: もどる', 10, H - 18, THEME.textDim);
  }
}
