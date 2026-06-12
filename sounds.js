/* ============================================================
   AURA WORLD — звуковые миры (Web Audio, всё синтезируется)
   У каждого мира свой саундскейп, играет сразу при открытии.
   ============================================================ */

"use strict";

const SoundEngine = {
  ctx: null, master: null, current: null, enabled: true,

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;

    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // iOS: пускаем звук через <audio>-элемент (MediaStream) — тогда он играет
    // даже при включённом «беззвучном» режиме, как видео. На десктопе — прямой выход.
    if (this.isIOS && this.ctx.createMediaStreamDestination) {
      try {
        const dest = this.ctx.createMediaStreamDestination();
        this.master.connect(dest);
        const a = document.createElement("audio");
        a.setAttribute("playsinline", "");
        a.autoplay = true;
        a.srcObject = dest.stream;
        this._mediaEl = a;
      } catch (e) {
        this.master.connect(this.ctx.destination); // запасной путь
      }
    } else {
      this.master.connect(this.ctx.destination);
    }
  },

  /* вызывается из обработчиков кликов — разблокирует автозапуск.
     ВАЖНО для телефона: на мобильных resume() срабатывает только внутри
     жеста. Поэтому здесь, в касании, запускаем вечный беззвучный источник —
     он держит контекст «running», и он не засыпает до открытия мира,
     когда play() уже не внутри жеста. */
  unlock() {
    this.ensure();
    if (this.ctx.state === "suspended") this.ctx.resume();

    // 1) iOS-«толчок» одноразовым нулевым буфером
    if (!this._kicked) {
      const b = this.ctx.createBufferSource();
      b.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      b.connect(this.ctx.destination);
      b.start(0);
      this._kicked = true;
    }

    // 2) вечный keep-alive: 1с тишины в цикле — контекст всё время «работает»
    if (!this._keepAlive) {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      src.connect(g).connect(this.ctx.destination);
      src.start();
      this._keepAlive = src;
    }

    // 3) запустить медиа-элемент iOS (внутри жеста) — звук пойдёт через него
    if (this._mediaEl) this._mediaEl.play().catch(() => {});
  },

  noiseBuf(color, secs = 4) {
    const ctx = this.ctx, len = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (color === "brown") {
      let l = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        l = (l + 0.02 * w) / 1.02;
        d[i] = l * 3.5;
      }
    } else {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  },

  loopSrc(buf, chain) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start();
    chain.stops.push(() => s.stop());
    return s;
  },

  osc(type, freq, chain) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.start();
    chain.stops.push(() => o.stop());
    return o;
  },

  lfo(param, rate, depth, chain) {
    const o = this.osc("sine", rate, chain);
    const g = this.ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
  },

  filter(type, freq, q = 1) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  },

  gainNode(v) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  },

  /* периодические одиночные звуки (птицы, глитчи, треск) */
  every(chain, minMs, maxMs, fire) {
    const loop = () => {
      if (this.current !== chain) return;
      fire();
      chain.timers.push(setTimeout(loop, minMs + Math.random() * (maxMs - minMs)));
    };
    chain.timers.push(setTimeout(loop, 600 + Math.random() * 1800));
  },

  play(key, params) {
    this.ensure();
    const ctx = this.ctx;
    if (ctx.state === "suspended") ctx.resume(); // критично для телефона: контекст мог уснуть
    if (this.current) this.fadeOut(this.current);
    const out = this.gainNode(0);
    out.connect(this.master);
    const chain = { out, stops: [], timers: [] };
    this.current = chain;
    const p = params || {};
    (this.builders[key] || this.builders.ocean).call(this, ctx, out, chain, p);
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.6);
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.enabled ? 0.85 : 0, ctx.currentTime + 0.8);
  },

  fadeOut(chain) {
    const ctx = this.ctx;
    chain.out.gain.cancelScheduledValues(ctx.currentTime);
    chain.out.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    chain.timers.forEach(clearTimeout);
    setTimeout(() => {
      chain.stops.forEach(f => { try { f(); } catch {} });
      try { chain.out.disconnect(); } catch {}
    }, 1200);
    if (this.current === chain) this.current = null;
  },

  stop() {
    if (this.current) this.fadeOut(this.current);
    this.setRain(false);
  },

  /* слой дождя поверх любого мира — включается тумблером ДОЖДЬ */
  rainGain: null,
  setRain(on) {
    if (!on && !this.rainGain) return;
    this.ensure();
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (!this.rainGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf("white");
      src.loop = true;
      src.start();
      const hiss = this.filter("bandpass", 3400, 0.6);   // шорох капель
      const body = this.filter("lowpass", 900);          // мягкое тело ливня
      const g = this.gainNode(0);
      src.connect(hiss).connect(g);
      src.connect(body).connect(this.gainNode(0.4)).connect(g);
      g.connect(this.master);
      this.rainGain = g;
    }
    this.rainGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.rainGain.gain.linearRampToValueAtTime(on ? 0.16 : 0, this.ctx.currentTime + 0.9);
  },

  setEnabled(on) {
    this.enabled = on;
    if (this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(on ? 0.85 : 0, this.ctx.currentTime + 0.6);
    }
    return on;
  },
  toggle() { return this.setEnabled(!this.enabled); },

  builders: {

    /* океан: глубокие волны + слышимый шум прибоя */
    ocean(ctx, out, chain) {
      const f = this.filter("lowpass", 480);
      this.lfo(f.frequency, 0.08, 220, chain);
      this.loopSrc(this.noiseBuf("brown", 6), chain).connect(f);
      f.connect(this.gainNode(0.5)).connect(out);
      // средний «шшш» прибоя — его слышно даже на телефоне
      const surf = this.filter("bandpass", 900, 0.7);
      const sg = this.gainNode(0.05);
      this.lfo(sg.gain, 0.1, 0.04, chain);
      this.loopSrc(this.noiseBuf("white"), chain).connect(surf).connect(sg).connect(out);
    },

    /* космос: дрон + слышимый верхний пад */
    space(ctx, out, chain) {
      const f = this.filter("lowpass", 240);
      this.osc("sine", 58, chain).connect(this.gainNode(0.16)).connect(f);
      this.osc("sine", 58.8, chain).connect(this.gainNode(0.16)).connect(f);
      f.connect(out);
      // слышимый пад из квинты в среднем регистре
      const pad = this.filter("lowpass", 900);
      [196, 294, 392].forEach((fr, i) => {
        const o = this.osc("sine", fr, chain);
        const g = this.gainNode(0.03);
        this.lfo(g.gain, 0.12 + i * 0.03, 0.018, chain);
        o.connect(g).connect(pad);
      });
      pad.connect(out);
      const shimmer = this.osc("sine", 1040, chain);
      this.lfo(shimmer.frequency, 0.25, 12, chain);
      shimmer.connect(this.gainNode(0.015)).connect(out);
    },

    /* неон: низкий гул + электрические блипы */
    neon(ctx, out, chain) {
      const f = this.filter("lowpass", 260, 4);
      this.lfo(f.frequency, 0.25, 140, chain);
      this.osc("sawtooth", 55, chain).connect(this.gainNode(0.14)).connect(f);
      f.connect(out);
      this.osc("sine", 110, chain).connect(this.gainNode(0.05)).connect(out);
      this.every(chain, 1800, 5200, () => {
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.value = 180 + Math.random() * 600;
        const g = this.gainNode(0);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
        o.connect(g).connect(out);
        o.start();
        o.stop(ctx.currentTime + 0.08);
      });
    },

    /* лес: ветер + редкие ночные птицы */
    forest(ctx, out, chain) {
      const wind = this.filter("bandpass", 440, 0.6);
      this.loopSrc(this.noiseBuf("white"), chain).connect(wind);
      const wg = this.gainNode(0.085);
      this.lfo(wg.gain, 0.06, 0.045, chain);
      wind.connect(wg).connect(out);
      const low = this.filter("lowpass", 220);
      this.loopSrc(this.noiseBuf("brown"), chain).connect(low);
      low.connect(this.gainNode(0.18)).connect(out);
      this.every(chain, 2600, 7500, () => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(2400 + Math.random() * 600, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1700, ctx.currentTime + 0.16);
        const g = this.gainNode(0);
        g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        o.connect(g).connect(out);
        o.start();
        o.stop(ctx.currentTime + 0.25);
      });
    },

    /* пустыня: сухой ветер + низкий жар + треск углей */
    desert(ctx, out, chain) {
      const wind = this.filter("highpass", 700);
      const wind2 = this.filter("lowpass", 2600);
      this.loopSrc(this.noiseBuf("white"), chain).connect(wind).connect(wind2);
      const wg = this.gainNode(0.06);
      this.lfo(wg.gain, 0.07, 0.035, chain);
      wind2.connect(wg).connect(out);
      const rumble = this.osc("sine", 47, chain);
      const rg = this.gainNode(0.13);
      this.lfo(rg.gain, 1.7, 0.05, chain);
      rumble.connect(rg).connect(out);
      const crack = this.noiseBuf("white", 0.06);
      this.every(chain, 350, 1600, () => {
        const s = ctx.createBufferSource();
        s.buffer = crack;
        const f = this.filter("bandpass", 2400 + Math.random() * 2000, 3);
        s.connect(f).connect(this.gainNode(0.03)).connect(out);
        s.start();
      });
    },

    /* глубина (хочу исчезнуть): подводно, приглушённо + сонар */
    deep(ctx, out, chain) {
      const f = this.filter("lowpass", 200);
      this.lfo(f.frequency, 0.05, 90, chain);
      this.loopSrc(this.noiseBuf("brown", 6), chain).connect(f);
      f.connect(this.gainNode(0.45)).connect(out);
      this.osc("sine", 44, chain).connect(this.gainNode(0.18)).connect(out); // суб-дрон
      // редкий сонар-пинг, уходящий вниз
      this.every(chain, 6000, 11000, () => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(440, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 1.4);
        const g = this.gainNode(0);
        g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
        o.connect(g).connect(out);
        o.start();
        o.stop(ctx.currentTime + 1.7);
      });
    },

    /* пустота (пусто): один холодный дрон + далёкие вздохи */
    hollow(ctx, out, chain) {
      const f = this.filter("lowpass", 320);
      this.osc("sine", 65, chain).connect(this.gainNode(0.2)).connect(out);
      const swell = this.filter("bandpass", 600, 0.8);
      const sg = this.gainNode(0);
      this.lfo(sg.gain, 0.035, 0.05, chain); // медленные «вздохи» пространства
      this.loopSrc(this.noiseBuf("white"), chain).connect(swell).connect(sg).connect(out);
      const high = this.osc("sine", 1320, chain);
      this.lfo(high.frequency, 0.07, 30, chain);
      high.connect(this.gainNode(0.006)).connect(out);
    },

    /* нежность (влюблён): тёплый пад + мягкие колокольчики */
    tender(ctx, out, chain) {
      const pad = this.filter("lowpass", 1200);
      [220, 277, 330].forEach((fr, i) => { // тёплое мажорное трезвучие
        const o = this.osc("sine", fr, chain);
        const g = this.gainNode(0.035);
        this.lfo(g.gain, 0.1 + i * 0.04, 0.02, chain);
        o.connect(g).connect(pad);
      });
      pad.connect(out);
      const air = this.filter("bandpass", 2000, 0.5);
      this.loopSrc(this.noiseBuf("white"), chain).connect(air).connect(this.gainNode(0.02)).connect(out);
      // мягкие колокольчики по пентатонике
      const notes = [523, 587, 659, 784, 880];
      this.every(chain, 3000, 6500, () => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
        const g = this.gainNode(0);
        g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
        o.connect(g).connect(out);
        o.start();
        o.stop(ctx.currentTime + 1.9);
      });
    },

    /* меланхолия (красиво, но больно): минорные ноты-капли + пад */
    melancholy(ctx, out, chain) {
      const pad = this.filter("lowpass", 900);
      [220, 262, 330].forEach((fr) => { // ля-минор
        this.osc("sine", fr, chain).connect(this.gainNode(0.028)).connect(pad);
      });
      pad.connect(out);
      this.osc("sine", 55, chain).connect(this.gainNode(0.1)).connect(out);
      // редкие «фортепианные» капли минорной пентатоники
      const notes = [440, 523, 587, 659, 784];
      this.every(chain, 3200, 7000, () => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
        const g = this.gainNode(0);
        g.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
        o.connect(g).connect(out);
        o.start();
        o.stop(ctx.currentTime + 2.5);
      });
    },

    /* стеклянный город: дождь + далёкий пад */
    glass(ctx, out, chain) {
      const rain = this.filter("bandpass", 3800, 0.8);
      this.loopSrc(this.noiseBuf("white"), chain).connect(rain);
      rain.connect(this.gainNode(0.05)).connect(out);
      const low = this.filter("lowpass", 220);
      this.loopSrc(this.noiseBuf("brown"), chain).connect(low);
      low.connect(this.gainNode(0.28)).connect(out);
      const padF = this.filter("lowpass", 700);
      [196, 247, 294].forEach(fr => {
        this.osc("sine", fr, chain).connect(this.gainNode(0.013)).connect(padF);
      });
      padF.connect(out);
      this.every(chain, 4000, 9000, () => { // капля по стеклу
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(1200 + Math.random() * 800, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
        const g = this.gainNode(0);
        g.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        o.connect(g).connect(out);
        o.start();
        o.stop(ctx.currentTime + 0.45);
      });
    }
  }
};
