// ============================================================
// 戦闘（1対1・ターン制）
//   new BattleScene({ enemy, onEnd(result) })  result: 'win'|'lose'|'run'
//   自分は なかまの先頭 1匹で戦う。盤面で同じ色を3つ以上そろえると技がチャージされ、
//   たまった技をタップして使う（技の使用はターンを消費しない。盤面を動かすと1ターン）。
//   色の役割：自分のタイプの 濃い＝強攻撃／基本＝中攻撃／明るい＝小攻撃、白＝防御、ピンク＝即時回復
// ============================================================
const ENEMY_COUNT = 3;   // 相手は 3 ターンごとに攻撃
const BALL_ATTR = { 'ほのお': 'f', 'みず': 'w', 'くさ': 'g', 'じめん': 'e', 'でんき': 't', 'かぜ': 'a', 'ひかり': 'l', 'やみ': 'd', 'ノーマル': 'n' };
// タイプ → 盤面の5色（クラス名）
function ballColorsOf(type) { const a = BALL_ATTR[type] || 'n'; return { strong: a + '3', mid: a + '2', small: a + '1', guard: 'white', heal: 'pink' }; }
// 消した個数 → チャージ数（3つ=1、4つ=2、5つ以上=3。強攻撃は4つ以上でさらに+1）
function chargeFor(tier, n) { let c = n >= 5 ? 3 : n >= 4 ? 2 : 1; if (tier === 'strong' && n >= 4) c++; return c; }

// 盤面（DOM）の管理：戦闘中だけパッドの代わりに表示する
const Puzzle = (() => {
  let inst = null, scene = null;
  const el = () => document.getElementById('puzzle');
  const $ = id => document.getElementById(id);
  function show(s) {
    scene = s;
    el().hidden = false; $('pad').hidden = true; $('note').hidden = true;
    const colors = Object.values(s.colors);
    if (!inst) {
      inst = PazugoruPuzzle.mount($('pz-board'), { colors, images: CONFIG.BALL_IMAGES || {}, onResolve: r => { if (scene) scene.onPuzzle(r); } });
      $('pz-actions').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || !scene) return; scene.pressAction(b.dataset.act); });
      $('pz-skills').addEventListener('click', e => { const b = e.target.closest('[data-tier]'); if (!b || !scene) return; scene.useSkill(b.dataset.tier); });
    } else { inst.setColors(colors); inst.reset(); }
    inst.lock();
    buildSkills(s);
    setMsg('');
    fit();
  }
  function hide() { scene = null; el().hidden = true; $('pad').hidden = false; $('note').hidden = false; Game.setViewH(CONFIG.H); Game.fit(); }
  function setMsg(t) { const m = $('pz-msg'); if (m.textContent !== t) m.textContent = t; }
  // 技ゲージの枠を作る（小・中・強・防御・回復）
  function buildSkills(s) {
    const sk = s.skills, col = s.colors;
    const tiers = [['small', sk.small, col.small, 'small'], ['mid', sk.mid, col.mid, ''], ['strong', sk.strong, col.strong, 'big'], ['guard', sk.guard, 'white', 'white']];
    let html = tiers.map(([t, name, c, mark]) => {
      const need = SKILL_NEED[t];
      return `<button class="pz-skill" data-tier="${t}"><div class="ball ${c} ${mark}"></div><div class="name">${name}</div><div class="pips">${'<i class="pip"></i>'.repeat(need)}</div><div class="cnt">0/${need}</div></button>`;
    }).join('');
    html += `<div class="pz-skill info"><div class="ball pink pink"></div><div class="name">かいふく</div><div class="pips"></div><div class="cnt">そくじ</div></div>`;
    $('pz-skills').innerHTML = html;
    // ボールの色変数をゲージ側にも適用（.pz-ball と同じクラスで色を引く）
    $('pz-skills').querySelectorAll('.ball').forEach(b => { const probe = document.createElement('div'); probe.className = 'pz-ball ' + b.classList[1]; probe.style.display = 'none'; document.body.appendChild(probe); const cs = getComputedStyle(probe); ['--hi', '--c', '--lo'].forEach(v => b.style.setProperty(v, cs.getPropertyValue(v))); probe.remove(); });
  }
  // ゲージの表示を現在のチャージに合わせる
  function syncSkills(s) {
    const key = JSON.stringify([s.charges, s.mode === 'command']); if (key === s._skillKey) return; s._skillKey = key;
    $('pz-skills').querySelectorAll('[data-tier]').forEach(b => {
      const t = b.dataset.tier, need = SKILL_NEED[t], have = Math.min(need, s.charges[t]);
      b.querySelectorAll('.pip').forEach((p, i) => p.classList.toggle('on', i < have));
      b.querySelector('.cnt').textContent = `${s.charges[t]}/${need}`;
      b.classList.toggle('ready', s.charges[t] >= need && s.mode === 'command');
    });
  }
  // 舞台の高さ（論理px）：盤面＋ゲージ＋ボタンを下に置き、残りを舞台に使う（ARENA_MIN〜ARENA_MAX）
  let arena = 122;
  const ARENA_MIN = 122, ARENA_MAX = 150, BOARD_PAD = 12;
  function uiH() { return ['pz-msg', 'pz-skills', 'pz-actions'].reduce((n, id) => n + ($(id) ? $(id).offsetHeight + 5 : 0), 0); }
  function calc() {
    const app = $('app');
    const cs = getComputedStyle(app);
    const innerH = app.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    const scale = Game.scale || 1;
    const ui = el().hidden ? 0 : uiH();
    const boardW = Math.max(180, Math.min(app.clientWidth - 12, 480, Math.floor((innerH - ARENA_MIN * scale - BOARD_PAD - ui) * 6 / 5)));
    const boardH = boardW * 5 / 6;
    arena = Math.max(ARENA_MIN, Math.min(ARENA_MAX, Math.floor((innerH - boardH - BOARD_PAD - ui) / scale)));
    return boardW;
  }
  function fit() {
    const boardW = calc();
    if (!inst || el().hidden) return;
    $('pz-board').style.width = boardW + 'px';
    Game.setViewH(arena);
    inst.layout();
  }
  function setEnabled(on) { if (!inst) return; if (on) inst.unlock(); else inst.lock(); }
  window.addEventListener('resize', () => setTimeout(fit, 50));
  window.addEventListener('orientationchange', () => setTimeout(fit, 200));
  // 毎フレーム：どうぐ・なかまの画面が上に乗っている間だけパッドに切り替える（十字キーが必要なため）
  function sync(scenes) {
    if (!scene || !scenes.includes(scene)) return;
    const top = scenes[scenes.length - 1];
    const padScene = top instanceof ItemScene || top instanceof PartyScene;
    const pz = el(), pad = $('pad');
    if (pz.hidden !== padScene) { pz.hidden = padScene; pad.hidden = !padScene; if (!padScene) fit(); }
    Game.setViewH(padScene ? CONFIG.H : arena);
    if (!padScene) syncSkills(scene);
  }
  return { show, hide, fit, calc, setEnabled, sync, setMsg, get arena() { return arena; }, get busy() { return inst ? inst.busy : false; } };
})();

class BattleScene {
  constructor(opt) {
    this.overlay = false;
    this.enemy = opt.enemy;
    this.trainer = opt.trainer || null;   // { name } トレーナー戦なら指定（にげられない）
    this.onEnd = opt.onEnd || null;
    this.mode = 'intro';   // intro | command | anim | busy | pause | stats | view | end
    this.queue = [];       // 実行待ちのステップ
    this.bg = opt.bg || Bg.pick(Game.state.map);          // 背景（場所・時刻で決まる）
    this.viewer = !!opt.viewer;                            // 裏技：モンスター閲覧（戦わない）
    this.shake = 0;
    this.count = ENEMY_COUNT;   // 相手の攻撃までのターン数
    this.enemyMove = this.pickEnemyMove();
    this.charges = { small: 0, mid: 0, strong: 0, guard: 0 };
    this.guard = false;         // 防御中（つぎの相手の攻撃を半減）
    this.sparkleIdx = -1;
    this.setMe();
    this.shownHp = { p: this.me ? this.me.hp : 0, e: this.enemy.hp }; // 表示用（アニメ）
  }
  party() { return Game.state.party; }
  // 戦う なかま（先頭）と、そのタイプに合わせた技・ボールの色
  setMe() {
    this.me = this.party()[0] || null;
    const t = this.me ? this.me.type : 'ノーマル';
    this.skills = this.me ? skillsOf(this.me) : TYPE_SKILLS['ノーマル'];
    this.colors = ballColorsOf(t);
  }
  pickEnemyMove() { const en = this.enemy; return en.moves[Game.rand(0, en.moves.length - 1)]; }
  // 閲覧モード用：ランダムな1匹を なかまにする
  shuffleParty() {
    const ids = Object.keys(DATA.MONSTERS);
    this.pi = Game.rand(0, ids.length - 1); this.setParty(this.pi);
  }
  // 閲覧モード用：図鑑順で offset の1匹を なかまにする（←→で1匹ずつずらす）
  setParty(offset) {
    const ids = Object.keys(DATA.MONSTERS), n = ids.length;
    Game.state.party = [makeMonster(ids[((offset % n) + n) % n], 10)];
    Party.full(Game.state); this.setMe(); this.shownHp.p = this.me.hp;
  }

  foe() { return this.trainer ? `${this.trainer.name}の ` : 'やせいの '; }
  enter() {
    if (this.viewer) { Puzzle.calc(); this.mode = 'view'; this.ids = Object.keys(DATA.MONSTERS); this.vi = this.ids.indexOf(this.enemy.id); this.pi = this.ids.indexOf(this.me.id); this.bi = Bg.NAMES.indexOf(this.bg); return; }
    Sound.play(this.trainer ? 'rival' : 'wild');
    Puzzle.show(this);
    if (this.trainer) { this.msg(`${this.trainer.name}が しょうぶを しかけてきた！`); this.msg(`${this.trainer.name}は ${this.enemy.name}を くりだした！`); }
    else this.msg(`${this.foe()}${this.enemy.name}が あらわれた！`);
    this.msg(`いけっ ${this.me.name}！`, () => { this.mode = 'command'; });
    this.next();
  }

  // ---- ステップ実行 ----
  //   *Step() はステップ関数を返すだけ。msg/step は末尾に積む。途中に差し込むときは queue.unshift。
  static get PAUSE_FRAMES() { return 40; }
  say(text, onDone) { Puzzle.setMsg(text); this.pauseT = 0; this.pauseDone = onDone; this.mode = 'pause'; }
  msgStep(text, after) { return () => { this.say(text, () => { after && after(); this.next(); }); }; }
  fnStep(fn) { return () => { fn(); this.next(); }; }
  animStep(who) { return () => { this.anim = who; this.mode = 'anim'; }; }
  msg(text, after) { this.queue.push(this.msgStep(text, after)); }
  step(fn) { this.queue.push(this.fnStep(fn)); }
  next() { const f = this.queue.shift(); if (f) f(); }

  // ---- ダメージ計算 ----
  dmg(level, power, atk, def, stab, eff) {
    const base = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * power * atk / def) / 50) + 2;
    return Math.max(1, Math.floor(base * stab * eff * Game.rand(217, 255) / 255));
  }
  // ---- 相手の攻撃 ----
  enemyAttackSteps() {
    const en = this.enemy, me = this.me;
    // 回復するタイプの相手（カエデ戦など）：HPが半分以下なら 2回に1回は 攻撃のかわりに 回復する
    if (en.regen && en.hp <= en.maxHp / 2 && Game.rand(0, 1) === 0) {
      return [
        this.msgStep(`${this.foe()}${en.name}は 花のみつで かいふくした！`),
        this.fnStep(() => { en.hp = Math.min(en.maxHp, en.hp + Math.round(en.maxHp * en.regen)); this.enemyMove = this.pickEnemyMove(); }),
      ];
    }
    const move = this.enemyMove, m = DATA.MOVES[move.name];
    const steps = [
      this.msgStep(`${this.foe()}${en.name}の ${move.name}！`),
      this.fnStep(() => {
        const eff = (DATA.TYPES[m.type] || {})[me.type] ?? 1;
        let d = this.dmg(en.level, m.power, en.atk, me.def, en.type === m.type ? 1.5 : 1, eff);
        if (this.guard) { d = Math.max(1, Math.floor(d / 2)); this.guard = false; this.guardUsed = true; }
        this.lastEff = eff;
        me.hp = Math.max(0, me.hp - d); this.pshake = 12;
        this.enemyMove = this.pickEnemyMove();
      }),
      this.animStep('p'),
    ];
    steps.push(() => { if (this.guardUsed) { this.guardUsed = false; this.say(`${this.skills.guard}で ダメージを おさえた！`, () => this.next()); } else this.next(); });
    steps.push(() => { if (this.lastEff > 1) this.say('こうかは ばつぐんだ！', () => this.next()); else if (this.lastEff < 1) this.say('こうかは いまひとつの ようだ。', () => this.next()); else this.next(); });
    return steps;
  }
  // カウントを進めて、0なら相手が攻撃
  enemyTick() {
    const en = this.enemy;
    if (en.hp > 0 && this.me.hp > 0) {
      this.count--;
      if (this.count <= 0) { this.count = ENEMY_COUNT; this.queue.unshift(...this.enemyAttackSteps()); }
    }
  }

  // ---- 盤面を消したとき：色ごとに技をチャージ（ピンクは即時回復）。1ターン進む ----
  onPuzzle(r) {
    if (this.mode !== 'command') return;
    this.mode = 'busy'; Puzzle.setEnabled(false);
    const me = this.me, col = this.colors;
    const tierOf = c => c === col.strong ? 'strong' : c === col.mid ? 'mid' : c === col.small ? 'small' : c === col.guard ? 'guard' : null;
    const comboMul = 1 + 0.25 * (r.combo - 1);
    let heal = 0; const gained = {};
    for (const g of (r.groups || [])) {
      if (g.color === col.heal) { heal += Math.round(me.maxHp * 0.05 * g.n * comboMul); continue; }
      const t = tierOf(g.color); if (!t) continue;
      const c = chargeFor(t, g.n); this.charges[t] += c; gained[t] = (gained[t] || 0) + c;
    }
    const names = Object.keys(gained).map(t => this.skills[t]);
    if (names.length) this.msg(`${names.join('・')}が チャージされた！`);
    const ready = Object.keys(gained).filter(t => this.charges[t] >= SKILL_NEED[t] && this.charges[t] - gained[t] < SKILL_NEED[t]);
    if (ready.length) this.msg(`${ready.map(t => this.skills[t]).join('・')}が つかえる！`);
    if (heal > 0) {
      this.step(() => { me.hp = Math.min(me.maxHp, me.hp + heal); });
      this.msg(`${me.name}の HPが かいふくした！`);
      this.step(() => { this.shownHp.p = me.hp; });
    }
    this.queue.push(() => { this.enemyTick(); this.next(); });
    this.queue.push(() => { this.checkEnd(); this.next(); });
    this.next();
  }
  // ---- たまった技を使う（ターンは消費しない）----
  useSkill(tier) {
    if (this.mode !== 'command' || Game.top() !== this) return;
    const need = SKILL_NEED[tier]; if (this.charges[tier] < need) return;
    const me = this.me, en = this.enemy, name = this.skills[tier];
    this.mode = 'busy'; Puzzle.setEnabled(false);
    this.charges[tier] -= need;
    if (tier === 'guard') {
      this.msg(`${me.name}の ${name}！`);
      this.step(() => { this.guard = true; });
      this.msg('まもりが かたくなった！');
      this.queue.push(() => { this.mode = 'command'; });
      this.next(); return;
    }
    const eff = (DATA.TYPES[me.type] || {})[en.type] ?? 1;
    const d = this.dmg(me.level, SKILL_POWER[tier], me.atk, en.def, 1.5, eff);
    this.msg(`${me.name}の ${name}！`);
    this.step(() => { this.hit = true; en.hp = Math.max(0, en.hp - d); this.shake = 12; });
    this.queue.push(this.animStep('e'));
    if (eff > 1) this.msg('こうかは ばつぐんだ！'); else if (eff < 1) this.msg('こうかは いまひとつの ようだ。');
    this.step(() => { this.hit = false; });
    this.queue.push(() => { this.checkEnd(); this.next(); });
    this.next();
  }
  // ---- 盤面の上のボタン ----
  pressAction(act) {
    if (this.mode !== 'command' || Game.top() !== this) return;
    if (act === 'item') this.pressItem();
    else if (act === 'party') this.pressParty();
    else if (act === 'run') this.pressRun();
  }
  pressItem() {
    Game.push(new ItemScene({ inBattle: true, onUse: name => {
      const me = this.me;
      if (me.hp >= me.maxHp) { this.say('HPは まんたんだ。', () => { this.mode = 'command'; }); return; }
      this.mode = 'busy';
      this.step(() => { Game.state.items[name]--; me.hp = Math.min(me.maxHp, me.hp + DATA.ITEMS[name].heal); this.shownHp.p = me.hp; });
      this.msg(`${me.name}の HPが かいふくした！`);
      this.queue.push(() => { this.enemyTick(); this.next(); });
      this.queue.push(() => { this.checkEnd(); this.next(); });
      this.next();
    } }));
  }
  // なかまを入れかえる（1ターン消費）。チャージは引きつがない
  pressParty() {
    if (this.party().length < 2) { Game.push(new PartyScene()); return; }
    Game.push(new PartyScene({ onPick: i => {
      const p = this.party(); if (i === 0) return;
      if (p[i].hp <= 0) { this.say(`${p[i].name}は たたかえない！`, () => { this.mode = 'command'; }); return; }
      this.mode = 'busy';
      const from = this.me.name, to = p[i].name;
      this.step(() => { [p[0], p[i]] = [p[i], p[0]]; this.setMe(); this.charges = { small: 0, mid: 0, strong: 0, guard: 0 }; this.guard = false; this.shownHp.p = this.me.hp; Puzzle.show(this); });
      this.msg(`${from}は さがった。 いけっ ${to}！`);
      this.queue.push(() => { this.enemyTick(); this.next(); });
      this.queue.push(() => { this.checkEnd(); this.next(); });
      this.next();
    } }));
  }
  pressRun() { this.mode = 'busy'; this.tryRun(); }

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
            me.level++; me.hp += grown.maxHp - me.maxHp; me.maxHp = grown.maxHp; me.atk = grown.atk; me.def = grown.def; me.spd = grown.spd;
            if (me === this.me) this.shownHp.p = me.hp;
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
                me.hp = Math.min(me.maxHp, me.hp + Math.max(0, dHp) + 10);
                if (me === this.me) { this.shownHp.p = me.hp; this.setMe(); }
              }), this.msgStep(`${from}は ${to.name}に しんかした！`));
            }
            this.queue.unshift(...steps);
          }
          this.next();
        });
      });
      this.queue.push(() => this.finish('win'));
    } else if (this.me.hp <= 0) {
      this.msg(`${this.me.name}は たおれた！`);
      const alive = party.findIndex(m => m.hp > 0);
      if (alive > 0) {
        // ほかに戦える なかまが いれば 交代
        this.step(() => { [party[0], party[alive]] = [party[alive], party[0]]; this.setMe(); this.charges = { small: 0, mid: 0, strong: 0, guard: 0 }; this.guard = false; this.shownHp.p = this.me.hp; Puzzle.show(this); });
        this.queue.push(() => { this.say(`いけっ ${this.me.name}！`, () => { this.mode = 'command'; }); });
      } else {
        this.msg('めのまえが まっくらに なった！');
        this.queue.push(() => this.finish('lose'));
      }
    } else {
      this.queue.push(() => { this.mode = 'command'; });
    }
  }

  tryRun() {
    const en = this.enemy;
    if (this.trainer) { this.msg('しょうぶの さいちゅうに にげられない！'); this.queue.push(() => { this.mode = 'command'; }); this.next(); return; }
    const ok = this.me.spd >= en.spd || Math.random() < 0.7;
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
    if (this.mode === 'view') {   // ↑↓であいて、←→でなかま、Aで背景、MENUでランダム、Bで戻る
      const n = this.ids.length;
      if (Input.pressed('down')) this.vi = (this.vi + 1) % n;
      if (Input.pressed('up')) this.vi = (this.vi + n - 1) % n;
      if (Input.pressed('down') || Input.pressed('up')) { const m = makeMonster(this.ids[this.vi], 10); this.enemy = m; this.shownHp.e = m.hp; }
      if (Input.pressed('right')) { this.pi = (this.pi + 1) % n; this.setParty(this.pi); }
      if (Input.pressed('left')) { this.pi = (this.pi + n - 1) % n; this.setParty(this.pi); }
      if (Input.pressed('a')) this.bi = (this.bi + 1) % Bg.NAMES.length;
      if (Input.pressed('start')) { this.shuffleParty(); }
      this.bg = Bg.NAMES[this.bi];
      if (Input.pressed('b')) { Game.pop(); this.onEnd && this.onEnd('view'); }
      return;
    }
    if (this.mode === 'stats') {   // のうりょく表：約2.5秒で自動で閉じる（タップでも閉じる）
      this.statsT = (this.statsT || 0) + 1;
      if (this.statsT >= 150 || Input.pressed('a') || Input.pressed('b')) { this.statsT = 0; this.mode = 'busy'; this.next(); }
      return;
    }
    if (this.mode === 'pause') {
      if (++this.pauseT >= BattleScene.PAUSE_FRAMES || Input.pressed('a')) { this.mode = 'busy'; const f = this.pauseDone; this.pauseDone = null; f && f(); }
      return;
    }
    if (this.pshake > 0) this.pshake--;
    if (this.mode === 'anim') {
      const key = this.anim, target = key === 'p' ? this.me.hp : this.enemy.hp;
      const spd = key === 'p' ? Math.max(1, Math.ceil(this.me.maxHp / 60)) : 1;
      if (this.shownHp[key] > target) this.shownHp[key] = Math.max(target, this.shownHp[key] - spd);
      else { this.mode = 'busy'; this.next(); }
      return;
    }
    if (this.mode === 'command') {
      Puzzle.setEnabled(Game.top() === this);
      return;
    }
  }

  // ---- 描画 ----
  //   舞台（高さ AH＝122〜150）：左上に相手のHP窓、右上に相手のつぎの攻撃、右に相手、左下に自分（後ろ姿）、右下に自分のHP窓
  draw(ctx, frame) {
    const en = this.enemy, me = this.me;
    const W = CONFIG.W, H = CONFIG.H;
    const AH = Puzzle.arena;
    const bgImg = Bg.get(this.bg);
    if (bgImg) ctx.drawImage(bgImg, 0, 0, W, Math.max(152, AH));
    else {
      const sky = ctx.createLinearGradient(0, 0, 0, 80);
      sky.addColorStop(0, '#9fd4f5'); sky.addColorStop(1, '#dff1fb');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 80);
      ctx.fillStyle = '#6cb85a'; ctx.fillRect(0, 80, W, H - 80);
    }
    if (this.viewer) { ctx.fillStyle = THEME.greenDark; ctx.fillRect(0, AH, W, H - AH); }
    const oval = (cx, cy, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    const sx = this.shake ? (this.shake % 2 ? 2 : -2) : 0;
    const extra = AH - 122;

    // 相手：右、大きめ（68px箱）。舞台が高いぶん少し下げる
    const ey = 30 + Math.floor(extra / 3);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; oval(146, ey + 66, 40, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; oval(146, ey + 68, 34, 5);
    drawMonster(ctx, en, 112 + sx, ey, 68);
    this.drawStatus(ctx, en, this.shownHp.e, 4, 4, 96, 26, false);
    if (this.mode !== 'end' && !this.viewer) this.drawNext(ctx, 104, 4, 84, 34);

    // 自分：左下、後ろ姿（72px箱）。足元を舞台の下端に合わせる
    if (me) {
      const size = 64, px = this.pshake ? (this.pshake % 2 ? 2 : -2) : 0;
      const b = Mon.drawnBox(me.id, size / 24, true);
      const y = AH - 4 - size, x = 8 + px;
      ctx.fillStyle = this.hit ? 'rgba(255,240,150,0.55)' : 'rgba(0,0,0,0.14)'; oval(x + b.dx + b.w / 2, y + size - 1, b.w / 2 + 2, 4);
      drawMonster(ctx, me, x, y + (this.hit ? -2 : 0), size, false, true);
      if (this.sparkle > 0 && this.sparkleIdx === 0) this.drawSparkle(ctx, x + b.dx + b.w / 2, y + b.dy + b.h / 2, frame, 12);
      this.drawStatus(ctx, me, Math.round(this.shownHp.p), 92, AH - 36, 96, 32, true);
      if (this.guard) this.drawGuardMark(ctx, x + b.dx + b.w + 2, y + 6);
    }
    if (this.viewer) {
      Text.box(ctx, 0, AH, W, H - AH);
      const d = DATA.MONSTERS[en.id], ly = AH + 6, lh = H - AH >= 60 ? 12 : 9;
      Text.draw(ctx, `No.${d.no} ${d.name} (${d.type})  ${this.vi + 1}/${this.ids.length}`, 8, ly);
      Text.draw(ctx, `はいけい: ${this.bg}`, 8, ly + lh, THEME.textDim);
      Text.draw(ctx, `なかま: ${this.pi + 1}/${this.ids.length}`, 100, ly + lh, THEME.textDim);
      Text.draw(ctx, '↑↓ あいて  ←→ なかま', 8, ly + lh * 2, THEME.green);
      Text.draw(ctx, 'A はいけい  MENU ランダム  B もどる', 8, ly + lh * 3, THEME.green);
    }
    if (this.mode === 'stats') this.drawStats(ctx, this.statsMon, frame);
  }

  // 相手の つぎの攻撃と そのターン数（右上の札）
  drawNext(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(20,40,26,0.82)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, w, 1);
    Text.draw(ctx, 'つぎの こうげき', x + 4, y + 2, '#d8e2c8');
    Text.draw(ctx, this.enemyMove.name, x + 4, y + 12, '#fff6d8');
    const s = `あと ${this.count} ターン`;
    const col = this.count <= 1 ? '#ff8a7a' : '#f2d27a';
    Text.draw(ctx, s, x + w - 4 - Text.width(s), y + 22, col);
  }
  // 防御中のしるし（盾）
  drawGuardMark(ctx, x, y) {
    ctx.fillStyle = '#e8f0ff'; ctx.fillRect(x, y, 7, 5); ctx.fillRect(x + 1, y + 5, 5, 2); ctx.fillRect(x + 2, y + 7, 3, 1);
    ctx.fillStyle = '#4a6a9a'; ctx.fillRect(x + 2, y + 2, 3, 3);
  }

  // HP窓：名前 / Lv. / タイプアイコン / HPピル＋バー / (自分のみ) 現在/最大
  drawStatus(ctx, m, hp, x, y, w, h, mine) {
    Text.box(ctx, x, y, w, h, { tab: true });
    Text.draw(ctx, m.name, x + 7, y + 3);
    const lv = `Lv.${m.level}`;
    Text.draw(ctx, lv, x + w - 7 - Text.width(lv), y + 3);
    const ry = y + 14;
    const icon = Gfx.get(`type_${m.type}`, 1);
    if (icon) ctx.drawImage(icon, x + 7, ry);
    ctx.fillStyle = THEME.greenDark; ctx.fillRect(x + 18, ry - 2, 14, 12);
    Text.draw(ctx, 'HP', x + 21, ry, '#f2d27a');
    drawHpBar(ctx, x + 32, ry + 1, w - 39, hp, m.maxHp, true);
    if (mine) {
      const s = `${hp} / ${m.maxHp}`;
      Text.draw(ctx, s, x + w - 7 - Text.width(s), y + 22);
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
    const x = 12, y = 6, w = 168, h = 96;
    Text.box(ctx, x, y, w, h);
    Text.draw(ctx, `${m.name}の`, x + 8, y + 7);
    Text.draw(ctx, 'のうりょくが あがった！', x + 8, y + 18);
    Text.rule(ctx, x + 6, y + 30, w - 12);
    const rows = [['HP', 'maxHp'], ['こうげき', 'atk'], ['ぼうぎょ', 'def'], ['すばやさ', 'spd']];
    rows.forEach(([label, key], i) => {
      const ry = y + 34 + i * 13, b = g.before[key], a = g.after[key];
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
