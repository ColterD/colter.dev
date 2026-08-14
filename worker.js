// colter.dev Worker — serves static assets + a live "Currently working on" tracker.
// Cron (~10 min) fetches the owner's top-3 most-recently-pushed repos (incl private)
// via GitHub PAT, writes build-status/commit/updated to KV; the fetch handler SSRs
// the cards into index.html. Hardcoded cards act as fallback if KV is cold/offline.
const CUSTOM = {
  emily: { desc: "“We're stuck at ‘agentic.’ Emily is what comes after.”", cite: true, icon: 'cpu' },
  coco:  { desc: "A coding agent that ships itself.", icon: 'clip' },
};
const EXCLUDE = new Set(["colter.dev"]); // never list the site's own repo

const ICONS = {
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="13" height="13" rx="2"/><path d="M12 9.4v5.2 M9.4 12h5.2 M9 3.5v2 M15 3.5v2 M9 18.5v2 M15 18.5v2 M3.5 9h2 M3.5 15h2 M18.5 9h2 M18.5 15h2"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14a1 1 0 0 1 1 1v15l-4-2.6-3 2-3-2L4 20V5a1 1 0 0 1 1-1Z"/><path d="M8.5 9.5h7 M8.5 13h4"/></svg>',
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
    const c = CUSTOM[r.name.toLowerCase()];
    const desc = c ? c.desc : (r.description || "—");
    const cite = c && c.cite ? '<sup class="cite"><a href="#ref-1" aria-label="reference 1">1</a><a href="#ref-2" aria-label="reference 2">2</a></sup>' : "";
    const icon = (c && c.icon) ? ICONS[c.icon] : ICONS.repo;
    const stateLabel = r.state || "none";
    const badge = r.private
      ? '<span class="badge" aria-label="private repository">private</span>'
      : `<a class="badge badge-link" href="${esc(r.url)}" target="_blank" rel="noopener">repo ↗</a>`;
    return `<article class="card${r.private ? " is-private" : ""}">
      <div class="card__head">
        <span class="card__icon" aria-hidden="true">${icon}</span>
        <span class="card__title">${esc(r.name)}</span>
        <span class="card__meta" title="build: ${esc(stateLabel)}"><i class="dot" style="background:${stateColor(r.state)}"></i><code>${esc(r.sha || "—")}</code></span>
        ${badge}
      </div>
      <p class="card__desc">${desc}${cite}</p>
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
  const all = await gh("/user/repos?sort=updated&per_page=30&affiliation=owner", token);
  if (!Array.isArray(all)) return null;
  const top = all.filter((r) => !EXCLUDE.has(r.name)).slice(0, 3);
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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const res = await env.ASSETS.fetch(req);
    const ct = res.headers.get("content-type") || "";
    const isHTML = (url.pathname === "/" || url.pathname === "/index.html") && ct.includes("text/html");
    if (!isHTML) return res;

    let raw = await env.REPOS.get("repos");
    if (!raw) {
      try { raw = await buildRepos(env); } catch { return res; } // graceful: show static fallback cards
      if (raw) env.REPOS.put("repos", raw, { expirationTtl: 600 }).catch(() => {});
    }
    if (!raw) return res;
    try {
      const html = (await res.text()).replace(/<!--BEGIN_CARDS-->[\s\S]*?<!--END_CARDS-->/, renderCards(JSON.parse(raw)));
      const headers = new Headers(res.headers);
      headers.set("Cache-Control", "public, max-age=60");
      return new Response(html, { headers });
    } catch {
      return res;
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const data = await buildRepos(env);
      if (data) await env.REPOS.put("repos", data, { expirationTtl: 7200 });
    })());
  },
};
