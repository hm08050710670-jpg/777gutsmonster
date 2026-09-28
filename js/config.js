// ============================================================
// 基本設定
// ============================================================
const CONFIG = {
  W: 192,            // フィールド内部解像度（屋外16マス）
  H: 208,            // 屋外 約17マス
  TILE: 12,          // 屋外1マス（論理px）。素材は24pxで2倍描画
  TILE_INDOOR: 16,   // 屋内は旧描画のため16のまま（屋内素材が来たら12に統一）
  FPS: 60,
  WALK_FRAMES: 8,
  TEXT_SPEED: 2,
  ENCOUNTER_RATE: 12,
  GRACE_STEPS: 4,    // 戦闘直後はこの歩数だけ遭遇しない
  SAVE_KEY: 'guts-monsters-save-v1',
  FONT: 'DotGothic16',
  FONT_FILE: 'assets/fonts/DotGothic16-Regular.ttf',
  RENDER_SCALE: 2,   // 内部描画を2倍解像度にして文字を読みやすくする
  TITLE: 'GUTS MONSTERS',
  TAGLINE: 'A LITTLE STEP, A BIG ADVENTURE.',
};

// UI配色（会話窓：アイボリー地・深緑枠）
const THEME = {
  ivory: '#f6f0dc',
  ivory2: '#ebe3c8',
  green: '#2f5d3a',
  greenDark: '#1d3d26',
  text: '#23301f',
  textDim: '#7c8a72',
  hpHigh: '#4caf50', hpMid: '#e5b83c', hpLow: '#d9534f',
  shadow: 'rgba(0,0,0,0.25)',
};
