// colter.dev — starfield: white-star majority + rare royal-purple stars, slow drift, slow comets.
// Exposes window.starfield = { setEnabled(bool), setColor("r, g, b") }
//   setColor sets the ACCENT (rare) star + comet color; the majority stays white.
(() => {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const WHITE = "255, 255, 255";
  let accentRGB = "157, 123, 224";   // rare stars + comets (royal purple); updated via setColor()
  let enabled = true;                // default ON; settings.js overrides
  let w = 0, h = 0, stars = [], shooters = [];
  let raf = 0, lastShoot = 0, running = false;
  let burstTimers = [];

  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * DPR); canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const area = w * h;
    // drift slowed ~3x vs the original; ~10% of stars are the rare accent color
    const layers = [
      { count: Math.min(150, Math.round(area / 11000)), sMin: 0.5, sMax: 1.1, aMin: 0.25, aMax: 0.60, spd: 0.015 },
      { count: Math.min(34,  Math.round(area / 48000)), sMin: 1.0, sMax: 1.7, aMin: 0.45, aMax: 0.80, spd: 0.028 },
      { count: Math.min(16,  Math.round(area / 96000)), sMin: 1.4, sMax: 2.3, aMin: 0.70, aMax: 0.95, spd: 0.045 },
    ];
    stars = [];
    for (const L of layers) for (let i = 0; i < L.count; i++) {
      stars.push({ x: Math.random()*w, y: Math.random()*h, r: rand(L.sMin,L.sMax), a: rand(L.aMin,L.aMax), spd: L.spd, tw: rand(0,Math.PI*2), tws: rand(0.4,1.2), rare: Math.random() < 0.1 });
    }
  }

  function spawnShooter() {
    const fromLeft = Math.random() < 0.5, y = rand(0, h*0.55);
    // slowed a lot: gentle drift instead of a racing streak
    shooters.push({ x: fromLeft ? rand(-40, w*0.25) : rand(w*0.75, w+40), y, vx: (fromLeft?1:-1)*rand(1.8,2.8), vy: rand(0.8,1.5), life: 0, max: rand(900,1300) });
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
      const rgb = s.rare ? accentRGB : WHITE;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${rgb}, ${(s.a*tw).toFixed(3)})`; ctx.fill();
    }
    // comets spawn less often (~4.5s) and crawl now
    if (t - lastShoot > 4500 && Math.random() < 0.7 && shooters.length < 2) { spawnShooter(); lastShoot = t; }
    for (let i = shooters.length-1; i >= 0; i--) {
      const m = shooters[i]; m.life += 16; m.x += m.vx; m.y += m.vy;
      const k = m.life/m.max, op = k < 0.15 ? k/0.15 : k > 0.8 ? (1-k)/0.2 : 1;
      const tx = m.x - m.vx*9, ty = m.y - m.vy*9;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(${accentRGB}, ${(0.9*op).toFixed(3)})`); g.addColorStop(1, `rgba(${accentRGB}, 0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
      if (m.life >= m.max || m.x < -60 || m.x > w+60 || m.y > h+60) shooters.splice(i, 1);
    }
    raf = requestAnimationFrame(frame);
  }

  function paintStatic() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const rgb = s.rare ? accentRGB : WHITE;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fillStyle = `rgba(${rgb}, ${s.a})`; ctx.fill();
    }
  }
  function start() { if (running) return; running = true; lastShoot = performance.now(); raf = requestAnimationFrame(frame); }
  function stop()  { running = false; cancelAnimationFrame(raf); }
  function render() { stop(); if (enabled) start(); else paintStatic(); }

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); render(); }, 150); });
  document.addEventListener("visibilitychange", () => { if (!enabled) return; if (document.hidden) stop(); else start(); });

  build();
  render();

  // public API for settings.js (user choice overrides the default)
  window.starfield = {
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) { burstTimers.forEach(clearTimeout); burstTimers = []; } // cancel a mid-burst storm
      render();
    },
    setColor(rgb) { accentRGB = rgb; if (!enabled) paintStatic(); },
    // easter-egg comet storm (Konami); each spawn re-checks `enabled` so turning
    // animations off mid-storm stops it immediately
    burst(n = 10) {
      if (!enabled) return;
      burstTimers = Array.from({ length: n }, (_, i) =>
        setTimeout(() => { if (enabled) spawnShooter(); }, i * 180));
    },
  };
})();
