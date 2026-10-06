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
    this.actorFrames = Math.max(1, Math.round(CONFIG.WALK_FRAMES / (a.speed || 1)));   // speed: 走るモンスターは速く
    this.actorMove = this.actorFrames;
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
    if (ev.kind === 'starter' && f.starterId === ev.id) return false;   // えらんだボールだけ消える
    if (ev.kind === 'item' && ev.flag && f[ev.flag]) return false;        // 拾ったアイテムは消える
    return true;
  }
  events() { return this.map.events.filter(e => this.eventActive(e)); }
  eventAt(x, y) { return this.events().find(e => e.x === x && e.y === y); }
  blocksWalk(ev) { return ev && ['npc', 'sign', 'starter', 'rival', 'look', 'trainer', 'item'].includes(ev.kind); }
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
    if (this.stepFx && this.stepFx.t > 0) this.stepFx.t--;
    if (this.ballFx) { const f = this.ballFx; f.t++; if (f.t >= 44) { this.ballFx = null; f.done(); } return; }   // ボールを取る演出中は操作不可
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
    if (this.tileAt(st.x, st.y) === 'T') this.stepFx = { x: st.x, y: st.y, t: 10, side: st.steps % 2 };   // ラフを踏んだ：芝がパサッと倒れる
    if (st.grace > 0) st.grace--;
    const ev = this.eventAt(st.x, st.y);
    if (ev && ev.kind === 'warp') {
      if (ev.needs && !st.flags[ev.needs]) { say(ev.waitText || 'とおれない。', () => { st.dir = 'down'; st.y += 1; this.moving = CONFIG.WALK_FRAMES; }); return; }   // 条件つきの扉：1歩もどる
      this.warp(ev.to); return;
    }
    if (ev && ev.kind === 'trigger') { this.runTrigger(ev); return; }
    const here = this.tileAt(st.x, st.y), encTable = here === 'T' ? this.map.encounters : here === 'K' ? (this.map.bunker || this.map.encounters) : null;   // ラフ（草むら）とバンカーで出る
    if (encTable && st.grace === 0 && Math.random() * 100 < CONFIG.ENCOUNTER_RATE) {
      if (st.party.length && Party.hp(st) > 0) {
        startWildBattle(st.map, result => {
          st.grace = CONFIG.GRACE_STEPS;
          if (result === 'lose') this.wipeOut();
          else Save.auto(st);
        }, encTable);
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
      case 'trainer': this.runTrainer(ev); break;
      case 'item': this.pickItem(ev); break;
    }
  }

  talkNpc(ev) {
    const st = Game.state;
    ev.face = FACE[st.dir];
    if (ev.prof) { this.talkProf(ev); return; }
    if (ev.kaede) { this.talkKaede(ev); return; }
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
      say('観測機は ガーデンCCの カエデに。\n町の北から ガーデンロードへ いける。', null, n);
    } else if (st.flags.kaedeWin) {
      say('カエデの クラブ認定を もらったか！\nおめでとう。シブヤの 停電も 気になるな…。', null, n);
    } else {
      say('ノブオと たたかったのか。\nライバルが いると つよくなれるぞ。', null, n);
    }
  }

  pickStarter(ev) {
    const st = Game.state, sp = DATA.MONSTERS[ev.id];
    if (!st.flags.labIntro) { this.profIntro(() => this.pickStarter(ev)); return; }
    if (st.flags.starter) { say('のこりの ガッツボールは\n博士が だいじに あずかっている。'); return; }
    const title = `${sp.name}（${sp.type}タイプ）`, pg = ev.pick || [sp.desc, `${sp.name}を えらびますか？`];
    this.pickPreview = { id: ev.id, ev };
    const onPick = i => {
      this.pickPreview = null;
      if (i !== 0) return;
      // えらんだボールだけが光って浮き上がり、主人公の手に（他の2つは残る）
      this.ballFx = { ev, t: 0, done: () => {
      st.party = [makeMonster(ev.id, 7)]; Party.full(st);
      Game.setFlag('starter'); st.flags.starterId = ev.id;
      const n = 'オクムラ博士';
      say(`${st.name}は ${sp.name}を なかまにした！`, () => {
        say('だいじに そだてるんだよ。\n研究所を 出たら 冒険の はじまりだ。', () => {
          say('それと ひとつ たのみが ある。\nこの 観測機を あずかってくれ。', () => {
            say(`${st.name}は 観測機を うけとった！`, () => {
              say('森の むこうの ガーデンプレースの 北、\nガーデンCCの カエデに わたしてほしい。', () => {
                say('コースの モンスターの ようすが\nおかしいと れんらくが あってな。', () => {
                  say('町の北の ガーデンロードから\nグリーンの森を ぬければ つくぞ。', () => { Game.setFlag('device'); Save.auto(st); }, n);
                }, n);
              }, n);
            });
          }, n);
        }, n);
      });
      } };
    };
    // 説明を2行ずつ見せて、最後のページで はい／いいえ
    const show = k => { if (k === pg.length - 1) ask(pg[k], ['はい', 'いいえ'], onPick, title); else say(pg[k], () => show(k + 1), title); };
    show(0);
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
    if (ev.id === 'forestRun') this.forestRun();
    if (ev.id === 'gardenSound') this.gardenSound();
  }

  // 森の中ほど：北から モンスターが つぎつぎ にげてくる（異変の予感）
  forestRun() {
    const st = Game.state;
    st.dir = 'up';
    // 主人公（8,13）の 手前まで 下りてきて、よけて 南へ 走りぬける
    const run = (id, then) => {
      const a = { x: st.x, y: st.y - 6, mon: id, speed: 2 };
      this.walkActor(a, ['down', 'down', 'down', 'down', 'down', 'left', 'down', 'down', 'right', 'down', 'down', 'down'], () => { this.actor = null; then && then(); });
    };
    say('…！ なにか 北から はしってくる！', () => {
      run('kinomushi', () => run('nyakimi', () => run('kokemogu', () => {
        say('モンスターたちが みんな 北から\nにげてきた…。', () => {
          say('コースの 奥で\nなにか おきているのか？', () => { Game.setFlag('forestRun'); Save.auto(st); });
        });
      })));
    });
  }

  // 18番ホールの いちばん奥：地下から 音が きこえる（観測機が 反応）
  gardenSound() {
    const st = Game.state;
    if (st.flags.gardenSound) { say('地面の 下から まだ ひくい音が\nきこえている…。'); return; }
    st.dir = 'up';
    say('……ゴォォ……', () => {
      say('地面の 下から ひくい 音が\nひびいてくる…！', () => {
        say('観測機が ピピッと 反応した。', () => {
          say('「ガーデンCC 地下に 反応。\n おなじ 反応を シブヤ方面でも 記録」', () => {
            say('モンスターたちが おびえていたのは\nこの音の せいか…。クラブハウスの チャンピオンルームへ 行こう。', () => { Game.setFlag('gardenSound'); Save.auto(st); });
          });
        });
      });
    });
  }

  // カエデ（ガーデンCCのグリーンキーパー・クラブチャンピオン）。正門前 → 観測機を受け取る → コース奥の調査を頼む → チャンピオンルームで公式戦
  talkKaede(ev) {
    const st = Game.state, n = 'カエデ';
    if (ev.champ) {   // チャンピオンルーム
      if (st.flags.kaedeWin) { say('シブヤタウンでも 停電が つづいてるって。\nきっと この音と 関係が あるわ。\n（つづきは じゅんびちゅう）', null, n); return; }
      if (!st.flags.gardenSound) { say('ちょうせん者ね。でも いまは\nコースの 異変が 気になって…。\n18番ホールを しらべてから また 来て。', null, n); return; }
      say('地下から 音…！ 観測機にも\nシブヤ方面の 反応が 出てるわ。', () => {
        say('原因は まだ わからないけど\nあなたの おかげで 手がかりが つかめた。', () => {
          say('会員 3人を やぶったのね。\nなら クラブチャンピオンとして\nあなたに 公式戦を もうしこむわ！', () => {
            say('このコースの 芝で 育った 力を 見せてあげる。\nいくわよ、シバモグ！', () => this.kaedeBattle(), n);
          }, n);
        }, n);
      }, n);
      return;
    }
    if (!st.flags.deviceGiven) {
      if (!st.flags.device) { say('ここは ガーデンカントリークラブ。\nいまは コースの モンスターが 落ちつかなくて…。', null, n); return; }
      say('あなた、オクムラ博士の ところの 子ね？', () => {
        say(`${st.name}は 観測機を カエデに わたした！`, () => {
          say('ありがとう。これで 地下の ようすを\nはかれるわ。', () => {
            say('じつは コースの モンスターたちが\nずっと 落ちつかないの。', () => {
              say('わたしは ここで 観測するから\nあなたは コースの いちばん奥を しらべてきて。', () => {
                say('クラブハウスを 通りぬけて 奥の 扉から コースへ。\nカート道なりに 北へ すすむと 18番ホールよ。', () => { Game.setFlag('deviceGiven'); Save.auto(st); }, n);
              }, n);
            }, n);
          }, n);
        });
      }, n);
      return;
    }
    say('コースの いちばん奥、18番ホールを\nしらべてきて。カート道なりに 北へ。', null, n);
  }
  kaedeBattle() {
    const st = Game.state;
    const enemy = makeMonster('kokemogu', 9); enemy.regen = 0.2;   // 花のみつで 回復する（粘り強い戦い）
    Game.push(new BattleScene({ enemy, trainer: { name: 'カエデ' }, onEnd: result => {
      if (result === 'lose') { Party.full(st); say('なかまを 回復して あげたわ。\nもう一度 ちょうせんしてね。', () => Save.auto(st), 'カエデ'); return; }
      Game.setFlag('kaedeWin');
      say('…まいったわ。 あなたの 勝ちよ。', () => {
        say(`${st.name}は ガーデンCCの\nクラブ認定を 手に入れた！`, () => {
          say('スコアカードに スタンプを 押しておくわ。\n認定を 集めれば ガッツリーグに 出られる。つぎは シブヤタウンね。', () => {
            say('シブヤでは 停電が つづいてるそうよ。\nきっと この音と 関係が あるわ。', () => Save.auto(st), 'カエデ');
          }, 'カエデ');
        });
      }, 'カエデ');
    } }));
  }

  // 博士の説明（研究所に入った直後 / ボールを調べた時）
  profIntro(then) {
    const st = Game.state, n = 'オクムラ博士';
    const prof = this.events().find(e => e.prof); if (prof) prof.face = 'down';
    say(`おお ${st.name}くん、よく来たね！\nきみに ガッツモンスターの せかいを おしえよう。`, () => {
      say('この せかいには ゴルフ場の しぜんと\nゴルフボールが とけこんだ', () => {
        say('ガッツモンスターが すんでいる。\nなかまにして いっしょに 冒険するんだ。', () => {
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
  // 会員トレーナー（kind: 'trainer'）：1回だけ勝負。勝つと flag が立つ
  runTrainer(ev) {
    const st = Game.state, n = ev.name;
    ev.face = FACE[st.dir];
    if (ev.flag && st.flags[ev.flag]) { say(ev.after || ev.win, null, n); return; }
    if (ev.needs && !st.flags[ev.needs]) { say(ev.wait || '…', null, n); return; }
    say(ev.intro, () => {
      const enemy = makeMonster(ev.mon, ev.level || 5);
      Game.push(new BattleScene({ enemy, trainer: { name: n }, onEnd: result => {
        if (result === 'lose') { Party.full(st); say(ev.lose, () => Save.auto(st), n); return; }
        if (ev.flag) Game.setFlag(ev.flag);
        say(ev.win, () => Save.auto(st), n);
      } }));
    }, n);
  }

  // 落ちているアイテム（kind: 'item'）：Aで拾う。flag で1回だけ
  pickItem(ev) {
    const st = Game.state;
    say(ev.text || `${ev.item}を みつけた！`, () => {
      st.items[ev.item] = (st.items[ev.item] || 0) + (ev.n || 1);
      say(`${st.name}は ${ev.item}を ${ev.n || 1}つ 手に入れた！`, () => { if (ev.flag) Game.setFlag(ev.flag); Save.auto(st); });
    });
  }

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
  // フェアウェイ：隣がラフなら 境目タイル（上下左右・外角）。斜めの刈り跡は 4枚を x でずらして つなぐ
  drawFairway(ctx, tx, ty, px, py) {
    ctx.drawImage(Tiles.get(`fairway${((tx + ty) % 4 + 4) % 4}`), px, py, CONFIG.TILE, CONFIG.TILE);
  }
  // ラフの縁：ラフでないマス（フェアウェイ・道・砂・水・木の根元…すべて）の、ラフに接している辺に葉先を重ねる。どの地形に接しても同じ輪郭になる
  drawRoughEdge(ctx, tx, ty, px, py) {
    if (!(this.map.golf && Tiles.has('fr_u')) || 'TK~B'.includes(this.tileAt(tx, ty))) return;   // 砂・水の上には葉先を出さない（縁取りを隠さない）
    const T = CONFIG.TILE, isR = (dx, dy) => this.tileAt(tx + dx, ty + dy) === 'T';
    if (isR(0, -1)) ctx.drawImage(Tiles.get('fr_u'), px, py, T, T);
    if (isR(0, 1)) ctx.drawImage(Tiles.get('fr_d'), px, py, T, T);
    if (isR(-1, 0)) ctx.drawImage(Tiles.get('fr_l'), px, py, T, T);
    if (isR(1, 0)) ctx.drawImage(Tiles.get('fr_r'), px, py, T, T);
  }
  // 13枚ブロブ型オートタイル（中央・辺4・外角4・内角4）。kind: 'bk' バンカー / 'pd' 池。same(c) で同じ地形か判定（マップ外は同じ扱い）
  drawBlob(ctx, kind, same, tx, ty, px, py) {
    const at = (dx, dy) => { const c = this.tileAt(tx + dx, ty + dy); return c === ' ' || same(c); };
    const n = at(0, -1), e = at(1, 0), s = at(0, 1), w = at(-1, 0), cnt = n + e + s + w;
    let name;
    if (cnt === 4) {
      if (!at(-1, -1)) name = `${kind}_iul`; else if (!at(1, -1)) name = `${kind}_iur`; else if (!at(-1, 1)) name = `${kind}_idl`; else if (!at(1, 1)) name = `${kind}_idr`;
    } else if (cnt === 3) name = !n ? `${kind}_u` : !s ? `${kind}_d` : !w ? `${kind}_l` : `${kind}_r`;
    else if (cnt === 2 && !(n && s) && !(e && w)) name = !n && !w ? `${kind}_ul` : !n && !e ? `${kind}_ur` : !s && !w ? `${kind}_dl` : `${kind}_dr`;
    if (!name || !Tiles.has(name)) {   // 中央（池は 3コマで ゆらぎ）
      name = kind === 'pd' ? `pd_c${(Math.floor(this.frame / 24) + tx + ty) % 3}` : `bk_c${((tx * 7 + ty * 13) % 2 + 2) % 2}`;
    }
    ctx.drawImage(Tiles.get(name), px, py, CONFIG.TILE, CONFIG.TILE);
  }
  // ラフの前景：そのマスに立っている人物の足元に 芝の下半分を重ねて「埋もれて」見せる
  drawRoughFront(ctx, tx, ty, px, py) {
    if (!(this.map.golf && Tiles.has('rough_fg0')) || this.tileAt(tx, ty) !== 'T') return;
    ctx.drawImage(Tiles.variant('rough_fg', 4, tx, ty), px, py + 8, CONFIG.TILE, CONFIG.TILE / 2);
  }
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
    const grass = () => { if (this.map.golf && Tiles.has('fairway0')) this.drawFairway(ctx, tx, ty, px, py); else ctx.drawImage(Tiles.variant('grass', 3, tx, ty), px, py); };   // コースでは地面＝フェアウェイ
    switch (t) {
      case 'G': grass(); return true;
      // ゴルフ場（ChatGPT製タイル）：g フェアウェイ（ラフとの境目は自動） n グリーン K バンカー（13枚オートタイル） Y ピンフラッグ y ティーマーカー
      case 'g': this.drawFairway(ctx, tx, ty, px, py); return true;
      case 'n': ctx.drawImage(Tiles.get(`green${tx % 2}`), px, py, T, T); return true;
      case 'K': grass(); this.drawBlob(ctx, 'bk', c => c === 'K', tx, ty, px, py); return true;
      case 'Y': ctx.drawImage(Tiles.get(`green${tx % 2}`), px, py, T, T); this.drawProp(ctx, 'flag', px, py); return true;
      case 'y': this.drawFairway(ctx, tx, ty, px, py); this.drawProp(ctx, 'tee', px, py); return true;
      case 'P': if (this.map.golf && Tiles.has('fairway0')) { this.drawFairway(ctx, tx, ty, px, py); ctx.drawImage(Tiles.auto('cart', mask(), tx, ty), px, py); return true; } ctx.drawImage(Tiles.auto('path', mask(), tx, ty), px, py); return true;
      case '~': if (this.map.golf && Tiles.has('pd_c0')) { grass(); this.drawBlob(ctx, 'pd', c => c === '~' || c === 'B', tx, ty, px, py); return true; } ctx.drawImage(Tiles.auto('water', mask(), tx, ty), px, py); return true;
      case 'W': grass(); trees.push([px, py]); return true;
      case 'T': if (this.map.golf && Tiles.has('rough0')) { const fx = this.stepFx; if (fx && fx.x === tx && fx.y === ty && fx.t > 0) ctx.drawImage(Tiles.get(fx.side ? 'rough_stepR' : 'rough_stepL'), px, py, T, T); else ctx.drawImage(Tiles.variant('rough', 4, tx, ty), px, py, T, T); return true; } ctx.drawImage(Tiles.get('tall'), px, py); return true;
      case 'F': grass(); ctx.drawImage(Tiles.variant('flower', 2, tx, ty), px, py); return true;
      case 'H': grass(); this.drawProp(ctx, 'hedge', px, py); return true;
      case 'S': grass(); this.drawProp(ctx, 'sign', px, py); return true;
      case '=': grass(); this.drawProp(ctx, 'fence', px, py); return true;
      case 'Q': ctx.drawImage(Tiles.variant('stone', 5, tx, ty), px, py); return true;
      case 'L': grass(); if (Tiles.has('lamp')) this.drawProp(ctx, 'lamp', px, py); else ctx.drawImage(Gfx.get('lamp', 1, false, 'gGh'), px, py); return true;
      case 'B': if (this.map.golf && Tiles.has('pd_c0')) { grass(); this.drawBlob(ctx, 'pd', c => c === '~' || c === 'B', tx, ty, px, py); ctx.drawImage(Tiles.get(this.tileAt(tx, ty - 1) === '~' || this.tileAt(tx, ty + 1) === '~' ? 'bridge_v' : 'bridge_h'), px, py, T, T); return true; }
        ctx.drawImage(Tiles.auto('water', 15, tx, ty), px, py); if (Tiles.has('bridge')) { ctx.drawImage(Tiles.get('bridge'), px, py); return true; } return false;   // 橋
    }
    return false;
  }

  // 一枚絵マップの画像（単一ファイル版は CONFIG.MAP_IMAGES に埋め込み）
  static mapImage(path) {
    this._maps = this._maps || {};
    if (!this._maps[path]) { const im = new Image(); im.src = (CONFIG.MAP_IMAGES && CONFIG.MAP_IMAGES[path]) || path; this._maps[path] = im; }
    return this._maps[path];
  }
  // ガッツボール（閉じた絵）を接地位置 (x, y) 中央下に描く
  static drawGutsBall(ctx, x, y) {
    const im = BattleScene.ball(), m = BattleScene._ballMeta && BattleScene._ballMeta.closed;
    if (!im.complete || !m) { ctx.drawImage(Gfx.get('ball'), x - 8, y - 12); return; }
    const [sx, sy, sw, sh] = m; ctx.drawImage(im, sx, sy, sw, sh, x - Math.round(sw / 2), y - sh, sw, sh);
  }
  drawPickPreview(ctx, frame, camX, camY) {
    const pv = this.pickPreview, sp = DATA.MONSTERS[pv.id], W = CONFIG.W, T = CONFIG.TILE, style = pv.style || CONFIG.PICK_PREVIEW || 'card-br';   // 採用：右下（せりふ枠のすぐ上）
    const bob = Math.floor(frame / 16) % 2;   // ゆっくり上下
    // 絵を枠の中央に置く（スプライトの実際の描画範囲で中央を合わせる）
    const monCentered = (cx, cy, size) => { const b = Mon.drawnBox(pv.id, size / 24, false); drawMonster(ctx, pv.id, Math.round(cx - b.dx - b.w / 2), Math.round(cy - b.dy - b.h / 2) + bob, size); };
    if (style === 'card' || style === 'card-top') {   // A：名札つきカード（画面の上端。博士の頭より上に収める）
      const w = 76, h = 70, x = Math.round(W / 2 - w / 2), y = 2;
      Text.box(ctx, x, y, w, h); monCentered(x + w / 2, y + 30, 48);
      Text.draw(ctx, sp.name, x + w / 2 - Text.width(sp.name) / 2, y + h - 14, THEME.green);
    } else if (style === 'card-left' || style === 'card-right') {   // A2：机の左右（博士と並ばない）
      const w = 76, h = 70, x = style === 'card-left' ? 6 : W - w - 6, y = 30;
      Text.box(ctx, x, y, w, h); monCentered(x + w / 2, y + 30, 48);
      Text.draw(ctx, sp.name, x + w / 2 - Text.width(sp.name) / 2, y + h - 14, THEME.green);
    } else if (style === 'card-br' || style === 'card-bl') {   // A5：せりふ枠のすぐ上、右下／左下
      const w = 76, h = 70, x = style === 'card-bl' ? 6 : W - w - 6, y = CONFIG.H - 56 - h - 4;
      Text.box(ctx, x, y, w, h); monCentered(x + w / 2, y + 30, 48);
      Text.draw(ctx, sp.name, x + w / 2 - Text.width(sp.name) / 2, y + h - 14, THEME.green);
    } else if (style === 'card-wide') {   // A3：横長カード（絵＋名前＋タイプ）を上端に
      const w = 132, h = 58, x = Math.round(W / 2 - w / 2), y = 2;
      Text.box(ctx, x, y, w, h); monCentered(x + 30, y + h / 2, 48);
      Text.draw(ctx, sp.name, x + 60, y + 18, THEME.green); Text.draw(ctx, `${sp.type}タイプ`, x + 60, y + 34);
    } else if (style === 'big') {  // B：画面の右に大きく、丸い光の背景
      const size = 72, x = W - size - 6, y = 20;
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2); ctx.fill();
      drawMonster(ctx, pv.id, x, y + bob, size);
    } else if (style === 'table') { // C：ボールの上にモンスターが出てきて はねる
      const ev = pv.ev, x = ev.x * T - camX + T / 2 - 12, y = ev.y * T - camY - 20 - bob * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 12, y + 24, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      drawMonster(ctx, pv.id, x, y, 24);
    } else if (style === 'panel') { // D：上半分を図鑑ふうのパネルで覆う（絵・名前・タイプ）
      const h = 96; Text.box(ctx, 4, 4, W - 8, h, { fill: THEME.ivory2 });
      drawMonster(ctx, pv.id, 16, 14 + bob, 72);
      Text.draw(ctx, sp.name, 100, 22, THEME.green); Text.draw(ctx, `${sp.type}タイプ`, 100, 38);
      const b = sp.base || {}; Text.draw(ctx, `HP ${b.hp}  こうげき ${b.atk}`, 100, 58, THEME.textDim); Text.draw(ctx, `まもり ${b.def}  はやさ ${b.spd}`, 100, 72, THEME.textDim);
    }
  }
  draw(ctx, frame) {
    this.frame = frame;
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
    const bgImg = this.map.image ? FieldScene.mapImage(this.map.image) : null;   // 一枚絵マップ：タイルの代わりに絵を敷く（rows は当たり判定だけ）
    if (bgImg && bgImg.complete && bgImg.naturalWidth) ctx.drawImage(bgImg, -camX + bx, -camY + by);
    else if (!this.map.image) for (let ty = cy0 - 1; ty <= cy0 + Math.ceil(H / T) + 1; ty++) {
      for (let tx = cx0 - 1; tx <= cx0 + Math.ceil(W / T) + 1; tx++) {
        const t = this.tileAt(tx, ty);
        if (t === ' ') continue;
        const px = tx * T - camX + bx, py = ty * T - camY + by;
        if (useImg) { const done = this.drawImgTile(ctx, t, tx, ty, px, py, trees); this.drawRoughEdge(ctx, tx, ty, px, py); if (done) continue; }
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
      if (ev.kind === 'starter') {   // 一枚絵の部屋では台座の位置にガッツボールの絵を置く。画像タイルの部屋ではテーブルの絵にボールが描いてある
        const fx = this.ballFx && this.ballFx.ev === ev ? this.ballFx : null;
        if (fx && fx.t >= 36) continue;   // 手に取ったあと
        let bxp = sx + Math.floor(T / 2) + (ev.dx || 0), byp = sy + T + (ev.dy || 0);
        if (fx) {   // 0〜20：光りながら浮き上がる → 20〜36：主人公の手元へ飛んで消える
          const k = Math.min(1, fx.t / 20); byp -= Math.round(Math.sin(k * Math.PI / 2) * 8);
          if (fx.t >= 20) { const q = (fx.t - 20) / 16, hx = st.x * T - camX + bx + T / 2, hy = st.y * T - camY + by + 6; bxp = Math.round(bxp + (hx - bxp) * q); byp = Math.round(byp + (hy - byp) * q); }
          if (fx.t < 20 && fx.t % 4 < 2) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(bxp, byp - 6, 9, 0, Math.PI * 2); ctx.fill(); }
          for (let i = 0; i < 4; i++) { const a = fx.t * 0.3 + i * Math.PI / 2, r = 9 + (fx.t % 10); ctx.fillStyle = '#fff7b0'; ctx.fillRect(Math.round(bxp + Math.cos(a) * r), Math.round(byp - 6 + Math.sin(a) * r), 2, 2); }
        }
        if (this.map.image) FieldScene.drawGutsBall(ctx, bxp, byp);
        else if (!this.map.tileset) ctx.drawImage(Gfx.get('ball'), bxp - 8, byp - 12);
      }
      else if (ev.kind === 'item') { if (ev.item === 'ガッツボール') FieldScene.drawGutsBall(ctx, sx + T / 2, sy + T - 2); else { ctx.fillStyle = '#e8503c'; ctx.fillRect(sx + 5, sy + 6, 6, 7); ctx.fillStyle = '#fff'; ctx.fillRect(sx + 5, sy + 6, 6, 3); ctx.fillStyle = '#1a1a20'; ctx.fillRect(sx + 4, sy + 5, 8, 1); ctx.fillRect(sx + 4, sy + 13, 8, 1); } }
      else if (ev.sprite) { const im = this.npcSprite(ev); ctx.drawImage(im, sx + Math.floor((T - im.width) / 2), sy + T - im.height - 1); this.drawRoughFront(ctx, ev.x, ev.y, sx, sy); }
    }
    // 御三家をえらぶとき：どんな姿か見せる（this.pickPreview = { id, ev, style }）
    if (this.pickPreview) this.drawPickPreview(ctx, frame, camX, camY);
    // カットシーンの人物
    if (this.actor) {
      const a = this.actor; let ax = 0, ay = 0;
      if (this.actorMove > 0) { const [dx, dy] = DIRS[this.actorDir]; const t = this.actorMove / (this.actorFrames || CONFIG.WALK_FRAMES); ax = dx * t * T; ay = dy * t * T; }
      const px = a.x * T - ax - camX + bx, py = a.y * T - ay - camY + by;
      if (a.mon) Mon.draw(ctx, a.mon, px - 4, py - 8, 1, this.actorDir === 'right');   // モンスター（24px箱・足元をマスに）
      else if (a.img && Tiles.has(`${a.img}_${this.actorDir}0`)) { const im = Tiles.get(`${a.img}_${this.actorDir}0`); ctx.drawImage(im, px + Math.floor((T - im.width) / 2), py + T - im.height - 1); }
      else ctx.drawImage(Gfx.get(a.sprite), px, py - 2);
    }
    // 主人公
    // 歩き：1歩の間ずっと歩きコマ（1歩ごとに歩き1／歩き2を交互）。止まったら立ち
    //   ※以前は1歩8コマのうち3コマしか歩きコマが出ず、滑って見えた
    const step = this.moving > 0 ? 1 + this.animStep : 0;
    const hs = this.heroSprite(st.dir, step);
    ctx.drawImage(hs, st.x * T - ox - camX + bx + Math.floor((T - hs.width) / 2), st.y * T - oy - camY + by + T - hs.height - 1);
    // ラフの中：足元に芝を重ねる。重ねるのは「足が入っている行」のマスだけ（上から下へ歩くとき、出てきたマスの芝で顔が隠れないように）
    {
      const feetY = st.y * T - oy + T - 1, fy = Math.floor(feetY / T);
      const xs = this.moving > 0 && DIRS[st.dir][1] === 0 ? [st.x, st.x - DIRS[st.dir][0]] : [st.x];
      for (const fx of xs) this.drawRoughFront(ctx, fx, fy, fx * T - camX + bx, fy * T - camY + by);
    }
    if (useImg) for (const [px, py] of frontTrees) ctx.drawImage(Tiles.get('tree'), px - 8, py - 16);
  }
}
