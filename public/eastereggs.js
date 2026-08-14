// colter.dev — easter eggs: Konami → Emily comet storm, window.colter console CLI, tab-title play.
// Deliberately non-enumerable on window so DevTools eager-evaluation doesn't spam output.
(() => {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 220); }, 1800);
  }

  // 1. Konami code (↑↑↓↓←→←→BA) → Emily boot: a comet storm + a console line.
  //    Entering it twice within 6s engages warp.
  const SEQ = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let idx = 0, lastKonami = -1e9; // NOT 0: performance.now() starts near 0, so a first-code-within-6s-of-load would false-trigger warp
  document.addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    idx = (k === SEQ[idx]) ? idx + 1 : (k === SEQ[0] ? 1 : 0);
    if (idx === SEQ.length) {
      idx = 0;
      const now = performance.now();
      const isWarp = now - lastKonami < 6000;
      lastKonami = now;
      if (window.starfield && window.starfield.burst && !isWarp) window.starfield.burst(14);
      if (isWarp && window.starfield && window.starfield.warp) {
        window.starfield.warp();
        console.log("%cwarp engaged. hold on.", "color:#9D7BE0;font:600 14px Lexend,system-ui,sans-serif");
        toast("warp engaged");
      } else {
        console.log("%cemily: boot sequence complete. what comes after 'agentic'?", "color:#9D7BE0;font:600 14px Lexend,system-ui,sans-serif");
        toast("emily: boot sequence complete");
      }
    }
  });

  // 2. tab-title play — say hi when the tab loses focus, restore on return
  const TITLE = document.title;
  document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? "hey, come back" : TITLE;
  });

  // 3. console CLI — window.colter.<tab> in DevTools
  const PROJECTS = [
    ["emily", "We're stuck at 'agentic.' Emily is what comes after."],
    ["coco", "A coding agent that ships itself."],
  ];
  const cli = {
    help() {
      return "colter.dev CLI — try: colter.projects · colter.emily(\"hi\") · colter.status() · colter.source()";
    },
    projects() {
      return PROJECTS.map(([n, d]) => `${n} — ${d}`).join("\n");
    },
    emily(msg) {
      const m = msg ? ` you said: "${esc(msg)}"` : "";
      return `emily — We're stuck at 'agentic.' Emily is what comes after.${m}\nrefs: arxiv.org/abs/2311.02462 · arxiv.org/abs/2506.12469`;
    },
    async status() {
      const t0 = performance.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const r = await fetch("https://llm.colter.dev/v1/models", { signal: ctrl.signal, headers: { "User-Agent": "colter.dev cli" } });
        return `OmniRoute ${r.ok ? "up" : "degraded"} · ${Math.round(performance.now() - t0)}ms (llm.colter.dev)`;
      } catch {
        return "OmniRoute unreachable";
      } finally {
        clearTimeout(timer);
      }
    },
    source() {
      window.open("https://github.com/ColterD/colter.dev", "_blank", "noopener");
      return "opening github.com/ColterD/colter.dev …";
    },
  };
  Object.defineProperty(window, "colter", { value: cli, enumerable: false });
  console.log("%c✦ psst — window.colter in the console. also: /emily, /coco, and ↑↑↓↓←→←→BA.", "color:#8A7DA3;font:400 12px Lexend,system-ui,sans-serif");
})();
