// colter.dev — command palette. A visible "search or jump to…" bar; Cmd/Ctrl+K focuses it.
// Fuzzy-matches services, projects (featured + recent), socials, and actions; Enter runs.
(() => {
  const input = document.getElementById("command-input");
  const list = document.getElementById("command-list");
  if (!input || !list) return;
  const root = input.closest(".command");

  const openUrl = (u) => window.open(u, "_blank", "noopener");
  const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 220); }, 1500);
  }
  async function copy(txt, msg) { try { await navigator.clipboard.writeText(txt); toast(msg); } catch { toast("Copy failed"); } }
  const openSettings = () => document.getElementById("settings-btn")?.click();

  const STATIC = [
    { label: "OmniRoute", hint: "service", run: () => openUrl("https://llm.colter.dev/") },
    { label: "Colter+", hint: "service", run: () => openUrl("https://colter.plus") },
    { label: "emily", hint: "project", run: () => jumpCard("emily") },
    { label: "coco", hint: "project", run: () => jumpCard("coco") },
    { label: "GitHub profile", hint: "social", run: () => openUrl("https://github.com/ColterD") },
    { label: "Bluesky", hint: "social", run: () => openUrl("https://bsky.app/profile/colter.dev") },
    { label: "LinkedIn", hint: "social", run: () => openUrl("https://www.linkedin.com/in/colter-dahlberg/") },
    { label: "Email Colter", hint: "social", run: () => { location.href = "mailto:hello@colter.dev"; } },
    { label: "Copy email address", hint: "action", run: () => copy("hello@colter.dev", "hello@colter.dev copied") },
    { label: "View source", hint: "repo", run: () => openUrl("https://github.com/ColterD/colter.dev") },
    { label: "Display & accessibility", hint: "settings", run: openSettings },
  ];
  // also index the SSR'd recent-repo cards
  function recentRepos() {
    const out = [];
    document.querySelectorAll("#repo-cards .card__title").forEach((t) => {
      const name = t.textContent.trim();
      const card = t.closest(".card");
      if (name && card) out.push({ label: name, hint: "recent", run: () => card.scrollIntoView({ behavior: "smooth", block: "center" }) });
    });
    return out;
  }
  const allCmds = () => STATIC.concat(recentRepos());
  function jumpCard(name) {
    const t = [...document.querySelectorAll(".card__title")].find((x) => x.textContent.trim().toLowerCase() === name);
    t?.closest(".card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  let matches = [];
  let active = 0;

  function fuzzy(q, cmds) {
    q = q.trim().toLowerCase();
    if (!q) return cmds.slice(0, 6);
    return cmds.map((c) => {
      const l = c.label.toLowerCase(); let score = -1;
      if (l.startsWith(q)) score = 100 - l.length;
      else if (l.includes(q)) score = 60 - l.length;
      else { let i = 0; for (const ch of l) { if (ch === q[i]) i++; if (i === q.length) break; } if (i === q.length) score = 20; }
      return { c, score };
    }).filter((x) => x.score >= 0).sort((a, b) => b.score - a.score).slice(0, 6).map((x) => x.c);
  }

  function render(q) {
    matches = fuzzy(q, allCmds());
    active = 0;
    list.innerHTML = matches.map((c, i) =>
      `<li class="command__opt${i === 0 ? " active" : ""}" role="option" id="cmd-opt-${i}" data-i="${i}" aria-selected="${i === 0 ? "true" : "false"}"><span class="label">${esc(c.label)}</span><span class="hint">${esc(c.hint || "")}</span></li>`
    ).join("");
    // Only open the dropdown when the input actually has focus (click/tab/Cmd+K) —
    // never on page load, even though default matches are pre-populated.
    const open = matches.length > 0 && document.activeElement === input;
    list.classList.toggle("open", open);
    input.setAttribute("aria-expanded", open ? "true" : "false");
    input.setAttribute("aria-activedescendant", open ? "cmd-opt-0" : "");
  }
  function setActive(i) {
    if (!matches.length) return;
    active = (i + matches.length) % matches.length;
    list.querySelectorAll(".command__opt").forEach((el, idx) => {
      const on = idx === active; el.classList.toggle("active", on); el.setAttribute("aria-selected", on ? "true" : "false");
    });
    input.setAttribute("aria-activedescendant", "cmd-opt-" + active);
    list.querySelector(".active")?.scrollIntoView({ block: "nearest" });
  }
  function runActive() { if (matches[active]) { const fn = matches[active].run; clear(); fn(); } }
  function clear() { input.value = ""; render(""); list.classList.remove("open"); input.setAttribute("aria-expanded", "false"); input.blur(); }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("focus", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); runActive(); }
    else if (e.key === "Escape") { closeCmd(); }
  });
  list.addEventListener("click", (e) => { const opt = e.target.closest(".command__opt"); if (opt) { active = +opt.dataset.i; runActive(); } });
  list.addEventListener("mousemove", (e) => { const opt = e.target.closest(".command__opt"); if (opt) setActive(+opt.dataset.i); });

  // The palette is an overlay, hidden by default: Cmd/Ctrl+K toggles it.
  // (Deliberately not wired into the settings panel — that's for a11y controls;
  // a hidden ⌘K palette is the standard pattern and ready to grow.)
  function openCmd() {
    root.classList.add("open"); root.inert = false;
    input.focus(); input.select(); render(input.value);
  }
  function closeCmd() {
    clear();
    root.classList.remove("open"); root.inert = true;
  }
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      root.classList.contains("open") ? closeCmd() : openCmd();
    }
  });
  document.addEventListener("click", (e) => {
    if (root.classList.contains("open") && !root.contains(e.target)) closeCmd();
  });

  render("");
})();
