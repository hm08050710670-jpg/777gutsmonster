// ============================================================
// HTML側のUI（ADVENTURE NOTE・オートセーブ表示・名前入力）
// ============================================================
const UI = (() => {
  const noteText = () => document.getElementById('note-text');
  const saved = () => document.getElementById('saved');
  let savedTimer = 0;

  function setNote(text) { const el = noteText(); if (el && el.textContent !== text) el.textContent = text; }

  // フラグから現在の目的を求めて表示
  function refreshNote(state) {
    if (!state) { setNote(''); return; }
    const n = DATA.NOTES.find(n => !n.flag || state.flags[n.flag]);
    setNote(n ? n.text : '');
  }

  function flashSaved() {
    const el = saved(); if (!el) return;
    el.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  // 名前入力（HTMLオーバーレイ）。cb(name)
  return { setNote, refreshNote, flashSaved };
})();
