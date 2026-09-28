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

  // ---- BGM（assets/bgm/README_BGM.txt 参照）----
  BGM: {
    town:  'assets/bgm/guts_town.mp3',       // GUTS TOWN 112BPM
    lab:   'assets/bgm/okumura_lab.mp3',     // OKUMURA LAB 96BPM
    wild:  'assets/bgm/wild_adventure.mp3',  // A: ADVENTURE 156BPM（野生戦）
    rival: 'assets/bgm/rival_battle.mp3',    // RIVAL BATTLE 168BPM（ノブオ戦）
  },

  ITEMS: {
    'きずぐすり': { heal: 20, desc: 'HPを20かいふく' },
  },

  // ---- 冒険ノート（フラグ順に上から判定）----
  NOTES: [
    { flag: 'rival1',  text: '町の北の ガーデンロードへ 向かおう。' },
    { flag: 'starter', text: '研究所を出て 冒険をはじめよう。' },
    { flag: null,      text: '冒険の朝だ。家を出て、オクムラ博士の研究所へ向かおう。' },
  ],

  // ---- タイル ----
  // 屋外: G芝 T草むら F花 W木 P道 ~水 B橋 #壁 N窓 R屋根 ^屋根端 D扉 S看板 =柵 L街灯 H生垣
  // 屋内: .床 X壁 b寝台 t TV d机 s棚 p植物 m出口マット c絨毯 M装置 C受付 O台
  TILE_ART: {
    G: 'grass', g: 'grass2', T: 'tall', F: 'flower', W: 'tree', Y: 'pine', P: 'path', '~': 'water', B: 'bridge', Q: 'stone_l', q: 'stone_r',
    '#': 'wall', N: 'window', R: 'roof', '^': 'roof_edge', D: 'door', S: 'sign', '=': 'fence', L: 'lamp', H: 'hedge',
    '.': 'floor', X: 'wallin', b: 'bed', t: 'tv', d: 'desk', s: 'shelf', p: 'plant', m: 'mat', c: 'carpet', M: 'machine', C: 'counter', O: 'table',
  },
  WALKABLE: new Set(['G', 'g', 'T', 'F', 'f', 'P', 'B', 'D', '.', 'm', 'c']),   // '.' は一枚絵マップの通行可
  // アトラス描画：下地（タイル）と、その上に載る小物
  ATLAS_BASE: { G: 'grass', g: 'grass2', T: 'tall', F: 'flower_w', f: 'flower_y', P: 'path', '~': 'water', B: 'bridge',
    W: 'grass', Y: 'grass', H: 'grass', '=': 'grass', L: 'grass', S: 'grass', Q: 'grass', q: 'grass', R: 'grass', r: 'grass', b: 'grass', k: 'grass', t: 'grass', o: 'grass', l: 'grass', s: 'grass' },
  ATLAS_DECOR: { W: 'tree', Y: 'pine', H: 'hedge', L: 'lamp', S: 'sign', Q: 'stone_sign', R: 'rock', r: 'rock_big', b: 'bush', k: 'bush_flower', t: 'tuft', o: 'planter_y', l: 'planter_w', s: 'stump' },
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
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 3, y: 13, dir: 'down' } },
        { x: 2, y: 1, kind: 'look', text: 'じぶんの ベッド。\nきょうは よく ねむれた。' },
        { x: 7, y: 1, kind: 'look', text: 'テレビ。ゴルフ中継が ながれている。' },
        { x: 2, y: 3, kind: 'look', text: 'つくえ。ゴルフの スコアカードが おいてある。' },
        { x: 5, y: 1, kind: 'look', text: 'ほん棚。「はじめての モンスター育成」' },
      ],
    },
    town: {
      name: 'ガッツタウン', bgm: 'town',
      // 一枚絵マップ：image を背景として敷き、rows は当たり判定（. 通行可 / # 不可 / D 扉）
      image: 'assets/maps/town.webp', imageW: 1190, imageH: 1322,
      rows: [
        '#############.###',
        '#############.###',
        '####.#######..###',
        '###..###.###..###',
        '###.##.#.###.####',
        '##.#.###.###...##',
        '########.####.###',
        '##..#.......#..##',
        '####.#.###.######',
        '#.......#.......#',
        '######.###..#####',
        '######.###.######',
        '##..#..###...#.##',
        '###.##.###..#.###',
        '###....#.#.#.####',
        '##.##..#.#...####',
        '#..##.......#####',
        '########.########',
        '#################',
      ],
      events: [
        { x: 13, y: 0, kind: 'warp', to: { map: 'road', x: 9, y: 20, dir: 'up' } },
        { x: 8, y: 3, kind: 'warp', to: { map: 'lab', x: 5, y: 5, dir: 'up' } },
        { x: 2, y: 12, kind: 'warp', to: { map: 'home', x: 5, y: 5, dir: 'up' } },
        { x: 3, y: 12, kind: 'warp', to: { map: 'home', x: 5, y: 5, dir: 'up' } },
        { x: 13, y: 12, kind: 'warp', to: { map: 'heal', x: 4, y: 4, dir: 'up' } },
        { x: 8, y: 14, kind: 'warp', to: { map: 'shop', x: 4, y: 4, dir: 'up' } },
        { x: 10, y: 4, kind: 'look', text: 'モンスターと ゴルフの みらいを けんきゅうする\n―― ガッツ研究所' },
        { x: 11, y: 4, kind: 'look', text: 'モンスターと ゴルフの みらいを けんきゅうする\n―― ガッツ研究所' },
        { x: 8, y: 8, kind: 'look', text: 'ふんすい。みずが きらきら ひかっている。' },
        { x: 14, y: 7, kind: 'npc', sprite: 'woman', dir: 'down',
          text: '北の ガーデンロードには\nやせいの GUTS MONSTERSが いるのよ。' },
        { x: 5, y: 15, kind: 'npc', sprite: 'man', dir: 'right',
          text: 'ここの 芝は ゴルフ場と おなじ\n手入れを しているんだ。' },
        { x: 13, y: 1, kind: 'trigger', id: 'townExit', rival: { x: 13, y: 7, path: ['up', 'up', 'left', 'up', 'up', 'right', 'up'] } },
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
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 8, y: 4, dir: 'down' } },
        { x: 5, y: 2, kind: 'npc', sprite: 'prof', dir: 'down', name: 'オクムラ博士', prof: true },
        { x: 4, y: 3, kind: 'starter', id: 'hinokapi', unless: 'starter' },
        { x: 5, y: 3, kind: 'starter', id: 'shibamog', unless: 'starter' },
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 13, y: 13, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', sprite: 'nurse', dir: 'down', heal: true, name: 'うけつけ',
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 8, y: 15, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', sprite: 'woman', dir: 'down', name: 'てんいん', shop: true,
          text: 'いらっしゃい！\nきずぐすりなら さしあげますよ。（ショップは じゅんびちゅう）' },
      ],
    },
    road: {
      name: 'ガーデンロード', bgm: 'town',   // ※専用曲は未提供のため町の曲を仮使用
      rows: [
        'YYYYYYYYYYYYYYYYYY',
        'YGGGGGGGSPGGGGGGGY',
        'YGGGGGGGGPGGFGGGGY',
        'YGGGGWGGGPGGGGGGGY',
        'YGGGTTTGGPGGWGGGGY',
        'YGGGTTTGGPGTTTGGGY',
        'YGGGTTTGGPGTTTGGGY',
        'YGGGGGGGGPGTTTGGGY',
        'YGGGFGGGGPGGGGGGGY',
        'YGGGGGGGGPGGGGGGGY',
        'Y~~~~~~~~B~~~~~~~Y',
        'Y~~~~~~~~B~~~~~~~Y',
        'YGGGGWGGGPGGGGGGGY',
        'YGGGGGGGGPGGTTGGGY',
        'YGGGTTTGGPGGTTGGGY',
        'YGGGTTGGGPGGGGGGGY',
        'YGGGGGGGGPGGWGGGGY',
        'YGGGGGGGGPGGSGGGGY',
        'YGGGFGGGGPGGGGGGGY',
        'YGGGGGGGGPGGGGGGGY',
        'YGGGGGGGGPGGGGGGGY',
        'YYYYYYYYYYYYYYYYYY',
      ],
      encounters: [
        { id: 'hinokapi', level: [3, 5], weight: 3 },
        { id: 'shibamog', level: [3, 5], weight: 4 },
        { id: 'amepiyo',  level: [3, 5], weight: 3 },
      ],
      events: [
        { x: 9, y: 21, kind: 'warp', to: { map: 'town', x: 13, y: 1, dir: 'down' } },
        { x: 12, y: 17, kind: 'sign', text: 'ガーデンロード\n草むらに 注意' },
        { x: 8, y: 1, kind: 'sign', text: 'この先は こうじちゅう\n（次のエリアは 未実装）' },
        { x: 6, y: 9, kind: 'npc', sprite: 'man', dir: 'right',
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
