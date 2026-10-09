// ============================================================
// ゲーム本体：ループ・シーンスタック・画面スケーリング
// ============================================================
const Game = (() => {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  let RS = 0;
  let viewH = CONFIG.H;   // 画面に見せる高さ（論理px）。戦闘中は 154 に縮めて下を隠す
  let curScale = 1;
  // 内部解像度：表示倍率×端末のピクセル密度に合わせる（iPhoneなら 2×3=6倍）。文字が実ピクセルで描かれてくっきりする
  function setRenderScale(rs, force) {
    rs = Math.max(2, Math.min(6, Math.round(rs)));
    if (rs === RS && !force) return;
    RS = rs;
    canvas.width = CONFIG.W * RS; canvas.height = CONFIG.H * RS;
    ctx.setTransform(RS, 0, 0, RS, 0, 0);   // 以降の座標は 192x208 のまま
    ctx.imageSmoothingEnabled = false;
  }
  setRenderScale(CONFIG.RENDER_SCALE || 2);

  const scenes = [];
  let frame = 0;
  let state = null;

  // 実際に見えている高さ。アプリ内ブラウザ（Claude など）は画面全体の高さを返しながら上部をネイティブの見出しで隠すことがあるので、
  //   「全画面でないのに画面の全高と同じ」ときは、見出しぶん（安全域の上 ＋ 約72px）を差し引く
  //   その場合は #app の高さも見えている分に固定して、下に寄せた操作パッドが隠れないようにする
  function visibleHeight(app) {
    const vis = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    let h = Math.min(document.documentElement.clientHeight || vis, vis);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    let hidden = 0;
    // iOS のアプリ内ブラウザ（WKWebView）は UA に "Safari/" が付かない。Safari 本体や全画面なら申告値を信用する
    const ua = navigator.userAgent, inAppIOS = /iPhone|iPad|iPod/.test(ua) && (!/Safari\//.test(ua) || /\bLine\//.test(ua));   // LINE のブラウザは UA に Safari/ が付くが WKWebView
    if (!standalone && ((screen.height && window.innerHeight >= screen.height - 4) || inAppIOS)) {
      const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden'; document.body.appendChild(probe);
      const sat = probe.offsetHeight; probe.remove();
      hidden = sat + 72;
      h -= hidden;
    }
    // #app の高さは常にこの値に固定する。ブラウザが報告する高さ（100dvh・innerHeight・visualViewport）が食い違う端末があり、
    //   レイアウト上の箱が見えている範囲より大きいと、下に寄せた操作パッドが画面外に出てしまうため
    if (app) { app.style.boxSizing = 'border-box'; app.style.height = h + 'px'; }
    return h;
  }
  // ---- スケーリング：端末幅に合わせて拡大。縦に余る端末では画面の高さ（CONFIG.H）を 208〜272 の範囲で広げて、フィールドをより広く見せる ----
  const H_BASE = 208, H_MAX = 272;
  function fit() {
    const app = document.getElementById('app');
    const landscape = matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    const auxH = landscape ? 0 : 18;
    const padMin = landscape ? 0 : (parseFloat(getComputedStyle(document.getElementById('pad')).minHeight) || 250);
    const availW = landscape ? Math.floor(app.clientWidth * 0.5) : app.clientWidth;
    const availH = visibleHeight(app) - auxH - padMin - 8;
    // 横幅いっぱいに拡大する（整数倍にはしない。端末によってドットの太さは少し不揃いになるが、左右に黒い帯を残さない）
    let scale = Math.max(1, Math.min(availW / CONFIG.W, availH / H_BASE));
    const h = Math.max(H_BASE, Math.min(H_MAX, Math.floor(availH / scale)));
    const hChanged = h !== CONFIG.H;
    if (hChanged) { if (viewH === CONFIG.H) viewH = h; CONFIG.H = h; }
    canvas.style.width = Math.floor(CONFIG.W * scale) + 'px';
    canvas.style.height = Math.floor(CONFIG.H * scale) + 'px';
    curScale = scale;
    applyViewH();
    setRenderScale(scale * (window.devicePixelRatio || 1), hChanged);
  }
  function applyViewH() {
    const wrap = document.getElementById('screen-wrap');
    wrap.style.height = Math.floor(viewH * curScale) + 'px';
    wrap.style.overflow = 'hidden';
    wrap.style.alignItems = 'flex-start';
  }
  function setViewH(h) { if (h === viewH) return; viewH = h; applyViewH(); }
  window.addEventListener('resize', fit);
  // キーボードの開閉やアプリ内ブラウザのバーの出入りで見えている範囲が変わったら組み直す。
  // ページがスクロールされたまま（キーボードを閉じた後など）だと上が切れて見えるので、常に先頭に戻す
  const unscroll = () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); };
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', () => { unscroll(); fit(); }); window.visualViewport.addEventListener('scroll', unscroll); }
  window.addEventListener('scroll', unscroll);
  window.addEventListener('orientationchange', () => setTimeout(fit, 150));

  const push = s => { scenes.push(s); s.enter && s.enter(); };
  const pop = () => { const s = scenes.pop(); s && s.exit && s.exit(); };
  const replace = s => { while (scenes.length) pop(); push(s); };
  const top = () => scenes[scenes.length - 1];

  function update() {
    const s = top();
    if (s) s.update(frame);
    if (typeof Puzzle !== 'undefined') Puzzle.sync(scenes);
    Input.update();
    frame++;
  }

  function draw() {
    let i = scenes.length - 1;
    while (i > 0 && scenes[i].overlay) i--;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
    for (; i < scenes.length; i++) scenes[i].draw(ctx, frame);
    syncNote();
  }
  // ADVENTURE NOTE は画面の上端に重ねているので、フィールド（と、その上の会話ウィンドウ）のときだけ見せる。タイトルやメニューでは隠す
  const noteEl = document.getElementById('note');
  function syncNote() {
    const s = top(), under = scenes[scenes.length - 2];
    const show = (typeof FieldScene !== 'undefined') && (s instanceof FieldScene || (s instanceof DialogScene && under instanceof FieldScene));
    if (noteEl.hidden === show) noteEl.hidden = !show;
  }

  let last = 0, acc = 0;
  const STEP = 1000 / CONFIG.FPS;
  function loop(t) {
    acc += Math.min(100, t - last); last = t;
    while (acc >= STEP) { update(); acc -= STEP; }
    draw();
    requestAnimationFrame(loop);
  }

  async function start() {
    fit();
    Input.setupPad();
    Sound.installUnlock();
    await Promise.all([Text.load(), Mon.load(), Bg.load(), Tiles.load(), FieldScene.preloadMapImages()]);
    fit();
    push(new TitleScene());
    requestAnimationFrame(t => { last = t; loop(t); });
  }

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const setFlag = (k, v = true) => { if (state) { state.flags[k] = v; UI.refreshNote(state); } };

  return {
    start, push, pop, replace, top, fit, setViewH, visibleHeight, rand, setFlag, get scale() { return curScale; }, get viewH() { return viewH; },
    get state() { return state; },
    set state(v) { state = v; UI.refreshNote(v); },
  };
})();

window.addEventListener('load', () => Game.start());
