// ============================================================
// 戦闘背景（assets/bg/*.png 192×152）
//   Bg.get(name) → Image | null   Bg.pick(mapId) → 場所と時刻から背景名を決める
// ============================================================
const Bg = (() => {
  const NAMES = ['fairway', 'rough', 'pond', 'bunker', 'sunset'];
  const imgs = {};
  let ready = false;

  async function load() {
    const src = CONFIG.BG_IMAGES || {};
    await Promise.all([...NAMES, 'title'].map(n => new Promise(res => {   // title はタイトル画面の絵（戦闘背景の一覧には入れない）
      const img = new Image();
      img.onload = () => { imgs[n] = img; res(); };
      img.onerror = () => { console.warn('背景の読込に失敗', n); res(); };
      img.src = src[n] || `assets/bg/${n}.png`;
    })));
    ready = Object.keys(imgs).length > 0;
  }

  const get = name => imgs[name] || null;
  const has = name => !!imgs[name];

  // 夕方〜夜（17時〜翌5時）は屋外なら夕焼け背景
  const isEvening = () => { const h = new Date().getHours(); return h >= 17 || h < 5; };

  function pick(mapId, opt = {}) {
    const m = DATA.MAPS[mapId];
    const base = (m && m.battleBg) || 'fairway';
    if (opt.random) return NAMES[Game.rand(0, NAMES.length - 1)];
    if (base !== 'bunker' && base !== 'pond' && isEvening()) return 'sunset';
    return base;
  }

  return { load, get, has, pick, NAMES, isReady: () => ready };
})();
