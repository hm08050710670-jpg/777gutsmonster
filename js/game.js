// ============================================================
// ゲーム本体：ループ・シーンスタック・画面スケーリング
// ============================================================
const Game = (() => {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const scenes = [];     // シーンスタック（末尾が最前面）
  let frame = 0;
  let state = null;      // セーブデータ相当（現在の進行状況）

  // ---- スケーリング：整数倍でスマホ幅にフィット。縦はパッド分を確保 ----
  function fit() {
    const wrap = document.getElementById('screen-wrap');
    const app = document.getElementById('app');
    const landscape = matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    const availW = landscape ? Math.floor(app.clientWidth * 0.55) : app.clientWidth;
    const padMin = landscape ? 0 : 150;
    const availH = app.clientHeight - padMin;
    const scale = Math.max(1, Math.min(Math.floor(availW / CONFIG.W), Math.floor(availH / CONFIG.H)));
    canvas.style.width = (CONFIG.W * scale) + 'px';
    canvas.style.height = (CONFIG.H * scale) + 'px';
    wrap.style.height = landscape ? '100%' : (CONFIG.H * scale) + 'px';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 100));

  // ---- シーン操作 ----
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
    // 最前面から遡って、overlay でないシーンから順に描く
    let i = scenes.length - 1;
    while (i > 0 && scenes[i].overlay) i--;
    ctx.fillStyle = PAL[0];
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
    for (; i < scenes.length; i++) scenes[i].draw(ctx, frame);
  }

  // ---- 固定ステップループ ----
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
    await Text.load();
    push(new TitleScene());
    requestAnimationFrame(t => { last = t; loop(t); });
  }

  // 便利：セーブ状態
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  return {
    start, push, pop, replace, top, fit, rand,
    get state() { return state; }, set state(v) { state = v; },
  };
})();

window.addEventListener('load', () => Game.start());
