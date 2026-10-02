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
      $('pz-actions').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || !scene) return; if (b.dataset.act === 'close') { closeMenu(); return; } closeMenu(); scene.pressAction(b.dataset.act); });
      $('pz-skills').addEventListener('click', e => {
        if (!scene) return;
        if (e.target.closest('#pz-menu-btn')) { if (scene.mode === 'command' && Game.top() === scene) openMenu(); return; }
        const b = e.target.closest('[data-tier]'); if (b) scene.useSkill(b.dataset.tier);
      });
    } else { inst.setColors(colors); inst.reset(); }
    inst.lock();
    buildSkills(s);
    closeMenu();
    fit();
  }
  function hide() { scene = null; el().hidden = true; $('pad').hidden = false; $('note').hidden = false; Game.setViewH(CONFIG.H); Game.fit(); }
  // どうぐ・なかま・にげる は、盤面から離れた「メニュー」ボタンを押したときだけ出す（押しミス防止）
  function openMenu() { $('pz-actions').hidden = false; if (inst) inst.lock(); }
  function closeMenu() { $('pz-actions').hidden = true; }
  const menuOpen = () => !$('pz-actions').hidden;
  // 技ゲージの枠を作る（小・中・強・防御・回復 ＋ メニュー）。ChatGPT製のカード絵に合わせた CSS 描画
  //   アイコン画像があるタイプ（いまは くさ）は絵を、無いタイプは仮の丸いボールを使う
  // 円形メーター（ChatGPT製：上段＝空、下段＝満タン。小・中・強・防御・回復の順）。タイプごとのシートがあればそれを使う
  const METER_ATTRS = ['g', 'f', 'w', 't', 'e'];   // シートがあるタイプ（g=草 f=炎 w=水 t=雷 e=土。防御・回復は草のシートの4・5列目を共用）
  const METERS = {};
  function loadMeters() {
    for (const a of METER_ATTRS) {
      if (METERS[a]) continue;
      const im = new Image(); im.onload = () => { if (scene) scene._skillKey = null; }; im.src = (CONFIG.METER_IMAGES || {})[a] || `assets/ui/meter_${a}.png`;
      METERS[a] = im;
    }
  }
  const meterReady = a => METERS[a] && METERS[a].complete && METERS[a].naturalWidth > 0;
  // メーターを描く：空の絵 → たまったぶんの扇形で満タンの絵 → 区切り線（12時から時計回り、need 等分）
  function drawMeter(cv, attr, colIdx, need, have) {
    const D = 36, g = cv.getContext('2d'), im = METERS[attr]; if (!im) return;
    g.clearRect(0, 0, D, D); g.imageSmoothingEnabled = false;
    g.drawImage(im, colIdx * D, 0, D, D, 0, 0, D, D);
    if (have > 0) {
      g.save(); g.beginPath(); g.moveTo(D / 2, D / 2);
      const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.min(1, have / need);
      g.arc(D / 2, D / 2, D, a0, a1); g.closePath(); g.clip();
      g.drawImage(im, colIdx * D, D, D, D, 0, 0, D, D); g.restore();
    }
    if (need > 1) {
      g.strokeStyle = '#141414'; g.lineWidth = 2; g.lineCap = 'butt';
      for (let k = 0; k < need; k++) {
        const a = -Math.PI / 2 + Math.PI * 2 * k / need, r0 = 10.5, r1 = 19;
        g.beginPath(); g.moveTo(D / 2 + Math.cos(a) * r0, D / 2 + Math.sin(a) * r0); g.lineTo(D / 2 + Math.cos(a) * r1, D / 2 + Math.sin(a) * r1); g.stroke();
      }
    }
  }
  const ICONS = { g: ['leaf1', 'leaf2', 'leaf3'] };
  function buildSkills(s) {
    loadMeters();
    const sk = s.skills, col = s.colors, attr = col.mid[0];
    const TIER_COL = { small: 0, mid: 1, strong: 2, guard: 3, heal: 4 };
    const icon = (tier, c, mark) => {
      // メーターの絵：攻撃は自タイプのシート、防御・回復はシートに5列あればそれ、無ければ草のシートのもの
      const ma = (tier === 'guard' || tier === 'heal') ? 'g' : METER_ATTRS.includes(attr) ? attr : null;
      if (ma) return `<canvas class="meter" width="36" height="36" data-m="${ma}:${TIER_COL[tier]}"></canvas>`;
      const set = ICONS[attr]; const img = tier === 'guard' ? 'shield' : tier === 'heal' ? 'heart' : set ? set[['small', 'mid', 'strong'].indexOf(tier)] : null;
      return img ? `<div class="icon ${img}"></div>` : `<div class="icon"><div class="ball ${c} ${mark}"></div></div>`;
    };
    const tiers = [['small', sk.small, col.small, 'small'], ['mid', sk.mid, col.mid, ''], ['strong', sk.strong, col.strong, 'big'], ['guard', sk.guard, 'white', 'white']];
    let html = tiers.map(([t, name, c, mark]) => {
      const need = SKILL_NEED[t];
      const ic = icon(t, c, mark), meter = ic.startsWith('<canvas');
      return `<button class="pz-skill${meter ? ' has-meter' : ''}" data-tier="${t}"><div class="name">${name}</div><div class="row">${ic}<div class="col">${meter ? '' : `<div class="pips">${'<i class="pip"></i>'.repeat(need)}</div>`}<div class="cnt">0/${need}</div></div></div></button>`;
    }).join('');
    const hic = icon('heal', 'pink', 'pink'), hm = hic.startsWith('<canvas');
    html += `<div class="pz-skill info${hm ? ' has-meter' : ''}"><div class="name">かいふく</div><div class="row">${hic}<div class="col">${hm ? '' : '<div class="pips"><i class="pip on" style="--c:#ff8fc0"></i></div>'}<div class="cnt">そくじ</div></div></div></div>`;
    html += `<button class="pz-skill menu" id="pz-menu-btn"><span>メニュー</span></button>`;
    $('pz-skills').innerHTML = html;
    // ボールの色変数をゲージ側にも適用（.pz-ball と同じクラスで色を引く）
    $('pz-skills').querySelectorAll('.ball').forEach(b => { const probe = document.createElement('div'); probe.className = 'pz-ball ' + b.classList[1]; probe.style.display = 'none'; document.body.appendChild(probe); const cs = getComputedStyle(probe); ['--hi', '--c', '--lo'].forEach(v => b.style.setProperty(v, cs.getPropertyValue(v))); probe.remove(); });
    // ピップの点灯色（技の段階の色）
    $('pz-skills').querySelectorAll('[data-tier]').forEach(b => { const t = b.dataset.tier; const probe = document.createElement('div'); probe.className = 'pz-ball ' + (t === 'guard' ? 'white' : col[t]); probe.style.display = 'none'; document.body.appendChild(probe); b.style.setProperty('--c', t === 'guard' ? '#7a8ea8' : getComputedStyle(probe).getPropertyValue('--c')); probe.remove(); });
  }
  // ゲージの表示を現在のチャージに合わせる
  function syncSkills(s) {
    const key = JSON.stringify([s.charges, s.mode === 'command']); if (key === s._skillKey) return; s._skillKey = key;
    const hc = $('pz-skills').querySelector('.info canvas.meter'); if (hc) { const [ma, ci] = hc.dataset.m.split(':'); if (meterReady(ma)) drawMeter(hc, ma, +ci, 1, 1); }
    $('pz-skills').querySelectorAll('[data-tier]').forEach(b => {
      const t = b.dataset.tier, need = SKILL_NEED[t], have = Math.min(need, s.charges[t]);
      b.querySelectorAll('.pip').forEach((p, i) => p.classList.toggle('on', i < have));
      const cv = b.querySelector('canvas.meter'); if (cv) { const [ma, ci] = cv.dataset.m.split(':'); if (meterReady(ma)) drawMeter(cv, ma, +ci, need, have); }
      b.querySelector('.cnt').textContent = `${s.charges[t]}/${need}`;
      b.classList.toggle('ready', s.charges[t] >= need && s.mode === 'command');
    });
  }
  // 舞台の高さ（論理px）。配分の優先順位：盤面6×5を全部見せる → カード列 → 残りを舞台（ARENA_MIN〜ARENA_MAX）
  //   さらに余れば、カード列（メーター）を少し大きくして使う。舞台を空だらけに伸ばさない
  let arena = 122;
  const ARENA_MIN = 122, ARENA_MAX = 180;
  const CARD_MIN = 52, CARD_MAX = 68;   // カード列の高さ（px）。メーターはこれに合わせて大きくなる
  let cardH = CARD_MIN;
  const px = v => parseFloat(v) || 0;
  // 盤面と舞台以外が使う高さ（app の上下余白、補助表示、画面枠、カード列、puzzle の余白・隙間）を実測する
  function overhead() {
    const app = $('app'), cs = getComputedStyle(app), wrap = $('screen-wrap'), pz = el(), pcs = getComputedStyle(pz);
    let h = px(cs.paddingTop) + px(cs.paddingBottom);
    for (const c of app.children) {
      if (c === wrap || c === pz || c.hidden) continue;
      const ccs = getComputedStyle(c); if (ccs.display === 'none' || ccs.position === 'fixed') continue;
      h += c.offsetHeight + px(ccs.marginTop) + px(ccs.marginBottom);
    }
    const wcs = getComputedStyle(wrap); h += px(wcs.borderTopWidth) + px(wcs.borderBottomWidth) + px(wcs.marginTop) + px(wcs.marginBottom);
    h += px(pcs.paddingTop) + px(pcs.paddingBottom) + px(pcs.rowGap || pcs.gap);   // カード列と盤面の間の隙間
    h += cardH;
    return h;
  }
  function calc() {
    const app = $('app');
    // 実際に見えている高さ（アプリ内ブラウザや Safari のツールバーぶんを除く）
    const vis = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    const scale = Game.scale || 1;
    cardH = CARD_MIN;
    let avail = Math.min(app.clientHeight, vis) - overhead();
    // 盤面：幅いっぱい。ただし舞台の最小高さを残せないときは縮める
    const boardW = Math.max(180, Math.min(app.clientWidth - 6, 480, Math.floor((avail - ARENA_MIN * scale) * 6 / 5)));
    const boardH = boardW * 5 / 6;
    arena = Math.max(ARENA_MIN, Math.min(ARENA_MAX, Math.floor((avail - boardH) / scale)));
    // まだ余るぶんはカード列へ（上限あり）
    const left = avail - boardH - arena * scale;
    if (left > 0) cardH = Math.min(CARD_MAX, CARD_MIN + Math.floor(left));
    el().style.setProperty('--card-h', cardH + 'px');
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
  return { show, hide, fit, calc, setEnabled, sync, get arena() { return arena; }, get busy() { return inst ? inst.busy : false; }, get menuOpen() { return menuOpen(); } };
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
    this.pops = [];             // ダメージなどの浮き文字 { x, y, text, color, t }
    this.flashE = 0; this.flashP = 0;   // 当たったときの白点滅（コマ数）
    this.banner = null;         // 技名の帯 { text, t }
    this.text = '';             // 舞台に出す短いメッセージ（canvas）
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
  say(text, onDone) { this.text = text; this.pauseT = 0; this.pauseDone = onDone; this.mode = 'pause'; }
  pop(x, y, text, color = '#fff6d8') { this.pops.push({ x, y, text, color, t: 40 }); }
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
        this.fnStep(() => { const h = Math.min(en.maxHp - en.hp, Math.round(en.maxHp * en.regen)); en.hp += h; this.shownHp.e = en.hp; const eb = this.enemyBox(); this.pop(eb.cx, eb.top, `+${h}`, '#ffb0d8'); this.enemyMove = this.pickEnemyMove(); }),
        () => { this.mode = 'wait'; this.waitT = 24; this.waitDone = () => this.next(); },
      ];
    }
    const move = this.enemyMove, m = DATA.MOVES[move.name];
    // 文章は出さず、演出だけ：相手が前に出る → 自分が白く光って揺れ、ダメージの数字が浮く
    return [
      () => { this.lunge = { who: 'e', t: 14 }; this.mode = 'wait'; this.waitT = 14; this.waitDone = () => this.next(); },
      this.fnStep(() => {
        const eff = (DATA.TYPES[m.type] || {})[me.type] ?? 1;
        let d = this.dmg(en.level, m.power, en.atk, me.def, en.type === m.type ? 1.5 : 1, eff);
        let guarded = false;
        if (this.guard) { d = Math.max(1, Math.floor(d / 2)); this.guard = false; guarded = true; }
        me.hp = Math.max(0, me.hp - d); this.pshake = 12; this.flashP = 10;
        const pb = this.meBox();
        this.pop(pb.cx, pb.top, `-${d}`, guarded ? '#bfe0ff' : '#ff8a7a');
        if (guarded) this.pop(pb.cx, pb.top - 12, 'ガード!', '#bfe0ff');
        else if (eff > 1) this.pop(pb.cx, pb.top - 12, 'ばつぐん!', '#ffd24a');
        else if (eff < 1) this.pop(pb.cx, pb.top - 12, 'いまひとつ', '#c8d0c0');
        this.enemyMove = this.pickEnemyMove();
      }),
      this.animStep('p'),
    ];
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
    if (heal > 0) {
      this.step(() => { const h = Math.min(heal, me.maxHp - me.hp); me.hp += h; this.shownHp.p = me.hp; this.sparkle = 40; this.sparkleIdx = 0; const pb = this.meBox(); this.pop(pb.cx, pb.top, `+${h}`, '#ffb0d8'); });
      this.queue.push(() => { this.mode = 'wait'; this.waitT = 24; this.waitDone = () => this.next(); });
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
    this.banner = { text: name, t: 50 };
    if (tier === 'guard') {
      this.step(() => { this.guard = true; this.guardFx = 30; const pb = this.meBox(); this.pop(pb.cx, pb.top, 'まもり UP', '#bfe0ff'); });
      this.queue.push(() => { this.mode = 'wait'; this.waitT = 30; this.waitDone = () => { this.mode = 'command'; }; });
      this.next(); return;
    }
    const eff = (DATA.TYPES[me.type] || {})[en.type] ?? 1;
    const d = this.dmg(me.level, SKILL_POWER[tier], me.atk, en.def, 1.5, eff);
    // 自分が前に出る → 相手が白く光って揺れ、ダメージの数字が浮く
    this.queue.push(() => { this.hit = true; this.lunge = { who: 'p', t: 14 }; this.mode = 'wait'; this.waitT = 14; this.waitDone = () => this.next(); });
    this.step(() => {
      en.hp = Math.max(0, en.hp - d); this.shake = 12; this.flashE = 10;
      const eb = this.enemyBox();
      this.pop(eb.cx, eb.top, `-${d}`, '#fff6d8');
      if (eff > 1) this.pop(eb.cx, eb.top - 12, 'ばつぐん!', '#ffd24a'); else if (eff < 1) this.pop(eb.cx, eb.top - 12, 'いまひとつ', '#c8d0c0');
    });
    this.queue.push(this.animStep('e'));
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
      this.step(() => { Game.state.items[name]--; const h = Math.min(DATA.ITEMS[name].heal, me.maxHp - me.hp); me.hp += h; this.shownHp.p = me.hp; this.sparkle = 40; this.sparkleIdx = 0; const pb = this.meBox(); this.pop(pb.cx, pb.top, `+${h}`, '#ffb0d8'); });
      this.queue.push(() => { this.mode = 'wait'; this.waitT = 24; this.waitDone = () => this.next(); });
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
    if (this.flashE > 0) this.flashE--;
    if (this.flashP > 0) this.flashP--;
    if (this.guardFx > 0) this.guardFx--;
    if (this.lunge && --this.lunge.t <= 0) this.lunge = null;
    if (this.banner && --this.banner.t <= 0) this.banner = null;
    this.pops.forEach(p => { p.t--; p.y -= 0.4; }); this.pops = this.pops.filter(p => p.t > 0);
    if (this.mode === 'wait') { if (--this.waitT <= 0) { this.mode = 'busy'; const f = this.waitDone; this.waitDone = null; f && f(); } return; }
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
      if (++this.pauseT >= BattleScene.PAUSE_FRAMES || Input.pressed('a')) { this.mode = 'busy'; this.text = ''; const f = this.pauseDone; this.pauseDone = null; f && f(); }
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
      Puzzle.setEnabled(Game.top() === this && !Puzzle.menuOpen);
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
    if (bgImg) {
      // 舞台が絵より高いときは、比率を保って拡大し左右を少し切る（縦に引き伸ばさない）
      const bh = Math.max(152, AH), k = Math.max(1, bh / 152), bw = Math.round(W * k);
      ctx.drawImage(bgImg, Math.round((W - bw) / 2), 0, bw, bh);
    }
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

    // 相手：右、大きめ（68px箱）。舞台が高いぶん少し下げる。攻撃するときは少し前（左下）に出る
    const ey = 34 + Math.floor(extra * 0.5);
    const lg = this.lunge ? Math.sin(Math.PI * this.lunge.t / 14) * 8 : 0;
    const elx = this.lunge && this.lunge.who === 'e' ? -lg : 0, ely = this.lunge && this.lunge.who === 'e' ? lg * 0.5 : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; oval(146, ey + 66, 40, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; oval(146, ey + 68, 34, 5);
    this.drawMon(ctx, en, 112 + sx + elx, ey + ely, 68, false, this.flashE);
    this._eBox = { x: 112, y: ey, size: 68 };
    this.drawStatus(ctx, en, this.shownHp.e, 4, 4, 96, 26, false);
    if (this.mode !== 'end' && !this.viewer) this.drawNext(ctx, AH);

    // 自分：左下、後ろ姿（72px箱）。足元を舞台の下端に合わせる
    if (me) {
      const size = 64, px = this.pshake ? (this.pshake % 2 ? 2 : -2) : 0;
      const b = Mon.drawnBox(me.id, size / 24, true);
      const y = AH - 4 - size, x = 8 + px;
      const plx = this.lunge && this.lunge.who === 'p' ? lg : 0, ply = this.lunge && this.lunge.who === 'p' ? -lg * 0.5 : 0;
      ctx.fillStyle = this.hit ? 'rgba(255,240,150,0.55)' : 'rgba(0,0,0,0.14)'; oval(x + b.dx + b.w / 2, y + size - 1, b.w / 2 + 2, 4);
      this.drawMon(ctx, me, x + plx, y + ply, size, true, this.flashP);
      this._pBox = { x, y, size, b };
      if (this.sparkle > 0 && this.sparkleIdx === 0) this.drawSparkle(ctx, x + b.dx + b.w / 2, y + b.dy + b.h / 2, frame, 12);
      if (this.guard || this.guardFx > 0) this.drawGuardRing(ctx, x + b.dx + b.w / 2, y + b.dy + b.h / 2, Math.max(b.w, b.h) / 2 + 4, frame, this.guardFx);
      this.drawStatus(ctx, me, Math.round(this.shownHp.p), 92, AH - 36, 96, 32, true);
    }
    // 浮き文字（ダメージなど）
    for (const p of this.pops) {
      const a = Math.min(1, p.t / 12); ctx.globalAlpha = a;
      const w = Text.width(p.text); Text.draw(ctx, p.text, Math.round(p.x - w / 2) + 1, Math.round(p.y) + 1, 'rgba(0,0,0,0.6)'); Text.draw(ctx, p.text, Math.round(p.x - w / 2), Math.round(p.y), p.color);
      ctx.globalAlpha = 1;
    }
    // 技名の帯（自分の技を使ったとき）
    if (this.banner) {
      const w = Text.width(this.banner.text) + 16, bx = Math.round((W - w) / 2), by = 56;
      ctx.fillStyle = 'rgba(20,40,26,0.85)'; ctx.fillRect(bx, by, w, 14);
      ctx.fillStyle = '#f2d27a'; ctx.fillRect(bx, by, 2, 14); ctx.fillRect(bx + w - 2, by, 2, 14);
      Text.draw(ctx, this.banner.text, bx + 8, by + 2, '#fff6d8');
    }
    // 短いメッセージ（出現・勝利・経験値など）：舞台の中ほどの帯
    if (this.text && !this.viewer) {
      const ty = 56;
      ctx.fillStyle = 'rgba(20,40,26,0.85)'; ctx.fillRect(0, ty, W, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, ty, W, 1);
      Text.draw(ctx, this.text, 6, ty + 3, '#fff6d8');
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
  // 相手の攻撃情報：丸いターンメーター（残りターンぶん点灯、中央に残り数）＋技名（大きめ・白）＋「あと N ターン」
  //   相手（右上）と自分（左下）のあいだ、左側の空いた帯に置く。舞台が低くて入らないときは右上に寄せる
  drawNext(ctx, AH) {
    const W = CONFIG.W, urgent = this.count <= 1, col = urgent ? '#ff8a7a' : '#f2d27a';
    const bw = 110, bh = 44;
    const roomLeft = (AH - 4 - 64) - 34 >= bh - 12;   // 自分の頭（AH-68）までにほぼ収まるか（少しの重なりは許す）
    const x = roomLeft ? 2 : W - bw - 2, y = roomLeft ? 34 : 32;
    // 札
    ctx.fillStyle = 'rgba(14,30,20,0.9)'; ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = col; ctx.fillRect(x, y, bw, 1); ctx.fillRect(x, y, 2, bh);
    // 丸いターンメーター（左）：外周を ENEMY_COUNT 等分し、残りターンぶん点灯
    const R = 17, cx = x + 4 + R, cy = y + bh / 2;
    ctx.save();
    ctx.fillStyle = '#101810'; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const a0 = -Math.PI / 2 + Math.PI * 2 * i / ENEMY_COUNT + 0.08, a1 = -Math.PI / 2 + Math.PI * 2 * (i + 1) / ENEMY_COUNT - 0.08;
      ctx.fillStyle = i < this.count ? col : '#3a4a3a';
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.arc(cx, cy, R - 5, a1, a0, true); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#182818'; ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 中央の残り数（大きく）
    ctx.save(); ctx.translate(cx - 5, cy - 9); ctx.scale(2, 2); Text.draw(ctx, String(this.count), 0, 0, col); ctx.restore();
    // 右：見出し・技名・残りターン
    const tx = x + 4 + R * 2 + 6;
    Text.draw(ctx, 'つぎの こうげき', tx, y + 3, '#c8d4b8');
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(tx - 2, y + 13, x + bw - tx - 2, 14);
    const name = this.enemyMove.name, nw = Text.width(name), ns = Math.min(1.35, (x + bw - tx - 6) / Math.max(1, nw));
    ctx.save(); ctx.translate(tx, y + 14); ctx.scale(ns, ns); Text.draw(ctx, name, 0, 0, '#ffffff'); ctx.restore();
    Text.draw(ctx, 'あと', tx, y + 32, '#c8d4b8');
    ctx.save(); ctx.translate(tx + 17, y + 29); ctx.scale(1.5, 1.5); Text.draw(ctx, String(this.count), 0, 0, col); ctx.restore();
    Text.draw(ctx, 'ターン', tx + 31, y + 32, '#c8d4b8');
  }
  // 自分・相手の絵の位置（浮き文字の基準）
  enemyBox() { const e = this._eBox || { x: 112, y: 30, size: 68 }; const b = Mon.drawnBox(this.enemy.id, e.size / 24, false); return { cx: e.x + b.dx + b.w / 2, top: e.y + b.dy }; }
  meBox() { const p = this._pBox; if (!p) return { cx: 40, top: 60 }; return { cx: p.x + p.b.dx + p.b.w / 2, top: p.y + p.b.dy }; }
  // モンスターを描く。flash が残っていれば白く光らせる（当たった演出）
  drawMon(ctx, m, x, y, size, back, flash) {
    drawMonster(ctx, m, x, y, size, false, back);
    if (flash > 0 && flash % 4 >= 2) {
      const c = BattleScene.tmp(size); const g = c.getContext('2d');
      g.clearRect(0, 0, size, size); drawMonster(g, m, 0, 0, size, false, back);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, size, size); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(c, x, y);
    }
  }
  static tmp(size) { if (!this._tmp) this._tmp = document.createElement('canvas'); if (this._tmp.width !== size) { this._tmp.width = size; this._tmp.height = size; } return this._tmp; }
  // 防御の光の輪（発動時は広がる、防御中は薄く残る）
  drawGuardRing(ctx, cx, cy, r, frame, fx) {
    ctx.save();
    const t = fx > 0 ? (30 - fx) / 30 : 1;
    ctx.strokeStyle = fx > 0 ? `rgba(190,224,255,${0.9 - t * 0.5})` : `rgba(190,224,255,${0.35 + 0.15 * Math.sin(frame / 8)})`;
    ctx.lineWidth = fx > 0 ? 2 : 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, r + (fx > 0 ? t * 6 : 0), (r + (fx > 0 ? t * 6 : 0)) * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
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
