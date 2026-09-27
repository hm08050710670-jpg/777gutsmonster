// ============================================================
// セーブ／ロード（localStorage）＋ オートセーブ
// ============================================================
const Save = {
  newGame(name, gender) {
    return {
      name: name || 'ガッツ', gender: gender || 'm',
      map: 'home', x: 4, y: 4, dir: 'down',
      party: [],
      items: { 'きずぐすり': 2 },
      flags: {},
      steps: 0, grace: 0,
      settings: { textSpeed: 2, bgm: true },
    };
  },
  exists() { try { return !!localStorage.getItem(CONFIG.SAVE_KEY); } catch (e) { return false; } },
  load() { try { return JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)); } catch (e) { return null; } },
  store(state) {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(state)); return true; }
    catch (e) { console.warn('セーブ失敗', e); return false; }
  },
  clear() { try { localStorage.removeItem(CONFIG.SAVE_KEY); } catch (e) {} },
  // オートセーブ：成功したら画面下の補助表示に知らせる
  auto(state) {
    if (Save.store(state)) UI.flashSaved();
  },
};
