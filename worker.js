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

// --- OmniRoute uptime (self-check from the edge; public /v1 is Access-bypassed) ---
const LLM_CHECK_URL = "https://llm.colter.dev/v1/models";
const LLM_TIMEOUT_MS = 8000;

async function checkLlm() {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const r = await fetch(LLM_CHECK_URL, { signal: ctrl.signal, headers: { "User-Agent": "colter.dev status" } });
    return { ok: r.ok, ms: Date.now() - t0, ts: Date.now() };
  } catch {
    return { ok: false, ms: 0, ts: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}
function llmBadge(s) {
  if (!s) return '<i class="dot" style="background:var(--text-faint)"></i>checking…';
  const dot = `<i class="dot" style="background:${s.ok ? "var(--ok)" : "var(--bad)"}"></i>`;
  return `${dot}${s.ok ? "up · " + s.ms + "ms" : "down"}`;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
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
    // Health check NEVER blocks the render: on a KV miss the badge stays neutral
    // ("checking…") for this request while the check fills KV in the background.
    let llm = null;
    try { llm = await env.REPOS.get("llm-status", { type: "json" }); } catch { llm = null; }
    if (!llm) {
      ctx.waitUntil(
        checkLlm()
          .then((s) => env.REPOS.put("llm-status", JSON.stringify(s), { expirationTtl: 600 }))
          .catch(() => {})
      );
    }
    try {
      let html = await res.text();
      if (raw) {
        const cards = renderCards(JSON.parse(raw));
        html = html.replace(/<!--BEGIN_RECENT-->[\s\S]*?<!--END_RECENT-->/, cards);
      }
      const colo = (req.cf && req.cf.colo) ? req.cf.colo : null;
      if (colo) html = html.replace(/<span id="edge-colo">[^<]*<\/span>/, `<span id="edge-colo">${esc(colo)}</span>`);
      const sha = env.COMMIT_SHA ? String(env.COMMIT_SHA) : "";
      if (sha) {
        html = html.replace(/<a id="deploy-sha"[^>]*>[^<]*<\/a>/,
          `<a id="deploy-sha" class="edge-link" href="https://github.com/ColterD/colter.dev/commit/${esc(sha)}" target="_blank" rel="noopener">${esc(sha)}</a>`);
      }
      html = html.replace(/<span id="llm-status"[^>]*>[\s\S]*?<\/span>/,
        `<span id="llm-status" title="OmniRoute health, checked from the edge">${llmBadge(llm)}</span>`);
      const headers = new Headers(res.headers);
      headers.set("Cache-Control", "public, max-age=60");
      return new Response(html, { headers });
    } catch {
      return res;
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
        const llm = await checkLlm();
        await env.REPOS.put("llm-status", JSON.stringify(llm), { expirationTtl: 7200 });
      } catch (err) {
        console.error("cron checkLlm failed:", err && err.message);
      }
    })());
  },
};
