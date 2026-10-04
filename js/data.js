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
    { flag: 'kaedeWin',    text: 'カエデの 認定を もらった。つぎは シブヤタウンへ。（つづきは じゅんびちゅう）' },
    { flag: 'gardenSound', text: '庭園の おくで 地下の音を 確認した。入口の カエデに ほうこくしよう。' },
    { flag: 'deviceGiven', text: 'カエデと 庭園を 調査。庭園の いちばん おくを しらべよう。' },
    { flag: 'town2',    text: 'ガーデンプレースに ついた。町の北の 庭園に いる カエデに 観測機を とどけよう。' },
    { flag: 'forestIn', text: 'グリーンの森を 北へ ぬけて ガーデンプレースへ。' },
    { flag: 'rival1',  text: '町の北の ガーデンロードへ 向かおう。' },
    { flag: 'device',  text: '観測機を ガーデンプレースの カエデに とどけよう。町の北から ガーデンロードへ。' },
    { flag: 'starter', text: '研究所を出て 冒険をはじめよう。' },
    { flag: null,      text: '冒険の朝だ。家を出て、オクムラ博士の研究所へ向かおう。' },
  ],

  // ---- タイル ----
  // 屋外: G芝 T草むら F花 W木 P道 ~水 B橋 #壁 N窓 R屋根 ^屋根端 D扉 S看板 =柵 L街灯 H生垣
  // 屋内: .床 X壁 b寝台 t TV d机 s棚 p植物 m出口マット c絨毯 M装置 C受付 O台
  TILE_ART: {
    G: 'grass', T: 'tall', F: 'flower', W: 'tree', P: 'path', '~': 'water', B: 'bridge',
    '#': 'wall', N: 'window', R: 'roof', '^': 'roof_edge', D: 'door', S: 'sign', '=': 'fence', L: 'lamp', H: 'hedge',
    A: 'lab_roof', a: 'lab_roof_dish', E: 'lab_wall', e: 'lab_window', J: 'lab_logo', I: 'lab_door',
    '.': 'floor', X: 'wallin', b: 'bed', t: 'tv', d: 'desk', s: 'shelf', p: 'plant', m: 'mat', c: 'carpet', M: 'machine', C: 'counter', O: 'table',
  },
  WALKABLE: new Set(['G', 'T', 'F', 'P', 'B', 'D', 'I', 'Q', '.', 'm', 'c']),
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
        { x: 6, y: 7, kind: 'warp', to: { map: 'lab', x: 7, y: 7, dir: 'up' } },
        { x: 4, y: 14, kind: 'warp', to: { map: 'heal', x: 4, y: 4, dir: 'up' } },
        { x: 17, y: 14, kind: 'warp', to: { map: 'shop', x: 4, y: 4, dir: 'up' } },
        { x: 13, y: 0, kind: 'warp', to: { map: 'road', x: 7, y: 20, dir: 'up' } },
        { x: 9, y: 11, kind: 'sign', text: 'ガッツタウン\nゴルフ場の となりの しずかな町' },
        { x: 12, y: 1, kind: 'sign', text: 'この先 ガーデンロード\nガーデンプレースまで つづく' },
        { x: 19, y: 8, kind: 'sign', text: 'オクムラ モンスター研究所は\n町の 北西' },
        { x: 15, y: 10, kind: 'npc', img: 'v02', sprite: 'npc_woman', dir: 'down',
          text: '北の ガーデンロードには\nやせいの ガッツモンスターが いるのよ。' },
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
      name: 'オクムラ研究所', indoor: true, bgm: 'lab', tileset: 'lab',
      // W壁上 X壁下 b白板 s棚 .床 m出口マット c絨毯 C受付 n受付角 d机 p植物 kケース h椅子 tゴミ箱 |横壁
      rows: [
        'WWWWWWWWWWWWWWWW',
        'XXsXsXbXXbXsXsXX',
        '|.............p|',
        '|kk..dh...hd.kk|',
        '|kk..........kk|',
        '|t....ccc.....t|',
        '|kk...ccc....kk|',
        '|kk..d.....d.kk|',
        '|p.....m.....t.|',
        'WWWWWWWWWWWWWWWW',
      ],
      objects: [
        { sprite: 'in_machine', x: 1, y: 1, dy: -2 },
        { sprite: 'in_machine', x: 13, y: 1, dy: -2 },
        { sprite: 'in_table', x: 6, y: 4, dx: 8 },
      ],
      events: [
        { x: 7, y: 8, kind: 'warp', to: { map: 'town', x: 6, y: 8, dir: 'down' } },
        { x: 7, y: 3, kind: 'npc', img: 'npc_prof', sprite: 'npc_prof', dir: 'down', name: 'オクムラ博士', prof: true },
        { x: 6, y: 5, kind: 'starter', id: 'kokegame', unless: 'starter' },
        { x: 7, y: 5, kind: 'starter', id: 'hinoshishi', unless: 'starter' },
        { x: 8, y: 5, kind: 'starter', id: 'amepiyo',  unless: 'starter' },
        { x: 1, y: 2, kind: 'look', text: 'モンスターの データを しらべる 装置だ。' },
        { x: 2, y: 2, kind: 'look', text: 'モンスターの データを しらべる 装置だ。' },
        { x: 13, y: 2, kind: 'look', text: 'モンスターの エネルギーを はかる 装置。\nブーンと 音が している。' },
        { x: 14, y: 2, kind: 'look', text: 'モンスターの エネルギーを はかる 装置。\nブーンと 音が している。' },
        { x: 6, y: 1, kind: 'look', text: 'ホワイトボード。\nタイプ相性の 図が かいてある。' },
        { x: 9, y: 1, kind: 'look', text: 'ホワイトボード。\n「ガーデンプレース 調査」と かいてある。' },
        { x: 2, y: 1, kind: 'look', text: '研究ノートが ぎっしり。' },
        { x: 12, y: 1, kind: 'look', text: 'モンスター図鑑の 古い版が ならんでいる。' },
        { x: 5, y: 3, kind: 'look', text: '博士の パソコン。\nモンスターの 写真が ならんでいる。' },
        { x: 11, y: 3, kind: 'look', text: '助手の パソコン。\nデータの 入力ちゅう…。' },
      ],
    },
    heal: {
      name: 'かいふくの いえ', indoor: true, bgm: 'town',
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
      name: 'ショップ', indoor: true, bgm: 'town',
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
      name: 'ガーデンロード', bgm: 'town', battleBg: 'rough',   // ※専用曲は未提供のため町の曲を仮使用
      rows: [
        'WWWWWWWPWWWWWW',
        'WGGGGGSPGGGGGW',
        'WGGGGGGPGGFGGW',
        'WGGWGGGPGGGGGW',
        'WGTTTGGPGGWGGW',
        'WGTTTGGPGTTTGW',
        'WGTTTGGPGTTTGW',
        'WGGGGGGPGTTTGW',
        'WGFGGGGPGGGGGW',
        'WGGGGGGPGGGGGW',
        'W~~~~~~B~~~~~W',
        'W~~~~~~B~~~~~W',
        'WGGWGGGPGGGGGW',
        'WGGGGGGPGGTTGW',
        'WGTTTGGPGGTTGW',
        'WGTTGGGPGGGGGW',
        'WGGGGGGPGGWGGW',
        'WGGGGGGPGGSGGW',
        'WGFGGGGPGGGGGW',
        'WGGGGGGPGGGGGW',
        'WGGGGGGPGGGGGW',
        'WWWWWWWPWWWWWW',
      ],
      encounters: [
        { id: 'shibatta', level: [3, 5], weight: 4 }, { id: 'kokemogu', level: [3, 5], weight: 4 }, { id: 'nyakimi', level: [2, 4], weight: 3 }, { id: 'kinomushi', level: [2, 4], weight: 3 }, { id: 'bankani', level: [3, 5], weight: 3 },
      ],
      events: [
        { x: 7, y: 21, kind: 'warp', to: { map: 'town', x: 13, y: 1, dir: 'down' } },
        { x: 7, y: 0, kind: 'warp', to: { map: 'forest', x: 7, y: 26, dir: 'up' } },
        { x: 10, y: 17, kind: 'sign', text: 'ガーデンロード\n草むらに 注意' },
        { x: 6, y: 1, kind: 'sign', text: 'この先 グリーンの森\n森を ぬけると ガーデンプレース' },
        { x: 4, y: 9, kind: 'npc', img: 'v05', sprite: 'npc_man', dir: 'right',
          text: '草むらで つかまえた モンスターは\nなかまに なるんだ。（捕獲は 未実装）' },
      ],
    },
    forest: {
      name: 'グリーンの森', bgm: 'town', battleBg: 'rough', flagOnEnter: 'forestIn',
      rows: [
        'WWWWWWWWPWWWWWWW',
        'WWWGGGGGPGGWWWWW',
        'WWGGTTGGPGGGWWWW',
        'WWGTTTGGPGGTGWWW',
        'WWGGGGGGPGGTTGWW',
        'WWWGGGPPPGGGGWWW',
        'WWWWGGPGGGGWWWWW',
        'WWWGGGPGGGGGWWWW',
        'WWGGGGPGGTTGGWWW',
        'WWGTTGPPPGGGGGWW',
        'WWGTTGGGPGGGGGWW',
        'WWWGGGGGPGGSGWWW',
        'WWWW~~GGPGGGGWWW',
        'WWW~~~GGPGGGWWWW',
        'WWWW~GGGPGGGWWWW',
        'WWWGGGPPPGGGGWWW',
        'WWGGGGPGGGGTTGWW',
        'WWGTTGPGGGGTTGWW',
        'WWGTTGPGGGGGGWWW',
        'WWGGGGPGGWWGGWWW',
        'WWWGGGPPPGGGGWWW',
        'WWWWGGGGPGGGWWWW',
        'WWWGGGGGPGGGGWWW',
        'WWGGTTGGPGGGGGWW',
        'WWGGTTGGPGGGFGWW',
        'WWWGGGGGPGGGGWWW',
        'WWWWWGGPPGGWWWWW',
        'WWWWWWWPWWWWWWWW',
      ],
      encounters: [
        { id: 'kinomushi', level: [4, 6], weight: 4 }, { id: 'nyakimi', level: [4, 6], weight: 3 }, { id: 'kokemogu', level: [4, 6], weight: 3 },
        { id: 'kinomino', level: [6, 8], weight: 2 }, { id: 'nyakimino', level: [6, 8], weight: 2 }, { id: 'bubu', level: [5, 7], weight: 2 },
      ],
      events: [
        { x: 7, y: 27, kind: 'warp', to: { map: 'road', x: 7, y: 1, dir: 'down' } },
        { x: 8, y: 0, kind: 'warp', to: { map: 'town2', x: 9, y: 13, dir: 'up' } },
        { x: 11, y: 11, kind: 'sign', text: 'グリーンの森\n北へ ぬけると ガーデンプレース' },
        // 森の中ほど：北から モンスターが にげてくる（1回だけ）
        { x: 8, y: 13, kind: 'trigger', id: 'forestRun', unless: 'forestRun' },
        { x: 10, y: 4, kind: 'npc', img: 'v04', sprite: 'npc_man', dir: 'left',
          text: 'この森は キノムシが おおいんだ。\n虫は ほのおタイプに よわいぞ。' },
        { x: 9, y: 22, kind: 'npc', img: 'v24', sprite: 'npc_woman', dir: 'down', unless: 'forestRun',
          text: '森の中は 道が くねくね。\n道なりに 北へ すすめば ぬけられるわ。' },
        { x: 9, y: 22, kind: 'npc', img: 'v24', sprite: 'npc_woman', dir: 'down', if: 'forestRun',
          text: 'さっき モンスターたちが 北から\nいっせいに にげてきたの。なにか あったのかしら…。' },
      ],
    },
    town2: {
      name: 'ガーデンプレース', bgm: 'town', flagOnEnter: 'town2',
      // 北（中央の縦道の上）が庭園の入口
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
        { x: 10, y: 1, kind: 'sign', text: 'この先 ガーデンプレース庭園\n管理人：カエデ' },
        // カエデ：観測機を渡すまでは庭園の入口（町側）にいる。渡したあとは庭園の中へ
        { x: 8, y: 2, kind: 'npc', img: 'v15', sprite: 'npc_woman', dir: 'right', name: 'カエデ', kaede: true, unless: 'deviceGiven' },
        { x: 3, y: 3, kind: 'warp', to: { map: 'heal2', x: 4, y: 4, dir: 'up' } },
        { x: 16, y: 3, kind: 'warp', to: { map: 'house2', x: 5, y: 5, dir: 'up' } },
        { x: 3, y: 8, kind: 'warp', to: { map: 'shop2', x: 4, y: 4, dir: 'up' } },
        { x: 16, y: 8, kind: 'look', text: 'かぎが かかっている。\nるすの ようだ。' },
        { x: 8, y: 10, kind: 'sign', text: 'ガーデンプレース\n森の むこうの 小さな町' },
        { x: 7, y: 5, kind: 'npc', img: 'v18', sprite: 'npc_woman', dir: 'down',
          text: 'ガーデンプレースへ ようこそ。\n町の北の 庭園は カエデさんが\n管理しているのよ。' },
        { x: 4, y: 12, kind: 'npc', img: 'v26', sprite: 'npc_woman', dir: 'right',
          text: 'きのう 森で キノムシを みたの。\nとっても かわいかった！' },
        { x: 11, y: 7, kind: 'npc', img: 'v27', sprite: 'npc_man', dir: 'left',
          text: 'ゴルフ場の 18番ホールは\nこの町の じまんなんだ。' },
        { x: 12, y: 11, kind: 'npc', img: 'v19', sprite: 'npc_man', dir: 'left',
          text: 'この町の 東には ゴルフ場の\n18番ホールが あるんだ。（つづきは じゅんびちゅう）' },
      ],
    },
    garden: {
      name: 'ガーデンプレース庭園', bgm: 'town', battleBg: 'rough',
      // 生垣で区切った庭園。中央に噴水、いちばん奥（上の行き止まり）が調査ポイント
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
        { x: 10, y: 13, kind: 'npc', img: 'v15', sprite: 'npc_woman', dir: 'left', name: 'カエデ', kaede: true, if: 'deviceGiven' },
        // 調査ポイント（いちばん奥の行き止まり）
        { x: 9, y: 1, kind: 'trigger', id: 'gardenSound' },
        { x: 9, y: 6, kind: 'look', text: '庭園の 噴水。\n水が すこし にごっている…。' },
        { x: 2, y: 2, kind: 'look', text: '花壇。花が しおれかけている。' },
        { x: 15, y: 2, kind: 'look', text: '花壇。ハッパチが 花に とまっている。' },
        { x: 7, y: 10, kind: 'look', text: '花壇。地面が かすかに ふるえている？' },
      ],
    },
    heal2: {
      name: 'かいふくの いえ', indoor: true, bgm: 'town',
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
          text: 'ようこそ ガーデンプレースの かいふくの いえへ。\nなかまを げんきに してあげますね。' },
      ],
    },
    shop2: {
      name: 'ショップ', indoor: true, bgm: 'town',
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
          text: 'いらっしゃい！\n森を ぬけてきた お客さんは ひさしぶり。（ショップは じゅんびちゅう）' },
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
