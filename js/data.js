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
  WALKABLE: new Set(['G', 'T', 'F', 'P', 'B', 'D', 'I', '.', 'm', 'c']),
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
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 3, y: 5, dir: 'down' } },
        { x: 2, y: 1, kind: 'look', text: 'じぶんの ベッド。\nきょうは よく ねむれた。' },
        { x: 7, y: 1, kind: 'look', text: 'テレビ。ゴルフ中継が ながれている。' },
        { x: 2, y: 3, kind: 'look', text: 'つくえ。ゴルフの スコアカードが おいてある。' },
        { x: 5, y: 1, kind: 'look', text: 'ほん棚。「はじめての モンスター育成」' },
      ],
    },
    town: {
      name: 'ガッツタウン', bgm: 'town',
      rows: [
        'WWWWWWWWWPWWWWWWWWWW',
        'WGGGGGGGGPGGGGGGGGGW',
        'WG^^^GGGGPGGGAAaAAGW',
        'WG#N#GFGGPGGGeEJEeGW',
        'WG#D#GGGGPGGGeEIEeGW',
        'WGPPPGGSGPGGGGGPGGGW',
        'WGGGPPPPPPPPPPPPGGGW',
        'WGFGGGGGGPGGGGGGLGGW',
        'WG^^^GGGGPGGGG^^^GGW',
        'WG#N#GGGGPGGGG#N#GGW',
        'WG#D#GLGGPGGGG#D#GGW',
        'WGPPPPPPPPPPPPPPPGGW',
        'WGGGGGGGGGGGG~~~GGGW',
        'WGFFGGGGGGGGG~~~GGGW',
        'WGGGGHHHHGGGGGGGGGGW',
        'WGGGGGGGGGGGGGFFGGGW',
        'WGGGGGGGGGGGGGGGGGGW',
        'WWWWWWWWWWWWWWWWWWWW',
      ],
      events: [
        { x: 3, y: 4, kind: 'warp', to: { map: 'home', x: 5, y: 5, dir: 'up' } },
        { x: 15, y: 4, kind: 'warp', to: { map: 'lab', x: 5, y: 5, dir: 'up' } },
        { x: 3, y: 10, kind: 'warp', to: { map: 'heal', x: 4, y: 4, dir: 'up' } },
        { x: 15, y: 10, kind: 'warp', to: { map: 'shop', x: 4, y: 4, dir: 'up' } },
        { x: 9, y: 0, kind: 'warp', to: { map: 'road', x: 7, y: 20, dir: 'up' } },
        { x: 7, y: 5, kind: 'sign', text: 'ガッツタウン\nゴルフ場の となりの しずかな町' },
        { x: 14, y: 5, kind: 'sign', text: 'オクムラ モンスター研究所' },
        { x: 11, y: 7, kind: 'npc', sprite: 'npc_woman', dir: 'down',
          text: '北の ガーデンロードには\nやせいの GUTS MONSTERSが いるのよ。' },
        { x: 6, y: 13, kind: 'npc', sprite: 'npc_man', dir: 'right',
          text: 'ここの 芝は ゴルフ場と おなじ\n手入れを しているんだ。' },
        // 町の北出口の手前：御三家をもらう前は引き返す／もらった後はノブオが下から来て勝負
        { x: 9, y: 1, kind: 'trigger', id: 'townExit' },
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
        { x: 5, y: 6, kind: 'warp', to: { map: 'town', x: 15, y: 5, dir: 'down' } },
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 3, y: 11, dir: 'down' } },
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
        { x: 5, y: 5, kind: 'warp', to: { map: 'town', x: 15, y: 11, dir: 'down' } },
        { x: 4, y: 2, kind: 'npc', sprite: 'npc_woman', dir: 'down', name: 'てんいん', shop: true,
          text: 'いらっしゃい！\nきずぐすりなら さしあげますよ。（ショップは じゅんびちゅう）' },
      ],
    },
    road: {
      name: 'ガーデンロード', bgm: 'town', battleBg: 'rough',   // ※専用曲は未提供のため町の曲を仮使用
      rows: [
        'WWWWWWWWWWWWWW',
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
        { x: 7, y: 21, kind: 'warp', to: { map: 'town', x: 9, y: 1, dir: 'down' } },
        { x: 10, y: 17, kind: 'sign', text: 'ガーデンロード\n草むらに 注意' },
        { x: 6, y: 1, kind: 'sign', text: 'この先は こうじちゅう\n（次のエリアは 未実装）' },
        { x: 4, y: 9, kind: 'npc', sprite: 'npc_man', dir: 'right',
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
