// ============================================================
// フィールド（マップ移動・イベント・エンカウント）
// ============================================================
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

class FieldScene {
  constructor() {
    this.overlay = false;
    this.moving = 0;       // 移動中フレーム残り
    this.animStep = 0;     // 歩行アニメの左右足
    this.busy = false;     // 会話中など
  }
  get map() { return DATA.MAPS[Game.state.map]; }
  tileAt(x, y) {
    const r = this.map.rows[y];
    return r ? r[x] : 'W';
  }
  eventAt(x, y) { return this.map.events.find(e => e.x === x && e.y === y); }
  canWalk(x, y) {
    if (!DATA.WALKABLE.has(this.tileAt(x, y))) return false;
    const ev = this.eventAt(x, y);
    return !(ev && (ev.kind === 'npc' || ev.kind === 'sign'));
  }

  update(frame) {
    const st = Game.state;
    if (this.moving > 0) {
      this.moving--;
      if (this.moving === 0) this.onArrive();
      return;
    }
    if (Input.pressed('start')) { openStartMenu(); return; }
    if (Input.pressed('a')) { this.interact(); return; }

    for (const d of ['up', 'down', 'left', 'right']) {
      if (Input.down(d)) {
        st.dir = d;
        const [dx, dy] = DIRS[d];
        if (this.canWalk(st.x + dx, st.y + dy)) {
          st.x += dx; st.y += dy;
          this.moving = CONFIG.WALK_FRAMES;
          this.animStep ^= 1;
        }
        break;
      }
    }
  }

  onArrive() {
    const st = Game.state;
    st.steps++;
    const ev = this.eventAt(st.x, st.y);
    if (ev && ev.kind === 'door') { say(ev.text); return; }
    if (this.tileAt(st.x, st.y) === 'T' && Math.random() * 100 < CONFIG.ENCOUNTER_RATE) {
      if (st.party.some(m => m.hp > 0)) {
        startWildBattle(st.map, result => {
          if (result === 'lose') {
            // 全滅：回復して初期位置へ
            st.party.forEach(m => { m.hp = m.maxHp; m.moves.forEach(mv => { mv.pp = mv.maxPp; }); });
            const s = this.map.start; st.x = s.x; st.y = s.y; st.dir = s.dir;
            say('なかまを かいふくして\nまちに もどった。');
          }
        });
      }
    }
  }

  interact() {
    const st = Game.state;
    const [dx, dy] = DIRS[st.dir];
    const ev = this.eventAt(st.x + dx, st.y + dy);
    if (!ev) return;
    if (ev.kind === 'npc') {
      ev.face = { up: 'down', down: 'up', left: 'right', right: 'left' }[st.dir]; // こちらを向く
      if (ev.heal) {
        say(ev.text, () => {
          st.party.forEach(m => { m.hp = m.maxHp; m.moves.forEach(mv => { mv.pp = mv.maxPp; }); });
          say('げんきに なった！');
        });
      } else say(ev.text);
    } else if (ev.kind === 'sign') {
      say(ev.text);
    }
  }

  // 主人公スプライト名（左向きは右向きの反転）
  playerSprite(dir, step) {
    const base = dir === 'left' ? 'right' : dir;
    return Gfx.get(`p_${base}${step}`, 1, dir === 'left');
  }

  draw(ctx, frame) {
    const st = Game.state, T = CONFIG.TILE;
    // カメラ：主人公を画面中央（4,4 マス目）に。移動中は補間
    let ox = 0, oy = 0;
    if (this.moving > 0) {
      const [dx, dy] = DIRS[st.dir];
      const t = this.moving / CONFIG.WALK_FRAMES;  // 1→0
      ox = dx * t * T; oy = dy * t * T;
    }
    const camX = (st.x - 4) * T - ox, camY = (st.y - 4) * T - oy;
    const cx0 = Math.floor(camX / T), cy0 = Math.floor(camY / T);

    for (let ty = cy0; ty <= cy0 + 9; ty++) {
      for (let tx = cx0; tx <= cx0 + 10; tx++) {
        const t = this.tileAt(tx, ty);
        const art = DATA.TILE_ART[t] || 'tree';
        ctx.drawImage(Gfx.get(art), Math.round(tx * T - camX), Math.round(ty * T - camY));
      }
    }
    // NPC（イベント）
    for (const ev of this.map.events) {
      if (ev.kind !== 'npc') continue;
      const sx = Math.round(ev.x * T - camX), sy = Math.round(ev.y * T - camY);
      if (sx < -T || sy < -T || sx > 160 || sy > 144) continue;
      ctx.drawImage(Gfx.get(ev.sprite), sx, sy - 2);
    }
    // 主人公（常に画面中央マス）
    const step = this.moving > 0 && (this.moving % 8) < 4 ? this.animStep : 0;
    ctx.drawImage(this.playerSprite(st.dir, step), 4 * T, 4 * T - 2);
  }
}
