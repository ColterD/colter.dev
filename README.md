# colter.dev

> Colter Dahlberg's personal hub — **Systems Engineering · AI · Open Source**. Live at [colter.dev](https://colter.dev).

A starfield-styled personal homepage built as a **Cloudflare Worker + Static Assets**: pinned featured projects, a live "Most Recently Updated" GitHub tracker rendered server-side at the edge, a command palette, five color themes, and a full accessibility/settings panel. Vanilla JS, no framework, no build step.

## Features

- ✨ **Starfield background** — white-star majority with rare royal-purple stars, slow drift, occasional comets (paused under reduced-motion; user-toggleable)
- 📌 **Featured Projects** — `emily` + `coco` pinned with their taglines (emily cites Morris 2023 + Feng 2025 in the footer)
- 🔄 **Most Recently Updated** — the owner's top-3 recently-*pushed* GitHub repos (private included), SSR'd by the Worker with build-status dot, commit SHA, and relative time; refreshed by cron every 10 min, graceful static fallback if GitHub is unreachable
- ⌨️ **Command palette** — visible search bar under the socials (also `⌘K` / `Ctrl+K`); fuzzy-searches services, projects, socials, actions, and live repo cards
- 🎨 **Five themes** — Regal (default, royal purple), Dracula, Nord, Catppuccin Macchiato, Tokyo Night — canonical palettes, WCAG-AA-checked
- ♿ **Display & accessibility panel** — animations toggle, accent-star color, card opacity, per-type text size (Title/Tagline/Body), all persisted
- 🖼️ **OG/social card** — every share gets the starfield+comet card ([og.png](public/og.png), regenerated from [og.html](og.html))
- 🤖 **AI-discoverable** — [`llms.txt`](public/llms.txt) + markdown-friendly content
- 🔒 **No cookies, no third-party tracking** — see [privacy.txt](public/privacy.txt); `security.txt` at `/.well-known/security.txt`
- 🥚 **Easter eggs** — `window.colter` in the console, hidden `/emily` + `/coco` pages, HTTP header eggs, Konami code, tab-title play

## How it works

```text
request ──► Worker (run_worker_first)
              ├─ ASSETS.fetch() serves static files from public/
              ├─ KV "repos" ──hit──► SSR cards into <!--BEGIN_RECENT-->…<!--END_RECENT-->
              │      └──miss──► fetch GitHub API (PAT) → render + cache (600s)
              └─ stamps request.cf.colo into the footer
cron */10 ──► rebuild repo list → KV (7200s TTL)
```

Ranking uses GitHub's `pushed_at` (`sort=pushed`, re-ranked client-side) — `updated_at` does **not** track pushes reliably. `colter.dev`, `emily`, and `coco` are excluded (the site itself + the pinned Featured cards).

## Repo layout

```text
worker.js               Worker: SSR tracker + colo stamp + cron
wrangler.toml           Worker config (assets, KV binding, cron, custom domain)
public/                 Static assets (served as-is)
  index.html  styles.css  starfield.js  settings.js  command.js
  og.png                Social card (generated from og.html)
  llms.txt  privacy.txt  robots.txt  humans.txt  .well-known/security.txt
og.html                 Source for regenerating public/og.png (1200×630)
docs/                   feature-ideas.md (researched backlog)
```

## Local development

```bash
cp .dev.vars.example .dev.vars    # add a GitHub token (see the file for least-privilege guidance)
npx wrangler dev
```

The tracker only needs a **fine-grained PAT, read-only** (Metadata + Contents + Commit statuses), scoped to the repos you want listed — never a classic full-`repo` token.

## Deploy

```bash
npx wrangler login      # interactive, from your own machine
./deploy.sh             # deploys + injects the current commit SHA (shown in the site footer)
```

For CI/non-interactive deploys, prefer a **scoped `CLOUDFLARE_API_TOKEN`** (My Profile → API Tokens → "Edit Cloudflare Workers" template). `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` (the Global API Key) is a legacy option — avoid it where a scoped token will do.

CI on PRs: CodeQL + Semgrep; CodeRabbit reviews every PR (see [.coderabbit.yaml](.coderabbit.yaml)). All review conversations must be resolved before squash-merge (branch-enforced).

## Fonts

Self-hosted [Lexend](https://www.lexend.com/) variable woff2 (OFL licensed).

## More ideas

The researched feature backlog lives in [docs/feature-ideas.md](docs/feature-ideas.md).
