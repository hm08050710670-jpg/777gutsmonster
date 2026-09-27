// ============================================================
// BGM（Web Audio API：ループ再生・切替時のフェード・iOSのアンロック対応）
//   Sound.play('town') / Sound.stop() / Sound.setEnabled(bool)
//   トラック定義は DATA.BGM（data.js）
// ============================================================
const Sound = (() => {
  let ctx = null, gain = null;
  let buffers = {};        // name -> AudioBuffer
  let loading = {};        // name -> Promise
  let current = null;      // { name, src, gain }
  let wanted = null;       // アンロック前に要求された曲
  let enabled = true;
  let unlocked = false;
  const FADE = 0.4;

  function readEnabled() {
    const st = Game.state;
    return st && st.settings ? st.settings.bgm !== false : enabled;
  }

  // iOS: 最初のタップ/キー操作の中で AudioContext を作る
  function unlock() {
    if (unlocked) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      gain = ctx.createGain(); gain.gain.value = 0.7; gain.connect(ctx.destination);
      unlocked = true;
      ctx.resume();
      // 全曲を先読み
      Object.keys(DATA.BGM || {}).forEach(load);
      if (wanted) { const w = wanted; wanted = null; play(w); }
    } catch (e) { console.warn('AudioContext 作成失敗', e); }
  }
  function installUnlock() {
    const h = () => { unlock(); };
    ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, h, { passive: true }));
  }

  // data: URI でも通常URLでも読み込める
  async function fetchBytes(url) {
    if (url.startsWith('data:')) {
      const b64 = url.slice(url.indexOf(',') + 1);
      const bin = atob(b64); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr.buffer;
    }
    const r = await fetch(url); return await r.arrayBuffer();
  }
  function load(name) {
    if (buffers[name] || loading[name] || !ctx) return loading[name];
    const url = DATA.BGM[name]; if (!url) return null;
    loading[name] = fetchBytes(url)
      .then(bytes => new Promise((res, rej) => ctx.decodeAudioData(bytes, res, rej)))
      .then(buf => { buffers[name] = buf; if (current && current.name === name && !current.src) start(name); })
      .catch(e => { console.warn('BGM 読込失敗', name, e); delete loading[name]; });
    return loading[name];
  }

  function start(name) {
    const buf = buffers[name]; if (!buf || !ctx) return;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE); g.connect(gain);
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(g); src.start();
    current.src = src; current.gain = g;
  }
  function fadeOut(cur) {
    if (!cur || !cur.src) return;
    const t = ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t); cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
    cur.gain.gain.linearRampToValueAtTime(0, t + FADE);
    const s = cur.src; setTimeout(() => { try { s.stop(); } catch (e) {} }, FADE * 1000 + 50);
  }

  function play(name) {
    if (!name) { stop(); return; }
    if (!readEnabled()) { wanted = name; return; }
    if (!unlocked) { wanted = name; return; }
    if (current && current.name === name) return;
    if (current) fadeOut(current);
    current = { name, src: null, gain: null };
    if (buffers[name]) start(name); else load(name);
  }
  function stop() {
    wanted = null;
    if (current) { fadeOut(current); current = null; }
  }
  function setEnabled(v) {
    enabled = v;
    if (!v) { const keep = current ? current.name : wanted; stop(); wanted = keep; }
    else if (wanted) { const w = wanted; wanted = null; play(w); }
  }
  const currentName = () => (current ? current.name : null);
  const status = () => ({ unlocked, ctx: ctx ? ctx.state : null, current: currentName(), wanted, loaded: Object.keys(buffers) });

  return { installUnlock, unlock, play, stop, setEnabled, currentName, status };
})();
