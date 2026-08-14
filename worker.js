// colter.dev Worker — static Featured cards + a live "Most Recently Updated" tracker.
// Cron (~10 min) fetches the owner's 3 most-recently-pushed repos (excl. featured) via GitHub
// PAT, caches build-status/commit/updated in KV; the fetch handler SSRs them into index.html
// (under BEGIN_RECENT/END_RECENT) and stamps the Cloudflare edge colo. Static fallback if cold.
const EXCLUDE = new Set(["colter.dev", "emily", "coco"]); // this site + the pinned (Featured) repos

const ICONS = {
  repo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V7l-3-3H5a1 1 0 0 0-1 1Z"/><path d="M8 8h8 M8 12h8 M8 16h5"/></svg>',
};

const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function relTime(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  for (const [sec, u] of [[604800, "w"], [86400, "d"], [3600, "h"], [60, "m"]]) if (s >= sec) return Math.floor(s / sec) + u + " ago";
  return "just now";
}
function stateColor(state) {
  return { success: "var(--ok)", failure: "var(--bad)", error: "var(--bad)", pending: "var(--warn)" }[state] || "var(--text-faint)";
}

function renderCards(repos) {
  return repos.map((r) => {
    const desc = r.description || "—";
    const stateLabel = r.state || "none";
    const badge = r.private
      ? '<span class="badge" aria-label="private repository">private</span>'
      : `<a class="badge badge-link" href="${esc(r.url)}" target="_blank" rel="noopener">repo ↗</a>`;
    return `<article class="card${r.private ? " is-private" : ""}">
      <div class="card__head">
        <span class="card__icon" aria-hidden="true">${ICONS.repo}</span>
        <span class="card__title">${esc(r.name)}</span>
        <span class="card__meta" title="build: ${esc(stateLabel)}"><i class="dot" style="background:${stateColor(r.state)}"></i><code>${esc(r.sha || "—")}</code></span>
        ${badge}
      </div>
      <p class="card__desc">${esc(desc)}</p>
      <p class="card__updated">updated ${relTime(r.pushed)}</p>
    </article>`;
  }).join("");
}

async function gh(path, token) {
  const r = await fetch("https://api.github.com" + path, {
    headers: { Authorization: "Bearer " + token, "User-Agent": "colter.dev", Accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error("GH " + r.status + " " + path);
  return r.json();
}
async function buildRepos(env) {
  const token = env.GITHUB_TOKEN;
  if (!token) return null;
  // sort=pushed ranks by pushed_at (actual code changes). sort=updated ranks by updated_at,
  // which GitHub does NOT keep in sync with pushes (e.g. screenarr: pushed recently, updated_at
  // stuck weeks earlier) — that produced a stale-looking "Most Recently Updated" list.
  const all = await gh("/user/repos?sort=pushed&per_page=30&affiliation=owner", token);
  if (!Array.isArray(all)) return null;
  const top = all
    .filter((r) => !EXCLUDE.has(r.name))
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)) // re-rank: don't trust list order
    .slice(0, 3);
  const out = [];
  for (const r of top) {
    const branch = r.default_branch || "main";
    const commit = await gh(`/repos/${r.full_name}/commits/${encodeURIComponent(branch)}`, token);
    const sha = (commit && commit.sha) ? commit.sha.slice(0, 7) : "";
    let state = null;
    if (commit && commit.sha) state = (await gh(`/repos/${r.full_name}/commits/${commit.sha}/status`, token))?.state || null;
    out.push({ name: r.name, full: r.full_name, private: !!r.private, url: r.html_url, description: r.description, pushed: r.pushed_at, sha, state });
  }
  return JSON.stringify(out);
}

// --- service uptime (self-checks from the edge; llm /v1 is Access-bypassed) ---
const CHECKS = {
  llm: "https://llm.colter.dev/v1/models",
  cp: "https://colter.plus/",
};
const CHECK_TIMEOUT_MS = 8000;

async function checkUrl(url) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "colter.dev status" } });
    return { ok: r.ok, ms: Date.now() - t0, ts: Date.now() };
  } catch {
    return { ok: false, ms: 0, ts: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}
async function runHealth(env) {
  const [llm, cp] = await Promise.all([checkUrl(CHECKS.llm), checkUrl(CHECKS.cp)]);
  const health = { llm, cp };
  await env.REPOS.put("health", JSON.stringify(health), { expirationTtl: 600 }).catch(() => {});
  return health;
}
function statusBadge(s) {
  if (!s) return '<i class="dot" style="background:var(--text-faint)"></i>checking…';
  const dot = `<i class="dot" style="background:${s.ok ? "var(--ok)" : "var(--bad)"}"></i>`;
  return `${dot}${s.ok ? "up" : "down"}`;
}

// --- hidden lore pages (easter eggs) ---
function lorePage(kind) {
  const lore = {
    emily: {
      title: "emily",
      line: "We're stuck at 'agentic.' Emily is what comes after.",
      body: "A research project pushing past Level-2.5 'agentic' AI toward autonomous, general, innovative systems — grounded in the levels-of-AI literature, not marketing.",
      refs: '<p class="refs">Morris et al. 2023, <a href="https://arxiv.org/abs/2311.02462" rel="noopener">Levels of AGI</a> · Feng et al. 2025, <a href="https://arxiv.org/abs/2506.12469" rel="noopener">Levels of Autonomy for AI Agents</a></p>',
    },
    coco: {
      title: "coco",
      line: "A coding agent that ships itself.",
      body: "A Rust coding-agent platform that self-hosts its own releases — its ops pipeline is its own first user.",
      refs: "",
    },
  }[kind];
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${lore.title} · colter.dev</title><style>
      body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;background:#0E0A1A;color:#F3EEFA;font-family:'Lexend',system-ui,sans-serif;text-align:center;padding:2rem}
      main{max-width:34rem}h1{font-size:2.2rem;margin:0}p.line{font-size:1.15rem;color:#C6B8DC;margin:.6rem 0 1rem}p.body{font-size:.95rem;line-height:1.6;color:#8A7DA3}
      p.refs{font-size:.75rem;color:#8A7DA3;margin-top:1.4rem}a{color:#9D7BE0}
      a.back{display:inline-block;margin-top:1.8rem;font-size:.8rem;color:#8A7DA3;text-decoration:none;border:1px solid #2a2140;padding:.5rem 1rem;border-radius:999px}a.back:hover{color:#9D7BE0}
    </style></head><body><main><h1>${lore.title}</h1><p class="line">${lore.line}</p><p class="body">${lore.body}</p>${lore.refs}<a class="back" href="/">← back to colter.dev</a></main></body></html>`,
    { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "public, max-age=3600", "x-built-with": "a coding agent that ships itself", "x-hire-me": "hello@colter.dev" } },
  );
}

// HTTP header eggs — for exactly the people who read headers
function headerEggs(headers) {
  headers.set("X-Built-With", "a coding agent that ships itself"); // X-Powered-By is stripped by the zone's remove_x-powered-by managed transform
  headers.set("X-Hire-Me", "hello@colter.dev");
  return headers;
}

export default {
  async fetch(req, env, ctx) {
    const t0 = Date.now();
    const url = new URL(req.url);
    if (url.pathname === "/emily" || url.pathname === "/coco") return lorePage(url.pathname.slice(1));
    const res = await env.ASSETS.fetch(req);
    const ct = res.headers.get("content-type") || "";
    const isHTML = (url.pathname === "/" || url.pathname === "/index.html") && ct.includes("text/html");
    if (!isHTML) return res;

    let raw = null;
    try { raw = await env.REPOS.get("repos"); } catch { raw = null; } // a KV read error must never 500 the page
    if (!raw) {
      try { raw = await buildRepos(env); } catch { raw = null; }
      // waitUntil: a floating put() can be cancelled once the response returns,
      // leaving the cache unfilled → every request re-fetches the GitHub API.
      if (raw) ctx.waitUntil(env.REPOS.put("repos", raw, { expirationTtl: 600 }).catch(() => {}));
    }
    // Health checks NEVER block the render: on a KV miss the badges stay neutral
    // ("checking…") for this request while both checks fill KV in the background.
    let health = null;
    try { health = await env.REPOS.get("health", { type: "json" }); } catch { health = null; }
    if (!health) ctx.waitUntil(runHealth(env).catch(() => {}));
    // clone before consuming: the fallback path needs an unread body
    const fallback = res.clone();
    try {
      let html = await res.text();
      if (raw) {
        const cards = renderCards(JSON.parse(raw));
        html = html.replace(/<!--BEGIN_RECENT-->[\s\S]*?<!--END_RECENT-->/, cards);
      }
      const colo = (req.cf && req.cf.colo) ? req.cf.colo : null;
      if (colo) html = html.replace(/<span id="edge-colo">[^<]*<\/span>/, `<span id="edge-colo">${esc(colo)}</span>`);
      html = html.replace(/<span id="edge-ms">[^<]*<\/span>/, `<span id="edge-ms">${Date.now() - t0}</span>`);
      const sha = env.COMMIT_SHA ? String(env.COMMIT_SHA) : "";
      if (sha) {
        html = html.replace(/<a id="deploy-sha"[^>]*>[^<]*<\/a>/,
          `<a id="deploy-sha" class="edge-link" href="https://github.com/ColterD/colter.dev/commit/${esc(sha)}" target="_blank" rel="noopener">${esc(sha)}</a>`);
      }
      html = html.replace(/<span id="llm-status"[^>]*>[\s\S]*?<\/span>/,
        `<span id="llm-status" title="OmniRoute health, checked from the edge${health && health.llm ? " · " + health.llm.ms + "ms" : ""}">${statusBadge(health && health.llm)}</span>`);
      html = html.replace(/<span id="cp-status"[^>]*>[\s\S]*?<\/span>/,
        `<span id="cp-status" title="Colter+ health, checked from the edge${health && health.cp ? " · " + health.cp.ms + "ms" : ""}">${statusBadge(health && health.cp)}</span>`);
      const headers = new Headers(res.headers);
      headers.set("Cache-Control", "public, max-age=60");
      return new Response(html, { status: res.status, statusText: res.statusText, headers: headerEggs(headers) });
    } catch {
      // degrade to the unmodified page — still carry the header eggs; keep the
      // original status so a 404/500 from assets isn't masked as 200
      return new Response(fallback.body, { status: fallback.status, statusText: fallback.statusText, headers: headerEggs(new Headers(fallback.headers)) });
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const data = await buildRepos(env);
        if (data) await env.REPOS.put("repos", data, { expirationTtl: 7200 });
      } catch (err) {
        // A failed cron (e.g. GitHub non-OK) must not reject silently inside waitUntil:
        // log it and keep the previous KV value; the next 10-min run retries.
        console.error("cron buildRepos failed:", err && err.message);
      }
      try {
        const [llm, cp] = await Promise.all([checkUrl(CHECKS.llm), checkUrl(CHECKS.cp)]);
        await env.REPOS.put("health", JSON.stringify({ llm, cp }), { expirationTtl: 7200 });
      } catch (err) {
        console.error("cron health checks failed:", err && err.message);
      }
    })());
  },
};
