// colter.dev — starfield: white-star majority + rare royal-purple stars, slow drift, comets,
// plus a modular sky-feature system. Every feature is ONE entry in FEATURES below —
// to remove one, delete its block from the array. Nothing else references them.
// Exposes window.starfield = { setEnabled(bool), setColor("r, g, b"), burst(n), warp() }
(() => {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  // ?skydemo shortens rare-event timers (satellite/supernova/ufo/shower) so they're visible at once
  const DEMO = new URLSearchParams(location.search).has("skydemo");

  const WHITE = "255, 255, 255";
  let accentRGB = "157, 123, 224";   // rare stars + comets + accent-lit features
  let enabled = true;
  let w = 0, h = 0, stars = [], shooters = [];
  let raf = 0, lastShoot = 0, running = false, lastT = 0;
  let burstTimers = [];
  let warpStart = -1e9;              // timestamp of last warp trigger
  const mouse = { x: 0, y: 0, active: false };
  const par = { x: 0, y: 0 };        // smoothed parallax offset

  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * DPR); canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const area = w * h;
    const layers = [
      { count: Math.min(150, Math.round(area / 11000)), sMin: 0.5, sMax: 1.1, aMin: 0.25, aMax: 0.60, spd: 0.015 },
      { count: Math.min(34,  Math.round(area / 48000)), sMin: 1.0, sMax: 1.7, aMin: 0.45, aMax: 0.80, spd: 0.028 },
      { count: Math.min(16,  Math.round(area / 96000)), sMin: 1.4, sMax: 2.3, aMin: 0.70, aMax: 0.95, spd: 0.045 },
    ];
    stars = [];
    for (const L of layers) for (let i = 0; i < L.count; i++) {
      stars.push({ x: Math.random()*w, y: Math.random()*h, r: rand(L.sMin,L.sMax), a: rand(L.aMin,L.aMax), spd: L.spd, tw: rand(0,Math.PI*2), tws: rand(0.4,1.2), rare: Math.random() < 0.1 });
    }
    for (const f of FEATURES) f.build && f.build();
  }

  function spawnShooter(fan) {
    const fromLeft = Math.random() < 0.5, y = rand(0, h*0.55);
    shooters.push({ x: fromLeft ? rand(-40, w*0.25) : rand(w*0.75, w+40), y, vx: (fromLeft?1:-1)*rand(1.8,2.8), vy: rand(0.8,1.5), life: 0, max: rand(900,1300) });
    if (fan) for (let i = 0; i < 2; i++) { // shower fan: two extra, slightly divergent
      shooters.push({ x: fromLeft ? rand(-40, w*0.2) : rand(w*0.8, w+40), y: y + rand(-30,30), vx: (fromLeft?1:-1)*rand(1.6,3.2), vy: rand(0.6,1.9), life: 0, max: rand(800,1200) });
    }
  }

  // shared per-frame context handed to every feature
  function frameContext(t, dt) {
    return { t, dt, w, h, ctx, stars, mouse, par, accentRGB, warpAgo: t - warpStart };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SKY FEATURES — each block is standalone; delete the entry to remove the feature.
  // Hooks: build() on resize/creation, color() on accent change,
  //        frame(F) every animated frame, static(F) once for the paused painting.
  // ─────────────────────────────────────────────────────────────────────────────
  const FEATURES = [

    { // NEBULA — 3 huge, ultra-faint accent clouds pre-rendered offscreen (redrawn on resize/color)
      name: "nebula", off: null,
      build() {
        this.off = document.createElement("canvas");
        this.off.width = w; this.off.height = h;
        this.render();
      },
      color() { this.render(); },
      render() {
        const c = this.off.getContext("2d");
        c.clearRect(0, 0, w, h);
        const clouds = [
          { x: w*0.22, y: h*0.30, r: Math.max(w,h)*0.38, a: 0.085 },
          { x: w*0.78, y: h*0.62, r: Math.max(w,h)*0.34, a: 0.07 },
          { x: w*0.55, y: h*0.15, r: Math.max(w,h)*0.25, a: 0.055 },
        ];
        for (const cl of clouds) {
          const g = c.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
          g.addColorStop(0, `rgba(${accentRGB}, ${cl.a})`);
          g.addColorStop(1, `rgba(${accentRGB}, 0)`);
          c.fillStyle = g;
          c.fillRect(cl.x - cl.r, cl.y - cl.r, cl.r * 2, cl.r * 2);
        }
      },
      frame(F) { F.ctx.drawImage(this.off, 0, 0, w, h); },
      static(F) { this.frame(F); },
    },

    { // AURORA — two slow waving ribbons across the top of the sky
      name: "aurora",
      frame(F) {
        const { ctx, t, w, h, accentRGB } = F;
        for (let k = 0; k < 2; k++) {
          const base = h * (0.16 + k * 0.06), amp = 16 + k * 10, thick = 46 + k * 14;
          const wave = (x) => base + Math.sin(x * 0.006 + t * 0.00016 * (k ? -1 : 1) + k * 2.2) * amp
                             + Math.sin(x * 0.0021 + t * 0.00009) * (amp * 0.6);
          // glowing ribbon: the area between the curve and its downward offset
          ctx.beginPath();
          ctx.moveTo(-20, wave(-20));
          for (let x = -10; x <= w + 20; x += 10) ctx.lineTo(x, wave(x));
          for (let x = w + 20; x >= -20; x -= 10) ctx.lineTo(x, wave(x) + thick * (0.6 + 0.4 * Math.sin(x * 0.003 + t * 0.0001)));
          ctx.closePath();
          const g = ctx.createLinearGradient(0, base - amp, 0, base + amp + thick);
          g.addColorStop(0, `rgba(${accentRGB}, ${k ? 0.08 : 0.12})`);
          g.addColorStop(1, `rgba(${accentRGB}, 0.02)`);
          ctx.fillStyle = g;
          ctx.fill();
        }
      },
    },

    { // BLACK HOLE — dark core + accent ring at a fixed spot; nearby stars swirl and deflect
      name: "blackhole", cx: 0, cy: 0,
      build() { this.cx = w * 0.80; this.cy = h * 0.66; },
      frame(F) {
        const { ctx, stars, dt } = F;
        const R = Math.max(70, Math.min(w, h) * 0.12), CORE = 7;
        for (const s of stars) {
          let dx = s.x - this.cx, dy = s.y - this.cy;
          const d = Math.hypot(dx, dy);
          if (d > R || d < 1) continue;
          // swirl: angular speed falls off with distance; push keeps stars out of the core
          const ang = (0.55 * dt) / (d * 0.02 + 8);
          const cos = Math.cos(ang), sin = Math.sin(ang);
          const nx = dx * cos - dy * sin, ny = dx * sin + dy * cos;
          s.x = this.cx + nx; s.y = this.cy + ny;
          if (d < CORE * 2.6) { const push = (CORE * 2.6 - d) * 0.02; s.x += (dx / d) * push; s.y += (dy / d) * push; }
        }
        // visuals
        const g = ctx.createRadialGradient(this.cx, this.cy, CORE, this.cx, this.cy, CORE * 4);
        g.addColorStop(0, `rgba(${F.accentRGB}, 0.30)`); g.addColorStop(1, `rgba(${F.accentRGB}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.cx, this.cy, CORE * 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${F.accentRGB}, 0.55)`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(this.cx, this.cy, CORE + 2.5, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(7, 4, 16, 0.92)"; // void (regal bg-deep; reads as a hole on every theme)
        ctx.beginPath(); ctx.arc(this.cx, this.cy, CORE, 0, Math.PI * 2); ctx.fill();
      },
      static(F) { this.frame({ ...F, dt: 0 }); },
    },

    { // CONSTELLATIONS — stars near the cursor link into faint accent chains
      name: "constellations",
      frame(F) {
        const { ctx, stars, mouse, accentRGB } = F;
        if (!mouse.active) return;
        const near = [];
        for (const s of stars) {
          const d = Math.hypot(s.x - mouse.x, s.y - mouse.y);
          if (d < 140) near.push({ s, d });
        }
        if (near.length < 2) return;
        near.sort((a, b) => a.d - b.d);
        const set = near.slice(0, 9);
        ctx.lineWidth = 0.7;
        for (let i = 0; i < set.length; i++) {
          for (let j = i + 1; j < set.length; j++) {
            const a = set[i].s, b = set[j].s;
            const dd = Math.hypot(a.x - b.x, a.y - b.y);
            if (dd > 95) continue;
            const alpha = (1 - dd / 95) * (1 - set[i].d / 140) * 0.35;
            ctx.strokeStyle = `rgba(${accentRGB}, ${alpha.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      },
    },

    { // PLANETS — two slow-drifting orbs; the small one has a ring. Rim-lit in accent.
      name: "planets", list: [],
      build() {
        this.list = [
          { x: w * 0.16, y: h * 0.24, r: Math.max(14, w * 0.016), spd: 0.010, ring: false },
          { x: w * 0.62, y: h * 0.80, r: Math.max(9,  w * 0.010), spd: 0.016, ring: true },
        ];
      },
      frame(F, move = true) {
        const { ctx, t, accentRGB } = F;
        const dx = Math.cos(145 * Math.PI / 180), dy = Math.sin(145 * Math.PI / 180);
        for (const p of this.list) {
          if (move) { p.x += dx * p.spd; p.y += dy * p.spd;
            if (p.y > h + p.r * 3) { p.y = -p.r * 3; p.x = Math.random() * w; }
            if (p.x < -p.r * 3) p.x = w + p.r * 3; if (p.x > w + p.r * 3) p.x = -p.r * 3; }
          // body: dark disc with an off-center core gradient (lit from upper-left)
          const g = ctx.createRadialGradient(p.x - p.r * 0.45, p.y - p.r * 0.45, p.r * 0.1, p.x, p.y, p.r);
          g.addColorStop(0, "rgba(58, 48, 78, 0.85)");
          g.addColorStop(1, "rgba(16, 12, 26, 0.92)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          // accent rim on the lit side
          ctx.strokeStyle = `rgba(${accentRGB}, 0.35)`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, Math.PI * 0.85, Math.PI * 1.55); ctx.stroke();
          if (p.ring) {
            ctx.strokeStyle = `rgba(${accentRGB}, 0.28)`; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.75, p.r * 0.5, -0.35, 0, Math.PI * 2); ctx.stroke();
          }
        }
      },
      static(F) { this.frame(F, false); },
    },

    { // SATELLITE — a steady bright ISS-like dot crossing every few minutes
      name: "satellite", s: null, nextAt: 0,
      build() { this.nextAt = performance.now() + (DEMO ? 6000 : rand(60000, 180000)); },
      frame(F) {
        const { ctx, t, dt } = F;
        if (!this.s && t > this.nextAt) {
          const fromLeft = Math.random() < 0.5;
          this.s = { x: fromLeft ? -30 : F.w + 30, y: rand(F.h * 0.1, F.h * 0.7), vx: (fromLeft ? 1 : -1) * rand(55, 80), vy: rand(-8, 8) };
        }
        if (this.s) {
          const s = this.s;
          s.x += s.vx * dt; s.y += s.vy * dt;
          const glint = 0.75 + 0.25 * Math.sin(t * 0.02);
          ctx.fillStyle = `rgba(255, 255, 255, ${glint.toFixed(3)})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${0.18 * glint})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
          if (s.x < -60 || s.x > F.w + 60 || s.y < -60 || s.y > F.h + 60) {
            this.s = null; this.nextAt = t + (DEMO ? 8000 : rand(90000, 240000));
          }
        }
      },
    },

    { // SUPERNOVA — one random star flares bright and fades, every few minutes
      name: "supernova", ev: null, nextAt: 0,
      build() { this.nextAt = performance.now() + (DEMO ? 4000 : rand(150000, 360000)); },
      frame(F) {
        const { ctx, stars, t } = F;
        if (!this.ev && t > this.nextAt && stars.length) {
          this.ev = { s: stars[(Math.random() * stars.length) | 0], t0: t, dur: 2600 };
        }
        if (this.ev) {
          const { s, t0, dur } = this.ev;
          const k = (t - t0) / dur;
          if (k >= 1 || !stars.includes(s)) { this.ev = null; this.nextAt = t + (DEMO ? 6000 : rand(200000, 420000)); return; }
          const e = Math.sin(k * Math.PI); // rise and fall
          const R = s.r + e * 5;
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 4);
          g.addColorStop(0, `rgba(255, 255, 255, ${(0.85 * e).toFixed(3)})`);
          g.addColorStop(0.35, `rgba(${F.accentRGB}, ${(0.35 * e).toFixed(3)})`);
          g.addColorStop(1, `rgba(${F.accentRGB}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(s.x, s.y, R * 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, s.a + e).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fill();
        }
      },
    },

    { // SPACESHIP — a tiny saucer drifting across once in a blue moon, light blinking
      name: "spaceship", s: null, nextAt: 0,
      build() { this.nextAt = performance.now() + (DEMO ? 12000 : rand(240000, 480000)); },
      frame(F) {
        const { ctx, t, dt, accentRGB } = F;
        if (!this.s && t > this.nextAt) {
          const fromLeft = Math.random() < 0.5;
          this.s = { x: fromLeft ? -40 : F.w + 40, y: rand(F.h * 0.15, F.h * 0.5), vx: (fromLeft ? 1 : -1) * rand(26, 38), phase: rand(0, Math.PI * 2) };
        }
        if (this.s) {
          const s = this.s;
          s.x += s.vx * dt;
          const y = s.y + Math.sin(t * 0.0012 + s.phase) * 6;
          // hull + dome
          ctx.fillStyle = "rgba(40, 34, 56, 0.9)";
          ctx.beginPath(); ctx.ellipse(s.x, y, 7, 2.6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(90, 78, 120, 0.9)";
          ctx.beginPath(); ctx.ellipse(s.x, y - 2, 3.2, 2.4, 0, Math.PI, 0); ctx.fill();
          // blinking light
          if (Math.sin(t * 0.012 + s.phase) > 0.2) {
            ctx.fillStyle = `rgba(${accentRGB}, 0.9)`;
            ctx.beginPath(); ctx.arc(s.x, y - 0.5, 1.1, 0, Math.PI * 2); ctx.fill();
          }
          if (s.x < -60 || s.x > F.w + 60) { this.s = null; this.nextAt = t + (DEMO ? 15000 : rand(300000, 600000)); }
        }
      },
    },

    { // SHOWER — date-triggered comet showers (New Year, site anniversary); fans of comets
      name: "shower",
      frame(F) {
        const { t } = F;
        const today = new Date();
        const key = (today.getMonth() + 1) + "-" + today.getDate();
        const dates = new Set(["1-1", "8-13"]);       // add "month-day" strings for more
        if (!dates.has(key)) return;
        if (t - lastShoot > 1400 && shooters.length < 6 && Math.random() < 0.9) {
          spawnShooter(Math.random() < 0.35);          // 35% triple-fan
          lastShoot = t;
        }
      },
    },
  ];

  function warpNow(t) { warpStart = t; }

  function drawStars(t, warpE) {
    const dx = Math.cos(145 * Math.PI / 180), dy = Math.sin(145 * Math.PI / 180);
    for (const s of stars) {
      // parallax offset by depth (deepest stars move least); skipped while warping
      const depth = s.spd <= 0.02 ? 0.35 : s.spd <= 0.035 ? 0.7 : 1.25;
      const px = s.x + par.x * depth, py = s.y + par.y * depth;
      const rgb = s.rare ? accentRGB : WHITE;
      const tw = 0.78 + 0.22 * Math.sin(t * 0.001 * s.tws + s.tw);
      if (warpE > 0.02) {
        const len = warpE * 60 * depth;
        ctx.strokeStyle = `rgba(${rgb}, ${Math.min(1, s.a * (0.5 + warpE * 0.6)).toFixed(3)})`;
        ctx.lineWidth = s.r * 0.9; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - dx * len, py - dy * len); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${(s.a * tw).toFixed(3)})`; ctx.fill();
      }
    }
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    ctx.clearRect(0, 0, w, h);
    // smooth the parallax toward the pointer
    const tx = mouse.active ? (mouse.x - w / 2) * 0.012 : 0, ty = mouse.active ? (mouse.y - h / 2) * 0.012 : 0;
    par.x += (tx - par.x) * 0.04; par.y += (ty - par.y) * 0.04;
    // warp envelope (3.5s: ramp 0.4s, hold, release 0.6s)
    const wAgo = t - warpStart;
    let warpE = 0;
    if (wAgo < 3500) {
      warpE = wAgo < 400 ? wAgo / 400 : wAgo > 2900 ? Math.max(0, (3500 - wAgo) / 600) : 1;
    }
    const F = frameContext(t, dt);

    // array order = layer order: nebula → aurora → blackhole → constellations →
    // planets → satellite → supernova → spaceship → shower, then stars on top
    for (const f of FEATURES) f.frame && f.frame(F);

    // stars move (warp multiplies drift)
    const dx = Math.cos(145 * Math.PI / 180), dy = Math.sin(145 * Math.PI / 180);
    const mult = 1 + warpE * 26;
    for (const s of stars) {
      s.x += dx * s.spd * mult; s.y += dy * s.spd * mult;
      if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
      if (s.y < -4) s.y = h + 4; else if (s.y > h + 4) s.y = -4;
    }
    drawStars(t, warpE);

    // regular comets (skipped while shower feature is spawning its own / warping)
    if (warpE <= 0 && t - lastShoot > 4500 && Math.random() < 0.7 && shooters.length < 2) { spawnShooter(false); lastShoot = t; }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const m = shooters[i]; m.life += 16; m.x += m.vx; m.y += m.vy;
      const k = m.life / m.max, op = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      const txx = m.x - m.vx * 9, ty = m.y - m.vy * 9;
      const g = ctx.createLinearGradient(m.x, m.y, txx, ty);
      g.addColorStop(0, `rgba(${accentRGB}, ${(0.9 * op).toFixed(3)})`); g.addColorStop(1, `rgba(${accentRGB}, 0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(txx, ty); ctx.stroke();
      if (m.life >= m.max || m.x < -60 || m.x > w + 60 || m.y > h + 60) shooters.splice(i, 1);
    }
    raf = requestAnimationFrame(frame);
  }

  function paintStatic() {
    ctx.clearRect(0, 0, w, h);
    const F = { t: 0, dt: 0, w, h, ctx, stars, mouse, par, accentRGB, warpAgo: 1e9 };
    for (const f of FEATURES) f.static && f.static(F);
    for (const s of stars) {
      const rgb = s.rare ? accentRGB : WHITE;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(${rgb}, ${s.a})`; ctx.fill();
    }
  }
  function start() { if (running) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function render() { stop(); if (enabled) start(); else paintStatic(); }

  window.addEventListener("resize", () => { clearTimeout(build._rt); build._rt = setTimeout(() => { build(); render(); }, 150); });
  document.addEventListener("visibilitychange", () => { if (!enabled) return; if (document.hidden) stop(); else start(); });
  window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });

  build();
  render();

  // public API for settings.js + eastereggs.js
  window.starfield = {
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) { burstTimers.forEach(clearTimeout); burstTimers = []; }
      render();
    },
    setColor(rgb) {
      accentRGB = rgb;
      for (const f of FEATURES) f.color && f.color();
      if (!enabled) paintStatic();
    },
    // easter-egg comet storm (Konami); each spawn re-checks `enabled` so turning
    // animations off mid-storm stops it immediately. A new burst supersedes any
    // storm still queued (its handles are cleared first, so nothing leaks).
    burst(n = 10) {
      if (!enabled) return;
      burstTimers.forEach(clearTimeout);
      burstTimers = Array.from({ length: n }, (_, i) =>
        setTimeout(() => { if (enabled) spawnShooter(false); }, i * 180));
    },
    warp() { if (enabled) warpNow(performance.now()); },
  };
})();
