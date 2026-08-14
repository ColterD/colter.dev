// colter.dev — settings / accessibility panel (v2: theme + accent + card opacity)
(() => {
  const LS = "colterdev.settings.v2";
  const root = document.documentElement;
  // each theme's default accent-star color (switching theme resets stars to this; user can re-tweak)
  const THEME_STAR = { regal: "#9D7BE0", dracula: "#BD93F9", nord: "#88C0D0", catppuccin: "#C6A0F6", tokyonight: "#BB9AF7" };
  const defaults = { theme: "regal", anim: "on", star: "#9D7BE0", cardAlpha: 0.7, scaleTitle: 1, scaleTagline: 1, scaleBody: 1 };

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
    root.dataset.theme = state.theme;
    const animOn = state.anim === "on";
    root.classList.toggle("anim-off", !animOn);
    if (window.starfield) window.starfield.setEnabled(animOn);
    const starRgb = hexToRgb(state.star) || "157, 123, 224";
    root.style.setProperty("--star-rgb", starRgb);
    if (window.starfield) window.starfield.setColor(starRgb);
    root.style.setProperty("--card-alpha", String(state.cardAlpha));
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

    const set = (patch) => { state = { ...state, ...patch }; write(state); apply(); syncSwatches(); };

    const animEl = document.getElementById("set-anim");
    const starEl = document.getElementById("set-star");
    const cardEl = document.getElementById("set-card");
    const sTitle = document.getElementById("set-scale-title");
    const sTag = document.getElementById("set-scale-tagline");
    const sBody = document.getElementById("set-scale-body");

    animEl.checked = state.anim === "on";
    starEl.value = state.star;
    cardEl.value = state.cardAlpha;
    sTitle.value = state.scaleTitle; sTag.value = state.scaleTagline; sBody.value = state.scaleBody;
    updateLabels();

    animEl.addEventListener("change", () => set({ anim: animEl.checked ? "on" : "off" }));
    starEl.addEventListener("input", () => set({ star: starEl.value }));
    cardEl.addEventListener("input", () => { set({ cardAlpha: parseFloat(cardEl.value) }); updateLabels(); });
    [[sTitle, "scaleTitle"], [sTag, "scaleTagline"], [sBody, "scaleBody"]].forEach(([el, key]) => {
      el.addEventListener("input", () => { set({ [key]: parseFloat(el.value) }); updateLabels(); });
    });

    // theme swatches — switching theme also adopts its accent-star color
    const swatches = panel.querySelectorAll(".swatch");
    swatches.forEach((sw) => {
      sw.addEventListener("click", () => {
        const theme = sw.dataset.theme;
        const star = THEME_STAR[theme] || state.star;
        starEl.value = star;
        set({ theme, star });
      });
    });
    function syncSwatches() {
      swatches.forEach((sw) => sw.setAttribute("aria-checked", sw.dataset.theme === state.theme ? "true" : "false"));
    }

    function updateLabels() {
      document.getElementById("set-card-val").textContent = Math.round(state.cardAlpha * 100) + "%";
      document.getElementById("set-scale-title-val").textContent = Math.round(state.scaleTitle * 100) + "%";
      document.getElementById("set-scale-tagline-val").textContent = Math.round(state.scaleTagline * 100) + "%";
      document.getElementById("set-scale-body-val").textContent = Math.round(state.scaleBody * 100) + "%";
    }

    document.getElementById("set-reset").addEventListener("click", () => {
      state = { ...defaults }; write(state);
      animEl.checked = true; starEl.value = state.star; cardEl.value = state.cardAlpha;
      sTitle.value = sTag.value = sBody.value = 1; updateLabels(); apply(); syncSwatches();
    });

    apply();
    syncSwatches();
  });
})();
