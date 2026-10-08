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
  // 名前入力（iPhoneのキーボード）。キーボードを確実に出すため、フォーカスはユーザー操作のイベント内（指を離した瞬間）でも試みる（Input 側が pendingFocus を見る）
  let pendingFocus = null;
  function promptName(cb, opt = {}) {
    const ov = document.getElementById('name-overlay'), input = document.getElementById('name-input');
    const ok = document.getElementById('name-ok'), cancel = document.getElementById('name-cancel'), title = document.getElementById('name-title');
    title.textContent = opt.title || 'なまえを いれてね';
    input.value = opt.defaultName || '';
    cancel.hidden = !opt.onCancel;
    ov.hidden = false;
    pendingFocus = input;
    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { /* noop */ } }, 30);
    const close = () => { ov.hidden = true; pendingFocus = null; ok.onclick = null; cancel.onclick = null; input.onkeydown = null; input.blur(); setTimeout(() => { window.scrollTo(0, 0); Game.fit && Game.fit(); }, 50); };   // キーボードで動いたページ位置を戻す
    const done = () => {
      const v = [...input.value.trim()].slice(0, 8).join('');
      if (!v) { input.focus(); input.placeholder = 'なまえを いれてね'; return; }
      close(); cb(v);
    };
    ok.onclick = done;
    cancel.onclick = () => { close(); opt.onCancel && opt.onCancel(); };
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); done(); } };
  }
  function focusPending() { if (!pendingFocus) return; const el = pendingFocus; pendingFocus = null; try { el.focus({ preventScroll: true }); } catch (e) { /* noop */ } }
  return { promptName, focusPending, setNote, refreshNote, flashSaved };
})();
