// ============================================================
// ゲームデータ（GUTS MONSTERS）
//   モンスター・技・アイテム・マップ・イベント・冒険ノート
// ============================================================
const DATA = {
  TYPES: {
    'くさ':   { 'みず': 2, 'ほのお': 0.5 },
    'ほのお': { 'くさ': 2, 'みず': 0.5 },
    'みず':   { 'ほのお': 2, 'くさ': 0.5 },
    'ノーマル': {},
  },

  MOVES: {
    'たいあたり':   { type: 'ノーマル', power: 35, pp: 35 },
    'ひっかく':     { type: 'ノーマル', power: 40, pp: 30 },
    'かみつく':     { type: 'ノーマル', power: 45, pp: 25 },
    'はっぱカッター': { type: 'くさ',   power: 45, pp: 25 },
    'ひのこ':       { type: 'ほのお',   power: 40, pp: 25 },
    'あまごい':     { type: 'みず',     power: 40, pp: 25 },
  },

  // 御三家（Lv7スタート、Lv14・Lv28で進化：進化は未実装）
  MONSTERS: {
    hinokapi: { name: 'ヒノカピ', type: 'ほのお', sprite: 'm_hinokapi', base: { hp: 44, atk: 52, def: 45, spd: 50 }, moves: ['たいあたり', 'ひのこ'],
      desc: '太陽とゴルフボールを まとった のんびりカピバラ' },
    shibamog: { name: 'シバモグ', type: 'くさ',   sprite: 'm_shibamog', base: { hp: 48, atk: 47, def: 52, spd: 40 }, moves: ['ひっかく', 'はっぱカッター'],
      desc: '芝から かおを だす ちいさなモグラ' },
    amepiyo:  { name: 'アメピヨ', type: 'みず',   sprite: 'm_amepiyo',  base: { hp: 46, atk: 45, def: 48, spd: 55 }, moves: ['たいあたり', 'あまごい'],
      desc: '雨の日に げんきになる ダサかわアヒル' },
    bubu:     { name: 'ブブ',     type: 'ノーマル', sprite: 'm_bubu',   base: { hp: 50, atk: 55, def: 50, spd: 45 }, moves: ['たいあたり', 'かみつく'],
      desc: '王冠をかぶった ちょっと悪そうな フレンチブルドッグ' },
  },
  STARTERS: ['hinokapi', 'shibamog', 'amepiyo'],

  ITEMS: {
    'きずぐすり': { heal: 20, desc: 'HPを20かいふく' },
  },

  // ---- 冒険ノート（フラグ順に上から判定）----
  NOTES: [
    { flag: 'rival1',  text: '町の南の ガーデンロードへ 向かおう。' },
    { flag: 'starter', text: '研究所を出て 冒険をはじめよう。' },
    { flag: null,      text: '冒険の朝だ。家を出て、オクムラ博士の研究所へ向かおう。' },
  ],

  // ---- タイル ----
  // 屋外: G芝 T草むら F花 W木 P道 ~水 B橋 #壁 N窓 R屋根 ^屋根端 D扉 S看板 =柵 L街灯 H生垣
  // 屋内: .床 X壁 b寝台 t TV d机 s棚 p植物 m出口マット c絨毯 M装置 C受付 O台
  TILE_ART: {
    G: 'grass', T: 'tall', F: 'flower', W: 'tree', P: 'path', '~': 'water', B: 'bridge',
    '#': 'wall', N: 'window', R: 'roof', '^': 'roof_edge', D: 'door', S: 'sign', '=': 'fence', L: 'lamp', H: 'hedge',
    '.': 'floor', X: 'wallin', b: 'bed', t: 'tv', d: 'desk', s: 'shelf', p: 'plant', m: 'mat', c: 'carpet', M: 'machine', C: 'counter', O: 'table',
  },
  WALKABLE: new Set(['G', 'T', 'F', 'P', 'B', 'D', '.', 'm', 'c']),
  VOID_ART: 'wallin',

  MAPS: {
    home: {
      name: 'じぶんの いえ', indoor: true,
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
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 3, y: 5, dir: 'down' } },
        { x: 2, y: 1, kind: 'look', text: 'じぶんの ベッド。\nきょうは よく ねむれた。' },
        { x: 7, y: 1, kind: 'look', text: 'テレビ。ゴルフ中継が ながれている。' },
        { x: 2, y: 3, kind: 'look', text: 'つくえ。ゴルフの スコアカードが おいてある。' },
        { x: 5, y: 1, kind: 'look', text: 'ほん棚。「はじめての モンスター育成」' },
      ],
    },
    town: {
      name: 'ガッツタウン',
      rows: [
        'WWWWWWWWWWWWWWWWWWWW',
        'WGGGGGGGGGGGGGGGGGGW',
        'WG^^^GGGGGGG^^^^^GGW',
        'WG#N#GFGGGGG#N#N#GGW',
        'WG#D#GGGGGGG#NDN#GGW',
        'WGPPPGGSGGGGGGPGGGGW',
        'WGGGPPPPPPPPPPPGGGGW',
        'WGFGGGGGGPGGGGGGLGGW',
        'WG^^^GGGGPGGGG^^^GGW',
        'WG#N#GGGGPGGGG#N#GGW',
        'WG#D#GLGGPGGGG#D#GGW',
        'WGPPPPPPPPPPPPPPPGGW',
        'WGGGGGGGGPGGG~~~GGGW',
        'WGFFGGGGGPGGG~~~GGGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WGHHHHHHGPGHHHHHHHGW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WWWWWWWWWPWWWWWWWWWW',
      ],
      events: [
        { x: 3, y: 4, kind: 'warp', to: { map: 'home', x: 5, y: 5, dir: 'up' } },
        { x: 14, y: 4, kind: 'warp', to: { map: 'lab', x: 5, y: 5, dir: 'up' } },
        { x: 3, y: 10, kind: 'warp', to: { map: 'heal', x: 4, y: 4, dir: 'up' } },
        { x: 15, y: 10, kind: 'warp', to: { map: 'shop', x: 4, y: 4, dir: 'up' } },
        { x: 9, y: 17, kind: 'warp', to: { map: 'road', x: 7, y: 1, dir: 'down' } },
        { x: 7, y: 5, kind: 'sign', text: 'ガッツタウン\nゴルフ場の となりの しずかな町' },
        { x: 13, y: 5, kind: 'sign', text: 'オクムラ モンスター研究所' },
        { x: 11, y: 7, kind: 'npc', sprite: 'npc_woman', dir: 'down',
          text: '南の ガーデンロードには\nやせいの GUTS MONSTERSが いるのよ。' },
        { x: 6, y: 13, kind: 'npc', sprite: 'npc_man', dir: 'right',
          text: 'ここの 芝は ゴルフ場と おなじ\n手入れを しているんだ。' },
        // 御三家を もらうまで 町の出口を ふさぐ
        { x: 9, y: 16, kind: 'npc', sprite: 'npc_man', dir: 'up', unless: 'starter',
          text: 'まだ モンスターを もっていないだろ？\nまずは オクムラ博士の 研究所へ いきな。' },
        // 研究所を出た直後：ノブオ登場（1回だけ）
        { x: 14, y: 6, kind: 'rival', sprite: 'npc_rival', dir: 'up', if: 'starter', unless: 'rival1' },
      ],
    },
    lab: {
      name: 'オクムラ研究所', indoor: true,
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
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 14, y: 5, dir: 'down' } },
        { x: 5, y: 2, kind: 'npc', sprite: 'npc_prof', dir: 'down', name: 'オクムラ博士', prof: true },
        { x: 4, y: 3, kind: 'starter', id: 'hinokapi', unless: 'starter' },
        { x: 5, y: 3, kind: 'starter', id: 'shibamog', unless: 'starter' },
        { x: 6, y: 3, kind: 'starter', id: 'amepiyo',  unless: 'starter' },
        { x: 3, y: 1, kind: 'look', text: 'モンスターの データを しらべる 装置だ。' },
        { x: 10, y: 1, kind: 'look', text: '研究ノートが ぎっしり。' },
      ],
    },
    heal: {
      name: 'かいふくの いえ', indoor: true,
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 3, y: 11, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', sprite: 'npc_nurse', dir: 'down', heal: true, name: 'うけつけ',
          text: 'ようこそ かいふくの いえへ。\nなかまを げんきに してあげますね。' },
      ],
    },
    shop: {
      name: 'ショップ', indoor: true,
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 15, y: 11, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', sprite: 'npc_woman', dir: 'down', name: 'てんいん', shop: true,
          text: 'いらっしゃい！\nきずぐすりなら さしあげますよ。（ショップは じゅんびちゅう）' },
      ],
    },
    road: {
      name: 'ガーデンロード',
      rows: [
        'WWWWWWWPWWWWWW',
        'WGGGGGGPGGGGGW',
        'WGFGGGGPGGSGGW',
        'WGGWGGGPGGGGGW',
        'WGTTGGGPGGWGGW',
        'WGTTTGGPGGGGGW',
        'WGTTTGGPGGTTGW',
        'WGGGGGGPGGTTGW',
        'WGGWGGGPGGGGGW',
        'W~~~~~~B~~~~~W',
        'W~~~~~~B~~~~~W',
        'WGGGGGGPGGGGGW',
        'WGFGGGGPGTTTGW',
        'WGGGGGGPGTTTGW',
        'WGTTTGGPGTTTGW',
        'WGTTTGGPGGGGGW',
        'WGTTTGGPGGWGGW',
        'WGGGGGGPGGGGGW',
        'WGGWGGGPGGFGGW',
        'WGGGGGGPGGGGGW',
        'WGGGGGSPGGGGGW',
        'WWWWWWWWWWWWWW',
      ],
      encounters: [
        { id: 'hinokapi', level: [3, 5], weight: 3 },
        { id: 'shibamog', level: [3, 5], weight: 4 },
        { id: 'amepiyo',  level: [3, 5], weight: 3 },
      ],
      events: [
        { x: 7, y: 0, kind: 'warp', to: { map: 'town', x: 9, y: 16, dir: 'up' } },
        { x: 10, y: 2, kind: 'sign', text: 'ガーデンロード\n草むらに 注意' },
        { x: 6, y: 20, kind: 'sign', text: 'この先は こうじちゅう\n（次のエリアは 未実装）' },
        { x: 4, y: 11, kind: 'npc', sprite: 'npc_man', dir: 'right',
          text: '草むらで つかまえた モンスターは\nなかまに なるんだ。（捕獲は 未実装）' },
      ],
    },
  },
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
