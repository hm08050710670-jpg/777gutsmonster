// ============================================================
// フィールド（マップ移動・当たり判定・イベント・ワープ・エンカウント）
// ============================================================
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const FACE = { up: 'down', down: 'up', left: 'right', right: 'left' };

class FieldScene {
  constructor() {
    this.overlay = false;
    this.moving = 0;
    this.animStep = 0;
    this.bump = 0;          // 壁にぶつかった時のフィードバック残りフレーム
    this.actor = null;      // カットシーン中に歩かせる人物 { x, y, sprite, path:[dir...], onDone }
    this.actorMove = 0;
    this.actorDir = 'up';
  }

  // 人物を path の順に1マスずつ歩かせ、終わったら onDone
  walkActor(actor, path, onDone) {
    this.actor = Object.assign(actor, { path: [...path], onDone });
    this.actorMove = 0;
  }
  updateActor() {
    const a = this.actor;
    if (!a) return false;
    if (this.actorMove > 0) {
      this.actorMove--;
      if (this.actorMove === 0 && !a.path.length) { const f = a.onDone; a.onDone = null; f && f(); }
      return true;
    }
    if (!a.path.length) return !!a.onDone;
    const d = a.path.shift(); this.actorDir = d;
    const [dx, dy] = DIRS[d];
    a.x += dx; a.y += dy;
    this.actorMove = CONFIG.WALK_FRAMES;
    return true;
  }
  get map() { return DATA.MAPS[Game.state.map]; }
  get mapW() { return this.map.rows[0].length; }
  get mapH() { return this.map.rows.length; }
  tileAt(x, y) { const r = this.map.rows[y]; return r && r[x] ? r[x] : ' '; }

  // フラグ条件付きイベント（if / unless）
  eventActive(ev) {
    const f = Game.state.flags;
    if (ev.if && !f[ev.if]) return false;
    if (ev.unless && f[ev.unless]) return false;
    return true;
  }
  events() { return this.map.events.filter(e => this.eventActive(e)); }
  eventAt(x, y) { return this.events().find(e => e.x === x && e.y === y); }
  blocksWalk(ev) { return ev && ['npc', 'sign', 'starter', 'rival', 'look'].includes(ev.kind); }
  // 建物などの置き物（map.objects）：足元の範囲は通れない。ドアの1マスだけ通れる
  objects() { return this.map.objects || []; }
  objectBlocks(x, y) {
    for (const o of this.objects()) {
      const d = DATA.OBJECTS[o.sprite]; if (!d) continue;
      if (x >= o.x && x < o.x + d.w && y >= o.y && y < o.y + d.h && !(x === o.x + d.door[0] && y === o.y + d.door[1])) return true;
    }
    return false;
  }
  doorAt(x, y) { return this.objects().some(o => { const d = DATA.OBJECTS[o.sprite]; return d && x === o.x + d.door[0] && y === o.y + d.door[1]; }); }
  canWalk(x, y) {
    if (!DATA.WALKABLE.has(this.tileAt(x, y))) return false;
    if (this.objectBlocks(x, y)) return false;
    return !this.blocksWalk(this.eventAt(x, y));
  }

  enter() {
    const st = Game.state;
    if (this.map.flagOnEnter && !st.flags[this.map.flagOnEnter]) { Game.setFlag(this.map.flagOnEnter); Save.auto(st); }   // 入った時点で進行フラグ（冒険ノート用）
    UI.refreshNote(st);
    Sound.play(this.map.bgm);
    // 研究所に初めて入ったら、まず博士の説明
    if (st.map === 'lab' && !st.flags.starter && !st.flags.labIntro) {
      this.introStarted = true;
      setTimeout(() => this.profIntro(), 0);
    }
  }

  update(frame) {
    const st = Game.state;
    if (this.bump > 0) this.bump--;
    if (this.updateActor()) return;   // カットシーン中は操作不可
    if (this.moving > 0) {
      this.moving--;
      if (this.moving === 0) this.onArrive();
      return;
    }
    if (Input.pressed('start')) { openStartMenu(); return; }
    if (Input.pressed('a')) { this.interact(); return; }

    for (const d of ['up', 'down', 'left', 'right']) {
      if (Input.down(d)) {
        st.dir = d;
        const [dx, dy] = DIRS[d];
        if (this.canWalk(st.x + dx, st.y + dy)) {
          st.x += dx; st.y += dy;
          this.moving = CONFIG.WALK_FRAMES;
          this.animStep ^= 1;
        } else if (this.bump === 0 && Input.pressed(d)) {
          this.bump = 10; // 壁：小さく揺れる
        }
        break;
      }
    }
  }

  onArrive() {
    const st = Game.state;
    st.steps++;
    if (st.grace > 0) st.grace--;
    const ev = this.eventAt(st.x, st.y);
    if (ev && ev.kind === 'warp') { this.warp(ev.to); return; }
    if (ev && ev.kind === 'trigger') { this.runTrigger(ev); return; }
    if (this.tileAt(st.x, st.y) === 'T' && this.map.encounters && st.grace === 0 && Math.random() * 100 < CONFIG.ENCOUNTER_RATE) {
      if (st.party.length && Party.hp(st) > 0) {
        startWildBattle(st.map, result => {
          st.grace = CONFIG.GRACE_STEPS;
          if (result === 'lose') this.wipeOut();
          else Save.auto(st);
        });
      }
    }
  }

  // 全滅：回復して自宅へ
  wipeOut() {
    const st = Game.state;
    Party.full(st);
    say('なかまを かいふくして\nいえに もどった。', () => this.warp({ map: 'home', x: 4, y: 4, dir: 'down' }));
  }

  warp(to) {
    const st = Game.state;
    st.map = to.map; st.x = to.x; st.y = to.y; st.dir = to.dir || st.dir;
    this.moving = 0;
    Save.auto(st);
    this.enter();
  }

  interact() {
    const st = Game.state;
    const [dx, dy] = DIRS[st.dir];
    let ev = this.eventAt(st.x + dx, st.y + dy);
    // 受付カウンター越しに話しかける
    if (!ev && this.tileAt(st.x + dx, st.y + dy) === 'C') ev = this.eventAt(st.x + dx * 2, st.y + dy * 2);
    if (!ev) return;
    switch (ev.kind) {
      case 'sign': case 'look': say(ev.text); break;
      case 'npc': this.talkNpc(ev); break;
      case 'starter': this.pickStarter(ev); break;
      case 'rival': this.runRival(ev); break;
    }
  }

  talkNpc(ev) {
    const st = Game.state;
    ev.face = FACE[st.dir];
    if (ev.prof) { this.talkProf(ev); return; }
    if (ev.heal) {
      say(ev.text, () => {
        Party.full(st);
        say(st.party.length ? 'なかまは げんきに なった！' : 'なかまが いないみたいですね。', () => Save.auto(st), ev.name);
      }, ev.name);
      return;
    }
    if (ev.shop) {
      say(ev.text, () => {
        if (!st.flags.shopGift) { st.flags.shopGift = true; st.items['きずぐすり'] = (st.items['きずぐすり'] || 0) + 1; say('きずぐすりを 1つ もらった！'); }
      }, ev.name);
      return;
    }
    say(ev.text, null, ev.name);
  }

  talkProf(ev) {
    const st = Game.state, n = ev.name;
    if (!st.flags.starter) {
      if (!st.flags.labIntro) this.profIntro();
      else say('テーブルの 3つの ガッツボールから\nすきな 1つを えらびなさい。', null, n);
    } else if (!st.flags.rival1) {
      say('その子と いっしょに 冒険を はじめよう。\n町の北から ガーデンロードへ いける。', null, n);
    } else {
      say('ノブオと たたかったのか。\nライバルが いると つよくなれるぞ。', null, n);
    }
  }

  pickStarter(ev) {
    const st = Game.state, sp = DATA.MONSTERS[ev.id];
    if (!st.flags.labIntro) { this.profIntro(() => this.pickStarter(ev)); return; }
    ask(`${sp.name}（${sp.type}タイプ）\n${sp.desc}\n${sp.name}を えらびますか？`, ['はい', 'いいえ'], i => {
      if (i !== 0) return;
      st.party = [makeMonster(ev.id, 7)]; Party.full(st);
      Game.setFlag('starter');
      say(`${st.name}は ${sp.name}を なかまにした！`, () => {
        say('だいじに そだてるんだよ。\n研究所を 出たら 冒険の はじまりだ。', () => Save.auto(st), 'オクムラ博士');
      });
    });
  }

  runTrigger(ev) {
    const st = Game.state;
    if (ev.id === 'townExit') {
      if (!st.flags.starter) {
        // 御三家をもらう前：ひとりごとを言って1歩もどる
        say('まずは オクムラ博士の 研究所へ いこう。', () => { st.dir = 'down'; st.y += 1; this.moving = CONFIG.WALK_FRAMES; });
        return;
      }
      if (!st.flags.rival1) this.rivalApproach(ev);
    }
  }

  // 博士の説明（研究所に入った直後 / ボールを調べた時）
  profIntro(then) {
    const st = Game.state, n = 'オクムラ博士';
    const prof = this.events().find(e => e.prof); if (prof) prof.face = 'down';
    say(`おお ${st.name}くん、よく来たね！\nきみに GUTS MONSTERSの せかいを おしえよう。`, () => {
      say('この せかいには ゴルフ場の しぜんと\nゴルフボールが とけこんだ', () => {
        say('GUTS MONSTERSが すんでいる。\nなかまにして いっしょに 冒険するんだ。', () => {
          say('これが ガッツボールだ！\nゴルフの魂が つまった 特別なボールなんだよ。', () => {
          say('テーブルの 3つの ガッツボールから\nすきな 1つを えらびなさい。', () => {
            Game.setFlag('labIntro'); Save.auto(st);
            then && then();
          }, n);
          }, n);
        }, n);
      }, n);
    }, n);
  }

  // ノブオが 下から 歩いてきて 勝負を しかける
  rivalApproach(ev) {
    const st = Game.state;
    st.dir = 'down';
    const actor = { x: st.x, y: st.y + 7, sprite: 'npc_rival' };
    say('おーい！ ちょっと まてよ！', () => {
      this.walkActor(actor, ['up', 'up', 'up', 'up', 'up', 'up'], () => {
        say('よぉ！ オレは ノブオ！\nおまえも モンスターを もらったのか。', () => {
          say(`ガーデンロードに いくまえに\nオレと しょうぶだ！ いけっ ${this.rivalMon().name}！`, () => this.rivalBattle(() => {
            // 勝負のあと、来た道を もどる
            this.walkActor(actor, ['down', 'down', 'down', 'down', 'down', 'down'], () => { this.actor = null; Save.auto(st); });
          }), 'ノブオ');
        }, 'ノブオ');
      });
    }, 'ノブオ');
  }
  // ノブオの手持ち：主人公の御三家に有利なタイプの御三家（ブブは絵ができるまで外している）
  rivalMon() {
    const mine = Game.state.party[0] ? Game.state.party[0].id : 'kokegame';
    const counter = { kokegame: 'hinoshishi', hinoshishi: 'amepiyo', amepiyo: 'kokegame' };
    const id = DATA.MONSTERS.bubu ? 'bubu' : (counter[mine] || 'kokegame');
    return DATA.MONSTERS[id] ? { id, name: DATA.MONSTERS[id].name } : { id: 'kokegame', name: 'コケガメ' };
  }
  rivalBattle(after) {
    const st = Game.state;
    const rm = this.rivalMon();
    const enemy = makeMonster(rm.id, 5);
    Game.push(new BattleScene({ enemy, trainer: { name: 'ノブオ' }, onEnd: result => {
      Game.setFlag('rival1');
      if (result === 'lose') { Party.full(st); say('ま、そんなもんだろ。\nガーデンロードで きたえてこい！', after, 'ノブオ'); }
      else say(`くっ… ${rm.name}が まけるなんて！\nガーデンロードは ゆずってやるよ。`, after, 'ノブオ');
    } }));
  }

  // （旧）話しかけて勝負する版。データ側で kind:'rival' を使えば動く
  runRival(ev) {
    const st = Game.state;
    ev.face = FACE[st.dir];
    say('よぉ！ オレは ノブオ！\nおまえも モンスターを もらったのか。', () => {
      const rm = this.rivalMon();
      say(`じゃあ さっそく しょうぶだ！\nいけっ ${rm.name}！`, () => {
        const enemy = makeMonster(rm.id, 5);
        Game.push(new BattleScene({ enemy, trainer: { name: 'ノブオ' }, onEnd: result => {
          Game.setFlag('rival1');
          if (result === 'lose') {
            Party.full(st);
            say('ま、そんなもんだろ。\nガーデンロードで きたえてこい！', () => Save.auto(st), 'ノブオ');
          } else {
            say(`くっ… ${rm.name}が まけるなんて！\nガーデンロードは ゆずってやるよ。`, () => Save.auto(st), 'ノブオ');
          }
        } }));
      }, 'ノブオ');
    }, 'ノブオ');
  }

  heroSprite(dir, step) {
    const g = Game.state.gender === 'f' ? 'hf' : 'hm';
    // 画像スプライト（立ち・歩き1・歩き2、4方向）があればそれを使う
    if (Tiles.has(`${g}_${dir}${step}`)) return Tiles.get(`${g}_${dir}${step}`);
    const base = dir === 'left' ? 'right' : dir;
    return Gfx.get(`${g}_${base}${Math.min(step, 1)}`, 1, dir === 'left');
  }
  npcSprite(ev) {
    const dir = ev.face || ev.dir || 'down';
    const img = ev.img || ev.sprite;   // img: 画像アトラスのスプライト名（4方向あり）
    if (Tiles.has(`${img}_${dir}0`)) return Tiles.get(`${img}_${dir}0`);
    return Gfx.get(ev.sprite); // 旧アート（正面のみ）
  }

  // 小物：マスの下中央に置く（絵の大きさが16×16でなくてもよい。街灯など背の高いものは上にはみ出す）
  drawProp(ctx, name, px, py) {
    const im = Tiles.get(name); if (!im) return;
    ctx.drawImage(im, px + Math.floor((CONFIG.TILE - im.width) / 2), py + CONFIG.TILE - im.height);
  }
  // 研究所の室内タイル（ChatGPT製 in_* タイル）。床を敷いてから家具を重ねる
  drawLabTile(ctx, t, tx, ty, px, py) {
    const floor = () => ctx.drawImage(Tiles.get(((tx + ty) % 3 === 0) ? 'in_floor1' : 'in_floor0'), px, py);
    const over = name => { floor(); ctx.drawImage(Tiles.get(name), px, py); return true; };
    switch (t) {
      case 'W': ctx.drawImage(Tiles.get('in_wall'), px, py); return true;
      case 'X': ctx.drawImage(Tiles.get('in_wallbase'), px, py); return true;
      case '|': { const w = Tiles.get('in_wall'); ctx.drawImage(w, 0, 0, 1, 1, px, py, 16, 16); ctx.fillStyle = 'rgba(40,60,100,0.35)'; ctx.fillRect(px + (tx === 0 ? 15 : 0), py, 1, 16); return true; }   // 横の壁：無地
      case 'b': ctx.drawImage(Tiles.get('in_wallbase'), px, py); ctx.drawImage(Tiles.get('in_board'), px, py); return true;
      case 's': ctx.drawImage(Tiles.get('in_wallbase'), px, py); ctx.drawImage(Tiles.get('in_shelf'), px, py); return true;
      case '.': floor(); return true;
      case 'm': return over('in_mat');
      case 'c': return over('in_carpet');
      case 'C': return over('in_counter');
      case 'n': return over('in_counter_c');
      case 'd': return over('in_desk');
      case 'p': return over('in_plant');
      case 'k': return over('in_case');
      case 'h': return over('in_chair');
      case 't': return over('in_trash');
    }
    return false;
  }
  // 画像タイル（屋外）。描けたら true。木は後でまとめて描くので trees に積む
  drawImgTile(ctx, t, tx, ty, px, py, trees) {
    const T = CONFIG.TILE;
    if (this.map.tileset === 'lab') return this.drawLabTile(ctx, t, tx, ty, px, py);
    // 道は建物のドアにも繋がる（ドア前の道が丸い孤島にならないように）
    const same = (dx, dy) => this.tileAt(tx + dx, ty + dy) === t || (t === 'P' && this.doorAt(tx + dx, ty + dy));
    const mask = () => (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0);
    const grass = () => ctx.drawImage(Tiles.variant('grass', 3, tx, ty), px, py);
    switch (t) {
      case 'G': grass(); return true;
      case 'P': ctx.drawImage(Tiles.auto('path', mask(), tx, ty), px, py); return true;
      case '~': ctx.drawImage(Tiles.auto('water', mask(), tx, ty), px, py); return true;
      case 'W': grass(); trees.push([px, py]); return true;
      case 'T': ctx.drawImage(Tiles.get('tall'), px, py); return true;
      case 'F': grass(); ctx.drawImage(Tiles.variant('flower', 2, tx, ty), px, py); return true;
      case 'H': grass(); this.drawProp(ctx, 'hedge', px, py); return true;
      case 'S': grass(); this.drawProp(ctx, 'sign', px, py); return true;
      case '=': grass(); this.drawProp(ctx, 'fence', px, py); return true;
      case 'Q': ctx.drawImage(Tiles.variant('stone', 5, tx, ty), px, py); return true;
      case 'L': grass(); if (Tiles.has('lamp')) this.drawProp(ctx, 'lamp', px, py); else ctx.drawImage(Gfx.get('lamp', 1, false, 'gGh'), px, py); return true;
      case 'B': ctx.drawImage(Tiles.auto('water', 15, tx, ty), px, py); if (Tiles.has('bridge')) { ctx.drawImage(Tiles.get('bridge'), px, py); return true; } return false;   // 橋
    }
    return false;
  }

  draw(ctx, frame) {
    const st = Game.state, T = CONFIG.TILE, W = CONFIG.W, H = CONFIG.H;
    // カメラ：主人公中心。マップ端では止め、マップが画面より小さければ中央寄せ
    let ox = 0, oy = 0;
    if (this.moving > 0) {
      const [dx, dy] = DIRS[st.dir];
      const t = this.moving / CONFIG.WALK_FRAMES;
      ox = dx * t * T; oy = dy * t * T;
    }
    const mapPW = this.mapW * T, mapPH = this.mapH * T;
    let camX = st.x * T - ox - (W - T) / 2;
    let camY = st.y * T - oy - (H - T) / 2;
    camX = mapPW <= W ? -(W - mapPW) / 2 : Math.max(0, Math.min(mapPW - W, camX));
    camY = mapPH <= H ? -(H - mapPH) / 2 : Math.max(0, Math.min(mapPH - H, camY));
    camX = Math.round(camX); camY = Math.round(camY);

    // 壁ぶつかり：画面をわずかに揺らす
    const bx = this.bump ? (this.bump % 2 ? 1 : -1) * (DIRS[st.dir][0]) : 0;
    const by = this.bump ? (this.bump % 2 ? 1 : -1) * (DIRS[st.dir][1]) : 0;

    ctx.fillStyle = this.map.indoor ? '#1a1410' : '#173a1c';
    ctx.fillRect(0, 0, W, H);
    const cx0 = Math.floor(camX / T), cy0 = Math.floor(camY / T);
    const useImg = Tiles.ready && (!this.map.indoor || !!this.map.tileset);   // 屋内は tileset 指定のあるマップだけ画像タイル
    const trees = [];
    for (let ty = cy0 - 1; ty <= cy0 + Math.ceil(H / T) + 1; ty++) {
      for (let tx = cx0 - 1; tx <= cx0 + Math.ceil(W / T) + 1; tx++) {
        const t = this.tileAt(tx, ty);
        if (t === ' ') continue;
        const px = tx * T - camX + bx, py = ty * T - camY + by;
        if (useImg) { const done = this.drawImgTile(ctx, t, tx, ty, px, py, trees); if (done) continue; }
        ctx.drawImage(Gfx.get(DATA.TILE_ART[t] || 'grass'), px, py);
      }
    }
    // 木（2×2、少し重ねて森らしく）。主人公より上の行の木はここで、下の行の木は主人公の後で描く（木の上に乗って見えないように）
    const heroPy = st.y * T - camY + by;
    const frontTrees = trees.filter(([, py]) => py > heroPy);
    for (const [px, py] of trees) if (py <= heroPy) ctx.drawImage(Tiles.get('tree'), px - 8, py - 16);
    // 建物などの置き物
    if (useImg) for (const o of this.objects()) {
      const im = Tiles.get(o.sprite); if (!im) continue;
      const sc = Tiles.scale(o.sprite);
      ctx.drawImage(im, 0, 0, im.width, im.height, o.x * T - camX + bx + (o.dx || 0), o.y * T - camY + by + (o.dy || 0), im.width * sc, im.height * sc);
    }
    // イベントの見た目（ボール・NPC）
    for (const ev of this.events()) {
      const sx = ev.x * T - camX + bx, sy = ev.y * T - camY + by;
      if (sx < -T || sy < -T || sx > W || sy > H) continue;
      if (ev.kind === 'starter') { if (!this.map.tileset) ctx.drawImage(Gfx.get('ball'), sx, sy - 4); }   // 画像タイルの部屋ではテーブルの絵にボールが描いてある
      else if (ev.sprite) { const im = this.npcSprite(ev); ctx.drawImage(im, sx + Math.floor((T - im.width) / 2), sy + T - im.height - 1); }
    }
    // カットシーンの人物
    if (this.actor) {
      const a = this.actor; let ax = 0, ay = 0;
      if (this.actorMove > 0) { const [dx, dy] = DIRS[this.actorDir]; const t = this.actorMove / CONFIG.WALK_FRAMES; ax = dx * t * T; ay = dy * t * T; }
      ctx.drawImage(Gfx.get(a.sprite), a.x * T - ax - camX + bx, a.y * T - ay - camY - 2 + by);
    }
    // 主人公
    // 歩き：1歩の間ずっと歩きコマ（1歩ごとに歩き1／歩き2を交互）。止まったら立ち
    //   ※以前は1歩8コマのうち3コマしか歩きコマが出ず、滑って見えた
    const step = this.moving > 0 ? 1 + this.animStep : 0;
    const hs = this.heroSprite(st.dir, step);
    ctx.drawImage(hs, st.x * T - ox - camX + bx + Math.floor((T - hs.width) / 2), st.y * T - oy - camY + by + T - hs.height - 1);
    if (useImg) for (const [px, py] of frontTrees) ctx.drawImage(Tiles.get('tree'), px - 8, py - 16);
  }
}
