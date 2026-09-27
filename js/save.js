// ============================================================
// セーブ／ロード（localStorage）
// ============================================================
const Save = {
  newGame() {
    return {
      map: 'town',
      x: DATA.MAPS.town.start.x, y: DATA.MAPS.town.start.y, dir: DATA.MAPS.town.start.dir,
      party: [makeMonster('kokedama', 5)],
      items: { 'きずぐすり': 2 },
      steps: 0,
    };
  },
  exists() { return !!localStorage.getItem(CONFIG.SAVE_KEY); },
  load() {
    try { return JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)); }
    catch (e) { return null; }
  },
  store(state) {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(state)); return true; }
    catch (e) { console.warn('セーブ失敗', e); return false; }
  },
};
