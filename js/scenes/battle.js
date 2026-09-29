// ============================================================
// 戦闘（1対1・ターン制・初代風レイアウト）
//   new BattleScene({ enemy, onEnd(result) })  result: 'win'|'lose'|'run'
// ============================================================
// ボールの色 → タイプ（pink は回復）
const BALL_TYPE = { red: 'ほのお', blue: 'みず', green: 'くさ', yellow: 'でんき', purple: 'じめん' };
const ENEMY_COUNT = 3;   // 相手は 3 ターンごとに攻撃

// 盤面（DOM）の管理：戦闘中だけパッドの代わりに表示する
const Puzzle = (() => {
  let inst = null, scene = null;
  const el = () => document.getElementById('puzzle');
  function show(s) {
    scene = s;
    el().hidden = false; document.getElementById('pad').hidden = true; document.getElementById('note').hidden = true;
    if (!inst) {
      inst = PazugoruPuzzle.mount(document.getElementById('pz-board'), {
        images: CONFIG.BALL_IMAGES || {},
        onResolve: r => { if (scene) scene.onPuzzle(r); },
      });
    } else { inst.reset(); }
    inst.lock();
    fit();
  }
  function hide() { scene = null; el().hidden = true; document.getElementById('pad').hidden = false; document.getElementById('note').hidden = false; Game.setViewH(CONFIG.H); Game.fit(); }
  // 盤面の大きさ：残りの高さに収まる幅にする（6×5）
  function fit() {
    if (!inst || el().hidden) return;
    const app = document.getElementById('app'), board = document.getElementById('pz-board');
    const used = 136 * (document.getElementById('screen').getBoundingClientRect().width / CONFIG.W) + 18 + 8;
    const w = Math.max(180, Math.min(app.clientWidth - 12, Math.floor((app.clientHeight - used) * 6 / 5)));
    board.style.width = w + 'px';
    inst.layout();
  }
  function setEnabled(on) {
    if (!inst) return;
    if (on) inst.unlock(); else inst.lock();
  }
  window.addEventListener('resize', () => setTimeout(fit, 50));
  // 毎フレーム：どうぐ・なかまの画面が上に乗っている間だけパッドに切り替える（十字キーが必要なため）
  function sync(scenes) {
    if (!scene || !scenes.includes(scene)) return;
    const top = scenes[scenes.length - 1];
    const padScene = top instanceof ItemScene || top instanceof PartyScene;
    const pz = el(), pad = document.getElementById('pad');
    if (pz.hidden !== padScene) { pz.hidden = padScene; pad.hidden = !padScene; if (!padScene) fit(); }
    Game.setViewH(padScene ? CONFIG.H : 136);
  }
  return { show, hide, fit, setEnabled, sync, get busy() { return inst ? inst.busy : false; } };
})();

class BattleScene {
  constructor(opt) {
    this.overlay = false;
    this.enemy = opt.enemy;
    this.trainer = opt.trainer || null;   // { name } トレーナー戦なら指定（にげられない）
    this.onEnd = opt.onEnd || null;
    this.mode = 'intro';   // intro | command | anim | busy | stats | view | end
    this.queue = [];       // 実行待ちのステップ
    this.shownHp = { p: Party.hp(Game.state), e: this.enemy.hp }; // 表示用（アニメ）
    this.bg = opt.bg || Bg.pick(Game.state.map);          // 背景（場所・時刻で決まる）
    this.viewer = !!opt.viewer;                            // 裏技：モンスター閲覧（戦わない）
    this.shake = 0;
    this.count = ENEMY_COUNT;   // 相手の攻撃までのターン数
    this.hit = [];              // 攻撃した仲間のインデックス（アイコンを光らせる）
    this.sparkleIdx = -1;       // レベルアップした仲間のインデックス
  }
  party() { return Game.state.party; }

  foe() { return this.trainer ? `${this.trainer.name}の ` : 'やせいの '; }
  enter() {
    if (this.viewer) { this.mode = 'view'; this.ids = Object.keys(DATA.MONSTERS); this.vi = this.ids.indexOf(this.enemy.id); this.bi = Bg.NAMES.indexOf(this.bg); return; }
    Sound.play(this.trainer ? 'rival' : 'wild');
    Puzzle.show(this);
    if (this.trainer) { this.msg(`${this.trainer.name}が しょうぶを しかけてきた！`); this.msg(`${this.trainer.name}は ${this.enemy.name}を くりだした！`, () => { this.mode = 'command'; }); }
    else this.msg(`やせいの ${this.enemy.name}が とびだしてきた！`, () => { this.mode = 'command'; });
    this.next();
  }

  // ---- ステップ実行 ----
  //   *Step() はステップ関数を返すだけ。msg/step は末尾に積む。途中に差し込むときは queue.unshift。
  static get MSG_BOX() { return { x: 0, y: 120, w: 192, h: 34 }; }   // 戦闘中の会話窓（盤面を出すぶん小さい）
  // 戦闘中の文章は枠なし：舞台の下に浮かぶ文字で、時間で自動的に進む（タップで早送り）
  say(text, onDone) { this.toast = { text, t: 0, onDone }; this.mode = 'toast'; }
  msgStep(text, after) { return () => { this.say(text, () => { after && after(); this.next(); }); }; }
  static get TOAST_FRAMES() { return 66; }
  fnStep(fn) { return () => { fn(); this.next(); }; }
  animStep(who) { return () => { this.anim = who; this.mode = 'anim'; }; }
  msg(text, after) { this.queue.push(this.msgStep(text, after)); }
  step(fn) { this.queue.push(this.fnStep(fn)); }
  next() { const f = this.queue.shift(); if (f) f(); }

  // ---- 相手の攻撃（パーティ共通HPに当たる）----
  enemyAttackSteps() {
    const en = this.enemy, st = Game.state;
    const move = en.moves[Game.rand(0, en.moves.length - 1)], m = DATA.MOVES[move.name];
    return [
      this.msgStep(`${this.foe()}${en.name}の ${move.name}！`),
      this.fnStep(() => {
        const stab = en.type === m.type ? 1.5 : 1;
        const def = Party.def(st);
        const base = Math.floor(Math.floor(Math.floor(2 * en.level / 5 + 2) * m.power * en.atk / def) / 50) + 2;
        const dmg = Math.max(1, Math.floor(base * stab * Game.rand(217, 255) / 255));
        Party.set(st, Party.hp(st) - dmg);
      }),
      this.animStep('p'),
    ];
  }
  // カウントを進めて、0なら相手が攻撃
  enemyTick() {
    const en = this.enemy;
    if (en.hp > 0 && Party.hp(Game.state) > 0) {
      this.count--;
      if (this.count <= 0) { this.count = ENEMY_COUNT; this.queue.unshift(...this.enemyAttackSteps()); }
    }
  }

  // ---- 盤面を消したときの処理：色ごとに、そのタイプの仲間が攻撃（pinkは回復）----
  onPuzzle(r) {
    if (this.mode !== 'command') return;
    this.mode = 'busy'; Puzzle.setEnabled(false);
    const st = Game.state, party = this.party(), en = this.enemy;
    const comboMul = 1 + 0.25 * (r.combo - 1);
    let total = 0, bestEff = 1, worstEff = 1, heal = 0; const attackers = new Set();
    for (const [color, n] of Object.entries(r.counts)) {
      if (color === 'pink') { heal += Math.round(Party.maxHp(st) * 0.03 * n); continue; }
      const type = BALL_TYPE[color]; if (!type) continue;
      const eff = (DATA.TYPES[type] || {})[en.type] ?? 1;
      party.forEach((mem, i) => {
        // そのタイプの仲間が攻撃。ノーマルはどの色でも半分の力で攻撃
        const mul = mem.type === type ? 1 : (mem.type === 'ノーマル' ? 0.5 : 0);
        if (!mul) return;
        const power = n * 13;   // 3個 ≒ たいあたり1回ぶん
        const base = Math.floor(Math.floor(Math.floor(2 * mem.level / 5 + 2) * power * mem.atk / en.def) / 50) + 2;
        total += Math.max(1, Math.floor(base * mul * eff * comboMul * Game.rand(217, 255) / 255));
        attackers.add(i);
        bestEff = Math.max(bestEff, eff); worstEff = Math.min(worstEff, eff);
      });
    }
    const names = [...attackers].map(i => party[i].name);
    if (total > 0) {
      this.step(() => { this.hit = [...attackers]; });
      this.msg(names.length === 1 ? `${names[0]}の こうげき！` : `なかまの こうげき！`);
      this.step(() => { en.hp = Math.max(0, en.hp - total); this.shake = 12; });
      this.queue.push(this.animStep('e'));
      if (bestEff > 1) this.msg('こうかは ばつぐんだ！');
      else if (worstEff < 1 && bestEff <= 1) this.msg('こうかは いまひとつの ようだ。');
    } else if (Object.keys(r.counts).some(c => c !== 'pink')) {
      this.msg('こうげきできる なかまが いない…');
    }
    if (heal > 0) {
      this.step(() => { Party.set(st, Party.hp(st) + heal); });
      this.msg('なかまの HPが かいふくした！');
      this.step(() => { this.shownHp.p = Party.hp(st); });
    }
    this.step(() => { this.hit = []; });
    this.queue.push(() => { this.enemyTick(); this.next(); });
    this.queue.push(() => { this.checkEnd(); this.next(); });
    this.next();
  }
  // 盤面の上のボタン
  pressItem() {
    if (this.mode !== 'command') return;
    Game.push(new ItemScene({ inBattle: true, onUse: name => {
      const st = Game.state;
      if (Party.hp(st) >= Party.maxHp(st)) { this.say('HPは まんたんだ。'); return; }
      this.mode = 'busy';
      this.step(() => { st.items[name]--; Party.set(st, Party.hp(st) + DATA.ITEMS[name].heal); this.shownHp.p = Party.hp(st); });
      this.msg('なかまの HPが かいふくした！');
      this.queue.push(() => { this.enemyTick(); this.next(); });
      this.queue.push(() => { this.checkEnd(); this.next(); });
      this.next();
    } }));
  }
  pressParty() { if (this.mode !== 'command') return; Game.push(new PartyScene()); }
  pressRun() { if (this.mode !== 'command') return; this.mode = 'busy'; this.tryRun(); }

  checkEnd() {
    const st = Game.state, party = this.party(), en = this.enemy;
    if (en.hp <= 0) {
      this.msg(`${this.foe()}${en.name}を たおした！`);
      if (this.trainer) this.msg(`${this.trainer.name}との しょうぶに かった！`);
      const gain = en.level * 10;
      this.msg(`けいけんち ${gain} を もらった！`);
      // 全員に経験値。レベルアップした仲間は順に表示
      party.forEach((me, idx) => {
        this.queue.push(() => {
          me.exp += gain;
          const need = me.level * 20;
          if (me.exp >= need) {
            me.exp -= need;
            const before = { maxHp: me.maxHp, atk: me.atk, def: me.def, spd: me.spd };
            const grown = makeMonster(me.id, me.level + 1);
            me.level++; me.maxHp = grown.maxHp; me.atk = grown.atk; me.def = grown.def; me.spd = grown.spd;
            Party.set(st, Party.hp(st) + (me.maxHp - before.maxHp)); this.shownHp.p = Party.hp(st);
            const grow = { before, after: { maxHp: me.maxHp, atk: me.atk, def: me.def, spd: me.spd } };
            const steps = [
              this.fnStep(() => { this.sparkle = 90; this.sparkleIdx = idx; }),
              this.msgStep(`${me.name}は Lv.${me.level}に あがった！`),
              () => { this.grow = grow; this.statsMon = me; this.mode = 'stats'; },
            ];
            const evo = DATA.MONSTERS[me.id].evo;
            if (evo && me.level >= evo[1] && DATA.MONSTERS[evo[0]]) {
              const to = DATA.MONSTERS[evo[0]], from = me.name;
              steps.push(this.msgStep(`おや…！？ ${from}の ようすが…！`), this.fnStep(() => {
                const g = makeMonster(evo[0], me.level);
                const dHp = g.maxHp - me.maxHp;
                me.id = evo[0]; me.name = to.name; me.type = to.type; me.maxHp = g.maxHp; me.atk = g.atk; me.def = g.def; me.spd = g.spd;
                Party.set(st, Party.hp(st) + Math.max(0, dHp) + 10); this.shownHp.p = Party.hp(st);
              }), this.msgStep(`${from}は ${to.name}に しんかした！`));
            }
            this.queue.unshift(...steps);
          }
          this.next();
        });
      });
      this.queue.push(() => this.finish('win'));
    } else if (Party.hp(st) <= 0) {
      this.msg('めのまえが まっくらに なった！');
      this.queue.push(() => this.finish('lose'));
    } else {
      this.queue.push(() => { this.mode = 'command'; });
    }
  }

  tryRun() {
    const en = this.enemy;
    if (this.trainer) { this.msg('しょうぶの さいちゅうに にげられない！'); this.queue.push(() => { this.mode = 'command'; }); this.next(); return; }
    const ok = Party.spd(Game.state) >= en.spd || Math.random() < 0.7;
    if (ok) { this.msg('うまく にげきれた！'); this.queue.push(() => this.finish('run')); }
    else { this.msg('にげられない！'); this.queue.push(() => { this.enemyTick(); this.next(); }); this.queue.push(() => { this.checkEnd(); this.next(); }); }
    this.next();
  }
  finish(result) {
    this.mode = 'end';
    Puzzle.hide();
    Game.pop();
    const m = DATA.MAPS[Game.state.map]; Sound.play(m && m.bgm);
    this.onEnd && this.onEnd(result);
  }

  // ---- 入力 ----
  update(frame) {
    if (this.shake > 0) this.shake--;
    if (this.sparkle > 0) this.sparkle--;
    if (this.mode === 'view') {   // ←→でモンスター、↑↓で背景、Bで戻る
      const n = this.ids.length;
      if (Input.pressed('right')) this.vi = (this.vi + 1) % n;
      if (Input.pressed('left')) this.vi = (this.vi + n - 1) % n;
      if (Input.pressed('down')) this.bi = (this.bi + 1) % Bg.NAMES.length;
      if (Input.pressed('up')) this.bi = (this.bi + Bg.NAMES.length - 1) % Bg.NAMES.length;
      if (Input.pressed('right') || Input.pressed('left')) { const m = makeMonster(this.ids[this.vi], 10); this.enemy = m; Game.state.party[0] = makeMonster(this.ids[this.vi], 10); Party.full(Game.state); this.shownHp = { p: m.hp, e: m.hp }; }
      this.bg = Bg.NAMES[this.bi];
      if (Input.pressed('b') || Input.pressed('a')) { Game.pop(); this.onEnd && this.onEnd('view'); }
      return;
    }
    if (this.mode === 'stats') {   // のうりょく表：約2.5秒で自動で閉じる（タップでも閉じる）
      this.statsT = (this.statsT || 0) + 1;
      if (this.statsT >= 150 || Input.pressed('a') || Input.pressed('b')) { this.statsT = 0; this.mode = 'busy'; this.next(); }
      return;
    }
    if (this.mode === 'toast') {
      const t = this.toast; t.t++;
      if (t.t >= BattleScene.TOAST_FRAMES || (t.t > 12 && (Input.pressed('a') || Input.pressed('b')))) {
        this.toast = null; this.mode = 'busy'; const f = t.onDone; f && f();
      }
      return;
    }
    if (this.mode === 'anim') {
      const key = this.anim, target = key === 'p' ? Party.hp(Game.state) : this.enemy.hp;
      const spd = key === 'p' ? Math.max(1, Math.ceil(Party.maxHp(Game.state) / 60)) : 1;
      if (this.shownHp[key] > target) this.shownHp[key] = Math.max(target, this.shownHp[key] - spd);
      else { this.mode = 'busy'; this.next(); }
      return;
    }
    if (this.mode === 'command') {
      Puzzle.setEnabled(Game.top() === this);
      return;
    }
  }

  // ---- 描画（CLASSIC COLOR）----
  //   0..80 舞台（敵）、80..120 なかま列＋共通HP、120..154 会話窓。盤面を出すため画面の下 154px までしか見せない
  draw(ctx, frame) {
    const en = this.enemy, st = Game.state;
    const W = CONFIG.W, H = CONFIG.H;
    const AH = this.viewer ? 154 : 136;
    const bgImg = Bg.get(this.bg);
    if (bgImg) ctx.drawImage(bgImg, 0, 0, W, 152);
    else {
      const sky = ctx.createLinearGradient(0, 0, 0, 80);
      sky.addColorStop(0, '#9fd4f5'); sky.addColorStop(1, '#dff1fb');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 80);
      ctx.fillStyle = '#6cb85a'; ctx.fillRect(0, 80, W, H - 80);
    }
    if (this.viewer) { ctx.fillStyle = THEME.greenDark; ctx.fillRect(0, AH, W, H - AH); }
    const oval = (cx, cy, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    const sx = this.shake ? (this.shake % 2 ? 2 : -2) : 0;

    if (this.viewer) {
      // 閲覧モード：敵側＝正面、自分側＝後ろ姿
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; oval(148, 74, 34, 8); oval(48, 114, 36, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.10)'; oval(148, 76, 30, 5); oval(48, 116, 32, 5);
      drawMonster(ctx, en, 124, 24, 48);
      this.drawStatus(ctx, en, en.hp, 4, 4, 104, 30, false);
      drawMonster(ctx, en, 24, 66, 48, true, true);
      Text.box(ctx, 0, AH, W, H - AH);
      const d = DATA.MONSTERS[en.id];
      Text.draw(ctx, `No.${d.no}  ${d.name}  ${d.type}`, 8, AH + 7);
      Text.draw(ctx, `${this.vi + 1}/${this.ids.length}  はいけい:${this.bg}`, 8, AH + 19, THEME.textDim);
      Text.draw(ctx, '←→ モンスター ↑↓ はいけい B もどる', 8, AH + 33, THEME.green);
      return;
    }

    // 敵：中央やや右、大きめ（60px）
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; oval(120, 80, 40, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; oval(120, 82, 34, 5);
    drawMonster(ctx, en, 90 + sx, 22, 60);
    this.drawStatus(ctx, en, this.shownHp.e, 4, 4, 100, 30, false);
    if (this.mode !== 'end') this.drawCount(ctx, 160, 14);

    // なかま列 ＋ 共通HP
    this.drawParty(ctx, frame);
    // 浮かぶ文章（枠なし・縁取り）
    if (this.toast) {
      const lines = this.toast.text.split('\n'); const y0 = 123;
      lines.forEach((l, i) => {
        const w = Text.width(l), x = Math.floor((W - w) / 2), y = y0 + i * 12;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) Text.draw(ctx, l, x + dx, y + dy, '#1b2418');
        Text.draw(ctx, l, x, y, '#fff6d8');
      });
    }
    if (this.mode === 'stats') this.drawStats(ctx, this.statsMon, frame);
  }

  // なかまの顔アイコン6枠と、パーティ共通のHPゲージ
  drawParty(ctx, frame) {
    const st = Game.state, party = this.party();
    // 後ろ姿で相手を見上げる。枠なし。人数に応じて中央寄せ（1匹28px）
    const n = party.length, size = 28, gap = 2, y = 82;
    const x0 = Math.floor((CONFIG.W - (n * size + (n - 1) * gap)) / 2);
    const oval = (cx, cy, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    party.forEach((m, i) => {
      const x = x0 + i * (size + gap);
      const lit = this.hit.includes(i);
      ctx.fillStyle = lit ? 'rgba(255,240,150,0.55)' : 'rgba(0,0,0,0.14)'; oval(x + size / 2, y + size - 1, size / 2, 4);
      const bob = lit ? -2 : 0;
      drawMonster(ctx, m, x, y + bob, size, false, true);
      if (this.sparkle > 0 && this.sparkleIdx === i) this.drawSparkle(ctx, x + size / 2, y + size / 2, frame, 12);
    });
    // 共通HP
    const hp = Math.round(this.shownHp.p), max = Party.maxHp(st);
    const by = 113;
    ctx.fillStyle = THEME.greenDark; ctx.fillRect(0, by - 1, CONFIG.W, 9);
    Text.draw(ctx, 'HP', 4, by - 1, '#f2d27a');
    drawHpBar(ctx, 18, by, 96, hp, max, true);
    const s = `${hp} / ${max}`;
    Text.draw(ctx, s, CONFIG.W - 4 - Text.width(s), by - 1, '#fff6d8');
  }

  // 相手の攻撃までのターン数（敵の頭の上の小さな札）
  drawCount(ctx, cx, cy) {
    const s = `あと${this.count}`; const w = Text.width(s) + 8;
    ctx.fillStyle = this.count <= 1 ? '#b3261e' : THEME.greenDark;
    ctx.fillRect(cx - w / 2, cy - 6, w, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(cx - w / 2, cy - 6, w, 1);
    Text.draw(ctx, s, cx - w / 2 + 4, cy - 4, '#fff6d8');
    // 下向きの小さな三角
    ctx.fillStyle = this.count <= 1 ? '#b3261e' : THEME.greenDark;
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 2 + i, cy + 6 + i, 5 - i * 2, 1);
  }

  // HP窓：名前 / Lv. / タイプアイコン / HPピル＋バー / (自分のみ) 現在/最大
  //   実機Safariは文字が下に2〜3px伸びるので、文字の下は余裕を取る
  drawStatus(ctx, m, hp, x, y, w, h, mine) {
    Text.box(ctx, x, y, w, h, { tab: true });
    Text.draw(ctx, m.name, x + 8, y + 4);
    const lv = `Lv.${m.level}`;
    Text.draw(ctx, lv, x + w - 8 - Text.width(lv), y + 4);
    const ry = y + 15;
    const icon = Gfx.get(`type_${m.type}`, 1);
    if (icon) ctx.drawImage(icon, x + 8, ry);
    // 「HP」の金文字ピル
    ctx.fillStyle = THEME.greenDark; ctx.fillRect(x + 19, ry - 2, 14, 12);
    Text.draw(ctx, 'HP', x + 22, ry, '#f2d27a');
    drawHpBar(ctx, x + 33, ry + 1, w - 41, hp, m.maxHp, true);
    if (mine) {
      const s = `${hp} / ${m.maxHp}`;
      Text.draw(ctx, s, x + w - 8 - Text.width(s), y + 25);
    }
  }

  // レベルアップのきらめき（黄色の放射線）
  drawSparkle(ctx, cx, cy, frame, base = 28) {
    ctx.fillStyle = '#f2d27a';
    const t = Math.floor(frame / 6) % 2;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.2;
      const r0 = base + (i % 2) * 4, r1 = r0 + 5 + t * 3;
      for (let r = r0; r < r1; r += 1) ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }

  // のうりょく表（レベルアップ後）
  drawStats(ctx, m, frame) {
    const g = this.grow; if (!g) return;
    const x = 12, y = 8, w = 168, h = 100;
    Text.box(ctx, x, y, w, h);
    Text.draw(ctx, `${m.name}の`, x + 8, y + 7);
    Text.draw(ctx, 'のうりょくが あがった！', x + 8, y + 18);
    Text.rule(ctx, x + 6, y + 30, w - 12);
    const rows = [['HP', 'maxHp'], ['こうげき', 'atk'], ['ぼうぎょ', 'def'], ['すばやさ', 'spd']];
    rows.forEach(([label, key], i) => {
      const ry = y + 36 + i * 13, b = g.before[key], a = g.after[key];
      Text.draw(ctx, label, x + 8, ry);
      Text.draw(ctx, String(b).padStart(3), x + 62, ry, THEME.textDim);
      Text.cursor(ctx, x + 84, ry);
      Text.draw(ctx, String(a).padStart(3), x + 94, ry);
      Text.draw(ctx, `(+${a - b})`, x + 126, ry, THEME.green);
    });
  }
}

// 遭遇時のヘルパ（フィールドから呼ぶ）
function startWildBattle(mapId, onEnd) {
  const tbl = DATA.MAPS[mapId].encounters;
  const total = tbl.reduce((n, e) => n + e.weight, 0);
  let r = Math.random() * total, pick = tbl[0];
  for (const e of tbl) { if ((r -= e.weight) < 0) { pick = e; break; } }
  const enemy = makeMonster(pick.id, Game.rand(pick.level[0], pick.level[1]));
  Game.push(new BattleScene({ enemy, onEnd }));
}
