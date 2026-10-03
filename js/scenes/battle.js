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
      $('pz-skills').addEventListener('click', e => { if (scene && e.target.closest('#pz-menu-btn') && scene.mode === 'command' && Game.top() === scene) openMenu(); });
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
  // 長い技名を2行に分ける（7文字以上）。小さい「ッ・ャ・ュ・ョ」や「ー」の前では切らない
  function splitName(name) {
    if (name.length < 7) return name;
    let i = Math.ceil(name.length / 2);
    while (i > 1 && 'ッャュョァィゥェォーっゃゅょ'.includes(name[i])) i--;
    return name.slice(0, i) + '<br>' + name.slice(i);
  }
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
    const tiers = [['small', sk.small, col.small, 'small'], ['mid', sk.mid, col.mid, ''], ['strong', sk.strong, col.strong, 'big'], ['guard', 'ガード', 'white', 'white'], ['heal', 'かいふく', 'pink', 'pink']];
    let html = tiers.map(([t, name, c, mark]) => {
      const need = SKILL_NEED[t];
      const ic = icon(t, c, mark), meter = ic.startsWith('<canvas');
      return `<div class="pz-skill${meter ? ' has-meter' : ''}" data-tier="${t}"><div class="row">${ic}<div class="col">${meter ? '' : `<div class="pips">${'<i class="pip"></i>'.repeat(need)}</div>`}<div class="cnt">0/${need}</div></div></div></div>`;
    }).join('');
    // 技名は別の枠（メーターの上の行）に
    $('pz-names').innerHTML = tiers.map(([t, name]) => `<div class="pz-name">${splitName(name)}</div>`).join('') + '<div class="pz-name empty"></div>';
    // 技名プレートの色を自タイプのボール色（小・中・強）に合わせる
    [['--n1', col.small], ['--n2', col.mid], ['--n3', col.strong]].forEach(([v, c]) => { const probe = document.createElement('div'); probe.className = 'pz-ball ' + c; probe.style.display = 'none'; document.body.appendChild(probe); $('pz-names').style.setProperty(v, getComputedStyle(probe).getPropertyValue('--c')); probe.remove(); });
    html += `<button class="pz-skill menu" id="pz-menu-btn"><span>メニュー</span></button>`;
    $('pz-skills').innerHTML = html;
    // ボールの色変数をゲージ側にも適用（.pz-ball と同じクラスで色を引く）
    $('pz-skills').querySelectorAll('.ball').forEach(b => { const probe = document.createElement('div'); probe.className = 'pz-ball ' + b.classList[1]; probe.style.display = 'none'; document.body.appendChild(probe); const cs = getComputedStyle(probe); ['--hi', '--c', '--lo'].forEach(v => b.style.setProperty(v, cs.getPropertyValue(v))); probe.remove(); });
    // ピップの点灯色（技の段階の色）
    $('pz-skills').querySelectorAll('[data-tier]').forEach(b => { const t = b.dataset.tier; const probe = document.createElement('div'); probe.className = 'pz-ball ' + (t === 'guard' ? 'white' : t === 'heal' ? 'pink' : col[t]); probe.style.display = 'none'; document.body.appendChild(probe); b.style.setProperty('--c', t === 'guard' ? '#7a8ea8' : getComputedStyle(probe).getPropertyValue('--c')); probe.remove(); });
  }
  // ゲージの表示を現在のチャージに合わせる
  function syncSkills(s) {
    const key = JSON.stringify([s.charges, s.mode === 'command']); if (key === s._skillKey) return; s._skillKey = key;
    $('pz-skills').querySelectorAll('[data-tier]').forEach(b => {
      const t = b.dataset.tier, need = SKILL_NEED[t], have = Math.min(need, s.charges[t]);
      b.querySelectorAll('.pip').forEach((p, i) => p.classList.toggle('on', i < have));
      const cv = b.querySelector('canvas.meter'); if (cv) { const [ma, ci] = cv.dataset.m.split(':'); if (meterReady(ma)) drawMeter(cv, ma, +ci, need, have); }
      b.querySelector('.cnt').textContent = `${s.charges[t]}/${need}`;
      b.classList.toggle('ready', s.charges[t] >= need);
    });
  }
  // 舞台の高さ（論理px）。配分の優先順位：盤面6×5を全部見せる → カード列 → 残りを舞台（ARENA_MIN〜ARENA_MAX）
  //   さらに余れば、カード列（メーター）を少し大きくして使う。舞台を空だらけに伸ばさない
  let arena = 122;
  const ARENA_MIN = 110, ARENA_MAX = 118;   // 舞台はコンパクトに固定気味（盤面を必ず全部見せるため）
  const CARD_MIN = 60, CARD_MAX = 64;   // カード列の高さ（px）。メーターはこれに合わせて大きくなる
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
    h += px(pcs.paddingTop) + px(pcs.paddingBottom) + px(pcs.rowGap || pcs.gap) * 2;   // 技名の行・カード列・盤面の間の隙間
    h += cardH + ($('pz-names') ? $('pz-names').offsetHeight : 0);
    return h;
  }
  // 実際に見えている高さ。アプリ内ブラウザ（Claude など）は画面全体の高さを返しながら上部をネイティブの見出しで隠すことがあるので、
  //   「全画面でないのに画面の全高と同じ」ときは、見出しぶん（安全域の上 ＋ 約72px）を差し引く
  function visibleHeight(app) {
    const vis = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    let h = Math.min(app.clientHeight, vis);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    if (!standalone && screen.height && window.innerHeight >= screen.height - 4) {
      const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden'; document.body.appendChild(probe);
      const sat = probe.offsetHeight; probe.remove();
      h -= sat + 72;
    }
    return h;
  }
  function calc() {
    const app = $('app');
    // 実際に見えている高さ（アプリ内ブラウザや Safari のツールバーぶんを除く）
    const scale = Game.scale || 1;
    cardH = CARD_MIN;
    let avail = visibleHeight(app) - overhead();
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
    this.charges = { small: 0, mid: 0, strong: 0, guard: 0, heal: 0 };
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

  // ---- 盤面を消したとき：色ごとに技をチャージ。規定数に達した技は自動で発動（小→中→強→防御→回復の順）。そのあと1ターン進む ----
  onPuzzle(r) {
    if (this.mode !== 'command') return;
    this.mode = 'busy'; Puzzle.setEnabled(false);
    const col = this.colors;
    const tierOf = c => c === col.strong ? 'strong' : c === col.mid ? 'mid' : c === col.small ? 'small' : c === col.guard ? 'guard' : c === col.heal ? 'heal' : null;
    for (const g of (r.groups || [])) {
      const t = tierOf(g.color); if (!t) continue;
      this.charges[t] += chargeFor(t, g.n);
    }
    // たまった技を順に発動（相手を倒したら残りは発動しない。チャージは残る）
    const order = ['small', 'mid', 'strong', 'guard', 'heal'];
    const fireNext = () => {
      const t = order.find(k => this.charges[k] >= SKILL_NEED[k]);
      if (!t || this.enemy.hp <= 0) { this.next(); return; }
      this.charges[t] -= SKILL_NEED[t];
      this.queue.unshift(...this.skillSteps(t), fireNext);
      this.next();
    };
    this.queue.push(fireNext);
    this.queue.push(() => { this.enemyTick(); this.next(); });
    this.queue.push(() => { this.checkEnd(); this.next(); });
    this.next();
  }
  // 技の演出と効果のステップ列
  skillSteps(tier) {
    const me = this.me, en = this.enemy, name = tier === 'heal' ? 'かいふく' : tier === 'guard' ? 'ガード' : this.skills[tier];
    const wait = n => () => { this.mode = 'wait'; this.waitT = n; this.waitDone = () => this.next(); };
    const steps = [this.fnStep(() => { this.banner = { text: name, t: 50 }; })];
    if (tier === 'guard') {
      steps.push(this.fnStep(() => { this.guard = true; this.guardFx = 30; const pb = this.meBox(); this.pop(pb.cx, pb.top, 'まもり UP', '#bfe0ff'); }), wait(30));
      return steps;
    }
    if (tier === 'heal') {
      steps.push(this.fnStep(() => { const h = Math.min(Math.round(me.maxHp * SKILL_HEAL), me.maxHp - me.hp); me.hp += h; this.shownHp.p = me.hp; this.sparkle = 40; this.sparkleIdx = 0; const pb = this.meBox(); this.pop(pb.cx, pb.top, `+${h}`, '#ffb0d8'); }), wait(30));
      return steps;
    }
    const eff = (DATA.TYPES[me.type] || {})[en.type] ?? 1;
    // 自分が前に出る → 相手が白く光って揺れ、ダメージの数字が浮く
    steps.push(() => { this.hit = true; this.lunge = { who: 'p', t: 14 }; this.mode = 'wait'; this.waitT = 14; this.waitDone = () => this.next(); });
    steps.push(this.fnStep(() => {
      const d = this.dmg(me.level, SKILL_POWER[tier], me.atk, en.def, 1.5, eff);
      en.hp = Math.max(0, en.hp - d); this.shake = 12; this.flashE = 10;
      const eb = this.enemyBox();
      this.pop(eb.cx, eb.top, `-${d}`, '#fff6d8');
      if (eff > 1) this.pop(eb.cx, eb.top - 12, 'ばつぐん!', '#ffd24a'); else if (eff < 1) this.pop(eb.cx, eb.top - 12, 'いまひとつ', '#c8d0c0');
    }));
    steps.push(this.animStep('e'), this.fnStep(() => { this.hit = false; }), wait(10));
    return steps;
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
      if (DATA.ITEMS[name].ball) { this.throwBall(name); return; }
      if (me.hp >= me.maxHp) { this.say('HPは まんたんだ。', () => { this.mode = 'command'; }); return; }
      this.mode = 'busy';
      this.step(() => { Game.state.items[name]--; const h = Math.min(DATA.ITEMS[name].heal, me.maxHp - me.hp); me.hp += h; this.shownHp.p = me.hp; this.sparkle = 40; this.sparkleIdx = 0; const pb = this.meBox(); this.pop(pb.cx, pb.top, `+${h}`, '#ffb0d8'); });
      this.queue.push(() => { this.mode = 'wait'; this.waitT = 24; this.waitDone = () => this.next(); });
      this.queue.push(() => { this.enemyTick(); this.next(); });
      this.queue.push(() => { this.checkEnd(); this.next(); });
      this.next();
    } }));
  }
  // ---- ガッツボール：捕獲 ----
  //   投げた時点で成否を決め（ロジック）、演出はその結果を再生するだけ（演出と判定を分ける）
  //   捕獲率 = (1 - 残りHP割合×0.75) × 捕まえやすさ（進化段階） × ボール倍率
  catchChance(en, ballMul) {
    const d = DATA.MONSTERS[en.id] || {};
    const rate = d.special ? DATA.CATCH_RATE.special : (DATA.CATCH_RATE[d.stage] || 0.5);
    return Math.max(0.02, Math.min(0.95, (1 - (en.hp / en.maxHp) * 0.75) * rate * ballMul));
  }
  throwBall(name) {
    const st = Game.state, en = this.enemy;
    if (this.trainer) { this.say('ひとの モンスターは ゲットできない！', () => { this.mode = 'command'; }); return; }
    st.items[name]--;
    const p = this.catchChance(en, DATA.ITEMS[name].ball || 1);
    const ok = Math.random() < p;
    // 失敗のとき、何回目の揺れで逃げるか（捕獲率が高いほど粘る）
    const breakAt = ok ? 4 : (p < 0.2 ? 1 : p < 0.45 ? 2 : 3);
    this.mode = 'capture'; Puzzle.setEnabled(false);
    const pb = this.meBox(), eb = this.enemyBox();
    this.cap = { phase: 'throw', t: 0, ok, breakAt, shakes: 0, from: { x: pb.cx + 10, y: pb.top + 10 }, to: { x: eb.cx, y: eb.cy }, x: pb.cx, y: pb.top, rot: 0, ground: eb.bottom, particles: [] };
  }
  // 毎フレーム：捕獲演出を進める
  updateCapture() {
    const c = this.cap, en = this.enemy; c.t++;
    const go = (phase, t = 0) => { c.phase = phase; c.t = t; };
    switch (c.phase) {
      case 'throw': {   // 0.4秒：弧を描いて飛ぶ・回転
        const T = 24, k = Math.min(1, c.t / T);
        c.x = c.from.x + (c.to.x - c.from.x) * k; c.y = c.from.y + (c.to.y - c.from.y) * k - Math.sin(Math.PI * k) * 34; c.rot += 0.35;
        if (c.t >= T) { go('hit'); this.shake = 8; this.flashE = 6; }
        break; }
      case 'hit': if (c.t >= 10) go('open'); break;          // 命中：白フラッシュ＋黄色のヒット
      case 'open': if (c.t >= 12) go('absorb'); break;       // パカッ
      case 'absorb': {   // 0.7秒：相手が光って小さくなり、光の粒がボールへ
        if (c.t % 2 === 0) c.particles.push({ x: c.to.x + (Math.random() - 0.5) * 40, y: c.to.y - 10 + (Math.random() - 0.5) * 40, t: 18 });
        if (c.t >= 42) go('close');
        break; }
      case 'close': if (c.t >= 12) { go('drop'); c.flash = 6; } break;   // 閉じる→カチッ
      case 'drop': {   // 落ちる（小さく弾む）
        const T = 14, k = Math.min(1, c.t / T);
        c.y = c.to.y + (c.ground - c.to.y) * k + (k > 0.8 ? -Math.sin((k - 0.8) / 0.2 * Math.PI) * 3 : 0);
        if (c.t >= T) go('pause');
        break; }
      case 'pause': if (c.t >= 34) { c.shakes++; go('shake'); } break;   // 静止（じらし）
      case 'shake': {   // 1回の揺れ 0.6秒：ぐらぐら（回転＋横ずれ、だんだん収まる）
        const k = c.t / 36, env = Math.max(0, 1 - k * 0.6);
        c.rot = Math.sin(c.t / 36 * Math.PI * 3) * 0.55 * env; c.dx = Math.sin(c.t / 36 * Math.PI * 3) * 2.5 * env;
        if (c.t >= 36) { c.rot = 0; c.dx = 0; if (c.shakes >= c.breakAt && !c.ok) go('breakout'); else if (c.shakes >= 3) go('hold'); else go('pause'); }
        break; }
      case 'hold': if (c.t >= 44) go('success'); break;   // 3回揺れたあとの一瞬の間（ここが一番の見せ場）
      case 'success': {   // カチッ：小さなフラッシュだけ。ボールは閉じたまま残す
        if (c.t === 1) c.flash = 8;
        if (c.t >= 30) { go('done'); this.captured(); }
        break; }
      case 'breakout': {   // パカッ→相手が光から戻る
        if (c.t === 1) c.flash = 6;
        if (c.t >= 22) { go('done'); this.breakoutEnd(); }
        break; }
    }
    c.particles.forEach(pt => { pt.t--; pt.x += (c.to.x - pt.x) * 0.18; pt.y += (c.to.y - pt.y) * 0.18; }); c.particles = c.particles.filter(pt => pt.t > 0);
    if (c.flash > 0) c.flash--;
  }
  captured() {
    const st = Game.state, en = this.enemy;
    this.capDone = true;
    const mon = Object.assign({}, en, { hp: en.hp, exp: 0 }); delete mon.regen;
    if (st.party.length < CONFIG.PARTY_MAX) st.party.push(mon); else { st.box = st.box || []; st.box.push(mon); }
    // ボールはそのまま画面に残す（中にモンスターが入っている）
    this.say(`${en.name}を ゲットした！`, () => {
      const dest = st.party.includes(mon) ? 'なかまに くわわった！' : 'ボックスに おくられた。';
      this.say(`${en.name}は ${dest}`, () => { Save.auto(st); this.finish('capture'); });
    });
  }
  breakoutEnd() {
    this.cap = null; this.mode = 'busy';
    this.say('ああっ！ モンスターが でてきた！', () => {
      this.queue.push(() => { this.enemyTick(); this.next(); });
      this.queue.push(() => { this.checkEnd(); this.next(); });
      this.next();
    });
  }
  // ボールの絵（assets/ui/gutsball.png）。足元中央を (x, y) に置く
  static ball() { if (!this._ball) { const im = new Image(); im.src = CONFIG.GUTSBALL_IMG || 'assets/ui/gutsball.png'; this._ball = im; this._ballMeta = CONFIG.GUTSBALL_META || null; if (!this._ballMeta) fetch('assets/ui/gutsball.json').then(r => r.json()).then(m => { this._ballMeta = m; }).catch(() => {}); } return this._ball; }
  drawBall(ctx, name, x, y, rot = 0, scale = 1) {
    const im = BattleScene.ball(), m = BattleScene._ballMeta; if (!im.complete || !m || !m[name]) { ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(x, y - 8, 8, 0, Math.PI * 2); ctx.fill(); return; }
    const [sx, sy, sw, sh] = m[name];
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(x, y - 8); ctx.rotate(rot); ctx.scale(scale, scale);
    ctx.drawImage(im, sx, sy, sw, sh, -Math.round(sw / 2), -(sh - 8), sw, sh); ctx.restore();
  }
  drawCapture(ctx) {
    const c = this.cap; if (!c) return;
    const frame = ['throw', 'hit', 'drop', 'pause', 'shake', 'hold', 'success', 'done'].includes(c.phase) ? 'closed'
      : c.phase === 'open' ? (c.t < 6 ? 'open1' : 'open2') : c.phase === 'absorb' ? (Math.floor(c.t / 4) % 2 ? 'beam1' : 'beam2') : c.phase === 'close' ? (c.t < 6 ? 'open1' : 'closing') : 'burst';
    // 軌跡
    if (c.phase === 'throw') { for (let i = 1; i <= 3; i++) { const k = Math.max(0, c.t - i * 2) / 24; const px = c.from.x + (c.to.x - c.from.x) * k, py = c.from.y + (c.to.y - c.from.y) * k - Math.sin(Math.PI * k) * 34; ctx.fillStyle = `rgba(255,255,255,${0.35 - i * 0.1})`; ctx.beginPath(); ctx.arc(px, py - 8, 7 - i, 0, Math.PI * 2); ctx.fill(); } }
    // 吸い込みの光の粒
    for (const pt of c.particles) { ctx.fillStyle = `rgba(190,235,255,${Math.min(1, pt.t / 10)})`; ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2); }
    // 命中のヒット（黄色の放射）と白フラッシュ
    if (c.phase === 'hit') { ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - c.t / 10)})`; ctx.beginPath(); ctx.arc(c.to.x, c.to.y - 8, 10 + c.t * 2, 0, Math.PI * 2); ctx.fill(); this.drawSparkle(ctx, c.to.x, c.to.y - 8, c.t * 3, 10); }
    if (c.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.7 * c.flash / 8})`; ctx.beginPath(); ctx.arc(c.x, c.y - 8, 14, 0, Math.PI * 2); ctx.fill(); }
    if (c.phase === 'breakout') { ctx.fillStyle = `rgba(200,240,255,${0.8 * (1 - c.t / 22)})`; ctx.beginPath(); ctx.arc(c.x, c.y - 8, 10 + c.t, 0, Math.PI * 2); ctx.fill(); }
    this.drawBall(ctx, frame, Math.round(c.x + (c.dx || 0)), Math.round(c.y), c.rot);
  }
  // 捕獲中の相手の描き方：吸い込み中は白く光りながら小さくなってボールへ。逃げ出すときはボールから戻る
  enemyCaptureView() {
    const c = this.cap; if (!c) return null;
    if (c.phase === 'absorb') { const k = c.t / 42; return { scale: 1 - k, white: Math.min(1, k * 1.5 + 0.3), toBall: k }; }
    if (['close', 'drop', 'pause', 'shake', 'success', 'done'].includes(c.phase)) return { hidden: true };
    if (c.phase === 'breakout') { const k = Math.min(1, c.t / 16); return { scale: k, white: 1 - k, toBall: 1 - k }; }
    return null;
  }

  // なかまを入れかえる（1ターン消費）。チャージは引きつがない
  pressParty() {
    if (this.party().length < 2) { Game.push(new PartyScene()); return; }
    Game.push(new PartyScene({ onPick: i => {
      const p = this.party(); if (i === 0) return;
      if (p[i].hp <= 0) { this.say(`${p[i].name}は たたかえない！`, () => { this.mode = 'command'; }); return; }
      this.mode = 'busy';
      const from = this.me.name, to = p[i].name;
      this.step(() => { [p[0], p[i]] = [p[i], p[0]]; this.setMe(); this.charges = { small: 0, mid: 0, strong: 0, guard: 0, heal: 0 }; this.guard = false; this.shownHp.p = this.me.hp; Puzzle.show(this); });
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
        this.step(() => { [party[0], party[alive]] = [party[alive], party[0]]; this.setMe(); this.charges = { small: 0, mid: 0, strong: 0, guard: 0, heal: 0 }; this.guard = false; this.shownHp.p = this.me.hp; Puzzle.show(this); });
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
    this.frameNo = frame;
    if (this.mode === 'capture' && this.cap) { this.updateCapture(); return; }
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
    // コンパクト配置：相手は右上（68px箱、上に「あと N ターン」）、自分は左下（64px箱）
    const ES = 68, ey = 4 + Math.floor(extra * 0.3);
    const lg = this.lunge ? Math.sin(Math.PI * this.lunge.t / 14) * 8 : 0;
    const elx = this.lunge && this.lunge.who === 'e' ? -lg : 0, ely = this.lunge && this.lunge.who === 'e' ? lg * 0.5 : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; oval(148, ey + ES - 2, 36, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; oval(148, ey + ES, 30, 4);
    const cv = this.enemyCaptureView();
    if (!cv) this.drawMon(ctx, en, 118 + sx + elx, ey + ely, ES, false, this.flashE);
    else if (!cv.hidden) {
      // ボールに向かって縮みながら白くなる
      const eb0 = { x: 118, y: ey, size: ES }, b = Mon.drawnBox(en.id, ES / 24, false);
      const cx0 = eb0.x + b.dx + b.w / 2, cy0 = eb0.y + b.dy + b.h;   // 足元中央
      const tx = this.cap.to.x, ty = this.cap.to.y;
      const cx = cx0 + (tx - cx0) * cv.toBall, cy = cy0 + (ty - cy0) * cv.toBall, sc = Math.max(0.05, cv.scale);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx0, -cy0);
      this.drawMon(ctx, en, eb0.x, eb0.y, ES, false, 0);
      if (cv.white > 0) { const c = BattleScene.tmp(ES); const g = c.getContext('2d'); g.clearRect(0, 0, ES, ES); drawMonster(g, en, 0, 0, ES, false, false); g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgba(220,245,255,${cv.white})`; g.fillRect(0, 0, ES, ES); g.globalCompositeOperation = 'source-over'; ctx.drawImage(c, eb0.x, eb0.y); }
      ctx.restore();
    }
    this._eBox = { x: 118, y: ey, size: ES };
    this.drawStatus(ctx, en, this.shownHp.e, 4, 3, 96, 24, false);
    if (this.mode !== 'end' && !this.viewer && !this.cap) this.drawNext(ctx, 118 + Mon.drawnBox(en.id, ES / 24, false).dx + Mon.drawnBox(en.id, ES / 24, false).w / 2, ey + Mon.drawnBox(en.id, ES / 24, false).dy);

    // 自分：左下、後ろ姿（72px箱）。足元を舞台の下端に合わせる
    if (me) {
      const size = 64, px = this.pshake ? (this.pshake % 2 ? 2 : -2) : 0;
      const b = Mon.drawnBox(me.id, size / 24, true);
      const y = AH - 2 - size, x = 6 + px;
      const plx = this.lunge && this.lunge.who === 'p' ? lg : 0, ply = this.lunge && this.lunge.who === 'p' ? -lg * 0.5 : 0;
      ctx.fillStyle = this.hit ? 'rgba(255,240,150,0.55)' : 'rgba(0,0,0,0.14)'; oval(x + b.dx + b.w / 2, y + size - 1, b.w / 2 + 2, 4);
      this.drawMon(ctx, me, x + plx, y + ply, size, true, this.flashP);
      this._pBox = { x, y, size, b };
      if (this.sparkle > 0 && this.sparkleIdx === 0) this.drawSparkle(ctx, x + b.dx + b.w / 2, y + b.dy + b.h / 2, frame, 12);
      if (this.guard || this.guardFx > 0) this.drawGuardRing(ctx, x + b.dx + b.w / 2, y + b.dy + b.h / 2, Math.max(b.w, b.h) / 2 + 4, frame, this.guardFx);
      this.drawStatus(ctx, me, Math.round(this.shownHp.p), 92, AH - 32, 96, 30, true);
    }
    if (this.cap) this.drawCapture(ctx);
    // 浮き文字（ダメージなど）
    for (const p of this.pops) {
      const a = Math.min(1, p.t / 12); ctx.globalAlpha = a;
      const w = Text.width(p.text); Text.draw(ctx, p.text, Math.round(p.x - w / 2) + 1, Math.round(p.y) + 1, 'rgba(0,0,0,0.6)'); Text.draw(ctx, p.text, Math.round(p.x - w / 2), Math.round(p.y), p.color);
      ctx.globalAlpha = 1;
    }
    // 技名の帯（自分の技を使ったとき）
    if (this.banner) {
      const w = Text.width(this.banner.text) + 16, bx = Math.max(2, Math.round(60 - w / 2)), by = 34;   // 自分側（左）の上に出す
      ctx.fillStyle = 'rgba(20,40,26,0.85)'; ctx.fillRect(bx, by, w, 14);
      ctx.fillStyle = '#f2d27a'; ctx.fillRect(bx, by, 2, 14); ctx.fillRect(bx + w - 2, by, 2, 14);
      Text.draw(ctx, this.banner.text, bx + 8, by + 2, '#fff6d8');
    }
    // 短いメッセージ（出現・勝利・経験値など）：舞台の中ほどの帯
    if (this.text && !this.viewer) {
      const ty = 36;
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
  // 相手の攻撃までの残りターン：相手の頭の上に文字だけ「あと N ターン」（数字は大きめ。残り1ターンは赤）
  drawNext(ctx, cx, top) {
    const urgent = this.count <= 1, col = urgent ? '#ff8a7a' : '#f2d27a';
    const n = String(this.count), w = 16 + 10 * n.length + 24 + 4, x = Math.round(cx - w / 2), y = Math.max(4, top - 14);
    // 背景に埋もれないように薄い黒の帯
    ctx.fillStyle = 'rgba(10,20,14,0.6)'; ctx.fillRect(x - 3, y - 1, w + 6, 13);
    Text.draw(ctx, 'あと', x, y + 2, '#f4f8ec');
    ctx.save(); ctx.translate(x + 17, y - 1); ctx.scale(1.5, 1.5); Text.draw(ctx, n, 0, 0, col); ctx.restore();
    Text.draw(ctx, 'ターン', x + 17 + 10 * n.length + 4, y + 2, '#f4f8ec');
  }
  // 自分・相手の絵の位置（浮き文字の基準）
  enemyBox() { const e = this._eBox || { x: 118, y: 16, size: 68 }; const b = Mon.drawnBox(this.enemy.id, e.size / 24, false); return { cx: e.x + b.dx + b.w / 2, top: e.y + b.dy, cy: e.y + b.dy + b.h / 2, bottom: e.y + b.dy + b.h }; }
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
      Text.draw(ctx, s, x + w - 7 - Text.width(s), y + h - 10);
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
