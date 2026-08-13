// colter.dev — settings / accessibility panel
// Persists in localStorage; controls animations, star color, per-type text size.
(() => {
  const LS = "colterdev.settings.v1";
  const root = document.documentElement;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const defaults = { anim: prefersReduced ? "off" : "on", star: "#ffd79a", scaleTitle: 1, scaleTagline: 1, scaleBody: 1 };

  const read = () => { try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(LS) || "{}")); } catch { return { ...defaults }; } };
  const write = (s) => localStorage.setItem(LS, JSON.stringify(s));
  let state = read();

  const hexToRgb = (h) => {
    const m = /^#?([0-9a-f]{6})$/i.exec((h || "").trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  };

  function apply() {
    // animations
    const animOn = state.anim === "on";
    root.classList.toggle("anim-off", !animOn);
    if (window.starfield) window.starfield.setEnabled(animOn);
    // star color
    root.style.setProperty("--star-rgb", hexToRgb(state.star) || "255, 221, 157");
    if (window.starfield) window.starfield.setColor(hexToRgb(state.star) || "255, 221, 157");
    // text scales
    root.style.setProperty("--scale-title", String(state.scaleTitle));
    root.style.setProperty("--scale-tagline", String(state.scaleTagline));
    root.style.setProperty("--scale-body", String(state.scaleBody));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("settings-btn");
    const panel = document.getElementById("settings-panel");
    if (!btn || !panel) return;

    const open = () => { panel.inert = false; panel.classList.add("open"); btn.setAttribute("aria-expanded", "true"); setTimeout(() => panel.querySelector("button, input, select")?.focus(), 30); };
    const close = () => { panel.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); panel.inert = true; btn.focus(); };
    btn.addEventListener("click", () => panel.classList.contains("open") ? close() : open());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });

    // wire controls + persist
    const set = (patch) => { state = { ...state, ...patch }; write(state); apply(); };

    const animEl = document.getElementById("set-anim");
    const starEl = document.getElementById("set-star");
    const sTitle = document.getElementById("set-scale-title");
    const sTag = document.getElementById("set-scale-tagline");
    const sBody = document.getElementById("set-scale-body");

    // initialize control values from state
    animEl.checked = state.anim === "on";
    starEl.value = state.star;
    sTitle.value = state.scaleTitle; sTag.value = state.scaleTagline; sBody.value = state.scaleBody;
    updateSliderLabels();

    animEl.addEventListener("change", () => set({ anim: animEl.checked ? "on" : "off" }));
    starEl.addEventListener("input", () => set({ star: starEl.value }));
    [[sTitle, "scaleTitle"], [sTag, "scaleTagline"], [sBody, "scaleBody"]].forEach(([el, key]) => {
      el.addEventListener("input", () => { set({ [key]: parseFloat(el.value) }); updateSliderLabels(); });
    });

    function updateSliderLabels() {
      document.getElementById("set-scale-title-val").textContent = Math.round(state.scaleTitle * 100) + "%";
      document.getElementById("set-scale-tagline-val").textContent = Math.round(state.scaleTagline * 100) + "%";
      document.getElementById("set-scale-body-val").textContent = Math.round(state.scaleBody * 100) + "%";
    }

    document.getElementById("set-reset").addEventListener("click", () => {
      state = { ...defaults }; write(state);
      animEl.checked = true; starEl.value = state.star;
      sTitle.value = sTag.value = sBody.value = 1; updateSliderLabels(); apply();
    });

    apply();
  });
})();
