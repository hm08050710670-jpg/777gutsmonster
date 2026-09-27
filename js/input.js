// ============================================================
// 入力：キーボード + 仮想パッド（タッチ/マウス）
//   Input.down(key)    押されている
//   Input.pressed(key) このフレームで押された
//   key: up/down/left/right/a/b/start/select
// ============================================================
const Input = (() => {
  const state = {};
  const prev = {};
  const KEYS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
  KEYS.forEach(k => { state[k] = false; prev[k] = false; });

  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'a', KeyX: 'b', Enter: 'start', ShiftRight: 'select', ShiftLeft: 'select',
    Space: 'a', Escape: 'b',
  };

  window.addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (k) { state[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const k = KEYMAP[e.code];
    if (k) { state[k] = false; e.preventDefault(); }
  });

  // 仮想パッド：ポインタイベントで、ボタン間をスライドしても追従させる
  function setupPad() {
    const btns = Array.from(document.querySelectorAll('.pbtn'));
    const active = new Map(); // pointerId -> key
    const setKey = (k, v) => {
      state[k] = v;
      const el = btns.find(b => b.dataset.key === k);
      if (el) el.classList.toggle('active', v);
    };
    const keyAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && el.classList && el.classList.contains('pbtn') ? el.dataset.key : null;
    };
    const pad = document.getElementById('pad');
    pad.addEventListener('pointerdown', e => {
      e.preventDefault();
      const k = keyAt(e.clientX, e.clientY);
      if (k) { active.set(e.pointerId, k); setKey(k, true); }
    });
    pad.addEventListener('pointermove', e => {
      if (!active.has(e.pointerId)) return;
      const k = keyAt(e.clientX, e.clientY);
      const cur = active.get(e.pointerId);
      if (k !== cur) {
        if (cur) setKey(cur, false);
        if (k) setKey(k, true);
        active.set(e.pointerId, k);
      }
    });
    const release = e => {
      const cur = active.get(e.pointerId);
      if (cur) setKey(cur, false);
      active.delete(e.pointerId);
    };
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
    pad.addEventListener('pointerleave', release);
    // 長押しメニュー・ダブルタップズームの抑止
    pad.addEventListener('contextmenu', e => e.preventDefault());
  }

  function update() { KEYS.forEach(k => { prev[k] = state[k]; }); }
  // update() は「フレームの最後」に呼ぶ。pressed は前フレームとの差分。
  return {
    setupPad, update,
    down: k => !!state[k],
    pressed: k => state[k] && !prev[k],
    KEYS,
  };
})();
