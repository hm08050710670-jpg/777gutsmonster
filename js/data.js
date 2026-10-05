// ============================================================
// ゲームデータ（GUTS MONSTERS）
//   モンスター・技・アイテム・マップ・イベント・冒険ノート
// ============================================================
const DATA = {
  TYPES: TYPE_CHART,

  MOVES: {
    'たいあたり':   { type: 'ノーマル', power: 35, pp: 35 },
    'ひっかく':     { type: 'ノーマル', power: 40, pp: 30 },
    'かみつく':     { type: 'ノーマル', power: 45, pp: 25 },
    'はっぱカッター': { type: 'くさ',   power: 45, pp: 25 },
    'ひのこ':       { type: 'ほのお',   power: 40, pp: 25 },
    'あまごい':     { type: 'みず',     power: 40, pp: 25 },
    'でんきショック': { type: 'でんき', power: 40, pp: 25 },
    'かぜおこし':   { type: 'かぜ',     power: 40, pp: 30 },
    'すなかけ':     { type: 'じめん',   power: 40, pp: 30 },
    'ひかりのつぶ': { type: 'ひかり',   power: 40, pp: 25 },
    'かげうち':     { type: 'やみ',     power: 40, pp: 25 },
  },

  // 御三家（Lv7スタート、Lv14・Lv28で進化：進化は未実装）
  // MONSTERS は DEX（js/dex.js）から生成。stage でステータスを決め、下の TUNED で個別に上書き。
  MONSTERS: (() => {
    const STAGE_BASE = { 1: { hp: 45, atk: 48, def: 46, spd: 48 }, 2: { hp: 60, atk: 63, def: 60, spd: 62 }, 3: { hp: 80, atk: 85, def: 80, spd: 80 } };
    const TUNED = {
      kokegame:   { base: { hp: 50, atk: 45, def: 55, spd: 38 }, desc: '甲羅が ゴルフボールみたいな 小さなリクガメ。\n苔が生えていて ちょっと ねむそう' },
      hinoshishi: { base: { hp: 44, atk: 54, def: 42, spd: 52 }, desc: '背中に ディンプルもようの イノシシのこ。\nしっぽの先に 小さな炎' },
      amepiyo:    { base: { hp: 46, atk: 45, def: 48, spd: 55 }, desc: '頭に 雨粒をのせた 黄色いヒヨコ。\n雨の日だけ やけに テンションが高い' },
      morigame:   { desc: '背中に 草木が育ちはじめたカメ' }, nushigame: { desc: '大樹を背負う 森の主' },
      shishiburn: { desc: '炎のたてがみを持つ 勇猛なイノシシ' }, shishivolke: { desc: '火山のような力を宿す 最終形態' },
      amegamo:    { desc: '雨をまとったカモ' }, doshagamo: { desc: '豪雨を呼ぶ 大きなカモ' },
      bubu:       { base: { hp: 50, atk: 55, def: 50, spd: 45 }, desc: '王冠をかぶった ちょっと悪そうな フレンチブルドッグ' },
      mantou:     { desc: 'いつも そばにいる ふわふわの相棒' },
    };
    const out = {};
    const on = id => !DEX_ENABLED || DEX_ENABLED.includes(id);
    for (const d of DEX) {
      if (!on(d.id)) continue;
      const t = TUNED[d.id] || {};
      const evo = d.evo && on(d.evo[0]) ? d.evo : null;   // 進化先が無効なら進化しない
      out[d.id] = { name: d.name, type: d.type, no: d.no, stage: d.stage, evo, special: !!d.special,
        base: t.base || STAGE_BASE[d.stage], moves: TYPE_MOVES[d.type], desc: t.desc || `${d.type}タイプの GUTS MONSTER` };
    }
    return out;
  })(),
  STARTERS: ['kokegame', 'hinoshishi', 'amepiyo'],

  // ---- BGM（assets/bgm/README_BGM.txt 参照）----
  BGM: {
    town:  'assets/bgm/guts_town.mp3',       // GUTS TOWN 112BPM
    lab:   'assets/bgm/okumura_lab.mp3',     // OKUMURA LAB 96BPM
    wild:  'assets/bgm/wild_adventure.mp3',  // A: ADVENTURE 156BPM（野生戦）
    rival: 'assets/bgm/rival_battle.mp3',    // RIVAL BATTLE 168BPM（ノブオ戦）
  },

  ITEMS: {
    'きずぐすり': { heal: 20, desc: 'なかまの HPを 20 かいふくする くすり。' },
    'ガッツボール': { ball: 1, desc: 'やせいの モンスターに なげて つかまえる。HPを へらすほど つかまえやすい。' },
  },
  // 捕まえやすさ（進化段階ごと。special はレア）
  CATCH_RATE: { 1: 0.75, 2: 0.45, 3: 0.25, special: 0.2 },

  // ---- 冒険ノート（フラグ順に上から判定）----
  NOTES: [
    { flag: 'kaedeWin',    text: 'ガーデンCCの クラブ認定を もらった。つぎは シブヤタウンへ。（つづきは じゅんびちゅう）' },
    { flag: 'gardenSound', text: '9番ホールの おくで 地下の音を 確認した。クラブハウスの カエデに ほうこくしよう。' },
    { flag: 'deviceGiven', text: 'カエデと コースを 調査。クラブハウス北の 9番ホールの いちばん おくを しらべよう。' },
    { flag: 'town2',    text: 'クラブハウス前に ついた。グリーンキーパーの カエデに 観測機を とどけよう。' },
    { flag: 'forestIn', text: '2番ホール（林間コース）を 北へ ぬけて クラブハウスへ。' },
    { flag: 'rival1',  text: '町の北の ゲートから ガーデンカントリークラブへ 向かおう。' },
    { flag: 'device',  text: '観測機を ガーデンCCの カエデに とどけよう。町の北の ゲートから 1番ホールへ。' },
    { flag: 'starter', text: '研究所を出て 冒険をはじめよう。' },
    { flag: null,      text: '冒険の朝だ。家を出て、オクムラ博士の研究所へ向かおう。' },
  ],

  // ---- タイル ----
  // 屋外: G芝 T草むら（ラフ） F花 W木 P道（カート道） ~水 B橋 #壁 N窓 R屋根 ^屋根端 D扉 S看板 =柵 L街灯 H生垣
  // ゴルフ場: gフェアウェイ nグリーン Kバンカー Yピンフラッグ yティーマーカー
  // 屋内: .床 X壁 b寝台 t TV d机 s棚 p植物 m出口マット c絨毯 M装置 C受付 O台
  TILE_ART: {
    G: 'grass', T: 'tall', F: 'flower', W: 'tree', P: 'path', '~': 'water', B: 'bridge',
    '#': 'wall', N: 'window', R: 'roof', '^': 'roof_edge', D: 'door', S: 'sign', '=': 'fence', L: 'lamp', H: 'hedge',
    A: 'lab_roof', a: 'lab_roof_dish', E: 'lab_wall', e: 'lab_window', J: 'lab_logo', I: 'lab_door',
    '.': 'floor', X: 'wallin', b: 'bed', t: 'tv', d: 'desk', s: 'shelf', p: 'plant', m: 'mat', c: 'carpet', M: 'machine', C: 'counter', O: 'table',
  },
  WALKABLE: new Set(['G', 'T', 'F', 'P', 'B', 'D', 'I', 'Q', '.', 'm', 'c', 'g', 'n', 'K']),   // 一枚絵マップの '#' は進めない
  // 置き物（タイル画像の名前）：w,h はマス数、door は左上からのドアの位置（そこだけ通れる）
  OBJECTS: { in_machine: { w: 2, h: 2, door: [-1, -1] }, in_table: { w: 3, h: 2, door: [-1, -1] }, house: { w: 5, h: 3, door: [2, 2] }, house2: { w: 5, h: 3, door: [2, 2] }, heal: { w: 5, h: 3, door: [2, 2] }, shop: { w: 5, h: 3, door: [2, 2] }, lab: { w: 11, h: 7, door: [5, 6] } },
  VOID_ART: 'wallin',

  MAPS: {
    home: {
      name: 'じぶんの いえ', indoor: true, bgm: 'town',
      rows: [
        'XXXXXXXXXX',
        'X.b..s.t.X',
        'X........X',
        'X.d......X',
        'X........X',
        'Xp.......X',
        'X....m...X',
        'XXXXXXXXXX',
      ],
      events: [
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 17, y: 6, dir: 'down' } },
        { x: 2, y: 1, kind: 'look', text: 'じぶんの ベッド。\nきょうは よく ねむれた。' },
        { x: 7, y: 1, kind: 'look', text: 'テレビ。ゴルフ中継が ながれている。' },
        { x: 2, y: 3, kind: 'look', text: 'つくえ。ゴルフの スコアカードが おいてある。' },
        { x: 5, y: 1, kind: 'look', text: 'ほん棚。「はじめての モンスター育成」' },
      ],
    },
    town: {
      name: 'ガッツタウン', bgm: 'town',
      // 26×22。研究所は左上、北出口（ガーデンロード）は中央の縦道の上端
      rows: [
        'WWWWWWWWWWWWWPWWWWWWWWWWWW',
        'WGGGGGGGGGGGSPGGGGGGGGGGGW',
        'WGGGGGGGGGGGGPGGGGGGGGGGGW',
        'WGGGGGGGGGGGGPGGGGGGGGGGGW',
        'WGGGGGGGGGGGGPGGGGGGGGGGGW',
        'WGGGGGGGGGGGGPGGGGGGGGGGGW',
        'WGGGGGGGGGGGGPGGGPGGGGGGGW',
        'WGGGGGGGGGGGGPGGGPGGGGGGGW',
        'WGHHHHPHHHHGGPGGGPGSGGGGGW',
        'WGPPPPPPPPPPPPPPPPPPPPPPGW',
        'WGGGGGGGGGGGGPGGGGGGGLGGGW',
        'WGGGGGGGGSGGGPGGGGGGGGGGGW',
        'WGGGGGGGFGGGGPGGGGGGGGGGGW',
        'WGGGGGGGGGGGGPGGGGGGGGGGGW',
        'WGGGGGGGGGGGGPGGGGGGGGGGGW',
        'WGGGPGGGGGGGGPGGGPGGGGGGGW',
        'WGPPPPPPPPPPPPPPPPPPPPPPGW',
        'WGGGGGGGGGGGGPGGGGGG~~~GGW',
        'WGFFGGHHHHGGGPGGGGGG~~~GGW',
        'WGGGGGGGGGGGGPGGGGGGGGFFGW',
        'WGGGGGGGGGGGGPGGGGGGGGGGGW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWW',
      ],
      objects: [
        { sprite: 'lab', x: 1, y: 1 },
        { sprite: 'house', x: 15, y: 3 },
        { sprite: 'heal', x: 2, y: 12 }, { sprite: 'shop', x: 15, y: 12 },
      ],
      events: [
        { x: 17, y: 5, kind: 'warp', to: { map: 'home', x: 5, y: 5, dir: 'up' } },
        { x: 6, y: 7, kind: 'warp', to: { map: 'lab', x: 8, y: 8, dir: 'up' } },
        { x: 4, y: 14, kind: 'warp', to: { map: 'heal', x: 4, y: 4, dir: 'up' } },
        { x: 17, y: 14, kind: 'warp', to: { map: 'shop', x: 4, y: 4, dir: 'up' } },
        { x: 13, y: 0, kind: 'warp', to: { map: 'road', x: 7, y: 20, dir: 'up' } },
        { x: 9, y: 11, kind: 'sign', text: 'ガッツタウン\nゴルフ場の となりの しずかな町' },
        { x: 12, y: 1, kind: 'sign', text: 'この先 ガーデンカントリークラブ\n1番ホール ティーグラウンド' },
        { x: 19, y: 8, kind: 'sign', text: 'オクムラ モンスター研究所は\n町の 北西' },
        { x: 15, y: 10, kind: 'npc', img: 'v02', sprite: 'npc_woman', dir: 'down',
          text: '北の ゴルフ場の ラフには\nやせいの ガッツモンスターが いるのよ。' },
        { x: 20, y: 6, kind: 'npc', img: 'v23', sprite: 'npc_man', dir: 'down',
          text: 'この帽子は ゴルフ場の 売店で かった。\n日ざしが つよい日に ちょうどいい。' },
        { x: 5, y: 17, kind: 'npc', img: 'v21', sprite: 'npc_woman', dir: 'right',
          text: 'おかあさんが いってたわ。\n「よるは モンスターが げんきになる」って。' },
        { x: 8, y: 19, kind: 'npc', img: 'v01', sprite: 'npc_man', dir: 'right',
          text: 'ここの 芝は ゴルフ場と おなじ\n手入れを しているんだ。' },
        // 町の北出口の手前：御三家をもらう前は引き返す／もらった後はノブオが下から来て勝負
        { x: 13, y: 1, kind: 'trigger', id: 'townExit' },
      ],
    },
    lab: {
      name: 'オクムラ研究所', indoor: true, bgm: 'lab', image: 'assets/maps/lab_room.png',
      // 一枚絵マップ（ChatGPT製 assets/src/lab_room_src.png → 256×160 ドット、右へ 8 ドットずらして方眼に合わせた）。rows は当たり判定だけ（# 進めない . 床 m 出口マット）
      rows: [
        '################',
        '################',
        '###..........###',
        '#..###.....###.#',
        '####..#####..###',
        '####..#####..###',
        '####.........###',
        '######.....#####',
        '###...........##',
        '########m#######',
      ],
      objects: [],
      events: [
        { x: 8, y: 9, kind: 'warp', to: { map: 'town', x: 6, y: 8, dir: 'down' } },
        { x: 8, y: 3, kind: 'npc', img: 'npc_prof', sprite: 'npc_prof', dir: 'down', name: 'オクムラ博士', prof: true },
        // 机の台座（絵の位置に合わせてボールをずらして描く）
        // 机の台座（マスの中央に置く。えらんだボールだけ消える：flags.starterId）。pick：えらぶときのせりふ（2行ずつ3ページ、最後に はい／いいえ）
        { x: 7, y: 5, kind: 'starter', id: 'kokegame',   dy: -12,
          pick: ['いわのような こうらに\nコケを まとった ちいさな リクガメ。', 'のんびりやだけど\nとっても がまんづよい。', 'この コケガメを\nはじめての なかまに しますか？'] },
        { x: 8, y: 5, kind: 'starter', id: 'hinoshishi', dy: -12,
          pick: ['あたまと しっぽに\nほのおを ともした ちいさな イノシシ。', 'まけずぎらいで\nつよい あいてほど もえてくる。', 'この ヒノシシを\nはじめての なかまに しますか？'] },
        { x: 9, y: 5, kind: 'starter', id: 'amepiyo',    dy: -12,
          pick: ['あたまに おおきな あまつぶを のせた\nあおと しろの ちいさな ヒヨコ。', 'あめが ふると\nいつもより げんきになる。', 'この アメピヨを\nはじめての なかまに しますか？'] },
        { x: 1, y: 2, kind: 'look', text: 'モンスターの データを しらべる 装置だ。' },
        { x: 2, y: 2, kind: 'look', text: 'モンスターの データを しらべる 装置だ。' },
        { x: 14, y: 2, kind: 'look', text: 'モンスターの エネルギーを はかる 装置。\nブーンと 音が している。' },
        { x: 15, y: 2, kind: 'look', text: 'モンスターの エネルギーを はかる 装置。\nブーンと 音が している。' },
        { x: 7, y: 1, kind: 'look', text: 'ホワイトボード。\nタイプ相性の 図が かいてある。' },
        { x: 9, y: 1, kind: 'look', text: 'ホワイトボード。\n「ガーデンCC コース調査」と かいてある。' },
        { x: 4, y: 1, kind: 'look', text: '研究ノートが ぎっしり。' },
        { x: 5, y: 1, kind: 'look', text: '研究ノートが ぎっしり。' },
        { x: 11, y: 1, kind: 'look', text: 'モンスター図鑑の 古い版が ならんでいる。' },
        { x: 12, y: 1, kind: 'look', text: 'モンスター図鑑の 古い版が ならんでいる。' },
        { x: 4, y: 3, kind: 'look', text: '博士の パソコン。\nモンスターの 写真が ならんでいる。' },
        { x: 12, y: 3, kind: 'look', text: '助手の パソコン。\nデータの 入力ちゅう…。' },
        { x: 4, y: 7, kind: 'look', text: 'パソコン。 スクリーンセーバーが\nぐるぐる まわっている。' },
        { x: 12, y: 7, kind: 'look', text: 'パソコン。 ゴルフ場の 地図が\nひらいてある。' },
        { x: 2, y: 4, kind: 'look', text: 'ガラスケースの 中に\nガッツボールが ならんでいる。' },
        { x: 13, y: 4, kind: 'look', text: 'ガラスケースの 中に\nガッツボールが ならんでいる。' },
        { x: 2, y: 7, kind: 'look', text: 'ガラスケース。 からっぽだ。' },
        { x: 13, y: 7, kind: 'look', text: 'ガラスケース。 からっぽだ。' },
        { x: 1, y: 8, kind: 'look', text: '観葉植物。 みずみずしい。' },
        { x: 13, y: 2, kind: 'look', text: '観葉植物。 みずみずしい。' },
      ],
    },
    heal: {
      name: 'ロッカールーム', indoor: true, bgm: 'town',
      rows: [
        'XXXXXXXXXX',
        'X........X',
        'X...s..p.X',
        'XCCCCCCCCX',
        'X........X',
        'X....m...X',
        'XXXXXXXXXX',
      ],
      events: [
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 4, y: 15, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', img: 'v12', sprite: 'npc_nurse', dir: 'down', heal: true, name: 'うけつけ',
          text: 'ようこそ かいふくの いえへ。\nなかまを げんきに してあげますね。' },
      ],
    },
    shop: {
      name: 'プロショップ', indoor: true, bgm: 'town',
      rows: [
        'XXXXXXXXXX',
        'X........X',
        'X..s...s.X',
        'XCCCCCCCCX',
        'X........X',
        'X....m...X',
        'XXXXXXXXXX',
      ],
      events: [
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 17, y: 15, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', img: 'v25', sprite: 'npc_woman', dir: 'down', name: 'てんいん', shop: true,
          text: 'いらっしゃい！\nきずぐすりなら さしあげますよ。（ショップは じゅんびちゅう）' },
      ],
    },
    road: {
      name: 'ガーデンCC 1番ホール', bgm: 'town', battleBg: 'rough',   // ※専用曲は未提供のため町の曲を仮使用
      // 南のティーから 北のグリーンへ。P はカート道（敵が出ない）。T ラフ・K バンカーで モンスターが出る
      rows: [
        'WWWWWWWPWWWWWW',
        'WGGGGnnPnnGGGW',
        'WGGGnnnPYnnGGW',
        'WGGKnnnPnnnKGW',
        'WGTKKggPggKKTW',
        'WGTTTggPggTTTW',
        'WGTTTggPggWTTW',
        'WGGGGggPggGGGW',
        'WGFGGggPggGGGW',
        'WGGGGggPggSGGW',
        'W~~~~~~B~~~~~W',
        'W~~~~~~B~~~~~W',
        'WGGWGggPggGGGW',
        'WGGGGggPggTTGW',
        'WGTTTggPggTTGW',
        'WGTTGggPggGGGW',
        'WGGGGggPggWGGW',
        'WGGGGggPggGGGW',
        'WGFGGggPggGGGW',
        'WGGGGgyPygGGGW',
        'WGGGGSGPGGGGGW',
        'WWWWWWWPWWWWWW',
      ],
      encounters: [
        { id: 'shibatta', level: [3, 5], weight: 4 }, { id: 'kokemogu', level: [3, 5], weight: 4 }, { id: 'nyakimi', level: [2, 4], weight: 3 }, { id: 'kinomushi', level: [2, 4], weight: 3 },
      ],
      bunker: [ { id: 'bankani', level: [3, 5], weight: 5 }, { id: 'kokemogu', level: [3, 5], weight: 2 } ],
      events: [
        { x: 7, y: 21, kind: 'warp', to: { map: 'town', x: 13, y: 1, dir: 'down' } },
        { x: 7, y: 0, kind: 'warp', to: { map: 'forest', x: 7, y: 26, dir: 'up' } },
        { x: 5, y: 20, kind: 'sign', text: 'ガーデンカントリークラブ\n1番ホール PAR4 ティーグラウンド' },
        { x: 10, y: 9, kind: 'sign', text: 'ラフ（深い草）と バンカーに\nモンスター注意。カート道は 安全' },
        { x: 4, y: 8, kind: 'npc', img: 'v05', sprite: 'npc_man', dir: 'right', name: 'キャディ',
          text: 'カート道を 歩けば モンスターは 出ない。\nラフや バンカーに 入ると とびだしてくるぞ。' },
        { x: 11, y: 7, kind: 'npc', img: 'v04', sprite: 'npc_man', dir: 'left', name: 'ゴルファー',
          text: 'バンカーには バンカニが すんでいる。\n砂を 掘って かくれるのが うまいんだ。' },
        { x: 3, y: 1, kind: 'npc', img: 'v24', sprite: 'npc_woman', dir: 'right', name: 'ゴルファー',
          text: 'グリーンの モンスターは おとなしいわ。\nフラッグの よこを ぬけると 2番ホールよ。' },
      ],
    },
    forest: {
      name: 'ガーデンCC 2番ホール', bgm: 'town', battleBg: 'rough', flagOnEnter: 'forestIn',
      rows: [
        'WWWWWWWWPWWWWWWW',
        'WWWGGGnnPYnWWWWW',
        'WWGGTTnnPnnGWWWW',
        'WWGTTTGgPgGTGWWW',
        'WWGGGGggPgGTTGWW',
        'WWWGGgPPPgGGGWWW',
        'WWWWGgPggGGWWWWW',
        'WWWKKgPgGGGGWWWW',
        'WWGGGgPggTTGGWWW',
        'WWGTTgPPPgGGGGWW',
        'WWGTTGggPgGGGGWW',
        'WWWGGGGgPgGSGWWW',
        'WWWW~~GgPgGGGWWW',
        'WWW~~~GgPgGGWWWW',
        'WWWW~GggPgGGWWWW',
        'WWWGGgPPPgGGGWWW',
        'WWGGGgPggGGKKGWW',
        'WWGTTgPgGGGTTGWW',
        'WWGTTgPgGGGGGWWW',
        'WWGGGgPggWWGGWWW',
        'WWWGGgPPPgGGGWWW',
        'WWWWGGggPgGGWWWW',
        'WWWGGGGgPgGGGWWW',
        'WWGGTTGgPgGGGGWW',
        'WWGGTTGgPgGGFGWW',
        'WWWGGGGgPgGGGWWW',
        'WWWWWGyPPgyWWWWW',
        'WWWWWWWPWWWWWWWW',
      ],
      encounters: [
        { id: 'kinomushi', level: [4, 6], weight: 4 }, { id: 'nyakimi', level: [4, 6], weight: 3 }, { id: 'kokemogu', level: [4, 6], weight: 3 },
        { id: 'kinomino', level: [6, 8], weight: 2 }, { id: 'nyakimino', level: [6, 8], weight: 2 }, { id: 'bubu', level: [5, 7], weight: 2 },
      ],
      bunker: [ { id: 'bankani', level: [5, 7], weight: 5 }, { id: 'kokemogu', level: [5, 7], weight: 2 } ],
      events: [
        { x: 7, y: 27, kind: 'warp', to: { map: 'road', x: 7, y: 1, dir: 'down' } },
        { x: 8, y: 0, kind: 'warp', to: { map: 'town2', x: 9, y: 13, dir: 'up' } },
        { x: 11, y: 11, kind: 'sign', text: '2番ホール PAR5 林間コース\n北の グリーンの先が クラブハウス' },
        // 森の中ほど：北から モンスターが にげてくる（1回だけ）
        { x: 8, y: 13, kind: 'trigger', id: 'forestRun', unless: 'forestRun' },
        { x: 10, y: 4, kind: 'npc', img: 'v04', sprite: 'npc_man', dir: 'left', name: 'ゴルファー',
          text: 'この林間コースは キノムシが おおいんだ。\n虫は ほのおタイプに よわいぞ。' },
        { x: 9, y: 22, kind: 'npc', img: 'v24', sprite: 'npc_woman', dir: 'down', unless: 'forestRun', name: 'キャディ',
          text: '2番は 林の中を くねくね。\nカート道なりに 北へ すすめば グリーンよ。' },
        { x: 9, y: 22, kind: 'npc', img: 'v24', sprite: 'npc_woman', dir: 'down', if: 'forestRun', name: 'キャディ',
          text: 'さっき モンスターたちが 北から\nいっせいに にげてきたの。クラブハウスの ほうで なにか…。' },
      ],
    },
    town2: {
      name: 'ガーデンCC クラブハウス前', bgm: 'town', flagOnEnter: 'town2',
      // 北（中央の縦道の上）が 9番ホール（荒れたコース）の入口。右上の建物が クラブハウス
      rows: [
        'WWWWWWWWWPWWWWWWWWWW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGPPPPPPPPPPPPPPGW',
        'WGFGGGGGGPGGGGGGLGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGPPPPPPPPPPPPPPGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGHHHGGGPGGG~~~GGGW',
        'WGFFGGGGGPGGG~~~GGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WWWWWWWWWPWWWWWWWWWW',
      ],
      objects: [
        { sprite: 'heal', x: 1, y: 1 }, { sprite: 'house2', x: 14, y: 1 },
        { sprite: 'shop', x: 1, y: 6 }, { sprite: 'house2', x: 14, y: 6 },
      ],
      events: [
        { x: 9, y: 14, kind: 'warp', to: { map: 'forest', x: 8, y: 1, dir: 'down' } },
        { x: 9, y: 0, kind: 'warp', to: { map: 'garden', x: 9, y: 14, dir: 'up' } },
        { x: 10, y: 1, kind: 'sign', text: 'この先 9番ホール（調整中）\nグリーンキーパー：カエデ' },
        // カエデ：観測機を渡すまでは庭園の入口（町側）にいる。渡したあとは庭園の中へ
        { x: 8, y: 2, kind: 'npc', img: 'v15', sprite: 'npc_woman', dir: 'right', name: 'カエデ', kaede: true, unless: 'deviceGiven' },
        { x: 3, y: 3, kind: 'warp', to: { map: 'heal2', x: 4, y: 4, dir: 'up' } },
        { x: 16, y: 3, kind: 'warp', to: { map: 'clubhouse', x: 6, y: 8, dir: 'up' } },
        { x: 17, y: 4, kind: 'sign', text: 'ガーデンカントリークラブ\nクラブハウス' },
        { x: 3, y: 8, kind: 'warp', to: { map: 'shop2', x: 4, y: 4, dir: 'up' } },
        { x: 16, y: 8, kind: 'look', text: 'カート置き場。\nかぎが かかっている。' },
        { x: 8, y: 10, kind: 'sign', text: 'クラブハウス前\n左：ロッカールーム・プロショップ' },
        { x: 7, y: 5, kind: 'npc', img: 'v18', sprite: 'npc_woman', dir: 'down',
          name: '会員', text: 'ガーデンカントリークラブへ ようこそ。\nコースは グリーンキーパーの\nカエデさんが 守っているのよ。' },
        { x: 4, y: 12, kind: 'npc', img: 'v26', sprite: 'npc_woman', dir: 'right',
          name: '会員', text: 'きのう 2番ホールで キノムシを みたの。\nとっても かわいかった！' },
        { x: 11, y: 7, kind: 'npc', img: 'v27', sprite: 'npc_man', dir: 'left',
          name: '会員', text: 'クラブチャンピオンの カエデさんは\nコースの 芝の ことなら なんでも 知ってる。' },
        { x: 12, y: 11, kind: 'npc', img: 'v19', sprite: 'npc_man', dir: 'left',
          name: '会員', text: '18番ホールは このクラブの じまん。\nここから 東に あるんだ。（つづきは じゅんびちゅう）' },
      ],
    },
    garden: {
      name: 'ガーデンCC 9番ホール', bgm: 'town', battleBg: 'rough',
      // 生垣で区切った 荒れぎみのコース。中央に池、いちばん奥（上の行き止まり）が調査ポイント
      rows: [
        'WWWWWWWWWWWWWWWWWW',
        'WWGGGHHHGPGHHHGGWW',
        'WWGFFGGGGPGGGGFFGW',
        'WGFFGGHHHPHHHGGFFW',
        'WGGGGGHGGPGGHGGGGW',
        'WGTTGGHGPPPGHGGTTW',
        'WGTTGGHGP~PGHGGTTW',
        'WGGGGGHGPPPGHGGGGW',
        'WGFGGGHHHPHHHGGFGW',
        'WGGGGGGGGPGGGGGGGW',
        'WGHHHGGFFPFFGGHHHW',
        'WGTTGGGFFPFFGGTTGW',
        'WGTTGGGGGPGGGGTTGW',
        'WGGGGGGGGPGGGGGGGW',
        'WWGGGGGGGPGGGGGGWW',
        'WWWWWWWWWPWWWWWWWW',
      ],
      encounters: [
        { id: 'shibatta', level: [6, 8], weight: 4 }, { id: 'kokemogu', level: [6, 8], weight: 4 }, { id: 'nyakimi', level: [6, 8], weight: 3 }, { id: 'honeybal', level: [7, 9], weight: 2 },
      ],
      events: [
        { x: 9, y: 15, kind: 'warp', to: { map: 'town2', x: 9, y: 1, dir: 'down' } },
        // カエデ：観測機を渡したあとは入口で観測している。調査が終わったら公式戦
        { x: 10, y: 13, kind: 'npc', img: 'v15', sprite: 'npc_woman', dir: 'left', name: 'カエデ', kaede: true, if: 'deviceGiven', unless: 'gardenSound' },
        // 調査ポイント（いちばん奥の行き止まり）
        { x: 9, y: 1, kind: 'trigger', id: 'gardenSound' },
        { x: 9, y: 6, kind: 'look', text: 'コースの 池。\n水が すこし にごっている…。' },
        { x: 2, y: 2, kind: 'look', text: '花壇。花が しおれかけている。\n芝も ところどころ 枯れている。' },
        { x: 15, y: 2, kind: 'look', text: '花壇。ハッパチが 花に とまっている。' },
        { x: 7, y: 10, kind: 'look', text: 'フェアウェイ。地面が かすかに ふるえている？' },
      ],
    },
    clubhouse: {
      name: 'クラブハウス', indoor: true, bgm: 'town',
      // 手前がロビー（受付）。奥の左が 練習室（会員トレーナー）、奥の右が チャンピオンルーム（カエデ）
      rows: [
        'XXXXXXXXXXXXXX',
        'X.s....p.....X',
        'X.d.........OX',
        'X............X',
        'X....CCCC....X',
        'X............X',
        'X.p........p.X',
        'X............X',
        'X.....m......X',
        'XXXXXXXXXXXXXX',
      ],
      events: [
        { x: 6, y: 8, kind: 'warp', to: { map: 'town2', x: 16, y: 3, dir: 'down' } },
        { x: 6, y: 3, kind: 'npc', img: 'v12', sprite: 'npc_nurse', dir: 'down', name: 'フロント',
          text: 'ガーデンカントリークラブへ ようこそ。\nクラブチャンピオンの カエデは 奥の 右の へやに おります。' },
        { x: 2, y: 3, kind: 'trainer', img: 'v27', sprite: 'npc_man', dir: 'right', name: '会員 タクマ', mon: 'shibatta', level: 7, flag: 'trainerTakuma',
          intro: 'クラブハウスで 勝負する ルールを\n知ってるか？ まず オレを たおすことだ！', win: 'やるな！ チャンピオンルームは 奥の 右だ。', lose: 'まだまだ。ラフで きたえてこい。', after: 'カエデさんは 手ごわいぞ。\nじめんタイプには くさが きく。' },
        { x: 11, y: 2, kind: 'look', text: 'トロフィーの 台。\n「クラブ選手権 優勝 カエデ」' },
        { x: 2, y: 1, kind: 'look', text: 'スコアカードが ならんでいる。\n認定スタンプを 押す 欄が ある。' },
        { x: 2, y: 2, kind: 'look', text: '受付の 机。\nコース図が ひろげてある。' },
        // カエデ：調査が終わったら チャンピオンルームで 待っている
        { x: 11, y: 3, kind: 'npc', img: 'v15', sprite: 'npc_woman', dir: 'down', name: 'カエデ', kaede: true, if: 'gardenSound' },
      ],
    },
    heal2: {
      name: 'ロッカールーム', indoor: true, bgm: 'town',
      rows: [
        'XXXXXXXXXX',
        'X........X',
        'X...s..p.X',
        'XCCCCCCCCX',
        'X........X',
        'X....m...X',
        'XXXXXXXXXX',
      ],
      events: [
        { x: 5, y: 5, kind: 'warp', to: { map: 'town2', x: 3, y: 3, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', img: 'v12', sprite: 'npc_nurse', dir: 'down', heal: true, name: 'うけつけ',
          text: 'ようこそ ロッカールームへ。\nなかまを げんきに してあげますね。' },
      ],
    },
    shop2: {
      name: 'プロショップ', indoor: true, bgm: 'town',
      rows: [
        'XXXXXXXXXX',
        'X........X',
        'X..s...s.X',
        'XCCCCCCCCX',
        'X........X',
        'X....m...X',
        'XXXXXXXXXX',
      ],
      events: [
        { x: 5, y: 5, kind: 'warp', to: { map: 'town2', x: 3, y: 8, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', img: 'v25', sprite: 'npc_woman', dir: 'down', name: 'てんいん', shop: true,
          text: 'いらっしゃい！ プロショップです。\n2番を ぬけてきた お客さんは ひさしぶり。（ショップは じゅんびちゅう）' },
      ],
    },
    house2: {
      name: 'キャディの いえ', indoor: true, bgm: 'town',
      rows: [
        'XXXXXXXXXX',
        'X.s....t.X',
        'X........X',
        'X..O.....X',
        'X........X',
        'Xp.......X',
        'X....m...X',
        'XXXXXXXXXX',
      ],
      events: [
        { x: 5, y: 6, kind: 'warp', to: { map: 'town2', x: 16, y: 3, dir: 'down' } },
        { x: 6, y: 3, kind: 'npc', img: 'v05', sprite: 'npc_man', dir: 'left', name: 'おじいさん',
          text: 'わしは むかし ゴルフ場で\nキャディを しておった。\nガッツモンスターは ゴルフの魂が\nやどった いきものじゃよ。' },
        { x: 7, y: 1, kind: 'look', text: 'テレビ。むかしの ゴルフ大会の\nビデオが ながれている。' },
      ],
    },
  },
};

// 戦闘は 1匹（先頭の なかま）で戦う。HPは 1匹ずつ持つ
const Party = {
  active: st => st.party[0] || null,
  maxHp: st => st.party[0] ? st.party[0].maxHp : 0,
  hp: st => st.party[0] ? Math.max(0, Math.min(st.party[0].maxHp, st.party[0].hp)) : 0,
  set(st, v) { const m = st.party[0]; if (m) m.hp = Math.max(0, Math.min(m.maxHp, Math.round(v))); },
  full(st) { st.party.forEach(m => { m.hp = m.maxHp; m.moves && m.moves.forEach(mv => { mv.pp = mv.maxPp; }); }); },
  def: st => st.party[0] ? st.party[0].def : 5,
  spd: st => st.party[0] ? st.party[0].spd : 5,
};

// ---- 技チャージ（全モンスター共通の標準値：小1・中3・強5・防御2・回復1）。たまった技は自動で発動する ----
//   ボールの色は自分のタイプの「濃い＝強／基本＝中／明るい＝小」、白＝防御、ピンク＝回復
const SKILL_NEED = { small: 1, mid: 3, strong: 5, guard: 2, heal: 1 };   // 回復も1チャージ（ピンク3つ）でたまったら自動で発動
const SKILL_HEAL = 0.25;   // 回復量（最大HPに対する割合）
const SKILL_POWER = { small: 35, mid: 65, strong: 120 };
// タイプごとの技名（仮）。防御は全員「ガード」、回復は「かいふく」で統一。攻撃技を個別に変えたいモンスターは SKILL_OVERRIDE に
const TYPE_SKILLS = {
  'くさ':   { small: 'このは',     mid: 'リーフカッター',  strong: 'グリーンバースト', guard: 'ガード' },
  'ほのお': { small: 'ひのこ',     mid: 'ファイアクロー',  strong: 'ヒートブラスト',   guard: 'ねっきのまく' },
  'みず':   { small: 'しぶき',     mid: 'アクアスラッシュ', strong: 'ビッグウェーブ',  guard: 'みずのベール' },
  'でんき': { small: 'スパーク',   mid: 'でんげきアーム',  strong: 'サンダーブレイク', guard: 'ガード' },
  'じめん': { small: 'つちけむり', mid: 'ロックスロー',    strong: 'グランドクエイク', guard: 'ガード' },
  'かぜ':   { small: 'そよかぜ',   mid: 'ウインドカッター', strong: 'テンペスト',      guard: 'かぜのまく' },
  'ひかり': { small: 'ひかりのつぶ', mid: 'シャインレイ',  strong: 'セイントフラッシュ', guard: 'ガード' },
  'やみ':   { small: 'かげつき',   mid: 'ダークスラッシュ', strong: 'ナイトメアブロー', guard: 'ガード' },
  'ノーマル': { small: 'たいあたり', mid: 'ガッツアタック', strong: 'フルスイング',     guard: 'ガード' },
};
const SKILL_OVERRIDE = {
  bubu: { small: 'かみつく', mid: 'クラウンヘッド', strong: 'キングスマッシュ' },
};
function skillsOf(m) { const t = TYPE_SKILLS[m.type] || TYPE_SKILLS['ノーマル']; return Object.assign({}, t, SKILL_OVERRIDE[m.id] || {}); }

function makeMonster(id, level) {
  const sp = DATA.MONSTERS[id];
  const stat = b => Math.floor(((b * 2) * level) / 100) + 5;
  const hp = Math.floor(((sp.base.hp * 2) * level) / 100) + level + 10;
  return {
    id, level, name: sp.name, type: sp.type,
    maxHp: hp, hp,
    atk: stat(sp.base.atk), def: stat(sp.base.def), spd: stat(sp.base.spd),
    moves: sp.moves.map(m => ({ name: m, pp: DATA.MOVES[m].pp, maxPp: DATA.MOVES[m].pp })),
    exp: 0,
  };
}
