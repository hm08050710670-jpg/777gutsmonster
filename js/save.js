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
        // 使わなくなったモンスターは手持ちから外す（空になったらコケガメ Lv7 を入れる）
        st.party = st.party.filter(m => DATA.MONSTERS[m.id]);
        if (!st.party.length && st.flags && st.flags.starter) st.party.push(makeMonster('kokegame', 7));
        if (st.hp == null) st.hp = st.party.reduce((n, m) => n + (m.hp ?? m.maxHp), 0);   // 旧セーブ：個別HPの合計を共通HPに
      }
      return st;
    } catch (e) { return null; }
  },
  store(state) {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(state)); return true; }
    catch (e) { console.warn('セーブ失敗', e); return false; }
  },
  clear() { try { localStorage.removeItem(CONFIG.SAVE_KEY); } catch (e) {} },
  // ---- セーブコード：端末のデータが消えても戻せるように、文字列にして持ち出す／読み戻す ----
  //   形式 "GM1." + base64(UTF-8 JSON) + "." + 簡易チェック（壊れた貼り付けを弾く）
  sum(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h.toString(36); },
  encode(state) { const b = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); return `GM1.${b}.${Save.sum(b)}`; },
  decode(code) {
    try {
      const m = String(code || '').trim().match(/^GM1\.([A-Za-z0-9+/=]+)\.([a-z0-9]+)$/); if (!m || Save.sum(m[1]) !== m[2]) return null;
      const st = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      return st && st.party && st.map ? st : null;
    } catch (e) { return null; }
  },
  // オートセーブ：成功したら画面下の補助表示に知らせる
  auto(state) {
    if (Save.store(state)) UI.flashSaved();
  },
};
