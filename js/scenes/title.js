// ============================================================
// タイトル画面 → 主人公設定（なまえ → せいべつ → プレビュー）
// ============================================================
class TitleScene {
  constructor() { this.overlay = false; this.sel = 0; this.menu = false; this.code = 0; this.debug = false; }
  enter() { Sound.stop(); }
  items() {
    const it = Save.exists() ? ['はじめから', 'つづきから', 'せってい'] : ['はじめから', 'せってい'];
    if (this.debug) it.push('バトルテスト', 'モンスターみる', 'ガッツタウンへ', 'ガーデンプレースへ', 'コースへ');
    return it;
  }
  // 裏技：タイトルで ↑↓B↓↓ → 「バトルテスト」「モンスターみる」「ガッツタウンへ」「ガーデンプレースへ」「コースへ」が出る（セーブは変えない）
  checkCode() {
    const seq = ['up', 'down', 'b', 'down', 'down'];
    const k = ['up', 'down', 'left', 'right', 'a', 'b', 'start'].find(x => Input.pressed(x));
    if (!k) return false;
    this.code = k === seq[this.code] ? this.code + 1 : (k === seq[0] ? 1 : 0);
    if (this.code >= seq.length) { this.code = 0; this.debug = true; this.menu = true; this.sel = this.items().length - 5; return true; }
    return false;
  }
  // 裏技：町へワープ。セーブがあればその手持ちで、無ければテスト用パーティで
  warpTo(map, x, y) {
    let st = Save.load();
    if (!st || !st.party.length) {
      st = Save.newGame('テスト', 'm');
      st.party = ['kokegame', 'hinoshishi', 'amepiyo'].filter(id => DATA.MONSTERS[id]).map(id => makeMonster(id, 10)); Party.full(st);
      st.items = { 'きずぐすり': 5, 'ガッツボール': 10 }; st.flags = { labIntro: true, starter: true, rival1: true };
    }
    st.map = map; st.x = x; st.y = y; st.dir = 'down';
    Game.state = st;
    Game.replace(new FieldScene());
  }
  battleTest() {
    // テスト用：ランダムな1匹（戦うのは先頭の1匹）＋控え2匹。レベルは少し高め
    const st = Save.newGame('テスト', 'm');
    const all = Object.keys(DATA.MONSTERS).filter(id => Mon.has(id));
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Game.rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    st.party = shuffle(all.slice()).slice(0, 3).map(id => makeMonster(id, 10)); Party.full(st);
    st.items = { 'きずぐすり': 5, 'ガッツボール': 10 };
    st.flags = { labIntro: true, starter: true };
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
    const b = new BattleScene({ enemy: makeMonster(id, 10), bg: 'fairway', viewer: true, onEnd: () => Game.replace(new TitleScene()) });
    b.shuffleParty();
    Game.push(b);
  }
  update(frame) {
    if (this.checkCode()) return;
    if (!this.menu) {
      // メニューを開いたとき、つづきがあれば「つづきから」にカーソル（Aですぐ再開できる）
      if (Input.pressed('a') || Input.pressed('start')) { this.menu = true; this.sel = Save.exists() ? 1 : 0; }
      return;
    }
    const it = this.items();
    if (Input.pressed('up')) this.sel = (this.sel + it.length - 1) % it.length;
    if (Input.pressed('down')) this.sel = (this.sel + 1) % it.length;
    if (Input.pressed('b')) { this.menu = false; return; }
    if (Input.pressed('a')) {
      const label = it[this.sel];
      if (label === 'ガッツタウンへ') {
        this.warpTo('town', 13, 10);
      } else if (label === 'ガーデンプレースへ') {
        this.warpTo('town2', 9, 10);
      } else if (label === 'コースへ') {
        this.warpTo('plaza', 9, 9);
      } else if (label === 'モンスターみる') {
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
    const art = Bg.get('title');
    if (art) { this.drawArt(ctx, art, frame); return; }
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
      const it = this.items(); const h = it.length * 16 + 16, w = this.debug ? 116 : 88;
      Text.box(ctx, W / 2 - w / 2, 200 - h - 8, w, h);
      it.forEach((label, i) => {
        Text.draw(ctx, label, W / 2 - w / 2 + 20, 200 - h + i * 16);
        if (i === this.sel) Text.cursor(ctx, W / 2 - w / 2 + 10, 200 - h + i * 16);
      });
    }
    Text.draw(ctx, 'v0.2', W - 22, CONFIG.H - 10, '#ffffff');
  }
  // タイトル絵（assets/bg/title.png 1024×1536、縦長）：横幅に合わせて拡大し、縦は中央を基準に切り出す（端末の縦横比で上下が少し切れる）。
  //   メニュー枠は絵のロゴ下（元絵 y≈680px）に合わせて置く
  drawArt(ctx, art, frame) {
    const W = CONFIG.W, H = CONFIG.H;
    const k = W / art.width, srcH = H / k, top = Math.max(0, (art.height - srcH) / 2);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(art, 0, top, art.width, srcH, 0, 0, W, H);
    ctx.restore();
    const bw = 72, bx = Math.round(W / 2 - bw / 2), by = Math.round((680 - top) * k);
    if (!this.menu) {
      Text.box(ctx, bx, by, bw, 38);
      if (Math.floor(frame / 30) % 2 === 0) { const t = 'PUSH START'; Text.draw(ctx, t, bx + bw / 2 - Text.width(t) / 2, by + 15); }
    } else {
      const it = this.items(); const h = it.length * 14 + 12, w = this.debug ? 116 : bw, x = this.debug ? W / 2 - 58 : bx;
      Text.box(ctx, x, by, w, h);
      it.forEach((label, i) => {
        Text.draw(ctx, label, x + 20, by + 7 + i * 14);
        if (i === this.sel) Text.cursor(ctx, x + 10, by + 7 + i * 14);
      });
    }
  }
}

// ---- 主人公設定 ----
class SetupScene {
  constructor() { this.overlay = false; this.step = 'pick'; this.name = ''; this.gender = 'm'; this.sel = 0; this.pickSel = 0; this.asked = false; }
  static get PRESETS() { return ['ガッツ', 'じぶんで つける']; }   // 先頭が基本の名前
  static get CARD() { return { x: 24, w: CONFIG.W - 48, h: 40, gap: 12 }; }
  enter() { this.kb = new NameKeyboard(name => { this.name = name; this.step = 'gender'; }); }
  // 主人公の絵(32)＋余白12＋カード2枚＋余白14＋案内(8) をタイトル下の領域の中央に置く
  pickTop() { const C = SetupScene.CARD, n = SetupScene.PRESETS.length; return 24 + Math.round(((CONFIG.H - 24) - (32 + 12 + n * C.h + (n - 1) * C.gap + 22)) / 2); }
  pickRowY(i) { const C = SetupScene.CARD; return this.pickTop() + 44 + i * (C.h + C.gap); }
  pick(i) {
    const P = SetupScene.PRESETS;
    if (i === P.length - 1) { this.step = 'name'; return; }
    this.name = P[i]; this.step = 'gender';
  }
  tap(x, y) {
    if (this.step === 'name') return this.kb.tap(x, y);
    if (this.step === 'pick') { const C = SetupScene.CARD; SetupScene.PRESETS.forEach((_, i) => { const cy = this.pickRowY(i); if (x >= C.x && x < C.x + C.w && y >= cy && y < cy + C.h) { this.pickSel = i; this.pick(i); } }); }
  }
  update(frame) {
    if (this.step === 'pick') {
      const n = SetupScene.PRESETS.length;
      if (Input.pressed('up')) this.pickSel = (this.pickSel + n - 1) % n;
      if (Input.pressed('down')) this.pickSel = (this.pickSel + 1) % n;
      if (Input.pressed('a')) this.pick(this.pickSel);
      return;
    }
    if (this.step === 'name') { this.kb.update(frame); if (Input.pressed('b') && !this.kb.name) this.step = 'pick'; return; }
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
    if (this.step === 'pick') {
      Text.draw(ctx, '01. なまえを きめよう', 24, 8, THEME.green);
      const C = SetupScene.CARD, subs = ['きほんの なまえで はじめる', 'すきな なまえを いれる'];
      ctx.drawImage(Gfx.get('hm_down0', 2), W / 2 - 16, this.pickTop());   // 主人公（性別は次で選ぶ）
      SetupScene.PRESETS.forEach((nm, i) => {
        const y = this.pickRowY(i), sel = this.pickSel === i;
        Text.box(ctx, C.x, y, C.w, C.h);
        if (sel) { ctx.fillStyle = '#dfe9d2'; ctx.fillRect(C.x + 4, y + 4, C.w - 8, C.h - 8); }
        Text.draw(ctx, nm, C.x + 20, y + 9, sel ? THEME.green : THEME.text);
        Text.draw(ctx, subs[i], C.x + 20, y + 22, THEME.textDim);
        if (sel) Text.cursor(ctx, C.x + 9, y + 9);
      });
      const hint = Math.floor(frame / 120) % 2 ? 'タップしても えらべるよ' : 'A: これにする';
      Text.draw(ctx, hint, W / 2 - Text.width(hint) / 2, this.pickRowY(SetupScene.PRESETS.length - 1) + C.h + 14, THEME.textDim);
      return;
    }
    if (this.step === 'name') { this.kb.draw(ctx, frame); return; }
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

// ---- 名前入力（ゲーム内の50音キーボード。十字キー＋A/B、画面のタップでも選べる） ----
class NameKeyboard {
  constructor(cb) {
    this.cb = cb; this.name = ''; this.col = 0; this.row = 0; this.kata = false; this.msg = 0;
    this.cols = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'やゆよっー', 'らりるれろ', 'わをん゛゜'];
    this.btns = ['ちいさく', 'カタカナ', 'けす'];   // row 5
    this.X0 = 16; this.Y0 = 52; this.CW = 16; this.CH = 16; this.MAX = 8;
  }
  key(c, r) { let ch = this.cols[c][r]; if (this.kata && ch >= 'ぁ' && ch <= 'ゖ') ch = String.fromCharCode(ch.charCodeAt(0) + 0x60); return ch; }
  // 直前の文字を変える：゛゜は結合文字で合成／解除、小は小書き文字と入れ替え
  modify(kind) {
    if (!this.name) return;
    const chars = [...this.name], last = chars.pop(); let out = last;
    if (kind === '゛' || kind === '゜') {
      const mark = kind === '゛' ? '゙' : '゚', base = last.normalize('NFD').replace(/[゙゚]/g, ''), has = last.normalize('NFD').includes(mark);
      out = has ? base : (base + mark).normalize('NFC'); if ([...out].length > 1) out = last;   // 合成できない字はそのまま
    } else {
      const big = 'あいうえおつやゆよわアイウエオツヤユヨワ', small = 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ';
      const i = big.indexOf(last), j = small.indexOf(last); out = i >= 0 ? small[i] : j >= 0 ? big[j] : last;
    }
    chars.push(out); this.name = chars.join('');
  }
  put(ch) {
    if (ch === '゛' || ch === '゜') return this.modify(ch);
    if ([...this.name].length >= this.MAX) { this.msg = 40; return; }
    this.name += ch;
  }
  act() {
    if (this.row < 5) return this.put(this.key(this.col, this.row));
    if (this.row === 5) { const b = this.btnAt(this.col); if (b === 0) this.modify('小'); else if (b === 1) this.kata = !this.kata; else this.name = [...this.name].slice(0, -1).join(''); return; }
    this.finish();
  }
  finish() { if (!this.name) { this.msg = 60; return; } this.cb(this.name); }
  btnAt(col) { return Math.min(2, Math.floor(col / 3.4)); }
  update(frame) {
    if (this.msg > 0) this.msg--;
    if (Input.pressed('left')) this.col = (this.col + 9) % 10;
    if (Input.pressed('right')) this.col = (this.col + 1) % 10;
    if (Input.pressed('up')) this.row = (this.row + 6) % 7;
    if (Input.pressed('down')) this.row = (this.row + 1) % 7;
    if (Input.pressed('a')) this.act();
    if (Input.pressed('b')) this.name = [...this.name].slice(0, -1).join('');
  }
  tap(x, y) {
    const { X0, Y0, CW, CH } = this;
    if (y >= Y0 && y < Y0 + CH * 5 && x >= X0 && x < X0 + CW * 10) { this.col = Math.floor((x - X0) / CW); this.row = Math.floor((y - Y0) / CH); return this.act(); }
    const by = Y0 + CH * 5 + 4;
    if (y >= by && y < by + 16) { const i = Math.floor((x - X0) / 54); if (i >= 0 && i < 3) { this.row = 5; this.col = [1, 5, 8][i]; return this.act(); } }
    if (y >= by + 20 && y < by + 36 && x >= X0 && x < X0 + 160) { this.row = 6; return this.act(); }
  }
  draw(ctx, frame) {
    const W = CONFIG.W, { X0, Y0, CW, CH } = this;
    Text.draw(ctx, '01. なまえを きめよう', 24, 8, THEME.green);
    // 名前の枠
    const chars = [...this.name];
    for (let i = 0; i < this.MAX; i++) {
      const x = 32 + i * 16; ctx.fillStyle = '#b9c9b3'; ctx.fillRect(x + 2, 36, 12, 1);
      if (chars[i]) Text.draw(ctx, chars[i], x + 4, 26);
      else if (i === chars.length && Math.floor(frame / 16) % 2 === 0) { ctx.fillStyle = THEME.green; ctx.fillRect(x + 2, 36, 12, 1); ctx.fillRect(x + 2, 35, 12, 1); }
    }
    // 50音
    Text.box(ctx, X0 - 6, Y0 - 4, CW * 10 + 12, CH * 5 + 8);
    for (let c = 0; c < 10; c++) for (let r = 0; r < 5; r++) {
      const ch = this.key(c, r), x = X0 + c * CW, y = Y0 + r * CH, sel = this.row === r && this.col === c;
      if (sel) { ctx.fillStyle = THEME.green; ctx.fillRect(x, y, CW, CH); }
      Text.draw(ctx, ch, x + 4, y + 3, sel ? THEME.ivory2 : THEME.text);
    }
    // ボタン行
    const by = Y0 + CH * 5 + 4;
    this.btns.forEach((label, i) => {
      if (i === 1) label = this.kata ? 'ひらがな' : 'カタカナ';
      const x = X0 + i * 54, w = 50, sel = this.row === 5 && this.btnAt(this.col) === i;
      ctx.fillStyle = sel ? THEME.green : '#dfe6d8'; ctx.fillRect(x, by, w, 16);
      Text.draw(ctx, label, x + w / 2 - Text.width(label) / 2, by + 3, sel ? THEME.ivory2 : THEME.text);
    });
    { const label = 'おわり', sel = this.row === 6, x = X0, w = 160, y = by + 20;
      ctx.fillStyle = sel ? THEME.green : '#dfe6d8'; ctx.fillRect(x, y, w, 16);
      Text.draw(ctx, label, x + w / 2 - Text.width(label) / 2, y + 3, sel ? THEME.ivory2 : THEME.text); }
    const hint = this.msg > 0 ? (this.name ? '8もじまで だよ' : 'なまえを いれてね') : (Math.floor(frame / 120) % 2 ? 'がめんを タップしても えらべるよ' : 'A: えらぶ   B: けす');
    Text.draw(ctx, hint, W / 2 - Text.width(hint) / 2, by + 44, this.msg > 0 ? THEME.green : THEME.textDim);
  }
}
