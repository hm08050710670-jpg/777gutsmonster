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
  objectAt(x, y) {
    for (const o of (this.map.objects || [])) {
      if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) return o;
    }
    return null;
  }
  canWalk(x, y) {
    const o = this.objectAt(x, y);
    if (o) { const ds = o.doors || (o.door ? [o.door] : []); return ds.some(d => d.x === x && d.y === y); }
    if (!DATA.WALKABLE.has(this.tileAt(x, y))) return false;
    return !this.blocksWalk(this.eventAt(x, y));
  }

  enter() {
    UI.refreshNote(Game.state);
    const st = Game.state;
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
      if (st.party.some(m => m.hp > 0)) {
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
    st.party.forEach(m => { m.hp = m.maxHp; m.moves.forEach(mv => { mv.pp = mv.maxPp; }); });
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
        st.party.forEach(m => { m.hp = m.maxHp; m.moves.forEach(mv => { mv.pp = mv.maxPp; }); });
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
      else say('テーブルの 3つの ボールから\nすきな 1匹を えらびなさい。', null, n);
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
      st.party = [makeMonster(ev.id, 7)];
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
          say('テーブルの 3つの ボールから\nすきな 1匹を えらびなさい。', () => {
            Game.setFlag('labIntro'); Save.auto(st);
            then && then();
          }, n);
        }, n);
      }, n);
    }, n);
  }

  // ノブオが 下から 歩いてきて 勝負を しかける
  rivalApproach(ev) {
    const st = Game.state;
    st.dir = 'down';
    const actor = { x: st.x, y: st.y + 7, sprite: 'rival' };
    say('おーい！ ちょっと まてよ！', () => {
      this.walkActor(actor, ['up', 'up', 'up', 'up', 'up', 'up'], () => {
        say('よぉ！ オレは ノブオ！\nおまえも モンスターを もらったのか。', () => {
          say('ガーデンロードに いくまえに\nオレと しょうぶだ！ いけっ ブブ！', () => this.rivalBattle(() => {
            // 勝負のあと、来た道を もどる
            this.walkActor(actor, ['down', 'down', 'down', 'down', 'down', 'down'], () => { this.actor = null; Save.auto(st); });
          }), 'ノブオ');
        }, 'ノブオ');
      });
    }, 'ノブオ');
  }
  rivalBattle(after) {
    const st = Game.state;
    const enemy = makeMonster('bubu', 5);
    Game.push(new BattleScene({ enemy, trainer: { name: 'ノブオ' }, onEnd: result => {
      Game.setFlag('rival1');
      if (result === 'lose') { st.party.forEach(m => { m.hp = m.maxHp; }); say('ま、そんなもんだろ。\nガーデンロードで きたえてこい！', after, 'ノブオ'); }
      else say('くっ… ブブが まけるなんて！\nガーデンロードは ゆずってやるよ。', after, 'ノブオ');
    } }));
  }

  // （旧）話しかけて勝負する版。データ側で kind:'rival' を使えば動く
  runRival(ev) {
    const st = Game.state;
    ev.face = FACE[st.dir];
    say('よぉ！ オレは ノブオ！\nおまえも モンスターを もらったのか。', () => {
      say('じゃあ さっそく しょうぶだ！\nいけっ ブブ！', () => {
        const enemy = makeMonster('bubu', 5);
        Game.push(new BattleScene({ enemy, trainer: { name: 'ノブオ' }, onEnd: result => {
          Game.setFlag('rival1');
          if (result === 'lose') {
            st.party.forEach(m => { m.hp = m.maxHp; });
            say('ま、そんなもんだろ。\nガーデンロードで きたえてこい！', () => Save.auto(st), 'ノブオ');
          } else {
            say('くっ… ブブが まけるなんて！\nガーデンロードは ゆずってやるよ。', () => Save.auto(st), 'ノブオ');
          }
        } }));
      }, 'ノブオ');
    }, 'ノブオ');
  }

  // ---- 人物スプライト（アトラス：4方向×3コマ。歩行は 1,0,2,0 の順） ----
  charFrame(moving, animStep) {
    if (moving <= 0) return 0;
    return (moving % 8) < 4 ? (animStep ? 1 : 2) : 0;
  }
  drawChar(ctx, name, dir, frame, x, y) {
    // x,y はタイル左上（論理px）。人物は 16x24 で、足元をタイルの下に合わせる
    if (Atlas.has(`${name}_${dir}${frame}`)) { Atlas.draw(ctx, `${name}_${dir}${frame}`, x, y - 8); return; }
    // フォールバック（旧文字列アート）
    const legacy = { hm: 'hm', hf: 'hf', prof: 'npc_prof', rival: 'npc_rival', woman: 'npc_woman', man: 'npc_man', nurse: 'npc_nurse' }[name];
    if (!legacy) return;
    if (legacy.startsWith('npc')) { ctx.drawImage(Gfx.get(legacy), x, y - 2); return; }
    const base = dir === 'left' ? 'right' : dir;
    ctx.drawImage(Gfx.get(`${legacy}_${base}${frame ? 1 : 0}`, 1, dir === 'left'), x, y - 2);
  }

  // 水の自動タイル：陸に接する辺・角で岸のタイルを選ぶ
  waterTile(tx, ty) {
    const w = (x, y) => this.tileAt(x, y) === '~' || this.tileAt(x, y) === 'B';
    const n = !w(tx, ty - 1), s = !w(tx, ty + 1), wl = !w(tx - 1, ty), e = !w(tx + 1, ty);
    if (n && wl) return 'shore_nw'; if (n && e) return 'shore_ne'; if (s && wl) return 'shore_sw'; if (s && e) return 'shore_se';
    if (n) return 'shore_n'; if (s) return 'shore_s'; if (wl) return 'shore_w'; if (e) return 'shore_e';
    return null;
  }
  fenceTile(tx, ty) {
    const f = (x, y) => this.tileAt(x, y) === '=';
    const l = f(tx - 1, ty), r = f(tx + 1, ty);
    return l && r ? 'fence' : (r ? 'fence_l' : (l ? 'fence_r' : 'fence_v'));
  }

  draw(ctx, frame) {
    const st = Game.state, T = CONFIG.TILE, W = CONFIG.W, H = CONFIG.H;
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
    const bx = this.bump ? (this.bump % 2 ? 1 : -1) * (DIRS[st.dir][0]) : 0;
    const by = this.bump ? (this.bump % 2 ? 1 : -1) * (DIRS[st.dir][1]) : 0;

    ctx.fillStyle = this.map.indoor ? '#1a1410' : '#173a1c';
    ctx.fillRect(0, 0, W, H);
    const useAtlas = Atlas.isReady() && !this.map.indoor;
    const sprites = []; // 奥行き順に描くもの { y, fn }
    const cx0 = Math.floor(camX / T), cy0 = Math.floor(camY / T);
    const waterFrame = Math.floor(frame / 24) % 4;

    for (let ty = cy0 - 1; ty <= cy0 + Math.ceil(H / T) + 1; ty++) {
      for (let tx = cx0 - 1; tx <= cx0 + Math.ceil(W / T) + 1; tx++) {
        const t = this.tileAt(tx, ty);
        if (t === ' ') continue;
        const px = tx * T - camX + bx, py = ty * T - camY + by;
        if (!useAtlas) {
          if (px < -T || py < -T || px > W || py > H) continue;
          ctx.drawImage(Gfx.get(DATA.TILE_ART[t] || 'grass'), px, py);
          continue;
        }
        // 下地
        const base = DATA.ATLAS_BASE[t];
        if (base === 'water') { Atlas.draw(ctx, this.waterTile(tx, ty) || `water${waterFrame}`, px, py); }
        else if (base) Atlas.draw(ctx, base, px, py);
        else Atlas.draw(ctx, 'grass', px, py);
        // 上に載る小物（奥行き順）
        let dec = DATA.ATLAS_DECOR[t];
        if (t === '=') dec = this.fenceTile(tx, ty);
        if (dec) {
          const sz = Atlas.size(dec);
          const dy = py + T - (sz ? sz.h : T);
          sprites.push({ y: ty * T + T, fn: () => Atlas.draw(ctx, dec, px, dy) });
        }
      }
    }
    // 大きな建物・オブジェクト（足元の y で並べる）
    for (const o of (this.map.objects || [])) {
      const px = o.x * T - camX + bx, py = o.y * T - camY + by;
      if (useAtlas && Atlas.has(o.art)) sprites.push({ y: (o.y + o.h) * T - 1, fn: () => Atlas.draw(ctx, o.art, px, py) });
      else ctx.drawImage(Gfx.get(o.art), px, py);
    }
    // イベント（ボール・NPC）
    for (const ev of this.events()) {
      const sx = ev.x * T - camX + bx, sy = ev.y * T - camY + by;
      if (sx < -T * 2 || sy < -T * 2 || sx > W + T || sy > H + T) continue;
      if (ev.kind === 'starter') sprites.push({ y: ev.y * T + T, fn: () => ctx.drawImage(Gfx.get('ball'), sx, sy - 4) });
      else if (ev.sprite) sprites.push({ y: ev.y * T + T, fn: () => this.drawChar(ctx, ev.sprite, ev.face || ev.dir || 'down', 0, sx, sy) });
    }
    // カットシーンの人物
    if (this.actor) {
      const a = this.actor; let ax = 0, ay = 0;
      if (this.actorMove > 0) { const [dx, dy] = DIRS[this.actorDir]; const t = this.actorMove / CONFIG.WALK_FRAMES; ax = dx * t * T; ay = dy * t * T; }
      const f = this.charFrame(this.actorMove, Math.floor(this.actorMove / 8) % 2);
      sprites.push({ y: a.y * T - ay + T, fn: () => this.drawChar(ctx, a.sprite, this.actorDir, f, a.x * T - ax - camX + bx, a.y * T - ay - camY + by) });
    }
    // 主人公
    const hero = st.gender === 'f' ? 'hf' : 'hm';
    const hf = this.charFrame(this.moving, this.animStep);
    sprites.push({ y: st.y * T - oy + T, fn: () => this.drawChar(ctx, hero, st.dir, hf, st.x * T - ox - camX + bx, st.y * T - oy - camY + by) });

    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) s.fn();
  }
}
