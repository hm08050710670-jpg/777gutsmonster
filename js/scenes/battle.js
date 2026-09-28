// ============================================================
// 戦闘（1対1・ターン制・初代風レイアウト）
//   new BattleScene({ enemy, onEnd(result) })  result: 'win'|'lose'|'run'
// ============================================================
class BattleScene {
  constructor(opt) {
    this.overlay = false;
    this.enemy = opt.enemy;
    this.trainer = opt.trainer || null;   // { name } トレーナー戦なら指定（にげられない）
    this.onEnd = opt.onEnd || null;
    this.pidx = Game.state.party.findIndex(m => m.hp > 0);
    this.mode = 'intro';   // intro | command | move | anim | end
    this.cmd = 0; this.mv = 0;
    this.queue = [];       // 実行待ちのステップ
    this.shownHp = { p: this.me().hp, e: this.enemy.hp }; // 表示用（アニメ）
    this.shake = 0;
  }
  me() { return Game.state.party[this.pidx]; }

  foe() { return this.trainer ? `${this.trainer.name}の ` : 'やせいの '; }
  enter() {
    Sound.play(this.trainer ? 'rival' : 'wild');
    if (this.trainer) { this.msg(`${this.trainer.name}が しょうぶを しかけてきた！`); this.msg(`${this.trainer.name}は ${this.enemy.name}を くりだした！`); }
    else this.msg(`あ！ やせいの\n${this.enemy.name}が とびだしてきた！`);
    this.msg(`いけっ！ ${this.me().name}！`, () => { this.mode = 'command'; });
    this.next();
  }

  // ---- ステップ実行 ----
  //   *Step() はステップ関数を返すだけ。msg/step/hpAnim は末尾に積む。
  //   途中に差し込みたいときは queue.unshift(...) を使う（技の処理など）。
  msgStep(text, after) { return () => { Game.push(new DialogScene({ text, onDone: () => { after && after(); this.next(); } })); }; }
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

  playerTurn(move) {
    const me = this.me(), en = this.enemy;
    const emove = en.moves[Game.rand(0, en.moves.length - 1)];
    const first = me.spd >= en.spd;
    const order = first ? [[me, en, move, true], [en, me, emove, false]] : [[en, me, emove, false], [me, en, move, true]];
    for (const [a, d, mv, isP] of order) {
      this.queue.push(() => {
        // 先に倒れていたら行動しない
        if (a.hp > 0 && d.hp > 0) this.queue.unshift(...this.moveSteps(a, d, mv, isP));
        this.next();
      });
    }
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
          const before = me.maxHp;
          const grown = makeMonster(me.id, me.level + 1);
          me.level++; me.maxHp = grown.maxHp; me.atk = grown.atk; me.def = grown.def; me.spd = grown.spd;
          me.hp = Math.min(me.maxHp, me.hp + (me.maxHp - before));
          this.queue.unshift(this.msgStep(`${me.name}は レベル${me.level}に あがった！`));
          const evo = DATA.MONSTERS[me.id].evo;
          if (evo && me.level >= evo[1] && DATA.MONSTERS[evo[0]]) {
            const to = DATA.MONSTERS[evo[0]], from = me.name;
            this.queue.splice(1, 0, this.msgStep(`おや…！？ ${from}の ようすが…！`), this.fnStep(() => {
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
    else { this.msg('にげられない！'); this.queue.push(() => { this.playerTurnEnemyOnly(); }); }
    this.next();
  }
  playerTurnEnemyOnly() {
    const en = this.enemy, me = this.me();
    this.queue.unshift(...this.moveSteps(en, me, en.moves[Game.rand(0, en.moves.length - 1)], false),
      () => { this.checkEnd(); this.next(); });
    this.next();
  }

  finish(result) {
    this.mode = 'end';
    Game.pop();
    const m = DATA.MAPS[Game.state.map]; Sound.play(m && m.bgm);
    this.onEnd && this.onEnd(result);
  }

  // ---- 入力 ----
  update(frame) {
    if (this.shake > 0) this.shake--;
    if (this.mode === 'anim') {
      const key = this.anim, target = key === 'p' ? this.me().hp : this.enemy.hp;
      if (this.shownHp[key] > target) this.shownHp[key]--;
      else { this.mode = 'busy'; this.next(); }
      return;
    }
    if (this.mode === 'command') {
      if (Input.pressed('up') || Input.pressed('down')) this.cmd ^= 2;
      if (Input.pressed('left') || Input.pressed('right')) this.cmd ^= 1;
      if (Input.pressed('a')) {
        if (this.cmd === 0) { this.mode = 'move'; this.mv = 0; }
        else if (this.cmd === 1) {
          Game.push(new PartyScene({ onPick: i => {
            const m = Game.state.party[i];
            if (m.hp <= 0) { say(`${m.name}は たたかえない！`); return; }
            if (i === this.pidx) { say(`${m.name}は もう でている！`); return; }
            this.mode = 'busy';
            this.msg(`もどれ！ ${this.me().name}！`);
            this.step(() => { this.pidx = i; this.shownHp.p = m.hp; });
            this.msg(`いけっ！ ${m.name}！`);
            this.queue.push(() => { this.playerTurnEnemyOnly(); });
            this.next();
          } }));
        } else if (this.cmd === 2) {
          Game.push(new ItemScene({ inBattle: true, onUse: name => {
            const me = this.me();
            if (me.hp >= me.maxHp) { say(`${me.name}の HPは まんたんだ。`); return; }
            this.mode = 'busy';
            this.step(() => { Game.state.items[name]--; me.hp = Math.min(me.maxHp, me.hp + DATA.ITEMS[name].heal); this.shownHp.p = me.hp; });
            this.msg(`${me.name}の HPが かいふくした！`);
            this.queue.push(() => { this.shownHp.p = me.hp; this.playerTurnEnemyOnly(); });
            this.next();
          } }));
        } else { this.mode = 'busy'; this.tryRun(); }
      }
      return;
    }
    if (this.mode === 'move') {
      const moves = this.me().moves;
      if (Input.pressed('up')) this.mv = (this.mv + moves.length - 1) % moves.length;
      if (Input.pressed('down')) this.mv = (this.mv + 1) % moves.length;
      if (Input.pressed('b')) { this.mode = 'command'; return; }
      if (Input.pressed('a')) {
        const mv = moves[this.mv];
        if (mv.pp <= 0) { say('PPが たりない！'); return; }
        this.mode = 'busy';
        this.playerTurn(mv);
      }
    }
  }

  // ---- 描画（CLASSIC COLOR）----
  draw(ctx, frame) {
    const me = this.me(), en = this.enemy;
    const W = CONFIG.W, H = CONFIG.H;
    // 背景：空と芝
    const sky = ctx.createLinearGradient(0, 0, 0, 96);
    sky.addColorStop(0, '#9fd4f5'); sky.addColorStop(1, '#dff1fb');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = '#6cb85a'; ctx.fillRect(0, 96, W, H - 96);
    ctx.fillStyle = '#5aa84a'; for (let x = 0; x < W; x += 16) ctx.fillRect(x + (frame >> 4) % 2 * 8, 104 + (x % 32 ? 8 : 0), 8, 4);
    // 足場の楕円
    const oval = (cx, cy, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    ctx.fillStyle = '#8fce7c'; oval(148, 66, 34, 8); oval(48, 138, 36, 8);

    const sx = this.shake ? (this.shake % 2 ? 2 : -2) : 0;
    // 敵：右上
    drawMonster(ctx, en, 124 + sx, 14, 48);
    Text.box(ctx, 6, 8, 100, 30);
    Text.draw(ctx, en.name, 14, 13); Text.draw(ctx, `Lv${en.level}`, 76, 13, THEME.textDim);
    Text.draw(ctx, 'HP', 14, 24, THEME.green); drawHpBar(ctx, 28, 25, 70, this.shownHp.e, en.maxHp);
    // 自分：左下
    drawMonster(ctx, me, 24, 90, 48, true);   // 自分側は左右反転（敵と向き合う）
    Text.box(ctx, 86, 100, 100, 40);
    Text.draw(ctx, me.name, 94, 105); Text.draw(ctx, `Lv${me.level}`, 156, 105, THEME.textDim);
    Text.draw(ctx, 'HP', 94, 116, THEME.green); drawHpBar(ctx, 108, 117, 70, this.shownHp.p, me.maxHp);
    Text.draw(ctx, `${String(this.shownHp.p).padStart(3)}/${String(me.maxHp).padStart(3)}`, 138, 126, THEME.textDim);

    // 下部ウィンドウ
    const by = H - 56;
    Text.box(ctx, 0, by, W, 56);
    if (this.mode === 'command') {
      Text.box(ctx, 92, by, 100, 56);
      const labels = ['たたかう', 'なかま', 'どうぐ', 'にげる'];
      labels.forEach((l, i) => {
        const x = 108 + (i % 2) * 44, y = by + 14 + Math.floor(i / 2) * 18;
        Text.draw(ctx, l, x, y);
        if (i === this.cmd) Text.cursor(ctx, x - 9, y);
      });
      Text.draw(ctx, `${me.name}は\nどうする？`.split('\n')[0], 10, by + 14);
      Text.draw(ctx, 'どうする？', 10, by + 30);
    } else if (this.mode === 'move') {
      Text.box(ctx, 56, by - 8, W - 56, 64);
      me.moves.forEach((mv, i) => {
        Text.draw(ctx, mv.name, 74, by + 4 + i * 13);
        if (i === this.mv) Text.cursor(ctx, 65, by + 4 + i * 13);
      });
      const cur = me.moves[this.mv];
      Text.box(ctx, 0, by, 56, 56);
      Text.draw(ctx, 'PP', 8, by + 10, THEME.green);
      Text.draw(ctx, `${cur.pp}/${cur.maxPp}`, 8, by + 22);
      Text.draw(ctx, DATA.MOVES[cur.name].type, 8, by + 36, THEME.textDim);
    }
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
