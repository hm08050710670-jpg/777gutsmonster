// ============================================================
// グラフィック（CLASSIC COLOR）
//   文字列ドット絵。1文字 = 1ドット。色は共通パレット PALETTE で定義。
//   ' ' は透明。すべて仮素材。あとで画像に差し替え可能な設計。
// ============================================================
const PALETTE = {
  '#': '#1e1a18',            // 輪郭
  // 芝・草
  'g': '#5fae4b', 'G': '#4f9a3f', 'h': '#74c25c', 'm': '#2e6b2e', 'l': '#3f8a39', 'L': '#57a64a',
  // 道・砂
  'p': '#dcc78f', 'P': '#c9b378', 'q': '#ebdba9',
  // 水
  'w': '#4b93d8', 'W': '#3877bd', 'x': '#9fd0f2', 'u': '#2b5aa0',
  // 木材・土
  'k': '#3d2b1b', 'K': '#5d4028', 'b': '#8a6238', 'B': '#ad8250', 'j': '#c9a06e',
  // 石・白
  'e': '#f4f1e8', 'E': '#d3cfc2', 'd': '#a19d92', 'D': '#6f6c64',
  // 屋根
  'r': '#c0483c', 'R': '#93302a', 'o': '#df7365',
  // 黄・花・炎
  'y': '#f4d35e', 'Y': '#d9a92b', 'i': '#f19ab5', 'f': '#ff7a2a', 'F': '#f23a1c', 'O': '#ffb347',
  // 人物
  's': '#f3c9a4', 'S': '#d9a37e', 'a': '#25211f', 'A': '#4a4340', 'c': '#cdbca3', 'C': '#ae9c83',
  'n': '#2c2b30', 'v': '#f6f6f6', 'V': '#dcdcdc',
  // モンスター
  't': '#b5773f', 'T': '#8d5a2b', 'z': '#f5e07a', 'Z': '#e0c04a', 'M': '#6b4a30',
  'I': '#ffd166', 'U': '#ffffff',
};

const Gfx = (() => {
  const cache = new Map();

  function build(rows, scale = 1, flip = false) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      const col = PALETTE[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect((flip ? w - 1 - x : x) * scale, y * scale, scale, scale);
    }
    return c;
  }

  // 疑似乱数（タイル生成を決定的にする）
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // 手描きでは面倒な地形は生成する
  function genTile(kind) {
    const r = rng({ grass: 11, tall: 22, path: 33, water: 44, flower: 55, floor: 66, wallin: 77, carpet: 88 }[kind] || 1);
    const rows = [];
    for (let y = 0; y < 16; y++) {
      let row = '';
      for (let x = 0; x < 16; x++) {
        let ch;
        const v = r();
        switch (kind) {
          case 'grass': ch = v < 0.08 ? 'h' : v < 0.15 ? 'G' : 'g'; break;
          case 'flower': ch = v < 0.06 ? 'y' : v < 0.11 ? 'i' : v < 0.16 ? 'e' : v < 0.22 ? 'G' : 'g'; break;
          case 'tall': {
            const blade = ((x + (y >> 2)) % 4 === 0) && (y % 4 !== 3);
            ch = blade ? (y % 4 === 0 ? 'l' : 'm') : (v < 0.1 ? 'G' : 'L'); break; }
          case 'path': ch = v < 0.07 ? 'P' : v < 0.12 ? 'q' : 'p'; break;
          case 'water': {
            const wave = ((x + y * 3) % 11 === 0 && y % 4 === 1);
            ch = wave ? 'x' : (v < 0.12 ? 'W' : 'w'); break; }
          case 'floor': ch = (y % 4 === 3) ? 'B' : ((x % 8 === 7 && (y >> 2) % 2 === 0) || (x % 8 === 3 && (y >> 2) % 2 === 1)) ? 'B' : (v < 0.08 ? 'B' : 'j'); break;
          case 'wallin': ch = y < 12 ? (v < 0.05 ? 'E' : 'e') : (y === 12 ? 'D' : 'K'); break;
          case 'carpet': ch = (x === 0 || x === 15 || y === 0 || y === 15) ? 'R' : ((x + y) % 5 === 0 ? 'o' : 'r'); break;
        }
        row += ch;
      }
      rows.push(row);
    }
    return rows;
  }

  function get(name, scale = 1, flip = false) {
    const key = `${name}:${scale}:${flip}`;
    if (!cache.has(key)) {
      const rows = ART[name] || genTile(name);
      cache.set(key, build(rows, scale, flip));
    }
    return cache.get(key);
  }

  const ART = {
    // ---------- 屋外 ----------
    tree: [
      'gggggmmmmmmggggg', 'gggmmLLLLLLmmggg', 'ggmLLhLLLLLLLmgg', 'gmLLhhLLLlLLLlmg',
      'gmLLLLLLLllLLlmg', 'mLLhLLLLLLLllllm', 'mLLLLLLLLlLllllm', 'mLLLLLlLLLlllllm',
      'gmLLLLLLLlllllmg', 'gmLLLlLLLllllmmg', 'ggmLLLLllllllmgg', 'gggmmlllllmmmggg',
      'ggggggmKKmgggggg', 'ggggggKKKKgggggg', 'gggggKKkkKKggggg', 'ggggkkkkkkkkgggg',
    ],
    wall: [
      'eeeeeeeeeeeeeeee', 'eEEEEEEEEEEEEEEe', 'eEeeeeeeeeeeeeEe', 'eEeeeeeeeeeeeeEe',
      'eEeeeeeeeeeeeeEe', 'eEEEEEEEEEEEEEEe', 'eeeeeeeeeeeeeeee', 'EEEEEEEEEEEEEEEE',
      'eeeeeeeeeeeeeeee', 'eEEEEEEEEEEEEEEe', 'eEeeeeeeeeeeeeEe', 'eEeeeeeeeeeeeeEe',
      'eEeeeeeeeeeeeeEe', 'eEEEEEEEEEEEEEEe', 'dddddddddddddddd', 'DDDDDDDDDDDDDDDD',
    ],
    window: [
      'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'eeKKKKKKKKKKKKee', 'eeKxxxxxKxxxxKee',
      'eeKxwwwwKwwwwKee', 'eeKxwwwwKwwwwKee', 'eeKKKKKKKKKKKKee', 'eeKxwwwwKwwwwKee',
      'eeKxwwwwKwwwwKee', 'eeKxwwwwKwwwwKee', 'eeKKKKKKKKKKKKee', 'eeeeeeeeeeeeeeee',
      'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'dddddddddddddddd', 'DDDDDDDDDDDDDDDD',
    ],
    roof: [
      'RRRRRRRRRRRRRRRR', 'roooooooooooooor', 'rrrrrrrrrrrrrrrr', 'RrrrRrrrRrrrRrrr',
      'RRRRRRRRRRRRRRRR', 'roooooooooooooor', 'rrrrrrrrrrrrrrrr', 'rrRrrrRrrrRrrrRr',
      'RRRRRRRRRRRRRRRR', 'roooooooooooooor', 'rrrrrrrrrrrrrrrr', 'RrrrRrrrRrrrRrrr',
      'RRRRRRRRRRRRRRRR', 'roooooooooooooor', 'rrrrrrrrrrrrrrrr', 'RRRRRRRRRRRRRRRR',
    ],
    roof_edge: [
      'gggggggggggggggg', 'gggggggggggggggg', 'gggggggggggggggg', 'RRRRRRRRRRRRRRRR',
      'roooooooooooooor', 'rrrrrrrrrrrrrrrr', 'RrrrRrrrRrrrRrrr', 'RRRRRRRRRRRRRRRR',
      'roooooooooooooor', 'rrrrrrrrrrrrrrrr', 'rrRrrrRrrrRrrrRr', 'RRRRRRRRRRRRRRRR',
      'roooooooooooooor', 'rrrrrrrrrrrrrrrr', 'RrrrRrrrRrrrRrrr', 'RRRRRRRRRRRRRRRR',
    ],
    door: [
      'eeeeeeeeeeeeeeee', 'eeeKKKKKKKKKKeee', 'eeKbbbbbbbbbbKee', 'eeKbBBBBBBBBbKee',
      'eeKbBjjjjjjBbKee', 'eeKbBjjjjjjBbKee', 'eeKbBBBBBBBBbKee', 'eeKbbbbbbbbbbKee',
      'eeKbBBBBBBBBbKee', 'eeKbBBBBBByBbKee', 'eeKbBBBBBBBBbKee', 'eeKbBBBBBBBBbKee',
      'eeKbbbbbbbbbbKee', 'eeKKKKKKKKKKKKee', 'dddddddddddddddd', 'DDDDDDDDDDDDDDDD',
    ],
    // ---- 研究所（灰色の近未来風・青いガラス）----
    lab_roof: [ // 平らな屋上（灰色、縁取り）
      'DDDDDDDDDDDDDDDD', 'DEEEEEEEEEEEEEED', 'DEddddddddddddED', 'DEddddddddddddED',
      'DEddddddddddddED', 'DEddddddddddddED', 'DEddddddddddddED', 'DEddddddddddddED',
      'DEddddddddddddED', 'DEddddddddddddED', 'DEddddddddddddED', 'DEddddddddddddED',
      'DEddddddddddddED', 'DEEEEEEEEEEEEEED', 'DDDDDDDDDDDDDDDD', 'nnnnnnnnnnnnnnnn',
    ],
    lab_roof_dish: [ // パラボラアンテナつき
      'DDDDDDDDDDDDDDDD', 'DEEEEEEEEEEEEEED', 'DEdddd##ddddddED', 'DEddd#ee#dddddED',
      'DEdd#eeEe#ddddED', 'DEdd#eEEe#ddddED', 'DEdd#eeee#ddddED', 'DEddd#ee#dddddED',
      'DEdddd##ddddddED', 'DEddddd#dddddDED', 'DEdddd###ddddDED', 'DEddddddddddddED',
      'DEddddddddddddED', 'DEEEEEEEEEEEEEED', 'DDDDDDDDDDDDDDDD', 'nnnnnnnnnnnnnnnn',
    ],
    lab_wall: [ // 白い外壁・横のライン
      'nnnnnnnnnnnnnnnn', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'EEEEEEEEEEEEEEEE',
      'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee',
      'EEEEEEEEEEEEEEEE', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee',
      'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'dddddddddddddddd', 'DDDDDDDDDDDDDDDD',
    ],
    lab_window: [ // 横長の青い窓
      'nnnnnnnnnnnnnnnn', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'eDDDDDDDDDDDDDDe',
      'eDxxwwwwwwwwwwDe', 'eDxwwwwwwwwwwwDe', 'eDwwwwwwwwwwwwDe', 'eDwwwwwwwwwwwwDe',
      'eDWWWWWWWWWWWWDe', 'eDDDDDDDDDDDDDDe', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee',
      'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'dddddddddddddddd', 'DDDDDDDDDDDDDDDD',
    ],
    lab_logo: [ // 「G」ロゴ
      'nnnnnnnnnnnnnnnn', 'eeeeeeeeeeeeeeee', 'eeeee######eeeee', 'eeee#eeeeee#eeee',
      'eee#eee##eee#eee', 'eee#ee#ee#ee#eee', 'eee#ee#eeeee#eee', 'eee#ee#e###e#eee',
      'eee#ee#eee#e#eee', 'eee#eee###ee#eee', 'eeee#eeeeee#eeee', 'eeeee######eeeee',
      'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee', 'dddddddddddddddd', 'DDDDDDDDDDDDDDDD',
    ],
    lab_door: [ // 青いガラスの両開き扉
      'nnnnnnnnnnnnnnnn', 'eeeeeeeeeeeeeeee', 'eDDDDDDDDDDDDDDe', 'eDxxwwwwDwwwwxDe',
      'eDxwwwwwDwwwwwDe', 'eDwwwwwwDwwwwwDe', 'eDwwwwwwDwwwwwDe', 'eDwwwwewDwewwwDe',
      'eDwwwwewDwewwwDe', 'eDwwwwwwDwwwwwDe', 'eDWWWWWWDWWWWWDe', 'eDWWWWWWDWWWWWDe',
      'eDDDDDDDDDDDDDDe', 'EEEEEEEEEEEEEEEE', 'dddddddddddddddd', 'DDDDDDDDDDDDDDDD',
    ],
    sign: [
      'gggggggggggggggg', 'ggKKKKKKKKKKKKgg', 'gKjjjjjjjjjjjjKg', 'gKjBBBjjBBBBjjKg',
      'gKjjjjjjjjjjjjKg', 'gKjBBBBjjBBjjjKg', 'gKjjjjjjjjjjjjKg', 'ggKKKKKKKKKKKKgg',
      'gggggggKKggggggg', 'gggggggKKggggggg', 'gggggggKKggggggg', 'gggggggKKggggggg',
      'ggggggKKKKgggggg', 'gggggmKKKKmggggg', 'gggggggggggggggg', 'gggggggggggggggg',
    ],
    fence: [
      'gggggggggggggggg', 'gjjggggggggggjjg', 'gBBggggggggggBBg', 'gBBggggggggggBBg',
      'gjjjjjjjjjjjjjjg', 'gBBBBBBBBBBBBBBg', 'gKKKKKKKKKKKKKKg', 'gBBggggggggggBBg',
      'gjjjjjjjjjjjjjjg', 'gBBBBBBBBBBBBBBg', 'gKKKKKKKKKKKKKKg', 'gBBggggggggggBBg',
      'gBBggggggggggBBg', 'gKKggggggggggKKg', 'gggggggggggggggg', 'gggggggggggggggg',
    ],
    lamp: [
      'gggggggggggggggg', 'gggggggyyggggggg', 'ggggggyIIyggggggg'.slice(0, 16), 'gggggyIIIIyggggg',
      'ggggggyIIyggggggg'.slice(0, 16), 'gggggggDDggggggg', 'gggggggDDggggggg', 'gggggggDDggggggg',
      'gggggggDDggggggg', 'gggggggDDggggggg', 'gggggggDDggggggg', 'gggggggDDggggggg',
      'ggggggDDDDgggggg', 'gggggDDDDDDggggg', 'gggggggggggggggg', 'gggggggggggggggg',
    ],
    bridge: [
      'KKKKKKKKKKKKKKKK', 'jjjjjjjjjjjjjjjj', 'BBBBBBBBBBBBBBBB', 'bbbbbbbbbbbbbbbb',
      'jjjjjjjjjjjjjjjj', 'BBBBBBBBBBBBBBBB', 'bbbbbbbbbbbbbbbb', 'jjjjjjjjjjjjjjjj',
      'BBBBBBBBBBBBBBBB', 'bbbbbbbbbbbbbbbb', 'jjjjjjjjjjjjjjjj', 'BBBBBBBBBBBBBBBB',
      'bbbbbbbbbbbbbbbb', 'jjjjjjjjjjjjjjjj', 'BBBBBBBBBBBBBBBB', 'KKKKKKKKKKKKKKKK',
    ],
    hedge: [
      'mmllLLLLLLLLllmm', 'mlLLhLLLLLLhLLlm', 'lLLLLLLlLLLLLLLl', 'LLhLLLLLLLLhLLLL',
      'LLLLLLlLLLLLLLLL', 'lLLLLLLLLlLLLLLl', 'LLLLhLLLLLLLLhLL', 'lLLLLLLLlLLLLLLl',
      'LLLLLLLLLLLLLLLL', 'lLLhLLLLlLLLhLLl', 'LLLLLLLLLLLLLLLL', 'mlLLLLlLLLLLLLlm',
      'mmllLLLLLLLLllmm', 'ggmmmmmmmmmmmmgg', 'gggggggggggggggg', 'gggggggggggggggg',
    ],
    // ---------- 屋内 ----------
    bed: [
      'KKKKKKKKKKKKKKKK', 'KjjjjjjjjjjjjjjK', 'KjeeeeeeeeeeeejK', 'KjeeeeeeeeeeeejK',
      'KjEEEEEEEEEEEEjK', 'KwwwwwwwwwwwwwwK', 'KwxwwwwwwwwwwxwK', 'KwwwwwwwwwwwwwwK',
      'KwwwwxwwwwwxwwwK', 'KwwwwwwwwwwwwwwK', 'KwwxwwwwwwwwwwxK', 'KwwwwwwwwwwwwwwK',
      'KWWWWWWWWWWWWWWK', 'KKKKKKKKKKKKKKKK', 'BBBBBBBBBBBBBBBB', 'bKKbbbbbbbbbbKKb',
    ],
    tv: [
      'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BB############BB', 'BB#DDDDDDDDDD#BB',
      'BB#DxxDDDDDDD#BB', 'BB#DxDDDDDDDD#BB', 'BB#DDDDDDDDDD#BB', 'BB#DDDDDDDDDD#BB',
      'BB############BB', 'BBBBBB####BBBBBB', 'BBBB########BBBB', 'BBBBBBBBBBBBBBBB',
      'BBjjjjjjjjjjjjBB', 'BBKKKKKKKKKKKKBB', 'BBKBBBBBBBBBBKBB', 'BBKKBBBBBBBBKKBB',
    ],
    desk: [
      'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BjjjjjjjjjjjjjjB',
      'BjKKKKKKKKKKKKjB', 'BjKeeeeeeeeeeKjB', 'BjKeeeeeeeeeeKjB', 'BjKKKKKKKKKKKKjB',
      'BjjjjjjjjjjjjjjB', 'BKKKKKKKKKKKKKKB', 'BKKBBBBBBBBBBKKB', 'BKKBBBBBBBBBBKKB',
      'BKKBBBBBBBBBBKKB', 'BKKBBBBBBBBBBKKB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB',
    ],
    shelf: [
      'eeeeeeeeeeeeeeee', 'KKKKKKKKKKKKKKKK', 'KjjjjjjjjjjjjjjK', 'KjrrjwwjyyjggjjK',
      'KjrrjwwjyyjggjjK', 'KjrrjwwjyyjggjjK', 'KjjjjjjjjjjjjjjK', 'KKKKKKKKKKKKKKKK',
      'KjjjjjjjjjjjjjjK', 'KjggjjrrjjwwjjjK', 'KjggjjrrjjwwjjjK', 'KjggjjrrjjwwjjjK',
      'KjjjjjjjjjjjjjjK', 'KKKKKKKKKKKKKKKK', 'BBBBBBBBBBBBBBBB', 'BKKBBBBBBBBBBKKB',
    ],
    plant: [
      'BBBBBBBBBBBBBBBB', 'BBBBBBLLBBBBBBBB', 'BBBBLLLLLLBBBBBB', 'BBBLLhLLLLLLBBBB',
      'BBLLLLLLlLLLLBBB', 'BBLLhLLLLLLlLBBB', 'BBBLLLlLLLLLBBBB', 'BBBBLLLLLlLBBBBB',
      'BBBBBBmmBBBBBBBB', 'BBBBBRRRRRBBBBBB', 'BBBBBrrrrrBBBBBB', 'BBBBBrrrrrBBBBBB',
      'BBBBBRrrrRBBBBBB', 'BBBBBRRRRRBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB',
    ],
    mat: [
      'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBKKKKKKKKKKKKBB', 'BBKjjjjjjjjjjKBB',
      'BBKjKKKKKKKKjKBB', 'BBKjKjjjjjjKjKBB', 'BBKjKjjjjjjKjKBB', 'BBKjKjjjjjjKjKBB',
      'BBKjKjjjjjjKjKBB', 'BBKjKKKKKKKKjKBB', 'BBKjjjjjjjjjjKBB', 'BBKKKKKKKKKKKKBB',
      'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB',
    ],
    table: [ // 研究所のテーブル（モンスターボールを置く）
      'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BKKKKKKKKKKKKKKB', 'BKeeeeeeeeeeeeKB',
      'BKeeeeeeeeeeeeKB', 'BKeeeeeeeeeeeeKB', 'BKeeeeeeeeeeeeKB', 'BKeeeeeeeeeeeeKB',
      'BKEEEEEEEEEEEEKB', 'BKKKKKKKKKKKKKKB', 'BBKKBBBBBBBBKKBB', 'BBKKBBBBBBBBKKBB',
      'BBKKBBBBBBBBKKBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB',
    ],
    ball: [
      '                ', '                ', '                ', '                ',
      '      ####      ', '     #eEee#     ', '    #eeeeee#    ', '    ##e##e##    ',
      '    #eeeeee#    ', '    #eEeeEe#    ', '     #eeee#     ', '      ####      ',
      '                ', '                ', '                ', '                ',
    ],
    // ---------- タイプアイコン（8×8・戦闘のHP窓用） ----------
    'type_みず':   ['   w    ', '   ww   ', '  wwww  ', ' wxwwww ', ' wxwwwww', ' wwwwww ', '  wwww  ', '   ww   '],
    'type_ほのお': ['   f    ', '  ff    ', '  fff f ', ' ffOff  ', ' fOOff  ', ' fOyOff ', '  fOOf  ', '   ff   '],
    'type_くさ':   ['      G ', '    GGg ', '   Ghhg ', '  Ghhgg ', ' GhhggG ', ' GhggG  ', 'GGGG    ', 'G       '],
    'type_でんき': ['    yy  ', '   yy   ', '  yy    ', ' yyyyy  ', '   yyy  ', '   yy   ', '  yy    ', '  y     '],
    'type_かぜ':   ['  WWWW  ', ' W    W ', '      W ', 'WWWWWWW ', '        ', ' WWWWW  ', '      W ', '  WWWW  '],
    'type_じめん': ['        ', '   BB   ', '  BbbB  ', ' BbbbbB ', ' BbbjbB ', 'KBBBBBK ', 'KKKKKKK ', '        '],
    'type_ひかり': ['   y    ', '   y    ', '  yIy   ', 'yyIIIyy ', '  yIy   ', ' y y y  ', '   y    ', '        '],
    'type_やみ':   ['  nnn   ', ' nn  n  ', 'nn      ', 'nn      ', 'nn      ', ' nn  n  ', '  nnn   ', '        '],
    'type_ノーマル': ['  DDDD  ', ' DddddD ', 'DdddeddD', 'DddddddD', 'DddddddD', 'DddddddD', ' DddddD ', '  DDDD  '],
    machine: [ // 研究所の装置
      'eeeeeeeeeeeeeeee', 'DDDDDDDDDDDDDDDD', 'DEEEEEEEEEEEEEED', 'DE#wwww##yyyy#ED',
      'DE#wxww##yyyy#ED', 'DE#wwww##yyyy#ED', 'DE########r###ED', 'DEEEEEEEEEEEEEED',
      'DDDDDDDDDDDDDDDD', 'DDEEEEEEEEEEEEDD', 'DDEDDDDDDDDDDEDD', 'DDEDDDDDDDDDDEDD',
      'DDEEEEEEEEEEEEDD', 'DDDDDDDDDDDDDDDD', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB',
    ],
    counter: [ // 回復施設・ショップのカウンター
      'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'jjjjjjjjjjjjjjjj',
      'KKKKKKKKKKKKKKKK', 'KeeeeeeeeeeeeeeK', 'KeEEEEEEEEEEEEeK', 'KeEeeeeeeeeeeEeK',
      'KeEeeeeeeeeeeEeK', 'KeEEEEEEEEEEEEeK', 'KeeeeeeeeeeeeeeK', 'KKKKKKKKKKKKKKKK',
      'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB',
    ],

    // ---------- 主人公（男性：黒髪マッシュ）----------
    hm_down0: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaAaaaaaAa   ',
      '   aaaaaaaaaa   ', '   asssssssssa  '.slice(0, 16), '   as#ssss#ssa  '.slice(0, 16), '    ssssssss    ',
      '   #cccccccc#   ', '  sccccccccccs  ', '  sCccccccccCs  ', '   cCCCCCCCCc   ',
      '    nnnnnnnn    ', '    nnn  nnn    ', '    vvv  vvv    ', '   VVV    VVV   ',
    ],
    hm_down1: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaAaaaaaAa   ',
      '   aaaaaaaaaa   ', '   asssssssssa  '.slice(0, 16), '   as#ssss#ssa  '.slice(0, 16), '    ssssssss    ',
      '   #cccccccc#   ', '  sccccccccccs  ', '  sCccccccccCs  ', '   cCCCCCCCCc   ',
      '    nnnnnnnn    ', '   nnn   nnn    ', '   vvv    vvv   ', '  VVV      VV   ',
    ],
    hm_up0: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaAaaaaa   ',
      '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '    saaaaaas    ',
      '   #cccccccc#   ', '  sccCCCCCCccs  ', '  scccccccccCs  ', '   cCCCCCCCCc   ',
      '    nnnnnnnn    ', '    nnn  nnn    ', '    vvv  vvv    ', '   VVV    VVV   ',
    ],
    hm_up1: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaAaaaaa   ',
      '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '    saaaaaas    ',
      '   #cccccccc#   ', '  sccCCCCCCccs  ', '  scccccccccCs  ', '   cCCCCCCCCc   ',
      '    nnnnnnnn    ', '    nnn   nnn   ', '    vvv    vvv  ', '   VV      VVV  ',
    ],
    hm_right0: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaaaAaaa   ',
      '   aaaaaaaaaa   ', '   aaassssssa   ', '   aaas#sss#s   ', '    asssssss    ',
      '    #cccccc#    ', '   scccccccccs  ', '   sCcccccccC   ', '    cCCCCCCCc   ',
      '     nnnnnnn    ', '     nnn nnn    ', '     vvv vvv    ', '    VVV   VVV   ',
    ],
    hm_right1: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaaaAaaa   ',
      '   aaaaaaaaaa   ', '   aaassssssa   ', '   aaas#sss#s   ', '    asssssss    ',
      '    #cccccc#    ', '   scccccccccs  ', '   sCcccccccC   ', '    cCCCCCCCc   ',
      '     nnnnnnn    ', '    nnn   nnn   ', '   vvv     vvv  ', '   VV       VV  ',
    ],
    // ---------- 主人公（女性：黒髪ロング）----------
    hf_down0: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaAaaaaaAa   ',
      '   aassssssaa   ', '   aas#ss#saa   ', '   aassssssaa   ', '   aa ssss aa   ',
      '   aa#cccc#aa   ', '  aascccccc saa '.slice(0, 16), '  aaCcccccccCaa ', '   aaCCCCCCCaa  ',
      '    nnnnnnnn    ', '    nnn  nnn    ', '    vvv  vvv    ', '   VVV    VVV   ',
    ],
    hf_down1: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaAaaaaaAa   ',
      '   aassssssaa   ', '   aas#ss#saa   ', '   aassssssaa   ', '   aa ssss aa   ',
      '   aa#cccc#aa   ', '  aascccccc saa '.slice(0, 16), '  aaCcccccccCaa ', '   aaCCCCCCCaa  ',
      '    nnnnnnnn    ', '   nnn   nnn    ', '   vvv    vvv   ', '  VVV      VV   ',
    ],
    hf_up0: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaAaaaaa   ',
      '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '   aaaaaaaaaa   ',
      '   aaaaaaaaaa   ', '  saaaaaaaaaas  ', '  scaaaaaaaaCs  ', '   cCaaaaaaCc   ',
      '    nnnnnnnn    ', '    nnn  nnn    ', '    vvv  vvv    ', '   VVV    VVV   ',
    ],
    hf_up1: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaAaaaaa   ',
      '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '   aaaaaaaaaa   ', '   aaaaaaaaaa   ',
      '   aaaaaaaaaa   ', '  saaaaaaaaaas  ', '  scaaaaaaaaCs  ', '   cCaaaaaaCc   ',
      '    nnnnnnnn    ', '    nnn   nnn   ', '    vvv    vvv  ', '   VV      VVV  ',
    ],
    hf_right0: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaaaAaaa   ',
      '   aaaaaaaaaa   ', '   aaaassssa    ', '   aaaas#ss#    ', '   aaaassssss   ',
      '   aaa#cccc#    ', '   aaaccccccs   ', '   aaaCccccCs   ', '   aaaCCCCCc    ',
      '     nnnnnnn    ', '     nnn nnn    ', '     vvv vvv    ', '    VVV   VVV   ',
    ],
    hf_right1: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aaaaaaAaaa   ',
      '   aaaaaaaaaa   ', '   aaaassssa    ', '   aaaas#ss#    ', '   aaaassssss   ',
      '   aaa#cccc#    ', '   aaaccccccs   ', '   aaaCccccCs   ', '   aaaCCCCCc    ',
      '     nnnnnnn    ', '    nnn   nnn   ', '   vvv     vvv  ', '   VV       VV  ',
    ],

    // ---------- NPC ----------
    npc_prof: [
      '     aaaaaa     ', '    aaaaaaaa    ', '   aaaaaaaaaa   ', '   aassssssaa   ',
      '   as##ss##sa   ', '   a#s####s#a   ', '   as##ss##sa   ', '    ssssssss    ',
      '   #eeeeeeee#   ', '  seeeewweeees  ', '  seeeeweeeees  ', '   eeeeeeeeee   ',
      '    NNNNNNNN    ', '    NNN  NNN    ', '    aaa  aaa    ', '   AAA    AAA   ',
    ],
    npc_rival: [ // ノブオ（赤いキャップ・青ジャケット）
      '     rrrrrr     ', '    rrrrrrrr    ', '   rrrrrrrrrrrr ', '   aassssssaa   ',
      '   ass#ss#ssa   ', '    ssssssss    ', '    ssSSSSss    ', '   #wwwwwwww#   ',
      '  swwWWWWWWwws  ', '  swwwwwwwwwws  ', '  sWwwwwwwwwWs  ', '   wWWWWWWWWw   ',
      '    nnnnnnnn    ', '    nnn  nnn    ', '    vvv  vvv    ', '   VVV    VVV   ',
    ],
    npc_woman: [
      '     KKKKKK     ', '    KKKKKKKK    ', '   KKKKKKKKKK   ', '   KKssssssKK   ',
      '   Kss#ss#ssK   ', '   KKssssssKK   ', '   KK sSSs KK   ', '   K#iiiiii#K   ',
      '  KsiiiiiiiisK  ', '  KsiiiiiiiisK  ', '   Kiiiiiiii K  ', '    iiiiiiii    ',
      '    iiiiiiii    ', '    sss  sss    ', '    vvv  vvv    ', '   VVV    VVV   ',
    ],
    npc_man: [
      '     tttttt     ', '    tttttttt    ', '   tttttttttt   ', '   ttssssssTt   ',
      '   tss#ss#sst   ', '    ssssssss    ', '    sSSSSSSs    ', '   #gggggggg#   ',
      '  sggggGGggggs  ', '  sggggggggggs  ', '  sGggggggggGs  ', '   gGGGGGGGGg   ',
      '    KKKKKKKK    ', '    KKK  KKK    ', '    kkk  kkk    ', '   kkk    kkk   ',
    ],
    npc_nurse: [
      '     yyyyyy     ', '    yyyyyyyy    ', '   yyyyyyyyyy   ', '   yyssssssyy   ',
      '   yss#ss#ssy   ', '   yyssssssyy   ', '    ysSSSSsy    ', '   #eeeeeeee#   ',
      '  seeerrrreees  ', '  seerrrrrreeg  '.slice(0, 16), '  seeerrrreees  ', '   eeeeeeeeee   ',
      '    eeeeeeee    ', '    eee  eee    ', '    vvv  vvv    ', '   VVV    VVV   ',
    ],

    // ---------- モンスター 24x24（戦闘では2倍）----------
    m_hinokapi: [ // ヒノカピ：太陽×ゴルフボール×カピバラ
      '        FF  ff          ', '       fFOOOOFf         ', '      fOOyyyyOOf        ', '     fOyyIIIIyyOf       ',
      '     OyyIIIIIIyyO       ', '    fOyIIIIIIIIyOf      ', '     ##########         ', '    #tttttttttt#        ',
      '   #ttTttttttTtt#       ', '  #tt#ttttttt#ttt#      ', '  #tttttttttttttt#      ', '  #tttttMMttttttt#      ',
      '  #ttttttttttttttt#     ', '  #tteEetttteEett#      ', '  #teEEEetteEEEet#      ', '  #teEeEetteEeEet#      ',
      '  #teEEEetteEEEet#      ', '   #teEetttteEet#       ', '   #tttttttttttt#       ', '    #tttttttttt#        ',
      '    #TT##TT#TT##        ', '    #TT# #TT#TT#        ', '    ###  ##  ###        ', '                        ',
    ],
    m_shibamog: [ // シバモグ：芝×ゴルフボール×モグラ
      '                        ', '      mLLLLLLLLm        ', '     mLhLLLLhLLLm       ', '    mLLLLLLLLLLLLm      ',
      '     mmLLLLLLLLmm       ', '      ###########       ', '     #MMMMMMMMMMM#      ', '    #MMMMMMMMMMMMM#     ',
      '   #MMM#MMMMMM#MMM#     ', '   #MMMMMMMMMMMMMM#     ', '   #MMMMMsssMMMMMM#     ', '   #MMMMMs#sMMMMMM#     ',
      '   #MMeEEeMMMeEEeM#     ', '   #MeEeEEeMeEeEEe#     ', '   #MeEEEEeMeEEEEe#     ', '   #MMeEEeMMMeEEeM#     ',
      '    #MMMMMMMMMMMM#      ', '    #MMMMMMMMMMMM#      ', '     #MMMMMMMMMM#       ', '     #ss#MMMM#ss#       ',
      '     #ss#    #ss#       ', '      ##      ##        ', '                        ', '                        ',
    ],
    m_amepiyo: [
      '...........w............', '..........wxw...........', '.........wxxxw..........', '.........wwxww..........',
      '..........www...........', '........########........', '......##zzzzzzzz##......', '.....#zzzzzzzzzzzz#.....',
      '....#zz#zzzzzz#zzzz#....', '....#zzzzzzzzzzzzzz#....', '....#zzzzOOOOzzzzzz#....', '....#zzzzOOOOzzzzzz#....',
      '...#zzzzzzzzzzzzzzzz#...', '...#zzzzIzzIzzIzzzzz#...', '...#zzzIzzIzzIzzIzzz#...', '...#zzzzIzzIzzIzzzzz#...',
      '...#zzzzzzzzzzzzzzzz#...', '....#ZzzzzzzzzzzzzZ#....', '.....#ZZzzzzzzzzZZ#.....', '......##ZZZZZZZZ##......',
      '........#OO#OO#.........', '.......OOO..OOO.........', '......OOO....OOO........', '........................',
    ],
    m_kokegame: [
      '..........hh............', '.........h.hh...........', '..........hh............', '.........####...........',
      '.......##eeee##.........', '.....##eEeeeeEe##.......', '....#eeeeLLeeeeee#......', '...#eEeeLllLeEeeEe#.....',
      '...#eeeeeLLeeeeeee#.....', '..#eeEeeeeeeLLeeEee#....', '..#eeeeeEeeLllLeeee#....', '..#eEeeeeeeeLLeeeeeE#...',
      '..#eeeeEeeeeeeeEeeee##..', '...#eeeeeeEeeeeeeee#LL#.', '...##EeEeeeeEeeEee#LLLL#', '....#############LL##LL#',
      '.....#LLLLLLLLLLLLLLLLL#', '....#LLLLLLLLLLLLL#LLLL#', '....#LLLLLLLLLLLLLL#LL#.', '....#LLmLLLLLmLLLLL#L#..',
      '.....#LLLLLLLLLLLLL##...', '....#mm#LLLLL#mm#.......', '....#mm#.....#mm#.......', '.....##.......##........',
    ],
    m_hinoshishi: [
      '.................F......', '................FfF.....', '.................fO.....', '........#######..O......',
      '......##OOOOOOO##.......', '.....#OOEOOEOOEOO#......', '....#OOOOOOOOOOOOO#.....', '...#OOEOOEOOEOOEOO#.....',
      '...#OOOOOOOOOOOOOO#.....', '..#tOOEOOEOOEOOEOOt#....', '..#tttOOOOOOOOOOOttt#...', '.#ttttttttttttttttttt#..',
      '.#t##tttttttttt##tttt#..', '.#t#Ut#ttttttt#Ut#ttt#..', '.#t###tttttttt###tttt#..', '.#tttttttttttttttttt#...',
      '..#SSSSSttttttttttt#....', '.O#SS#S#Sttttttttt#.....', '..#SSSSSS#ttttttt#......', '...##TT###TTTTTT#.......',
      '...#TT#..#TT#TT#........', '...#TT#..#TT#TT#........', '....##....##.##.........', '........................',
    ],
    m_bubu: [ // ブブ：白いフレンチブルドッグ・王冠・ゴルフボール
      '        y  y  y         ', '        yyyyyyy         ', '        yYyyyYy         ', '      ##yyyyyyy##       ',
      '     #eeeeeeeeeee#      ', '    #eeeeeeeeeeeee#     ', '   #ee###eeeee###ee#    ', '   #ee#a#eeeee#a#ee#    ',
      '   #eee##eeeee##eee#    ', '   #eeeeeeeeeeeeeee#    ', '   #eeeeee###eeeeee#    ', '   #eeeeee#a#eeeeee#    ',
      '    #eeeee###eeeee#     ', '    #eeeeiiiiieeee#     ', '    #eee#eeeee#eee#     ', '     #ee#EEEEE#ee#      ',
      '     #eeeEeEeEeee#      ', '      #eeEEEEEee#       ', '      #eeeeeeeee#       ', '      #EE##EE##EE#      ',
      '      #EE# ## #EE#      ', '      ###  ##  ###      ', '                        ', '                        ',
    ],
  };

  return { get, ART, build };
})();
