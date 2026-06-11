/* ============================================================
   AURA WORLD — живое существо (анимированный canvas-спрайт)
   Дышит, моргает, покачивается; черты зависят от архетипа.
   ============================================================ */

"use strict";

const CREATURE_DEFS = {
  "Ночной лис": { color: "#FFA45C", glow: "#FFD9B0", ears: "fox", tail: "fox" },
  "Электрический кот": { color: "#6BE0FF", glow: "#C9F4FF", ears: "cat", tail: "cat", sparks: true },
  "Светящийся олень": { color: "#9FE8C9", glow: "#E7FFF4", antlers: true },
  "Чёрная птица": { color: "#8C7BD8", glow: "#C9BFFF", wings: true, dark: true },
  "Стеклянная рыба": { color: "#9FC4FF", glow: "#E0EDFF", fish: true },
  "Розовая моль": { color: "#F2A8DE", glow: "#FFE0F5", moth: true },
  "Туманный кит": { color: "#92A8C4", glow: "#DCE8F7", whale: true }
};

class CreatureSprite {
  constructor(canvas, name) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.def = CREATURE_DEFS[name] || CREATURE_DEFS["Ночной лис"];
    this.col = hexToRgb(this.def.color);
    this.glow = hexToRgb(this.def.glow);
    this.t = 0;
    this.blink = 0;          // 0..1 — степень закрытия глаз
    this.nextBlink = 2;
    this.look = 0;           // куда смотрит (-1..1)
    this.lookTarget = 0;
    this.sparkles = Array.from({ length: 12 }, () => ({
      a: Math.random() * TAU, r: rand(46, 72), sp: rand(0.2, 0.6), ph: Math.random() * TAU
    }));
    this.running = true;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = canvas.clientWidth;
    this.H = canvas.clientHeight;
    this.frame = this.frame.bind(this);
    canvas.addEventListener("pointerdown", () => { this.lookTarget = rand(-1, 1); this.blink = 1; });
    requestAnimationFrame(this.frame);
  }

  stop() { this.running = false; }

  frame() {
    if (!this.running) return;
    this.t += 0.016;
    const t = this.t;

    /* моргание */
    this.nextBlink -= 0.016;
    if (this.nextBlink <= 0) { this.blink = 1; this.nextBlink = rand(1.8, 4.5); }
    this.blink = Math.max(0, this.blink - 0.07);

    /* взгляд плавно блуждает */
    if (Math.random() < 0.005) this.lookTarget = rand(-1, 1);
    this.look += (this.lookTarget - this.look) * 0.04;

    this.draw(this.ctx, this.W, this.H, t);
    requestAnimationFrame(this.frame);
  }

  draw(ctx, W, H, t) {
    ctx.clearRect(0, 0, W, H);
    const d = this.def;
    const cx = W / 2, cy = H / 2 + 6 + Math.sin(t * 1.1) * 4; // левитация
    const breathe = 1 + 0.045 * Math.sin(t * 1.6);            // дыхание
    const R = (d.whale ? 40 : 30) * breathe;

    /* искры вокруг */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.sparkles) {
      s.a += s.sp * 0.012;
      const sx = cx + Math.cos(s.a) * s.r;
      const sy = cy + Math.sin(s.a) * s.r * 0.55;
      const a = 0.15 + 0.3 * Math.abs(Math.sin(t * 1.4 + s.ph));
      ctx.fillStyle = rgba(this.col, a);
      ctx.beginPath();
      ctx.arc(sx, sy, 1.3, 0, TAU);
      ctx.fill();
    }

    /* аура */
    const aura = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.4);
    aura.addColorStop(0, rgba(this.col, 0.3 + 0.08 * Math.sin(t * 1.6)));
    aura.addColorStop(1, rgba(this.col, 0));
    ctx.fillStyle = aura;
    ctx.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);
    ctx.restore();

    const bodyA = d.dark ? 0.92 : 0.8;
    const bodyCol = d.dark ? mix(this.col, [10, 8, 24], 0.72) : this.col;

    /* крылья птицы / моли — за телом */
    if (d.wings || d.moth) {
      const flap = Math.sin(t * (d.moth ? 5 : 2.2)) * 0.35;
      ctx.save();
      ctx.globalAlpha = 0.75;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + side * R * 0.5, cy - R * 0.1);
        ctx.rotate(side * (0.5 + flap));
        ctx.fillStyle = rgba(mix(bodyCol, this.glow, 0.25), 0.8);
        ctx.beginPath();
        ctx.ellipse(side * R * 0.8, -R * 0.3, R * (d.moth ? 0.95 : 1.15), R * 0.45, side * 0.5, 0, TAU);
        ctx.fill();
        if (d.moth) { // вторая пара крыльев
          ctx.fillStyle = rgba(mix(bodyCol, this.glow, 0.45), 0.7);
          ctx.beginPath();
          ctx.ellipse(side * R * 0.6, R * 0.35, R * 0.6, R * 0.3, side * 0.9, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    /* хвосты */
    if (d.tail) {
      const sway = Math.sin(t * 2.1) * 0.3;
      ctx.strokeStyle = rgba(bodyCol, 0.85);
      ctx.lineCap = "round";
      ctx.lineWidth = d.tail === "fox" ? 13 : 6;
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.7, cy + R * 0.5);
      ctx.quadraticCurveTo(
        cx + R * 1.7, cy + R * (0.7 + sway),
        cx + R * 1.9, cy - R * (0.3 - sway * 1.4)
      );
      ctx.stroke();
      if (d.tail === "fox") { // светлый кончик
        ctx.strokeStyle = rgba(this.glow, 0.9);
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(cx + R * 1.82, cy - R * (0.05 - sway));
        ctx.lineTo(cx + R * 1.9, cy - R * (0.3 - sway * 1.4));
        ctx.stroke();
      }
    }
    if (d.fish || d.whale) {
      const sway = Math.sin(t * 2.6) * 0.4;
      ctx.fillStyle = rgba(bodyCol, 0.75);
      ctx.save();
      ctx.translate(cx - R * 1.05, cy);
      ctx.rotate(sway * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-R * 0.7, -R * 0.55, -R * 0.85, -R * 0.7);
      ctx.quadraticCurveTo(-R * 0.55, 0, -R * 0.85, R * 0.7);
      ctx.quadraticCurveTo(-R * 0.7, R * 0.55, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    /* уши */
    if (d.ears) {
      const tw = Math.sin(t * 3.3) * 0.06; // подёргивание
      ctx.fillStyle = rgba(bodyCol, 0.95);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + side * R * 0.55, cy - R * 0.75);
        ctx.rotate(side * (0.25 + (side > 0 ? tw : 0)));
        ctx.beginPath();
        const eh = d.ears === "fox" ? R * 0.85 : R * 0.6;
        ctx.moveTo(-R * 0.28, R * 0.15);
        ctx.lineTo(0, -eh);
        ctx.lineTo(R * 0.28, R * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba(this.glow, 0.35);
        ctx.beginPath();
        ctx.moveTo(-R * 0.13, 0);
        ctx.lineTo(0, -eh * 0.62);
        ctx.lineTo(R * 0.13, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba(bodyCol, 0.95);
        ctx.restore();
      }
    }

    /* рога оленя */
    if (d.antlers) {
      ctx.strokeStyle = rgba(mix(bodyCol, this.glow, 0.5), 0.9);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * R * 0.4, cy - R * 0.8);
        ctx.quadraticCurveTo(cx + side * R * 0.9, cy - R * 1.5, cx + side * R * 0.75, cy - R * 1.9);
        ctx.moveTo(cx + side * R * 0.72, cy - R * 1.25);
        ctx.lineTo(cx + side * R * 1.15, cy - R * 1.5);
        ctx.stroke();
      }
    }

    /* тело */
    const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.15, cx, cy, R * 1.15);
    body.addColorStop(0, rgba(mix(bodyCol, [255, 255, 255], d.dark ? 0.18 : 0.5), bodyA));
    body.addColorStop(0.65, rgba(bodyCol, bodyA));
    body.addColorStop(1, rgba(mix(bodyCol, [5, 6, 16], 0.55), bodyA));
    ctx.fillStyle = body;
    ctx.beginPath();
    const rx = d.fish || d.whale ? R * 1.25 : R;
    ctx.ellipse(cx, cy, rx, R * (d.fish || d.whale ? 0.78 : 0.95), 0, 0, TAU);
    ctx.fill();

    /* глаза: следят и моргают */
    const eyeY = cy - R * 0.12;
    const eyeDx = this.look * R * 0.13;
    const open = 1 - this.blink;
    for (const side of [-1, 1]) {
      const ex = cx + side * R * 0.34 + eyeDx;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const eg = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, R * 0.22);
      eg.addColorStop(0, rgba(this.glow, 0.5 * open));
      eg.addColorStop(1, rgba(this.glow, 0));
      ctx.fillStyle = eg;
      ctx.fillRect(ex - R * 0.3, eyeY - R * 0.3, R * 0.6, R * 0.6);
      ctx.restore();
      ctx.fillStyle = `rgba(255,255,255,${0.95 * Math.max(0.06, open)})`;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, R * 0.1, R * 0.13 * Math.max(0.08, open), 0, 0, TAU);
      ctx.fill();
    }

    /* электрические искры кота */
    if (d.sparks && Math.sin(t * 2.7) > 0.82) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(this.glow, 0.85);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const a = rand(0, TAU);
        let zx = cx + Math.cos(a) * R, zy = cy + Math.sin(a) * R * 0.9;
        ctx.beginPath();
        ctx.moveTo(zx, zy);
        for (let s = 0; s < 3; s++) {
          zx += rand(-10, 10); zy += rand(-10, 10);
          ctx.lineTo(zx, zy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* пузырьки рыбы / фонтан кита */
    if (d.fish || d.whale) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.3 + i * 0.33) % 1;
        const bx = cx + (d.whale ? 0 : R * 1.1) + Math.sin(ph * 9 + i) * 5;
        const by = (d.whale ? cy - R * 0.8 : cy - R * 0.3) - ph * 38;
        ctx.strokeStyle = rgba(this.glow, (1 - ph) * 0.5);
        ctx.beginPath();
        ctx.arc(bx, by, 2 + ph * 2.5, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
