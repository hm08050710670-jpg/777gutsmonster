// ============================================================
// 戦闘（1対1・ターン制・初代風レイアウト）
//   new BattleScene({ enemy, onEnd(result) })  result: 'win'|'lose'|'run'
// ============================================================
class BattleScene {
  constructor(opt) {
    this.overlay = false;
    this.enemy = opt.enemy;
    this.onEnd = opt.onEnd || null;
    this.pidx = Game.state.party.findIndex(m => m.hp > 0);
    this.mode = 'intro';   // intro | command | move | anim | end
    this.cmd = 0; this.mv = 0;
    this.queue = [];       // 実行待ちのステップ
    this.shownHp = { p: this.me().hp, e: this.enemy.hp }; // 表示用（アニメ）
    this.shake = 0;
  }
  me() { return Game.state.party[this.pidx]; }

  enter() {
    this.msg(`あ！ やせいの\n${this.enemy.name}が とびだしてきた！`);
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
      this.msgStep(`${isPlayer ? '' : 'やせいの '}${attacker.name}の\n${move.name}！`),
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
      this.msg(`やせいの ${en.name}を\nたおした！`);
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

  // ---- 描画 ----
  draw(ctx, frame) {
    const me = this.me(), en = this.enemy;
    ctx.fillStyle = PAL[0]; ctx.fillRect(0, 0, 160, 144);
    const sx = this.shake ? (this.shake % 2 ? 2 : -2) : 0;

    // 敵：右上スプライト、左上ステータス
    ctx.drawImage(Gfx.get(DATA.MONSTERS[en.id].sprite, 2), 112 + sx, 8);
    Text.draw(ctx, en.name, 8, 8);
    Text.draw(ctx, `Lv${en.level}`, 64, 8);
    Text.draw(ctx, 'HP:', 16, 18);
    drawHpBar(ctx, 32, 20, 56, this.shownHp.e, en.maxHp);
    ctx.fillStyle = PAL[3]; ctx.fillRect(8, 26, 88, 1);

    // 自分：左下スプライト、右下ステータス
    ctx.drawImage(Gfx.get('m_back', 2), 16, 56);
    Text.draw(ctx, me.name, 72, 56);
    Text.draw(ctx, `Lv${me.level}`, 128, 56);
    Text.draw(ctx, 'HP:', 72, 66);
    drawHpBar(ctx, 88, 68, 64, this.shownHp.p, me.maxHp);
    Text.draw(ctx, `${String(this.shownHp.p).padStart(3)}/${String(me.maxHp).padStart(3)}`, 104, 76);
    ctx.fillStyle = PAL[3]; ctx.fillRect(64, 86, 96, 1);

    // 下部ウィンドウ
    Text.box(ctx, 0, 96, 160, 48);
    if (this.mode === 'command') {
      Text.box(ctx, 64, 96, 96, 48);
      const labels = ['たたかう', 'なかま', 'どうぐ', 'にげる'];
      labels.forEach((l, i) => {
        const x = 80 + (i % 2) * 40, y = 108 + Math.floor(i / 2) * 16;
        Text.draw(ctx, l, x, y);
        if (i === this.cmd) Text.cursor(ctx, x - 8, y);
      });
    } else if (this.mode === 'move') {
      Text.box(ctx, 32, 80, 128, 64);
      me.moves.forEach((mv, i) => {
        Text.draw(ctx, mv.name, 48, 88 + i * 12);
        if (i === this.mv) Text.cursor(ctx, 40, 88 + i * 12);
      });
      const cur = me.moves[this.mv];
      Text.box(ctx, 0, 96, 40, 48);
      Text.draw(ctx, 'PP', 4, 104);
      Text.draw(ctx, `${cur.pp}/${cur.maxPp}`, 4, 116);
      Text.draw(ctx, DATA.MOVES[cur.name].type, 4, 128, 2);
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
