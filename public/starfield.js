// colter.dev — starfield (coming-soon-cx DNA, hardened) + settings API
// Exposes window.starfield = { setEnabled(bool), setColor("r, g, b") }
// Default: animates only when prefers-reduced-motion is unset; settings can override on.
(() => {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let starRGB = "255, 221, 157";      // updated via setColor()
  let enabled = !reduced;             // updated via setEnabled()
  let w = 0, h = 0, stars = [], shooters = [];
  let raf = 0, lastShoot = 0, running = false;

  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * DPR); canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const area = w * h;
    const layers = [
      { count: Math.min(150, Math.round(area / 11000)), sMin: 0.5, sMax: 1.1, aMin: 0.25, aMax: 0.55, spd: 0.045 },
      { count: Math.min(34,  Math.round(area / 48000)), sMin: 1.0, sMax: 1.7, aMin: 0.45, aMax: 0.75, spd: 0.085 },
      { count: Math.min(16,  Math.round(area / 96000)), sMin: 1.4, sMax: 2.3, aMin: 0.65, aMax: 0.95, spd: 0.135 },
    ];
    stars = [];
    for (const L of layers) for (let i = 0; i < L.count; i++) {
      stars.push({ x: Math.random()*w, y: Math.random()*h, r: rand(L.sMin,L.sMax), a: rand(L.aMin,L.aMax), spd: L.spd, tw: rand(0,Math.PI*2), tws: rand(0.4,1.2) });
    }
  }

  function spawnShooter() {
    const fromLeft = Math.random() < 0.5, y = rand(0, h*0.55);
    shooters.push({ x: fromLeft ? rand(-40, w*0.25) : rand(w*0.75, w+40), y, vx: (fromLeft?1:-1)*rand(6,9), vy: rand(2.5,4), life: 0, max: rand(420,640) });
  }

  function frame(t) {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    const dx = Math.cos(145*Math.PI/180), dy = Math.sin(145*Math.PI/180);
    for (const s of stars) {
      s.x += dx*s.spd; s.y += dy*s.spd;
      if (s.x < -4) s.x = w+4; else if (s.x > w+4) s.x = -4;
      if (s.y < -4) s.y = h+4; else if (s.y > h+4) s.y = -4;
      const tw = 0.78 + 0.22*Math.sin(t*0.001*s.tws + s.tw);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${starRGB}, ${(s.a*tw).toFixed(3)})`; ctx.fill();
    }
    if (t - lastShoot > 1700 && Math.random() < 0.8 && shooters.length < 2) { spawnShooter(); lastShoot = t; }
    for (let i = shooters.length-1; i >= 0; i--) {
      const m = shooters[i]; m.life += 16; m.x += m.vx; m.y += m.vy;
      const k = m.life/m.max, op = k < 0.15 ? k/0.15 : k > 0.8 ? (1-k)/0.2 : 1;
      const tx = m.x - m.vx*7, ty = m.y - m.vy*7;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(${starRGB}, ${(0.9*op).toFixed(3)})`); g.addColorStop(1, `rgba(${starRGB}, 0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
      if (m.life >= m.max || m.x < -60 || m.x > w+60 || m.y > h+60) shooters.splice(i, 1);
    }
    raf = requestAnimationFrame(frame);
  }

  function paintStatic() { ctx.clearRect(0, 0, w, h); for (const s of stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fillStyle = `rgba(${starRGB}, ${s.a})`; ctx.fill(); } }
  function start() { if (running) return; running = true; lastShoot = performance.now(); raf = requestAnimationFrame(frame); }
  function stop()  { running = false; cancelAnimationFrame(raf); }

  function render() { stop(); if (enabled) start(); else paintStatic(); }

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); render(); }, 150); });
  document.addEventListener("visibilitychange", () => { if (!enabled || reduced) return; if (document.hidden) stop(); else start(); });

  // init
  build();
  render();

  // public API for settings.js (user choice overrides the reduced-motion default)
  window.starfield = {
    setEnabled(on) { enabled = !!on; render(); },
    setColor(rgb) { starRGB = rgb; if (!enabled) paintStatic(); },
  };
})();
