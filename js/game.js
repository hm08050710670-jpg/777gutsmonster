// ============================================================
// ゲーム本体：ループ・シーンスタック・画面スケーリング
// ============================================================
const Game = (() => {
  const canvas = document.getElementById('screen');
  const RS = CONFIG.RENDER_SCALE || 1;
  canvas.width = CONFIG.W * RS; canvas.height = CONFIG.H * RS;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(RS, 0, 0, RS, 0, 0);   // 以降の座標は 192x208 のまま
  ctx.imageSmoothingEnabled = false;

  const scenes = [];
  let frame = 0;
  let state = null;

  // ---- スケーリング：端末幅に合わせて拡大（高DPI端末では小数倍でも十分きれい）----
  function fit() {
    const app = document.getElementById('app');
    const landscape = matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    const noteH = landscape ? 0 : (document.getElementById('note').offsetHeight + 10);
    const auxH = landscape ? 0 : 18;
    const padMin = landscape ? 0 : 140;
    const availW = landscape ? Math.floor(app.clientWidth * 0.5) : app.clientWidth;
    const availH = app.clientHeight - noteH - auxH - padMin - 4;
    let scale = Math.min(availW / CONFIG.W, availH / CONFIG.H);
    // 2倍以上なら整数に丸めてドットを揃える。それ未満は小数倍を許容（1倍だと小さすぎる）
    if (scale >= 2) scale = Math.floor(scale);
    scale = Math.max(1, scale);
    canvas.style.width = Math.floor(CONFIG.W * scale) + 'px';
    canvas.style.height = Math.floor(CONFIG.H * scale) + 'px';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 150));

  const push = s => { scenes.push(s); s.enter && s.enter(); };
  const pop = () => { const s = scenes.pop(); s && s.exit && s.exit(); };
  const replace = s => { while (scenes.length) pop(); push(s); };
  const top = () => scenes[scenes.length - 1];

  function update() {
    const s = top();
    if (s) s.update(frame);
    Input.update();
    frame++;
  }

  function draw() {
    let i = scenes.length - 1;
    while (i > 0 && scenes[i].overlay) i--;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
    for (; i < scenes.length; i++) scenes[i].draw(ctx, frame);
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
    await Promise.all([Text.load(), Atlas.load()]);
    MapImages.preload(Object.values(DATA.MAPS).filter(m => m.image).map(m => m.image));
    fit();
    push(new TitleScene());
    requestAnimationFrame(t => { last = t; loop(t); });
  }

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const setFlag = (k, v = true) => { if (state) { state.flags[k] = v; UI.refreshNote(state); } };

  return {
    start, push, pop, replace, top, fit, rand, setFlag,
    get state() { return state; },
    set state(v) { state = v; UI.refreshNote(v); },
  };
})();

window.addEventListener('load', () => Game.start());
