// ============================================================
// グラフィック（CLASSIC COLOR / 参考画像の方向）
//   ・地形・建物・小物：コードで描く（陰影・輪郭つき）  → PAINT
//   ・人物・モンスター・屋内小物：文字列ドット絵         → ART
//   1文字 = 1ドット。' ' は透明。すべて差し替え可能な仮素材。
// ============================================================
const PALETTE = {
  '#': '#1f2a1e',
  // 芝・草
  'g': '#5fbb4d', 'G': '#47a03c', 'h': '#7ad261', 'm': '#2f7a30', 'l': '#3f9a39', 'L': '#57b04a',
  // 道・砂
  'p': '#d8c58e', 'P': '#c4ae74', 'q': '#e8d9a8',
  // 水
  'w': '#3f8fd6', 'W': '#2d6fb5', 'x': '#8ecbf0', 'u': '#1f4f8a',
  // 木材・土
  'k': '#4a2f1a', 'K': '#6d4326', 'b': '#8f5f36', 'B': '#b8834e', 'j': '#d3a672',
  // 白・石・灰
  'e': '#f2f1ec', 'E': '#d5d7d9', 'd': '#a9aeb5', 'D': '#7b8189', 'n': '#5a606a',
  // 屋根
  'r': '#d4463b', 'R': '#9e2f27', 'o': '#ec7a6c',
  // 黄・花・炎
  'y': '#f5d34d', 'Y': '#d9a422', 'i': '#f39ab8', 'f': '#ff7a2a', 'F': '#f23a1c', 'O': '#ffb347', 'I': '#fff1a8',
  // 人物
  's': '#f4c9a2', 'S': '#d59e78', 'a': '#23201f', 'A': '#3d3836', 'c': '#cbb99f', 'C': '#ab9a80',
  'N': '#2b2f3a', 'v': '#f8f8f8', 'V': '#d8d8d8',
  // モンスター
  't': '#b5773f', 'T': '#8d5a2b', 'z': '#f5e07a', 'Z': '#e0c04a', 'M': '#6b4a30', 'U': '#ffffff',
};
// 参考画像に寄せた地形色（PAINT 用）
const COL = {
  outline: '#1f3d22',
  grass: '#5cb84a', grassD: '#4aa33a', grassL: '#72cc5a', grassDD: '#3a8a30',
  path: '#d9c48c', pathD: '#c6b078', pathL: '#e9dcaa',
  water: '#3f8fd6', waterD: '#2a6db3', waterL: '#8fd0f2', waterEdge: '#1e4f8c',
  leaf: '#4fb84a', leafD: '#2f8a3c', leafL: '#7ad165', leafDD: '#226b2e',
  trunk: '#7a4a2a', trunkD: '#4d2e18',
  white: '#eef1f3', whiteD: '#b9c0c8', gray: '#b8bec6', grayD: '#8e95a0', grayL: '#d9dde2', grayDD: '#5f6670',
  glass: '#4aa3e0', glassD: '#2b6fb0', glassL: '#a8dcf7',
  roof: '#d9463c', roofD: '#a8302a', roofL: '#ee7c70',
  wall: '#efe9dc', wallD: '#cfc6b3',
  wood: '#a06a3a', woodD: '#6e4522', woodL: '#c99160',
  lampY: '#ffe066', lampGlow: '#fff5b0',
  flowerW: '#ffffff', flowerY: '#f5d34d', flowerP: '#f39ab8',
};

const Gfx = (() => {
  const cache = new Map();

  // ---- 文字列 → canvas ----
  function build(rows, scale = 1, flip = false) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = PALETTE[rows[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect((flip ? w - 1 - x : x) * scale, y * scale, scale, scale);
    }
    return c;
  }

  // ---- コードで描く（1px 単位のペインター）----
  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const P = {
      px: (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); },
      rect: (x, y, rw, rh, col) => { g.fillStyle = col; g.fillRect(x, y, rw, rh); },
      hline: (x, y, len, col) => { g.fillStyle = col; g.fillRect(x, y, len, 1); },
      vline: (x, y, len, col) => { g.fillStyle = col; g.fillRect(x, y, 1, len); },
      disc: (cx, cy, r, col) => { g.fillStyle = col; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) g.fillRect(cx + x, cy + y, 1, 1); },
      ring: (cx, cy, r, col) => { g.fillStyle = col; for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = x * x + y * y; if (d <= (r + 1) * (r + 1) && d > r * r) g.fillRect(cx + x, cy + y, 1, 1); } },
      box: (x, y, rw, rh, col) => { g.fillStyle = col; g.fillRect(x, y, rw, 1); g.fillRect(x, y + rh - 1, rw, 1); g.fillRect(x, y, 1, rh); g.fillRect(x + rw - 1, y, 1, rh); },
      img: (name, x, y) => { g.drawImage(get(name), x, y); },
    };
    fn(P, g);
    return c;
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // 芝の下地（各タイル共通）
  function grassBase(P, seed = 7) {
    const r = rng(seed);
    P.rect(0, 0, 16, 16, COL.grass);
    for (let i = 0; i < 14; i++) { const x = Math.floor(r() * 16), y = Math.floor(r() * 16); P.px(x, y, r() < 0.5 ? COL.grassD : COL.grassL); }
    for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 15), y = Math.floor(r() * 15); P.px(x, y, COL.grassD); P.px(x + 1, y + 1, COL.grassD); }
  }

  // 丸い木（タイルいっぱいの3段の葉・輪郭・幹）
  function drawTree(P, ox = 0, oy = 0) {
    const O = COL.outline;
    P.hline(ox + 3, oy + 15, 10, COL.grassDD);
    P.rect(ox + 6, oy + 12, 4, 3, COL.trunk); P.vline(ox + 6, oy + 12, 3, COL.trunkD); P.vline(ox + 5, oy + 12, 3, O); P.vline(ox + 10, oy + 12, 3, O);
    // 下段
    P.disc(ox + 8, oy + 9, 7, O); P.disc(ox + 8, oy + 9, 6, COL.leafD);
    P.disc(ox + 4, oy + 10, 3, COL.leafD); P.disc(ox + 12, oy + 10, 3, COL.leafD);
    P.px(ox + 3, oy + 12, COL.leafDD); P.px(ox + 12, oy + 12, COL.leafDD); P.px(ox + 8, oy + 12, COL.leafDD); P.px(ox + 10, oy + 11, COL.leafDD);
    // 中段
    P.disc(ox + 8, oy + 6, 6, O); P.disc(ox + 8, oy + 6, 5, COL.leaf);
    P.disc(ox + 4, oy + 7, 2, COL.leaf); P.disc(ox + 12, oy + 7, 2, COL.leaf);
    P.px(ox + 5, oy + 9, COL.leafD); P.px(ox + 11, oy + 9, COL.leafD); P.px(ox + 8, oy + 9, COL.leafD);
    // 上段・ハイライト
    P.disc(ox + 8, oy + 3, 4, O); P.disc(ox + 8, oy + 3, 3, COL.leafL);
    P.disc(ox + 6, oy + 2, 1, '#9ee283'); P.px(ox + 4, oy + 5, COL.leafL); P.px(ox + 3, oy + 8, COL.leafL); P.px(ox + 12, oy + 5, COL.leafL);
  }
  // 針葉樹（タイルいっぱい）
  function drawPine(P, ox = 0, oy = 0) {
    const O = COL.outline;
    P.hline(ox + 4, oy + 15, 8, COL.grassDD);
    P.rect(ox + 7, oy + 13, 2, 2, COL.trunkD);
    const tiers = [[13, 7], [10, 6], [7, 5], [4, 3]];
    for (const [ty, hw] of tiers) {
      P.hline(ox + 8 - hw - 1, oy + ty, hw * 2 + 2, O);
      for (let y = 1; y <= 3; y++) { const w = hw - (y - 1); P.hline(ox + 8 - w, oy + ty - y, w * 2, y === 1 ? COL.leafDD : (y === 3 ? COL.leafL : COL.leafD)); P.px(ox + 8 - w - 1, oy + ty - y, O); P.px(ox + 8 + w, oy + ty - y, O); }
    }
    P.px(ox + 8, oy + 0, O); P.px(ox + 7, oy + 0, O); P.hline(ox + 7, oy + 1, 2, COL.leafL);
    for (const [ty, hw] of tiers) P.px(ox + 8 - hw + 1, oy + ty - 2, COL.leafL);
  }

  const PAINT = {
    grass: () => paint(16, 16, P => grassBase(P, 11)),
    grass2: () => paint(16, 16, P => grassBase(P, 23)),
    flower: () => paint(16, 16, P => {
      grassBase(P, 31);
      const fl = (x, y, c) => { P.px(x, y, c); P.px(x + 1, y, c); P.px(x, y + 1, c); P.px(x + 1, y + 1, c); P.px(x, y + 2, COL.grassD); };
      fl(3, 3, COL.flowerW); fl(10, 6, COL.flowerY); fl(5, 10, COL.flowerW); fl(12, 12, COL.flowerP);
      P.px(3, 3, COL.flowerY); P.px(10, 6, COL.white);
    }),
    tall: () => paint(16, 16, P => {
      grassBase(P, 41);
      for (let y = 1; y < 16; y += 4) for (let x = (y % 8 === 1 ? 1 : 3); x < 16; x += 4) {
        P.px(x, y + 2, COL.grassDD); P.px(x + 1, y + 1, COL.grassDD); P.px(x + 1, y + 2, COL.grassD); P.px(x + 2, y, COL.leafL); P.px(x + 2, y + 1, COL.grassDD); P.px(x + 2, y + 2, COL.grassDD);
      }
    }),
    path: () => paint(16, 16, P => {
      const r = rng(51);
      P.rect(0, 0, 16, 16, COL.path);
      for (let i = 0; i < 12; i++) P.px(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.5 ? COL.pathD : COL.pathL);
    }),
    water: () => paint(16, 16, P => {
      const r = rng(61);
      P.rect(0, 0, 16, 16, COL.water);
      for (let i = 0; i < 10; i++) P.px(Math.floor(r() * 16), Math.floor(r() * 16), COL.waterD);
      P.hline(2, 3, 4, COL.waterL); P.hline(9, 8, 4, COL.waterL); P.hline(4, 13, 3, COL.waterL); P.px(13, 2, COL.waterL);
    }),
    tree: () => paint(16, 16, P => { grassBase(P, 71); drawTree(P); }),
    pine: () => paint(16, 16, P => { grassBase(P, 73); drawPine(P); }),
    hedge: () => paint(16, 16, P => {
      grassBase(P, 81);
      P.rect(1, 3, 14, 10, COL.outline); P.rect(2, 4, 12, 8, COL.leafD);
      P.rect(2, 4, 12, 3, COL.leaf); P.hline(3, 4, 5, COL.leafL); P.px(9, 5, COL.leafL);
      P.px(4, 9, COL.leafDD); P.px(9, 10, COL.leafDD); P.px(12, 8, COL.leafDD);
      P.hline(2, 13, 12, COL.grassDD);
    }),
    // 白い柵（横方向）
    fence: () => paint(16, 16, P => {
      grassBase(P, 91);
      const O = COL.grayDD;
      for (const x of [2, 12]) { P.rect(x, 4, 3, 10, COL.white); P.vline(x + 2, 5, 9, COL.whiteD); P.px(x + 1, 3, COL.white); P.box(x - 1, 3, 5, 12, O); P.px(x + 1, 2, O); }
      P.rect(0, 6, 16, 2, COL.white); P.hline(0, 7, 16, COL.whiteD); P.hline(0, 5, 16, O); P.hline(0, 8, 16, O);
      P.rect(0, 10, 16, 2, COL.white); P.hline(0, 11, 16, COL.whiteD); P.hline(0, 9, 16, O); P.hline(0, 12, 16, O);
      for (const x of [2, 12]) { P.rect(x, 4, 3, 10, COL.white); P.vline(x + 2, 4, 10, COL.whiteD); P.vline(x - 1, 3, 12, O); P.vline(x + 3, 3, 12, O); P.hline(x, 14, 3, O); P.px(x + 1, 2, O); P.hline(x, 3, 3, COL.white); }
    }),
    lamp: () => paint(16, 16, P => {
      grassBase(P, 101);
      P.disc(8, 4, 4, COL.lampGlow); P.disc(8, 4, 3, COL.lampY);
      P.rect(6, 2, 4, 4, COL.grayDD); P.rect(7, 3, 2, 2, COL.lampY); P.px(7, 3, '#fff8d0');
      P.hline(5, 1, 6, COL.grayDD); P.px(8, 0, COL.grayDD);
      P.rect(7, 6, 2, 8, COL.grayD); P.vline(7, 6, 8, COL.grayDD);
      P.rect(5, 13, 6, 2, COL.grayD); P.hline(5, 14, 6, COL.grayDD); P.hline(4, 15, 8, COL.grassDD);
    }),
    sign: () => paint(16, 16, P => {
      grassBase(P, 111);
      P.rect(1, 2, 14, 8, COL.woodD); P.rect(2, 3, 12, 6, COL.wood); P.rect(2, 3, 12, 1, COL.woodL);
      P.hline(4, 5, 5, COL.woodD); P.hline(4, 7, 7, COL.woodD);
      P.rect(7, 10, 2, 4, COL.woodD); P.rect(6, 14, 4, 1, COL.woodD); P.hline(5, 15, 6, COL.grassDD);
    }),
    // 石の看板（2タイル幅の左右）
    stone_l: () => paint(16, 16, P => {
      grassBase(P, 113);
      P.rect(2, 3, 14, 10, COL.grayDD); P.rect(3, 4, 13, 8, COL.gray); P.rect(3, 4, 13, 1, COL.grayL); P.vline(3, 4, 8, COL.grayL);
      P.hline(6, 6, 9, COL.grayDD); P.hline(6, 9, 7, COL.grayDD); P.hline(3, 13, 13, COL.grassDD);
    }),
    stone_r: () => paint(16, 16, P => {
      grassBase(P, 114);
      P.rect(0, 3, 14, 10, COL.grayDD); P.rect(0, 4, 13, 8, COL.gray); P.rect(0, 4, 13, 1, COL.grayL);
      P.hline(0, 6, 8, COL.grayDD); P.hline(0, 9, 10, COL.grayDD); P.vline(12, 4, 8, COL.grayD); P.hline(0, 13, 13, COL.grassDD);
    }),
    bridge: () => paint(16, 16, P => {
      P.rect(0, 0, 16, 16, COL.wood);
      for (let y = 0; y < 16; y += 4) { P.hline(0, y, 16, COL.woodD); P.hline(0, y + 1, 16, COL.woodL); }
      P.vline(0, 0, 16, COL.woodD); P.vline(15, 0, 16, COL.woodD);
    }),
    // ---- 家 ----
    roof: () => paint(16, 16, P => {
      P.rect(0, 0, 16, 16, COL.roof);
      for (let y = 0; y < 16; y += 4) { P.hline(0, y, 16, COL.roofD); P.hline(0, y + 1, 16, COL.roofL); for (let x = (y % 8 ? 4 : 0); x < 16; x += 8) P.vline(x, y + 1, 3, COL.roofD); }
    }),
    roof_edge: () => paint(16, 16, P => {
      grassBase(P, 121);
      P.rect(0, 4, 16, 12, COL.roof);
      for (let y = 4; y < 16; y += 4) { P.hline(0, y, 16, COL.roofD); P.hline(0, y + 1, 16, COL.roofL); for (let x = (y % 8 ? 4 : 0); x < 16; x += 8) P.vline(x, y + 1, 3, COL.roofD); }
      P.hline(0, 3, 16, COL.outline);
    }),
    wall: () => paint(16, 16, P => {
      P.rect(0, 0, 16, 16, COL.wall);
      P.hline(0, 0, 16, COL.roofD); P.hline(0, 1, 16, COL.wallD);
      for (let y = 4; y < 16; y += 4) P.hline(0, y, 16, COL.wallD);
      P.hline(0, 14, 16, COL.wallD); P.hline(0, 15, 16, COL.grayDD);
    }),
    window: () => paint(16, 16, P => {
      P.rect(0, 0, 16, 16, COL.wall);
      P.hline(0, 0, 16, COL.roofD); P.hline(0, 1, 16, COL.wallD);
      P.rect(3, 4, 10, 9, COL.grayDD); P.rect(4, 5, 8, 7, COL.glass); P.rect(4, 5, 3, 3, COL.glassL); P.vline(8, 5, 7, COL.grayDD); P.hline(4, 8, 8, COL.grayDD);
      P.rect(2, 13, 12, 1, COL.grayD);
      P.hline(0, 15, 16, COL.grayDD);
    }),
    door: () => paint(16, 16, P => {
      P.rect(0, 0, 16, 16, COL.wall);
      P.hline(0, 0, 16, COL.roofD); P.hline(0, 1, 16, COL.wallD);
      P.rect(3, 3, 10, 13, COL.woodD); P.rect(4, 4, 8, 12, COL.wood); P.rect(5, 5, 6, 4, COL.woodL); P.rect(5, 10, 6, 5, COL.woodL);
      P.px(10, 10, COL.lampY);
      P.hline(0, 15, 16, COL.grayDD);
    }),
    // ---- 研究所（6x4 タイル = 96x64）----
    lab: () => paint(96, 64, P => {
      const O = COL.grayDD, W = 96;
      // 屋上・後ろの建物
      P.rect(8, 0, 80, 16, COL.grayD); P.rect(8, 0, 80, 2, COL.grayL); P.box(8, 0, 80, 16, O);
      P.rect(14, 3, 10, 10, O); P.rect(15, 4, 8, 8, COL.gray); P.hline(16, 6, 6, O); P.hline(16, 9, 6, O); P.rect(17, 5, 2, 1, COL.glass);
      P.disc(76, 7, 6, O); P.disc(76, 7, 5, COL.white); P.disc(75, 6, 2, COL.grayL); P.rect(75, 12, 3, 4, O);
      P.rect(64, 6, 6, 8, O); P.rect(65, 7, 4, 6, COL.gray);
      // 本体
      P.rect(0, 16, W, 40, COL.gray); P.rect(0, 16, W, 2, COL.grayL); P.box(0, 16, W, 40, O);
      // 中央の張り出し
      P.rect(30, 8, 36, 50, COL.grayL); P.box(30, 8, 36, 50, O); P.rect(31, 9, 34, 3, COL.white); P.hline(31, 12, 34, COL.grayD);
      // ロゴ G と文字ライン
      P.ring(48, 22, 4, COL.grayDD); P.rect(48, 21, 4, 2, COL.grayL); P.rect(49, 22, 3, 2, COL.grayDD); P.px(52, 22, COL.grayDD);
      P.hline(38, 31, 20, COL.grayDD); P.hline(40, 33, 16, COL.grayDD);
      // 左右の窓
      for (const x of [5, 77]) { P.rect(x, 22, 14, 12, O); P.rect(x + 1, 23, 12, 10, COL.glass); P.rect(x + 1, 23, 5, 4, COL.glassL); P.vline(x + 7, 23, 10, O); P.hline(x + 1, 28, 12, O); }
      // 文字パネル
      for (const x of [20, 69]) for (let y = 24; y < 40; y += 3) P.hline(x, y, 7, COL.grayDD);
      // 入口（ガラスの両開き・2マス幅）
      P.rect(36, 36, 24, 18, O); P.rect(37, 37, 22, 16, COL.glass); P.rect(37, 37, 9, 6, COL.glassL); P.vline(47, 37, 16, O); P.vline(48, 37, 16, O); P.px(46, 45, COL.white); P.px(49, 45, COL.white);
      P.rect(33, 33, 30, 3, COL.white); P.hline(33, 36, 30, O);
      // 植え込み
      for (const x of [24, 66]) { P.rect(x, 44, 6, 8, O); P.rect(x + 1, 45, 4, 6, COL.leaf); P.px(x + 2, 45, COL.leafL); P.px(x + 3, 49, COL.leafD); }
      // 階段・タイル床
      P.rect(28, 56, 40, 8, COL.grayL); P.hline(28, 56, 40, COL.white); P.hline(28, 60, 40, COL.grayD); P.box(28, 56, 40, 8, O);
      for (let x = 32; x < 64; x += 8) P.vline(x, 57, 6, COL.grayD);
      // 落ち影
      P.rect(0, 56, 28, 2, COL.grayD); P.rect(68, 56, 28, 2, COL.grayD);
      P.rect(0, 58, 28, 6, '#4aa33a'); P.rect(68, 58, 28, 6, '#4aa33a');
    }),
  };

  // ---- 生成タイル（屋内）----
  function genTile(kind) {
    const r = rng({ floor: 66, wallin: 77, carpet: 88 }[kind] || 1);
    const rows = [];
    for (let y = 0; y < 16; y++) {
      let row = '';
      for (let x = 0; x < 16; x++) {
        let ch; const v = r();
        switch (kind) {
          case 'floor': ch = (y % 4 === 3) ? 'B' : ((x % 8 === 7 && (y >> 2) % 2 === 0) || (x % 8 === 3 && (y >> 2) % 2 === 1)) ? 'B' : (v < 0.08 ? 'B' : 'j'); break;
          case 'wallin': ch = y < 12 ? (v < 0.05 ? 'E' : 'e') : (y === 12 ? 'D' : 'K'); break;
          case 'carpet': ch = (x === 0 || x === 15 || y === 0 || y === 15) ? 'R' : ((x + y) % 5 === 0 ? 'o' : 'r'); break;
          default: ch = 'g';
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
      let c;
      if (ART[name]) c = build(ART[name], scale, flip);
      else if (PAINT[name]) { c = PAINT[name](); if (scale !== 1 || flip) { const s = document.createElement('canvas'); s.width = c.width * scale; s.height = c.height * scale; const g = s.getContext('2d'); g.imageSmoothingEnabled = false; if (flip) { g.translate(s.width, 0); g.scale(-1, 1); } g.drawImage(c, 0, 0, s.width, s.height); c = s; } }
      else c = build(genTile(name), scale, flip);
      cache.set(key, c);
    }
    return cache.get(key);
  }

  const ART = {
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
    ball: [ // テーブルの上のボール（透明背景）
      '                ', '                ', '      ####      ', '     #eeee#     ',
      '    #eeUeee#    ', '    #eeeeee#    ', '    #eEeeEe#    ', '    #eeeeee#    ',
      '    #EeEeEE#    ', '     #EEEE#     ', '      ####      ', '                ',
      '                ', '                ', '                ', '                ',
    ],
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
    npc_prof: [ // オクムラ博士（白衣・白髪）
      '     eeeeee     ', '    eeeeeeee    ', '   eeEeeeeeEe   ', '   eessssssee   ',
      '   ess#ss#sse   ', '    ssssssss    ', '    sSSSSSSs    ', '   #eeeeeeee#   ',
      '  seeeCCCCeees  ', '  seeeCyyCeees  ', '  seeeCCCCeees  ', '   eeeeeeeeee   ',
      '    nnnnnnnn    ', '    nnn  nnn    ', '    aaa  aaa    ', '   AAA    AAA   ',
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
    m_amepiyo: [ // アメピヨ：雨×ゴルフボール×アヒル
      '            xx          ', '           xwwx         ', '           xwwx         ', '            ww          ',
      '        ########        ', '       #zzzzzzzz#       ', '      #zz#zzzz#zz#      ', '      #zzzzzzzzzz#      ',
      '      #zzzzzzzzzz#      ', '     #zzzOOOOzzzzz#     ', '     #zzzOOOOzzzzz#     ', '      #zzzzzzzzzz#      ',
      '     #zzzzzzzzzzzz#     ', '    #zzzeEEezzeEEez#    ', '    #zzeEeEEeeEeEEe#    ', '    #zzeEEEEeeEEEEe#    ',
      '    #zzzeEEezzeEEez#    ', '    #ZzzzzzzzzzzzzZ#    ', '     #ZZzzzzzzzzZZ#     ', '      #ZZZZZZZZZZ#      ',
      '       ###OO#OO##       ', '         OOO OOO        ', '        OOO   OOO       ', '                        ',
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

  return { get, ART, PAINT, build, paint };
})();
