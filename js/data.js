// ============================================================
// ゲームデータ（モンスター・技・アイテム・マップ・イベント）
//   ここを編集すれば内容が変わる。ロジックは scenes/ 側。
// ============================================================
const DATA = {
  // ---- タイプ相性（攻撃側 → 防御側 → 倍率）----
  TYPES: {
    'くさ':   { 'みず': 2, 'ほのお': 0.5 },
    'ほのお': { 'くさ': 2, 'みず': 0.5 },
    'みず':   { 'ほのお': 2, 'くさ': 0.5 },
    'ノーマル': {},
  },

  MOVES: {
    'たいあたり': { type: 'ノーマル', power: 35, pp: 35 },
    'ひっかく':   { type: 'ノーマル', power: 40, pp: 30 },
    'はっぱ':     { type: 'くさ',     power: 45, pp: 25 },
    'ひのこ':     { type: 'ほのお',   power: 40, pp: 25 },
    'みずでっぽう': { type: 'みず',   power: 40, pp: 25 },
  },

  // 種族値は初代を参考にした簡易値（HP/こうげき/ぼうぎょ/すばやさ）
  MONSTERS: {
    kokedama: { name: 'コケダマ', type: 'くさ',   sprite: 'm_kokedama', base: { hp: 45, atk: 49, def: 49, spd: 45 }, moves: ['たいあたり', 'はっぱ'] },
    hinokoro: { name: 'ヒノコロ', type: 'ほのお', sprite: 'm_hinokoro', base: { hp: 39, atk: 52, def: 43, spd: 65 }, moves: ['ひっかく', 'ひのこ'] },
    shizukun: { name: 'シズクン', type: 'みず',   sprite: 'm_shizukun', base: { hp: 44, atk: 48, def: 65, spd: 43 }, moves: ['たいあたり', 'みずでっぽう'] },
  },

  ITEMS: {
    'きずぐすり': { heal: 20, desc: 'HPを20かいふく' },
  },

  // ---- マップ ----
  // 記号: G=草 T=草むら(エンカウント) W=木 P=道 ~=水 #=壁 R=屋根 D=ドア S=看板 F=柵
  MAPS: {
    town: {
      name: 'はじまりのまち',
      rows: [
        'WWWWWWWWWWWWWWWWWWWW',
        'WGGGGGGGGGGGGGGGGGGW',
        'WGRRRRGGGGGGRRRRGGGW',
        'WG####GGGGGG####GGGW',
        'WG#DD#GSGGGG#DD#GGGW',
        'WGPPPPPPPPPPPPPPGGGW',
        'WGGGGGPGGGGGGGGGGGGW',
        'WFFFGGPGGGGGGGFFFFGW',
        'WTTTGGPGGGG~~~~GGGGW',
        'WTTTTGPGGGG~~~~GGGGW',
        'WTTTTTPPPPPPGGGGGGGW',
        'WTTTTTTGGGGGGGGGGGGW',
        'WTTTTTTTGGGGGGGGGGGW',
        'WWWWWWWWWWWWWWWWWWWW',
      ],
      encounters: [
        { id: 'kokedama', level: [2, 4], weight: 5 },
        { id: 'hinokoro', level: [2, 3], weight: 3 },
        { id: 'shizukun', level: [2, 3], weight: 3 },
      ],
      // イベント：x,y はマス座標
      events: [
        { x: 7, y: 4, kind: 'sign', text: 'はじまりのまち\nここから ぼうけんが はじまる' },
        { x: 9, y: 6, kind: 'npc', sprite: 'npc_old', dir: 'down',
          text: 'おお きたか。\nこの スケルトンは じゆうに かいぞう していいぞ。\nみなみの くさむらには モンスターが いる。' },
        { x: 13, y: 5, kind: 'npc', sprite: 'npc_girl', dir: 'down', heal: true,
          text: 'つかれてる みたいね。\nなかまを かいふく してあげる！' },
        { x: 3, y: 4, kind: 'door', text: 'ドアは しまっている。\n（マップ切替は みじっそう）' },
        { x: 4, y: 4, kind: 'door', text: 'ドアは しまっている。\n（マップ切替は みじっそう）' },
        { x: 13, y: 4, kind: 'door', text: 'ここは かいふくの いえ。\n（マップ切替は みじっそう）' },
        { x: 14, y: 4, kind: 'door', text: 'ここは かいふくの いえ。\n（マップ切替は みじっそう）' },
      ],
      start: { x: 6, y: 6, dir: 'down' },
    },
  },

  // 通行可能なタイル
  WALKABLE: new Set(['G', 'T', 'P']),
  TILE_ART: { G: 'grass', T: 'tall', W: 'tree', P: 'path', '~': 'water', '#': 'wall', R: 'roof', D: 'door', S: 'sign', F: 'fence' },
};

// ---- 個体生成（初代風のシンプルな計算）----
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
