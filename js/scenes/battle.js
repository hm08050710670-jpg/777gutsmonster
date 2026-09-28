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
    if (this.sparkle > 0) this.sparkle--;
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
      // 2×2 の枠を上下左右で移動（存在しない枠には行かない）
      const go = d => { const n = this.mv ^ d; if (n < moves.length) this.mv = n; };
      if (Input.pressed('up') || Input.pressed('down')) go(2);
      if (Input.pressed('left') || Input.pressed('right')) go(1);
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
    this.drawStatus(ctx, en, this.shownHp.e, 4, 6, 104, 32, false);
    // 自分：左下（左右反転で敵と向き合う）
    if (this.sparkle > 0) this.drawSparkle(ctx, 48, 114, frame);
    drawMonster(ctx, me, 24, 90, 48, true);
    this.drawStatus(ctx, me, this.shownHp.p, 84, 98, 104, 44, true);

    // 下部ウィンドウ
    const by = H - 56;
    if (this.mode === 'command') {
      Text.box(ctx, 0, by, 90, 56);
      Text.draw(ctx, `${me.name}は`, 8, by + 14);
      Text.draw(ctx, 'どうする？', 8, by + 30);
      const labels = ['たたかう', 'なかま', 'どうぐ', 'にげる'];
      labels.forEach((l, i) => {
        const x = 92 + (i % 2) * 51, y = by + Math.floor(i / 2) * 29;
        Text.box(ctx, x, y, 49, 27);
        Text.draw(ctx, l, x + 13, y + 10);
        if (i === this.cmd) Text.cursor(ctx, x + 5, y + 10);
      });
    } else if (this.mode === 'move') {
      const py = H - 70;
      Text.box(ctx, 0, py, W, 70, { fill: THEME.green });
      me.moves.forEach((mv, i) => {
        const x = 1 + (i % 2) * 69, y = py + 4 + Math.floor(i / 2) * 32;
        Text.box(ctx, x, y, 68, 30);
        Text.draw(ctx, mv.name, x + 8, y + 7);
        Text.draw(ctx, `PP ${String(mv.pp).padStart(2)}/${String(mv.maxPp).padStart(2)}`, x + 18, y + 18, THEME.textDim);
        if (i === this.mv) Text.cursor(ctx, x + 3, y + 7);
      });
      // 右：技の説明（タイプ・いりょく・めいちゅう）
      const cur = DATA.MOVES[me.moves[this.mv].name];
      const dx = 140, dw = 50;
      Text.box(ctx, dx, py + 4, dw, 62);
      Text.draw(ctx, cur.type, dx + 5, py + 9, THEME.green);
      Text.rule(ctx, dx + 5, py + 20, dw - 10);
      Text.draw(ctx, 'いりょく', dx + 5, py + 24);
      Text.draw(ctx, String(cur.power), dx + dw - 6 - Text.width(String(cur.power)), py + 33);
      Text.draw(ctx, 'めいちゅう', dx + 5, py + 44);
      Text.draw(ctx, '100', dx + dw - 6 - 12, py + 53);
    } else {
      Text.box(ctx, 0, by, W, 56);
    }

    if (this.mode === 'stats') this.drawStats(ctx, me, frame);
  }

  // HP窓：名前 / Lv. / タイプアイコン / HPピル＋バー / (自分のみ) EXPバー＋現在/最大
  drawStatus(ctx, m, hp, x, y, w, h, mine) {
    Text.box(ctx, x, y, w, h, { tab: true });
    Text.draw(ctx, m.name, x + 8, y + 6);
    const lv = `Lv.${m.level}`;
    Text.draw(ctx, lv, x + w - 8 - Text.width(lv), y + 6);
    const ry = y + 18;
    const icon = Gfx.get(`type_${m.type}`, 1);
    if (icon) ctx.drawImage(icon, x + 8, ry);
    // 「HP」の金文字ピル
    ctx.fillStyle = THEME.greenDark; ctx.fillRect(x + 19, ry - 1, 14, 10);
    Text.draw(ctx, 'HP', x + 22, ry, '#f2d27a');
    drawHpBar(ctx, x + 33, ry + 1, w - 41, hp, m.maxHp, true);
    if (mine) {
      // EXP（次のレベルまで）
      const need = m.level * 20, r = Math.min(1, (m.exp || 0) / need);
      ctx.fillStyle = THEME.greenDark; ctx.fillRect(x + 8, y + 33, 44, 5);
      ctx.fillStyle = '#9fd0f2'; ctx.fillRect(x + 9, y + 34, Math.floor(42 * r), 3);
      const s = `${hp} / ${m.maxHp}`;
      Text.draw(ctx, s, x + w - 8 - Text.width(s), y + 31);
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
    const x = 12, y = 36, w = 168, h = 104;
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
