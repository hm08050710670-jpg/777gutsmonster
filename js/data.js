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
  },

  // ---- 冒険ノート（フラグ順に上から判定）----
  NOTES: [
    { flag: 'town2',    text: 'バーディタウンに ついた。町の人に 話を きこう。' },
    { flag: 'forestIn', text: 'グリーンの森を 北へ ぬけて バーディタウンへ。' },
    { flag: 'rival1',  text: '町の北の ガーデンロードへ 向かおう。' },
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
  OBJECTS: { house: { w: 5, h: 3, door: [2, 2] }, house2: { w: 5, h: 3, door: [2, 2] }, heal: { w: 5, h: 3, door: [2, 2] }, shop: { w: 5, h: 3, door: [2, 2] }, lab: { w: 11, h: 6, door: [5, 5] } },
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
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 3, y: 11, dir: 'down' } },
        { x: 2, y: 1, kind: 'look', text: 'じぶんの ベッド。\nきょうは よく ねむれた。' },
        { x: 7, y: 1, kind: 'look', text: 'テレビ。ゴルフ中継が ながれている。' },
        { x: 2, y: 3, kind: 'look', text: 'つくえ。ゴルフの スコアカードが おいてある。' },
        { x: 5, y: 1, kind: 'look', text: 'ほん棚。「はじめての モンスター育成」' },
      ],
    },
    town: {
      name: 'ガッツタウン', bgm: 'town',
      // 建物は objects で置く（家・店・回復 5×3、研究所 11×7）。文字は地面だけ。北出口は右上（研究所が大きいため）
      rows: [
        'WWWWWWWWWWWWWWWWWPWW',
        'WGGGGGGGGGGGGGGGGPGW',
        'WGGGGGGGGGGGGGGGGPGW',
        'WGGGGGGGGGGGGGGGGPGW',
        'WGGGGGGGGGGGGGGGGPGW',
        'WGGGGGGGGGGGGGGGGPGW',
        'WGGGGGGGGGGGGGGGGPGW',
        'WGGGGGGGGGGGGGGGGPGW',
        'WGGGPPPPPPPPPPPPPPGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGFGPPPPPPPPPPPPPGGW',
        'WGGGGGGGGPGGGGGGGLGW',
        'WGGGGGGGGPGGG~~~GGGW',
        'WGGGGGGGGPGGG~~~GGGW',
        'WGGGPPPPPPGGHHHGFFGW',
        'WWWWWWWWWWWWWWWWWWWW',
      ],
      objects: [
        { sprite: 'lab', x: 4, y: 2 },
        { sprite: 'house', x: 1, y: 9 }, { sprite: 'shop', x: 14, y: 9 },
        { sprite: 'heal', x: 1, y: 13 },
      ],
      events: [
        { x: 3, y: 11, kind: 'warp', to: { map: 'home', x: 5, y: 5, dir: 'up' } },
        { x: 9, y: 7, kind: 'warp', to: { map: 'lab', x: 5, y: 5, dir: 'up' } },
        { x: 3, y: 15, kind: 'warp', to: { map: 'heal', x: 4, y: 4, dir: 'up' } },
        { x: 16, y: 11, kind: 'warp', to: { map: 'shop', x: 4, y: 4, dir: 'up' } },
        { x: 17, y: 0, kind: 'warp', to: { map: 'road', x: 7, y: 20, dir: 'up' } },
        { x: 6, y: 13, kind: 'sign', text: 'ガッツタウン\nゴルフ場の となりの しずかな町' },
        { x: 12, y: 9, kind: 'sign', text: 'オクムラ モンスター研究所' },
        { x: 11, y: 10, kind: 'npc', sprite: 'npc_woman', dir: 'down',
          text: '北の ガーデンロードには\nやせいの GUTS MONSTERSが いるのよ。' },
        { x: 7, y: 14, kind: 'npc', sprite: 'npc_man', dir: 'right',
          text: 'ここの 芝は ゴルフ場と おなじ\n手入れを しているんだ。' },
        // 町の北出口の手前：御三家をもらう前は引き返す／もらった後はノブオが下から来て勝負
        { x: 17, y: 1, kind: 'trigger', id: 'townExit' },
      ],
    },
    lab: {
      name: 'オクムラ研究所', indoor: true, bgm: 'lab',
      rows: [
        'XXXXXXXXXXXX',
        'X..MM.....sX',
        'X..........X',
        'X...OOO....X',
        'X..........X',
        'X..........X',
        'X....m.....X',
        'XXXXXXXXXXXX',
      ],
      events: [
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 9, y: 7, dir: 'down' } },
        { x: 5, y: 2, kind: 'npc', sprite: 'npc_prof', dir: 'down', name: 'オクムラ博士', prof: true },
        { x: 4, y: 3, kind: 'starter', id: 'kokegame', unless: 'starter' },
        { x: 5, y: 3, kind: 'starter', id: 'hinoshishi', unless: 'starter' },
        { x: 6, y: 3, kind: 'starter', id: 'amepiyo',  unless: 'starter' },
        { x: 3, y: 1, kind: 'look', text: 'モンスターの データを しらべる 装置だ。' },
        { x: 10, y: 1, kind: 'look', text: '研究ノートが ぎっしり。' },
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 3, y: 15, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', sprite: 'npc_nurse', dir: 'down', heal: true, name: 'うけつけ',
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 16, y: 11, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', sprite: 'npc_woman', dir: 'down', name: 'てんいん', shop: true,
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
        { x: 7, y: 21, kind: 'warp', to: { map: 'town', x: 17, y: 1, dir: 'down' } },
        { x: 7, y: 0, kind: 'warp', to: { map: 'forest', x: 7, y: 26, dir: 'up' } },
        { x: 10, y: 17, kind: 'sign', text: 'ガーデンロード\n草むらに 注意' },
        { x: 6, y: 1, kind: 'sign', text: 'この先 グリーンの森\n森を ぬけると バーディタウン' },
        { x: 4, y: 9, kind: 'npc', sprite: 'npc_man', dir: 'right',
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
        { x: 11, y: 11, kind: 'sign', text: 'グリーンの森\n北へ ぬけると バーディタウン' },
        { x: 10, y: 4, kind: 'npc', sprite: 'npc_man', dir: 'left',
          text: 'この森は キノムシが おおいんだ。\n虫は ほのおタイプに よわいぞ。' },
        { x: 9, y: 22, kind: 'npc', sprite: 'npc_woman', dir: 'down',
          text: '森の中は 道が くねくね。\n道なりに 北へ すすめば ぬけられるわ。' },
      ],
    },
    town2: {
      name: 'バーディタウン', bgm: 'town', flagOnEnter: 'town2',
      rows: [
        'WWWWWWWWWWWWWWWWWWWW',
        'WGGGGGGGGGGGGGGGGGGW',
        'WGGGGGGGGGGGGGGGGGGW',
        'WGGGGGGGGGGGGGGGGGGW',
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
        { x: 3, y: 3, kind: 'warp', to: { map: 'heal2', x: 4, y: 4, dir: 'up' } },
        { x: 16, y: 3, kind: 'warp', to: { map: 'house2', x: 5, y: 5, dir: 'up' } },
        { x: 3, y: 8, kind: 'warp', to: { map: 'shop2', x: 4, y: 4, dir: 'up' } },
        { x: 16, y: 8, kind: 'look', text: 'かぎが かかっている。\nるすの ようだ。' },
        { x: 8, y: 10, kind: 'sign', text: 'バーディタウン\n森の むこうの 小さな町' },
        { x: 7, y: 5, kind: 'npc', sprite: 'npc_woman', dir: 'down',
          text: 'バーディタウンへ ようこそ。\n森を ぬけてきたの？ すごいわね。' },
        { x: 12, y: 11, kind: 'npc', sprite: 'npc_man', dir: 'left',
          text: 'この町の 東には ゴルフ場の\n18番ホールが あるんだ。（つづきは じゅんびちゅう）' },
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
        { x: 4, y: 2, kind: 'npc', sprite: 'npc_nurse', dir: 'down', heal: true, name: 'うけつけ',
          text: 'ようこそ バーディタウンの かいふくの いえへ。\nなかまを げんきに してあげますね。' },
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
        { x: 4, y: 2, kind: 'npc', sprite: 'npc_woman', dir: 'down', name: 'てんいん', shop: true,
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
        { x: 6, y: 3, kind: 'npc', sprite: 'npc_man', dir: 'left', name: 'おじいさん',
          text: 'わしは むかし ゴルフ場で\nキャディを しておった。\nGUTS MONSTERSは ゴルフの魂が\nやどった いきものじゃよ。' },
        { x: 7, y: 1, kind: 'look', text: 'テレビ。むかしの ゴルフ大会の\nビデオが ながれている。' },
      ],
    },
  },
};

// パーティ共通HP（パズドラ風）。最大＝仲間の最大HPの合計。現在値は state.hp に持つ
const Party = {
  maxHp: st => st.party.reduce((n, m) => n + m.maxHp, 0),
  hp: st => { const mx = Party.maxHp(st); if (st.hp == null) st.hp = mx; return Math.max(0, Math.min(mx, st.hp)); },
  set(st, v) { st.hp = Math.max(0, Math.min(Party.maxHp(st), Math.round(v))); },
  full(st) { st.hp = Party.maxHp(st); st.party.forEach(m => { m.hp = m.maxHp; m.moves && m.moves.forEach(mv => { mv.pp = mv.maxPp; }); }); },
  // 防御・素早さは仲間の平均（いなければ 5）
  def: st => st.party.length ? Math.round(st.party.reduce((n, m) => n + m.def, 0) / st.party.length) : 5,
  spd: st => st.party.length ? Math.round(st.party.reduce((n, m) => n + m.spd, 0) / st.party.length) : 5,
};

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
