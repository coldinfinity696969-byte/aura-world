/* ============================================================
   AURA WORLD — параметрические живые сцены (Canvas 2D)
   6 миров: ocean, space, neon, forest, desert, glass
   ============================================================ */

"use strict";

const TAU = Math.PI * 2;

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- базовый класс сцены ---------- */

class WorldScene {
  constructor(canvas, params) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.p = params;
    this.main = hexToRgb(params.main_color);
    this.dark = hexToRgb(params.secondary_color);
    this.accent = hexToRgb(params.accent_color);
    this.intensity = params.animation_intensity || 0.5;
    this.weather = {
      rain: params.weather === "rain",
      night: false,
      void: false
    };
    this.t = 0;
    this.ripples = [];
    this.running = false;
    this.rippleStyle = "glow";

    this.rainDrops = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(), s: rand(0.6, 1.4)
    }));

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.onPointer = this.onPointer.bind(this);
    window.addEventListener("resize", this.resize);
    canvas.addEventListener("pointerdown", this.onPointer);
    this.resize();
    this.init();
  }

  init() {}

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, r.width * this.dpr);
    this.canvas.height = Math.max(1, r.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.W = r.width;
    this.H = r.height;
  }

  onPointer(e) {
    const r = this.canvas.getBoundingClientRect();
    this.touch(e.clientX - r.left, e.clientY - r.top);
  }

  touch(x, y) {
    this.ripples.push({ x, y, t0: this.t, seed: Math.random() * TAU });
    if (this.ripples.length > 10) this.ripples.shift();
  }

  start() { this.running = true; requestAnimationFrame(this.frame); }
  stop() {
    this.running = false;
    window.removeEventListener("resize", this.resize);
    this.canvas.removeEventListener("pointerdown", this.onPointer);
  }

  drift(f = 1) {
    return [Math.sin(this.t * 0.07) * 8 * f, Math.cos(this.t * 0.05) * 5 * f];
  }

  frame() {
    if (!this.running) return;
    const speed = (0.5 + this.intensity * 0.8) * (this.weather.void ? 0.45 : 1) * (this.calm ? 0.4 : 1);
    this.t += 0.016 * speed;
    this.draw(this.ctx, this.W, this.H, this.t);
    this.overlays(this.ctx, this.W, this.H, this.t);
    requestAnimationFrame(this.frame);
  }

  overlays(ctx, W, H, t) {
    if (this.weather.rain) {
      ctx.strokeStyle = rgba(mix(this.accent, [255, 255, 255], 0.4), 0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of this.rainDrops) {
        const y = ((d.y + t * 0.22 * d.s) % 1.05) * H;
        const x = ((d.x - t * 0.015 * d.s) % 1 + 1) % 1 * W;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3 * d.s, y + 15 * d.s);
      }
      ctx.stroke();
    }
    if (this.weather.night) {
      ctx.fillStyle = "rgba(2,3,14,0.34)";
      ctx.fillRect(0, 0, W, H);
    }
    if (this.weather.void) {
      ctx.fillStyle = "rgba(6,7,14,0.38)";
      ctx.fillRect(0, 0, W, H);
    }

    /* реакция на касание */
    const life = this.rippleStyle === "spark" ? 0.9 : 2.2;
    this.ripples = this.ripples.filter(r => t - r.t0 < life);
    for (const r of this.ripples) {
      const prog = (t - r.t0) / life;
      const fade = 1 - prog;
      if (this.rippleStyle === "water") {
        const rad = 8 + prog * 90;
        ctx.strokeStyle = rgba(this.accent, fade * 0.6);
        ctx.lineWidth = 2 * fade + 0.5;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rad, rad * 0.45, 0, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rad * 0.6, rad * 0.27, 0, 0, TAU);
        ctx.stroke();
      } else if (this.rippleStyle === "spark") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(this.accent, fade * 0.9);
        ctx.lineWidth = 1.6;
        for (let b = 0; b < 4; b++) {
          ctx.beginPath();
          let bx = r.x, by = r.y;
          ctx.moveTo(bx, by);
          for (let s = 0; s < 5; s++) {
            bx += Math.cos(r.seed + b * 1.7) * 14 + rand(-9, 9);
            by += Math.sin(r.seed + b * 1.7) * 14 + rand(-9, 9);
            ctx.lineTo(bx, by);
          }
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 36 * fade + 6);
        g.addColorStop(0, rgba(this.accent, fade * 0.7));
        g.addColorStop(1, rgba(this.accent, 0));
        ctx.fillStyle = g;
        ctx.fillRect(r.x - 50, r.y - 50, 100, 100);
        ctx.restore();
      } else { // glow / heat
        const rad = 10 + prog * 80;
        const col = this.rippleStyle === "heat" ? mix(this.accent, [255, 120, 40], 0.5) : this.accent;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad);
        g.addColorStop(0, rgba(col, fade * 0.45));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(r.x - rad, r.y - rad, rad * 2, rad * 2);
        ctx.restore();
      }
    }

    /* редкое событие мира */
    if (this.p.rare) this.drawRare(ctx, W, H, t);

    /* виньетка */
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  /* редкие события — рисуются поверх любой сцены, включая картинки */
  drawRare(ctx, W, H, t) {
    const r = this.p.rare;
    ctx.save();
    if (r === "кит") {
      const cycle = 16, ph = (t % cycle) / cycle;
      if (ph < 0.45) {
        const x = -0.2 * W + (ph / 0.45) * W * 1.4;
        const y = H * 0.6 + Math.sin(ph * 14) * 6;
        ctx.globalAlpha = Math.min(1, Math.sin((ph / 0.45) * Math.PI) * 1.6);
        ctx.fillStyle = rgba(mix(this.dark, [0, 0, 0], 0.3), 0.92);
        ctx.beginPath();
        ctx.ellipse(x, y, 62, 19, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath(); // хвост
        ctx.moveTo(x - 56, y);
        ctx.quadraticCurveTo(x - 86, y - 5, x - 94, y - 20);
        ctx.quadraticCurveTo(x - 80, y - 2, x - 94, y + 14);
        ctx.quadraticCurveTo(x - 86, y + 2, x - 56, y);
        ctx.fill();
        ctx.strokeStyle = rgba(this.accent, 0.55); // светящаяся спина
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y, 62, 19, 0, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        if (ph > 0.1 && ph < 0.28) { // фонтан
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = rgba(this.accent, 0.5 - i * 0.08);
            ctx.beginPath();
            ctx.arc(x + 30 + Math.sin(t * 3 + i) * 4, y - 26 - i * 7, 1.6, 0, TAU);
            ctx.fill();
          }
        }
      }
    } else if (r === "северное сияние") {
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < 3; b++) {
        const col = mix(this.accent, [90, 255, 180], 0.4 + 0.4 * Math.sin(t * 0.3 + b * 2));
        const grad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
        grad.addColorStop(0, rgba(col, 0.13));
        grad.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const y = H * 0.04 + b * 24 + Math.sin(x * 0.012 + t * (0.5 + b * 0.2)) * 26;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H * 0.45);
        ctx.lineTo(0, H * 0.45);
        ctx.closePath();
        ctx.fill();
      }
    } else if (r === "метеорный дождь" || r === "двойная комета") {
      if (!this.meteors) this.meteors = [];
      const lim = r === "метеорный дождь" ? 4 : 2;
      if (Math.random() < (r === "метеорный дождь" ? 0.02 : 0.009) && this.meteors.length < lim)
        this.meteors.push({ x: Math.random() * 0.8 + 0.1, y: -0.05, vx: rand(-0.05, 0.12), vy: rand(0.22, 0.38), life: 1 });
      ctx.globalCompositeOperation = "lighter";
      this.meteors = this.meteors.filter(m => m.life > 0 && m.y < 1.1);
      for (const m of this.meteors) {
        m.x += m.vx * 0.016;
        m.y += m.vy * 0.016;
        m.life -= 0.011;
        const mx = m.x * W, my = m.y * H;
        const tail = ctx.createLinearGradient(mx, my, mx - m.vx * 550, my - m.vy * 550);
        tail.addColorStop(0, rgba(this.accent, 0.9 * m.life));
        tail.addColorStop(1, rgba(this.accent, 0));
        ctx.strokeStyle = tail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - m.vx * 550, my - m.vy * 550);
        ctx.stroke();
      }
    } else if (r === "гроза") {
      const cyc = (t % 9) / 9;
      if (cyc < 0.05) {
        ctx.fillStyle = rgba(this.accent, 0.16 * Math.sin((cyc / 0.05) * Math.PI));
        ctx.fillRect(0, 0, W, H);
        if (cyc < 0.022) {
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          let bx = W * (0.3 + (Math.floor(t / 9) % 3) * 0.2), by = 0;
          ctx.moveTo(bx, by);
          for (let s = 0; s < 6; s++) {
            bx += rand(-28, 28);
            by += H * 0.07;
            ctx.lineTo(bx, by);
          }
          ctx.stroke();
        }
      }
    } else if (r === "разлом") {
      const cyc = (t % 7) / 7;
      if (cyc < 0.06) {
        const d = this.dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < 7; i++) {
          const sy = Math.random() * H * d, sh = rand(6, 28) * d, off = rand(-46, 46) * d;
          ctx.drawImage(this.canvas, 0, sy, W * d, sh, off, sy, W * d, sh);
        }
        ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.fillStyle = rgba(this.accent, 0.06);
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
  }

  /* мягкие звёзды */
  makeStars(n, ymax = 0.6) {
    return Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random() * ymax,
      r: 0.4 + Math.random() * 1.5,
      tw: Math.random() * TAU,
      sp: 0.0008 + Math.random() * 0.002,
      layer: Math.random()
    }));
  }

  drawStars(ctx, W, H, t, stars, ymax = 0.6) {
    const [dx, dy] = this.drift(0.3);
    for (const s of stars) {
      if (!this.weather.void || s.layer > 0.6) {
        s.x = (s.x + s.sp * this.intensity * 0.1) % 1;
        const a = 0.2 + 0.55 * Math.abs(Math.sin(t * 0.8 + s.tw));
        ctx.fillStyle = rgba(this.accent, a);
        ctx.beginPath();
        ctx.arc(s.x * W + dx * (0.3 + s.layer * 0.7), s.y * H * (ymax / 0.6) + dy * 0.3, s.r, 0, TAU);
        ctx.fill();
      }
    }
  }

  makeFog(n) {
    return Array.from({ length: n }, (_, i) => ({
      x: Math.random(), y: 0.4 + Math.random() * 0.35,
      w: 0.3 + Math.random() * 0.4,
      sp: (0.004 + Math.random() * 0.008) * (i % 2 ? 1 : -1)
    }));
  }

  drawFog(ctx, W, H, density = 1) {
    if (this.weather.void) density *= 0.4;
    for (const f of this.fogBlobs) {
      f.x += f.sp * 0.016 * (0.5 + this.intensity);
      if (f.x > 1.3) f.x = -0.3;
      if (f.x < -0.3) f.x = 1.3;
      const fg = ctx.createRadialGradient(f.x * W, f.y * H, 0, f.x * W, f.y * H, f.w * W);
      fg.addColorStop(0, rgba(mix(this.main, [255, 255, 255], 0.3), 0.06 * density));
      fg.addColorStop(1, rgba(this.main, 0));
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

/* ============================================================
   1. OCEAN — волны, луна, туман, маяк, планктон
   ============================================================ */

class OceanWorld extends WorldScene {
  init() {
    this.rippleStyle = "water";
    this.stars = this.makeStars(70);
    this.fogBlobs = this.makeFog(6);
    this.plankton = Array.from({ length: 40 }, () => ({
      x: Math.random(), ph: Math.random() * TAU, layer: Math.floor(Math.random() * 3)
    }));
    this.clouds = Array.from({ length: 4 }, () => ({
      x: Math.random(), y: 0.38 + Math.random() * 0.14, w: rand(0.25, 0.45), sp: rand(0.002, 0.006)
    }));
  }

  waveY(i, x, t, H, horizon) {
    const amp = (6 + i * 5) * (0.5 + this.intensity);
    const speed = (0.5 + i * 0.25) * (0.4 + this.intensity);
    return horizon + i * (H - horizon) * 0.22
      + Math.sin(x * 0.012 + t * speed) * amp
      + Math.sin(x * 0.027 - t * speed * 0.7) * amp * 0.45;
  }

  draw(ctx, W, H, t) {
    const horizon = H * 0.58;
    const [dx, dy] = this.drift();

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgba(this.dark, 1));
    sky.addColorStop(0.7, rgba(mix(this.dark, this.main, 0.22), 1));
    sky.addColorStop(1, rgba(mix(this.dark, this.main, 0.42), 1));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    this.drawStars(ctx, W, H, t, this.stars);

    /* луна */
    const mx = W * 0.7 + dx * 0.5, my = H * 0.17 + dy * 0.5, mr = Math.min(W, H) * 0.085;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 4);
    glow.addColorStop(0, rgba(this.accent, 0.5));
    glow.addColorStop(1, rgba(this.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.fillStyle = rgba(mix(this.accent, [255, 255, 255], 0.55), 0.95);
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(this.accent, this.dark, 0.25), 0.25);
    ctx.beginPath();
    ctx.arc(mx - mr * 0.25, my - mr * 0.15, mr * 0.22, 0, TAU);
    ctx.arc(mx + mr * 0.3, my + mr * 0.28, mr * 0.15, 0, TAU);
    ctx.fill();

    /* облака у горизонта */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const c of this.clouds) {
      c.x += c.sp * 0.016 * (0.4 + this.intensity);
      if (c.x > 1.3) c.x = -0.3;
      const cg = ctx.createRadialGradient(c.x * W, c.y * H, 0, c.x * W, c.y * H, c.w * W);
      cg.addColorStop(0, rgba(mix(this.main, this.dark, 0.4), 0.16));
      cg.addColorStop(1, rgba(this.main, 0));
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    /* волны */
    for (let i = 0; i < 4; i++) {
      const col = mix(mix(this.dark, this.main, 0.55 - i * 0.12), this.dark, i * 0.18);
      ctx.fillStyle = rgba(col, 0.85);
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        ctx.lineTo(x + dx * (0.4 + i * 0.2), this.waveY(i, x, t, H, horizon) + dy * (0.4 + i * 0.2));
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }

    /* биолюминесцентный планктон на гребнях */
    if (!this.weather.void) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const pl of this.plankton) {
        const x = ((pl.x + t * 0.004) % 1) * W;
        const y = this.waveY(pl.layer, x, t, H, horizon) + rand(-1, 1);
        const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.4 + pl.ph));
        ctx.fillStyle = rgba(mix(this.accent, this.main, 0.3), a);
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    /* лунная дорожка */
    const lane = ctx.createLinearGradient(0, horizon, 0, H);
    lane.addColorStop(0, rgba(this.accent, 0.2));
    lane.addColorStop(1, rgba(this.accent, 0));
    ctx.fillStyle = lane;
    ctx.beginPath();
    ctx.moveTo(mx - mr * 1.4, horizon);
    ctx.lineTo(mx + mr * 1.4, horizon);
    ctx.lineTo(mx + mr * 3 + Math.sin(t) * 6, H);
    ctx.lineTo(mx - mr * 3 - Math.sin(t) * 6, H);
    ctx.closePath();
    ctx.fill();

    /* маяк */
    const lx = W * 0.22 + dx * 0.8, lyBase = horizon + 8;
    const lh = Math.min(W, H) * 0.2;
    ctx.fillStyle = rgba(mix(this.dark, [0, 0, 0], 0.4), 1);
    ctx.beginPath();
    ctx.moveTo(lx - 52, lyBase + 20);
    ctx.quadraticCurveTo(lx, lyBase - 18, lx + 52, lyBase + 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(mix(this.dark, this.main, 0.22), 1);
    ctx.beginPath();
    ctx.moveTo(lx - 10, lyBase);
    ctx.lineTo(lx - 6.5, lyBase - lh);
    ctx.lineTo(lx + 6.5, lyBase - lh);
    ctx.lineTo(lx + 10, lyBase);
    ctx.closePath();
    ctx.fill();
    // галерея и крыша
    ctx.fillStyle = rgba(mix(this.dark, this.main, 0.35), 1);
    ctx.fillRect(lx - 9, lyBase - lh - 3, 18, 4);
    ctx.beginPath();
    ctx.moveTo(lx - 8, lyBase - lh - 3);
    ctx.lineTo(lx, lyBase - lh - 14);
    ctx.lineTo(lx + 8, lyBase - lh - 3);
    ctx.closePath();
    ctx.fill();

    const beamPhase = (t % 6) / 6;
    const beamA = Math.max(0, Math.sin(beamPhase * Math.PI * 2)) ** 3 * 0.5;
    if (beamA > 0.01) {
      ctx.save();
      ctx.translate(lx, lyBase - lh + 2);
      ctx.rotate(Math.sin(t * 0.25) * 0.45);
      const beam = ctx.createLinearGradient(0, 0, W * 0.7, 0);
      beam.addColorStop(0, rgba(this.accent, beamA));
      beam.addColorStop(1, rgba(this.accent, 0));
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(W * 0.7, -W * 0.05);
      ctx.lineTo(W * 0.7, W * 0.05);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = rgba(this.accent, 0.4 + beamA);
    ctx.beginPath();
    ctx.arc(lx, lyBase - lh + 2, 3.5 + beamA * 5, 0, TAU);
    ctx.fill();

    this.drawFog(ctx, W, H, this.p.weather === "mist" ? 1 : 0.5);
  }
}

/* ============================================================
   2. SPACE — планета, туманности, кометы, пыль
   ============================================================ */

class SpaceWorld extends WorldScene {
  init() {
    this.rippleStyle = "glow";
    this.stars = this.makeStars(130, 1);
    this.dust = Array.from({ length: 36 }, () => ({
      x: Math.random(), y: Math.random(), r: rand(0.5, 1.6),
      vx: rand(-0.01, 0.01), vy: rand(-0.006, 0.006), ph: Math.random() * TAU
    }));
    this.nebulae = Array.from({ length: 3 }, () => ({
      x: Math.random(), y: Math.random() * 0.7, r: rand(0.3, 0.55), hue: Math.random()
    }));
    this.comet = null;
    this.cometTimer = rand(3, 7);
  }

  draw(ctx, W, H, t) {
    const [dx, dy] = this.drift();

    const bg = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, H);
    bg.addColorStop(0, rgba(mix(this.dark, this.main, 0.16), 1));
    bg.addColorStop(1, rgba(this.dark, 1));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* туманности */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const n of this.nebulae) {
      const col = mix(this.main, this.accent, n.hue);
      const g = ctx.createRadialGradient(n.x * W + dx, n.y * H + dy, 0, n.x * W + dx, n.y * H + dy, n.r * W);
      g.addColorStop(0, rgba(col, 0.1 + 0.04 * Math.sin(t * 0.4 + n.hue * 9)));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    this.drawStars(ctx, W, H, t, this.stars, 1);

    /* пыль */
    if (!this.weather.void) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const d of this.dust) {
        d.x = (d.x + d.vx * 0.016 + 1) % 1;
        d.y = (d.y + d.vy * 0.016 + 1) % 1;
        ctx.fillStyle = rgba(this.accent, 0.12 + 0.1 * Math.sin(t + d.ph));
        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, d.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    /* планета */
    const px = W * 0.66 + dx * 0.6, py = H * 0.4 + dy * 0.6, pr = Math.min(W, H) * 0.24;
    // кольцо сзади
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.3);
    ctx.strokeStyle = rgba(mix(this.accent, this.main, 0.4), 0.3);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 1.7, pr * 0.45, 0, Math.PI, TAU);
    ctx.stroke();
    ctx.restore();

    const halo = ctx.createRadialGradient(px, py, pr * 0.9, px, py, pr * 1.9);
    halo.addColorStop(0, rgba(this.main, 0.3));
    halo.addColorStop(1, rgba(this.main, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(px - pr * 2, py - pr * 2, pr * 4, pr * 4);

    const sphere = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
    sphere.addColorStop(0, rgba(mix(this.main, this.accent, 0.5), 1));
    sphere.addColorStop(0.6, rgba(this.main, 1));
    sphere.addColorStop(1, rgba(mix(this.main, this.dark, 0.75), 1));
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, TAU);
    ctx.fill();

    /* медленно плывущие полосы — вращение планеты */
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, TAU);
    ctx.clip();
    for (let b = 0; b < 3; b++) {
      const off = ((t * 6 + b * pr * 0.9) % (pr * 2.6)) - pr * 1.3;
      ctx.fillStyle = rgba(mix(this.main, this.dark, 0.3), 0.25);
      ctx.beginPath();
      ctx.ellipse(px - off, py - pr * 0.3 + b * pr * 0.35, pr * 0.9, pr * 0.16, 0.12, 0, TAU);
      ctx.fill();
    }
    // терминатор
    const term = ctx.createLinearGradient(px - pr, py, px + pr, py);
    term.addColorStop(0, "rgba(0,0,0,0)");
    term.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = term;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    ctx.restore();

    // кольцо спереди
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.3);
    ctx.strokeStyle = rgba(mix(this.accent, this.main, 0.4), 0.5);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 1.7, pr * 0.45, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    /* комета */
    this.cometTimer -= 0.016;
    if (!this.comet && this.cometTimer <= 0) {
      this.comet = { x: -0.1, y: rand(0.06, 0.35), vx: rand(0.18, 0.28), vy: rand(0.03, 0.08) };
      this.cometTimer = rand(6, 12);
    }
    if (this.comet) {
      const c = this.comet;
      c.x += c.vx * 0.016;
      c.y += c.vy * 0.016;
      if (c.x > 1.2) this.comet = null;
      else {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const cx = c.x * W, cy = c.y * H;
        const tail = ctx.createLinearGradient(cx, cy, cx - 110, cy - 36);
        tail.addColorStop(0, rgba(this.accent, 0.9));
        tail.addColorStop(1, rgba(this.accent, 0));
        ctx.strokeStyle = tail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 110, cy - 36);
        ctx.stroke();
        ctx.fillStyle = rgba([255, 255, 255], 0.95);
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

/* ============================================================
   3. NEON ROOM — неоновая рама, глитчи, парящие фигуры
   ============================================================ */

class NeonRoom extends WorldScene {
  init() {
    this.rippleStyle = "spark";
    this.shapes = Array.from({ length: 6 }, () => ({
      x: rand(0.08, 0.5), y: rand(0.08, 0.6), r: rand(14, 34),
      n: Math.random() > 0.5 ? 3 : 4, rot: rand(0, TAU), vr: rand(-0.4, 0.4),
      ph: rand(0, TAU), hue: Math.random()
    }));
    this.glitchAt = rand(2, 5);
    // паттерн скан-линий
    const pc = document.createElement("canvas");
    pc.width = 4; pc.height = 4;
    const pctx = pc.getContext("2d");
    pctx.fillStyle = "rgba(255,255,255,0.035)";
    pctx.fillRect(0, 0, 4, 1);
    this.scan = this.ctx.createPattern(pc, "repeat");
  }

  draw(ctx, W, H, t) {
    const [dx, dy] = this.drift(0.6);
    const floorY = H * 0.72;
    const pulse = 0.65 + 0.35 * Math.sin(t * 2.2);

    ctx.fillStyle = rgba(this.dark, 1);
    ctx.fillRect(0, 0, W, H);
    const wall = ctx.createRadialGradient(W * 0.65, H * 0.4, 0, W * 0.65, H * 0.4, H * 0.9);
    wall.addColorStop(0, rgba(mix(this.dark, this.main, 0.14), 1));
    wall.addColorStop(1, rgba(this.dark, 1));
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);

    /* неоновая рама-зеркало */
    const fx = W * 0.5 + dx, fy = H * 0.14 + dy, fw = W * 0.38, fh = H * 0.5;
    const frameCol = mix(this.main, this.accent, 0.35);

    // живая «жидкость» внутри рамы
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(fx, fy, fw, fh, 8);
    ctx.clip();
    ctx.fillStyle = rgba(mix(this.dark, [0, 0, 0], 0.3), 1);
    ctx.fillRect(fx, fy, fw, fh);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const yy = fy + fh * (0.15 + i * 0.18) + Math.sin(t * 1.3 + i * 2) * fh * 0.07;
      const col = mix(this.main, this.accent, i / 4);
      ctx.strokeStyle = rgba(col, 0.35 + 0.2 * Math.sin(t * 2 + i));
      ctx.lineWidth = 7 - i;
      ctx.beginPath();
      ctx.moveTo(fx, yy);
      ctx.bezierCurveTo(
        fx + fw * 0.3, yy + Math.sin(t * 1.7 + i) * 36,
        fx + fw * 0.7, yy - Math.cos(t * 1.4 + i * 1.3) * 36,
        fx + fw, yy + Math.sin(t + i * 0.7) * 20
      );
      ctx.stroke();
    }
    // молния внутри
    if (Math.sin(t * 0.9) > 0.86) {
      ctx.strokeStyle = rgba(this.accent, 0.85);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let zx = fx + fw * 0.5, zy = fy;
      ctx.moveTo(zx, zy);
      for (let s = 0; s < 7; s++) {
        zx += rand(-fw * 0.18, fw * 0.18);
        zy += fh / 7;
        ctx.lineTo(zx, zy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // свечение рамы: три прохода
    for (const [lw, a] of [[12, 0.1 * pulse], [5, 0.45 * pulse], [1.8, 0.95]]) {
      ctx.strokeStyle = rgba(frameCol, a);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.roundRect(fx, fy, fw, fh, 8);
      ctx.stroke();
    }

    /* парящие неоновые фигуры */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.shapes) {
      if (this.weather.void && s.hue > 0.5) continue;
      s.rot += s.vr * 0.016 * (0.5 + this.intensity);
      const sx = s.x * W + Math.sin(t * 0.5 + s.ph) * 10 + dx;
      const sy = s.y * H + Math.cos(t * 0.4 + s.ph) * 12 + dy;
      ctx.strokeStyle = rgba(mix(this.main, this.accent, s.hue), 0.55 + 0.25 * Math.sin(t * 1.5 + s.ph));
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= s.n; k++) {
        const a = s.rot + (k / s.n) * TAU;
        const px2 = sx + Math.cos(a) * s.r, py2 = sy + Math.sin(a) * s.r * 0.8;
        k === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
      }
      ctx.stroke();
    }
    ctx.restore();

    /* пол с отражением */
    const floor = ctx.createLinearGradient(0, floorY, 0, H);
    floor.addColorStop(0, rgba(mix(this.dark, this.main, 0.1), 1));
    floor.addColorStop(1, rgba(this.dark, 1));
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, W, H - floorY);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.translate(0, floorY * 2 + (fh - (floorY - fy)) * 0); // отражение от линии пола
    ctx.scale(1, -1);
    ctx.translate(0, -2 * floorY);
    for (const [lw, a] of [[6, 0.4 * pulse], [2, 0.9]]) {
      ctx.strokeStyle = rgba(frameCol, a);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.roundRect(fx, fy, fw, fh, 8);
      ctx.stroke();
    }
    ctx.restore();
    // дымка поверх отражения
    const refl = ctx.createLinearGradient(0, floorY, 0, H);
    refl.addColorStop(0, rgba(this.dark, 0.15));
    refl.addColorStop(1, rgba(this.dark, 0.85));
    ctx.fillStyle = refl;
    ctx.fillRect(0, floorY, W, H - floorY);

    // пятно света от рамы на полу
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const spot = ctx.createRadialGradient(fx + fw / 2, floorY + 14, 0, fx + fw / 2, floorY + 14, fw * 0.8);
    spot.addColorStop(0, rgba(frameCol, 0.2 * pulse));
    spot.addColorStop(1, rgba(frameCol, 0));
    ctx.fillStyle = spot;
    ctx.fillRect(0, floorY - 30, W, H - floorY + 30);
    ctx.restore();

    /* скан-линии */
    ctx.fillStyle = this.scan;
    ctx.fillRect(0, 0, W, H);

    /* глитч */
    this.glitchAt -= 0.016;
    if (this.glitchAt <= 0) this.glitchAt = rand(2.5, 6);
    if (this.glitchAt < 0.16) {
      const d = this.dpr;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 4; i++) {
        const sy = rand(0, H) * d, sh = rand(4, 16) * d, off = rand(-22, 22) * d;
        ctx.drawImage(this.canvas, 0, sy, W * d, sh, off, sy, W * d, sh);
      }
      ctx.restore();
      ctx.fillStyle = rgba(this.accent, 0.04);
      ctx.fillRect(0, 0, W, H);
    }
  }
}

/* ============================================================
   4. DREAM FOREST — лес, светлячки, светящиеся цветы
   ============================================================ */

class DreamForest extends WorldScene {
  init() {
    this.rippleStyle = "glow";
    this.stars = this.makeStars(40, 0.4);
    this.fogBlobs = this.makeFog(5);
    this.fireflies = Array.from({ length: 26 }, () => ({
      x: Math.random(), y: rand(0.3, 0.9), ph: Math.random() * TAU, sp: rand(0.4, 1.1)
    }));
    this.layers = [0.55, 0.75, 1].map((depth, li) =>
      Array.from({ length: 5 - li }, () => ({
        x: Math.random(), w: rand(0.025, 0.05) * (1 + li * 0.5), lean: rand(-0.05, 0.05), depth
      }))
    );
    this.flowers = Array.from({ length: 7 }, () => ({
      x: Math.random(), y: rand(0.86, 0.97), size: rand(7, 15), ph: Math.random() * TAU, hue: Math.random()
    }));
    // полумесяц на оффскрине
    const mc = document.createElement("canvas");
    mc.width = mc.height = 120;
    const mctx = mc.getContext("2d");
    mctx.fillStyle = rgba(mix(this.accent, [255, 255, 255], 0.5), 1);
    mctx.beginPath();
    mctx.arc(60, 60, 38, 0, TAU);
    mctx.fill();
    mctx.globalCompositeOperation = "destination-out";
    mctx.beginPath();
    mctx.arc(78, 48, 36, 0, TAU);
    mctx.fill();
    this.crescent = mc;
  }

  draw(ctx, W, H, t) {
    const [dx, dy] = this.drift(0.7);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rgba(mix(this.dark, this.main, 0.25), 1));
    bg.addColorStop(0.5, rgba(this.dark, 1));
    bg.addColorStop(1, rgba(mix(this.dark, [0, 0, 0], 0.4), 1));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this.drawStars(ctx, W, H, t, this.stars, 0.4);

    /* месяц */
    const cmx = W * 0.62 + dx * 0.4, cmy = H * 0.12 + dy * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const mg = ctx.createRadialGradient(cmx, cmy, 0, cmx, cmy, 90);
    mg.addColorStop(0, rgba(this.accent, 0.35));
    mg.addColorStop(1, rgba(this.accent, 0));
    ctx.fillStyle = mg;
    ctx.fillRect(cmx - 90, cmy - 90, 180, 180);
    ctx.restore();
    ctx.drawImage(this.crescent, cmx - 60, cmy - 60);

    /* слои деревьев */
    this.layers.forEach((trees, li) => {
      const shade = 0.55 - li * 0.18;
      const par = 0.3 + li * 0.35;
      ctx.fillStyle = rgba(mix(this.dark, this.main, shade * 0.3), 0.55 + li * 0.2);
      for (const tr of trees) {
        const sway = Math.sin(t * 0.35 + tr.x * 9) * 0.012 * (li + 1);
        const bx = tr.x * W + dx * par;
        const tw = tr.w * W;
        const topX = bx + (tr.lean + sway) * H;
        ctx.beginPath();
        ctx.moveTo(bx - tw, H);
        ctx.quadraticCurveTo(bx - tw * 0.4, H * 0.5, topX - tw * 0.25, H * 0.05);
        ctx.lineTo(topX + tw * 0.25, H * 0.05);
        ctx.quadraticCurveTo(bx + tw * 0.4, H * 0.5, bx + tw, H);
        ctx.closePath();
        ctx.fill();
        // ветви-кроны — полупрозрачные массы листвы вокруг ствола
        ctx.save();
        ctx.globalAlpha = 0.35;
        for (let b = 0; b < 4; b++) {
          const by = H * (0.12 + b * 0.13);
          const bw = tw * (1.6 + b * 0.9);
          ctx.beginPath();
          ctx.ellipse(topX + (tr.lean + sway) * by * 0.3, by, bw, bw * 0.55, sway * 2, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      if (li < 2) this.drawFog(ctx, W, H, 0.5);
    });

    /* светлячки */
    if (!this.weather.void) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const f of this.fireflies) {
        f.x += Math.sin(t * f.sp + f.ph) * 0.0005;
        f.y += Math.cos(t * f.sp * 0.8 + f.ph) * 0.0004;
        const a = Math.max(0, Math.sin(t * 1.6 + f.ph)) * 0.9;
        if (a < 0.05) continue;
        const fx = f.x * W, fy = f.y * H;
        const col = f.ph % 2 > 1 ? [255, 200, 110] : mix(this.accent, this.main, 0.3);
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7);
        g.addColorStop(0, rgba(col, a));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(fx - 7, fy - 7, 14, 14);
      }
      ctx.restore();
    }

    /* светящиеся цветы — медленное дыхание */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const fl of this.flowers) {
      const breathe = 1 + 0.08 * Math.sin(t * 0.9 + fl.ph);
      const fx = fl.x * W, fy = fl.y * H;
      const col = mix(this.main, this.accent, fl.hue);
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fl.size * 2.6 * breathe);
      g.addColorStop(0, rgba(col, 0.4));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(fx - 40, fy - 40, 80, 80);
      for (let petal = 0; petal < 6; petal++) {
        const a = (petal / 6) * TAU + Math.sin(t * 0.4 + fl.ph) * 0.1;
        ctx.fillStyle = rgba(mix(col, [255, 255, 255], 0.35), 0.75);
        ctx.beginPath();
        ctx.ellipse(
          fx + Math.cos(a) * fl.size * 0.55 * breathe,
          fy + Math.sin(a) * fl.size * 0.45 * breathe,
          fl.size * 0.5, fl.size * 0.22, a, 0, TAU
        );
        ctx.fill();
      }
      ctx.fillStyle = rgba([255, 255, 255], 0.9);
      ctx.beginPath();
      ctx.arc(fx, fy, fl.size * 0.18, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    this.drawFog(ctx, W, H, 0.7);
  }
}

/* ============================================================
   5. ASH / DESERT — затмение, трещины, пепел
   ============================================================ */

class AshWorld extends WorldScene {
  init() {
    this.rippleStyle = "heat";
    this.clouds = Array.from({ length: 6 }, () => ({
      x: Math.random(), y: rand(0.05, 0.4), w: rand(0.2, 0.45), sp: rand(0.003, 0.009)
    }));
    this.embers = Array.from({ length: 46 }, () => ({
      x: Math.random(), y: Math.random(), sp: rand(0.02, 0.07), ph: Math.random() * TAU, r: rand(0.7, 1.7)
    }));
    this.spires = Array.from({ length: 5 }, (_, i) => ({
      x: i / 5 + Math.random() * 0.15, w: rand(0.06, 0.14), h: rand(0.07, 0.2)
    }));
    // трещины — случайные ломаные от линии горизонта вниз
    this.cracks = Array.from({ length: 13 }, () => {
      const pts = [[Math.random(), 0]];
      let x = pts[0][0];
      const segs = 4 + Math.floor(Math.random() * 5);
      for (let s = 1; s <= segs; s++) {
        x += rand(-0.06, 0.06);
        pts.push([x, s / segs]);
      }
      return { pts, ph: Math.random() * TAU, branch: Math.random() > 0.5 };
    });
  }

  draw(ctx, W, H, t) {
    const [dx, dy] = this.drift(0.8);
    const horizon = H * 0.56;

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgba(mix(this.dark, [0, 0, 0], 0.3), 1));
    sky.addColorStop(0.55, rgba(mix(this.dark, this.main, 0.4 + 0.05 * Math.sin(t * 0.2)), 1));
    sky.addColorStop(1, rgba(mix(this.dark, this.main, 0.6), 1));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    /* затмение */
    const ex = W * 0.56 + dx * 0.5, ey = H * 0.18 + dy * 0.5, er = Math.min(W, H) * 0.11;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flick = 0.8 + 0.2 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
    const corona = ctx.createRadialGradient(ex, ey, er * 0.8, ex, ey, er * 3.2);
    corona.addColorStop(0, rgba(mix(this.accent, [255, 140, 40], 0.5), 0.55 * flick));
    corona.addColorStop(0.35, rgba(this.main, 0.22 * flick));
    corona.addColorStop(1, rgba(this.main, 0));
    ctx.fillStyle = corona;
    ctx.fillRect(ex - er * 3.5, ey - er * 3.5, er * 7, er * 7);
    ctx.restore();
    ctx.fillStyle = "rgba(8,3,2,1)";
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(this.accent, [255, 180, 80], 0.6), 0.9 * flick);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.stroke();

    /* дымные облака */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const c of this.clouds) {
      c.x += c.sp * 0.016 * (0.4 + this.intensity);
      if (c.x > 1.3) c.x = -0.3;
      const g = ctx.createRadialGradient(c.x * W, c.y * H, 0, c.x * W, c.y * H, c.w * W);
      g.addColorStop(0, rgba(mix(this.main, this.dark, 0.45), 0.14));
      g.addColorStop(1, rgba(this.main, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    /* дальние скалы */
    for (const s of this.spires) {
      ctx.fillStyle = rgba(mix(this.dark, [0, 0, 0], 0.35), 0.9);
      const sx = s.x * W + dx * 0.5, sw = s.w * W, top = horizon - s.h * H;
      ctx.beginPath();
      ctx.moveTo(sx - sw, horizon + 4);
      ctx.lineTo(sx - sw * 0.3, top + s.h * H * 0.3);
      ctx.lineTo(sx - sw * 0.1, top);
      ctx.lineTo(sx + sw * 0.25, top + s.h * H * 0.18);
      ctx.lineTo(sx + sw, horizon + 4);
      ctx.closePath();
      ctx.fill();
    }

    /* земля */
    const ground = ctx.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, rgba(mix(this.dark, this.main, 0.18), 1));
    ground.addColorStop(1, rgba(mix(this.dark, [0, 0, 0], 0.5), 1));
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, W, H - horizon);

    /* светящиеся трещины */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const cr of this.cracks) {
      const glowA = 0.25 + 0.45 * Math.max(0, Math.sin(t * 0.7 + cr.ph));
      const emberCol = mix(this.accent, [255, 120, 30], 0.55);
      for (const [lw, a] of [[4, glowA * 0.3], [1.4, glowA]]) {
        ctx.strokeStyle = rgba(emberCol, a);
        ctx.lineWidth = lw;
        ctx.beginPath();
        cr.pts.forEach(([px, py], i) => {
          // перспектива: трещины расходятся к низу экрана
          const sx = (px - 0.5) * W * (1 + py * 1.6) + W * 0.5;
          const sy = horizon + py * (H - horizon);
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        });
        ctx.stroke();
      }
    }
    ctx.restore();

    /* пепел и искры */
    if (!this.weather.void) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const e of this.embers) {
        e.y -= e.sp * 0.016 * (0.5 + this.intensity);
        if (e.y < -0.02) { e.y = 1.02; e.x = Math.random(); }
        const exx = (e.x + Math.sin(t * 0.8 + e.ph) * 0.015) * W;
        const a = 0.25 + 0.45 * Math.abs(Math.sin(t * 2 + e.ph));
        ctx.fillStyle = rgba(mix(this.accent, [255, 130, 40], 0.5), a);
        ctx.beginPath();
        ctx.arc(exx, e.y * H, e.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

/* ============================================================
   6. GLASS CITY — стеклянные башни, дождь, отражения
   ============================================================ */

class GlassCity extends WorldScene {
  init() {
    this.rippleStyle = "glow";
    this.fogBlobs = this.makeFog(5);
    const makeRow = (n, hMin, hMax) => {
      const arr = [];
      let x = -0.05;
      for (let i = 0; i < n; i++) {
        const w = rand(0.07, 0.16);
        const h = rand(hMin, hMax);
        const cols = Math.max(2, Math.floor(w * 46));
        const rows = Math.max(4, Math.floor(h * 26));
        const lit = Array.from({ length: cols * rows }, () => Math.random() < 0.26);
        arr.push({ x, w, h, cols, rows, lit, taper: Math.random() > 0.6 });
        x += w * rand(0.75, 1.05);
        if (x > 1) break;
      }
      return arr;
    };
    this.back = makeRow(11, 0.18, 0.42);
    this.front = makeRow(8, 0.28, 0.62);
    if (this.p.weather === "rain") this.weather.rain = true;
  }

  drawBuildings(ctx, W, H, gy, row, color, litAlpha, par, dx) {
    for (const b of row) {
      const bx = b.x * W + dx * par, bw = b.w * W, bh = b.h * H;
      ctx.fillStyle = color;
      if (b.taper) {
        ctx.beginPath();
        ctx.moveTo(bx, gy);
        ctx.lineTo(bx + bw * 0.12, gy - bh);
        ctx.lineTo(bx + bw * 0.6, gy - bh - bh * 0.08);
        ctx.lineTo(bx + bw, gy - bh * 0.85);
        ctx.lineTo(bx + bw, gy);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(bx, gy - bh, bw, bh);
      }
      if (litAlpha > 0) {
        const cw = bw / b.cols, ch = bh / b.rows;
        for (let c = 0; c < b.cols; c++) {
          for (let r = 0; r < b.rows; r++) {
            if (!b.lit[c * b.rows + r]) continue;
            ctx.fillStyle = rgba(this.accent, litAlpha * (0.4 + ((c * 7 + r * 13) % 10) / 16));
            ctx.fillRect(bx + c * cw + cw * 0.22, gy - bh + r * ch + ch * 0.25, cw * 0.5, ch * 0.45);
          }
        }
      }
    }
  }

  draw(ctx, W, H, t) {
    const [dx] = this.drift(0.8);
    const gy = H * 0.8;

    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, rgba(this.dark, 1));
    sky.addColorStop(0.75, rgba(mix(this.dark, this.main, 0.2), 1));
    sky.addColorStop(1, rgba(mix(this.dark, this.main, 0.32), 1));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    /* свечение города у горизонта */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const haze = ctx.createRadialGradient(W * 0.5, gy, 0, W * 0.5, gy, W * 0.8);
    haze.addColorStop(0, rgba(this.main, 0.18));
    haze.addColorStop(1, rgba(this.main, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    /* редкое мерцание окон */
    if (Math.random() < 0.05) {
      const b = this.front[Math.floor(Math.random() * this.front.length)];
      if (b) b.lit[Math.floor(Math.random() * b.lit.length)] ^= true;
    }

    this.drawBuildings(ctx, W, H, gy, this.back, rgba(mix(this.dark, this.main, 0.24), 0.85), this.weather.void ? 0 : 0.18, 0.3, dx);
    this.drawFog(ctx, W, H, 0.6);
    this.drawBuildings(ctx, W, H, gy, this.front, rgba(mix(this.dark, this.main, 0.12), 1), this.weather.void ? 0.05 : 0.5, 0.7, dx);

    /* шпили-маячки */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.front.length; i += 2) {
      const b = this.front[i];
      const bx = b.x * W + dx * 0.7 + b.w * W * (b.taper ? 0.6 : 0.5);
      const a = 0.4 + 0.5 * Math.abs(Math.sin(t * 1.2 + i));
      ctx.fillStyle = rgba(this.accent, a);
      ctx.beginPath();
      ctx.arc(bx, gy - b.h * H - (b.taper ? b.h * H * 0.08 : 0) - 4, 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* мокрая площадь с отражениями */
    const wet = ctx.createLinearGradient(0, gy, 0, H);
    wet.addColorStop(0, rgba(mix(this.dark, this.main, 0.22), 1));
    wet.addColorStop(1, rgba(this.dark, 1));
    ctx.fillStyle = wet;
    ctx.fillRect(0, gy, W, H - gy);

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.translate(0, gy * 2);
    ctx.scale(1, -0.55);
    ctx.translate(0, -gy * 2 + gy * 0.82);
    this.drawBuildings(ctx, W, H, gy, this.front, rgba(mix(this.dark, this.main, 0.2), 1), 0.5, 0.7, dx);
    ctx.restore();
    // лёгкая водяная рябь поверх отражения
    ctx.fillStyle = rgba(this.dark, 0.25 + 0.06 * Math.sin(t * 1.3));
    ctx.fillRect(0, gy, W, H - gy);

    /* одинокая фигура */
    const figX = W * 0.5 + Math.sin(t * 0.1) * 4, figY = H * 0.88;
    const bob = Math.sin(t * 1.6) * 0.8;
    ctx.fillStyle = "rgba(4,6,12,0.95)";
    ctx.beginPath();
    ctx.ellipse(figX, figY - 17 + bob, 3.2, 4, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(figX - 4.5, figY + bob * 0.4);
    ctx.quadraticCurveTo(figX, figY - 16 + bob, figX + 4.5, figY + bob * 0.4);
    ctx.closePath();
    ctx.fill();
    // отражение фигуры
    ctx.fillStyle = "rgba(4,6,12,0.3)";
    ctx.beginPath();
    ctx.ellipse(figX, figY + 7, 4, 9, 0, 0, TAU);
    ctx.fill();
  }
}

/* ============================================================
   IMAGE WORLD — мир из готового изображения (AI-арт пользователя).
   Картинка не меняется: поверх — левитация, дыхание свечения,
   блики по стеклу, пыль, пульс ореола, реакция на касание.
   ============================================================ */

class ImageWorld extends WorldScene {
  init() {
    this.rippleStyle = "glow";
    this.img = this.p._img;
    this.motes = Array.from({ length: 34 }, () => ({
      x: Math.random(), y: Math.random(), r: rand(0.5, 1.7),
      sp: rand(0.008, 0.028), ph: Math.random() * TAU
    }));
    this.shimmerEvery = 8;
  }

  draw(ctx, W, H, t) {
    ctx.fillStyle = "#020207";
    ctx.fillRect(0, 0, W, H);

    /* левитация: картинка чуть крупнее экрана и мягко плывёт */
    const iw = this.img.naturalWidth, ih = this.img.naturalHeight;
    const sc = Math.max(W / iw, H / ih) * 1.05;
    const dw = iw * sc, dh = ih * sc;
    const bob = Math.sin(t * 0.5) * 6 * (this.calm ? 0.5 : 1);
    const sway = Math.cos(t * 0.34) * 4;
    ctx.drawImage(this.img, (W - dw) / 2 + sway, (H - dh) / 2 + bob, dw, dh);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    /* дыхание свечения в центре */
    const pulse = 0.045 + 0.045 * Math.sin(t * 0.9);
    const g = ctx.createRadialGradient(W / 2, H * 0.44 + bob, 0, W / 2, H * 0.44 + bob, H * 0.42);
    g.addColorStop(0, rgba(this.main, pulse));
    g.addColorStop(1, rgba(this.main, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* пульс ореола на полу */
    ctx.save();
    ctx.translate(W / 2, H * 0.92);
    ctx.scale(1, 0.26);
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.42);
    hg.addColorStop(0, rgba(this.main, 0.12 + 0.07 * Math.sin(t * 0.9 + 1)));
    hg.addColorStop(1, rgba(this.main, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(-W / 2, -W * 0.45, W, W * 0.9);
    ctx.restore();

    /* блик-шиммер, проходящий по стеклу */
    const sp = (t % this.shimmerEvery) / this.shimmerEvery;
    if (sp < 0.22) {
      const sx = (sp / 0.22) * (W + 300) - 150;
      const sg = ctx.createLinearGradient(sx - 70, 0, sx + 70, 0);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.5, "rgba(255,255,255,0.06)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.save();
      ctx.transform(1, 0, -0.35, 1, 0, 0);
      ctx.fillRect(sx - 90, 0, 180, H);
      ctx.restore();
    }

    /* пыль-частицы */
    if (!this.weather.void) {
      for (const m of this.motes) {
        m.y -= m.sp * 0.016;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        ctx.fillStyle = rgba(this.accent, 0.1 + 0.12 * Math.sin(t * 1.5 + m.ph));
        ctx.beginPath();
        ctx.arc(m.x * W, m.y * H, m.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/* ---------- реестр сцен ---------- */

const SCENES = {
  ocean: OceanWorld,
  space: SpaceWorld,
  neon: NeonRoom,
  forest: DreamForest,
  desert: AshWorld,
  glass: GlassCity
};
