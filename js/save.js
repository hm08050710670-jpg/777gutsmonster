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
  load() {
    try {
      const st = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY));
      if (st && st.party) {  // 旧IDの移行（御三家の入れ替え）
        const MIG = { shibamog: 'kokegame', hinokapi: 'hinoshishi' };
        st.party.forEach(m => { if (MIG[m.id]) { m.id = MIG[m.id]; m.name = DATA.MONSTERS[m.id].name; m.type = DATA.MONSTERS[m.id].type; } });
      }
      return st;
    } catch (e) { return null; }
  },
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
