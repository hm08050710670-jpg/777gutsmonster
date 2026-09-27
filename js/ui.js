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
  function promptName(cb, defaultName = '') {
    const ov = document.getElementById('name-overlay');
    const input = document.getElementById('name-input');
    const ok = document.getElementById('name-ok');
    input.value = defaultName;
    ov.hidden = false;
    setTimeout(() => input.focus(), 50);
    const done = () => {
      const v = [...input.value.trim()].slice(0, 8).join('');
      if (!v) { input.focus(); return; }
      ov.hidden = true;
      ok.onclick = null; input.onkeydown = null;
      cb(v);
    };
    ok.onclick = done;
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); done(); } e.stopPropagation(); };
    input.onkeyup = e => e.stopPropagation();
  }

  return { setNote, refreshNote, flashSaved, promptName };
})();
