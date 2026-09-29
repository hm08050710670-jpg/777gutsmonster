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
    el().hidden = false; document.getElementById('pad').hidden = true;
    if (!inst) {
      inst = PazugoruPuzzle.mount(document.getElementById('pz-board'), {
        images: CONFIG.BALL_IMAGES || {},
        onResolve: r => { if (scene) scene.onPuzzle(r); },
      });
      document.getElementById('pz-item').addEventListener('click', () => scene && scene.pressItem());
      document.getElementById('pz-party').addEventListener('click', () => scene && scene.pressParty());
      document.getElementById('pz-run').addEventListener('click', () => scene && scene.pressRun());
    } else { inst.reset(); }
    inst.lock();
    fit();
  }
  function hide() { scene = null; el().hidden = true; document.getElementById('pad').hidden = false; Game.setViewH(CONFIG.H); }
  // 盤面の大きさ：残りの高さに収まる幅にする（6×5）
  function fit() {
    if (!inst || el().hidden) return;
    const app = document.getElementById('app'), board = document.getElementById('pz-board');
    const used = document.getElementById('note').offsetHeight + 154 * (document.getElementById('screen').getBoundingClientRect().width / CONFIG.W) + 18 + 60;
    const w = Math.max(180, Math.min(app.clientWidth - 12, Math.floor((app.clientHeight - used) * 6 / 5)));
    board.style.width = w + 'px';
    inst.layout();
  }
  function setEnabled(on) {
    if (!inst) return;
    if (on) inst.unlock(); else inst.lock();
    ['pz-item', 'pz-party', 'pz-run'].forEach(id => { document.getElementById(id).disabled = !on; });
  }
  window.addEventListener('resize', () => setTimeout(fit, 50));
  // 毎フレーム：どうぐ・なかまの画面が上に乗っている間だけパッドに切り替える（十字キーが必要なため）
  function sync(scenes) {
    if (!scene || !scenes.includes(scene)) return;
    const top = scenes[scenes.length - 1];
    const padScene = top instanceof ItemScene || top instanceof PartyScene;
    const pz = el(), pad = document.getElementById('pad');
    if (pz.hidden !== padScene) { pz.hidden = padScene; pad.hidden = !padScene; if (!padScene) fit(); }
    Game.setViewH(padScene ? CONFIG.H : 154);
  }
  return { show, hide, fit, setEnabled, sync, get busy() { return inst ? inst.busy : false; } };
})();

class BattleScene {
  constructor(opt) {
    this.overlay = false;
    this.enemy = opt.enemy;
    this.trainer = opt.trainer || null;   // { name } トレーナー戦なら指定（にげられない）
    this.onEnd = opt.onEnd || null;
    this.pidx = Game.state.party.findIndex(m => m.hp > 0);
    this.mode = 'intro';   // intro | command | move | anim | end
    this.queue = [];       // 実行待ちのステップ
    this.shownHp = { p: this.me().hp, e: this.enemy.hp }; // 表示用（アニメ）
    this.bg = opt.bg || Bg.pick(Game.state.map);          // 背景（場所・時刻で決まる）
    this.viewer = !!opt.viewer;                            // 裏技：モンスター閲覧（戦わない）
    this.shake = 0;
    this.count = ENEMY_COUNT;   // 相手の攻撃までのターン数
  }
  me() { return Game.state.party[this.pidx]; }

  foe() { return this.trainer ? `${this.trainer.name}の ` : 'やせいの '; }
  enter() {
    if (this.viewer) { this.mode = 'view'; this.ids = Object.keys(DATA.MONSTERS); this.vi = this.ids.indexOf(this.enemy.id); this.bi = Bg.NAMES.indexOf(this.bg); return; }
    Sound.play(this.trainer ? 'rival' : 'wild');
    Puzzle.show(this);
    if (this.trainer) { this.msg(`${this.trainer.name}が しょうぶを しかけてきた！`); this.msg(`${this.trainer.name}は ${this.enemy.name}を くりだした！`); }
    else this.msg(`あ！ やせいの\n${this.enemy.name}が とびだしてきた！`);
    this.msg(`いけっ！ ${this.me().name}！`, () => { this.mode = 'command'; });
    this.next();
  }

  // ---- ステップ実行 ----
  //   *Step() はステップ関数を返すだけ。msg/step/hpAnim は末尾に積む。
  //   途中に差し込みたいときは queue.unshift(...) を使う（技の処理など）。
  static get MSG_BOX() { return { x: 0, y: 120, w: 192, h: 34 }; }   // 戦闘中の会話窓（盤面を出すぶん小さい）
  say(text, onDone) { Game.push(new DialogScene({ text, onDone, box: BattleScene.MSG_BOX })); }
  msgStep(text, after) { return () => { this.say(text, () => { after && after(); this.next(); }); }; }
  fnStep(fn) { return () => { fn(); this.next(); }; }
  animStep(who) { return () => { this.anim = who; this.mode = 'anim'; }; }
  msg(text, after) { this.queue.push(this.msgStep(text, after)); }
  step(fn) { this.queue.push(this.fnStep(fn)); }
  next() { const f = this.queue.shift(); if (f) f(); }

  // ---- ターン処理 ----
  // 技1回分のステップ列を返す
  moveSteps(attacker, defender, move, isPlayer) {
    const m = DATA.MOVES[move.name];
    return [
      this.msgStep(`${isPlayer ? '' : this.foe()}${attacker.name}の\n${move.name}！`),
      this.fnStep(() => {
        move.pp = Math.max(0, move.pp - 1);
        const eff = (DATA.TYPES[m.type] || {})[defender.type] ?? 1;
        const stab = attacker.type === m.type ? 1.5 : 1;
        const base = Math.floor(Math.floor(Math.floor(2 * attacker.level / 5 + 2) * m.power * attacker.atk / defender.def) / 50) + 2;
        const dmg = Math.max(1, Math.floor(base * stab * eff * Game.rand(217, 255) / 255));
        defender.hp = Math.max(0, defender.hp - dmg);
        this.lastEff = eff;
        if (isPlayer) this.shake = 12;
      }),
      this.animStep(isPlayer ? 'e' : 'p'),
      () => {
        if (this.lastEff > 1) this.queue.unshift(this.msgStep('こうかは ばつぐんだ！'));
        else if (this.lastEff < 1) this.queue.unshift(this.msgStep('こうかは いまひとつの ようだ。'));
        this.next();
      },
    ];
  }

  // 盤面を消したときの処理：色ごとに攻撃（pinkは回復）→ 相手のカウント → 相手の攻撃
  onPuzzle(r) {
    if (this.mode !== 'command') return;
    this.mode = 'busy'; Puzzle.setEnabled(false);
    const me = this.me(), en = this.enemy;
    const comboMul = 1 + 0.25 * (r.combo - 1);
    let total = 0, bestEff = 1, worstEff = 1, heal = 0;
    for (const [color, n] of Object.entries(r.counts)) {
      if (color === 'pink') { heal += Math.round(me.maxHp * 0.05 * n); continue; }
      const type = BALL_TYPE[color]; if (!type) continue;
      const eff = (DATA.TYPES[type] || {})[en.type] ?? 1;
      const stab = me.type === type ? 1.5 : 1;
      const power = n * 13;   // 3個 ≒ たいあたり1回ぶん
      const base = Math.floor(Math.floor(Math.floor(2 * me.level / 5 + 2) * power * me.atk / en.def) / 50) + 2;
      total += Math.max(1, Math.floor(base * stab * eff * comboMul * Game.rand(217, 255) / 255));
      bestEff = Math.max(bestEff, eff); worstEff = Math.min(worstEff, eff);
    }
    if (total > 0) {
      this.msg(`${me.name}の こうげき！\n${r.combo}コンボ！`);
      this.step(() => { en.hp = Math.max(0, en.hp - total); this.shake = 12; });
      this.queue.push(this.animStep('e'));
      if (bestEff > 1) this.msg('こうかは ばつぐんだ！');
      else if (worstEff < 1 && bestEff <= 1) this.msg('こうかは いまひとつの ようだ。');
    }
    if (heal > 0) {
      this.step(() => { me.hp = Math.min(me.maxHp, me.hp + heal); });
      this.msg(`${me.name}の HPが かいふくした！`);
      this.step(() => { this.shownHp.p = me.hp; });
    }
    // 相手の番（倒れていなければ）
    this.queue.push(() => {
      if (en.hp > 0 && me.hp > 0) {
        this.count--;
        if (this.count <= 0) {
          this.count = ENEMY_COUNT;
          this.queue.unshift(...this.moveSteps(en, me, en.moves[Game.rand(0, en.moves.length - 1)], false));
        }
      }
      this.next();
    });
    this.queue.push(() => { this.checkEnd(); this.next(); });
    this.next();
  }
  // 盤面の上のボタン
  pressItem() {
    if (this.mode !== 'command') return;
    Game.push(new ItemScene({ inBattle: true, onUse: name => {
      const me = this.me();
      if (me.hp >= me.maxHp) { this.say(`${me.name}の HPは まんたんだ。`); return; }
      this.mode = 'busy';
      this.step(() => { Game.state.items[name]--; me.hp = Math.min(me.maxHp, me.hp + DATA.ITEMS[name].heal); this.shownHp.p = me.hp; });
      this.msg(`${me.name}の HPが かいふくした！`);
      this.queue.push(() => { this.enemyTurnOnly(); });
      this.next();
    } }));
  }
  pressParty() {
    if (this.mode !== 'command') return;
    Game.push(new PartyScene({ onPick: i => {
      const m = Game.state.party[i];
      if (m.hp <= 0) { this.say(`${m.name}は たたかえない！`); return; }
      if (i === this.pidx) { this.say(`${m.name}は もう でている！`); return; }
      this.mode = 'busy';
      this.msg(`もどれ！ ${this.me().name}！`);
      this.step(() => { this.pidx = i; this.shownHp.p = m.hp; });
      this.msg(`いけっ！ ${m.name}！`);
      this.queue.push(() => { this.enemyTurnOnly(); });
      this.next();
    } }));
  }
  pressRun() { if (this.mode !== 'command') return; this.mode = 'busy'; this.tryRun(); }
  // どうぐ・交代のあと：相手のカウントを進める（0なら攻撃）
  enemyTurnOnly() {
    const en = this.enemy, me = this.me();
    this.count--;
    if (this.count <= 0) { this.count = ENEMY_COUNT; this.queue.unshift(...this.moveSteps(en, me, en.moves[Game.rand(0, en.moves.length - 1)], false)); }
    this.queue.push(() => { this.checkEnd(); this.next(); });
    this.next();
  }

  checkEnd() {
    const me = this.me(), en = this.enemy;
    if (en.hp <= 0) {
      this.msg(`${this.foe()}${en.name}を\nたおした！`);
      if (this.trainer) this.msg(`${this.trainer.name}との しょうぶに かった！`);
      const gain = en.level * 10;
      this.msg(`${me.name}は ${gain}の\nけいけんちを もらった！`);
      this.step(() => {
        me.exp += gain;
        const need = me.level * 20;
        if (me.exp >= need) {
          me.exp -= need;
          const before = { maxHp: me.maxHp, atk: me.atk, def: me.def, spd: me.spd };
          const grown = makeMonster(me.id, me.level + 1);
          me.level++; me.maxHp = grown.maxHp; me.atk = grown.atk; me.def = grown.def; me.spd = grown.spd;
          me.hp = Math.min(me.maxHp, me.hp + (me.maxHp - before.maxHp));
          this.grow = { before, after: { maxHp: me.maxHp, atk: me.atk, def: me.def, spd: me.spd } };
          // きらめき → 「レベルが あがった」 → のうりょく表（Aで閉じる）
          this.queue.unshift(this.fnStep(() => { this.sparkle = 90; }),
            this.msgStep(`……！\n${me.name}は Lv.${me.level}に あがった！`),
            () => { this.mode = 'stats'; });
          const evo = DATA.MONSTERS[me.id].evo;
          if (evo && me.level >= evo[1] && DATA.MONSTERS[evo[0]]) {
            const to = DATA.MONSTERS[evo[0]], from = me.name;
            this.queue.splice(3, 0, this.msgStep(`おや…！？ ${from}の ようすが…！`), this.fnStep(() => {
              const g = makeMonster(evo[0], me.level);
              me.id = evo[0]; me.name = to.name; me.type = to.type; me.maxHp = g.maxHp; me.hp = Math.min(me.maxHp, me.hp + 10); me.atk = g.atk; me.def = g.def; me.spd = g.spd;
              this.shownHp.p = me.hp;
            }), this.msgStep(`${from}は ${to.name}に しんかした！`));
          }
        }
      });
      this.queue.push(() => this.finish('win'));
    } else if (me.hp <= 0) {
      this.msg(`${me.name}は たおれた！`);
      // 次の元気な仲間がいれば交代、いなければ全滅
      const nextIdx = Game.state.party.findIndex(m => m.hp > 0);
      if (nextIdx >= 0) {
        this.step(() => { this.pidx = nextIdx; this.shownHp.p = this.me().hp; });
        this.msg(`いけっ！ ${this.me().name}！`, () => { this.mode = 'command'; });
      } else {
        this.msg('めのまえが まっくらに なった！');
        this.queue.push(() => this.finish('lose'));
      }
    } else {
      this.queue.push(() => { this.mode = 'command'; });
    }
  }

  tryRun() {
    const me = this.me(), en = this.enemy;
    if (this.trainer) { this.msg('しょうぶの さいちゅうに にげられない！'); this.queue.push(() => { this.mode = 'command'; }); this.next(); return; }
    const ok = me.spd >= en.spd || Math.random() < 0.7;
    if (ok) { this.msg('うまく にげきれた！'); this.queue.push(() => this.finish('run')); }
    else { this.msg('にげられない！'); this.queue.push(() => { this.enemyTurnOnly(); }); }
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
      if (Input.pressed('right') || Input.pressed('left')) { const m = makeMonster(this.ids[this.vi], 10); this.enemy = m; Game.state.party[this.pidx] = makeMonster(this.ids[this.vi], 10); this.shownHp = { p: m.hp, e: m.hp }; }
      this.bg = Bg.NAMES[this.bi];
      if (Input.pressed('b') || Input.pressed('a')) { Game.pop(); this.onEnd && this.onEnd('view'); }
      return;
    }
    if (this.mode === 'stats') {
      if (Input.pressed('a') || Input.pressed('b')) { this.mode = 'busy'; this.next(); }
      return;
    }
    if (this.mode === 'anim') {
      const key = this.anim, target = key === 'p' ? this.me().hp : this.enemy.hp;
      if (this.shownHp[key] > target) this.shownHp[key]--;
      else { this.mode = 'busy'; this.next(); }
      return;
    }
    if (this.mode === 'command') {
      Puzzle.setEnabled(Game.top() === this);
      return;
    }
  }

  // ---- 描画（CLASSIC COLOR）----
  //   舞台は 0..120、会話窓は 120..154（盤面を出すため、戦闘中は画面の下 154px までしか見せない）
  draw(ctx, frame) {
    const me = this.me(), en = this.enemy;
    const W = CONFIG.W, H = CONFIG.H;
    const AH = 154;   // 見せる高さ
    // 背景：画像（assets/bg）。無ければ空と芝を描く
    const bgImg = Bg.get(this.bg);
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, W, AH);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, 80);
      sky.addColorStop(0, '#9fd4f5'); sky.addColorStop(1, '#dff1fb');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 80);
      ctx.fillStyle = '#6cb85a'; ctx.fillRect(0, 80, W, H - 80);
    }
    if (this.viewer) { ctx.fillStyle = THEME.greenDark; ctx.fillRect(0, AH, W, H - AH); }
    // 足場の楕円（半透明で背景になじませる）
    const oval = (cx, cy, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; oval(148, 74, 34, 8); oval(48, 114, 36, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; oval(148, 76, 30, 5); oval(48, 116, 32, 5);

    const sx = this.shake ? (this.shake % 2 ? 2 : -2) : 0;
    // 敵：右上
    drawMonster(ctx, en, 124 + sx, 24, 48);
    this.drawStatus(ctx, en, this.shownHp.e, 4, 4, 104, 30, false);
    if (!this.viewer && this.mode !== 'end') this.drawCount(ctx, 148, 14);
    // 自分：左下（後ろ姿、無ければ反転）
    if (this.sparkle > 0) this.drawSparkle(ctx, 48, 90, frame);
    drawMonster(ctx, me, 24, 66, 48, true, true);
    this.drawStatus(ctx, me, this.shownHp.p, 84, 76, 104, 38, true);

    if (this.mode === 'view') {
      Text.box(ctx, 0, AH, W, H - AH);
      const d = DATA.MONSTERS[en.id];
      Text.draw(ctx, `No.${d.no}  ${d.name}  ${d.type}`, 8, AH + 7);
      Text.draw(ctx, `${this.vi + 1}/${this.ids.length}  はいけい:${this.bg}`, 8, AH + 19, THEME.textDim);
      Text.draw(ctx, '←→ モンスター ↑↓ はいけい B もどる', 8, AH + 33, THEME.green);
    }
    if (this.mode === 'stats') this.drawStats(ctx, me, frame);
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
  drawSparkle(ctx, cx, cy, frame) {
    ctx.fillStyle = '#f2d27a';
    const t = Math.floor(frame / 6) % 2;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.2;
      const r0 = 28 + (i % 2) * 6, r1 = r0 + 6 + t * 3;
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
    Text.moreArrow(ctx, x + w - 16, y + h - 11, frame);
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
